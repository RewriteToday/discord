import { client } from '@/client';
import type { AIQueueData } from '@/types/queue';

const toInteractionUpdateBody = (
	body: Parameters<typeof client.messages.edit>[2],
): Parameters<typeof client.interactions.editOriginal>[1] => {
	const { flags, ...rest } = body;

	if (flags == null)
		return rest as Parameters<typeof client.interactions.editOriginal>[1];

	return {
		...rest,
		flags,
	} as Parameters<typeof client.interactions.editOriginal>[1];
};

export const updateReply = async (
	job: AIQueueData,
	body: Parameters<typeof client.messages.edit>[2],
) => {
	if (job.isInteraction && job.interactionToken) {
		await client.interactions.editOriginal(
			job.interactionToken,
			toInteractionUpdateBody(body),
		);
		return;
	}

	await client.messages.edit(job.replyMessageId, job.channelId, body);
};
