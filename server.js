const express = require('express');
const cors = require('cors');
const { exec, spawnSync } = require('child_process');
const path = require('path');

const app = express();

// Global Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Health Check for Render Deployment
app.get('/', (req, res) => res.status(200).send('C2_ENGINE_ONLINE_v4.0'));

/**
 * DEFENSIVE_PYTHON_DISCOVERY
 * Ensures the engine finds the correct interpreter in the Linux container.
 */
function choosePython() {
  const candidates = [process.env.PYTHON, 'python3', 'python', 'py'];
  for (const cmd of candidates) {
    if (!cmd) continue;
    try {
      const r = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
      if (r.status === 0) {
        console.log(`[SYSTEM] PYTHON_EXECUTABLE_LOADED: ${cmd}`);
        return cmd;
      }
    } catch (_) {}
  }
  return 'python3'; // Default for Render/Alpine
}

const pythonCmd = choosePython();

/**
 * MAIN_SCAN_ORCHESTRATOR
 * Handles streaming telemetry from Python binaries to the 3D Dashboard.
 */
app.post('/api/scan', (req, res) => {
  const { target, tool, subtool } = req.body;

  // IMPROVED REGEX: Removes protocol but PRESERVES slashes for path-based fuzzing
  // Old: [^a-zA-Z0-9.-] (This was breaking your ASP.NET paths)
  const safeTarget = target.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9./_-]/g, '');
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write(`[PIPELINE] Initializing ${tool.toUpperCase()} sequence for ${safeTarget}...\n`);

  let command = '';

  switch (tool) {
    case 'audit':
      // Calls the Nikto + Heuristic Fallback engine
      command = `${pythonCmd} exploits/audit_engine.py --target ${safeTarget}`;
      break;
      
    case 'recon':
      if (subtool === 'whois') {
        const rootDomain = safeTarget.split('/')[0].replace(/^www\./i, '');
        command = `whois ${rootDomain} | grep -Ei "Domain Name:|Registrar:|Creation Date:|Expiry Date:" | head -n 15`;
      } else if (subtool === 'dns') {
        command = `host -a ${safeTarget.split('/')[0]} | grep -vE ";; |^$|Trying|Received"`;
      } else {
        // Nmap Discovery
        command = `nmap -sT --unprivileged -F ${safeTarget.split('/')[0]} | grep -vE "Starting Nmap|Nmap done"`;
      }
      break;

    case 'exploit':
      const exploitType = subtool || 'headers';
      command = `${pythonCmd} exploits/scanner.py --target ${safeTarget} --type ${exploitType}`;
      break;

    case 'osint':
      command = `${pythonCmd} exploits/osint_engine.py --target ${safeTarget}`;
      break;

    default:
      res.write(`[ERROR] Unknown module: ${tool}\n`);
      res.end();
      return;
  }

  const execLabel = subtool || tool;
  res.write(`[EXEC] Spawning system process for ${execLabel}...\n\n`);

  // Stream output to frontend
  const child = exec(command);

  child.stdout.on('data', (data) => res.write(data));
  child.stderr.on('data', (data) => res.write(`[STDERR] ${data}`));

  child.on('close', (code) => {
    const status = (code === 0) ? "SUCCESS" : "FAILED";
    res.write(`\n[${status}] Task finalized (Exit Code: ${code})\n`);
    res.end();
  });

  child.on('error', (err) => {
    res.write(`[SYSTEM_ERROR] Kernel-level execution failure.\n`);
    res.end();
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`C2_SERVER_ACTIVE_ON_PORT: ${PORT}`);
});