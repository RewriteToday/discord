import { env } from '@/env';

let llmSpecPromise: Promise<string | undefined> | undefined;

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
	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8',
			},
			signal: AbortSignal.timeout(SPEC_FETCH_TIMEOUT_MS),
		});

		if (!response.ok) {
			return undefined;
		}

		const text = await response.text();
		const normalized = text.trim();

		if (!normalized || isHtmlDocument(normalized)) {
			return undefined;
		}

		return normalized;
	} catch {
		return undefined;
	}
};

const fetchLlmSpec = async () => {
	for (const specUrl of specUrls) {
		const spec = await fetchLlmSpecFromUrl(specUrl);

		if (spec) {
			return spec;
		}
	}

	return undefined;
};

export const loadLlmSpec = async () => {
	llmSpecPromise ??= fetchLlmSpec();

	const llmSpec = await llmSpecPromise;

	if (!llmSpec) {
		llmSpecPromise = undefined;
	}

	return llmSpec;
};
