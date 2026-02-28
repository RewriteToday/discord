import { config } from 'seyfert';
import { env } from '@/env';

export default config.bot({
	token: env.APP_TOKEN,
	locations: {
		base: 'src/client',

		events: 'events',
		commands: 'commands',
	},
	intents: ['Guilds'],
});
