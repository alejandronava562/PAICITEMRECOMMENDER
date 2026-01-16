import json
import re
import os
from flask import Flask, render_template, request
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("key")
client = OpenAI(api_key=api_key)

app = Flask(__name__)


def clean_json(text):
    text = re.sub(r"```json|```", "", text)
    start = text.find("{")
    end = text.rfind("}") + 1
    return text[start:end]


def extract_item_info(response_json):
    try:
        data = json.loads(response_json)
        return {
            "name": data.get("product_name"),
            "price": data.get("price"),
            "link": data.get("link"),
            "description": data.get("item_description"),
        }
    except Exception as e:
        print("JSON parse error:", e)
        return None


@app.route("/", methods=["GET"])
def index():
    item_info = None

    return render_template("index.html", item=item_info)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    item = data.get("item") or ""
    messages = data.get("messages")
    if not messages:
        return {"error": "No message provided"}
    convo = [
        {
            "role": "system",
            "content": f"You are helping with follow up questions for an item recommender app. The item is {item or ""}"
        }
    ]

    for i in range(len(messages)):
        role = messages[i].get("role")
        content = messages[i].get("content")
        if content:
            convo.append({
                "role": role, "content": content
            })

    try:
        response = client.responses.create(model="gpt-5-mini",input=convo)
        reply = response.output_text.strip()
    except Exception as e: 
        return {"error": "Failed"}
    return {"reply" : reply, "item": item}


@app.route("/find", methods=["POST"])
def find():
    data = request.get_json(silent=True) or {}
    item = (data.get("query") or data.get("item") or "").strip()
    min_price = data.get("min_price")
    max_price = data.get("max_price")
    context = data.get("reasoning")

    def to_number(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    if not item:
        return {
            "error": "Nothing found because you didn't type anything in to search for"
        }

    min_price = to_number(min_price)
    max_price = to_number(max_price)

    search_system_prompt = """
    You are an shopping assistant. Respond with ONLY valid raw JSON. 
    No markdown, no explanations, no extra text. 
    Return a JSON with the following template: 
    {
        "product_name": string,
        "price": float,
        "link": string (URL),
        "item_description": string,
        "reasoning": string
    }
    """
    search_user_prompt = f"""
    'Item: {item}'
    'Min Price : {min_price if min_price is not None else 'none'} 
    'Max Price : {max_price if max_price is not None else 'none'}
    'User Context : {context or 'None'}'
    {search_system_prompt}
    """

    response = client.responses.create(
        model="gpt-5-mini",
        tools=[{"type": "web_search"}],
        input=search_user_prompt,
    )

    raw_response = response.output_text.strip()
    raw_response = raw_response.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(raw_response)
    except Exception as e:
        print(f"JSON parse error: {e}\nRaw: {raw_response}")
        return {"error": "Could not parse AI response. Please try again."}, 502

    result = {
        "title": data.get("product_name"),
        "price": data.get("price"),
        "currency": data.get("currency") or "USD",
        "rating": data.get("rating"),
        "review_count": data.get("review_count"),
        "url": data.get("link"),
        "summary": data.get("item_description"),
        "reason": data.get("reasoning"),
    }

    return {
        "item": item,
        "filters": {"min_price": min_price, "max_price": max_price},
        "results": [result],
        "count": 1,
        "source": "chatgpt-web-search",
    }


if __name__ == "__main__":
    app.run(debug=True, port=2000)
