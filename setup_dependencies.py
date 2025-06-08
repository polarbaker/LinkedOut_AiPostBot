#!/usr/bin/env python
"""
Dependency Management Script for Enhanced LinkedIn Generator
This script verifies and installs all required dependencies.
"""
import os
import sys
import subprocess
import importlib
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger("setup")

# Required packages with versions
REQUIRED_PACKAGES = {
    "flask": "2.0.1",
    "openai": "1.6.1",
    "google-generativeai": "0.8.5",
    "python-dotenv": "1.0.0",
    "nltk": "3.8.1",
    "colorama": "0.4.6",  # For colored terminal output
    "validators": "0.20.0",  # For URL validation
    "requests": "2.31.0"  # For HTTP requests
}

# Check for extra requirements based on OS
if sys.platform == "win32":
    REQUIRED_PACKAGES["pywin32"] = "306"  # Windows-specific dependency

def check_python_version():
    """Check that Python version is 3.8 or higher"""
    major, minor, *_ = sys.version_info
    if major < 3 or (major == 3 and minor < 8):
        logger.error(f"Python 3.8+ required, but you have {major}.{minor}")
        return False
    logger.info(f"✅ Python version {major}.{minor} is compatible")
    return True

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_path = Path(".env")
    env_template_path = Path("ENVIRONMENT_SETUP.md")
    
    if not env_path.exists():
        logger.warning("⚠️ .env file not found")
        if env_template_path.exists():
            logger.info(f"Please create a .env file based on ENVIRONMENT_SETUP.md")
        return False
    
    # Load environment variables from .env
    load_dotenv()
    
    # Check required environment variables
    missing_vars = []
    for var in ["LLM_PROVIDER", "OPENAI_API_KEY"]:
        if not os.getenv(var):
            missing_vars.append(var)
    
    # If using Gemini, check for Gemini API key
    if os.getenv("LLM_PROVIDER") == "gemini" and not os.getenv("GEMINI_API_KEY"):
        missing_vars.append("GEMINI_API_KEY")
    
    if missing_vars:
        logger.warning(f"⚠️ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    logger.info("✅ Environment variables configured correctly")
    return True

def check_installed_packages():
    """Check which required packages are installed"""
    missing_packages = []
    outdated_packages = []
    
    for package, version in REQUIRED_PACKAGES.items():
        try:
            module = importlib.import_module(package)
            installed_version = getattr(module, "__version__", "unknown")
            
            if installed_version == "unknown":
                logger.warning(f"⚠️ Cannot determine version for {package}")
            elif installed_version != version:
                logger.warning(f"⚠️ Package {package} has version {installed_version}, but {version} is required")
                outdated_packages.append((package, version))
        except ImportError:
            logger.warning(f"❌ Package {package} is not installed")
            missing_packages.append((package, version))
    
    return missing_packages, outdated_packages

def install_packages(packages):
    """Install packages using pip"""
    logger.info("Installing required packages...")
    
    for package, version in packages:
        package_spec = f"{package}=={version}"
        logger.info(f"Installing {package_spec}...")
        
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package_spec])
            logger.info(f"✅ Successfully installed {package_spec}")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install {package_spec}: {str(e)}")
            return False
    
    return True

def main():
    """Main function to check and install dependencies"""
    parser = argparse.ArgumentParser(description="Setup dependencies for Enhanced LinkedIn Generator")
    parser.add_argument("--check-only", action="store_true", help="Only check dependencies, don't install")
    parser.add_argument("--install", action="store_true", help="Install missing or outdated packages")
    args = parser.parse_args()
    
    logger.info("Checking dependencies for Enhanced LinkedIn Generator...")
    
    # Check Python version
    if not check_python_version():
        logger.error("❌ Python version check failed")
        return 1
    
    # Check packages
    missing_packages, outdated_packages = check_installed_packages()
    
    if not missing_packages and not outdated_packages:
        logger.info("✅ All required packages are installed with correct versions")
    else:
        if missing_packages:
            logger.warning(f"⚠️ Missing packages: {', '.join(p[0] for p in missing_packages)}")
        if outdated_packages:
            logger.warning(f"⚠️ Outdated packages: {', '.join(p[0] for p in outdated_packages)}")
        
        # Install packages if requested
        if args.install:
            packages_to_install = missing_packages + outdated_packages
            if not install_packages(packages_to_install):
                logger.error("❌ Failed to install some packages")
                return 1
            logger.info("✅ All packages installed successfully")
        elif not args.check_only:
            logger.info("Run this script with --install to install missing or outdated packages")
    
    # Check environment variables
    env_status = check_env_file()
    if not env_status:
        logger.warning("⚠️ Environment configuration issues detected")
    
    # Final status
    if (not missing_packages and not outdated_packages) and env_status:
        logger.info("✅ All dependencies and configurations are ready!")
        return 0
    else:
        logger.warning("⚠️ Some dependency or configuration issues need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())
