import { askGroqWithReference } from './groq';
import { loadLlmSpec } from './spec';

const normalize = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();

const looksLikeDocumentationQuestion = (question: string): boolean => {
	const normalized = normalize(question);
	const asksForLink =
		normalized.includes('url') ||
		normalized.includes('link') ||
		normalized.includes('site') ||
		normalized.includes('onde');

	const mentionsDocs =
		normalized.includes('documentacao') ||
		normalized.includes('documentation') ||
		normalized.includes('docs');

	return asksForLink && mentionsDocs;
};

const extractGithubOrgUrl = (llmSpec: string): string | undefined => {
	const orgMatch = llmSpec.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+/);
	return orgMatch?.[0];
};

const getDocumentationUrlFromSpec = (llmSpec: string): string | undefined => {
	const explicitDocsUrl = llmSpec.match(
		/https?:\/\/[^\s`)<>"']*(?:docs|documentation)[^\s`)<>"']*/i,
	)?.[0];

	if (explicitDocsUrl) {
		return explicitDocsUrl;
	}

	const githubOrgUrl = extractGithubOrgUrl(llmSpec);
	const hasDocsReferences =
		llmSpec.includes('docs/en/') ||
		llmSpec.includes('`docs`') ||
		llmSpec.toLowerCase().includes('docs repository');

	if (githubOrgUrl && hasDocsReferences) {
		return `${githubOrgUrl}/docs`;
	}

	return undefined;
};

const buildDocumentationReply = (llmSpec: string): string | undefined => {
	const docsUrl = getDocumentationUrlFromSpec(llmSpec);

	if (!docsUrl) {
		return undefined;
	}

	return `Documentacao: ${docsUrl}\nEspecificacao LLM: https://rewritetoday.com/llms.txt`;
};

export const ask = async (content: string): Promise<string | undefined> => {
	const question = content.trim();

	if (!question) return undefined;

	const llmSpec = await loadLlmSpec();

	if (!llmSpec) return undefined;

	if (looksLikeDocumentationQuestion(question)) {
		const docsReply = buildDocumentationReply(llmSpec);

		if (docsReply) {
			return docsReply;
		}
	}

	try {
		return await askGroqWithReference(question, llmSpec);
	} catch {
		return undefined;
	}
};
