import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const cacheDir = path.resolve('bots/noti-bot/cache');
const cacheFile = path.join(cacheDir, 'threads.json');

function load() {
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(cacheFile)) {
    fs.writeFileSync(cacheFile, '{}', 'utf8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // caller handles logging
    throw e;
  }
}

export function hash(text) {
  return crypto.createHash('md5').update(text ?? '').digest('hex');
}

export function getCache() {
  return load();
}

export function setThread(threadId, data) {
  const cache = load();
  cache[threadId] = { ...data, lastUpdate: new Date().toISOString() };
  save(cache);
}

export function getThread(threadId) {
  const cache = load();
  return cache[threadId] ?? null;
}