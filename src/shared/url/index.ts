import type { AppURLOptions } from '@/types/url';

export const appURL = ({ route = '', subdomain }: AppURLOptions) =>
	`https://${subdomain}.rewritetoday.com/${route}`;
