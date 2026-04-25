# 🏕️ Blackpug Activity Scraper

Automate the extraction of registrant data from **Black Pug Software** (used by Scouting America councils). Exports an Excel workbook with a tab per event, showing booked registrants and incomplete registrations for follow-up.

---

## 🚀 Features

- Pulls down all **event registrations** from your Black Pug account
- **Cross-platform**: works on Linux, macOS (Intel + Apple Silicon), and Windows
- Automatically **groups by event name** and removes duplicate registrations
- **Smart date filtering** with three options:
  - **Future events**: Events from today forward
  - **This calendar year's events**: Any events in the current year
  - **Last year's events**: Events from the previous year
- **Duplicate cleanup**: Removes people from "not booked" if they appear in "booked"
- Exports clean Excel file with **separate sheets per event**
- **Professional formatting**: Sortable tables, styled headers, numeric participant counts, automatic totals
- Separates **booked registrations** from **incomplete registrations**

---

## ⚙️ Setup

### Prerequisites

- **Python 3.10+**
- **Google Chrome** installed on your system. The scraper uses [Selenium Manager](https://www.selenium.dev/blog/2022/introducing-selenium-manager/) (built into Selenium ≥ 4.11) to auto-download a matching `chromedriver` — no manual driver setup required.

> ⚠️ **Linux users:** Install the official Google Chrome `.deb`/`.rpm`, **not** the snap version of Chromium. Snap Chromium runs in a sandbox that blocks Selenium and the browser will silently open to `data:,` and never load your URL. The scraper detects this and aborts with a clear error message.

| OS | Recommended install |
|----|---------------------|
| **Linux (Debian/Ubuntu/Mint)** | See command block below |
| **Linux (Fedora/RHEL)** | See command block below |
| **Linux (Arch)** | `yay -S google-chrome` (AUR) |
| **macOS** | `brew install --cask google-chrome` *or* the installer from [google.com/chrome](https://www.google.com/chrome/) |
| **Windows** | Installer from [google.com/chrome](https://www.google.com/chrome/) |

*Chromium also works — as long as it isn't the snap build. If you already have a working non-snap Chromium, the scraper will use it automatically.*

**Debian / Ubuntu / Mint — copy/paste:**
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb
```
> The leading `./` is required — it tells `apt` to install the local file rather than search for a package by that name.

**Fedora / RHEL — copy/paste:**
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo dnf install ./google-chrome-stable_current_x86_64.rpm
```

### 1. Clone

```bash
git clone https://github.com/ajmarroquin/blackpug-activity-scraper.git
cd blackpug-activity-scraper
```

### 2. Create a virtual environment

**Linux / macOS**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell)**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

That's it — no chromedriver download step. Selenium Manager will fetch the right driver the first time you run the scraper and cache it under `~/.cache/selenium`.

---

## ▶️ Run

```bash
python scraper.py
```

You'll be prompted to paste your event URL, e.g. `https://scoutingevent.com/640-CAD25` (a trailing `#` is fine — it's stripped).

### Manually log in and select your unit

1. A Chrome window opens.
2. Log in to your Black Pug account.
3. Click your user menu in the top right corner.
4. Select your Pack/Troop (e.g. *BA Pack ### F*) to access your roster.
5. Close the dropdown.
6. Return to the terminal and press **ENTER** to continue.

### Progress output

```text
📋 Scraping event registrations...
📊 Fall Cub Activity Day: 32 booked, 0 not booked
🧹 Removed 4 duplicate registration(s) from 'Spring Camp' not-booked list
📝 Debug log written to: deduplication_debug_20251013_143022.txt
✅ Excel export complete: blackpug_registrants.xlsx
```

---

## 🧪 Optional environment variables

| Variable        | Purpose                                                                           |
|-----------------|-----------------------------------------------------------------------------------|
| `CHROME_BINARY` | Absolute path to a specific Chrome/Chromium binary (e.g. a [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/) build, or a non-default install location). The scraper auto-detects Chrome otherwise. |
| `HEADLESS=1`    | Run Chrome headless. Note: you log in interactively, so the default is **headed**. Only useful if you've already established a session another way. |

Example:

```bash
CHROME_BINARY=/opt/google/chrome/chrome python scraper.py
```

---

## 🔧 Troubleshooting

### Browser opens to `data:,` and nothing happens (Linux)
You're running snap Chromium. Install the official Google Chrome `.deb` instead (see the install table above). The scraper now detects this and exits with instructions.

### `WebDriverException: unknown error: cannot find Chrome binary`
Chrome isn't installed, or it's in a non-standard location. Install Chrome, or set `CHROME_BINARY` to point at it:
```bash
export CHROME_BINARY="/path/to/chrome"     # macOS/Linux
$env:CHROME_BINARY="C:\path\to\chrome.exe"  # Windows PowerShell
```

### Login menu / activity link not found
Make sure you completed the manual login **and** selected your unit from the user menu before pressing ENTER in the terminal.

### Want to reset the cached driver
Delete `~/.cache/selenium` (Linux/macOS) or `%LOCALAPPDATA%\selenium` (Windows) and run again.

---

## 📊 Output

### Excel structure
- **One sheet per event** with clean formatting
- **Event title** at the top of each sheet
- **Booked registrations table**
- **Not booked registrations table** (started but didn't complete — for follow-up)
- **Automatic totals** for participant counts
- **Registration numbers as sortable numbers**

### Debug log
The script writes `deduplication_debug_<timestamp>.txt` showing:
- Which duplicate registrations were removed and why
- Email-matching logic
- Before/after counts per event

---

## 🧰 Tested with

- Python 3.10 – 3.13
- Selenium 4.15+
- Chrome / Chromium (current stable)
- Linux, macOS (Intel + Apple Silicon), Windows

---

## ✨ Credits

Vibe-coded with ❤️ and 🤖 by AJ Marroquin for Greater New York Council scouting units.
Licensed under the MIT License.
