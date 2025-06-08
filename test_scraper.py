#!/usr/bin/env python3
"""
Test script for the enhanced WebScraper implementation
This script tests the web scraper in mock mode to avoid dependency issues
"""
import logging
import json
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

print("Setting MOCK_MODE globally to True")
os.environ['MOCK_MODE'] = 'True'  # Ensure mock mode is set

try:
    from modules.web_scraper import WebScraper
    print("Successfully imported WebScraper")
except ImportError as e:
    print(f"Error importing WebScraper: {e}")
    print("\nThis could be due to missing dependencies like nltk, newspaper3k, etc.")
    print("For this test, we're enforcing mock mode so these imports aren't necessary.")
    print("\nThe script will proceed with a simplified test of the scraper's structure.")
    sys.exit(1)

def main():
    """Test the web scraper functionality in mock mode"""
    print("\nTesting Enhanced WebScraper with ArticleScorer Integration (Mock Mode)\n")
    
    # Initialize the web scraper with mock mode config
    config = {
        # Content filtering
        'min_article_length': 300,  # characters
        'max_article_age': 7,       # days
        'relevance_threshold': 0.5,  # 0-1 score
        'max_articles_per_source': 10,
        
        # Custom boost terms for relevance scoring
        'boost_terms': ['AI', 'machine learning', 'innovation', 'leadership', 'strategy'],
    }
    
    try:
        print("Initializing WebScraper in mock mode...")
        scraper = WebScraper(config)
        
        # Test fetching articles
        print("\nFetching mock articles from all sources...")
        articles = scraper.fetch_articles(force_refresh=True)
        
        # Print article summary
        print(f"\nRetrieved {len(articles)} articles")
        if articles:
            print("\nTop 5 articles by relevance:")
            for i, article in enumerate(articles[:5], 1):
                print(f"{i}. {article.get('title', 'No title')} - Score: {article.get('relevance_score', 'N/A')}")
                print(f"   Source: {article.get('source_name', 'Unknown source')} - Date: {article.get('pub_date', 'No date')}")
                print(f"   URL: {article.get('url', 'No URL')}")
                print(f"   Summary: {article.get('summary', 'No summary')[:100]}..." if article.get('summary') else "   No summary available")
                print()
        else:
            print("No articles retrieved. This might be due to mock data configuration.")
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    main()
