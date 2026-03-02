export const createDesc = (content: string, aliases: string[]) =>
	`(${aliases.join(', ')}): ${content}`;

const codeFenceRegex = /^(\s*)`{1,3}([a-zA-Z0-9_+-]*)\s*$/;
const markdownCodeBlockRegex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;

type ExtractedCodeBlock = {
	language: string;
	code: string;
};

export type DiscordMarkdownWithCodeBlocks = {
	content: string;
	codeBlocks: ExtractedCodeBlock[];
};

export const formatDiscordMarkdown = (content: string): string => {
	const normalizedContent = content.replace(/\r\n?/g, '\n').trim();

	if (!normalizedContent) {
		return normalizedContent;
	}

	const lines = normalizedContent.split('\n');
	const formattedLines: string[] = [];
	let isInsideFence = false;

	for (const line of lines) {
		const match = line.match(codeFenceRegex);

		if (!match) {
			formattedLines.push(line);
			continue;
		}

		const indentation = match[1] ?? '';
		const language = (match[2] ?? '').trim();

		formattedLines.push(`${indentation}\`\`\`${language}`);
		isInsideFence = !isInsideFence;
	}

	if (isInsideFence) {
		formattedLines.push('```');
	}

	return formattedLines.join('\n').trim();
};

export const separateDiscordCodeBlocks = (
	content: string,
): DiscordMarkdownWithCodeBlocks => {
	const codeBlocks: ExtractedCodeBlock[] = [];
	const textWithoutCode = content.replace(
		markdownCodeBlockRegex,
		(_fullMatch, rawLanguage: string, rawCode: string) => {
			const language = rawLanguage.trim().toLowerCase();
			const code = rawCode.replace(/^\n+|\n+$/g, '');

			if (!code.trim()) {
				return '';
			}

			codeBlocks.push({
				language,
				code,
			});

			return '';
		},
	);

	return {
		content: textWithoutCode.replace(/\n{3,}/g, '\n\n').trim(),
		codeBlocks,
	};
};
