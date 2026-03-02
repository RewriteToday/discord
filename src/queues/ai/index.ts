import { Queue } from 'bullmq';
import { isExpectedRedisError, redisConnection } from '@/queues/redis';
import { type AI_JOB_NAME, AI_QUEUE_NAME, type AiJobData } from '@/types/queue';

export const aiQueue = new Queue<AiJobData, void, typeof AI_JOB_NAME>(
	AI_QUEUE_NAME,
	{
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
	},
);

aiQueue.on('error', (error) => {
	if (!isExpectedRedisError(error)) {
		console.error(error);
	}
});
