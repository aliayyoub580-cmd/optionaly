const { spawn } = require('child_process');

function startEngine() {
  const child = spawn('bun', ['index.ts'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('exit', (code, signal) => {
    console.log('[Watchdog] Engine exited code=' + code + ' signal=' + signal + ', restarting in 2s...');
    setTimeout(startEngine, 2000);
  });
  console.log('[Watchdog] Started engine PID=' + child.pid);
}

startEngine();
