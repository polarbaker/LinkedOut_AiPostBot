"""
Voice Analysis Engine for Enhanced LinkedIn Post Generator
This module analyzes previous LinkedIn posts to create a personal style profile.
"""
import os
import random
import json
import logging
from modules.openai_wrapper import OpenAIWrapper
from modules.llm_provider import OpenAIProvider, GeminiProvider

logger = logging.getLogger('linkedin-generator')

class VoiceAnalyzer:
    """Analyzes LinkedIn posts to create a voice style profile."""
    
    def __init__(self):
        """Initialize the voice analyzer with OpenAI API if available."""
        # Use our OpenAI wrapper to handle initialization safely
        self.openai_wrapper = OpenAIWrapper()
        self.mock_mode = self.openai_wrapper.is_mock()
        self.client = self.openai_wrapper.get_client()
        provider_name = os.getenv("LLM_PROVIDER", "openai").lower()
        logger.info(f"VoiceAnalyzer: LLM_PROVIDER environment variable set to: '{provider_name}' (defaulting to 'openai' if not set).")

        if provider_name == "gemini":
            try:
                from modules.llm_provider import GeminiProvider
                gemini_api_key = os.getenv("GEMINI_API_KEY")
                if not gemini_api_key:
                    logger.warning("VoiceAnalyzer: LLM_PROVIDER is 'gemini' but GEMINI_API_KEY is not set. Falling back to mock/OpenAI if possible or may error.")
                self.llm = GeminiProvider(gemini_api_key)
                logger.info("VoiceAnalyzer: Successfully initialized GeminiProvider.")
            except Exception as e:
                logger.error(f"VoiceAnalyzer: Failed to initialize GeminiProvider: {e}. Falling back to OpenAIProvider.")
                self.llm = OpenAIProvider(self.client) # Fallback
                logger.info("VoiceAnalyzer: Initialized OpenAIProvider as fallback.")
        else:
            if provider_name != "openai":
                logger.warning(f"VoiceAnalyzer: Unknown LLM_PROVIDER '{provider_name}', defaulting to OpenAI.")
            self.llm = OpenAIProvider(self.client)
            logger.info("VoiceAnalyzer: Initialized OpenAIProvider (default or explicit).")

        if self.mock_mode:
            logger.info("VoiceAnalyzer: OpenAIWrapper indicates mock mode (e.g., OPENAI_API_KEY missing). Specific provider behavior may vary.")
        else:
            logger.info("VoiceAnalyzer: OpenAIWrapper indicates non-mock mode (e.g., OPENAI_API_KEY present).")

        
    def analyze(self, previous_posts):
        """
        Analyze previous LinkedIn posts to extract writing style characteristics.
        
        Args:
            previous_posts (str): 3-5 previous LinkedIn posts
            
        Returns:
            dict: A profile containing tone, vocabulary patterns, sentence structure,
                 emoji usage, and industry-specific language
        """
        if not previous_posts.strip():
            return self.get_default_profile()
            
        if self.mock_mode:
            # Return a mock profile when OpenAI is not available
            return self.get_mock_profile(previous_posts)
        
        try:
            response = self.llm.generate_chat_completion(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert writing and voice style analyzer."},
                    {"role": "user", "content": """Analyze the following LinkedIn posts and extract a comprehensive personal 
                    writing style profile. Focus on tone, vocabulary patterns, sentence structure, emoji usage, 
                    and engagement style. Format your response as a clean JSON with the following keys: 
                    name, tone, vocabulary, structure, emojiUsage, engagement.
                    
                    Here are the posts to analyze:
                    
                    {}
                    """.format(previous_posts)}
                ],
                response_format={"type": "json_object"}
            )
            
            # Extract and parse the JSON response
            style_profile = response.choices[0].message.content
            return json.loads(style_profile)
        except Exception as e:
            print(f"Error during voice analysis: {e}")
            return self.get_default_profile()
    
    def get_mock_profile(self, posts):
        """Return a mock profile based on simple text analysis"""
        profiles = [
            {
                "name": "Professional Executive",
                "tone": "Authoritative, confident, strategic",
                "vocabulary": "Industry-specific, management-focused, data-driven",
                "structure": "Concise statements, clear bullet points, direct calls to action",
                "emojiUsage": "Minimal to none",
                "engagement": "Asks thought leadership questions, shares insights"
            },
            {
                "name": "Casual Thought Leader",
                "tone": "Conversational, approachable, insightful",
                "vocabulary": "Accessible language with occasional industry terms",
                "structure": "Short paragraphs, questions to audience, storytelling",
                "emojiUsage": "Moderate, strategic use of relevant emojis",
                "engagement": "Personal anecdotes, asks for opinions, interactive"
            },
            {
                "name": "Technical Expert",
                "tone": "Precise, analytical, educational",
                "vocabulary": "Technical terminology, specific concepts, educational",
                "structure": "Detailed explanations, logical flow, evidence-based",
                "emojiUsage": "Minimal, only for emphasis",
                "engagement": "Shares insights, asks technical questions, cites sources"
            }
        ]
        
        # Select profile based on post characteristics
        words = posts.lower().split()
        
        # Simple analysis to select a profile
        if any(word in words for word in ['data', 'strategy', 'leadership', 'results']):
            return profiles[0]
        elif any(word in words for word in ['think', 'question', 'opinion', 'share']):
            return profiles[1]
        else:
            return profiles[2]
    
    def get_default_profile(self):
        """Return a default profile if analysis fails"""
        return {
            "name": "Balanced Professional",
            "tone": "professional and approachable",
            "vocabulary": "industry-standard with accessible language",
            "structure": "clear, concise, and engaging",
            "emojiUsage": "strategic and minimal",
            "engagement": "informative with occasional questions"
        }
