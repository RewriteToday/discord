import { ActionRow, Button, createEvent } from 'seyfert';
import { ButtonStyle } from 'seyfert/lib/types';
import { aiQueue } from '@/queues';
import { processAiJobData, updateReply } from '@/queues/ai/process';
import { isExpectedRedisError } from '@/queues/redis';
import { AI_JOB_NAME, type AiJobData } from '@/types/queue';

const WEBSITE_URL = 'https://www.rewritetoday.com/';
const THINKING_MESSAGE = 'We are currently thinking about your question...';
const PROCESSING_ERROR_MESSAGE =
	'Sorry, we could not process your question right now. Please try again.';

const queueJob = async (jobData: AiJobData): Promise<void> => {
	await aiQueue.add(AI_JOB_NAME, jobData, {
		jobId: jobData.replyMessageId,
		removeOnComplete: 1000,
		removeOnFail: 1000,
	});
};

const updateReplySafely = async (
	jobData: AiJobData,
	body: Parameters<typeof updateReply>[1],
): Promise<void> => {
	try {
		await updateReply(jobData, body);
	} catch {}
};

const processQuestionDirectly = async (jobData: AiJobData): Promise<void> => {
	try {
		await processAiJobData(jobData);
	} catch {
		await updateReplySafely(jobData, {
			content: PROCESSING_ERROR_MESSAGE,
		});
	}
};

export default createEvent({
	data: { name: 'messageCreate' },
	async run(message, client) {
		const { content } = message;
		const clientMention = `<@${client.me.id}>`;

		if (!content.startsWith(clientMention)) return;

		const question = content.slice(clientMention.length).trim();

		if (!question) {
			await message.reply({
				allowed_mentions: { parse: [] },
				content: `Hey ${message.author}, you can mention me and ask me a question.`,
				components: [
					new ActionRow<Button>().setComponents([
						new Button()
							.setLabel('Go to website')
							.setStyle(ButtonStyle.Link)
							.setURL(WEBSITE_URL),
					]),
				],
			});

			return;
		}

		const reply = await message.reply({
			content: THINKING_MESSAGE,
		});

		const jobData: AiJobData = {
			authorId: message.author.id,
			channelId: message.channelId,
			guildId: message.guildId,
			question,
			replyMessageId: reply.id,
		};

		try {
			await queueJob(jobData);
		} catch (error) {
			if (isExpectedRedisError(error)) {
				client.logger.warn('<AiQueue>.add using direct fallback');
			} else {
				client.logger.warn('<AiQueue>.add', error);
			}

			await processQuestionDirectly(jobData);
		}
	},
});
