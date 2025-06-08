"""
OpenAI Client Wrapper Module
This module provides a clean wrapper for OpenAI client initialization
"""
import os
import logging
import importlib.util

logger = logging.getLogger('linkedin-generator')

class OpenAIWrapper:
    """Wrapper for OpenAI client to handle initialization safely"""
    
    def __init__(self, api_key=None):
        """Initialize OpenAI client with minimal configuration"""
        # Check for explicit mock mode first
        self.mock_mode = os.getenv("MOCK_MODE", "false").lower() in ["true", "1", "yes"]
        logger.info(f"OpenAIWrapper: Explicit mock mode from environment: {self.mock_mode}")
        
        # If not explicitly in mock mode, check for API key
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.client = None
        
        if not self.mock_mode:
            self.mock_mode = not self.api_key
            if self.mock_mode:
                logger.info("OpenAIWrapper: No API key available, falling back to mock mode")
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the OpenAI client using standard practices and robust error handling."""
        if self.mock_mode:
            logger.info("OpenAI client in mock mode (API key may be missing or initialization previously failed).")
            self.client = None # Ensure client is None if mock_mode was set by __init__
            return

        try:
            # Check if the openai package is available
            if importlib.util.find_spec('openai') is None:
                logger.error("OpenAI package not found. Switching to mock mode.")
                self.mock_mode = True
                self.client = None
                return

            from openai import OpenAI, APIError # Import OpenAI and specific APIError

            # Attempt standard initialization
            self.client = OpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully.")

        except APIError as e:
            # Handle errors specifically from the OpenAI API (e.g., authentication, connection)
            logger.error(f"OpenAI APIError during client initialization: {e}. Switching to mock mode.")
            self.mock_mode = True
            self.client = None
        except ImportError:
            # This case should ideally be caught by find_spec, but as a safeguard
            logger.error("Failed to import OpenAI components. Switching to mock mode.")
            self.mock_mode = True
            self.client = None
        except Exception as e:
            import traceback
            tb_str = traceback.format_exc()
            logger.error(f"Unexpected error initializing OpenAI client: {e}\nTraceback:\n{tb_str}Switching to mock mode.")
            self.mock_mode = True
            self.client = None
            
    def get_client(self):
        """Get the OpenAI client or None if in mock mode"""
        return self.client
        
    def is_mock(self):
        """Check if running in mock mode"""
        return self.mock_mode
