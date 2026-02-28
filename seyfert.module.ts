import type { Client, ParseClient, ParseMiddlewares } from 'seyfert';
import type { middlewares } from '@/middlewares';

declare module 'seyfert' {
	interface UsingClient extends ParseClient<Client<true>> {}

	interface RegisteredMiddlewares
		extends ParseMiddlewares<typeof middlewares> {}
}
