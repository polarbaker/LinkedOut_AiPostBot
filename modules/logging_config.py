"""
Logging configuration for the LinkedIn Post Generator application.
Centralizes logging setup to ensure consistent formatting across the application.
"""
import logging
import sys
import os
from datetime import datetime

def configure_logging(log_level=logging.INFO):
    """
    Configure application-wide logging settings.
    
    Args:
        log_level: The logging level to use (default: logging.INFO)
        
    Returns:
        The configured logger instance
    """
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Configure root logger
    logger = logging.getLogger('linkedin-generator')
    logger.setLevel(log_level)
    logger.handlers = []  # Remove any existing handlers
    
    # Create formatters
    console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(log_level)
    
    # Create file handler
    log_file = os.path.join(logs_dir, f'app_{datetime.now().strftime("%Y%m%d")}.log')
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(log_level)
    
    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    logger.info(f"Logging configured with level {logging.getLevelName(log_level)}")
    logger.info(f"Log file: {log_file}")
    
    return logger
