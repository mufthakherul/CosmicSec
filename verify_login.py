import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("Navigating to login page...")
        await page.goto("http://localhost:3000/login")
        
        print("Filling login form...")
        await page.fill('input[type="email"]', 'riadhasan.test+0426@example.com')
        await page.fill('input[type="password"]', 'CosmicSec!1234')
        await page.click('button[type="submit"]')
        
        print("Waiting for navigation to /dashboard...")
        try:
            await page.wait_for_url("**/dashboard", timeout=10000)
            print(f"Current URL: {page.url}")
        except Exception as e:
            print(f"Failed to reach dashboard: {e}")
            print(f"Current URL: {page.url}")
            await browser.close()
            return

        print("Checking storage...")
        storage = await page.evaluate('''() => {
            return {
                localStorage: {
                    token: localStorage.getItem('cosmicsec_token'),
                    user: localStorage.getItem('cosmicsec_user')
                },
                sessionStorage: {
                    token: sessionStorage.getItem('cosmicsec_token'),
                    user: sessionStorage.getItem('cosmicsec_user')
                }
            }
        }''')
        print(f"Storage: {storage}")

        print("Navigating to AI page...")
        await page.goto("http://localhost:3000/ai")
        await page.wait_for_load_state("networkidle")
        print(f"AI Page URL: {page.url}")
        
        # Verify authenticated state on AI page (e.g. check if still logged in or if sensitive content exists)
        content = await page.content()
        if "login" in page.url.lower():
            print("Redirected to login from AI page.")
        else:
            print("Successfully loaded AI page while authenticated.")

        await browser.close()

asyncio.run(run())
