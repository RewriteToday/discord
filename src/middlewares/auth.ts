import { createMiddleware } from 'seyfert';
import { MessageFlags } from 'seyfert/lib/types/index.js';
import { env } from '@/env';

export const isAuthed = createMiddleware<never>(
	async ({ pass, next, context }) => {
		if (!env.TEAM_MEMBERS_ID.includes(context.author.id)) {
			await context.write({
				flags: MessageFlags.Ephemeral,
				content: 'Hey, this command can only be used by the Rewrite team!',
			});

			return pass();
		}

		return next();
	},
);
