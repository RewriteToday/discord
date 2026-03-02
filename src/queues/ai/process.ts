import { ActionRow, Button } from 'seyfert';
import { ButtonStyle, ChannelType } from 'seyfert/lib/types';
import { client } from '@/client';
import { ask } from '@/shared/ai';
import type { AiJobData } from '@/types/queue';

const OPEN_TICKET_CUSTOM_ID = 'open_ticket';

export const updateReply = async (
	job: AiJobData,
	body: Parameters<typeof client.messages.edit>[2],
) => {
	await client.messages.edit(job.replyMessageId, job.channelId, body);
};

const registerTicketCollector = (job: AiJobData): void => {
	if (!job.guildId) return;

	const collector = client.components.createComponentCollector(
		job.replyMessageId,
		job.channelId,
		job.guildId,
		{
			timeout: 60000,
			filter: (interaction) => interaction.customId === OPEN_TICKET_CUSTOM_ID,
		},
	);

	collector.run(OPEN_TICKET_CUSTOM_ID, async (interaction) => {
		const channel = await client.guilds.channels.create(job.guildId!, {
			type: ChannelType.GuildText,
			name: `ticket-${job.authorId}`,
		});

		await Promise.all([
			interaction.write({
				content: `Your ticket has been opened. You can view it here ${channel}`,
			}),
			updateReply(job, {
				components: [],
			}),
		]);

		collector.stop();
	});
};

export const handleUnknownAnswer = async (job: AiJobData): Promise<void> => {
	if (!job.guildId) {
		await updateReply(job, {
			content: 'Sorry, we could not think of an answer.',
		});

		return;
	}

	await updateReply(job, {
		components: [
			new ActionRow<Button>().setComponents([
				new Button()
					.setLabel('Open a ticket')
					.setCustomId(OPEN_TICKET_CUSTOM_ID)
					.setStyle(ButtonStyle.Secondary),
			]),
		],
		content:
			'Sorry, we could not think of an answer. You can open a ticket anyway',
	});

	registerTicketCollector(job);
};

export const processAiJobData = async (job: AiJobData): Promise<void> => {
	const response = await ask(job.question);

	if (!response) {
		await handleUnknownAnswer(job);
		return;
	}

	await updateReply(job, {
		content: response,
	});
};
