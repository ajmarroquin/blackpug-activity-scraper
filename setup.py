import os
import platform
import subprocess
import sys
import zipfile
import urllib.request
import re
import shutil
from io import BytesIO


def get_chrome_version_mac():
    try:
        output = subprocess.check_output([
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "--version"
        ]).decode("utf-8")
        match = re.search(r"(\d+\.\d+\.\d+\.\d+)", output)
        if match:
            return match.group(1)
    except Exception as e:
        print(f"❌ Unable to get Chrome version: {e}")
        return None


def download_chromedriver(version, folder="mac-arm64", out_path="drivers"):
    print(f"🌐 Downloading ChromeDriver {version} for {folder}...")

    zip_url = f"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/{version}/{folder}/chromedriver-{folder}.zip"
    os.makedirs(out_path, exist_ok=True)

    try:
        with urllib.request.urlopen(zip_url) as resp:
            with zipfile.ZipFile(BytesIO(resp.read())) as zip_ref:
                zip_ref.extractall(out_path)
                print(f"✅ ChromeDriver extracted to: {out_path}/")

        # Move chromedriver binary up one level if needed
        inner_path = os.path.join(out_path, f"chromedriver-{folder}", "chromedriver")
        final_path = os.path.join(out_path, "chromedriver")

        if os.path.exists(inner_path):
            os.replace(inner_path, final_path)
            os.chmod(final_path, 0o755)
            # Cleanup subfolder
            subfolder = os.path.join(out_path, f"chromedriver-{folder}")
            if os.path.isdir(subfolder):
                shutil.rmtree(subfolder)
            print(f"✅ ChromeDriver moved to: {final_path}")
        else:
            print("⚠️ Could not find expected binary at extracted location.")

    except Exception as e:
        print(f"❌ Failed to download ChromeDriver: {e}")


def install_requirements():
    print("📦 Installing Python dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])


def main():
    if not os.path.exists("requirements.txt"):
        print("❌ requirements.txt not found!")
        return

    install_requirements()

    chrome_version = "135.0.7049.114"
    if not chrome_version:
        print("⚠️ Skipping ChromeDriver download. Please install manually.")
        return

    folder = "mac-arm64"  # ARM Mac
    chromedriver_path = os.path.join("drivers", "chromedriver")

    if not os.path.exists(chromedriver_path):
        download_chromedriver(chrome_version, folder)
    else:
        print("✅ ChromeDriver already present.")

    print("\n🚀 Setup complete! You can now run the scraper:\n")
    print("    python scraper.py\n")


if __name__ == "__main__":
    main()
