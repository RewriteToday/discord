import { cleanEnv, num, str } from 'envalid';

export const env = cleanEnv(process.env, {
	APP_TOKEN: str({ desc: 'Discord token of the app' }),
	DISCORD_SERVER_INVITE: str({ desc: 'Invite URL of the support server' }),
	DEVELOPER_ID: str({ desc: 'Discord ID of the developer' }),
	GROQ_API_KEY: str({ desc: 'Groq API key' }),
	GROQ_MODEL: str({
		default: 'llama-3.3-70b-versatile',
		desc: 'Groq model used for answers',
	}),
	LLM_SPEC_URL: str({
		default: 'https://www.rewritetoday.com/llms.txt',
		desc: 'Primary URL for Rewrite llm spec',
	}),
	REDIS_HOST: str({
		default: '127.0.0.1',
		desc: 'Redis host used by BullMQ',
	}),
	REDIS_PORT: num({
		default: 6379,
		desc: 'Redis port used by BullMQ',
	}),
	REDIS_PASSWORD: str({
		default: 'redis_password',
		desc: 'Redis password used by BullMQ',
	}),
});
