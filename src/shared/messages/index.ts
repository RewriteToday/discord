import type { Message } from 'seyfert';

export const isClientMention = (message: Message) => {
	const CLIENT_MENTION = `<@${message.client.me.id}>`;

	return message.content.trim().startsWith(CLIENT_MENTION);
};

export const getQuestionContent = (message: Message) => {
	const { referencedMessage } = message;

	if (
		referencedMessage &&
		!referencedMessage.webhookId &&
		!referencedMessage.author.bot
	)
		return referencedMessage.content.trim();

	const CLIENT_MENTION = `<@${message.client.me.id}>`;

	return message.content.trim().slice(CLIENT_MENTION.length);
};
