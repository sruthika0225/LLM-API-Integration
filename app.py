import os
import uuid
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Initialize Flask
app = Flask(__name__)

# Get Gemini API key
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("Gemini API key not found!")

# Connect to Gemini
client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(timeout=120000)
)

# Model selection
MODEL_NAME = "gemini-3.5-flash-lite"

# Chatbot personality
SYSTEM_PROMPT = """
You are ContextAI, a friendly AI learning assistant.

Your purpose is to help students understand programming,
computer science and technology.

Give simple, clear and beginner-friendly explanations.
Use examples whenever helpful.
Be polite and encouraging.
"""

# Store conversations in memory
conversations = {}

# Keep only the latest 10 messages
MAX_HISTORY = 10


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():

    try:
        # Receive data from frontend
        data = request.get_json(silent=True) or {}

        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({
                "error": "Please enter a message."
            }), 400

        # Get existing conversation ID or create one
        conversation_id = data.get("conversation_id")

        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        # Retrieve previous conversation
        history = conversations.get(conversation_id, [])

        # Send previous messages and current message
        contents = history[-MAX_HISTORY:] + [
            {
                "role": "user",
                "parts": [{"text": user_message}]
            }
        ]

        # Generate AI response
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=500
            )
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        # Save current conversation
        history.extend([
            {
                "role": "user",
                "parts": [{"text": user_message}]
            },
            {
                "role": "model",
                "parts": [{"text": response.text}]
            }
        ])

        # Apply context window management
        conversations[conversation_id] = history[-MAX_HISTORY:]

        # Return response to frontend
        return jsonify({
            "conversation_id": conversation_id,
            "response": response.text
        })

    except Exception as error:
        print("Chat API Error:", error)

        return jsonify({
            "error": "Sorry, I'm unable to respond right now. Please try again."
        }), 502


if __name__ == "__main__":
    app.run(debug=True)
