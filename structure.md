hacker_ai/
│
├── main.py                       ← Entry point (boot, routes, module manager)
├── config.py                     ← Tool paths, settings, tokens, API keys
├── memory.json                   ← Prompt + chat memory
├── logbook.md                    ← All actions logged here
│
├── tools/
│   ├── nmap_runner.py
│   ├── nikto_scanner.py
│   ├── sqlmap_runner.py
│   ├── wpscan_launcher.py
│   ├── dirsearch_tool.py
│   ├── burpsuite_controller.py
│   ├── payload_generator.py
│   └── exploit_db_fetcher.py
│
├── recon/
│   ├── info_gathering.py
│   ├── osint_tools.py
│   ├── tor_leak_checker.py
│   └── github_leak_detector.py
│
├── scanners/
│   ├── vulnerability_scanner.py
│   ├── ai_scanner_bridge.py
│   ├── cve_scanner.py
│   └── live_exploit_generator.py   ← 🧬 NEW: CVE → PoC Generator (AI)
│
├── phishing/
│   ├── ai_phishing_simulator.py
│   └── phishing_kit_builder.py
│
├── reverse_engineering/
│   ├── decompiler_interface.py
│   ├── string_extractor.py
│   ├── malware_analyzer.py
│   └── binary_patcher.py
│
├── llm/
│   ├── offline_chat.py
│   ├── ai_code_reviewer.py
│   └── model_loader.py
│
├── web_shell/
│   └── deployer.py
│
├── reporting/
│   ├── report_generator.py
│   ├── ai_writer.py
│   └── secure_share.py
│
├── alerts/
│   └── site_warning_system.py
│
├── automation/
│   ├── auto_chain.py
│   ├── self_learning.py
│   ├── prompt_memory.py
│   └── task_scheduler.py
│
├── remote_control/
│   ├── telegram_bot.py
│   ├── discord_bot.py
│   └── api_interface.py
│
├── social_eng/
│   ├── socmint_toolkit.py
│   ├── fake_profile_generator.py
│   └── link_tracker.py
│
├── security/
│   ├── access_control.py
│   ├── stealth_mode.py
│   ├── log_scrubber.py
│   ├── vpn_switcher.py
│   └── encryption_tools.py
│
├── voice/
│   └── voice_commands.py
│
├── legal/
│   └── legal_watchdog.py           ← 🧑‍⚖️ NEW: Protect user from illegal behavior
│
├── ui/
│   ├── dashboard.py                ← 📊 Risk + Scan visual dashboard
│   └── web_ui.py                   ← 🌍 Web (Flask/React) interface
│
└── utils/
    ├── multithreading.py
    ├── async_tools.py
    └── logger.py
```/outputs/
    /nmap/
        /json/
        /txt/
        /csv/
    /sqlmap/
        ...
