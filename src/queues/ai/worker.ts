import { Worker } from 'bullmq';
import { redisConnection } from '@/queues/redis';
import { type AI_JOB_NAME, AI_QUEUE_NAME, type AiJobData } from '@/types/queue';
import { processAiJobData } from './process';

export const worker = new Worker<AiJobData, void, typeof AI_JOB_NAME>(
	AI_QUEUE_NAME,
	async ({ data }) => {
		await processAiJobData(data);
	},
	{
		connection: redisConnection,
		concurrency: 10,
		limiter: {
			max: 50,
			duration: 1000,
		},
		skipWaitingForReady: true,
		skipVersionCheck: true,
	},
);
