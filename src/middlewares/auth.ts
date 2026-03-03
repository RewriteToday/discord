import { createMiddleware } from 'seyfert';
import { MessageFlags } from 'seyfert/lib/types';
import { env } from '@/env';

export const isAuthed = createMiddleware<never>(
	async ({ pass, next, context }) => {
		if (!env.TEAM_MEMBERS_ID.includes(context.author.id)) {
			await context.write({
				flags: MessageFlags.Ephemeral,
				content: 'Hey, this command can only be used by Rewrite developers!',
			});

			return pass();
		}

		return next();
	},
);
