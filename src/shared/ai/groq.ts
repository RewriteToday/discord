import { env } from '../../env';
import { GROQ_DEFAULT_MODEL, UNKNOWN_ANSWER } from './constants';

type GroqRequestResult = {
	answer?: string;
	error?: string;
	rateLimited: boolean;
	status?: number;
};

const MAX_REFERENCE_CHARS = 12000;
const QUOTA_EXCEEDED_REPLY = 'We cannot answer this for now, try again later.';

const normalize = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();

const tokenize = (value: string): string[] =>
	normalize(value)
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length >= 3);

const stopWords = new Set([
	'about',
	'api',
	'como',
	'com',
	'create',
	'criar',
	'das',
	'de',
	'del',
	'dos',
	'endpoint',
	'example',
	'exemplo',
	'fetch',
	'for',
	'from',
	'how',
	'integrar',
	'integration',
	'node',
	'nodejs',
	'para',
	'por',
	'pra',
	'que',
	'rewrite',
	'sobre',
	'the',
	'uma',
	'with',
]);

const sectionHeadingRegex = /^#{1,4}\s+/;

const splitSections = (reference: string): string[] => {
	const lines = reference.split('\n');
	const sections: string[] = [];
	let currentSection: string[] = [];

	for (const line of lines) {
		if (sectionHeadingRegex.test(line) && currentSection.length) {
			sections.push(currentSection.join('\n'));
			currentSection = [line];
			continue;
		}

		currentSection.push(line);
	}

	if (currentSection.length) {
		sections.push(currentSection.join('\n'));
	}

	return sections;
};

const scoreSection = (section: string, questionTokens: Set<string>): number => {
	const normalizedSection = normalize(section);
	let score = 0;

	for (const token of questionTokens) {
		if (normalizedSection.includes(token)) {
			score += 1;
		}
	}

	return score;
};

const buildFocusedReference = (question: string, reference: string): string => {
	if (reference.length <= MAX_REFERENCE_CHARS) {
		return reference;
	}

	const questionTokens = new Set(
		tokenize(question).filter((token) => !stopWords.has(token)),
	);

	const sections = splitSections(reference);

	if (!sections.length) {
		return reference.slice(0, MAX_REFERENCE_CHARS);
	}

	const scoredSections = sections
		.map((section, index) => ({
			index,
			score: scoreSection(section, questionTokens),
			section,
		}))
		.filter((item) => item.score > 0)
		.sort(
			(left, right) => right.score - left.score || left.index - right.index,
		);

	const selected: string[] = [];
	let totalChars = 0;

	const appendSection = (section: string): void => {
		if (totalChars >= MAX_REFERENCE_CHARS) return;

		const remainingChars = MAX_REFERENCE_CHARS - totalChars;
		const normalizedSection = section.trim();

		if (!normalizedSection) return;

		if (normalizedSection.length <= remainingChars) {
			selected.push(normalizedSection);
			totalChars += normalizedSection.length;
			return;
		}

		selected.push(normalizedSection.slice(0, remainingChars));
		totalChars += remainingChars;
	};

	appendSection(sections[0] ?? '');

	for (const item of scoredSections) {
		if (totalChars >= MAX_REFERENCE_CHARS) break;
		appendSection(item.section);
	}

	if (!selected.length || selected.join('\n\n').length < 2000) {
		return reference.slice(0, MAX_REFERENCE_CHARS);
	}

	return selected.join('\n\n');
};

type OuterFence = {
	language: string;
	payload: string;
};

const extractOuterFence = (value: string): OuterFence | undefined => {
	const fenceMatch = value.match(/^```([^\n`]*)\n?([\s\S]*?)\n?```$/);

	if (!fenceMatch) {
		return undefined;
	}

	return {
		language: (fenceMatch[1] ?? '').trim().toLowerCase(),
		payload: (fenceMatch[2] ?? '').trim(),
	};
};

const parseJsonAnswer = (value: string): string | undefined => {
	try {
		const parsed = JSON.parse(value) as { answer?: unknown };

		if (typeof parsed.answer !== 'string') {
			return undefined;
		}

		const answer = parsed.answer.trim();

		return answer || undefined;
	} catch {
		return undefined;
	}
};

const escapedCharacterMap: Record<string, string> = {
	'"': '"',
	'\\': '\\',
	'/': '/',
	b: '\b',
	f: '\f',
	n: '\n',
	r: '\r',
	t: '\t',
};

const decodeEscapedCharacters = (value: string): string =>
	value
		.replace(/\\u([0-9a-fA-F]{4})/g, (_match, code) =>
			String.fromCharCode(Number.parseInt(code, 16)),
		)
		.replace(/\\([\\/"bfnrt])/g, (_match, escaped) => {
			const replacement = escapedCharacterMap[escaped];
			return replacement ?? escaped;
		});

const extractAnswerFromJsonLike = (value: string): string | undefined => {
	const keyMatch = value.match(/"answer"\s*:\s*"/);

	if (!keyMatch) {
		return undefined;
	}

	let cursor = keyMatch.index! + keyMatch[0].length;
	let answer = '';

	while (cursor < value.length) {
		const char = value[cursor];

		if (char === '\\') {
			const nextChar = value[cursor + 1];

			if (!nextChar) {
				answer += char;
				cursor += 1;
				continue;
			}

			answer += `\\${nextChar}`;
			cursor += 2;
			continue;
		}

		if (char === '"') {
			const remainder = value.slice(cursor + 1);

			if (/^\s*[,}]/.test(remainder)) {
				const decoded = decodeEscapedCharacters(answer).trim();
				return decoded || undefined;
			}
		}

		answer += char;
		cursor += 1;
	}

	const decoded = decodeEscapedCharacters(answer).trim();
	return decoded || undefined;
};

const parseAnswer = (raw: string): string | undefined => {
	const normalized = raw.trim();

	if (!normalized) return undefined;
	if (normalized === UNKNOWN_ANSWER) return undefined;

	const parsedAnswer =
		parseJsonAnswer(normalized) ?? extractAnswerFromJsonLike(normalized);

	if (parsedAnswer) {
		if (parsedAnswer === UNKNOWN_ANSWER) {
			return undefined;
		}

		return parsedAnswer;
	}

	const outerFence = extractOuterFence(normalized);

	if (!outerFence) {
		return normalized;
	}

	const isJsonFence =
		outerFence.language.length === 0 || outerFence.language === 'json';

	if (!isJsonFence) {
		return normalized;
	}

	const parsedFencedAnswer =
		parseJsonAnswer(outerFence.payload) ??
		extractAnswerFromJsonLike(outerFence.payload);

	if (parsedFencedAnswer) {
		if (parsedFencedAnswer === UNKNOWN_ANSWER) {
			return undefined;
		}

		return parsedFencedAnswer;
	}

	return normalized;
};

const buildPrompt = (reference: string, question: string): string =>
	[
		'You answer questions using only the provided Rewrite documentation reference.',
		'When the user asks about an endpoint, answer completely: include method, path, auth, fields, and example payloads when the reference supports them.',
		'When the user asks for code, provide one practical code snippet in the exact language, runtime, or tool requested by the user.',
		'When the user asks for code, optimize for clean code and the smallest snippet possible without losing clarity.',
		'When the user asks for code and does not ask for a full project, keep code snippets up to 40 lines.',
		'Prefer async/await over promise chains; avoid .then/.catch in examples unless the user explicitly asks for that style.',
		'Keep code examples compact: avoid boilerplate, avoid redundant variables, and keep only the required lines.',
		'Use clear names, minimal structure, and no unnecessary comments.',
		'If the user asks for Node.js with native fetch, use the global fetch API and show method, headers, and JSON.stringify(body).',
		'You may derive client code examples from documented endpoints, headers, and fields even when the reference does not include ready-made code samples.',
		'Use placeholders for secrets, tokens, IDs, and domains when the reference does not provide literal values.',
		'When the user asks for examples without asking for code, provide practical JSON examples that only use documented fields.',
		'If the user explicitly asks for fetch, curl, axios, JavaScript, TypeScript, or Node.js, honor that exact format instead of answering only with endpoint metadata.',
		'If the docs identify the endpoint, method, auth, and supported fields, adapt that information into the requested output format instead of refusing just because the format itself is not documented.',
		'Answer in the same language as the user.',
		'Keep the answer as short as possible while still being useful and complete.',
		'Prefer 2 to 6 short lines, unless the user explicitly asks for more detail.',
		'Use at most one example block unless the user explicitly asks for multiple examples.',
		'Format for Discord: use **Section** headers, bullet lists, inline code for paths/headers, and fenced code blocks for JSON, JavaScript, or TypeScript examples.',
		'When using code fences, always open and close with triple backticks (```), never one or two backticks.',
		'Do not invent undocumented fields, endpoints, enums, headers, auth schemes, or response shapes.',
		`Only return ${UNKNOWN_ANSWER} when the reference does not provide enough information to identify the relevant endpoint, required auth, or supported fields for the user request.`,
		'Return valid JSON only, with this shape:',
		'{"answer":"text"}',
		`or {"answer":"${UNKNOWN_ANSWER}"}.`,
		'',
		'Reference:',
		reference,
		'',
		'Question:',
		question,
	].join('\n');

const extractText = (body: unknown): string | undefined => {
	if (!body || typeof body !== 'object') return undefined;

	const candidate = (
		body as {
			choices?: Array<{
				message?: {
					content?: string | null;
				};
			}>;
		}
	).choices?.[0];

	const content = candidate?.message?.content?.trim();

	return content || undefined;
};

const getApiErrorMessage = (body: unknown): string | undefined => {
	if (!body || typeof body !== 'object') {
		return undefined;
	}

	const error = (body as { error?: { message?: unknown } }).error;

	if (!error || typeof error.message !== 'string') {
		return undefined;
	}

	return error.message;
};

const isQuotaExceeded = (result: GroqRequestResult): boolean => {
	if (result.status !== 429) {
		return false;
	}

	const normalizedError = result.error?.toLowerCase() ?? '';

	return (
		normalizedError.includes('quota') ||
		normalizedError.includes('billing') ||
		normalizedError.includes('rate limit')
	);
};

const askWithGroq = async (
	question: string,
	reference: string,
): Promise<GroqRequestResult> => {
	const response = await fetch(
		'https://api.groq.com/openai/v1/chat/completions',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.GROQ_API_KEY}`,
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
		},
	);

	const body = (await response.json().catch(() => undefined)) as unknown;

	if (!response.ok) {
		return {
			rateLimited: response.status === 429,
			status: response.status,
			error: getApiErrorMessage(body),
		};
	}

	const text = extractText(body);

	if (!text) {
		return {
			rateLimited: false,
			status: response.status,
		};
	}

	return {
		answer: parseAnswer(text),
		rateLimited: false,
		status: response.status,
	};
};

export const askGroqWithReference = async (
	question: string,
	reference: string,
): Promise<string | undefined> => {
	const preparedReference = buildFocusedReference(question, reference);
	const result = await askWithGroq(question, preparedReference);

	if (result.answer) {
		return result.answer;
	}

	if (isQuotaExceeded(result)) {
		return QUOTA_EXCEEDED_REPLY;
	}

	console.warn('<AI>.askGroqWithReference no answer', {
		error: result.error,
		rateLimited: result.rateLimited,
		status: result.status,
	});

	return undefined;
};
