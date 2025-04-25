import os
import platform
import subprocess
import sys
import zipfile
import urllib.request
from io import BytesIO


def install_requirements():
    print("📦 Installing Python dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])


def download_chromedriver():
    print("🌐 Downloading ChromeDriver...")

    os_type = platform.system()
    if os_type == "Darwin":
        folder = "mac-x64"
    elif os_type == "Linux":
        folder = "linux64"
    elif os_type == "Windows":
        folder = "win64"
    else:
        print("❌ Unsupported OS for ChromeDriver auto-install.")
        return

    version_url = f"https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"
    response = urllib.request.urlopen(version_url)
    data = response.read().decode()
    import json
    version_info = json.loads(data)
    version = version_info["channels"]["Stable"]["version"]

    zip_url = f"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/{version}/{folder}/chromedriver-{folder}.zip"
    print(f"⬇️  Fetching ChromeDriver version {version} for {folder}...")

    with urllib.request.urlopen(zip_url) as resp:
        with zipfile.ZipFile(BytesIO(resp.read())) as zip_ref:
            zip_ref.extractall()
            print("✅ ChromeDriver extracted.")

    print("🔑 Make sure ChromeDriver is in your PATH or same folder as scraper.py.")


def main():
    install_requirements()
    download_chromedriver()
    print("\n✅ Setup complete! Run the scraper with: python scraper.py")


if __name__ == "__main__":
    main()
