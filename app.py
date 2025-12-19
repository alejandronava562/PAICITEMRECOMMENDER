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

system_prompt = (
    "You are an Amazon manager. Respond with ONLY valid raw JSON. "
    "No markdown, no explanations, no extra text. "
    "Return product_name, price, and link (Google search link), and item description."
)

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

@app.route("/", methods=["GET", "POST"])
def index():
    item_info = None

    if request.method == "POST":
        user_prompt = request.form.get("item")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        raw_reply = response.choices[0].message.content.strip()
        cleaned_reply = clean_json(raw_reply)
        item_info = extract_item_info(cleaned_reply)

    return render_template("index.html", item=item_info)

if __name__ == "__main__":
    app.run(debug=True)
