import { createEvent } from 'seyfert';
import { aiQueue } from '@/queues/ai';

export default createEvent({
	data: { name: 'messageDelete' },
	async run(message) {
		await aiQueue.remove(message.id);
	},
});
