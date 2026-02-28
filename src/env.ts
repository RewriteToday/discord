import { cleanEnv, str } from 'envalid';

export const env = cleanEnv(process.env, {
	APP_TOKEN: str({ desc: 'Discord token of the app' }),
	DISCORD_SERVER_INVITE: str({ desc: 'Invite URL of the support server' }),
});
