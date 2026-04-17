const { spawnSync } = require("node:child_process");

const PYTHON_CANDIDATES =
  process.platform === "win32"
    ? [
        { command: "py", prefixArgs: ["-3"] },
        { command: "python", prefixArgs: [] },
        { command: "python3", prefixArgs: [] },
      ]
    : [
        { command: "python3", prefixArgs: [] },
        { command: "python", prefixArgs: [] },
      ];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });
  return result;
}

function isPythonAtLeast311(command, prefixArgs = []) {
  const result = run(command, [
    ...prefixArgs,
    "-c",
    "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)",
  ]);
  return result.status === 0;
}

function detectPython() {
  for (const candidate of PYTHON_CANDIDATES) {
    const result = run(candidate.command, [...candidate.prefixArgs, "--version"]);
    if (result.status !== 0) continue;

    if (isPythonAtLeast311(candidate.command, candidate.prefixArgs)) return candidate;
  }

  return null;
}

function pythonArgs(pythonExec, args) {
  return [...pythonExec.prefixArgs, ...args];
}

function hasCosmicsecAgentModule(pythonExec) {
  const result = run(pythonExec.command, pythonArgs(pythonExec, ["-c", "import cosmicsec_agent"]));
  return result.status === 0;
}

function installWithPipx() {
  const check = run("pipx", ["--version"]);
  if (check.status !== 0) return false;

  const install = spawnSync("pipx", ["install", "--force", "cosmicsec-agent"], { stdio: "inherit" });
  return install.status === 0;
}

function installWithPip(pythonExec) {
  const args = pythonArgs(pythonExec, [
    "-m",
    "pip",
    "install",
    "--upgrade",
    "--user",
    "cosmicsec-agent",
  ]);
  const install = spawnSync(pythonExec.command, args, { stdio: "inherit" });
  return install.status === 0;
}

function installAgent(verbose = true) {
  const pythonExec = detectPython();
  if (!pythonExec) {
    console.error(
      "Python 3.11+ is required. Install Python from python.org, then run: cosmicsec-agent-install",
    );
    return { ok: false, pythonExec: null };
  }

  if (hasCosmicsecAgentModule(pythonExec)) {
    if (verbose) console.log("cosmicsec-agent is already installed.");
    return { ok: true, pythonExec };
  }

  if (verbose) console.log("Installing cosmicsec-agent...");
  if (installWithPipx()) return { ok: true, pythonExec };
  if (installWithPip(pythonExec)) return { ok: true, pythonExec };

  console.error(
    "Unable to install cosmicsec-agent automatically. Try manually: pipx install cosmicsec-agent OR pip install --user cosmicsec-agent",
  );
  return { ok: false, pythonExec };
}

function runAgentCLI(args) {
  const install = installAgent(false);
  if (!install.ok || !install.pythonExec) {
    installAgent(true);
    process.exitCode = 1;
    return;
  }

  const pythonModuleArgs = pythonArgs(install.pythonExec, ["-m", "cosmicsec_agent.main", ...args]);
  const result = spawnSync(install.pythonExec.command, pythonModuleArgs, { stdio: "inherit" });
  process.exitCode = result.status !== null && result.status >= 0 ? result.status : 1;
}

module.exports = {
  detectPython,
  installAgent,
  runAgentCLI,
};
