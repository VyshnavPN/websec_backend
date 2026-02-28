const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');

const app = express();
const docker = new Docker(); // Connects to local Docker socket

app.use(cors());
app.use(express.json());

app.post('/api/scan', async (req, res) => {
  const { target, tool, subtool } = req.body;

  // 1. Security Check: Prevent command injection
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  try {
    let image = 'instrumentisto/nmap';
    let cmd = ['-F', safeTarget]; // Default: Fast Nmap Scan

    if (tool === 'recon') {
      if (subtool === 'whois') {
        image = 'linuxserver/whois'; // Example image
        cmd = [safeTarget];
      } else if (subtool === 'dns') {
        image = 'busybox';
        cmd = ['nslookup', safeTarget];
      }
    }

    // 2. Create the Docker Container
    const container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true
    });

    // 3. Start and stream logs back to React
    await container.start();
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    stream.pipe(res);

    // 4. Cleanup: Remove container when done
    container.wait(() => container.remove());

  } catch (err) {
    console.error(err);
    res.status(500).send(`[SERVER_ERROR] ${err.message}`);
  }
});

app.listen(5000, () => console.log('WEBSEC_C2_SERVER: Running on port 5000'));