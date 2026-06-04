export async function sendNewThread(channel, data) {
  await channel.send([
    `📢 **BÀI VIẾT MỚI**`,
    ``,
    `**Diễn đàn:** ${data.forumName}`,
    `**Người tạo:** ${data.author}`,
    `**Tiêu đề:** ${data.title}`,
    `**Tóm tắt:** ${data.summary}`,
    `🔗 ${data.url}`,
  ].join('\n'));
}

export async function sendUpdatedThread(channel, data) {
  await channel.send([
    `📝 **BÀI VIẾT ĐƯỢC CẬP NHẬT**`,
    ``,
    `**Diễn đàn:** ${data.forumName}`,
    `**Người tạo:** ${data.author}`,
    `**Tiêu đề:** ${data.title}`,
    `**Nội dung mới:** ${data.newSummary}`,
    `🔗 ${data.url}`,
  ].join('\n'));
}