import type { ExtractedCodeBlock } from '@/types/style';

const ATTACHMENT_MESSAGE = 'Exemplo no arquivo anexo';
const CODE_FILE_BASENAME_FALLBACK = 'code-example';
const MAX_ATTACHMENT_PREVIEW_LENGTH = 120;
const MAX_FILE_BASENAME_LENGTH = 40;
const PRIORITY_FILENAME_TOPICS = ['rest', 'sdk', 'webhook', 'api'] as const;
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/g;
const TRIM_DASHES_REGEX = /^-+|-+$/g;
const WINDOWS_NEWLINES_REGEX = /\r\n?/g;

const languageExtensionMap: Record<string, string> = {
	bash: 'sh',
	curl: 'sh',
	go: 'go',
	html: 'html',
	javascript: 'js',
	js: 'js',
	json: 'json',
	markdown: 'md',
	md: 'md',
	python: 'py',
	py: 'py',
	sh: 'sh',
	sql: 'sql',
	ts: 'ts',
	tsx: 'tsx',
	typescript: 'ts',
	xml: 'xml',
	yaml: 'yaml',
	yml: 'yaml',
	zsh: 'sh',
};

const filenameStopWords = new Set([
	'a',
	'and',
	'as',
	'com',
	'como',
	'da',
	'das',
	'de',
	'do',
	'dos',
	'e',
	'for',
	'how',
	'na',
	'no',
	'para',
	'por',
	'pra',
	'que',
	'the',
	'to',
	'um',
	'uma',
	'usar',
	'use',
]);

const getCodeFileExtension = (language: string) =>
	languageExtensionMap[language] ?? 'txt';

const getQuestionTokens = (question: string) =>
	question
		.normalize('NFD')
		.replace(DIACRITICS_REGEX, '')
		.toLowerCase()
		.replace(/@/g, ' ')
		.replace(NON_ALPHANUMERIC_REGEX, ' ')
		.trim()
		.split(/\s+/)
		.filter((token) => token.length > 1 && !filenameStopWords.has(token));

const selectFilenameTopic = (tokens: string[]) => {
	if (tokens.length === 0) return CODE_FILE_BASENAME_FALLBACK;

	const priorityTopic = PRIORITY_FILENAME_TOPICS.find((topic) =>
		tokens.includes(topic),
	);

	if (priorityTopic) return `${priorityTopic}-example`;

	const selectedTokens = tokens.slice(0, 2).join('-');
	return `${selectedTokens || 'code'}-example`;
};

const buildCodeAttachmentBaseName = (question: string) =>
	selectFilenameTopic(getQuestionTokens(question))
		.replace(TRIM_DASHES_REGEX, '')
		.slice(0, MAX_FILE_BASENAME_LENGTH) || CODE_FILE_BASENAME_FALLBACK;

const buildAttachmentSummary = (content: string) => {
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();

		if (!line) continue;

		const previewLine =
			line.length > MAX_ATTACHMENT_PREVIEW_LENGTH
				? `${line.slice(0, MAX_ATTACHMENT_PREVIEW_LENGTH - 3)}...`
				: line;

		return `${previewLine}\n\n${ATTACHMENT_MESSAGE}.`;
	}

	return `${ATTACHMENT_MESSAGE}.`;
};

const normalizeCode = (code: string) =>
	code.replace(WINDOWS_NEWLINES_REGEX, '\n').trim();

export const selectBestCodeBlock = (codeBlocks: ExtractedCodeBlock[]) => {
	const seen = new Set<string>();

	return codeBlocks.reduce<ExtractedCodeBlock | undefined>(
		(bestCodeBlock, codeBlock) => {
			const normalizedCode = normalizeCode(codeBlock.code);

			if (!normalizedCode || seen.has(normalizedCode)) return bestCodeBlock;

			seen.add(normalizedCode);

			if (!bestCodeBlock || normalizedCode.length > bestCodeBlock.code.length)
				return {
					...codeBlock,
					code: normalizedCode,
				};

			return bestCodeBlock;
		},
		undefined,
	);
};

export const buildCodeAttachmentReply = (
	question: string,
	content: string,
	codeBlock: ExtractedCodeBlock,
) => {
	const baseName = buildCodeAttachmentBaseName(question);
	const filename = `${baseName}.${getCodeFileExtension(codeBlock.language)}`;

	return {
		content: `${buildAttachmentSummary(content)}\n\`${filename}\``,
		files: [
			{
				data: codeBlock.code,
				filename,
			},
		],
	};
};
