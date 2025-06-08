"""
Direct Content Generator for Enhanced LinkedIn Post Generator
Bypasses voice analysis and directly generates news summary posts
"""
import os
import logging
import json
from datetime import datetime
from modules.openai_wrapper import OpenAIWrapper
from modules.llm_provider import OpenAIProvider, GeminiProvider
from modules.mock_provider import MockProvider

logger = logging.getLogger('linkedin-generator')

class DirectGenerator:
    """Generate content directly from previous posts and news sources"""
    
    def __init__(self):
        """Initialize the direct content generator with configured LLM provider"""
        # Check mock mode settings from environment variables
        self.mock_mode = os.getenv("MOCK_MODE", "false").lower() in ["true", "1", "yes"]
        provider_name = os.getenv("LLM_PROVIDER", "openai").lower()
        
        # Use mock provider if in mock mode or provider set to 'mock'
        if self.mock_mode or provider_name == "mock":
            logger.info("DirectGenerator: Initializing in mock mode")
            self.mock_mode = True
            self.llm = MockProvider()
            logger.info("DirectGenerator: Mock provider initialized and ready")
            return
        
        # Normal initialization path for non-mock mode
        self.openai_wrapper = OpenAIWrapper()
        
        # If not explicitly in mock mode, check OpenAIWrapper's determination
        if not self.mock_mode:
            self.mock_mode = self.openai_wrapper.is_mock()
            
        self.client = self.openai_wrapper.get_client()
        logger.info(f"DirectGenerator: LLM_PROVIDER environment variable set to: '{provider_name}' (defaulting to 'openai' if not set).")
        logger.info(f"DirectGenerator: Mock mode is {'enabled' if self.mock_mode else 'disabled'}")

        # If mock mode is determined after OpenAIWrapper check
        if self.mock_mode:
            logger.info("DirectGenerator: OpenAIWrapper indicates mock mode - missing API keys")
            self.llm = MockProvider()
            logger.info("DirectGenerator: Mock provider initialized and ready")
        elif provider_name == "gemini":
            try:
                gemini_api_key = os.getenv("GEMINI_API_KEY")
                if not gemini_api_key:
                    logger.warning("DirectGenerator: LLM_PROVIDER is 'gemini' but GEMINI_API_KEY is not set. Falling back to mock/OpenAI if possible or may error.")
                    # Potentially fall back or let it fail if GeminiProvider requires key
                self.llm = GeminiProvider(gemini_api_key)
                logger.info("DirectGenerator: Successfully initialized GeminiProvider.")
            except Exception as e:
                logger.error(f"DirectGenerator: Failed to initialize GeminiProvider: {e}. Falling back to OpenAIProvider.")
                self.llm = OpenAIProvider(self.client) # Fallback
                logger.info("DirectGenerator: Initialized OpenAIProvider as fallback.")
        else:
            if provider_name not in ["openai", "mock"]:
                logger.warning(f"DirectGenerator: Unknown LLM_PROVIDER '{provider_name}', defaulting to OpenAI.")
            self.llm = OpenAIProvider(self.client)
            logger.info("DirectGenerator: Initialized OpenAIProvider (default or explicit).")

        # self.mock_mode is primarily based on OpenAIWrapper's check for OPENAI_API_KEY
        if self.mock_mode:
            logger.info("DirectGenerator: OpenAIWrapper indicates mock mode (e.g., OPENAI_API_KEY missing). Specific provider behavior may vary.")
        else:
            logger.info("DirectGenerator: OpenAIWrapper indicates non-mock mode (e.g., OPENAI_API_KEY present).")
            
    def analyze_and_generate(self, previous_posts, news_content, summary_length='medium'):
        """
        Analyze previous posts and generate news summary in the same style
        
        Args:
            previous_posts (str): Previous LinkedIn posts to analyze style
            news_content (dict): Source news content to summarize
            summary_length (str): Length of summary (short, medium, long)
            
        Returns:
            dict: Generated post content with style analysis
        """
        if self.mock_mode:
            return self._mock_summary(previous_posts, news_content, summary_length)
        
        try:
            # Validate inputs first
            if not previous_posts or not isinstance(previous_posts, str):
                logger.warning("Invalid previous_posts input: empty or not a string")
                previous_posts = "This is a placeholder post since no valid previous posts were provided."
            
            # Validate news_content
            if not news_content or not isinstance(news_content, dict):
                logger.warning("Invalid news_content input: not a dictionary or empty")
                news_content = {"title": "Placeholder Article", "content": "No valid news content was provided.", "url": ""}
            
            # Extract style from previous posts
            style_profile = self._extract_writing_style(previous_posts)
            
            # Generate news summary using extracted style
            generated_post = self._generate_news_summary(style_profile, news_content, summary_length)
            
            # Complete response with both style analysis and generated post
            return {
                "styleProfile": style_profile,
                "generatedPost": generated_post,
                "timestamp": datetime.now().isoformat(),
                "source": news_content.get("url", ""),
                "title": news_content.get("title", "")
            }
        
        except Exception as e:
            import traceback
            logger.error(f"Error generating direct news summary: {e}")
            logger.error(f"Exception traceback: {traceback.format_exc()}")
            # Fall back to mock data
            return self._mock_summary(previous_posts, news_content, summary_length)
    
    def _extract_writing_style(self, previous_posts):
        """Extract writing style from previous posts using OpenAI"""
        try:
            if not previous_posts or not self.client:
                return self._get_default_style_profile()
                
            logger.info("Extracting writing style from previous posts")
            
            # Create detailed prompt for style analysis
            prompt = [
                {"role": "system", "content": "You are an expert writing style analyst. Analyze the LinkedIn posts provided and extract the author's writing style characteristics. Focus on tone, sentence structure, vocabulary level, use of questions, emoji usage, hashtag style, and distinctive patterns."},
                {"role": "user", "content": f"Analyze these LinkedIn posts and provide a detailed style profile that could be used to generate new content in the exact same personal style:\n\n{previous_posts}"}
            ]
            
            response = self.llm.generate_chat_completion(
                prompt,
                model="gpt-3.5-turbo",  # Or Gemini equivalent if selected
                temperature=0.3,
                max_tokens=1000
            )
            raw_analysis = response.choices[0].message.content
            
            # Second call to structure the analysis
            structure_prompt = [
                {"role": "system", "content": "You are a data structuring assistant. Convert the provided writing style analysis into a structured JSON format with these keys: tone, vocabulary, structure, patterns, hashtags, emoji_usage, engagement_tactics."},
                {"role": "user", "content": f"Convert this writing style analysis to structured JSON:\n\n{raw_analysis}"}
            ]
            
            structure_response = self.llm.generate_chat_completion(
                structure_prompt,
                model="gpt-3.5-turbo",  # Or Gemini equivalent if selected
                temperature=0.1,
                max_tokens=800,
                response_format={"type": "json_object"}
            )
            
            # Parse structured style profile
            style_profile = json.loads(structure_response.choices[0].message.content)
            
            return style_profile
            
        except Exception as e:
            logger.error(f"Error extracting writing style: {e}")
            return self._get_default_style_profile()
    
    def _generate_news_summary(self, style_profile, news_content, summary_length):
        """Generate news summary using the extracted style and news content"""
        try:
            if not news_content or not self.client:
                return self._get_mock_news_summary()
            
            length_words = {
                "short": "100-150 words",
                "medium": "200-300 words",
                "long": "400-500 words"
            }.get(summary_length, "200-300 words")
            
            # Construct content details from news_content
            content_details = ""
            if "title" in news_content:
                content_details += f"Title: {news_content['title']}\n"
            if "description" in news_content:
                content_details += f"Description: {news_content['description']}\n"
            if "content" in news_content:
                content_details += f"Content: {news_content['content']}\n"
            if "url" in news_content:
                content_details += f"Source URL: {news_content['url']}\n"
                
            if not content_details:
                content_details = str(news_content)
            
            # Format style details
            style_details = json.dumps(style_profile, indent=2)
            
            # Create detailed prompt for content generation
            prompt = [
                {"role": "system", "content": f"You are a professional LinkedIn content writer. Generate a LinkedIn post summarizing news content in the exact style described in the profile below. The summary should be {length_words} long.\n\nSTYLE PROFILE:\n{style_details}"},
                {"role": "user", "content": f"Create a LinkedIn post summarizing this news:\n\n{content_details}"}
            ]
            
            response = self.llm.generate_chat_completion(
                prompt,
                model="gpt-3.5-turbo",  # Or Gemini equivalent if selected
                temperature=0.7,
                max_tokens=1500
            )
            post_content = response.choices[0].message.content
        
            # Extract hashtags if present
            hashtags = []
            hashtag_extractor_prompt = [
                {"role": "system", "content": "Extract all hashtags from the text. Return only a JSON array of hashtags without the # symbol."},
                {"role": "user", "content": post_content}
            ]
            
            hashtag_response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=hashtag_extractor_prompt,
                temperature=0.1,
                max_tokens=200,
                response_format={"type": "json_object"}
            )
            
            try:
                hashtag_data = json.loads(hashtag_response.choices[0].message.content)
                if isinstance(hashtag_data, dict) and "hashtags" in hashtag_data:
                    hashtags = hashtag_data["hashtags"]
                elif isinstance(hashtag_data, list):
                    hashtags = hashtag_data
            except:
                # If we can't parse JSON, extract hashtags manually
                import re
                hashtags = re.findall(r'#(\w+)', post_content)
            
            return {
                "content": post_content,
                "hashtags": hashtags,
                "wordCount": len(post_content.split()),
                "estimatedReadTime": f"{max(1, len(post_content.split()) // 200)} min read",
                "type": "News Summary"
            }
        
        except Exception as e:
            logger.error(f"Error generating news summary: {e}")
            return self._get_mock_news_summary()
    
    def _get_default_style_profile(self):
        """Return default style profile for fallback"""
        return {
            "tone": "Professional with personal touches",
            "vocabulary": "Industry-specific with accessible explanations",
            "structure": "Brief intro, main points, engaging question or call to action at the end",
            "patterns": "Concise sentences, occasional use of questions, personal anecdotes",
            "hashtags": "3-5 relevant industry and topic hashtags",
            "emoji_usage": "Sparse, strategic use of 1-2 emojis for emphasis",
            "engagement_tactics": "Questions to audience, inviting comments, sharing insights"
        }
    
    def _get_mock_news_summary(self):
        """Return mock news summary for fallback"""
        return {
            "content": "Just read a fascinating article on the future of AI in marketing. The key takeaway: personalization at scale is becoming the new standard, with 78% of consumers more likely to engage with tailored content.\n\nWhat's interesting is that companies implementing AI-driven personalization are seeing 40% higher conversion rates and better customer retention.\n\nAre you using AI in your marketing strategy yet? I'd love to hear your experiences!\n\n#AIMarketing #DigitalTransformation #CustomerExperience",
            "hashtags": ["AIMarketing", "DigitalTransformation", "CustomerExperience"],
            "wordCount": 74,
            "estimatedReadTime": "1 min read",
            "type": "News Summary"
        }
    
    def _mock_summary(self, previous_posts, news_content, summary_length):
        """Generate mock data for testing"""
        title = news_content.get("title", "AI Advancements in Marketing") if isinstance(news_content, dict) else "AI Advancements in Marketing"
        
        return {
            "styleProfile": self._get_default_style_profile(),
            "generatedPost": self._get_mock_news_summary(),
            "timestamp": datetime.now().isoformat(),
            "source": news_content.get("url", "https://example.com/news/ai-marketing") if isinstance(news_content, dict) else "https://example.com/news/ai-marketing",
            "title": title
        }
