const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');

const app = express();
// This tells Railway the server is healthy
app.get('/', (req, res) => {
  res.status(200).send('C2_HEARTBEAT_OK');
});
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// 1. Health Check for Railway
app.get('/', (req, res) => res.status(200).send('ONLINE'));

app.post('/api/scan', async (req, res) => {
  const { target, tool, subtool } = req.body;
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  
  try {
    let image = 'instrumentisto/nmap';
    let cmd = ['-F', safeTarget]; 

    // Add logic for other tools here...

    const container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true
    });

    await container.start();
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    stream.pipe(res);

    container.wait(() => container.remove().catch(() => {}));
  } catch (err) {
    res.status(500).send(`[ERROR] ${err.message}`);
  }
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEBSEC_C2_SERVER: Active on port ${PORT}`);
});