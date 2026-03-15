# utils/multithreading.py
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

executor = ThreadPoolExecutor(max_workers=20)

def run_in_threads(fn, tasks):
    return list(executor.map(fn, tasks))

def run_with_progress(fn, tasks, logger=None):
    results = []
    for future in as_completed([executor.submit(fn, t) for t in tasks]):
        res = future.result()
        results.append(res)
        if logger:
            logger.info(f"Task completed: {res}")
    return results


