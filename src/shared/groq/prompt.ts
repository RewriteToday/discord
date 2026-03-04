import { UNKNOWN_ANSWER } from '@/shared/ai/constants';

const PROMPT_INSTRUCTIONS = [
	'Use only the provided Rewrite reference.',
	'Reply in the user language.',
	'Never invent endpoints, methods, auth, headers, fields, enums, or response shapes.',
	`Return ${UNKNOWN_ANSWER} only when the reference is insufficient for the user request (especially endpoint/auth/fields).`,
	'For endpoint questions: include method, path, auth, fields, and examples when documented.',
	'For code requests: return one clean minimal snippet in the exact requested format/runtime/tool; prefer async/await; <=40 lines unless full project is requested; use placeholders for secrets/ids/domains.',
	'If format is requested (fetch/curl/axios/js/ts/node), adapt documented endpoint data to that format.',
	'For non-code examples: return compact JSON using only documented fields.',
	'Keep it concise (usually 2-6 short lines), max one example block unless asked for more; Discord style: **Section**, bullets, inline code, fenced code blocks.',
	`Return valid JSON only: {"answer":"text"} or {"answer":"${UNKNOWN_ANSWER}"}.`,
].join('\n');

export const buildPrompt = (reference: string, question: string) =>
	`${PROMPT_INSTRUCTIONS}\n\nReference:\n${reference}\n\nQuestion:\n${question}`;
