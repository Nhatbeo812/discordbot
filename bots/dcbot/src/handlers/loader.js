// src/handlers/loader.js
// Tự động quét và load toàn bộ commands + events từ thư mục

import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load tất cả slash commands từ src/commands/ */
export async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = resolve(__dirname, '../commands');
  const files = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(resolve(commandsPath, file)).href;
    const { default: command } = await import(filePath);

    if (!command?.data || !command?.execute) {
      logger.warn(`[Loader] Bỏ qua ${file}: thiếu data hoặc execute`);
      continue;
    }

    client.commands.set(command.data.name, command);
    logger.info(`[Loader] Đã load command: /${command.data.name}`);
  }

  logger.ok(`[Loader] Tổng cộng ${client.commands.size} command đã được load`);
}

/** Load tất cả event listeners từ src/events/ */
export async function loadEvents(client) {
  const eventsPath = resolve(__dirname, '../events');
  const files = readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(resolve(eventsPath, file)).href;
    const { default: event } = await import(filePath);

    if (!event?.name || !event?.execute) {
      logger.warn(`[Loader] Bỏ qua event ${file}: thiếu name hoặc execute`);
      continue;
    }

    const handler = (...args) => event.execute(...args, client);

    if (event.once) {
      client.once(event.name, handler);
    } else {
      client.on(event.name, handler);
    }

    logger.info(`[Loader] Đã bind event: ${event.name} (once: ${!!event.once})`);
  }
}
