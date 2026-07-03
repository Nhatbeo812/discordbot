import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { registerForumWatcher } from './forumWatcher.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', async () => {
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) {
    logger.error('Guild không tồn tại. Dừng bot.');
    process.exit(1);
  }

  logger.info(`Bot đã kết nối thành công`);
  logger.info(`Guild: ${guild.name}`);
  logger.info(`Forum đang theo dõi: ${config.forumIds.length}`);

  registerForumWatcher(client, config);
});

client.on('error', (e) => {
  logger.error(`Discord API Error: ${e.message}`);
});

client.login(config.token).catch((e) => {
  logger.error(`Login thất bại: ${e.message}`);
  process.exit(1);
});
