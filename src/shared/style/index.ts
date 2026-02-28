export const createDesc = (content: string, aliases: string[]) =>
	`(${aliases.join(', ')}): ${content}`;
