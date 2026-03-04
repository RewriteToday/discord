import { Client } from 'seyfert';
import {
	ActivityType,
	MessageFlags,
	PresenceUpdateStatus,
} from 'seyfert/lib/types';
import { middlewares } from '../middlewares';

const COMMAND_PREFIXES = ['r.'];

export const client = new Client({
	presence() {
		return {
			afk: false,
			since: null,
			activities: [
				{
					name: 'Rewrite',
					type: ActivityType.Custom,
					state: 'SMS the way it should be | rewritetoday.com',
				},
			],
			status: PresenceUpdateStatus.Online,
		};
	},
	commands: {
		prefix() {
			return COMMAND_PREFIXES;
		},
		defaults: {
			async onRunError(context) {
				await context.write({
					flags: MessageFlags.Ephemeral,
					content: 'An *error* just occurred, report it to the team!',
				});
			},
		},
	},
});

client.setServices({
	middlewares,
});

client.cache.users!.filter = ({ bot }) => !bot;
