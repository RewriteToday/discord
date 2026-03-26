import { config } from 'seyfert';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default config.bot({
	token: process.env.APP_TOKEN,
	locations: {
		base: IS_PRODUCTION ? 'dist/client' : 'src/client',
		events: 'events',
		commands: 'commands',
	},
	intents: ['Guilds', 'MessageContent', 'GuildMembers', 'GuildMessages'],
});
