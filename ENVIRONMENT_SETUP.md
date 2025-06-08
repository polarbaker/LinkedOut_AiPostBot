# Environment Variable Configuration Guide

This document provides instructions for configuring the required environment variables for the LinkedIn Post Generator application.

## Required Environment Variables

Create a `.env` file in the root directory of the project with the following variables:

```
# LLM Provider Configuration
# Can be either 'gemini' or 'openai'. Gemini will fall back to OpenAI if needed.
LLM_PROVIDER=gemini

# Google Gemini API Key (Required if LLM_PROVIDER=gemini)
# Get your API key from Google AI Studio: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (Required as fallback option)
# Get your API key from OpenAI: https://platform.openai.com/
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
# Optional port configuration, defaults to 5003 if not specified
PORT=5003

# Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL=INFO
```

## Provider Priority

The application will use LLM providers in the following priority:

1. If `LLM_PROVIDER=gemini`:
   - Try Gemini models in this order:
     - gemini-1.5-pro
     - gemini-1.5-flash
     - gemini-1.0-pro
     - gemini-pro
     - gemini-1.0-pro-vision
   - Fall back to OpenAI if all Gemini models fail

2. If `LLM_PROVIDER=openai`:
   - Use OpenAI models directly (gpt-3.5-turbo by default)

## API Key Security

- **IMPORTANT:** Never commit your `.env` file to version control.
- The `.env` file is already in `.gitignore` for your protection.
- When deploying, ensure these variables are set in the hosting environment.

## Troubleshooting

If you encounter API errors:

1. Verify your API keys are valid and have sufficient quota
2. Check the logs directory for detailed error messages
3. Ensure you have the latest version of required packages:
   ```
   pip install -r requirements.txt
   ```

## Local Development

For local development without real API keys, you can set:

```
LLM_PROVIDER=mock
```

This will use mock responses instead of real API calls, but functionality will be limited.
