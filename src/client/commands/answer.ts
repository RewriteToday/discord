import {
	ContextMenuCommand,
	Declare,
	type MenuCommandContext,
	type MessageCommandInteraction,
} from 'seyfert';
import { ApplicationCommandType, MessageFlags } from 'seyfert/lib/types';
import { enqueueAiJob } from '@/queues/ai/enqueue';

const PROCESSING_ERROR_MESSAGE =
	'Sorry, we could not process your question right now. Please try again.';

@Declare({
	contexts: ['Guild'],
	name: 'Answer',
	type: ApplicationCommandType.Message,
})
export default class AnswerContextMenu extends ContextMenuCommand {
	async run(context: MenuCommandContext<MessageCommandInteraction>) {
		const { target } = context;

		if (target.webhookId || target.user.bot)
			return context.write({
				flags: MessageFlags.Ephemeral,
				content: 'You cannot answer a message from a webhook or an app.',
			});
		if (target.user.id === context.author.id)
			return context.write({
				flags: MessageFlags.Ephemeral,
				content: 'Hey, you cannot answer your own message.',
			});

		const { content: question } = target;

		if (!question)
			return context.write({
				flags: MessageFlags.Ephemeral,
				content: 'The message you are replying to does not have any content.',
			});

		const reply = await context.write(
			{
				content: `${context.author} is answering ${target.url} for ${target.user}`,
			},
			true,
		);

		try {
			await enqueueAiJob({
				authorId: target.user.id,
				channelId: target.channelId,
				guildId: target.guildId,
				interactionToken: context.interaction.token,
				question,
				replyMessageId: reply.id,
				isInteraction: true,
			});
		} catch {
			await context.editOrReply({
				content: PROCESSING_ERROR_MESSAGE,
			});
		}
	}
}
