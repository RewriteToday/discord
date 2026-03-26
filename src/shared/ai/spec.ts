import { env } from '@/env';

const llmSpecState: {
	promise?: Promise<string | undefined>;
} = {};

const SPEC_FETCH_TIMEOUT_MS = 7000;

const fallbackSpecUrls = [
	'https://rewritetoday.com/llms.txt',
	'https://www.rewritetoday.com/llms.txt',
];

const specUrls = Array.from(
	new Set([env.LLM_SPEC_URL, ...fallbackSpecUrls].map((url) => url.trim())),
).filter(Boolean);

const isHtmlDocument = (content: string) => {
	const normalized = content.trimStart().toLowerCase();

	return (
		normalized.startsWith('<!doctype html') || normalized.startsWith('<html')
	);
};

const fetchLlmSpecFromUrl = async (url: string) => {
	const response = await fetch(url, {
		headers: {
			Accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8',
		},
		signal: AbortSignal.timeout(SPEC_FETCH_TIMEOUT_MS),
	}).catch(() => null);

	if (!response?.ok) return;

	const text = await response.text().catch(() => '');

	const normalized = text.trim();

	if (!normalized || isHtmlDocument(normalized)) return;

	return normalized;
};

const fetchLlmSpec = async () => {
	for (const specUrl of specUrls) {
		const spec = await fetchLlmSpecFromUrl(specUrl);

		if (spec) return spec;
	}

	return;
};

export const loadLlmSpec = async () => {
	llmSpecState.promise ??= fetchLlmSpec();

	const llmSpec = await llmSpecState.promise;

	if (!llmSpec) {
		llmSpecState.promise = undefined;
		return;
	}

	return llmSpec;
};
