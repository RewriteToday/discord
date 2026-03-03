import { sleep } from 'bun';
import { ActionRow, Button } from 'seyfert';
import { ButtonStyle, ChannelType, MessageFlags } from 'seyfert/lib/types';
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
const MAX_ATTACHMENT_PREVIEW_LENGTH = 120;
const MAX_FILE_BASENAME_LENGTH = 40;
const PRIORITY_FILENAME_TOPICS = ['rest', 'sdk', 'webhook', 'api'] as const;
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/g;
const TRIM_DASHES_REGEX = /^-+|-+$/g;
const WINDOWS_NEWLINES_REGEX = /\r\n?/g;

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

const getCodeFileExtension = (language: string) =>
	languageExtensionMap[language] ?? 'txt';

type MessageUpdateBody = Parameters<typeof client.messages.edit>[2];
type InteractionUpdateBody = Parameters<
	typeof client.interactions.editOriginal
>[1];

const toInteractionUpdateBody = (body: MessageUpdateBody) => {
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

const slugifyQuestion = (question: string) =>
	question
		.normalize('NFD')
		.replace(DIACRITICS_REGEX, '')
		.toLowerCase()
		.replace(/@/g, ' ')
		.replace(NON_ALPHANUMERIC_REGEX, ' ')
		.trim()
		.split(/\s+/)
		.filter((token) => token.length > 1 && !filenameStopWords.has(token));

const selectFilenameTopic = (tokens: string[]) => {
	if (!tokens.length) {
		return CODE_FILE_BASENAME_FALLBACK;
	}

	const priorityTopic = PRIORITY_FILENAME_TOPICS.find((topic) =>
		tokens.includes(topic),
	);

	if (priorityTopic) {
		return `${priorityTopic}-example`;
	}

	const selected = tokens.slice(0, 2).join('-');
	return `${selected || 'code'}-example`;
};

const buildCodeAttachmentBaseName = (question: string) =>
	selectFilenameTopic(slugifyQuestion(question))
		.replace(TRIM_DASHES_REGEX, '')
		.slice(0, MAX_FILE_BASENAME_LENGTH) || CODE_FILE_BASENAME_FALLBACK;

const buildAttachmentContent = (content: string) => {
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		const compactLine =
			line.length > MAX_ATTACHMENT_PREVIEW_LENGTH
				? `${line.slice(0, MAX_ATTACHMENT_PREVIEW_LENGTH - 3)}...`
				: line;

		return `${compactLine}\n\n${ATTACHMENT_MESSAGE}.`;
	}

	return `${ATTACHMENT_MESSAGE}.`;
};

const normalizeCode = (code: string) =>
	code.replace(WINDOWS_NEWLINES_REGEX, '\n').trim();

const selectCodeBlock = (
	codeBlocks: ReturnType<typeof separateDiscordCodeBlocks>['codeBlocks'],
) => {
	const seen = new Set<string>();
	let bestCodeBlock:
		| ReturnType<typeof separateDiscordCodeBlocks>['codeBlocks'][number]
		| undefined;

	for (const codeBlock of codeBlocks) {
		const normalizedCode = normalizeCode(codeBlock.code);

		if (!normalizedCode || seen.has(normalizedCode)) {
			continue;
		}

		seen.add(normalizedCode);

		if (!bestCodeBlock || normalizedCode.length > bestCodeBlock.code.length) {
			bestCodeBlock = {
				...codeBlock,
				code: normalizedCode,
			};
		}
	}

	return bestCodeBlock;
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

const registerTicketCollector = (job: AiJobData) => {
	const { guildId } = job;

	if (!guildId) return;

	const collector = client.components.createComponentCollector(
		job.replyMessageId,
		job.channelId,
		guildId,
		{
			timeout: 60000,
			filter: (interaction) => interaction.customId === OPEN_TICKET_CUSTOM_ID,
		},
	);

	collector.run(OPEN_TICKET_CUSTOM_ID, async (interaction) => {
		const channel = await client.guilds.channels.create(guildId, {
			type: ChannelType.GuildText,
			name: `ticket-${job.authorId}`,
			parent_id: TICKET_CATEGORY_ID,
		});

		const closeTicketButtonCustomId = `close_ticket_${job.authorId}`;

		const [ticketMessage] = await Promise.all([
			channel.messages.write({
				components: [
					new ActionRow<Button>().setComponents([
						new Button()
							.setStyle(ButtonStyle.Secondary)
							.setCustomId(closeTicketButtonCustomId)
							.setLabel('Close your ticket'),
					]),
				],
				content: `Hey <@&${TEAM_ROLE_ID}>, the user ${interaction.user} has opened this ticket.`,
			}),
			interaction.write({
				flags: MessageFlags.Ephemeral,
				content: `Your ticket has been opened. You can view it here ${channel}`,
			}),
			updateReply(job, {
				components: [],
			}),
		]);

		const ticketCollector = ticketMessage.createComponentCollector({
			filter: (interaction) => interaction.user.id === job.authorId,
		});

		ticketCollector.run(closeTicketButtonCustomId, async (interaction) => {
			await Promise.all([
				ticketMessage.edit({
					components: [],
				}),
				interaction.write({
					content: `<@${job.authorId}> closed this ticket (Waiting for 5s before deleting ${interaction.channel})`,
				}),
			]);

			ticketCollector.stop();

			await sleep(5000);

			await interaction.channel.delete();
		});

		collector.stop();
	});
};

export const handleUnknownAnswer = async (job: AiJobData) => {
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

export const processAiJobData = async (job: AiJobData) => {
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
