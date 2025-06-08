"""
Centralized Configuration for the Enhanced LinkedIn Post Generator Modules

This file stores default configurations for various modules, promoting
consistency and ease of modification.

Updated: June 8, 2025
"""
import os
import json
import logging

logger = logging.getLogger(__name__)


def _apply_env_overrides(target_config: dict, env_prefix: str) -> dict:
    """Overrides configuration values with environment variables if they are set.

    Args:
        target_config (dict): The configuration dictionary to update.
        env_prefix (str): The prefix for environment variable names (e.g., "WEBSCRAPER").

    Returns:
        dict: The updated configuration dictionary.
    """
    config_copy = target_config.copy() # Work on a copy
    for key, default_value in config_copy.items():
        env_var_name = f"{env_prefix.upper()}_{key.upper()}"
        env_value_str = os.getenv(env_var_name)

        if env_value_str is not None:
            original_type = type(default_value)
            try:
                if original_type == bool:
                    parsed_value = env_value_str.lower() in ['true', '1', 'yes', 'y']
                elif original_type == int:
                    parsed_value = int(env_value_str)
                elif original_type == float:
                    parsed_value = float(env_value_str)
                elif original_type == list:
                    if env_value_str.startswith('[') and env_value_str.endswith(']'):
                        try:
                            parsed_value = json.loads(env_value_str)
                            if not isinstance(parsed_value, list):
                                raise ValueError("JSON was not a list.")
                        except json.JSONDecodeError:
                            logger.warning(
                                f"Env var {env_var_name} looks like JSON list but failed to parse: '{env_value_str}'. "
                                f"Falling back to comma-separated.")
                            # Fallback for non-JSON or malformed JSON lists
                            parsed_value = [item.strip() for item in env_value_str.split(',')]
                    else:
                        parsed_value = [item.strip() for item in env_value_str.split(',')]
                elif original_type == dict:
                    try:
                        parsed_value = json.loads(env_value_str)
                        if not isinstance(parsed_value, dict):
                            raise ValueError("JSON was not a dict.")
                    except json.JSONDecodeError as e:
                        logger.warning(
                            f"Env var {env_var_name} for dict type failed to parse as JSON: '{env_value_str}'. "
                            f"Error: {e}. Using default for this key.")
                        continue # Skip update for this key, use default
                else: # Default to string, though most should be handled above
                    parsed_value = env_value_str
                
                config_copy[key] = parsed_value
                logger.info(f"Config: Overrode '{key}' with value from env var {env_var_name}.")
            except ValueError as e:
                logger.warning(
                    f"Env var {env_var_name} ('{env_value_str}') could not be parsed to type {original_type.__name__}. "
                    f"Error: {e}. Using default value '{default_value}' for '{key}'.")
    return config_copy


DEFAULT_WEBSCRAPER_CONFIG = {
    # Scraping settings
    'request_timeout': 15,  # seconds
    'user_agent': 'EnhancedLinkedInScraper/2.0',
    'max_workers': 4,      # parallel threads
    'max_redirects': 3,
    'retry_count': 2,
    
    # Content filtering
    'min_article_length': 300,  # characters
    'max_article_age': 7,       # days
    'relevance_threshold': 0.5,  # 0-1 score
    'duplicate_threshold': 0.85, # similarity threshold for dupes
    'max_articles_per_source': 5,
    
    # Cache settings
    'cache_duration': 30 * 60,  # seconds (30 min)
    'content_cache_size': 500,  # articles
    
    # Keywords and filters (can be overridden by user preferences)
    'excluded_terms': [],
    'required_terms': [],
    'boost_terms': [],
    
    # URL patterns to ignore during scraping
    'excluded_patterns': [
        r'advert', r'sponsor', r'cookie', r'subscribe',
        r'account', r'sign-?in', r'login', r'newsletter',
        r'404', r'jobs', r'career', r'shop'
    ]
}

DEFAULT_ARTICLE_SCORER_CONFIG = {
    # Content filtering (often inherited/overridden from WebScraper config)
    'min_article_length': 300,  # characters
    'max_article_age': 7,       # days
    'relevance_threshold': 0.5,  # 0-1 score
    'max_articles_per_source': 5, # Max articles to return after scoring for a given source processing run
    
    # Keywords and filters (often inherited/overridden from WebScraper config)
    'excluded_terms': [],
    'required_terms': [],
    'boost_terms': [],
    
    # Relevance factors weights used in scoring algorithm
    'weights': {
        'recency': 0.4,
        'content_length': 0.1,
        'category_match': 0.3,
        'title_quality': 0.1,
        'boost_terms': 0.3
    }
}
