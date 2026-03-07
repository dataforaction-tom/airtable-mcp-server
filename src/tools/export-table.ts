import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';

const outputSchema = z.object({
	format: z.string(),
	totalRecords: z.number(),
	data: z.string(),
	fieldNames: z.array(z.string()),
});

function escapeCsvField(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}

	return value;
}

function toCsvValue(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (Array.isArray(value)) return value.map((v) => String(v)).join('; ');
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

export function registerExportTable(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'export_table',
		{
			title: 'Export Table Data',
			description: `Export all records from a table as JSON or CSV format. Fetches all records respecting Airtable pagination.

Use 'json' format for structured data that preserves types and nested values.
Use 'csv' format for flat data suitable for spreadsheets or further processing.

Optionally filter by formula and limit to specific fields. Supports sorting.

For large tables, consider using maxRecords to limit output size.`,
			inputSchema: {
				...tableId,
				format: z.enum(['json', 'csv']).default('json')
					.describe('Output format: json or csv'),
				fieldNames: z.array(z.string()).optional()
					.describe('Optional list of field names to include. If not provided, includes all fields.'),
				filterByFormula: z.string().optional()
					.describe('Airtable formula to filter records before export'),
				maxRecords: z.number().optional()
					.describe('Maximum number of records to export'),
				sort: z.array(z.object({
					field: z.string(),
					direction: z.enum(['asc', 'desc']).optional(),
				})).optional()
					.describe('Sort order for exported records'),
				view: z.string().optional()
					.describe('View name or ID to use for filtering and sorting'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const records = await ctx.airtableService.listRecords(
				args.baseId,
				args.tableId,
				{
					maxRecords: args.maxRecords,
					filterByFormula: args.filterByFormula,
					sort: args.sort,
					view: args.view,
				},
			);

			// Determine field names from schema if not specified
			let fieldNames: string[];
			if (args.fieldNames && args.fieldNames.length > 0) {
				fieldNames = args.fieldNames;
			} else {
				// Collect all field names that appear in any record
				const fieldSet = new Set<string>();
				for (const record of records) {
					for (const key of Object.keys(record.fields)) {
						fieldSet.add(key);
					}
				}

				fieldNames = [...fieldSet].sort();
			}

			let data: string;
			if (args.format === 'csv') {
				const header = fieldNames.map(escapeCsvField).join(',');
				const rows = records.map((record) => fieldNames.map((fn) => escapeCsvField(toCsvValue(record.fields[fn]))).join(','));
				data = [header, ...rows].join('\n');
			} else {
				const exportData = records.map((record) => {
					const filtered: Record<string, unknown> = {_id: record.id};
					for (const fn of fieldNames) {
						filtered[fn] = record.fields[fn] ?? null;
					}

					return filtered;
				});
				data = JSON.stringify(exportData, null, 2);
			}

			const result = {
				format: args.format,
				totalRecords: records.length,
				data,
				fieldNames,
			};

			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result,
			};
		},
	);
}
