import { ActionRow, Button } from 'seyfert';
import { ButtonStyle, ChannelType } from 'seyfert/lib/types';
import { client } from '@/client';
import { ask } from '@/shared/ai';
import {
	formatDiscordMarkdown,
	separateDiscordCodeBlocks,
} from '@/shared/style';
import type { AiJobData } from '@/types/queue';

const OPEN_TICKET_CUSTOM_ID = 'open_ticket';
const ATTACHMENT_MESSAGE = 'Exemplo no arquivo anexo';
const CODE_FILE_BASENAME_FALLBACK = 'code-example';

const TEAM_ROLE_ID = '1477343596763025532';
const TICKET_CATEGORY_ID = '1478093098465759342';

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

const getCodeFileExtension = (language: string): string =>
	languageExtensionMap[language] ?? 'txt';

type MessageUpdateBody = Parameters<typeof client.messages.edit>[2];
type InteractionUpdateBody = Parameters<
	typeof client.interactions.editOriginal
>[1];

const toInteractionUpdateBody = (
	body: MessageUpdateBody,
): InteractionUpdateBody => {
	const { flags, ...rest } = body;

	if (flags == null) {
		return rest as InteractionUpdateBody;
	}

	return {
		...rest,
		flags,
	} as InteractionUpdateBody;
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

const slugifyQuestion = (question: string): string[] =>
	question
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/@/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.filter((token) => token.length > 1)
		.filter((token) => !filenameStopWords.has(token));

const selectFilenameTopic = (tokens: string[]): string => {
	if (!tokens.length) {
		return CODE_FILE_BASENAME_FALLBACK;
	}

	const priorityTopic = ['rest', 'sdk', 'webhook', 'api'].find((topic) =>
		tokens.includes(topic),
	);

	if (priorityTopic) {
		return `${priorityTopic}-example`;
	}

	const selected = tokens.slice(0, 2).join('-');
	return `${selected || 'code'}-example`;
};

const buildCodeAttachmentBaseName = (question: string): string =>
	selectFilenameTopic(slugifyQuestion(question))
		.replace(/^-+|-+$/g, '')
		.slice(0, 40) || CODE_FILE_BASENAME_FALLBACK;

const buildAttachmentContent = (content: string): string => {
	const firstLine = content
		.split('\n')
		.map((line) => line.trim())
		.find(Boolean);

	if (!firstLine) {
		return `${ATTACHMENT_MESSAGE}.`;
	}

	const compactLine =
		firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;

	return `${compactLine}\n\n${ATTACHMENT_MESSAGE}.`;
};

const normalizeCode = (code: string): string =>
	code.replace(/\r\n?/g, '\n').trim();

const selectCodeBlock = (
	codeBlocks: ReturnType<typeof separateDiscordCodeBlocks>['codeBlocks'],
) => {
	const uniqueCodeBlocks = codeBlocks
		.map((codeBlock) => ({
			...codeBlock,
			code: normalizeCode(codeBlock.code),
		}))
		.filter((codeBlock) => codeBlock.code);

	const seen = new Set<string>();
	const deduplicatedCodeBlocks = uniqueCodeBlocks.filter((codeBlock) => {
		if (seen.has(codeBlock.code)) {
			return false;
		}

		seen.add(codeBlock.code);
		return true;
	});

	if (!deduplicatedCodeBlocks.length) {
		return undefined;
	}

	return deduplicatedCodeBlocks.reduce((best, current) =>
		current.code.length > best.code.length ? current : best,
	);
};

export const updateReply = async (job: AiJobData, body: MessageUpdateBody) => {
	if (job.isInteraction && job.interactionToken) {
		await client.interactions.editOriginal(
			job.interactionToken,
			toInteractionUpdateBody(body),
		);
		return;
	}

	await client.messages.edit(job.replyMessageId, job.channelId, body);
};

const registerTicketCollector = (job: AiJobData): void => {
	if (!job.guildId) return;

	const collector = client.components.createComponentCollector(
		job.replyMessageId,
		job.channelId,
		job.guildId,
		{
			timeout: 60000,
			filter: (interaction) => interaction.customId === OPEN_TICKET_CUSTOM_ID,
		},
	);

	collector.run(OPEN_TICKET_CUSTOM_ID, async (interaction) => {
		const channel = await client.guilds.channels.create(job.guildId!, {
			type: ChannelType.GuildText,
			name: `ticket-${job.authorId}`,
			parent_id: TICKET_CATEGORY_ID,
		});

		await Promise.all([
			interaction.write({
				content: `Your ticket has been opened. You can view it here ${channel}`,
			}),
			updateReply(job, {
				components: [],
			}),
			channel.messages.write({
				content: `Hey <@&${TEAM_ROLE_ID}>, the user ${interaction.user} has opened this ticket.`,
			}),
		]);

		collector.stop();
	});
};

export const handleUnknownAnswer = async (job: AiJobData): Promise<void> => {
	if (!job.guildId) {
		await updateReply(job, {
			content: 'Sorry, we could not think of an answer.',
		});

		return;
	}

	await updateReply(job, {
		components: [
			new ActionRow<Button>().setComponents([
				new Button()
					.setLabel('Open a ticket')
					.setCustomId(OPEN_TICKET_CUSTOM_ID)
					.setStyle(ButtonStyle.Secondary),
			]),
		],
		content:
			'Sorry, we could not think of an answer. You can open a ticket anyway',
	});

	registerTicketCollector(job);
};

export const processAiJobData = async (job: AiJobData): Promise<void> => {
	const response = await ask(job.question);

	if (!response) {
		await handleUnknownAnswer(job);
		return;
	}

	const formattedResponse = formatDiscordMarkdown(response);
	const { content, codeBlocks } = separateDiscordCodeBlocks(formattedResponse);

	const selectedCodeBlock = selectCodeBlock(codeBlocks);

	if (selectedCodeBlock) {
		const baseName = buildCodeAttachmentBaseName(job.question);
		const attachmentContent = buildAttachmentContent(content);
		const filename = `${baseName}.${getCodeFileExtension(selectedCodeBlock.language)}`;

		await updateReply(job, {
			content: `${attachmentContent}\n\`${filename}\``,
			files: [
				{
					data: selectedCodeBlock.code,
					filename,
				},
			],
		});
		return;
	}

	await updateReply(job, {
		content: formattedResponse,
	});
};
