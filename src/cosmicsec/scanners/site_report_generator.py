# scanners/site_report_generator.py
from scanners.tech_detector import detect_tech
from recon.osint_module import full_osint
from utils.logger import logger
from utils.file_utils import write_json, write_file, ensure_dir
import datetime
import os

def generate_site_report(domain, outpath="outputs/reports/"):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_data = {
        "domain": domain,
        "timestamp": timestamp,
        "osint": full_osint(domain),
        "technologies": detect_tech(f"http://{domain}")
    }

    try:
        ensure_dir(outpath)
        json_file = os.path.join(outpath, f"{domain}_report_{timestamp}.json")
        md_file = os.path.join(outpath, f"{domain}_report_{timestamp}.md")

        write_json(json_file, report_data)
        markdown = f"# Site Report: {domain}\n\n**Generated:** {timestamp}\n\n## Detected Tech\n"
        markdown += '\n'.join(f"- {item}" for item in report_data["technologies"])
        markdown += "\n\n## OSINT Summary"

        for key, val in report_data["osint"].items():
            markdown += f"\n\n### {key.title()}\n{val}\n"

        write_file(md_file, markdown)
        logger.info(f"[SiteReport] Report saved: {json_file} & {md_file}")
        return report_data
    except Exception as e:
        logger.error(f"[SiteReport] Error: {e}")
        return {}
