import { env } from '@/env';

let llmSpecPromise: Promise<string | undefined> | undefined;

const fallbackSpecUrls = [
	'https://rewritetoday.com/llm.txt',
	'https://www.rewritetoday.com/llm.txt',
	'https://rewritetoday.com/llms.txt',
	'https://www.rewritetoday.com/llms.txt',
];

const getSpecUrls = (): string[] => {
	const allUrls = [env.LLM_SPEC_URL, ...fallbackSpecUrls];
	return Array.from(new Set(allUrls.map((url) => url.trim()).filter(Boolean)));
};

const isHtmlDocument = (content: string): boolean => {
	const normalized = content.trimStart().toLowerCase();
	return (
		normalized.startsWith('<!doctype html') || normalized.startsWith('<html')
	);
};

const fetchLlmSpecFromUrl = async (
	url: string,
): Promise<string | undefined> => {
	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8',
			},
			signal: AbortSignal.timeout(7000),
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

const fetchLlmSpec = async (): Promise<string | undefined> => {
	for (const specUrl of getSpecUrls()) {
		const spec = await fetchLlmSpecFromUrl(specUrl);

		if (spec) {
			return spec;
		}
	}

	return undefined;
};

export const loadLlmSpec = async (): Promise<string | undefined> => {
	llmSpecPromise ??= fetchLlmSpec();

	const llmSpec = await llmSpecPromise;

	if (!llmSpec) {
		llmSpecPromise = undefined;
	}

	return llmSpec;
};
