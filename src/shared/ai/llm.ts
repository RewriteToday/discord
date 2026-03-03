import { askGroqWithReference } from './groq';
import { loadLlmSpec } from './spec';

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const LLM_SPEC_REFERENCE_URL = 'https://rewritetoday.com/llms.txt';

const normalize = (value: string) =>
	value.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();

const includesAny = (value: string, terms: string[]) =>
	terms.some((term) => value.includes(term));

const looksLikeDocumentationQuestion = (question: string) => {
	const normalized = normalize(question);
	const asksForLink = includesAny(normalized, ['url', 'link', 'site', 'onde']);

	const mentionsDocs = includesAny(normalized, [
		'documentacao',
		'documentation',
		'docs',
	]);

	return asksForLink && mentionsDocs;
};

const extractGithubOrgUrl = (llmSpec: string) => {
	const orgMatch = llmSpec.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+/);
	return orgMatch?.[0];
};

const getDocumentationUrlFromSpec = (llmSpec: string) => {
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

const buildDocumentationReply = (llmSpec: string) => {
	const docsUrl = getDocumentationUrlFromSpec(llmSpec);

	if (!docsUrl) {
		return undefined;
	}

	return `Documentacao: ${docsUrl}\nEspecificacao LLM: ${LLM_SPEC_REFERENCE_URL}`;
};

export const ask = async (content: string) => {
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
