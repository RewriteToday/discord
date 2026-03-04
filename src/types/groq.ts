export type GroqRequestResult = {
	answer?: string;
	error?: string;
	rateLimited: boolean;
	status?: number;
};
