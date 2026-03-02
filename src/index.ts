import '@/queues/workers';

import { client } from './client';

await client.start();
await client.uploadCommands({ cachePath: './commands.json' });
