import { UNKNOWN_ANSWER } from '@/shared/ai/constants';

const UNICODE_ESCAPE_REGEX = /\\u([0-9a-fA-F]{4})/g;
const ESCAPED_CHARACTER_REGEX = /\\([\\/"bfnrt])/g;
const ANSWER_KEY_REGEX = /"answer"\s*:\s*"/;

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

const extractOuterFence = (value: string) => {
	const match = value.match(/^```([^\n`]*)\n?([\s\S]*?)\n?```$/);

	if (!match) return;

	return {
		language: (match[1] ?? '').trim().toLowerCase(),
		payload: (match[2] ?? '').trim(),
	};
};

const decodeEscapedCharacters = (value: string) =>
	value
		.replace(UNICODE_ESCAPE_REGEX, (_match, code) =>
			String.fromCharCode(Number.parseInt(code, 16)),
		)
		.replace(ESCAPED_CHARACTER_REGEX, (_match, escaped) => {
			const replacement = escapedCharacterMap[escaped];
			return replacement ?? escaped;
		});

const extractAnswerFromJsonLike = (value: string) => {
	const keyMatch = value.match(ANSWER_KEY_REGEX);

	if (!keyMatch) return;

	const keyStartIndex = keyMatch.index ?? 0;
	const state = {
		cursor: keyStartIndex + keyMatch[0].length,
		answer: '',
	};

	while (state.cursor < value.length) {
		const char = value[state.cursor];

		if (char === '\\') {
			const nextChar = value[state.cursor + 1];

			if (!nextChar) {
				state.answer += char;
				state.cursor += 1;
				continue;
			}

			state.answer += `\\${nextChar}`;
			state.cursor += 2;
			continue;
		}

		if (char === '"') {
			const remainder = value.slice(state.cursor + 1);

			if (/^\s*[,}]/.test(remainder)) {
				const decoded = decodeEscapedCharacters(state.answer).trim();
				if (decoded && decoded !== UNKNOWN_ANSWER) return decoded;
				return;
			}
		}

		state.answer += char;
		state.cursor += 1;
	}

	const decoded = decodeEscapedCharacters(state.answer).trim();

	if (decoded && decoded !== UNKNOWN_ANSWER) return decoded;
};

const parseStructuredAnswer = (value: string) =>
	extractAnswerFromJsonLike(value);

export const parseGroqAnswer = (raw: string) => {
	const normalized = raw.trim();

	if (!normalized || normalized === UNKNOWN_ANSWER) return;

	const directAnswer = parseStructuredAnswer(normalized);

	if (directAnswer) return directAnswer;

	const fencedPayload = extractOuterFence(normalized);

	if (!fencedPayload) return;

	const isJsonFence =
		fencedPayload.language.length === 0 || fencedPayload.language === 'json';

	if (!isJsonFence) return;

	return parseStructuredAnswer(fencedPayload.payload);
};

export const extractGroqText = (body: unknown) => {
	if (!body || typeof body !== 'object') return;

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

	if (content) return content;
};

export const extractGroqApiError = (body: unknown) => {
	if (!body || typeof body !== 'object') return;

	const error = (body as { error?: { message?: unknown } }).error;

	if (!error || typeof error.message !== 'string') return;

	return error.message;
};
