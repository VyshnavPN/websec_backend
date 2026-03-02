const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();

// Middleware: Configured for cross-origin requests from your Vercel frontend
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Railway Health Check
app.get('/', (req, res) => res.status(200).send('C2_ENGINE_ONLINE'));

app.post('/api/scan', (req, res) => {
  const { target, tool, subtool } = req.body;
  
  // Sanitize target to prevent command injection
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  // Set headers for real-time data streaming (Chunked Transfer Encoding)
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write(`[PIPELINE] Initializing ${tool.toUpperCase()} sequence for ${safeTarget}...\n`);

  let command = '';

  // Routing logic for specialized security binaries
  switch (tool) {
    case 'audit':
      // Fast TCP Connect scan using unprivileged mode for cloud environments
      command = `nmap -sT --unprivileged -F ${safeTarget}`;
      break;
      
    case 'recon':
      if (subtool === 'whois') {
        // Domain registration and ownership intelligence
        command = `whois ${safeTarget}`;
      } else if (subtool === 'dns') {
        // Comprehensive DNS record enumeration (A, MX, NS, TXT)
        command = `host -a ${safeTarget}`;
      } else {
        // Default Recon: Service discovery on standard web ports
        command = `nmap -sT --unprivileged -p 80,443,8080 ${safeTarget}`;
      }
      break;

    case 'exploit':
      // Executes custom Python-based vulnerability assessment scripts
      command = `python3 exploits/scanner.py --target ${safeTarget}`;
      break;

    default:
      command = `echo "Error: Operation not recognized by C2 Core."`;
  }

  res.write(`[EXEC] Dispatching system binary...\n\n`);

  // Execute the command directly within the containerized sandbox
  const child = exec(command);

  // Stream standard output back to the React terminal
  child.stdout.on('data', (data) => {
    res.write(data);
  });

  // Stream error output for real-time troubleshooting
  child.stderr.on('data', (data) => {
    res.write(`[ERROR] ${data}`);
  });

  // Finalize the stream once the process concludes
  child.on('close', (code) => {
    const status = (code === 0) ? "SUCCESS" : "TERMINATED_WITH_ERRORS";
    res.write(`\n[${status}] Operation finalized (Exit Code: ${code})\n`);
    res.end();
  });

  // Handle initialization failures
  child.on('error', (err) => {
    res.write(`[SYSTEM_FAILURE] Failed to spawn process: ${err.message}\n`);
    res.end();
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEBSEC_C2_ACTIVE: Port ${PORT}`);
});