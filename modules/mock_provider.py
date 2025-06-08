"""
Mock LLM Provider for testing and development purposes
"""
import os
import logging
import json
import random
from datetime import datetime
from modules.llm_provider import LLMProvider

logger = logging.getLogger('linkedin-generator')

class MockProvider(LLMProvider):
    """
    Mock LLM Provider that returns predefined responses for testing
    without making actual API calls
    """
    
    def __init__(self):
        """Initialize the mock provider with predefined responses"""
        super().__init__()
        self.logger = logging.getLogger('linkedin-generator')
        self.logger.info("MockProvider: Initializing mock LLM provider")
        
        # Load predefined responses if available
        self.responses = self._load_responses()
        self.response_index = 0
        self.mock_conversation_history = []
        
    def _load_responses(self):
        """Load mock responses from a file if available"""
        default_responses = {
            "linkedin_posts": [
                "I'm excited to announce that our team has just hit a major milestone! After months of hard work, we've successfully launched our new product. #TeamSuccess #ProductLaunch",
                "Just wrapped up an enlightening webinar on AI ethics. The discussions around responsible innovation were thought-provoking. Sharing key takeaways soon! #AIEthics #ProfessionalDevelopment", 
                "Honored to be recognized as a thought leader in our industry this week. Grateful for my incredible team who makes innovation possible every day. #Leadership #Teamwork"
            ],
            "summaries": [
                "The article discusses advances in artificial intelligence and their impact on business operations.",
                "Research highlights the importance of work-life balance for productivity and employee retention.",
                "The study examines market trends in the tech industry and predicts continued growth in cloud computing."
            ],
            "error_responses": [
                {"error": "mock_error", "message": "This is a mock error response for testing"},
                {"error": "timeout", "message": "Mock timeout error"},
                {"error": "rate_limit", "message": "Mock rate limit exceeded"}
            ]
        }
        
        # Check if custom responses file exists
        mock_responses_path = os.path.join(os.path.dirname(__file__), 'mock_responses.json')
        if os.path.exists(mock_responses_path):
            try:
                with open(mock_responses_path, 'r') as f:
                    custom_responses = json.load(f)
                self.logger.info(f"MockProvider: Loaded custom mock responses from {mock_responses_path}")
                return custom_responses
            except Exception as e:
                self.logger.warning(f"MockProvider: Failed to load custom responses: {e}")
        
        self.logger.info("MockProvider: Using default mock responses")
        return default_responses
    
    def generate_chat_completion(self, messages, **kwargs):
        """
        Generate a mock chat completion response
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            **kwargs: Additional parameters (ignored in mock implementation)
            
        Returns:
            A response object formatted to match OpenAI's completion format
        """
        # Record messages for potential inspection during testing
        self.mock_conversation_history.extend(messages)
        
        # Determine response type based on the last user message
        last_user_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_msg = msg.get("content", "").lower()
                break
                
        # Select appropriate mock content based on message content
        content = "This is a generic mock response."
        
        if "linkedin" in last_user_msg or "post" in last_user_msg:
            content = random.choice(self.responses.get("linkedin_posts", ["Mock LinkedIn post content"]))
        elif "summarize" in last_user_msg or "summary" in last_user_msg:
            content = random.choice(self.responses.get("summaries", ["Mock summary content"]))
        elif "error" in last_user_msg:
            # Return a mock error response for testing error handling
            error_resp = random.choice(self.responses.get("error_responses", [{"error": "mock_error", "message": "Mock error"}]))
            return {
                "error": error_resp
            }
        
        # Return in OpenAI-compatible format
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant", 
                        "content": content
                    }
                }
            ],
            "model": "mock-model",
            "mock_metadata": {
                "timestamp": datetime.now().isoformat(),
                "is_mock": True
            }
        }
    
    def is_available(self):
        """Check if provider is available (always true for mock)"""
        return True
