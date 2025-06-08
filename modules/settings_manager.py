"""
Settings Manager Module - Handles configuration changes during runtime
"""
import os
import json
import logging
import threading
import time
from pathlib import Path
from dotenv import load_dotenv, set_key, find_dotenv

# Configure logging
logger = logging.getLogger(__name__)

class SettingsManager:
    """
    Manages application settings and provides methods to update them at runtime.
    Supports changing between mock and operational modes.
    """
    def __init__(self, env_file=None):
        """Initialize the settings manager"""
        if env_file:
            self.env_file = env_file
        else:
            self.env_file = find_dotenv()
        
        if not self.env_file:
            # Create a new .env file if it doesn't exist
            self.env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
            if not os.path.exists(self.env_file):
                with open(self.env_file, 'w') as f:
                    f.write("# Enhanced LinkedIn Generator Environment\n")
                logger.info(f"Created new .env file at {self.env_file}")
        
        # Load current environment variables
        load_dotenv(self.env_file)
    
    def get_current_settings(self):
        """Get current application settings"""
        mock_mode = os.getenv("MOCK_MODE", "false").lower() in ["true", "1", "yes"]
        provider = os.getenv("LLM_PROVIDER", "mock").lower()
        
        # Don't return actual API keys, just whether they're set
        gemini_key_set = bool(os.getenv("GEMINI_API_KEY"))
        openai_key_set = bool(os.getenv("OPENAI_API_KEY"))
        
        return {
            "mock_mode": mock_mode,
            "provider": provider,
            "gemini_api_key_set": gemini_key_set,
            "openai_api_key_set": openai_key_set,
            "env_file": self.env_file
        }
    
    def update_settings(self, settings):
        """
        Update application settings
        
        Args:
            settings (dict): Dictionary containing settings to update
                - mock_mode (bool): Enable/disable mock mode
                - provider (str): LLM provider (gemini, openai, mock)
                - gemini_api_key (str): Google Gemini API key
                - openai_api_key (str): OpenAI API key
        
        Returns:
            bool: True if settings were updated successfully
        """
        try:
            env_file = self.env_file
            
            # Update mock mode
            if "mock_mode" in settings:
                mock_value = "true" if settings["mock_mode"] else "false"
                set_key(env_file, "MOCK_MODE", mock_value)
                logger.info(f"Updated MOCK_MODE to {mock_value}")
            
            # Update LLM provider
            if "provider" in settings:
                provider = settings["provider"].lower()
                if provider in ["gemini", "openai", "mock"]:
                    set_key(env_file, "LLM_PROVIDER", provider)
                    logger.info(f"Updated LLM_PROVIDER to {provider}")
                else:
                    logger.warning(f"Invalid provider: {provider}. Must be gemini, openai, or mock.")
            
            # Update API keys if provided and not empty
            if "gemini_api_key" in settings and settings["gemini_api_key"]:
                set_key(env_file, "GEMINI_API_KEY", settings["gemini_api_key"])
                logger.info("Updated GEMINI_API_KEY")
                
            if "openai_api_key" in settings and settings["openai_api_key"]:
                set_key(env_file, "OPENAI_API_KEY", settings["openai_api_key"])
                logger.info("Updated OPENAI_API_KEY")
            
            # Reload environment variables
            load_dotenv(self.env_file, override=True)
            
            return True
        
        except Exception as e:
            logger.error(f"Error updating settings: {e}")
            return False
    
    def schedule_restart(self, delay=5):
        """
        Schedule an application restart
        
        Args:
            delay (int): Delay in seconds before restart
            
        Returns:
            bool: True if restart was scheduled
        """
        def _restart():
            logger.info(f"Scheduled restart in {delay} seconds...")
            time.sleep(delay)
            logger.info("Restarting application...")
            # Use SIGUSR1 signal to trigger a graceful restart
            # The main app should catch this and restart
            os.kill(os.getpid(), 10)  # SIGUSR1 = 10
        
        try:
            # Start restart in a separate thread
            restart_thread = threading.Thread(target=_restart)
            restart_thread.daemon = True
            restart_thread.start()
            return True
        except Exception as e:
            logger.error(f"Error scheduling restart: {e}")
            return False
