import subprocess
import random
import datetime
import sys

# List of commit message templates
COMMIT_TEMPLATES = [
    "🚀 Update: {date} - General improvements and updates",
    "📦 Deploy: {date} - New features and enhancements",
    "🔨 Maintenance: {date} - Code cleanup and optimizations",
    "✨ Feature: {date} - Added new functionality",
    "🐛 Fix: {date} - Bug fixes and improvements",
    "🎨 Style: {date} - UI/UX improvements",
    "📝 Docs: {date} - Documentation updates",
    "🔧 Config: {date} - Configuration changes"
]

def run_command(command):
    """Execute a shell command and return the result"""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {command}")
        print(f"Error message: {e.stderr}")
        return False

def main():
    # Get current date
    current_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Generate random commit message
    commit_message = random.choice(COMMIT_TEMPLATES).format(date=current_date)
    
    print("🔄 Starting deployment process...")
    
    # Git operations
    commands = [
        "git add .",
        f'git commit -m "{commit_message}"',
        "git push origin main"
    ]
    
    # Execute each command
    for command in commands:
        print(f"\n📋 Executing: {command}")
        if not run_command(command):
            print("❌ Deployment failed!")
            sys.exit(1)
    
    print("\n✅ Successfully pushed to repository!")
    print(f"📝 Commit message: {commit_message}")
    print("\n🚀 GitHub Actions will handle the deployment automatically.")

if __name__ == "__main__":
    main() 