import { AI_JOB_NAME } from '@/shared/ai/constants';
import type { AIQueueData } from '@/types/queue';
import { aiQueue } from '.';

const AI_JOB_RETENTION_OPTIONS = {
	removeOnComplete: 1000,
	removeOnFail: 1000,
} as const;

export const enqueueAiJob = (jobData: AIQueueData) =>
	aiQueue.add(AI_JOB_NAME, jobData, {
		jobId: jobData.replyMessageId,
		...AI_JOB_RETENTION_OPTIONS,
	});
