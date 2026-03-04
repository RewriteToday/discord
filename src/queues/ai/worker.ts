import { Worker } from 'bullmq';
import { redisConnection } from '@/queues/redis';
import { AI_QUEUE_NAME } from '@/shared/ai/constants';
import type { AIQueueData } from '@/types/queue';
import { processAIQueueData } from './process';

export const worker = new Worker<AIQueueData, void>(
	AI_QUEUE_NAME,
	async ({ data }) => {
		await processAIQueueData(data);
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
