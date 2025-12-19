import json
import re
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("key")
client = OpenAI(api_key=api_key)

system_prompt = (
    "You are an Amazon manager. Respond with ONLY valid raw JSON. "
    "No markdown, no explanations, no extra text. "
    "Return product_name, price, and link (Google search link), and item description."
)

user_prompt = input("Tell me an item you want to buy: ")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
)

raw_reply = response.choices[0].message.content.strip()

def clean_json(text):
    text = re.sub(r"```json|```", "", text)
    start = text.find("{")
    end = text.rfind("}") + 1
    return text[start:end]

cleaned_reply = clean_json(raw_reply)
#print("Product:\n", cleaned_reply)

def extract_item_info(response_json):
    try:
        data = json.loads(response_json)
        return [
            data.get("product_name"),
            data.get("price"),
            data.get("link"),
            data.get("item_description"),
        ]   
    except Exception as e:
        print("JSON parse error:", e)
        return []

info = extract_item_info(cleaned_reply)
# print("Parsed Info:", info)

print("Item Name:", info[0])
print("Item Price:", info[1])
print("Item Link:", info[2])
print("Item Description:", info[3])