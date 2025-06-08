from flask import Flask, render_template, request, jsonify, send_from_directory, current_app, redirect, url_for
from flask_cors import CORS
import os
import sys
import logging
import argparse
from datetime import datetime
from dotenv import load_dotenv
from modules.utils import clean_environment
from modules.rate_limiter import rate_limit
import json
import traceback
from modules.voice_analysis import VoiceAnalyzer
from modules.web_scraper import WebScraper
from modules.content_generator import ContentGenerator
from modules.workflow import ApprovalWorkflow
from modules.direct_generator import DirectGenerator
from modules.settings_manager import SettingsManager
import signal

# Load environment variables from .env file
dotenv_loaded = load_dotenv()

# Configure logging using the centralized configuration
from modules.logging_config import configure_logging
logger = configure_logging(logging.INFO)

# Log dotenv status
logger.info(f"python-dotenv: load_dotenv() found and loaded .env file: {dotenv_loaded}")
logger.info(f"python-dotenv: Value of LLM_PROVIDER after load_dotenv(): '{os.getenv('LLM_PROVIDER')}'")
logger.info(f"python-dotenv: Value of GEMINI_API_KEY after load_dotenv() is present: {os.getenv('GEMINI_API_KEY') is not None}")

# Clean environment variables that might interfere with OpenAI client
clean_environment()

# Initialize settings manager
settings_manager = SettingsManager()

# Check if OpenAI API key is set
logger.info(f"OPENAI_API_KEY present: {'OPENAI_API_KEY' in os.environ}")
logger.info(f"Running in Python version: {sys.version}")

# Initialize Flask app
app = Flask(__name__, static_folder='static', static_url_path='/static', template_folder='templates')
CORS(app)  # Enable CORS for all routes
app.secret_key = os.urandom(24)

# Define API version
API_VERSION = 'v1'

# Handle SIGUSR1 signal for graceful restart
def handle_restart_signal(signum, frame):
    logger.info("Received restart signal, exiting process")
    sys.exit(0)

# Register signal handler
signal.signal(signal.SIGUSR1, handle_restart_signal)

# Initialize components
try:
    voice_analyzer = VoiceAnalyzer()
    web_scraper = WebScraper()
    content_generator = ContentGenerator()
    workflow = ApprovalWorkflow()
    direct_generator = DirectGenerator()
    logger.info("All application components initialized successfully")
except Exception as e:
    logger.error(f"Error initializing application components: {e}")
    logger.error(traceback.format_exc())
    # We'll continue running but functionality may be limited

# API Version
API_VERSION = "v1"

# Main index route
@app.route('/', methods=['GET'])
def index():
    """Main landing page"""
    return render_template('index.html')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the application is running properly"""
    try:
        # Check if key components are initialized
        components_status = {
            'voice_analyzer': hasattr(voice_analyzer, 'analyze'),
            'web_scraper': hasattr(web_scraper, 'fetch_content'),
            'content_generator': hasattr(content_generator, 'generate'),
            'workflow': hasattr(workflow, 'approve_post'),
            'direct_generator': hasattr(direct_generator, 'analyze_and_generate')
        }
        
        # Check LLM provider status
        llm_provider = os.getenv('LLM_PROVIDER', 'openai')
        gemini_api_key = os.getenv('GEMINI_API_KEY') is not None
        openai_api_key = os.getenv('OPENAI_API_KEY') is not None
        
        # Prepare response
        status = 'healthy'
        if not all(components_status.values()):
            status = 'degraded'
            
        return jsonify({
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'version': API_VERSION,
            'components': components_status,
            'llm_config': {
                'provider': llm_provider,
                'gemini_configured': gemini_api_key,
                'openai_configured': openai_api_key
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# Error handler
@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {e}")
    logger.error(traceback.format_exc())
    return jsonify({
        "error": str(e),
        "status": "error"
    }), 500


# API Routes - Version 1
def api_response(data=None, message=None, status="success", code=200):
    """Standardized API response format"""
    response = {
        "status": status,
        "version": API_VERSION
    }
    if data is not None:
        response["data"] = data
    if message is not None:
        response["message"] = message
    return jsonify(response), code

@app.route(f'/api/{API_VERSION}/analyze-voice', methods=['POST'])
@rate_limit
def analyze_voice():
    """Analyze voice from previous LinkedIn posts"""
    try:
        data = request.get_json()
        if not data:
            return api_response(message="No data provided", status="error", code=400)
            
        posts = data.get('posts', '')
        if not posts:
            return api_response(message="No posts provided for analysis", status="error", code=400)
            
        profile = voice_analyzer.analyze(posts)
        return api_response(data=profile)
    except Exception as e:
        logger.error(f"Error in voice analysis: {e}")
        return api_response(message=f"Error analyzing voice style: {str(e)}", status="error", code=500)

@app.route(f'/api/{API_VERSION}/configure-sources', methods=['POST'])
@rate_limit
def configure_sources():
    """Add or update sources to monitor"""
    try:
        data = request.get_json()
        if not data:
            return api_response(message="No data provided", status="error", code=400)
            
        url = data.get('url', '')
        if not url:
            return api_response(message="URL is required", status="error", code=400)
            
        source_type = data.get('type', 'website')
        frequency = data.get('frequency', 'daily')
        
        success = web_scraper.add_source(url, source_type, frequency)
        
        if success:
            return api_response(data={"url": url, "type": source_type, "frequency": frequency}, 
                               message="Source added successfully")
        else:
            return api_response(message="Failed to add source", status="error", code=400)
    except Exception as e:
        logger.error(f"Error configuring sources: {e}")
        return api_response(message=f"Error configuring source: {str(e)}", status="error", code=500)

@app.route(f'/api/{API_VERSION}/fetch-content', methods=['GET'])
@rate_limit
def fetch_content():
    """Get content from monitored sources"""
    try:
        # Get query parameters
        interests = request.args.get('interests', '')
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        category = request.args.get('category', '')
        max_articles = int(request.args.get('max_articles', '10'))
        
        # Use the enhanced fetch_articles method with ArticleScorer integration
        articles = web_scraper.fetch_articles(
            force_refresh=force_refresh,
            filter_category=category if category else None,
            max_articles=max_articles
        )
        
        # Update relevance scores if interests are provided
        if interests and web_scraper.article_scorer:
            interests_list = [term.strip() for term in interests.split(',') if term.strip()]
            if interests_list:
                web_scraper.article_scorer.set_boost_terms(interests_list)
                # Re-order articles with the updated boost terms
                articles = web_scraper.article_scorer.order_articles_by_relevance(articles)
        
        # Create a response with both articles and metadata
        content = {
            'articles': articles,
            'metadata': {
                'total_count': len(articles),
                'sources_count': len(web_scraper.sources) if hasattr(web_scraper, 'sources') else 0,
                'last_updated': datetime.now().isoformat(),
                'interests_applied': bool(interests)
            }
        }
        
        return api_response(data=content)
    except Exception as e:
        logger.error(f"Error fetching content: {e}")
        logger.error(traceback.format_exc())
        return api_response(message=f"Error fetching content: {str(e)}", status="error", code=500)

@app.route(f'/api/{API_VERSION}/generate-content', methods=['POST'])
@rate_limit
def generate_content():
    """Generate LinkedIn post content"""
    try:
        data = request.get_json()
        if not data:
            return api_response(message="No data provided", status="error", code=400)
            
        voice_profile = data.get('voiceProfile', {})
        source_content = data.get('sourceContent', {})
        post_type = data.get('postType', 'Professional Insight')
        
        post = content_generator.generate(voice_profile, source_content, post_type)
        return api_response(data=post)
    except Exception as e:
        logger.error(f"Error generating content: {e}")
        return api_response(message=f"Error generating content: {str(e)}", status="error", code=500)
    
@app.route(f'/api/{API_VERSION}/approval-queue', methods=['GET'])
@rate_limit
def get_approval_queue():
    """Get posts waiting for approval"""
    try:
        posts = workflow.get_approval_queue()
        return api_response(data=posts)
    except Exception as e:
        logger.error(f"Error getting approval queue: {e}")
        return api_response(message=f"Error getting approval queue: {str(e)}", status="error", code=500)

@app.route(f'/api/{API_VERSION}/approve-post', methods=['POST'])
@rate_limit
def approve_post():
    """Approve a post for publishing"""
    try:
        data = request.get_json()
        if not data:
            return api_response(message="No data provided", status="error", code=400)
            
        post_id = data.get('postId')
        if not post_id:
            return api_response(message="Post ID is required", status="error", code=400)
            
        success = workflow.approve_post(post_id)
        
        if success:
            return api_response(message="Post approved successfully")
        else:
            return api_response(message="Failed to approve post", status="error", code=400)
    except Exception as e:
        logger.error(f"Error approving post: {e}")
        return api_response(message=f"Error approving post: {str(e)}", status="error", code=500)

@app.route(f'/api/{API_VERSION}/analytics', methods=['GET'])
@rate_limit
def get_analytics():
    """Get content performance analytics"""
    try:
        analytics = workflow.get_analytics()
        return api_response(data=analytics)
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        return api_response(message=f"Error getting analytics: {str(e)}", status="error", code=500)


# Admin routes for easy application management
@app.route('/admin', methods=['GET'])
def admin_panel():
    """Admin panel for managing application settings"""
    return render_template('admin.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current application status"""
    try:
        settings = settings_manager.get_current_settings()
        
        # Add additional status info
        status = {
            'mock_mode': settings['mock_mode'],
            'provider': settings['provider'],
            'gemini_api_key_present': settings['gemini_api_key_set'],
            'openai_api_key_present': settings['openai_api_key_set'],
            'system_status': 'online',
            'version': '1.0',
            'time': datetime.now().isoformat()
        }
        
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return jsonify({
            'error': str(e),
            'system_status': 'error'
        }), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update application settings"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # Update settings
        success = settings_manager.update_settings(data)
        
        if success:
            # Schedule a restart
            settings_manager.schedule_restart(5)
            return jsonify({
                'status': 'success', 
                'message': 'Settings updated successfully. Server will restart.'
            })
        else:
            return jsonify({
                'status': 'error', 
                'message': 'Failed to update settings'
            }), 500
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return jsonify({
            'status': 'error', 
            'message': f'Error: {str(e)}'
        }), 500

@app.route('/api/restart', methods=['POST'])
def restart_server():
    """Restart the application server"""
    try:
        settings_manager.schedule_restart(2)
        return jsonify({
            'status': 'success', 
            'message': 'Server restart initiated'
        })
    except Exception as e:
        logger.error(f"Error restarting server: {e}")
        return jsonify({
            'status': 'error', 
            'message': f'Error: {str(e)}'
        }), 500

@app.route(f'/api/{API_VERSION}/save-draft', methods=['POST'])
@rate_limit
def save_draft():
    """Save post as a draft"""
    try:
        data = request.get_json()
        if not data:
            return api_response(message="No data provided", status="error", code=400)
            
        post = data.get('post', {})
        if not post:
            return api_response(message="Post data is required", status="error", code=400)
            
        success = workflow.save_draft(post)
        
        if success:
            return api_response(message="Draft saved successfully")
        else:
            return api_response(message="Failed to save draft", status="error", code=400)
    except Exception as e:
        logger.error(f"Error saving draft: {e}")
        return api_response(message=f"Error saving draft: {str(e)}", status="error", code=500)
        
# Add backward compatibility routes for existing frontend code
@app.route('/analyze-voice', methods=['POST'])
def analyze_voice_legacy():
    return analyze_voice()

@app.route('/configure-sources', methods=['POST'])
def configure_sources_legacy():
    return configure_sources()

@app.route('/fetch-content', methods=['GET'])
def fetch_content_legacy():
    return fetch_content()

@app.route('/generate-content', methods=['POST'])
def generate_content_legacy():
    return generate_content()
    
@app.route('/approval-queue', methods=['GET'])
def get_approval_queue_legacy():
    return get_approval_queue()

@app.route('/approve-post', methods=['POST'])
def approve_post_legacy():
    return approve_post()

@app.route('/analytics', methods=['GET'])
def get_analytics_legacy():
    return get_analytics()

@app.route('/save-draft', methods=['POST'])
def save_draft_legacy():
    return save_draft()

@app.route(f'/api/{API_VERSION}/analyze-generate-news', methods=['POST'])
@rate_limit
def analyze_generate_news():
    """Analyze previous posts style and generate news summary in one step"""
    try:
        data = request.get_json()
        if not data:
            return api_response(message="No data provided", status="error", code=400)
            
        previous_posts = data.get('previousPosts', '')
        if not previous_posts:
            return api_response(message="No previous posts provided for analysis", status="error", code=400)
            
        news_content = data.get('newsContent', {})
        if not news_content:
            return api_response(message="No news content provided", status="error", code=400)
            
        summary_length = data.get('summaryLength', 'medium')
        
        result = direct_generator.analyze_and_generate(previous_posts, news_content, summary_length)
        return api_response(data=result)
    except Exception as e:
        logger.error(f"Error in direct news generation: {e}")
        logger.error(traceback.format_exc())
        return api_response(message=f"Error generating news summary: {str(e)}", status="error", code=500)

# Legacy route for the new endpoint
@app.route('/analyze-generate-news', methods=['POST'])
def analyze_generate_news_legacy():
    return analyze_generate_news()

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Enhanced LinkedIn Generator Server')
    parser.add_argument('--test-mode', action='store_true', help='Run in test mode for CI/CD')
    parser.add_argument('--port', type=int, help='Port to run the server on')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()
    
    # Set test mode if specified
    if args.test_mode:
        logger.info("Running in TEST MODE")
        os.environ['MOCK_MODE'] = 'true'
        os.environ['LLM_PROVIDER'] = 'mock'
    
    # Allow port to be specified via command line, environment variable, or default
    default_port = 5003
    
    if args.port:
        port = args.port
        logger.info(f"Using port {port} from command line argument")
    else:
        try:
            # Try to get port from environment variable
            port = int(os.environ.get('PORT', default_port))
            logger.info(f"Using port {port} from environment variable")
        except ValueError:
            # Fall back to default if environment variable is not a valid integer
            logger.warning(f"Invalid PORT environment variable, using default port {default_port}")
            port = default_port
    
    # Debug mode setting
    debug_mode = args.debug or os.environ.get('DEBUG', 'false').lower() == 'true'
    
    # Use a different port if the primary one is in use
    for attempt in range(3):
        try:
            logger.info(f"Starting server on port {port + attempt}")
            app.run(debug=debug_mode, host='0.0.0.0', port=port + attempt)
            break
        except OSError as e:
            if "Address already in use" in str(e) and attempt < 2:
                logger.warning(f"Port {port + attempt} is in use, trying port {port + attempt + 1}")
                continue
            else:
                logger.error(f"Failed to start server after trying multiple ports: {e}")
                raise
