import { setInterval as sleep } from 'node:timers/promises';
import { ActionRow, Button } from 'seyfert';
import {
	ButtonStyle,
	ChannelType,
	MessageFlags,
} from 'seyfert/lib/types/index.js';
import { client } from '@/client';
import { env } from '@/env';
import type { AIQueueData } from '@/types/queue';
import { updateReply } from './reply';

const OPEN_TICKET_CUSTOM_ID = 'open_ticket';
const TEAM_ROLE_ID = '1477343596763025532';
const TICKET_CATEGORY_ID = '1478093098465759342';

const createOpenTicketButton = () =>
	new ActionRow<Button>().setComponents([
		new Button()
			.setLabel('Open a ticket')
			.setCustomId(OPEN_TICKET_CUSTOM_ID)
			.setStyle(ButtonStyle.Secondary),
	]);

const createCloseTicketButton = (customId: string) =>
	new ActionRow<Button>().setComponents([
		new Button()
			.setStyle(ButtonStyle.Secondary)
			.setCustomId(customId)
			.setLabel('Close your ticket'),
	]);

const registerTicketCollector = (job: AIQueueData) => {
	const { guildId } = job;

	if (!guildId) return;

	const collector = client.components.createComponentCollector(
		job.replyMessageId,
		job.channelId,
		guildId,
		{
			timeout: 60000,
			filter: (interaction) => interaction.customId === OPEN_TICKET_CUSTOM_ID,
		},
	);

	collector.run(OPEN_TICKET_CUSTOM_ID, async (interaction) => {
		const channel = await client.guilds.channels.create(guildId, {
			type: ChannelType.GuildText,
			name: `ticket-${job.authorId}`,
			parent_id: TICKET_CATEGORY_ID,
		});

		const closeTicketButtonCustomId = `close_ticket_${job.authorId}`;

		const [ticketMessage] = await Promise.all([
			channel.messages.write({
				components: [createCloseTicketButton(closeTicketButtonCustomId)],
				content: `Hey <@&${TEAM_ROLE_ID}>, the user ${interaction.user} has opened this ticket.`,
			}),
			interaction.write({
				flags: MessageFlags.Ephemeral,
				content: `Your ticket has been opened. You can view it here ${channel}`,
			}),
			updateReply(job, {
				components: [],
			}),
		]);

		const ticketCollector = ticketMessage.createComponentCollector({
			filter: (ticketInteraction) =>
				ticketInteraction.user.id === job.authorId ||
				env.TEAM_MEMBERS_ID.includes(ticketInteraction.user.id),
		});

		ticketCollector.run(
			closeTicketButtonCustomId,
			async (ticketInteraction) => {
				await Promise.all([
					ticketMessage.edit({
						components: [],
					}),
					ticketInteraction.write({
						content: `<@${job.authorId}> closed this ticket (Waiting for 5s before deleting ${ticketInteraction.channel})`,
					}),
				]);

				ticketCollector.stop();

				await sleep(5000);
				await ticketInteraction.channel.delete();
			},
		);

		collector.stop();
	});
};

export const handleUnknownAnswer = async (job: AIQueueData) => {
	if (!job.guildId) {
		await updateReply(job, {
			content: 'Sorry, we could not think of an answer.',
		});

		return;
	}

	await updateReply(job, {
		components: [createOpenTicketButton()],
		content:
			'Sorry, we could not think of an answer. You can open a ticket anyway',
	});

	registerTicketCollector(job);
};
