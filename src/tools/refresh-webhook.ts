import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';

const outputSchema = z.object({
	expirationTime: z.string().nullable(),
});

export function registerRefreshWebhook(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'refresh_webhook',
		{
			title: 'Refresh Webhook',
			description: `Extend a webhook's expiration time. Webhooks expire after 7 days — call this to keep them active.

Returns the new expiration time. You should call this periodically (e.g. every few days) for any webhooks you want to keep running.`,
			inputSchema: {
				...baseId,
				webhookId: z.string().describe('The ID of the webhook to refresh (starts with "ach")'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
			},
		},
		async (args) => {
			const result = await ctx.airtableService.refreshWebhook(args.baseId, args.webhookId);
			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result as z.infer<typeof outputSchema>,
			};
		},
	);
}
