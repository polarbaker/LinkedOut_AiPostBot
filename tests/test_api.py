"""
Tests for Flask API endpoints in the Enhanced LinkedIn Generator
"""

import os
import sys
import unittest
import json
from unittest.mock import patch

# Ensure modules directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import Flask app for testing
from app import app

class TestAPIEndpoints(unittest.TestCase):
    """Test suite for API endpoints"""
    
    def setUp(self):
        """Set up test client and environment"""
        # Force mock mode for all tests
        os.environ["MOCK_MODE"] = "true"
        os.environ["LLM_PROVIDER"] = "mock"
        
        # Configure test client
        app.config['TESTING'] = True
        self.client = app.test_client()
        
    def tearDown(self):
        """Clean up after tests"""
        # Remove test-specific environment variables
        if "MOCK_MODE" in os.environ:
            del os.environ["MOCK_MODE"]
        if "LLM_PROVIDER" in os.environ:
            del os.environ["LLM_PROVIDER"]
    
    def test_health_endpoint(self):
        """Test the /health endpoint"""
        response = self.client.get('/health')
        
        # Check status code
        self.assertEqual(response.status_code, 200)
        
        # Parse response data
        data = json.loads(response.data)
        
        # Check required fields
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'ok')
        self.assertIn('timestamp', data)
        
        # Check components
        self.assertIn('components', data)
        components = data['components']
        
        self.assertIn('flask', components)
        self.assertIn('llm_provider', components)
    
    def test_root_endpoint(self):
        """Test the root endpoint returns the main page"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
    @patch('modules.direct_generator.DirectGenerator.analyze_and_generate')
    def test_analyze_generate_news_endpoint(self, mock_analyze):
        """Test the /api/v1/analyze-generate-news endpoint"""
        # Configure mock to return a valid response structure
        mock_response = {
            "styleProfile": "Professional and concise",
            "newsSummary": "This is a summary of test news",
            "generatedPost": "This is a generated LinkedIn post about test news"
        }
        mock_analyze.return_value = mock_response
        
        # Test data
        test_data = {
            "previousPosts": "Previous test post content",
            "newsContent": {
                "title": "Test News Title",
                "content": "Test news content for analysis"
            },
            "summaryLength": "medium"
        }
        
        # Call the API endpoint
        response = self.client.post(
            '/api/v1/analyze-generate-news',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        
        # Check status code
        self.assertEqual(response.status_code, 200)
        
        # Parse response data
        data = json.loads(response.data)
        
        # Check required fields in response
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'success')
        self.assertIn('data', data)
        
        # Check the data returned matches our mock
        result_data = data['data']
        self.assertIn('styleProfile', result_data)
        self.assertIn('newsSummary', result_data)
        self.assertIn('generatedPost', result_data)
        
    def test_analyze_generate_news_missing_data(self):
        """Test the /api/v1/analyze-generate-news endpoint with missing data"""
        # Test with empty data
        response = self.client.post(
            '/api/v1/analyze-generate-news',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        # Should return an error
        self.assertEqual(response.status_code, 400)
        
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        
if __name__ == '__main__':
    unittest.main()
