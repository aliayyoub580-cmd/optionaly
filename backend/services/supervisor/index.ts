import { spawn } from 'child_process';
import { openSync } from 'fs';

const PORT = 3005;

const SERVICES = [
  { name: 'price-engine', cmd: 'bun', args: ['index.ts'], cwd: '/home/z/my-project/mini-services/price-engine', log: '/home/z/my-project/price-engine.log' },
  { name: 'nextjs', cmd: 'npx', args: ['next', 'dev', '--turbopack', '-p', '3000'], cwd: '/home/z/my-project', envExtra: { NODE_OPTIONS: '--max-old-space-size=512' }, log: '/home/z/my-project/dev.log' },
];

function startService(svc: typeof SERVICES[0]) {
  const logFd = openSync(svc.log, 'a');
  const env = { ...process.env } as Record<string, string>;
  if (svc.envExtra) Object.assign(env, svc.envExtra);

  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    env,
    stdio: ['ignore', logFd, logFd],
  });

  child.on('exit', (code: number) => {
    console.log(`[${svc.name}] exited code=${code}, restarting in 3s...`);
    setTimeout(() => startService(svc), 3000);
  });
  child.on('error', (err: Error) => {
    console.log(`[${svc.name}] error:`, err.message);
    setTimeout(() => startService(svc), 3000);
  });

  console.log(`[${svc.name}] started PID=${child.pid}`);
  return child;
}

// Simple HTTP health check server
const http = require('http');
const server = http.createServer((_req: any, res: any) => {
  const status = SERVICES.map(s => `${s.name}: checking...`).join(', ');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Supervisor running on port ' + PORT + '\n');
});
server.listen(PORT, () => {
  console.log(`[Supervisor] HTTP on port ${PORT}`);
});

// Start all services
for (const svc of SERVICES) {
  startService(svc);
}

console.log('[Supervisor] All services launched');
