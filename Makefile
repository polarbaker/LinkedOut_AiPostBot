.PHONY: setup test run clean format check-deps mock-run lint install-dev

# Default python command
PYTHON := python

# Application settings
PORT ?= 5003
DEBUG ?= true

# Default target
all: check-deps test run

# Check dependencies
check-deps:
	$(PYTHON) setup_dependencies.py --check-only

# Install all dependencies
install:
	$(PYTHON) -m pip install -r requirements.txt

# Install development dependencies
install-dev: install
	$(PYTHON) -m pip install pytest pytest-cov black flake8

# Run tests
test:
	$(PYTHON) -m pytest tests/ -v

# Run tests with coverage
test-coverage:
	$(PYTHON) -m pytest tests/ --cov=modules --cov-report=term --cov-report=html

# Run the application
run:
	$(PYTHON) app.py --port $(PORT) $(if $(filter $(DEBUG),true),--debug,)

# Run in mock mode (no real API calls)
mock-run:
	MOCK_MODE=true $(PYTHON) app.py --port $(PORT) $(if $(filter $(DEBUG),true),--debug,)

# Run in test mode
test-run:
	$(PYTHON) app.py --test-mode --port $(PORT)

# Clean up cache and build artifacts
clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".coverage" -exec rm -rf {} +

# Format code with black
format:
	black modules/ tests/ app.py

# Lint code with flake8
lint:
	flake8 modules/ tests/ app.py --count --select=E9,F63,F7,F82 --show-source --statistics

# Setup initial environment
setup: install-dev
	cp -n ENVIRONMENT_SETUP.md .env.template || true
	@echo "Environment template created at .env.template"
	@echo "Please create a .env file based on the template"

# LLM provider tests
test-providers:
	$(PYTHON) test_llm_providers.py

# Help message
help:
	@echo "Available commands:"
	@echo "  make install      - Install production dependencies"
	@echo "  make install-dev  - Install development dependencies"
	@echo "  make check-deps   - Check installed dependencies"
	@echo "  make setup        - Initial setup for development"
	@echo "  make test         - Run all tests"
	@echo "  make test-coverage- Run tests with coverage report"
	@echo "  make run          - Run application normally"
	@echo "  make mock-run     - Run application in mock mode (no API calls)"
	@echo "  make test-run     - Run application in test mode"
	@echo "  make clean        - Clean build artifacts and cache"
	@echo "  make format       - Format code with black"
	@echo "  make lint         - Lint code with flake8"
	@echo "  make test-providers - Run LLM provider tests"
