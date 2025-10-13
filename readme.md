# 🏕️ Blackpug Activity Scraper

Automate the extraction of registrant data from **Black Pug Software** (used by Scouting America councils). This will export into an excel file with a tab for each event, showing number of current registrants and non-complete registrants.
---

## 🚀 Features

- Pulls down all **event registrations** from your Black Pug account
- Automatically **groups by event name** and removes duplicate registrations
- **Smart date filtering** with three options:
  - **Future events**: Events from today forward (based on actual event dates)
  - **This calendar year's events**: Any events in the current year
  - **Last year's events**: Events from the previous year
- **Duplicate cleanup**: Automatically removes people from "not booked" if they appear in "booked" (prevents duplicate entries)
- Exports clean Excel file with **separate sheets per event**
- **Professional formatting**: Sortable tables with styled headers, numeric participant counts, and automatic totals
- **Registration numbers as sortable numbers** for easy filtering and analysis
- Separates **booked registrations** from **incomplete registrations** on each sheet
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
* A Chrome for testing window will open.
* Log in to your Black Pug account.
* Click your user menu in the top right corner.
* Select your Pack/Troop (e.g. BA Pack ### F) to access your roster.
* Close the dropdown.
* Return to Terminal and press ENTER to continue.

### 7️⃣ Cross your fingers and wait
The terminal will show progress updates like:
```bash
📋 Scraping event registrations...
📊 Fall Cub Activity Day: 32 booked, 0 not booked
🧹 Removed 4 duplicate registration(s) from 'Spring Camp' not-booked list
📝 Debug log written to: deduplication_debug_20251013_143022.txt
✅ Excel export complete: blackpug_registrants.xlsx
📁 File saved to: /Users/your-username/path/blackpug_registrants.xlsx
```

## 📊 Output Details

### Excel File Structure
- **One sheet per event** with clean, professional formatting
- **Event title** at the top of each sheet
- **Booked registrations table** (people who completed registration)
- **Not booked registrations table** (people who started but didn't complete - for follow-up)
- **Automatic totals** for participant counts
- **Registration numbers as sortable numbers** for easy analysis

### Debug Logging
The script creates a detailed debug log file showing:
- Which duplicate registrations were removed and why
- Email matching logic for verification
- Before/after counts for each event

This helps you verify the deduplication is working correctly.

### 🧰 Tested with
* Python 3.13+
* macOS Sonoma (Apple Silicon)
* ChromeDriver 135.0.7049.114
* Chrome for Testing 135.0.7049.114

### ✨ Credits
Vibe-coded with ❤️ and 🤖 by AJ Marroquin for Greater New York Council scouting units.
Licensed under the MIT License.