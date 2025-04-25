# 🏕️ Blackpug Activity Scraper

Automate the extraction of registrant data from **Black Pug Software** (used by BSA councils) into clean, tabular Excel files. Each event's registrants are exported to a separate sheet in a well-formatted `.xlsx` workbook.

Built with love by **AJ Marroquin** and ChatGPT.

---

## ✨ Features

- 🖱️ Automates dropdown clicks and modal navigation in Black Pug
- 📋 Scrapes participant details: name, contact, balance, email, and more
- 📊 Exports each event into its own Excel **worksheet**
- 🧼 Table formatting + auto-sized columns
- 🧠 Simple CLI — just paste your Black Pug event URL

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/ajmarroquin/blackpug-activity-scraper.git
cd blackpug-activity-scraper
```

### 2. Run setup (installs dependencies + ChromeDriver)
```bash
python setup.py
```

### 3. Scrape!
```bash
python scraper.py
```
Paste in your event URL like: https://scoutingevent.com/640-CAD25

### 📁 Output
Creates an Excel file: blackpug_registrants.xlsx
Each sheet is named after an event, containing a styled table of registrants.


### 🧰 Requirements
* Python 3.7+
* Google Chrome browser
* ChromeDriver (auto-installed by setup.py)

### ⚠️ Notes
* You must be logged into Black Pug in your browser before running the script.
* The script automates the “View Activity” panel to access your pack’s registration history.