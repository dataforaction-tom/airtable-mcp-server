import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	views: z.array(z.object({
		id: z.string(),
		name: z.string(),
		type: z.string(),
	})),
});

export function registerListViews(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'list_views',
		{
			title: 'List Views',
			description: `List all views in a table. Returns the view ID, name, and type for each view.

View types include: grid, form, calendar, gallery, kanban, timeline, list, gantt.

Note: The Airtable API does not support creating or modifying views — only listing and (on Enterprise plans) deleting them. Views must be created in the Airtable UI.

Use this to discover existing views, which can then be passed as the 'view' parameter to list_records or export_table to filter/sort records according to that view's configuration.`,
			inputSchema: {
				...tableId,
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const schema = await ctx.airtableService.getBaseSchema(args.baseId);
			const table = schema.tables.find((t) => t.id === args.tableId || t.name === args.tableId);
			if (!table) {
				throw new Error(`Table ${args.tableId} not found in base ${args.baseId}`);
			}

			const views = table.views.map((v) => ({
				id: v.id,
				name: v.name,
				type: v.type,
			}));

			return jsonResult(outputSchema.parse({views}));
		},
	);
}
