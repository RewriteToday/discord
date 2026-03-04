export type ExtractedCodeBlock = {
	language: string;
	code: string;
};

export type DiscordMarkdownWithCodeBlocks = {
	content: string;
	codeBlocks: ExtractedCodeBlock[];
};
