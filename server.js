const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Railway Health Check
app.get('/', (req, res) => res.status(200).send('C2_LOCAL_ENGINE_ACTIVE'));

app.post('/api/scan', (req, res) => {
  const { target, tool, subtool } = req.body;
  
  // Sanitize target to prevent command injection
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write(`[PIPELINE] Initializing ${tool.toUpperCase()} sequence for ${safeTarget}...\n`);

  let command = '';

  // Logic to switch between real binaries installed in the container
  switch (tool) {
    case 'audit':
      command = `nmap -F ${safeTarget}`;
      break;
    case 'recon':
      if (subtool === 'whois') {
        command = `whois ${safeTarget}`;
      } else if (subtool === 'dns') {
        command = `host ${safeTarget}`;
      } else {
        command = `nmap -sn ${safeTarget}`; // Quick ping sweep
      }
      break;
    case 'exploit':
      // Example: Running a local python script for a specific PoC
      command = `python3 exploits/scanner.py --target ${safeTarget}`;
      break;
    default:
      command = `echo "Unknown tool selected."`;
  }

  res.write(`[EXEC] Running: ${command}\n\n`);

  // Execute the command directly on the Railway OS
  const process = exec(command);

  process.stdout.on('data', (data) => {
    res.write(data);
  });

  process.stderr.on('data', (data) => {
    res.write(`[STDERR] ${data}`);
  });

  process.on('close', (code) => {
    res.write(`\n[COMPLETE] Process exited with code ${code}\n`);
    res.end();
  });

  process.on('error', (err) => {
    res.write(`[FATAL] Failed to start process: ${err.message}\n`);
    res.end();
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEBSEC_C2_LOCAL_SERVER: Active on port ${PORT}`);
});