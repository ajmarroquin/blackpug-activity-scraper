import time
import openpyxl
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.utils import get_column_letter
from collections import defaultdict
import os

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.service import Service

def auto_fit_columns(ws):
    for col_num, col_cells in enumerate(ws.iter_cols(min_row=1, max_row=ws.max_row), 1):
        max_length = max(len(str(cell.value or "")) for cell in col_cells)
        ws.column_dimensions[get_column_letter(col_num)].width = max_length + 2


def extract_event_rows(driver):
    wait = WebDriverWait(driver, 10)
    rows = driver.find_elements(By.CSS_SELECTOR, "div[onclick*='toggle']")
    print(f"📦 Found {len(rows)} registration rows...")

    event_data = defaultdict(list)

    for row in rows:
        try:
            event_title = row.text.strip()
            driver.execute_script("arguments[0].click();", row)
            time.sleep(0.4)

            container = row.find_element(By.XPATH, "following-sibling::div[1]")
            fields = container.find_elements(By.CSS_SELECTOR, "div.col-xs-12.col-sm-6")

            record = {"Event Summary": event_title}
            for field in fields:
                try:
                    label = field.find_element(By.CLASS_NAME, "col-xs-4").text.strip()
                    value = field.find_element(By.CLASS_NAME, "col-xs-8").text.strip()
                    record[label] = value
                except:
                    continue

            event_key = event_title.split(":")[1].strip() if ":" in event_title else event_title
            event_data[event_key].append(record)

        except Exception as e:
            print("⚠️ Skipped a row due to error:", e)

    return event_data


def write_to_excel(grouped_data, filename="blackpug_registrants.xlsx"):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    for i, (event, records) in enumerate(grouped_data.items()):
        sheet_name = event[:31]
        ws = wb.create_sheet(title=sheet_name)

        all_keys = sorted(set().union(*(r.keys() for r in records)))
        ws.append(all_keys)

        for record in records:
            ws.append([record.get(k, "") for k in all_keys])

        end_col = get_column_letter(len(all_keys))
        table_ref = f"A1:{end_col}{len(records) + 1}"
        table = Table(displayName=f"{sheet_name.replace(' ', '')}Tbl{i+1}", ref=table_ref)
        style = TableStyleInfo(name="TableStyleMedium9", showFirstColumn=False,
                               showLastColumn=False, showRowStripes=True, showColumnStripes=False)
        table.tableStyleInfo = style
        ws.add_table(table)

        auto_fit_columns(ws)

    wb.save(filename)
    print(f"✅ Excel export complete: {filename}")



def main():
    event_url = input("🔗 Enter the Black Pug Event URL: ").strip().split("#")[0]
    if not event_url.startswith("http"):
        print("❌ Invalid URL format. Must start with http or https.")
        return

    # Set up headless Chrome with flags for macOS/Apple Silicon
    options = Options()
    options.binary_location = os.path.expanduser("~/Applications/ChromeForTesting/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing")
    # options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--remote-debugging-port=9222")
    options.add_argument("--window-size=1920,1080")

    driver_path = os.path.abspath(os.path.join("drivers", "chromedriver"))
    service = Service(driver_path)
    driver = webdriver.Chrome(service=service, options=options)



    try:
        driver.get(event_url)
        time.sleep(2)  # Wait for page to settle
        input("🔒 Log in to Black Pug in the browser. Then press ENTER to continue...")
        wait = WebDriverWait(driver, 10)

      # Find all dropdowns with class "caret"
        user_menus = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "caret")))

        if len(user_menus) < 2:
            print("❌ Could not find the user dropdown. Are you logged in?")
            return

        user_menus[1].click()  # Second dropdown is your user menu


        # Click "View Activity"
        view_activity = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//a[contains(text(), 'View Activity')]")))
        view_activity.click()

        # Wait for the modal to appear
        wait.until(EC.visibility_of_element_located((By.XPATH,
            "//div[contains(@class,'modal')]//div[contains(text(),'Summer Camp & Activities History')]")))
        time.sleep(1)

        # Scrape data
        grouped_data = extract_event_rows(driver)
        write_to_excel(grouped_data)

    except Exception as e:
        print("❌ Error during scraping:", e)
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
