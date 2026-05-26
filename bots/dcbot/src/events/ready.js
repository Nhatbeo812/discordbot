// src/events/ready.js
import { logger } from '../utils/logger.js';

export default {
  name: 'clientReady',
  once: true,

  execute(client) {
    logger.ok(`Bot da online: ${client.user.tag}`);
    logger.ok(`He thong xac thuc ho so -- Lien Hiep Quit da san sang.`);
    client.user.setActivity('Xac thuc ho so thanh vien', { type: 3 }); // WATCHING

    // [FIX #2] Gateway disconnect/reconnect monitor
    // Discord.js tu dong reconnect, nhung can log ro de biet bot co bi drop gateway khong
    // Khi bot 'xanh' tren Discord nhung khong phan hoi -> kiem tra log nay truoc tien
    client.on('shardDisconnect', (event, shardId) => {
      logger.warn(`[Gateway] Shard ${shardId} bi disconnect (code: ${event.code}). Discord.js se tu dong reconnect...`);
    });

    client.on('shardReconnecting', shardId => {
      logger.warn(`[Gateway] Shard ${shardId} dang reconnect...`);
    });

    client.on('shardResume', (shardId, replayedEvents) => {
      logger.ok(`[Gateway] Shard ${shardId} da reconnect thanh cong. Replayed ${replayedEvents} events.`);
    });

    client.on('shardError', (error, shardId) => {
      logger.error(`[Gateway] Shard ${shardId} loi WebSocket:`, error.message);
    });
  },
};
