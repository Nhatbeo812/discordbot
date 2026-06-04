import { hash, getThread, setThread } from './cacheManager.js';
import { sendNewThread, sendUpdatedThread } from './notifier.js';
import { logger } from './logger.js';

function summarize(text, limit = 200) {
  if (!text) return '(không có nội dung)';
  return text.length > limit ? text.slice(0, limit) + '...' : text;
}

export function registerForumWatcher(client, config) {
  const forumSet = new Set(config.forumIds);

  // ── BÀI VIẾT MỚI ──────────────────────────────────────
  client.on('threadCreate', async (thread) => {
    if (!forumSet.has(thread.parentId)) return;

    try {
      const messages = await thread.messages.fetch({ limit: 1 });
      const firstMsg = messages.first();
      const content = firstMsg?.content ?? '';
      const author = firstMsg?.author?.username ?? thread.ownerId;
      const summary = summarize(content);
      const forumName = thread.parent?.name ?? thread.parentId;

      logger.newThread({
        forumName,
        threadId: thread.id,
        author,
        title: thread.name,
      });

      setThread(thread.id, {
        threadName: thread.name,
        messageId: firstMsg?.id ?? '',
        lastHash: hash(content),
      });

      const chatChannel = await client.channels.fetch(config.chatChannelId);
      await sendNewThread(chatChannel, {
        forumName,
        author,
        title: thread.name,
        summary,
        url: `https://discord.com/channels/${config.guildId}/${thread.id}`,
      });
    } catch (e) {
      logger.error(`threadCreate error: ${e.message}`);
    }
  });

  // ── CẬP NHẬT BÀI VIẾT ─────────────────────────────────
  client.on('messageUpdate', async (oldMsg, newMsg) => {
    const thread = newMsg.channel;
    if (!thread?.isThread?.()) return;
    if (!forumSet.has(thread.parentId)) return;

    try {
      const cached = getThread(thread.id);
      if (!cached) return; // thread chưa có trong cache → bỏ qua

      // Chỉ theo dõi message đầu tiên (first post)
      if (cached.messageId && newMsg.id !== cached.messageId) return;

      const newContent = newMsg.content ?? '';
      const newHash = hash(newContent);

      if (newHash === cached.lastHash) return; // không thay đổi

      const author = newMsg.author?.username ?? '?';
      const forumName = thread.parent?.name ?? thread.parentId;
      const newSummary = summarize(newContent);

      logger.updated({ forumName, threadId: thread.id });

      setThread(thread.id, {
        ...cached,
        lastHash: newHash,
      });

      const chatChannel = await client.channels.fetch(config.chatChannelId);
      await sendUpdatedThread(chatChannel, {
        forumName,
        author,
        title: thread.name,
        newSummary,
        url: `https://discord.com/channels/${config.guildId}/${thread.id}`,
      });
    } catch (e) {
      logger.error(`messageUpdate error: ${e.message}`);
    }
  });
}