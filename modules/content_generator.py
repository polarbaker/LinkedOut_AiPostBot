"""
Content Generator Module for Enhanced LinkedIn Post Generator
This module generates personalized LinkedIn content based on voice profiles and source articles.
"""
import os
import json
import re
from datetime import datetime
import random
import logging
from modules.openai_wrapper import OpenAIWrapper
from modules.llm_provider import OpenAIProvider, GeminiProvider

logger = logging.getLogger('linkedin-generator')

class ContentGenerator:
    """Generates personalized LinkedIn posts based on voice profile and source content."""
    
    def __init__(self):
        """Initialize the content generator with OpenAI client if available."""
        # Use our OpenAI wrapper to handle initialization safely
        self.openai_wrapper = OpenAIWrapper()
        self.mock_mode = self.openai_wrapper.is_mock()
        self.client = self.openai_wrapper.get_client()
        provider_name = os.getenv("LLM_PROVIDER", "openai").lower()
        logger.info(f"ContentGenerator: LLM_PROVIDER environment variable set to: '{provider_name}' (defaulting to 'openai' if not set).")

        if provider_name == "gemini":
            try:
                # Already imported at the top level
                # from modules.llm_provider import GeminiProvider
                gemini_api_key = os.getenv("GEMINI_API_KEY")
                if not gemini_api_key:
                    logger.warning("ContentGenerator: LLM_PROVIDER is 'gemini' but GEMINI_API_KEY is not set. Falling back to mock/OpenAI if possible or may error.")
                self.llm = GeminiProvider(gemini_api_key)
                logger.info("ContentGenerator: Successfully initialized GeminiProvider.")
            except Exception as e:
                logger.error(f"ContentGenerator: Failed to initialize GeminiProvider: {e}. Falling back to OpenAIProvider.")
                self.llm = OpenAIProvider(self.client) # Fallback
                logger.info("ContentGenerator: Initialized OpenAIProvider as fallback.")
        else:
            if provider_name != "openai":
                logger.warning(f"ContentGenerator: Unknown LLM_PROVIDER '{provider_name}', defaulting to OpenAI.")
            self.llm = OpenAIProvider(self.client)
            logger.info("ContentGenerator: Initialized OpenAIProvider (default or explicit).")

        if self.mock_mode:
            logger.info("ContentGenerator: OpenAIWrapper indicates mock mode (e.g., OPENAI_API_KEY missing). Specific provider behavior may vary.")
        else:
            logger.info("ContentGenerator: OpenAIWrapper indicates non-mock mode (e.g., OPENAI_API_KEY present).")

        self.post_types = {
            "Professional Insight": "Share professional expertise with a thought leadership angle",
            "Quick Update": "Brief status update on professional activities or industry trends",
            "Question Starter": "Ask an engaging question to start a conversation with your network",
            "Story Format": "Share a narrative about a professional experience or learning",
            "Industry Analysis": "Analyze recent industry developments with your expert perspective"
        }
    
    def _extract_hashtags(self, content, industry_terms):
        """
        Extract industry-specific terms for hashtag suggestions
        
        Args:
            content (str): Article content
            industry_terms (str): Industry-specific language from voice profile
            
        Returns:
            list: List of suggested hashtags
        """
        try:
            prompt = f"""
            Generate 3-5 relevant LinkedIn hashtags based on the following content:
            
            Content: {content[:1000]}...
            
            Industry terms to consider: {industry_terms}
            
            Return only the hashtags as a Python list of strings. Include the # symbol.
            """
            
            response = self.llm.generate_chat_completion(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You generate relevant hashtags for LinkedIn content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150
            )
            
            hashtags_text = response.choices[0].message.content
            # Extract list using regex
            match = re.search(r'\[.*?\]', hashtags_text)
            if match:
                hashtags = eval(match.group(0))
                return hashtags[:5]  # Limit to 5 hashtags
            else:
                return ["#leadership", "#innovation", "#professional"]
        except Exception as e:
            print(f"Error generating hashtags: {e}")
            return ["#leadership", "#innovation", "#professional"]
    
    def _predict_engagement(self, post_content, post_type):
        """
        Predict engagement score for the generated post
        
        Args:
            post_content (str): Generated post content
            post_type (str): Type of post
            
        Returns:
            float: Engagement score from 1-10
        """
        # This is a simplified implementation
        # In reality, this would use ML models trained on engagement data
        
        # Base scores by post type
        type_scores = {
            "Professional Insight": 7.5,
            "Quick Update": 6.5,
            "Question Starter": 8.0,
            "Story Format": 7.8,
            "Industry Analysis": 7.2
        }
        
        base_score = type_scores.get(post_type, 7.0)
        
        # Length factor (optimal range is 900-1200 characters)
        length = len(post_content)
        if 900 <= length <= 1200:
            length_factor = 1.0
        elif 700 <= length < 900 or 1200 < length <= 1500:
            length_factor = 0.9
        else:
            length_factor = 0.8
            
        # Question factor (posts with questions tend to get more engagement)
        question_factor = 1.1 if '?' in post_content else 1.0
        
        # Hashtag factor
        hashtag_count = post_content.count('#')
        if 3 <= hashtag_count <= 5:
            hashtag_factor = 1.05
        elif hashtag_count > 5:
            hashtag_factor = 0.95
        else:
            hashtag_factor = 1.0
            
        # Calculate final score
        score = base_score * length_factor * question_factor * hashtag_factor
        
        # Ensure score is within range 1-10
        return round(min(10, max(1, score)), 1)
        
    def _get_mock_content(self, voice_profile, source_content, post_type):
        """
        Generate mock content when OpenAI API is not available
        
        Args:
            voice_profile (dict): User's writing style profile
            source_content (dict): Content from monitored sources
            post_type (str): Type of post to generate
            
        Returns:
            dict: Simulated generated post
        """
        # Ensure source_content is a dictionary
        if isinstance(source_content, str):
            try:
                source_content = json.loads(source_content)
            except:
                source_content = {}
                
        # Extract content from the source
        title = source_content.get('title', 'Recent industry developments')
        url = source_content.get('url', '')
        source = source_content.get('source', 'Article')
        
        # Create different content templates based on post type
        templates = {
            "Professional Insight": [
                "I just came across this fascinating article on {title}. It's a great reminder that {insight}. What are your thoughts on this approach? {url}",
                "Having worked in this field for years, the insights from this article on {title} align with what I've observed. Key takeaway: {insight}. #ThoughtLeadership {url}"
            ],
            "Quick Update": [
                "Quick industry update: {title} - {insight} Read more: {url}",
                "Just saw this and had to share: {title} - What caught my attention was {insight}. {url}"
            ],
            "Question Starter": [
                "After reading this article on {title}, I'm curious: {question} What's your experience with this? {url}",
                "This got me thinking: {question} - The article that sparked this question: {title}. {url}"
            ],
            "Story Format": [
                "When I first started in this industry, {insight} wasn't common knowledge. Now, as this article on {title} shows, it's becoming standard practice. Here's what I've learned along the way... {url}",
                "I remember when {insight} was considered radical thinking. Now it's mainstream as shown in this piece on {title}. {url}"
            ],
            "Industry Analysis": [
                "Looking at the trends discussed in this article on {title}, three key patterns emerge: 1) {insight} 2) Increasing focus on innovation 3) Shift toward sustainable practices. What other patterns are you noticing? {url}",
                "Market analysis: This piece on {title} highlights {insight}. I'm seeing similar patterns across the sector. Thoughts? {url}"
            ]
        }
        
        # Generic insights and questions for templates
        insights = [
            "focusing on customer experience drives better long-term results",
            "data-driven decision making is essential for growth",
            "adaptability is becoming the most valued organizational trait",
            "building authentic relationships is still the foundation of business success",
            "innovation happens at the intersection of different disciplines"
        ]
        
        questions = [
            "How are you implementing these ideas in your organization?",
            "Do you think this trend will continue over the next 5 years?",
            "What's been your biggest challenge when applying similar approaches?",
            "How does this compare to your experience in the industry?",
            "Is this a game-changer or just another passing trend?"
        ]
        
        # Select a template and fill it
        templates_for_type = templates.get(post_type, templates["Professional Insight"])
        template = random.choice(templates_for_type)
        insight = random.choice(insights)
        question = random.choice(questions)
        
        content = template.format(title=title, insight=insight, question=question, url=url)
        
        # Generate mock hashtags
        hashtags = ["#Innovation", "#Leadership", "#ProfessionalDevelopment", "#Industry"]
        random.shuffle(hashtags)
        hashtags = hashtags[:3]  # Just use 3 random hashtags
        
        # Calculate mock engagement score
        engagement_score = round(random.uniform(6.5, 9.5), 1)
        
        return {
            "content": content,
            "hashtags": hashtags,
            "estimated_engagement": engagement_score,
            "source_url": url,
            "source_title": title,
            "post_type": post_type,
            "created_at": datetime.now().isoformat()
        }
    
    def generate(self, voice_profile, source_content, post_type="Professional Insight"):
        """
        Generate a personalized LinkedIn post based on voice profile and source content.
        
        Args:
            voice_profile (dict): User's writing style profile
            source_content (dict): Content from monitored sources
            post_type (str): Type of post to generate
            
        Returns:
            dict: Generated post with metadata
        """
        # Use mock mode if API key is not available
        if self.mock_mode:
            return self._get_mock_content(voice_profile, source_content, post_type)
        
        # Ensure voice_profile is a dictionary
        if isinstance(voice_profile, str):
            try:
                voice_profile = json.loads(voice_profile)
            except:
                voice_profile = {}
        
        # Extract the profile characteristics
        tone = voice_profile.get('tone', 'professional')
        vocabulary = voice_profile.get('vocabulary', 'standard professional vocabulary')
        sentence_structure = voice_profile.get('sentence_structure', 'varied')
        emoji_usage = voice_profile.get('emoji_usage', 'minimal')
        industry_language = voice_profile.get('industry_language', 'general')
        
        # Ensure source_content is a dictionary
        if isinstance(source_content, str):
            try:
                source_content = json.loads(source_content)
            except:
                source_content = {}
                
        # Extract content from the source
        title = source_content.get('title', 'Recent industry developments')
        content = source_content.get('content', source_content.get('summary', ''))
        url = source_content.get('url', '')
        source = source_content.get('source', 'Article')
        
        # Truncate content if too long
        if len(content) > 2000:
            content = content[:2000] + "..."
            
        post_type_description = self.post_types.get(post_type, self.post_types["Professional Insight"])
        
        # Create the prompt for the OpenAI API
        prompt = f"""
        Create a LinkedIn post based on the following article:
        
        Title: {title}
        Source: {source}
        Content: {content}
        URL: {url}
        
        The post should match the following personal writing style:
        - Tone: {tone}
        - Vocabulary patterns: {vocabulary}
        - Sentence structure: {sentence_structure}
        - Emoji usage: {emoji_usage}
        - Industry-specific language: {industry_language}
        
        Post type: {post_type} - {post_type_description}
        
        Requirements:
        1. The post should be 900-1200 characters long
        2. Include 3-5 relevant hashtags at the end
        3. Maintain the authentic voice based on the style profile
        4. Include a brief introduction to provide context
        5. End with a call-to-action or conversation starter
        6. If appropriate for the writing style, include relevant emojis
        7. DO NOT include "Title:" or any other metadata in the post
        
        Write only the LinkedIn post content, nothing else.
        """
        
        try:
            response = self.llm.generate_chat_completion(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert LinkedIn content creator who specializes in mimicking personal writing styles."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800
            )
            
            generated_post = response.choices[0].message.content.strip()
            
            # Generate hashtags based on content and industry terms
            hashtags = self._extract_hashtags(content, industry_language)
            
            # Calculate engagement prediction
            engagement_score = self._predict_engagement(generated_post, post_type)
            
            # Create result object
            result = {
                'id': hash(f"{title}{datetime.now().isoformat()}"),
                'content': generated_post,
                'source': source,
                'source_url': url,
                'articleTitle': title,
                'post_type': post_type,
                'created_at': datetime.now().isoformat(),
                'hashtags': hashtags,
                'engagementScore': engagement_score,
                'char_count': len(generated_post),
                'status': 'pending'
            }
            
            return result
        except Exception as e:
            print(f"Error generating content: {e}")
            return {
                'id': hash(f"{title}{datetime.now().isoformat()}"),
                'content': f"Error generating content for article: {title}. Please try again.",
                'source': source,
                'source_url': url,
                'articleTitle': title,
                'post_type': post_type,
                'created_at': datetime.now().isoformat(),
                'hashtags': ["#error"],
                'engagementScore': 1.0,
                'char_count': 0,
                'status': 'error'
            }
