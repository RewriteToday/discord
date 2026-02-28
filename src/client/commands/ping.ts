import { Command, type CommandContext, Declare } from 'seyfert';
import { createDesc } from '@/shared/style';

@Declare({
	name: 'ping',
	aliases: ['latency'],
	description: createDesc('Show current Rewrite app latency', [
		'ping',
		'latency',
	]),
})
export default class PingCommand extends Command {
	async run(ctx: CommandContext) {
		const ping = ctx.client.gateway.latency;

		await ctx.write({
			content: `Hey, i am currently ${ping}ms`,
		});
	}
}
