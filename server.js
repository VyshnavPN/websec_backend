const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('C2_ENGINE_ONLINE'));

// determine which python command is available; try common names
const { spawnSync } = require('child_process');
function choosePython() {
  const candidates = [process.env.PYTHON, process.env.PYTHON_CMD, 'python3', 'python', 'py'];
  for (const cmd of candidates) {
    if (!cmd) continue;
    try {
      const r = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
      if (r.status === 0) {
        console.log(`PYTHON_EXECUTABLE=${cmd}`);
        return cmd;
      }
    } catch (_) {
      // ignore
    }
  }
  console.warn('No python interpreter found on PATH; exploit commands will fail.');
  return candidates.find(Boolean) || 'python';
}

const pythonCmd = choosePython();

app.post('/api/scan', (req, res) => {
  const { target, tool, subtool } = req.body;
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write(`[PIPELINE] Initializing ${tool.toUpperCase()} sequence for ${safeTarget}...\n`);

  let command = '';

  switch (tool) {
    case 'audit':
      command = `nmap -sT --unprivileged -F ${safeTarget}`;
      break;
      
    case 'recon':
      if (subtool === 'whois') {
        const rootDomain = safeTarget.replace(/^www\./i, '');
        // Filters for core ownership and registration dates only
        command = `whois ${rootDomain} | grep -Ei "Domain Name:|Registrar:|Updated Date:|Creation Date:|Expiry Date:|Registrant Organization:|Name Server:|DNSSEC:" | head -n 20`;
      } else if (subtool === 'dns') {
        // -a fetches all, but we use grep to show ONLY the Answer Section (the actual records)
        // We exclude the empty sections and headers for a cleaner UI
        command = `host -a ${safeTarget} | grep -vE ";; |^$|Trying|Received"`;
      } else {
        // Nmap: Keep as is, but hide the "Starting Nmap" header if you want it even cleaner
        command = `nmap -sT --unprivileged -p 80,443,8080 ${safeTarget} | grep -vE "Starting Nmap|Nmap done|Other addresses"`;
      }
      break;

    case 'exploit':
      // Ensure we provide a default 'headers' if subtool is missing
      const exploitType = subtool || 'headers';
      const pyExec = pythonCmd; // discovered at startup
      command = `${pyExec} exploits/scanner.py --target ${safeTarget} --type ${exploitType}`;
      break;

    case 'osint':
      // osint module simply needs a target string too
      command = `${pythonCmd} exploits/osint_engine.py --target ${safeTarget}`;
      break;

    default:
      // if the tool isn't recognized we send a message and bail out
      res.write(`[ERROR] Unknown tool: ${tool}\n`);
      res.end();
      return;
  }

  res.write(`[EXEC] Running system binary for ${subtool || 'general'} task...\n\n`);

  const child = exec(command);

  child.stdout.on('data', (data) => res.write(data));
  child.stderr.on('data', (data) => res.write(`[ERROR] ${data}`));

  child.on('close', (code) => {
    const status = (code === 0) ? "SUCCESS" : "FAILED";
    res.write(`\n[${status}] Operation finalized (Exit Code: ${code})\n`);
    res.end();
  });

  child.on('error', (err) => {
    res.write(`[SYSTEM_ERROR] Execution failed.\n`);
    res.end();
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`C2_SERVER_ACTIVE: ${PORT}`);
});