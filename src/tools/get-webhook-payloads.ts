import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';

const outputSchema = z.object({
	payloads: z.array(z.unknown()),
	cursor: z.number(),
	mightHaveMore: z.boolean(),
});

export function registerGetWebhookPayloads(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'get_webhook_payloads',
		{
			title: 'Get Webhook Payloads',
			description: `Retrieve payloads (change events) for a webhook. Each payload describes what changed — records created, updated, deleted, fields modified, etc.

Use the cursor parameter to paginate through payloads. Start with cursor 1 to get all payloads, or use the cursor returned from a previous call to get only new ones.

Each payload includes:
- timestamp of the change
- actionMetadata (who made the change)
- changedTablesById / createdTablesById / destroyedTableIds
- detailed record-level changes

Payloads are available for 7 days after creation.`,
			inputSchema: {
				...baseId,
				webhookId: z.string().describe('The ID of the webhook (starts with "ach")'),
				cursor: z.number().optional()
					.describe('Cursor to fetch payloads after. Start from 1 for all, or use previous response cursor for new payloads only.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const result = await ctx.airtableService.getWebhookPayloads(
				args.baseId,
				args.webhookId,
				args.cursor,
			);
			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result as z.infer<typeof outputSchema>,
			};
		},
	);
}
