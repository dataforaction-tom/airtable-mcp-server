import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';

const outputSchema = z.object({
	id: z.string(),
	macSecretBase64: z.string(),
	expirationTime: z.string().nullable().optional(),
});

export function registerCreateWebhook(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'create_webhook',
		{
			title: 'Create Webhook',
			description: `Create a webhook on a base to receive real-time notifications when data changes.

The notificationUrl is where Airtable will send POST requests when changes occur. Your endpoint must be publicly accessible via HTTPS.

The specification controls what changes trigger notifications. Common configurations:

Watch all record changes in a base:
  specification: {"options": {"filters": {"dataTypes": ["tableData"]}}}

Watch a specific table:
  specification: {"options": {"filters": {"dataTypes": ["tableData"], "recordChangeScope": "tblXXXXXXXXXX"}}}

Watch record and schema changes:
  specification: {"options": {"filters": {"dataTypes": ["tableData", "tableFields"]}}}

IMPORTANT: The response includes a macSecretBase64 value. Save this immediately — it's needed to verify that incoming webhook payloads actually came from Airtable, and cannot be retrieved again.

Webhooks expire after 7 days. Use refresh_webhook to extend them.`,
			inputSchema: {
				...baseId,
				notificationUrl: z.string().url()
					.describe('The HTTPS URL where Airtable will POST webhook notifications'),
				specification: z.record(z.string(), z.unknown())
					.describe('Webhook specification object controlling what triggers notifications. See description for examples.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
			},
		},
		async (args) => {
			const result = await ctx.airtableService.createWebhook(
				args.baseId,
				args.notificationUrl,
				args.specification,
			);
			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result as z.infer<typeof outputSchema>,
			};
		},
	);
}
