import { config } from 'seyfert';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default config.bot({
	token: process.env.APP_TOKEN,
	locations: {
		events: 'events',
		commands: 'commands',
		base: IS_PRODUCTION ? 'dist/client' : 'src/client',
	},
	intents: [
		'Guilds',
		'GuildMembers',
		'GuildMessages',
		'DirectMessages',
		'MessageContent',
	],
});
