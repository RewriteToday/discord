import type { ConnectionOptions } from 'bullmq';
import { env } from '@/env';

export const redisConnection: ConnectionOptions = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
};

const expectedRedisErrorCodes = new Set([
	'ECONNREFUSED',
	'EAI_AGAIN',
	'ENOTFOUND',
]);

const expectedRedisErrorMessages = [
	'connection is closed',
	'connect econnrefused',
	'noauth',
	'wrongpass',
];

const getErrorMessage = (error: unknown) => {
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;

	if (error && typeof error === 'object' && 'message' in error) {
		const { message } = error as { message?: unknown };

		if (typeof message === 'string') return message;
	}

	return undefined;
};

const getErrorCode = (error: unknown) => {
	if (!error || typeof error !== 'object' || !('code' in error)) {
		return undefined;
	}

	const { code } = error as { code?: unknown };

	return typeof code === 'string' ? code : undefined;
};

export const isExpectedRedisError = (error: unknown) => {
	const code = getErrorCode(error);

	if (code && expectedRedisErrorCodes.has(code)) {
		return true;
	}

	const message = getErrorMessage(error)?.toLowerCase();

	if (!message) {
		return false;
	}

	return expectedRedisErrorMessages.some((fragment) =>
		message.includes(fragment),
	);
};
