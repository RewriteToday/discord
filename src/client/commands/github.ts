import {
	ActionRow,
	Button,
	Command,
	type CommandContext,
	createStringOption,
	Declare,
	Options,
} from 'seyfert';
import { ButtonStyle } from 'seyfert/lib/types/index.js';
import { REPOSITORIES } from '@/shared/github';
import { createDesc } from '@/shared/style';

const options = {
	repository: createStringOption({
		choices: REPOSITORIES,
		description: 'Enter the repository name',
	}),
};

@Declare({
	name: 'github',
	aliases: ['git'],
	description: createDesc('Go directly to our GitHub repository', [
		'github',
		'git',
	]),
})
@Options(options)
export default class GithubCommand extends Command {
	async run(ctx: CommandContext<typeof options>) {
		const { repository = '' } = ctx.options;

		const targetUrl = `https://github.com/RewriteToday/${repository}`;

		await ctx.editOrReply({
			content: `Use the button below to go to our GitHub.`,
			components: [
				new ActionRow<Button>().setComponents([
					new Button()
						.setURL(targetUrl)
						.setLabel('Go to GitHub')
						.setStyle(ButtonStyle.Link),
				]),
			],
		});
	}
}
