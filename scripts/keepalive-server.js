// Wrapper that keeps the server alive by preventing silent exit
const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  const child = spawn(process.execPath, [
    path.join('/home/z/my-project/.next/standalone/server.js')
  ], {
    cwd: '/home/z/my-project/.next/standalone',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=512',
      NODE_ENV: 'production'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => process.stdout.write(data));
  child.stderr.on('data', (data) => process.stderr.write(data));
  
  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 1s...`);
    setTimeout(startServer, 1000);
  });

  child.on('error', (err) => {
    console.error('Server error:', err);
    setTimeout(startServer, 1000);
  });

  // Keep this process alive by writing to stdout periodically
  const heartbeat = setInterval(() => {
    try {
      if (child.exitCode === null) {
        process.stdout.write('.');
      }
    } catch(e) {
      clearInterval(heartbeat);
    }
  }, 5000);
}

startServer();
