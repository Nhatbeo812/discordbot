// src/deploy-commands.js
// Chạy một lần để đăng ký slash commands lên Discord (Guild scope)
// Chạy từ thư mục dcbot: node src/deploy-commands.js

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env từ Root (2 cấp lên từ src/)
config({ path: resolve(__dirname, '../../../.env') });

// Kiểm tra token và guild ID
if (!process.env.DCBOT_TOKEN || !process.env.DCBOT_CLIENT_ID || !process.env.DCBOT_GUILD_ID) {
  console.error('❌ Thiếu DCBOT_TOKEN / DCBOT_CLIENT_ID / DCBOT_GUILD_ID trong .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DCBOT_TOKEN);

// Thu thập tất cả command data
const commandsPath = resolve(__dirname, 'commands');
const files        = readdirSync(commandsPath).filter(f => f.endsWith('.js'));
const commandData  = [];

for (const file of files) {
  const filePath = pathToFileURL(resolve(commandsPath, file)).href;
  const { default: command } = await import(filePath);
  if (command?.data) {
    commandData.push(command.data.toJSON());
    console.log(`✅ Đã đọc command: /${command.data.name}`);
  }
}

console.log(`\n📤 Đang deploy ${commandData.length} lệnh lên guild ${process.env.DCBOT_GUILD_ID}...`);

try {
  await rest.put(
    Routes.applicationGuildCommands(process.env.DCBOT_CLIENT_ID, process.env.DCBOT_GUILD_ID),
    { body: commandData },
  );
  console.log('✅ Deploy thành công! Gõ / trong Discord để thấy các lệnh.');
} catch (err) {
  console.error('❌ Deploy thất bại:', err.message);
}
