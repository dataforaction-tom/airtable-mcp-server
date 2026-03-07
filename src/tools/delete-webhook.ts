import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	deleted: z.boolean(),
	webhookId: z.string(),
});

export function registerDeleteWebhook(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'delete_webhook',
		{
			title: 'Delete Webhook',
			description: 'Delete a webhook from a base. Use list_webhooks to find webhook IDs.',
			inputSchema: {
				...baseId,
				webhookId: z.string().describe('The ID of the webhook to delete (starts with "ach")'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
			},
		},
		async (args) => {
			await ctx.airtableService.deleteWebhook(args.baseId, args.webhookId);
			return jsonResult(outputSchema.parse({deleted: true, webhookId: args.webhookId}));
		},
	);
}
