import { askGroqWithReference } from '@/shared/groq';
import { loadLlmSpec } from './spec';

export const ask = async (content: string) => {
	const question = content.trim();

	if (!question) return;

	const llmSpec = await loadLlmSpec();

	if (!llmSpec) return;

	return askGroqWithReference(question, llmSpec);
};
