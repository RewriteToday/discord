import { env } from '@/env';
import type { GroqRequestResult } from '@/types/groq';
import { askWithGroq } from './client';
import { buildFocusedReference } from './reference';

const QUOTA_EXCEEDED_REPLY = 'We cannot answer this for now, try again later.';

const configuredGroqApiKeys = Array.from(
	new Set([
		env.GROQ_API_KEY,
		...env.GROQ_FALLBACK_API_KEYS.map((value) => value.trim()).filter(Boolean),
	]),
);

const groqState = {
	apiKeyCursor: 0,
};

const isQuotaExceeded = (result: GroqRequestResult) => {
	if (result.status !== 429) return false;

	const normalizedError = result.error?.toLowerCase() ?? '';

	return (
		normalizedError.includes('quota') ||
		normalizedError.includes('billing') ||
		normalizedError.includes('rate limit')
	);
};

const listAttemptKeyIndexes = () => {
	if (configuredGroqApiKeys.length === 0) return [];

	return configuredGroqApiKeys.map(
		(_, offset) =>
			(groqState.apiKeyCursor + offset) % configuredGroqApiKeys.length,
	);
};

const shouldRotateApiKey = (result: GroqRequestResult) =>
	result.rateLimited || isQuotaExceeded(result);

const allResultsAreRateLimited = (results: GroqRequestResult[]) =>
	results.length > 0 &&
	results.every((result) => result.rateLimited || isQuotaExceeded(result));

export const askGroqWithReference = async (
	question: string,
	reference: string,
) => {
	if (configuredGroqApiKeys.length === 0) return;

	const preparedReference = buildFocusedReference(question, reference);
	const results: GroqRequestResult[] = [];

	for (const keyIndex of listAttemptKeyIndexes()) {
		const apiKey = configuredGroqApiKeys[keyIndex];

		if (!apiKey) continue;

		const result = await askWithGroq(question, preparedReference, apiKey);
		results.push(result);

		if (result.answer) {
			groqState.apiKeyCursor = (keyIndex + 1) % configuredGroqApiKeys.length;
			return result.answer;
		}

		if (shouldRotateApiKey(result)) {
			groqState.apiKeyCursor = (keyIndex + 1) % configuredGroqApiKeys.length;
			continue;
		}

		break;
	}

	if (allResultsAreRateLimited(results)) return QUOTA_EXCEEDED_REPLY;

	return;
};
