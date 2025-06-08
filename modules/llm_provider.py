import os
import logging
import time
import traceback
import openai
from typing import Dict, List, Any, Union, Optional

# Configure module logger
logger = logging.getLogger(__name__)

class LLMProvider:
    """Base class for language model providers used in the application.
    
    All LLM providers should inherit from this class and implement the required methods.
    This ensures a consistent interface across different providers (OpenAI, Gemini, etc.)
    """
    
    def generate_chat_completion(self, messages: List[Dict[str, str]], **kwargs: Any) -> Any:
        """Generate a response from the language model based on a chat conversation.
        
        Args:
            messages: A list of message dictionaries, each containing 'role' and 'content'.
                     Follows OpenAI's chat completion format.
            **kwargs: Additional parameters for the LLM provider (temperature, max_tokens, etc.)
            
        Returns:
            A response object containing the generated text. The format may vary by provider,
            but will be standardized to match OpenAI's completion format.
            
        Raises:
            NotImplementedError: This method must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement generate_chat_completion method")

class OpenAIProvider(LLMProvider):
    """OpenAI API implementation of the LLMProvider interface.
    
    Uses the OpenAI Python client to generate chat completions from OpenAI models.
    """
    
    def __init__(self, openai_client: Any):
        """Initialize the OpenAI provider with a client.
        
        Args:
            openai_client: An initialized OpenAI client instance
        """
        self.client = openai_client

    def generate_chat_completion(self, messages: List[Dict[str, str]], **kwargs: Any) -> Any:
        """Generate a chat completion using OpenAI's API.
        
        Args:
            messages: A list of message dictionaries with 'role' and 'content' keys
            **kwargs: Additional parameters for the OpenAI API
                model: The model to use (default: gpt-3.5-turbo)
                temperature: Sampling temperature (default: 0.7)
                max_tokens: Maximum tokens to generate (default: 1500)
                
        Returns:
            An OpenAI API response object with the generated completion
        """
        return self.client.chat.completions.create(
            model=kwargs.get("model", "gpt-3.5-turbo"),
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 1500)
        )

class GeminiProvider(LLMProvider):
    """Implements access to Google's Gemini API with OpenAI fallback.
    
    Handles Google Gemini model access with OpenAI fallback in case of errors.
    """
    
    def __init__(self, api_key=None):
        """Initialize the Gemini provider.
        
        Args:
            api_key: Optional API key (will use GEMINI_API_KEY environment variable if not provided)
        """
        super().__init__()
        self.logger = logging.getLogger('linkedin-generator')
        
        # Check for explicit mock mode first
        self.mock_mode = os.environ.get("MOCK_MODE", "false").lower() in ["true", "1", "yes"]
        if self.mock_mode:
            self.logger.info("GeminiProvider initializing in mock mode (MOCK_MODE=true)")
            self.api_key = "mock-api-key"
            self.model = None
            self.current_model_name = "gemini-mock-model"
            return
            
        # Normal initialization path
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        self.model = None
        self.current_model_name = None
        
        self._initialize_gemini()

    def _initialize_gemini(self):
        """Initialize the connection to Google's Gemini API
        
        Raises:
            ValueError: If no valid API key is provided and no model can be initialized
        """
        import google.generativeai as genai
        import time
        
        # Skip initialization if in mock mode
        if self.mock_mode:
            self.logger.info("GeminiProvider initialization skipped (mock mode)")
            return
            
        if not self.api_key:
            self.logger.error("No Gemini API key provided. Set GEMINI_API_KEY environment variable or pass api_key to GeminiProvider.")
            self.logger.info("Attempting to fall back to OpenAI for this session...")
            fallback_provider = OpenAIProvider() 
            if fallback_provider.is_available():
                self.logger.warning("OpenAI fallback provider is available, will use for this session instead of Gemini")
                return
            else:
                raise ValueError("No valid Gemini API key provided and OpenAI fallback is not available")
        
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
        
        # Define generation config (used across models)
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
        
        # Start with the more capable models first in fallback chain
        self.model_names = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.0-pro',
            'gemini-pro',
            'gemini-1.0-pro-vision'
        ]
        
        self.model = None
        self.current_model_name = None
        
        # Try to list available models with retry logic
        for attempt in range(max_retries):
            try:
                all_models = genai.list_models()
                model_names = [model.name for model in all_models]
                self.logger.info(f"Available Gemini models: {model_names}")
                
                # Update model list based on available models if possible
                available_models = []
                for model_name in self.model_names:
                    if any(model_name in m for m in model_names):
                        available_models.append(model_name)
                
                if available_models:
                    self.logger.info(f"Found matching models in API: {available_models}")
                    self.model_names = available_models + [m for m in self.model_names if m not in available_models]
                break
                
            except Exception as e:
                import traceback
                self.logger.warning(f"Attempt {attempt+1}/{max_retries}: Unable to list models: {str(e)}")
                self.logger.debug(f"Model listing exception details: {traceback.format_exc()}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
        
        # Try each model name with retry logic for each model
        for model_name in self.model_names:
            success = False
            for attempt in range(max_retries):
                try:
                    self.model = genai.GenerativeModel(model_name, generation_config=self.generation_config)
                    test_response = self.model.generate_content("Hello, please respond with a single word: Working")
                    
                    if test_response and hasattr(test_response, 'text'):
                        self.logger.info(f"Successfully initialized Gemini with model '{model_name}'")
                        self.logger.info(f"Test response: {test_response.text[:20]}...")
                        self.current_model_name = model_name
                        success = True
                        break
                    else:
                        self.logger.warning(f"Model {model_name} did not return valid response format")
                
                except Exception as e:
                    import traceback
                    self.logger.warning(f"Attempt {attempt+1}/{max_retries} failed for model '{model_name}': {str(e)}")
                    self.logger.debug(f"Gemini model initialization exception:\n{traceback.format_exc()}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
            
            if success:
                break
        
        if self.model is None:
            raise ValueError("Could not initialize any Gemini model with the provided API key after all retries")
            
        self.logger.info(f"GeminiProvider initialization complete using model: {self.current_model_name}")

    def generate_chat_completion(self, messages, **kwargs):
        """Generate a chat completion using Gemini API with fallback mechanisms.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            **kwargs: Additional parameters for the generation
                temperature: Sampling temperature
                max_tokens: Maximum tokens to generate
                top_p: Nucleus sampling parameter
                top_k: Top-k sampling parameter
                
        Returns:
            A response object formatted to match OpenAI's completion format
            
        Raises:
            Exception: If all Gemini models and fallbacks fail
        """
        import logging
        import time
        
        # Handle mock mode with a realistic test response
        if self.mock_mode:
            self.logger.info("GeminiProvider.generate_chat_completion running in mock mode")
            mock_content = "This is a mock response from Gemini AI in testing mode."
            
            # Get the last user message for more realistic responses
            for message in reversed(messages):
                if message.get("role") == "user":
                    user_msg = message.get("content", "")
                    if "generate a linkedin post" in user_msg.lower():
                        mock_content = "I'm excited to share that our team has made significant progress on our latest project! #Innovation #Leadership"
                    elif "summarize" in user_msg.lower():
                        mock_content = "The article discusses key advances in artificial intelligence and their impact on business operations."
                    break
                    
            return {
                "choices": [
                    {
                        "message": {
                            "role": "assistant", 
                            "content": mock_content
                        }
                    }
                ],
                "model": self.current_model_name or "gemini-mock-model"
            }
        
        # Normal processing path
        import google.generativeai as genai
        from google.api_core import exceptions as google_exceptions
        import openai
        
        logger = logging.getLogger('linkedin-generator')
        
        # Format messages from OpenAI format to Gemini format
        # Gemini doesn't have a direct "system" role, so we'll include system prompts differently
        gemini_messages = []
        system_prompt = ""
        
        for msg in messages:
            role = msg.get("role", "").lower()
            content = msg.get("content", "")
            
            if role == "system":
                system_prompt += content + "\n"
            elif role == "user":
                gemini_messages.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                gemini_messages.append({"role": "model", "parts": [content]})
                
        # If we have a system prompt, prepend it to the first user message
        # or add it as a user message if none exists
        if system_prompt:
            if gemini_messages and gemini_messages[0]["role"] == "user":
                gemini_messages[0]["parts"][0] = system_prompt + "\n\n" + gemini_messages[0]["parts"][0]
            else:
                gemini_messages.insert(0, {"role": "user", "parts": [system_prompt]})
        
        # Configure generation parameters
        generation_config = {
            "temperature": kwargs.get("temperature", 0.7),
            "max_output_tokens": kwargs.get("max_tokens", 2048),
            "top_p": kwargs.get("top_p", 0.95),
            "top_k": kwargs.get("top_k", 40),
        }
        
        # Try to generate content with each model in our fallback chain
        for model_name in self.model_names:
            # Multiple retry attempts for transient errors
            for attempt in range(self.max_retries):
                try:
                    # Use the cached model if it matches our target model, otherwise create a new one
                    if self.model is None or self.current_model_name != model_name:
                        logger.info(f"Switching to model '{model_name}'")
                        self.model = genai.GenerativeModel(model_name, generation_config=self.generation_config)
                        self.current_model_name = model_name
                    
                    # If we have chat messages, use generate_content with messages
                    if gemini_messages:
                        logger.debug(f"Attempt {attempt+1}/{self.max_retries}: Sending chat messages to Gemini model '{model_name}'")
                        response = self.model.generate_content(
                            gemini_messages,
                            generation_config=generation_config
                        )
                        
                        # Check if we have a valid response
                        if response and hasattr(response, 'text'):
                            logger.info(f"Successfully generated content with model '{model_name}'")
                            # Format response to match OpenAI format for consistency
                            return {
                                "choices": [
                                    {
                                        "message": {
                                            "role": "assistant",
                                            "content": response.text
                                        },
                                        "finish_reason": "stop"
                                    }
                                ],
                                "model": model_name,
                                "provider": "gemini"
                            }
                        else:
                            logger.warning(f"Model '{model_name}' returned an invalid response format on attempt {attempt+1}")
                            if attempt < self.max_retries - 1:
                                time.sleep(self.retry_delay)
                                continue
                            # Fall through to try another model if max retries reached
                        
                    else:
                        logger.warning("No properly formatted messages to send to Gemini")
                        # Skip retries if we have no messages to send
                        break
                
                except (google_exceptions.ResourceExhausted, 
                        google_exceptions.ServiceUnavailable, 
                        google_exceptions.DeadlineExceeded) as e:
                    # These are likely transient errors, retry
                    logger.warning(f"Transient error with model '{model_name}' on attempt {attempt+1}: {str(e)}")
                    if attempt < self.max_retries - 1:
                        wait_time = self.retry_delay * (2 ** attempt)  # Exponential backoff
                        logger.info(f"Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"Failed after {self.max_retries} attempts with model '{model_name}'")
                        # Move to next model
                        break
                        
                except Exception as e:
                    import traceback
                    logger.error(f"Unrecoverable error with model '{model_name}': {str(e)}")
                    logger.debug(f"Exception details:\n{traceback.format_exc()}")
                    # Skip retries for errors that aren't likely to be transient
                    break
                # Continue to the next model
                continue
        
        # If we've exhausted all Gemini models, fall back to OpenAI
        logger.warning("All Gemini models failed, attempting to fall back to OpenAI")
        
        # Check for OpenAI API key
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.error("OpenAI API key not found for fallback")
            raise Exception("All Gemini models failed and OpenAI API key not available for fallback")
        
        try:
            # Create OpenAI client with the API key
            openai_client = openai.OpenAI(api_key=openai_api_key)
            
            # Create a new instance of OpenAIProvider (from this module)
            openai_provider = OpenAIProvider(openai_client)
            
            logger.info("Falling back to OpenAI for this request")
            return openai_provider.generate_chat_completion(messages, **kwargs)
            
        except Exception as e:
            logger.error(f"OpenAI fallback also failed: {str(e)}")
            logger.debug(f"OpenAI fallback exception details:\n{traceback.format_exc()}")
            raise Exception(f"All LLM providers failed. Last error: {str(e)}")
