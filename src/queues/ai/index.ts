import { Queue } from 'bullmq';
import { redisConnection } from '@/queues/redis';
import { AI_QUEUE_NAME } from '@/shared/ai/constants';
import type { AIQueueData } from '@/types/queue';

export const aiQueue = new Queue<AIQueueData, void>(AI_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: {
		removeOnComplete: {
			count: 5000,
			age: 60 * 60,
		},
		removeOnFail: {
			age: 24 * 60 * 60,
		},
		attempts: 3,
		backoff: {
			delay: 3000,
			type: 'exponential',
		},
		lifo: false,
	},
	skipWaitingForReady: true,
	skipVersionCheck: true,
});
