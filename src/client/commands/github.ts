import {
	ActionRow,
	Button,
	Command,
	type CommandContext,
	createStringOption,
	Declare,
	Options,
} from 'seyfert';
import { ButtonStyle } from 'seyfert/lib/types';
import { createDesc } from '@/shared/style';

const options = {
	repository: createStringOption({
		choices: [
			{
				name: 'Node.js SDK',
				value: 'node',
			},
			{
				name: 'REST client',
				value: 'rest',
			},
			{
				name: 'Types Definitions',
				value: 'types',
			},
			{
				name: 'Zod Schemas',
				value: 'zod',
			},
			{
				name: 'Golang SDK',
				value: 'golang',
			},
			{
				name: 'CLI',
				value: 'cli',
			},
			{
				name: 'Documentation',
				value: 'docs',
			},
			{
				name: 'AI Skills',
				value: 'skills',
			},
			{
				name: 'Community (.github)',
				value: '.github',
			},
		],
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
		const { repository } = ctx.options;

		const isGoingToOrg = repository === undefined;

		await ctx.editOrReply({
			content: `Use the button below to go to our GitHub ${isGoingToOrg ? 'organization' : `repository`}.`,
			components: [
				new ActionRow<Button>().setComponents([
					new Button()
						.setLabel('Go to GitHub')
						.setStyle(ButtonStyle.Link)
						.setURL(`https://github.com/RewriteToday/${repository}`),
				]),
			],
		});
	}
}
