const MAX_REFERENCE_CHARS = 12000;
const MIN_FOCUSED_REFERENCE_CHARS = 2000;
const SECTION_HEADING_REGEX = /^#{1,4}\s+/;
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const TOKEN_SPLIT_REGEX = /[^a-z0-9]+/;

const stopWords = new Set([
	'about',
	'api',
	'como',
	'com',
	'create',
	'criar',
	'das',
	'de',
	'del',
	'dos',
	'endpoint',
	'example',
	'exemplo',
	'fetch',
	'for',
	'from',
	'how',
	'integrar',
	'integration',
	'node',
	'nodejs',
	'para',
	'por',
	'pra',
	'que',
	'rewrite',
	'sobre',
	'the',
	'uma',
	'with',
]);

const normalize = (value: string) =>
	value.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();

const tokenizeQuestion = (question: string) =>
	normalize(question)
		.split(TOKEN_SPLIT_REGEX)
		.filter((token) => token.length >= 3 && !stopWords.has(token));

const splitSections = (reference: string) => {
	const buckets: string[][] = [];

	for (const line of reference.split('\n')) {
		const currentSection = buckets.at(-1);
		const shouldStartNewSection =
			SECTION_HEADING_REGEX.test(line) && (currentSection?.length ?? 0) > 0;

		if (!currentSection || shouldStartNewSection) {
			buckets.push([line]);
			continue;
		}

		currentSection.push(line);
	}

	return buckets
		.filter((bucket) => bucket.length > 0)
		.map((bucket) => bucket.join('\n'));
};

const scoreSection = (section: string, questionTokens: Set<string>) => {
	const normalizedSection = normalize(section);

	return [...questionTokens].reduce(
		(score, token) => (normalizedSection.includes(token) ? score + 1 : score),
		0,
	);
};

const appendSection = (
	section: string,
	selectedSections: string[],
	selectedChars: { total: number; output: number },
) => {
	if (selectedChars.total >= MAX_REFERENCE_CHARS) return;

	const normalizedSection = section.trim();

	if (!normalizedSection) return;

	const availableChars = MAX_REFERENCE_CHARS - selectedChars.total;
	const selectedSection =
		normalizedSection.length <= availableChars
			? normalizedSection
			: normalizedSection.slice(0, availableChars);

	if (selectedSections.length > 0) {
		selectedChars.output += 2;
	}

	selectedSections.push(selectedSection);
	selectedChars.total += selectedSection.length;
	selectedChars.output += selectedSection.length;
};

export const buildFocusedReference = (question: string, reference: string) => {
	if (reference.length <= MAX_REFERENCE_CHARS) return reference;

	const sections = splitSections(reference);

	if (sections.length === 0) return reference.slice(0, MAX_REFERENCE_CHARS);

	const questionTokens = new Set(tokenizeQuestion(question));
	const scoredSections = sections
		.map((section, index) => ({
			index,
			score: scoreSection(section, questionTokens),
			section,
		}))
		.filter((item) => item.score > 0)
		.sort(
			(left, right) => right.score - left.score || left.index - right.index,
		);

	const selectedSections: string[] = [];
	const selectedChars = { total: 0, output: 0 };

	appendSection(sections[0] ?? '', selectedSections, selectedChars);

	for (const item of scoredSections) {
		if (selectedChars.total >= MAX_REFERENCE_CHARS) break;

		appendSection(item.section, selectedSections, selectedChars);
	}

	if (
		selectedSections.length === 0 ||
		selectedChars.output < MIN_FOCUSED_REFERENCE_CHARS
	) {
		return reference.slice(0, MAX_REFERENCE_CHARS);
	}

	return selectedSections.join('\n\n');
};
