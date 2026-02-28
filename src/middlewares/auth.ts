import { createMiddleware } from 'seyfert';
import { MessageFlags } from 'seyfert/lib/types';
import { env } from '@/env';

export const isAuthed = createMiddleware<never>(
	async ({ pass, next, context }) => {
		if (context.author.id !== env.DEVELOPER_ID) {
			await context.write({
				flags: MessageFlags.Ephemeral,
				content: 'Hey, this command can only be used by Rewrite developers!',
			});

			return pass();
		}

		next();
	},
);
