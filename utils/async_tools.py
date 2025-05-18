# utils/async_tools.py
import asyncio
import aiohttp

async def gather_async_calls(*coros):
    return await asyncio.gather(*coros, return_exceptions=True)

def run_async(fn, *args, **kwargs):
    return asyncio.run(fn(*args, **kwargs))

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.text()

async def async_fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await gather_async_calls(*tasks)