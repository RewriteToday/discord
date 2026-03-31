import { ActionRow, Button, createEvent } from 'seyfert';
import { italic } from 'seyfert/lib/common';
import { ButtonStyle } from 'seyfert/lib/types';
import { appURL } from '@/shared/url';

export default createEvent({
	data: {
		name: 'guildMemberAdd',
	},
	async run(member) {
		if (member.user.bot) return;

		const guild = await member.guild();

		await member.write({
			allowed_mentions: {
				parse: [],
			},
			components: [
				new ActionRow<Button>().setComponents(
					new Button()
						.setLabel('Dashboard')
						.setStyle(ButtonStyle.Link)
						.setURL(
							appURL({
								subdomain: 'dash',
							}),
						),
					new Button()
						.setLabel('Documentation')
						.setStyle(ButtonStyle.Link)
						.setURL(
							appURL({
								subdomain: 'docs',
							}),
						),
				),
			],
			content: `Hey ${member.user}, welcome to the ${italic(guild.name)} server!`,
		});
	},
});
