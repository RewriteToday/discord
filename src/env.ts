import { cleanEnv, json, num, str } from 'envalid';

export const env = cleanEnv(process.env, {
	APP_TOKEN: str({ desc: 'Discord token of the app' }),
	TEAM_MEMBERS_ID: json<string[]>({ desc: 'Discord ID of the dev team' }),
	GROQ_API_KEY: str({ desc: 'Groq API key' }),
	GROQ_FALLBACK_API_KEYS: json<string[]>({
		default: [],
		desc: 'Fallback Groq API keys',
	}),
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
