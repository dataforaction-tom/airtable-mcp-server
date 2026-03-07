import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';

const outputSchema = z.object({
	deleted: z.boolean(),
	fieldId: z.string(),
});

export function registerDeleteField(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'delete_field',
		{
			title: 'Delete Field',
			description: `Delete a field from a table. This is a destructive operation that permanently removes the field and all its data from all records.

Note: You cannot delete the primary field of a table. The Airtable API does not support deleting tables, only fields.`,
			inputSchema: {
				...tableId,
				fieldId: z.string().describe('The ID of the field to delete'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
			},
		},
		async (args) => {
			await ctx.airtableService.deleteField(args.baseId, args.tableId, args.fieldId);

			const result = {
				deleted: true,
				fieldId: args.fieldId,
			};
			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result,
			};
		},
	);
}
