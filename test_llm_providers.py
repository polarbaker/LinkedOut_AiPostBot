#!/usr/bin/env python
"""
Test script for LLM providers (Gemini and OpenAI)
Run this script to verify that both providers are working correctly
"""
import os
import logging
import argparse
from dotenv import load_dotenv
from modules.llm_provider import GeminiProvider, OpenAIProvider
import openai
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger("llm-test")

def test_openai():
    """Test OpenAI provider connectivity and response"""
    logger.info("Testing OpenAI Provider...")
    
    # Check if API key is available
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("❌ OPENAI_API_KEY not found in environment variables")
        return False
    
    try:
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=api_key)
        provider = OpenAIProvider(client)
        
        # Define test messages
        messages = [
            {"role": "system", "content": "You are a helpful assistant for LinkedIn content generation."},
            {"role": "user", "content": "Generate a one-sentence test response."}
        ]
        
        # Time the request
        start_time = time.time()
        response = provider.generate_chat_completion(messages)
        elapsed_time = time.time() - start_time
        
        # Check response format
        if response and "choices" in response and len(response["choices"]) > 0:
            content = response["choices"][0]["message"]["content"]
            logger.info(f"✅ OpenAI response received in {elapsed_time:.2f}s: {content[:60]}...")
            return True
        else:
            logger.error(f"❌ Invalid response format from OpenAI: {response}")
            return False
            
    except Exception as e:
        logger.error(f"❌ OpenAI test failed: {str(e)}")
        return False

def test_gemini():
    """Test Gemini provider connectivity and response"""
    logger.info("Testing Gemini Provider...")
    
    # Check if API key is available
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("❌ GEMINI_API_KEY not found in environment variables")
        return False
        
    try:
        # Initialize Gemini provider
        provider = GeminiProvider(api_key)
        
        # Define test messages
        messages = [
            {"role": "system", "content": "You are a helpful assistant for LinkedIn content generation."},
            {"role": "user", "content": "Generate a one-sentence test response."}
        ]
        
        # Time the request
        start_time = time.time()
        response = provider.generate_chat_completion(messages)
        elapsed_time = time.time() - start_time
        
        # Check response format
        if response and "choices" in response and len(response["choices"]) > 0:
            content = response["choices"][0]["message"]["content"]
            logger.info(f"✅ Gemini response received in {elapsed_time:.2f}s using model {response.get('model', 'unknown')}")
            logger.info(f"Response: {content[:60]}...")
            return True
        else:
            logger.error(f"❌ Invalid response format from Gemini: {response}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Gemini test failed: {str(e)}")
        return False

def test_fallback_mechanism():
    """Test if Gemini falls back to OpenAI when needed"""
    logger.info("Testing Gemini → OpenAI fallback mechanism...")
    
    # Check if both API keys are available
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_key:
        logger.error("❌ OPENAI_API_KEY is required for fallback test")
        return False
    
    # Store original environment variables
    original_provider = os.getenv("LLM_PROVIDER")
    original_gemini_key = gemini_key
    
    # Setup the test environment
    os.environ["LLM_PROVIDER"] = "gemini"
    
    # Direct test of the GeminiProvider's fallback mechanism
    try:
        # If we have a valid Gemini key, we can test by intentionally providing an invalid model name
        if gemini_key:
            logger.info("Testing with valid Gemini key but forcing model error to trigger fallback...")
            
            # Import the Gemini client to modify its behavior
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            # Create a provider with the real API key
            provider = GeminiProvider(gemini_key)
            
            # Define test messages
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Generate a one-sentence test response for fallback testing."}
            ]
            
            # Force a specific non-existent model name to trigger the fallback
            provider.model_names = ["non-existent-model-12345", "another-fake-model"]
            
            # This should fall back to OpenAI
            start_time = time.time()
            response = provider.generate_chat_completion(messages)
            elapsed_time = time.time() - start_time
            
            # Check if we got a valid response
            if response and "choices" in response and len(response["choices"]) > 0:
                content = response["choices"][0]["message"]["content"]
                model_used = response.get("model", "unknown")
                
                # If the model name contains "gpt", it's using OpenAI
                if "gpt" in model_used.lower():
                    logger.info(f"✅ Successfully fell back to OpenAI ({model_used}) in {elapsed_time:.2f}s")
                    logger.info(f"Response: {content[:60]}...")
                    return True
                else:
                    logger.warning(f"⚠️ Response used {model_used} instead of falling back to OpenAI")
            else:
                logger.error("❌ Invalid response format from fallback mechanism")
                return False
        else:
            # No valid Gemini key, so we'll test the DirectGenerator's fallback
            logger.info("No valid Gemini key, using DirectGenerator to test fallback...")
            
            # Import here to avoid circular dependencies
            from modules.direct_generator import DirectGenerator
            
            # Set invalid Gemini key to force fallback
            os.environ["GEMINI_API_KEY"] = "invalid_key_to_force_fallback"
            
            try:
                # Create DirectGenerator which should fall back to OpenAI
                generator = DirectGenerator()
                
                # Define test input
                previous_posts = "This is a test post for LinkedIn. It should help analyze my writing style."
                news_content = {
                    "title": "Test News Article", 
                    "content": "This is a test news article content."
                }
                
                # Generate post with fallback
                result = generator.analyze_and_generate(previous_posts, news_content)
                
                if result and "generatedPost" in result and result["generatedPost"]:
                    logger.info("✅ Fallback to OpenAI successful via DirectGenerator")
                    logger.info(f"Generated post: {result['generatedPost'][:60]}...")
                    return True
                else:
                    logger.error(f"❌ Fallback test failed with unexpected response: {result}")
                    return False
            except Exception as e:
                logger.error(f"❌ DirectGenerator fallback test failed: {str(e)}")
                return False
    except Exception as e:
        logger.error(f"❌ Fallback test failed with exception: {str(e)}")
        import traceback
        logger.debug(f"Exception details:\n{traceback.format_exc()}")
        return False
    finally:
        # Restore original environment variables
        if original_provider:
            os.environ["LLM_PROVIDER"] = original_provider
        if original_gemini_key:
            os.environ["GEMINI_API_KEY"] = original_gemini_key
    
if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Test LLM Providers")
    parser.add_argument("--provider", choices=["all", "openai", "gemini", "fallback"], 
                        default="all", help="Which provider to test")
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Check for required environment variables
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    logger.info("Environment variables loaded")
    if gemini_key:
        logger.info("✅ GEMINI_API_KEY found")
    else:
        logger.warning("⚠️ GEMINI_API_KEY not found - Gemini tests will fail")
        
    if openai_key:
        logger.info("✅ OPENAI_API_KEY found")
    else:
        logger.warning("⚠️ OPENAI_API_KEY not found - OpenAI tests will fail")
    
    # Track test results
    results = {}
    
    # Run tests based on specified provider
    if args.provider in ["all", "openai"]:
        results["openai"] = test_openai()
        
    if args.provider in ["all", "gemini"]:
        results["gemini"] = test_gemini()
        
    if args.provider in ["all", "fallback"]:
        results["fallback"] = test_fallback_mechanism()
    
    # Print summary
    logger.info("\n=== TEST SUMMARY ===")
    all_passed = True
    for provider, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{provider}: {status}")
        if not passed:
            all_passed = False
    
    exit(0 if all_passed else 1)
