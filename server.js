const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');

const app = express();

// Initialize Docker to use the host's socket (Railway DooD setup)
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// FIX 1: Strict CORS (Remove trailing slash for better compatibility)
app.use(cors({
  origin: true, // This reflects the origin of the request, making it highly compatible
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

app.post('/api/scan', async (req, res) => {
  const { target, tool, subtool } = req.body;

  // Security Check: Sanitizing the target input
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  try {
    let image = 'instrumentisto/nmap';
    let cmd = ['-F', safeTarget]; 

    if (tool === 'recon') {
      if (subtool === 'whois') {
        image = 'linuxserver/whois'; 
        cmd = [safeTarget];
      } else if (subtool === 'dns') {
        image = 'busybox';
        cmd = ['nslookup', safeTarget];
      }
    }

    // Create the Docker Container
    const container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true
    });

    // Start and stream logs
    await container.start();
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });

    // Stream headers
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    stream.pipe(res);

    // Cleanup logic: Ensure container is removed after the scan finishes
    container.wait(() => {
      container.remove().catch(e => console.error("Cleanup Error:", e));
    });

  } catch (err) {
    console.error("Execution Error:", err);
    res.status(500).send(`[SERVER_ERROR] ${err.message}`);
  }
});

// FIX 2: Dynamic Port for Railway
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`WEBSEC_C2_SERVER: Active on port ${PORT}`));