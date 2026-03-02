import { ActionRow, Button, Client } from 'seyfert';
import {
	ActivityType,
	ButtonStyle,
	ChannelType,
	MessageFlags,
	PresenceUpdateStatus,
} from 'seyfert/lib/types';
import { env } from '../env';
import { middlewares } from '../middlewares';

const cachedChannelTypes = new Set<ChannelType>([
	ChannelType.GuildText,
	ChannelType.PublicThread,
	ChannelType.GuildForum,
]);

export const client = new Client({
	presence() {
		return {
			afk: false,
			since: null,
			activities: [
				{
					name: 'Rewrite',
					type: ActivityType.Custom,
					state: 'rewritetoday.com 🩶',
				},
			],
			status: PresenceUpdateStatus.Online,
		};
	},
	commands: {
		prefix() {
			return ['r.'];
		},
		defaults: {
			async onRunError(context) {
				await context.write({
					flags: MessageFlags.Ephemeral,
					components: [
						new ActionRow<Button>().setComponents([
							new Button()
								.setEmoji('🩶')
								.setStyle(ButtonStyle.Link)
								.setLabel('Go to the server')
								.setURL(env.DISCORD_SERVER_INVITE),
						]),
					],
					content: 'An *error* just occurred, join our server and report it!',
				});
			},
		},
	},
});

client.setServices({
	middlewares,
});

client.cache.users!.filter = ({ bot }) => !bot;
client.cache.channels!.filter = ({ type }) => cachedChannelTypes.has(type);
