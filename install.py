#!/usr/bin/env python3
"""
Enhanced LinkedIn Generator - Installation Script
This script helps set up the project environment.
"""
import os
import sys
import shutil
import subprocess
import platform
import argparse


def check_python_version():
    """Verify that Python version meets requirements."""
    print("Checking Python version...")
    required_version = (3, 8)
    current_version = sys.version_info
    
    if current_version < required_version:
        print(f"ERROR: Python {required_version[0]}.{required_version[1]} or higher is required.")
        print(f"Current version: {current_version[0]}.{current_version[1]}")
        return False
    
    print(f"Python version {current_version[0]}.{current_version[1]} meets requirements.")
    return True


def setup_virtual_env(env_name="venv", force=False):
    """Set up a virtual environment."""
    print("Setting up virtual environment...")
    
    if os.path.exists(env_name):
        if force:
            print(f"Removing existing virtual environment '{env_name}'...")
            try:
                shutil.rmtree(env_name)
            except Exception as e:
                print(f"Error removing virtual environment: {e}")
                return False
        else:
            print(f"Virtual environment '{env_name}' already exists.")
            print("Use --force to recreate it.")
            return True
    
    try:
        subprocess.run([sys.executable, "-m", "venv", env_name], check=True)
        print(f"Virtual environment '{env_name}' created successfully.")
        return True
    except subprocess.CalledProcessError:
        print("Error creating virtual environment.")
        return False


def install_dependencies(env_name="venv", dev=False):
    """Install project dependencies."""
    print("Installing dependencies...")
    
    # Determine the activation script and pip path based on the platform
    if platform.system() == "Windows":
        activate_script = os.path.join(env_name, "Scripts", "activate")
        pip_path = os.path.join(env_name, "Scripts", "pip")
    else:
        activate_script = os.path.join(env_name, "bin", "activate")
        pip_path = os.path.join(env_name, "bin", "pip")
    
    if not os.path.exists(pip_path):
        print(f"Error: Pip not found at {pip_path}")
        print("Virtual environment may not be set up correctly.")
        return False
    
    # Install requirements
    try:
        subprocess.run([pip_path, "install", "--upgrade", "pip"], check=True)
        subprocess.run([pip_path, "install", "-r", "requirements.txt"], check=True)
        
        # Install dev dependencies if requested
        if dev:
            print("Installing development dependencies...")
            dev_packages = ["pytest", "pytest-cov", "black", "flake8"]
            subprocess.run([pip_path, "install"] + dev_packages, check=True)
        
        print("Dependencies installed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        return False


def create_env_file():
    """Create a .env file from template if it doesn't exist."""
    print("Setting up environment configuration...")
    
    if os.path.exists(".env"):
        print(".env file already exists.")
        return True
    
    if os.path.exists(".env.template"):
        try:
            shutil.copy(".env.template", ".env")
            print(".env file created from template.")
            print("Please edit .env file to add your API keys.")
            return True
        except Exception as e:
            print(f"Error creating .env file: {e}")
            return False
    else:
        print("Warning: .env.template not found.")
        print("Creating minimal .env file...")
        
        with open(".env", "w") as f:
            f.write("# Enhanced LinkedIn Generator Environment Configuration\n\n")
            f.write("# LLM Provider: 'openai', 'gemini', or 'mock'\n")
            f.write("LLM_PROVIDER=openai\n\n")
            f.write("# API Keys\n")
            f.write("OPENAI_API_KEY=\n")
            f.write("GEMINI_API_KEY=\n\n")
            f.write("# Uncomment for development mode\n")
            f.write("# DEBUG=true\n")
            f.write("# MOCK_MODE=true\n")
        
        print("Minimal .env file created.")
        print("Please edit .env file to add your API keys.")
        return True


def display_activation_instructions(env_name="venv"):
    """Display instructions for activating the virtual environment."""
    print("\n=== Next Steps ===")
    print("1. Activate the virtual environment:")
    
    if platform.system() == "Windows":
        print(f"   {env_name}\\Scripts\\activate")
    else:
        print(f"   source {env_name}/bin/activate")
    
    print("\n2. Edit the .env file to add your API keys")
    print("\n3. Start the application:")
    print("   python app.py")
    print("\n4. Or run in test mode (no API keys needed):")
    print("   python app.py --test-mode")
    print("\n5. For development tasks, use the Makefile:")
    print("   make help")


def main():
    """Main installation process."""
    parser = argparse.ArgumentParser(description="Enhanced LinkedIn Generator Installation Script")
    parser.add_argument("--force", action="store_true", help="Force recreation of virtual environment")
    parser.add_argument("--dev", action="store_true", help="Install development dependencies")
    parser.add_argument("--env-name", default="venv", help="Name for the virtual environment")
    args = parser.parse_args()
    
    print("\n=== Enhanced LinkedIn Generator Installation ===\n")
    
    # Check Python version
    if not check_python_version():
        return 1
    
    # Set up virtual environment
    if not setup_virtual_env(args.env_name, args.force):
        return 1
    
    # Install dependencies
    if not install_dependencies(args.env_name, args.dev):
        return 1
    
    # Create .env file
    create_env_file()
    
    # Display activation instructions
    display_activation_instructions(args.env_name)
    
    print("\nInstallation completed successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
