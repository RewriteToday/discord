import { ActionRow, Button, createEvent } from 'seyfert';
import { ButtonStyle } from 'seyfert/lib/types';
import { enqueueAiJob } from '@/queues/ai/enqueue';
import { getQuestionContent, isClientMention } from '@/shared/messages';
import { THINKING_MESSAGE } from '@/shared/style/responses';
import { appURL } from '@/shared/url';

export default createEvent({
	data: { name: 'messageCreate' },
	async run(message) {
		if (!isClientMention(message)) return;

		const question = getQuestionContent(message);

		if (!question)
			return message.reply({
				allowed_mentions: { parse: [] },
				content: `Hey ${message.author}, you can mention me and ask me a question.`,
				components: [
					new ActionRow<Button>().setComponents([
						new Button()
							.setLabel('Go to website')
							.setStyle(ButtonStyle.Link)
							.setURL(appURL({ subdomain: 'www' })),
						new Button()
							.setLabel('Go to dashboard')
							.setStyle(ButtonStyle.Link)
							.setURL(appURL({ subdomain: 'dash' })),
					]),
				],
			});

		const reply = await message.reply({
			content: THINKING_MESSAGE,
		});

		await enqueueAiJob({
			question,
			guildId: message.guildId,
			replyMessageId: reply.id,
			authorId: message.author.id,
			channelId: message.channelId,
		});
	},
});
