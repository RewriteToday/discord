import { config } from 'seyfert';

export default config.bot({
	token: process.env.APP_TOKEN!,
	locations: {
		base: 'src/client',

		events: 'events',
		commands: 'commands',
	},
	intents: ['Guilds'],
});
