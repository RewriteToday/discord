export interface AIQueueData {
	authorId: string;
	channelId: string;
	guildId?: string;
	interactionToken?: string;
	question: string;
	replyMessageId: string;
	isInteraction?: true;
}
