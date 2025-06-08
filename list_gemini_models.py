#!/usr/bin/env python3
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

# Load environment variables from .env
load_dotenv()

# Configure the Gemini API with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Print the SDK version
print(f"Google GenerativeAI SDK Version: {genai.__version__}")

try:
    # List all available models
    models = genai.list_models()
    print("\nAvailable Models:")
    for model in models:
        print(f"- Name: {model.name}")
        print(f"  Display Name: {model.display_name}")
        print(f"  Description: {model.description}")
        print(f"  Generation Methods: {model.supported_generation_methods}")
        print("")
except Exception as e:
    print(f"Error listing models: {e}")
