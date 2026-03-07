import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {jsonResult} from '../utils/response.js';

const fieldDefinitionSchema = z.object({
	name: z.string().describe('The name of the field'),
	type: z.string().describe('The field type (e.g. singleLineText, multilineText, number, singleSelect, multipleSelects, date, checkbox, url, email, phoneNumber, currency, percent, duration, rating, richText)'),
	description: z.string().optional().describe('Description of the field'),
	options: z.record(z.string(), z.unknown()).optional().describe('Field-type-specific options (e.g. choices for singleSelect, precision for number)'),
});

const tableDefinitionSchema = z.object({
	name: z.string().describe('The name of the table'),
	description: z.string().optional().describe('Description of the table'),
	fields: z.array(fieldDefinitionSchema).min(1)
		.describe('Array of field definitions. At least one field is required. The first field becomes the primary field and must be a supported primary field type (singleLineText, number, etc.).'),
});

const outputSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	tables: z.array(z.object({
		id: z.string(),
		name: z.string(),
		fields: z.array(z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
		})),
	})),
});

export function registerCreateBase(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'create_base',
		{
			title: 'Create Base',
			description: `Create a new Airtable base in a workspace with an initial set of tables and fields.

You need a workspaceId — use list_bases first to find bases and their workspace context, or check the Airtable UI (workspace IDs start with "wsp").

Each table must have at least one field. The first field in each table becomes the primary field and must be one of: singleLineText, number, email, url, phoneNumber, date, autoNumber, barcode, formula, or duration.

Example usage:
  name: "Service Directory"
  workspaceId: "wspABC123"
  tables: [
    {
      "name": "Organizations",
      "description": "Service providers",
      "fields": [
        {"name": "Name", "type": "singleLineText"},
        {"name": "Description", "type": "multilineText"},
        {"name": "Website", "type": "url"},
        {"name": "Status", "type": "singleSelect", "options": {"choices": [{"name": "Active"}, {"name": "Inactive"}]}}
      ]
    }
  ]

Returns the created base with IDs for the base, tables, and fields.`,
			inputSchema: {
				workspaceId: z.string().describe('The ID of the workspace to create the base in (starts with "wsp")'),
				name: z.string().describe('Name for the new base'),
				tables: z.array(tableDefinitionSchema).min(1)
					.describe('Array of table definitions. At least one table is required.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
			},
		},
		async (args) => {
			const result = await ctx.airtableService.createBase(
				args.workspaceId,
				args.name,
				args.tables,
			);
			return jsonResult(result as z.infer<typeof outputSchema>);
		},
	);
}
