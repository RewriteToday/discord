export const AI_QUEUE_NAME = 'ai-questions';
export const AI_JOB_NAME = 'answer-question';

export type AiJobData = {
	authorId: string;
	channelId: string;
	guildId?: string;
	question: string;
	replyMessageId: string;
};
