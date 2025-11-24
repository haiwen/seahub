import jwt
import time
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse

from seahub.settings import JWT_PRIVATE_KEY


def gen_thumbnail_access_token(file_uuid):
    access_token = jwt.encode({
        'file_uuid': file_uuid,
        'exp': int(time.time()) + 300,
    },
        JWT_PRIVATE_KEY,
        algorithm='HS256'
    )
    return access_token

def screenshot_from_url(url, save_path, div_selector="#sdoc-editor-print-wrapper", request=None, file_uuid=None, access_token=None):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        parsed_url = urlparse(url)
        cookie_domain = parsed_url.netloc.split(":")[0]
        if request:
            playwright_cookies = []
            for cookie_name, cookie_value in request.COOKIES.items():
                playwright_cookies.append({
                    "name": cookie_name,
                    "value": cookie_value,
                    "domain": cookie_domain,
                    "path": "/",
                })
            playwright_cookies.append({
                'name': 'thumbnail_access_token',
                'value': access_token,
                'domain': cookie_domain,
                'path': "/"
            })
            context.add_cookies(playwright_cookies)
        try:
            response = page.goto(url, wait_until="domcontentloaded", timeout=60000)
            if response.status > 400:
                return False
            
            page.wait_for_load_state("networkidle")
            
            div_locator = page.locator(div_selector)
            div_locator.wait_for(state="visible", timeout=60000)
            div_box = div_locator.bounding_box()
            clip_region = {
                "x": div_box["x"],
                "y": div_box["y"],
                "width": div_box["width"],
                "height": div_box["width"]
            }
            page.screenshot(
                path=save_path,
                clip=clip_region,
            )
            
            return True
        except Exception as e:
            raise e
        finally:
            browser.close()
