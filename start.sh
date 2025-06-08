#!/bin/bash
# Simple startup script for Enhanced LinkedIn Generator
# This script lets you start the application quickly in different modes

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "=========================================================="
echo "    Enhanced LinkedIn Generator - Quick Start Script       "
echo "=========================================================="
echo -e "${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3 to continue.${NC}"
    exit 1
fi

# Handle command line arguments
MODE="mock"
PORT=5003
DEBUG=true

# Process command line arguments
for arg in "$@"
do
    case $arg in
        --live)
        MODE="live"
        shift
        ;;
        --port=*)
        PORT="${arg#*=}"
        shift
        ;;
        --no-debug)
        DEBUG=false
        shift
        ;;
        --help)
        echo -e "${GREEN}Usage:${NC}"
        echo "  ./start.sh [options]"
        echo ""
        echo -e "${GREEN}Options:${NC}"
        echo "  --live         Start in live mode (requires API keys in .env)"
        echo "  --port=XXXX    Set custom port (default: 5003)"
        echo "  --no-debug     Disable debug mode"
        echo "  --help         Show this help message"
        echo ""
        exit 0
        ;;
    esac
done

echo -e "${GREEN}Starting Enhanced LinkedIn Generator...${NC}"
echo ""

# Check if virtual environment exists, if not suggest creating it
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment not found.${NC}"
    echo "It's recommended to create a virtual environment."
    echo ""
    echo -e "${BLUE}Would you like to create it now? (y/n)${NC}"
    read -r REPLY
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Creating virtual environment...${NC}"
        python3 -m venv venv
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Virtual environment created successfully!${NC}"
        else
            echo -e "${RED}Failed to create virtual environment. Continuing without it...${NC}"
        fi
    else
        echo -e "${YELLOW}Continuing without virtual environment...${NC}"
    fi
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "${GREEN}Activating virtual environment...${NC}"
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        source venv/Scripts/activate
    else
        # macOS/Linux
        source venv/bin/activate
    fi
fi

# Check if requirements are installed
echo -e "${GREEN}Checking requirements...${NC}"
if ! python3 -c "import flask" &> /dev/null; then
    echo -e "${YELLOW}Flask not found. Installing requirements...${NC}"
    pip install -r requirements.txt
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install requirements. Please run 'pip install -r requirements.txt' manually.${NC}"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ] && [ -f ".env.template" ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    cp .env.template .env
    echo -e "${GREEN}.env file created from template.${NC}"
elif [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Creating minimal configuration...${NC}"
    echo "# Enhanced LinkedIn Generator Environment" > .env
    echo "MOCK_MODE=true" >> .env
    echo "LLM_PROVIDER=mock" >> .env
    echo -e "${GREEN}Minimal .env file created.${NC}"
fi

# Set environment variables based on mode
if [ "$MODE" == "mock" ]; then
    export MOCK_MODE=true
    export LLM_PROVIDER=mock
    echo -e "${YELLOW}Starting in MOCK MODE (no API keys needed)${NC}"
else
    export MOCK_MODE=false
    echo -e "${BLUE}Starting in LIVE MODE (requires API keys in .env file)${NC}"
fi

# Set debug mode
if [ "$DEBUG" == "true" ]; then
    export DEBUG=true
    export FLASK_ENV=development
    DEBUG_FLAG="--debug"
else
    DEBUG_FLAG=""
fi

echo -e "${GREEN}Starting server on port ${PORT}...${NC}"
echo -e "${YELLOW}Open your browser at http://localhost:${PORT}${NC}"
echo -e "${YELLOW}Admin panel available at http://localhost:${PORT}/admin${NC}"
echo -e "${BLUE}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the application
python3 app.py --port=$PORT $DEBUG_FLAG

# Exit message
echo -e "${GREEN}Server stopped.${NC}"
