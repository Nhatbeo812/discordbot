import 'dotenv/config';

export const config = {
  token: process.env.NOTIBOT_TOKEN,
  clientId: process.env.NOTIBOT_CLIENT_ID,
  guildId: process.env.NOTIBOT_GUILD_ID,
  chatChannelId: process.env.NOTIBOT_CHAT_CHANNEL_ID,
  forumIds: [
    process.env.NOTIBOT_FORUM_1_ID,
    process.env.NOTIBOT_FORUM_2_ID,
  ].filter(Boolean),
};