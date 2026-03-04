import { ask } from '@/shared/ai';
import {
	formatDiscordMarkdown,
	separateDiscordCodeBlocks,
} from '@/shared/style';
import type { AIQueueData } from '@/types/queue';
import {
	buildCodeAttachmentReply,
	selectBestCodeBlock,
} from './process/code-attachment';
import { updateReply } from './process/reply';
import { handleUnknownAnswer } from './process/ticket';

const sendTextReply = async (job: AIQueueData, content: string) => {
	await updateReply(job, {
		content,
	});
};

const sendCodeAttachmentReply = async (
	job: AIQueueData,
	content: string,
	codeBlock: ReturnType<typeof selectBestCodeBlock>,
) => {
	if (!codeBlock) return;

	await updateReply(
		job,
		buildCodeAttachmentReply(job.question, content, codeBlock),
	);
};

export const processAIQueueData = async (job: AIQueueData) => {
	const answer = await ask(job.question);

	if (!answer) {
		await handleUnknownAnswer(job);
		return;
	}

	const formattedAnswer = formatDiscordMarkdown(answer);
	const { content, codeBlocks } = separateDiscordCodeBlocks(formattedAnswer);
	const selectedCodeBlock = selectBestCodeBlock(codeBlocks);

	if (!selectedCodeBlock) {
		await sendTextReply(job, formattedAnswer);
		return;
	}

	await sendCodeAttachmentReply(job, content, selectedCodeBlock);
};
