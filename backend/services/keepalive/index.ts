import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const PORT = 3001;
let nextProcess: ChildProcess | null = null;
let restarting = false;

function startNext(): void {
  if (nextProcess) {
    try { nextProcess.kill('SIGTERM'); } catch {}
  }
  console.log('[KeepAlive] Starting Next.js dev server on port 3000...');
  nextProcess = spawn('npx', ['next', 'dev', '--turbopack', '-p', '3000', '--hostname', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  nextProcess.stdout?.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.log('[Next]', msg);
  });

  nextProcess.stderr?.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error('[Next:ERR]', msg);
  });

  nextProcess.on('exit', (code) => {
    console.log(`[KeepAlive] Next.js exited with code ${code}`);
    nextProcess = null;
    if (!restarting) {
      console.log('[KeepAlive] Restarting in 3s...');
      setTimeout(startNext, 3000);
    }
  });

  nextProcess.on('error', (err) => {
    console.error('[KeepAlive] Next.js error:', err.message);
    nextProcess = null;
    if (!restarting) {
      console.log('[KeepAlive] Restarting in 3s due to error...');
      setTimeout(startNext, 3000);
    }
  });
}

function checkHealth(): void {
  if (restarting || !nextProcess) return;
  const req = http.get('http://127.0.0.1:3000/', (res) => {
    res.resume();
    if (res.statusCode !== 200) {
      console.log('[KeepAlive] Health check failed:', res.statusCode, '- restarting...');
      startNext();
    }
  });
  req.on('error', () => {
    console.log('[KeepAlive] Server not responding - restarting...');
    startNext();
  });
  req.setTimeout(10000, () => {
    req.destroy();
    // Don't restart on timeout - dev server may be compiling
  });
}

// HTTP health endpoint for this service
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'alive',
    nextRunning: nextProcess !== null,
    pid: nextProcess?.pid || null,
  }));
});

server.listen(PORT, () => {
  console.log(`[KeepAlive] Monitor running on port ${PORT}`);
});

// Start Next.js
startNext();

// Health check every 15 seconds (longer interval for dev server compilation)
setInterval(checkHealth, 15000);

console.log('[KeepAlive] Service started. Will auto-restart Next.js dev if it dies.');
