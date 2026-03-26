import { ActionRow, Button, createEvent } from 'seyfert';
import { ButtonStyle } from 'seyfert/lib/types';
import { env } from '@/env';
import { appURL } from '@/shared/url';

export default createEvent({
	data: { name: 'channelCreate' },
	async run(channel) {
		if (!channel.isThread() || channel.parentId !== env.SUPPORT_CHANNEL_ID)
			return;

		await channel.messages.write({
			components: [
				new ActionRow<Button>().setComponents([
					new Button()
						.setLabel('Go to website')
						.setStyle(ButtonStyle.Link)
						.setURL(appURL({ subdomain: 'www' })),
					new Button()
						.setLabel('Go to dashboard')
						.setStyle(ButtonStyle.Link)
						.setURL(appURL({ subdomain: 'dash' })),
				]),
			],
			allowed_mentions: { parse: ['roles'] },
			content: `Hey <@${channel.ownerId}>, the <@&${env.TEAM_ROLE_ID}> will respond as quickly as possible!`,
		});
	},
});
