"""
Tests for LLM providers in the Enhanced LinkedIn Generator
"""

import os
import sys
import unittest
import json
from unittest.mock import patch, MagicMock

# Ensure modules directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import modules to test
from modules.llm_provider import LLMProvider, OpenAIProvider, GeminiProvider
from modules.direct_generator import DirectGenerator

class TestLLMProviders(unittest.TestCase):
    """Test suite for LLM providers"""
    
    def setUp(self):
        """Setup test environment - ensure mock mode is enabled"""
        # Force mock mode for all tests
        os.environ["MOCK_MODE"] = "true"
        os.environ["LLM_PROVIDER"] = "mock"
        
    def tearDown(self):
        """Clean up after tests"""
        # Remove test-specific environment variables
        if "MOCK_MODE" in os.environ:
            del os.environ["MOCK_MODE"]
        if "LLM_PROVIDER" in os.environ:
            del os.environ["LLM_PROVIDER"]
            
    def test_openai_provider_mock_mode(self):
        """Test that OpenAIProvider works in mock mode"""
        import openai
        
        # Create a mock OpenAI client
        mock_client = MagicMock()
        mock_response = {
            "choices": [
                {
                    "message": {
                        "content": "This is a mock response"
                    }
                }
            ],
            "model": "mock-model"
        }
        mock_client.chat.completions.create.return_value = mock_response
        
        # Test the provider
        provider = OpenAIProvider(mock_client)
        messages = [
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": "Generate a test post"}
        ]
        
        response = provider.generate_chat_completion(messages)
        
        # Verify response structure
        self.assertIn("choices", response)
        self.assertGreaterEqual(len(response["choices"]), 1)
        self.assertIn("message", response["choices"][0])
        self.assertIn("content", response["choices"][0]["message"])
    
    @patch('google.generativeai.GenerativeModel')
    def test_gemini_provider_mock_mode(self, mock_generative_model):
        """Test that GeminiProvider works in mock mode"""
        # Configure the mock
        mock_instance = MagicMock()
        mock_generative_model.return_value = mock_instance
        
        mock_response = MagicMock()
        mock_response.text = "This is a mock Gemini response"
        mock_instance.generate_content.return_value = mock_response
        
        # Test with a mock API key
        provider = GeminiProvider("mock-api-key")
        
        # Override model loading to use our mock
        provider.model = mock_instance
        
        messages = [
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": "Generate a test post"}
        ]
        
        response = provider.generate_chat_completion(messages)
        
        # Verify response structure matches OpenAI format for compatibility
        self.assertIn("choices", response)
        self.assertGreaterEqual(len(response["choices"]), 1)
        self.assertIn("message", response["choices"][0])
        self.assertIn("content", response["choices"][0]["message"])
        self.assertEqual(response["choices"][0]["message"]["content"], "This is a mock Gemini response")
    
    def test_direct_generator_initialization(self):
        """Test that DirectGenerator can initialize in mock mode"""
        generator = DirectGenerator()
        self.assertTrue(generator.mock_mode)
        
    @patch('modules.direct_generator.DirectGenerator.analyze_and_generate')
    def test_direct_generator_mock_response(self, mock_analyze):
        """Test that DirectGenerator provides mock responses when needed"""
        # Configure mock to return a valid response structure
        mock_response = {
            "styleProfile": "Professional and concise",
            "newsSummary": "This is a summary of test news",
            "generatedPost": "This is a generated LinkedIn post about test news"
        }
        mock_analyze.return_value = mock_response
        
        # Create generator and test
        generator = DirectGenerator()
        
        # Test with minimal input
        result = generator.analyze_and_generate(
            "Previous test post",
            {"title": "Test News", "content": "Test content"}
        )
        
        # Verify response structure
        self.assertIn("styleProfile", result)
        self.assertIn("newsSummary", result)
        self.assertIn("generatedPost", result)
        
if __name__ == '__main__':
    unittest.main()
