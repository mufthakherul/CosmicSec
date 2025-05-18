from setuptools import setup, find_packages

# Read long description from README if exists
def readme():
    try:
        with open('README.md', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Modular AI-Powered Hacking Assistant (Red & Blue Team Ready)"

setup(
    name='hacker_ai',
    version='0.1.0',
    description='Advanced Modular AI Hacking Framework for Red & Blue Teams',
    long_description=readme(),
    long_description_content_type='text/markdown',
    author='Mufthakherul Islam Miraz',
    author_email='mufthakherul_cybersec@s6742.me',
    url='https://github.com/mufthakherul/hacker_ai',  # Update if repo changes
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'rich',
        'textual',            # For future visual TUI
        'npyscreen',          # Optional TUI module
        'pyyaml',             # For YAML config support
        'requests',
        'tqdm',
        'colorama',
        'fuzzywuzzy',
        'python-dotenv',
        'openai',
        'httpx',
        'schedule',
        'tabulate',
        'cryptography',
        'pandas',             # For CSV/Excel reporting later
        'matplotlib',         # For visual analytics/heatmaps
        'scikit-learn',       # For AI-assisted analysis
        'beautifulsoup4',     # For HTML parsing (phishing/OSINT)
        'lxml',
        'aiohttp',
        'uvicorn',
        'fastapi',
        'flask',              # Optionally FastAPI or Flask
    ],
    entry_points={
        'console_scripts': [
            'hacker_ai=hacker_ai.launcher:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Security Professionals',
        'Topic :: Security :: Cryptography',
        'Topic :: Software Development :: Build Tools',
        'Topic :: Utilities',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
    python_requires='>=3.9',
    keywords=[
        'hacking', 'ai', 'cybersecurity', 'pentesting', 'redteam', 'blueteam',
        'ethical hacking', 'automation', 'infosec', 'malware analysis', 'osint'
    ],
    project_urls={
        'Documentation': 'https://github.com/mufthakherul/hacker_ai/wiki',
        'Source': 'https://github.com/mufthakherul/hacker_ai',
        'Tracker': 'https://github.com/mufthakherul/hacker_ai/issues',
    },
    zip_safe=False,
)
