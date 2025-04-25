# 🏕️ Blackpug Activity Scraper

Automate the extraction of registrant data from **Black Pug Software** (used by BSA councils) into clean, structured Excel workbook — grouped by event, filtered by relevance (last two years). Each event's registrants are exported to a separate sheet in a well-formatted `.xlsx` workbook.
---

## 🚀 Features

- Pulls down all **event registrations** from your Black Pug account
- Automatically **groups by event name** (ignores reg IDs)
- Filters for **recent events only** (within 2 calendar years)
- Cleans up and formats a readable Excel file with **separate sheets per event**
- Adds sortable **tables** with styled headers
- Runs on **macOS M-series** using Chrome for Testing

---

## ⚙️ Setup Instructions

> 🧠 These instructions assume you’re on **macOS with Apple Silicon (M1/M2/M3)**. If you're on Intel or Windows, adjust the Chrome path accordingly.

### 1️⃣ Clone the Repo

```bash
git clone https://github.com/ajmarroquin/blackpug-activity-scraper.git
cd blackpug-activity-scraper
```

### 2️⃣ Download Chrome for Testing
Download Chrome for Testing 135.0.7049.114 for mac-arm64
Unzip it and move to:
```bash
~/Applications/ChromeForTesting/chrome-mac-arm64/
```
Then run this to fix macOS permissions:
```bash
xattr -rd com.apple.quarantine ~/Applications/ChromeForTesting/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app
```

### 3️⃣ Create a Virtual Environment
```bash
python3 -m venv scraper
source scraper/bin/activate
```

### 4️⃣ Install Dependencies
```bash
python setup.py
```
This installs Python dependencies and the correct ChromeDriver version.

### 5️⃣ Run the Scraper
```bash
python scraper.py
```
You'll be prompeted to paste in your event URL like: https://scoutingevent.com/640-CAD25# (we will strip the # or you can paste without it)

### 6️⃣ Manually Log in and Select Unit
* A Chrome window will open.
* Log in to your Black Pug account if needed.
* Click your user menu in the top right corner.
* Select your Pack/Troop (e.g. BA Pack ### F) to access your roster.
* Close the dropdown.
* Return to Terminal and press ENTER to continue.

### 7️⃣ Cross your fingers and wait
The terminal will show progress updates like:
```bash
📋 Scraping event registrations...
✅ Excel export complete: blackpug_registrants.xlsx
```
The exported file will open automatically!

### 🧰 Tested with
* Python 3.13+
* macOS Sonoma (Apple Silicon)
* ChromeDriver 135.0.7049.114
* Chrome for Testing 135.0.7049.114

### ✨ Credits
Vibe-coded with ❤️ and 🤖 by AJ Marroquin for Greater New York Council scouting units.
Licensed under the MIT License.