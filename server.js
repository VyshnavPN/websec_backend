const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();

// Middleware: Open CORS for Vercel/Localhost and enable JSON parsing
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Railway Health Check: Confirms the backend is alive
app.get('/', (req, res) => res.status(200).send('C2_LOCAL_ENGINE_ACTIVE'));

app.post('/api/scan', (req, res) => {
  const { target, tool, subtool } = req.body;
  
  // Sanitize target to prevent command injection (security best practice)
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  // Set headers for streaming the output to your terminal UI
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write(`[PIPELINE] Initializing ${tool.toUpperCase()} sequence for ${safeTarget}...\n`);

  let command = '';

  // Logic to switch between real binaries installed in the container
  switch (tool) {
    case 'audit':
      // -sT: TCP Connect scan (doesn't need root)
      // --unprivileged: Tells Nmap not to try raw socket operations
      command = `nmap -sT --unprivileged -F ${safeTarget}`;
      break;
    case 'recon':
      if (subtool === 'whois') {
        command = `whois ${safeTarget}`;
      } else if (subtool === 'dns') {
        command = `host ${safeTarget}`;
      } else {
        // Default Recon: Port scan 80,443 instead of Ping sweep to avoid permission errors
        command = `nmap -sT --unprivileged -p 80,443 ${safeTarget}`;
      }
      break;
    case 'exploit':
      // Assumes you have an exploits folder with a python script
      command = `python3 exploits/scanner.py --target ${safeTarget}`;
      break;
    default:
      command = `echo "Unknown tool selected."`;
  }

  res.write(`[EXEC] Running: ${command}\n\n`);

  // Execute the command directly on the Railway OS sandbox
  const child = exec(command);

  // Stream standard output back to the frontend
  child.stdout.on('data', (data) => {
    res.write(data);
  });

  // Stream error output back to the frontend for debugging
  child.stderr.on('data', (data) => {
    res.write(`[STDERR] ${data}`);
  });

  // Handle process completion
  child.on('close', (code) => {
    res.write(`\n[COMPLETE] Process exited with code ${code}\n`);
    res.end();
  });

  // Handle process startup failures
  child.on('error', (err) => {
    res.write(`[FATAL] Failed to start process: ${err.message}\n`);
    res.end();
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEBSEC_C2_LOCAL_SERVER: Active on port ${PORT}`);
});