import fs from 'fs';
import path from 'path';

const logsDir = path.resolve('bots/noti-bot/logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function getLogPath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `${date}.log`);
}

function write(level, message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}\n`;
  process.stdout.write(line);
  fs.appendFileSync(getLogPath(), line, 'utf8');
}

export const logger = {
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARNING', msg),
  error: (msg) => write('ERROR', msg),
  newThread: (data) => write('NEW_THREAD',
    `Forum=${data.forumName} | Thread=${data.threadId} | Author=${data.author} | Title=${data.title}`),
  updated: (data) => write('THREAD_UPDATED',
    `Forum=${data.forumName} | Thread=${data.threadId}`),
};