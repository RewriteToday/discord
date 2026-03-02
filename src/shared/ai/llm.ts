import { askGroqWithReference } from './groq';
import { loadLlmSpec } from './spec';

export const ask = async (content: string): Promise<string | undefined> => {
	const question = content.trim();

	if (!question) return undefined;

	const llmSpec = await loadLlmSpec();

	if (!llmSpec) return undefined;

	try {
		return await askGroqWithReference(question, llmSpec);
	} catch {
		return undefined;
	}
};
