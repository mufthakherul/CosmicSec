hacker_ai/
├── main.py                         # 🔧 Master engine: boot, route, CLI/API (REFACTOR)
├── config.py                       # 🔧 Central config: paths, keys, toggles (REBUILD)
├── setup.py                        # 📦 Installer for CLI/API tool
├── requirements.txt
├── README.md                       # 📘 Auto-generated summary, features
├── LICENSE                         # 📚 Open/Controlled license
├── memory.json                     # 🧠 Persistent memory (prompts/history)
├── logbook.md                      # 📖 Human-readable action log
├── user_profiles.json              # 🔐 User activity, permissions, role
├── ai_memory.json                  # 🧠 Self-learning, adaptive memory
├── .env                            # 🔐 Secure secrets & API keys
│
├── data/
│   ├── logs/
│   ├── cache/
│   └── banlist.txt                 # 🔐 Auto-blocked users list
│
├── utils/
│   ├── multithreading.py
│   ├── async_tools.py
│   ├── logger.py
│   ├── file_utils.py
│   ├── network_utils.py
│   ├── language_utils.py
│   └── crypto_utils.py
│
├── tools/
│   ├── hash_cracker.py
│   ├── port_finder.py
│   ├── file_encryptor.py
│   ├── payload_generator.py        # ✅ AI-assisted XSS, SQLi, RCE
│   ├── exploit_db_fetcher.py       # ✅ Scrapes ExploitDB / CVEs
│   ├── nmap_runner.py
│   ├── nikto_scanner.py
│   ├── sqlmap_runner.py
│   ├── wpscan_launcher.py
│   ├── dirsearch_tool.py
│   ├── burpsuite_controller.py     # ✅ API bridge + automation
│
├── recon/
│   ├── dorker.py
│   ├── whois_lookup.py
│   ├── ip_locator.py
│   ├── subdomain_finder.py
│   ├── dns_enumerator.py
│   ├── info_gathering.py
│   ├── osint_tools.py
│   ├── tor_leak_checker.py
│   ├── github_leak_detector.py
│   └── osint_module.py
│
├── scanners/
│   ├── vulnerability_scanner.py
│   ├── ai_scanner_bridge.py        # 🧠 Middleware: AI + CLI tools
│   ├── cve_scanner.py
│   ├── tech_detector.py
│   ├── site_report_generator.py
│   ├── live_exploit_generator.py   # 🧠 AI → CVE PoC code
│
├── phishing/
│   ├── ai_phishing_simulator.py
│   ├── credential_harvester.py
│   ├── html_generator.py
│   ├── phishing_payloads.py
│   ├── phish_detection_bypass.py
│   ├── phishing_kit_builder.py     # ✅ Build full kits (HTML + JS)
│   ├── email_spoofer.py
│   ├── sms_spoofer.py
│   ├── spoof_payloads.py
│   └── spoof_caller_sms.py         # 🧪 Optional merge with `social_eng`
│
├── web_shell/
│   ├── alfa_shell_upgraded.py
│   ├── advanced_web_shell.py
│   ├── shell_manager.py
│   ├── upload_manager.py
│   ├── cmd_runner.py
│   ├── ip_whitelist.py
│   ├── auto_exfiltrator.py
│   ├── obfuscator.py
│   ├── webshell_payloads.py
│   ├── webshell_ai_interface.py
│   └── webshell_stealth.py
│
├── reverse_engineering/
│   ├── binary_analyzer.py
│   ├── malware_analyzer.py
│   ├── obfuscation_detector.py
│   ├── malware_decompiler.py
│   ├── decompiler_interface.py
│   ├── string_extractor.py
│   ├── binary_patcher.py
│   └── re_pattern_finder.py
│
├── llm/
│   ├── model_loader.py
│   ├── chatbot.py
│   ├── offline_chat.py
│   ├── summarizer.py
│   ├── ai4security_wrapper.py
│   ├── ai_code_reviewer.py
│   └── llm_tools.py
│
├── voice/
│   ├── command_handler.py
│   └── tts_stt_handler.py
│
├── reporting/
│   ├── report_builder.py
│   ├── report_generator.py
│   ├── markdown_writer.py
│   ├── pdf_writer.py
│   ├── ai_writer.py
│   └── secure_share.py
│
├── alerts/
│   ├── anomaly_detector.py
│   ├── notification_engine.py
│   ├── user_warnings.py
│   └── site_warning_system.py
│
├── automation/
│   ├── auto_scan.py
│   ├── chain_attack_simulator.py
│   ├── auto_chain.py
│   ├── scheduled_tasks.py
│   ├── task_scheduler.py
│   ├── self_learning.py
│   └── prompt_memory.py
│
├── remote_control/
│   ├── telegram_bot.py
│   ├── discord_bot.py
│   ├── api_server.py
│   └── api_interface.py
│
├── social_eng/
│   ├── social_mapper.py
│   ├── sms_bomber.py
│   ├── fake_caller_id.py
│   ├── social_scenario_generator.py
│   ├── socmint_toolkit.py
│   ├── fake_profile_generator.py
│   └── link_tracker.py
│
├── security/
│   ├── access_control.py
│   ├── usage_monitor.py
│   ├── ban_handler.py
│   ├── log_scrubber.py
│   ├── stealth_mode.py
│   ├── security_layer.py
│   ├── vpn_switcher.py
│   └── encryption_tools.py
│
├── legal/
│   ├── license_manager.py
│   ├── terms_and_conditions.py
│   ├── user_agreement.py
│   └── illegal_activity_detector.py
│
├── learning/
│   ├── adaptive_learning.py
│   ├── user_behavior_analyzer.py
│   ├── ethics_enforcer.py
│   └── reinforcement_model.py
│
├── ui/
│   ├── dashboard.py
│   ├── cli_ui.py
│   ├── web_ui.py
│   └── mobile_interface.py
│
├── docs/
│   ├── index.md                     # Overview / Welcome
│   ├── installation.md              # Install instructions
│   ├── usage.md                     # How to use the system
│   ├── config.md                    # Configuration options
│   ├── modules/
│   │   ├── README.md                # General module guide
│   │   ├── scanners.md              # All scanner modules
│   │   ├── phishing.md              # Phishing-related modules
│   │   ├── recon.md                 # Reconnaissance tools
│   │   ├── payloads.md              # Payload generators
│   │   ├── shells.md                # Shell-related functionality
│   ├── reporting.md             # Auto-reporting engine
│   └── red_vs_blue.md           # Red/Blue team operations
├── ai_engine.md                 # AI architecture & local+LLM design
├── security.md                  # Security posture, safeguards, authentication
├── legal.md                     # Legal, ethical use, license references
├── contributing.md              # Dev contribution guidelines (linked from root)
├── changelog.md                 # Manual/auto-generated changelog
├── roadmap.md                   # Planned features & priorities
└── faq.md                       # Frequently asked questions
