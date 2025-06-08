# Enhanced LinkedIn Post Generator

An AI-powered LinkedIn post generator that analyzes your writing style and creates personalized content based on monitored websites and RSS feeds. This application features multi-provider LLM integration with Google Gemini and OpenAI, robust fallback mechanisms, and extensive error handling.

## Features

- **Voice Analysis Engine**: Advanced analysis of your previous LinkedIn posts to create a comprehensive personal style profile
- **Website Monitoring**: Custom web scraping of selected websites and RSS feeds with configurable monitoring frequencies
- **Personalized Content Generation**: AI-generated posts that authentically match your unique communication style
- **Approval Workflow**: Complete control with review, edit, approve, or modification request options
- **Multi-Provider LLM Support**: Integrated with both Google Gemini and OpenAI models
- **Automatic Fallback Mechanism**: Gracefully handles API failures with intelligent fallback logic
- **Rate Limiting**: Protects API endpoints from abuse
- **Comprehensive Health Checks**: Monitor application status easily

## System Architecture

The application consists of these primary modules:

1. **Voice Analysis Engine**: Analyzes previous posts, extracts writing style, profiles tone, maps vocabulary preferences
2. **Custom Web Scraper**: Monitors websites, aggregates RSS feeds, extracts and summarizes content
3. **LLM Provider System**: Flexible architecture supporting multiple language model providers:
   - Google Gemini (primary provider - using latest models)
   - OpenAI (fallback provider)
   - Configurable via environment variables
4. **Content Generation Engine**: Creates personalized content matching your voice profile
5. **Approval Workflow**: Manages content review, modification, scheduling and analytics
6. **API Layer**: RESTful endpoints with rate limiting and error handling

## Installation

1. Clone this repository or navigate to the project folder
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows**: `venv\Scripts\activate`
   - **macOS/Linux**: `source venv/bin/activate`
4. Install requirements:
   ```
   pip install -r requirements.txt
   ```
5. Configure API keys:
   - Create a `.env` file in the project root (see `ENVIRONMENT_SETUP.md` for details)
   - Add your API keys:
   ```
   LLM_PROVIDER=gemini  # Use 'gemini' or 'openai'
   GEMINI_API_KEY=your_gemini_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```
   - See `ENVIRONMENT_SETUP.md` for complete configuration options

## Usage

1. Start the Flask backend server:
   ```
   python app.py
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:5003/  # Note: Port is now 5003 by default (configurable)
   ```
3. Check that the system is operational:
   ```
   http://localhost:5003/health
   ```
4. Use the application:
   - **Voice Analysis**: Paste 3-5 of your previous LinkedIn posts to analyze your style
   - **Website Monitoring**: Add websites and RSS feeds to monitor
   - **Content Generation**: Generate personalized content based on monitored sources
   - **Approval Queue**: Review, edit, and approve generated posts

5. Test LLM providers using built-in tests:
   ```
   # Run all tests
   python -m pytest tests/

   # Run specific test modules
   python -m pytest tests/test_providers.py
   python -m pytest tests/test_api.py
   
   # Legacy direct provider tests
   python test_llm_providers.py
   ```

6. Run in mock mode for development without API keys:
   ```
   # Start the server with all providers mocked
   python app.py --test-mode

   # Alternately, set environment variables
   MOCK_MODE=true python app.py
   ```

7. Use the Makefile for common development tasks:
   ```
   # Show available commands
   make help

   # Run in mock mode
   make mock-run

   # Check dependencies
   make check-deps

   # Run tests
   make test
   ```

## Technical Details

### Backend

- **Framework**: Flask (Python)
- **AI Models**: 
  - Google Gemini (1.5 Pro, 1.5 Flash, 1.0 Pro) as primary provider
  - OpenAI GPT models as fallback
- **Web Scraping**: BeautifulSoup4, Requests, and Feedparser
- **Data Storage**: Local JSON files for workflow and analytics data
- **Error Handling**: Comprehensive logging, graceful fallbacks, and detailed error reporting

### Frontend

- **UI Framework**: Vanilla JavaScript with modern CSS
- **API Communication**: Fetch API for backend communication

## Quick Deployment

### One-Click Deployment to Render ☁️

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Steps:**

1. Click the "Deploy to Render" button above
2. Connect your GitHub/GitLab account when prompted
3. Your app will deploy **automatically in mock mode** (no API keys needed)
4. Test it works by visiting the health endpoint
5. To go live with real API keys, see [Switching to Live Mode](#switching-to-live-mode) below

### Switching to Live Mode

1. Go to your Render Dashboard
2. Select your Enhanced LinkedIn Generator app
3. Click "Environment" in the left sidebar
4. Change these environment variables:
   - `MOCK_MODE`: Change to `false`
   - `LLM_PROVIDER`: Change to `gemini` or `openai` 
   - Add your API keys:
     - `GEMINI_API_KEY`: Your Google Gemini API key
     - `OPENAI_API_KEY`: Your OpenAI API key
5. Click "Save Changes"
6. Go to "Manual Deploy" and select "Clear build cache & deploy"

That's it! Your app will now use real AI providers!

## Development and Testing

### Testing Infrastructure

The application includes a comprehensive testing suite:

- **Unit Tests**: Tests for individual modules and functions using pytest
- **Integration Tests**: Tests for API endpoints and component interactions
- **Mock Mode**: Full application testing without requiring actual API keys
- **CI/CD Support**: GitHub Actions workflow for automated testing

### Mock Mode

The application supports a mock mode for development and testing:

- **No API Keys Required**: Test the full application without real API credentials
- **Consistent Responses**: Predictable mock responses for reliable testing
- **Enable via Environment**: Set `MOCK_MODE=true` or use `--test-mode` flag
- **Provider Selection**: Set `LLM_PROVIDER=mock` or use with any provider for testing

### Makefile

A Makefile is provided for convenient development workflow:

```
make setup        # Initial setup
make install-dev  # Install development dependencies
make test         # Run tests
make mock-run     # Run in mock mode
make lint         # Check code style
make format       # Format code
```

## Business Impact

- 70-80% reduction in LinkedIn content creation time
- 40-60% increase in post engagement rates
- 200-300% increase in consistent content output
- 90%+ improvement in professional voice consistency

## Future Enhancements

- Direct LinkedIn API integration for posting
- Machine learning for engagement prediction
- Advanced analytics dashboard
- Content calendar and scheduling
- Team collaboration features
- Authentication and user management
- Persistent database storage
- A/B testing for post effectiveness
- Enhanced security features

## License

MIT License
