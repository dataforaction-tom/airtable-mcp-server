import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	webhooks: z.array(z.object({
		id: z.string(),
		type: z.string().optional(),
		isHookEnabled: z.boolean(),
		notificationUrl: z.string().nullable().optional(),
		expirationTime: z.string().nullable().optional(),
		cursorForNextPayload: z.number().optional(),
		areNotificationsEnabled: z.boolean().optional(),
		specification: z.unknown().optional(),
	})),
});

export function registerListWebhooks(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'list_webhooks',
		{
			title: 'List Webhooks',
			description: `List all webhooks configured for a base. Returns each webhook's ID, status, notification URL, expiration time, and specification.

Webhooks are Airtable's way of sending real-time notifications when data changes in a base. They're the programmatic equivalent of automations — use them to trigger external workflows when records are created, updated, or deleted.

Note: Webhooks expire after 7 days and must be refreshed using refresh_webhook.`,
			inputSchema: {
				...baseId,
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const result = await ctx.airtableService.listWebhooks(args.baseId);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
