export const createDesc = (content: string, aliases: string[]) =>
	`(${aliases.join(', ')}): ${content}`;

const openingCodeFenceRegex = /^(\s*)`{1,3}([^\s`]*)\s*$/;
const closingCodeFenceRegex = /^(\s*)`{1,3}\s*$/;

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
		if (!isInsideFence) {
			const openingMatch = line.match(openingCodeFenceRegex);

			if (!openingMatch) {
				formattedLines.push(line);
				continue;
			}

			const indentation = openingMatch[1] ?? '';
			const language = (openingMatch[2] ?? '').trim().split(/\s+/)[0] ?? '';

			formattedLines.push(`${indentation}\`\`\`${language}`);
			isInsideFence = true;
			continue;
		}

		const closingMatch = line.match(closingCodeFenceRegex);

		if (!closingMatch) {
			formattedLines.push(line);
			continue;
		}

		const indentation = closingMatch[1] ?? '';
		formattedLines.push(`${indentation}\`\`\``);
		isInsideFence = false;
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
	const lines = content.replace(/\r\n?/g, '\n').split('\n');
	const textLines: string[] = [];
	let currentLanguage = '';
	let currentCodeLines: string[] | undefined;

	for (const line of lines) {
		if (!currentCodeLines) {
			const openingMatch = line.match(/^(\s*)```([^\s`]*)\s*$/);

			if (!openingMatch) {
				textLines.push(line);
				continue;
			}

			currentLanguage = (openingMatch[2] ?? '').trim().toLowerCase();
			currentCodeLines = [];
			continue;
		}

		if (!/^(\s*)```\s*$/.test(line)) {
			currentCodeLines.push(line);
			continue;
		}

		const code = currentCodeLines.join('\n').replace(/^\n+|\n+$/g, '');

		if (code.trim()) {
			codeBlocks.push({
				language: currentLanguage,
				code,
			});
		}

		currentLanguage = '';
		currentCodeLines = undefined;
	}

	if (currentCodeLines) {
		const languageSuffix = currentLanguage ? currentLanguage : '';
		textLines.push(`\`\`\`${languageSuffix}`);

		if (currentCodeLines.length) {
			textLines.push(...currentCodeLines);
		}

		textLines.push('```');
	}

	return {
		content: textLines
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim(),
		codeBlocks,
	};
};
