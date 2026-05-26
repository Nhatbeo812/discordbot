// src/index.js
import 'dotenv/config';
import { createServer } from 'http';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands, loadEvents } from './handlers/loader.js';
import { logger } from './utils/logger.js';

// ── Validate biến môi trường bắt buộc ─────────────────────────────
const REQUIRED_ENV = [
  'DCBOT_TOKEN', 'DCBOT_CLIENT_ID', 'DCBOT_GUILD_ID',
  'DCBOT_ADMIN_REVIEW_CHANNEL_ID',
  'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[ERROR] Thieu bien moi truong: ${missing.join(', ')}`);
  process.exit(1);
}

// ── Khởi tạo Discord Client ───────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// ── HTTP Keep-alive server ──────────────────────────────────────────────────
// Sau khai bao client (tranh temporal dead zone), truoc client.login()
const PORT = process.env.PORT || 10000;
createServer((req, res) => {
  const isReady = client.isReady();
  if (req.url === '/health') {
    res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status:  isReady ? 'ok' : 'starting',
      gateway: isReady ? 'connected' : 'disconnected',
      uptime:  process.uptime(),
      tag:     isReady ? client.user?.tag : null,
    }));
  } else {
    res.writeHead(isReady ? 200 : 503);
    res.end(isReady ? 'Bot is alive!' : 'Bot is starting...');
  }
}).listen(PORT, '0.0.0.0', () => {
  logger.info(`HTTP keep-alive server dang chay tren port ${PORT}`);
});

await loadCommands(client);
await loadEvents(client);

// [FIX #4] Export client de interactionCreate kiem tra isReady() truoc khi xu ly
// Neu cold start: bot login chua xong ma interaction den -> reply ngay, tranh timeout
export { client };

process.on('unhandledRejection', err => logger.error('Unhandled Rejection:', err));
process.on('uncaughtException',  err => { logger.error('Uncaught Exception:', err); process.exit(1); });

logger.info('Đang kết nối tới Discord...');
await client.login(process.env.DCBOT_TOKEN);
