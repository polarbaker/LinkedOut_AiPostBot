"""
Utilities for Enhanced LinkedIn Post Generator
"""
import os
import logging
import sys
import httpx

logger = logging.getLogger('linkedin-generator')

def initialize_openai_client():
    """
    Initialize OpenAI client with proper configuration, explicitly controlling proxy usage.
    Returns the client object and a boolean indicating if the app is running in mock mode.
    """
    api_key = os.getenv('OPENAI_API_KEY')
    mock_mode = not api_key
    client = None

    if mock_mode:
        logger.info("No API key found or mock mode explicitly enabled. OpenAI client will not be initialized.")
        return None, True # mock_mode is true

    try:
        from openai import OpenAI, APIError # Import OpenAI and specific APIError

        # Configure an httpx client to explicitly not use environment proxies
        # trust_env=False prevents httpx from reading proxy settings from environment variables
        # proxies=None explicitly sets no proxies for this client instance
        custom_httpx_client = httpx.Client(proxies=None, trust_env=False)
        
        client = OpenAI(api_key=api_key, http_client=custom_httpx_client)
        
        logger.info("OpenAI client initialized successfully, explicitly bypassing system proxies.")
        return client, False # mock_mode is false

    except APIError as e:
        logger.error(f"OpenAI APIError during client initialization: {e}. Switching to mock mode.")
        return None, True # mock_mode is true
    except ImportError:
        logger.error("Failed to import OpenAI components. Ensure 'openai' and 'httpx' packages are installed. Switching to mock mode.")
        return None, True # mock_mode is true
    except Exception as e:
        logger.error(f"Unexpected error initializing OpenAI client: {e}. Switching to mock mode.")
        return None, True # mock_mode is true

# Clean environment variables of problematic settings
def clean_environment():
    """
    Clean environment variables that might interfere with OpenAI client
    """
    # For OpenAI internal settings that might interfere
    problematic_vars = [
        'OPENAI_API_BASE', 
        'OPENAI_API_TYPE', 
        'OPENAI_ORGANIZATION', 
        'OPENAI_PROXY'
    ]
    
    # Check if any problematic variables exist and remove them
    for var in problematic_vars:
        if var in os.environ:
            logger.warning(f"Removing problematic environment variable: {var}")
            os.environ.pop(var)
            
    return True
