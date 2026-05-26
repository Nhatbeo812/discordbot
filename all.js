import { spawn } from 'child_process';
import { resolve } from 'path';

const bots = [
  { name: 'dcbot', script: 'bots/dcbot/src/index.js' },
];

console.log('=== Starting all bots ===');

const children = bots.map(({ name, script }) => {
  const child = spawn(process.execPath, [resolve(script)], {
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    cwd: process.cwd(),
  });

  child.on('message', (message) => {
    if (message?.type === 'stop-bot') {
      console.log(`\n[${name}] requested stop-bot (source=${message.source}, user=${message.userId})`);
      shutdown(`stop-bot from ${message.source}`);
    }
  });

  child.on('exit', (code, signal) => {
    console.log(`\n[${name}] exited with code=${code} signal=${signal}`);
  });

  child.on('error', (error) => {
    console.error(`[${name}] error:`, error);
  });

  return { name, child };
});

const shutdown = (signal) => {
  console.log(`\nReceived ${signal}, stopping bots...`);
  for (const { name, child } of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
      console.log(`[${name}] stopped`);
    }
  }
  process.exit(0);
};