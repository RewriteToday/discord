import { env } from '@/env';
import { GROQ_DEFAULT_MODEL } from '@/shared/ai/constants';
import type { GroqRequestResult } from '@/types/groq';
import { buildPrompt } from './prompt';
import {
	extractGroqApiError,
	extractGroqText,
	parseGroqAnswer,
} from './response';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_REQUEST_TIMEOUT_MS = 12000;

const parseRequestError = (error: unknown) =>
	error instanceof Error ? error.message : 'request_failed';

const requestGroqCompletion = async (
	question: string,
	reference: string,
	apiKey: string,
) =>
	fetch(GROQ_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
			temperature: 0.1,
			max_tokens: 320,
			messages: [
				{
					role: 'user',
					content: buildPrompt(reference, question),
				},
			],
		}),
		signal: AbortSignal.timeout(GROQ_REQUEST_TIMEOUT_MS),
	});

export const askWithGroq = async (
	question: string,
	reference: string,
	apiKey: string,
): Promise<GroqRequestResult> => {
	const response = await requestGroqCompletion(
		question,
		reference,
		apiKey,
	).catch((error) => error);

	if (!(response instanceof Response))
		return {
			rateLimited: false,
			error: parseRequestError(response),
		};

	const body = (await response.json().catch(() => null)) as unknown;

	if (!response.ok)
		return {
			rateLimited: response.status === 429,
			status: response.status,
			error: extractGroqApiError(body),
		};

	const text = extractGroqText(body);

	if (!text)
		return {
			rateLimited: false,
			status: response.status,
		};

	return {
		answer: parseGroqAnswer(text),
		rateLimited: false,
		status: response.status,
	};
};
