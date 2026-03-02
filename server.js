const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('C2_ENGINE_ONLINE'));

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
      // Force check for subtools first
      if (subtool === 'whois') {
        command = `whois ${safeTarget}`;
      } else if (subtool === 'dns') {
        command = `host -a ${safeTarget}`;
      } else {
        // Fallback if subtool is undefined or different
        command = `nmap -sT --unprivileged -p 80,443,8080 ${safeTarget}`;
      }
      break;

    case 'exploit':
      command = `python3 exploits/scanner.py --target ${safeTarget}`;
      break;

    default:
      command = `echo "Error: Unknown operation."`;
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