const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');

const app = express();

// Initialize Docker with a specific timeout for cloud environments
const docker = new Docker({ 
  socketPath: '/var/run/docker.sock',
  timeout: 5000 
});

// Middleware: Open CORS for Vercel and Localhost testing
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Railway Health Check: Keeps the container active (prevents SIGTERM)
app.get('/', (req, res) => res.status(200).send('C2_HEARTBEAT_ACTIVE'));

app.post('/api/scan', async (req, res) => {
  const { target, tool, subtool } = req.body;
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  // Set headers for streaming the output to your React terminal
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write(`[PIPELINE] Initializing ${tool.toUpperCase()} sequence for ${safeTarget}...\n`);

  try {
    // Attempt to verify the Docker socket connection
    res.write(`[SYSTEM] Attempting Handshake with /var/run/docker.sock...\n`);
    await docker.ping(); 
    res.write(`[SUCCESS] Connection Established. Spawning tool container...\n`);

    let image = 'instrumentisto/nmap';
    let cmd = ['-F', safeTarget]; 

    // Additional tool logic (can be expanded)
    if (tool === 'recon') {
      if (subtool === 'whois') { image = 'linuxserver/whois'; cmd = [safeTarget]; }
      else if (subtool === 'dns') { image = 'busybox'; cmd = ['nslookup', safeTarget]; }
    }

    const container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true
    });

    await container.start();
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });

    // Pipe the real-time container output back to the frontend
    stream.pipe(res);

    // Cleanup: Remove container after the scan finishes
    container.wait(() => container.remove().catch(() => {}));

  } catch (err) {
    // PRINT ERROR TO TERMINAL (As requested)
    res.write(`\n[FATAL_ERROR] C2_LINK_FAILED: ${err.message}\n`);
    res.write(`[DEBUG] Check Railway Variables for RAILWAY_DOCKER_SOCKET.\n`);
    res.write(`[DEBUG] Verify Dockerfile Path: websec-api/Dockerfile.\n`);

    /* // FAKE SIMULATION PART (Commented out as requested)
    res.write(`[WARN] Docker Engine unreachable. Engaging Virtualization Bridge...\n`);
    setTimeout(() => {
      res.write(`Simulated scan report for ${safeTarget}\nHost is UP.\n`);
      res.end();
    }, 3000);
    */

    // Ensure the response ends if there is an error
    res.end();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEBSEC_C2_SERVER: Active on port ${PORT}`);
});