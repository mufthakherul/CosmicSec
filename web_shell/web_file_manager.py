"""
web_shell/web_file_manager.py
Advanced AI-integrated web-based file manager for offensive + defensive operations
"""

import os
import shutil
import zipfile
from utils.auth import require_authentication
from utils.logger import logger
from llm.offline_chat import analyze_with_ai
from flask import send_file


@require_authentication
def list_directory(path):
    try:
        files = os.listdir(path)
        entries = []
        for f in files:
            full_path = os.path.join(path, f)
            entries.append({
                'name': f,
                'path': full_path,
                'is_dir': os.path.isdir(full_path),
                'size': os.path.getsize(full_path),
                'last_modified': os.path.getmtime(full_path)
            })
        logger.info(f"Listed directory: {path}")
        return entries
    except Exception as e:
        logger.error(f"Directory list error: {e}")
        return {'error': str(e)}


@require_authentication
def delete_file(path):
    try:
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
        logger.info(f"Deleted: {path}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Delete error: {e}")
        return {'error': str(e)}


@require_authentication
def download_file(path):
    try:
        return send_file(path, as_attachment=True)
    except Exception as e:
        logger.error(f"Download error: {e}")
        return {'error': str(e)}


@require_authentication
def upload_file(file, dest_path):
    try:
        file.save(dest_path)
        logger.info(f"Uploaded: {dest_path}")
        return {"status": "uploaded"}
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return {'error': str(e)}


@require_authentication
def move_file(src, dest):
    try:
        shutil.move(src, dest)
        logger.info(f"Moved {src} to {dest}")
        return {"status": "moved"}
    except Exception as e:
        logger.error(f"Move error: {e}")
        return {'error': str(e)}


@require_authentication
def zip_directory(directory, zip_path):
    try:
        shutil.make_archive(zip_path.replace('.zip', ''), 'zip', directory)
        logger.info(f"Zipped directory: {directory} to {zip_path}")
        return {"status": "zipped"}
    except Exception as e:
        logger.error(f"Zip error: {e}")
        return {'error': str(e)}


@require_authentication
def extract_zip(zip_path, extract_to):
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        logger.info(f"Unzipped {zip_path} to {extract_to}")
        return {"status": "unzipped"}
    except Exception as e:
        logger.error(f"Unzip error: {e}")
        return {'error': str(e)}


@require_authentication
def analyze_file_with_ai(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        result = analyze_with_ai(content)
        logger.info(f"AI analyzed file: {path}")
        return result
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return {'error': str(e)}
