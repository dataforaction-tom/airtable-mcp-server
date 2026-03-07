import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';

const outputSchema = z.object({
	totalRecords: z.number(),
	createdCount: z.number(),
	failedCount: z.number(),
	errors: z.array(z.object({
		rowIndex: z.number(),
		error: z.string(),
	})),
	createdRecordIds: z.array(z.string()),
});

export function registerBulkImport(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'bulk_import',
		{
			title: 'Bulk Import Records',
			description: `Import multiple records into a table from a JSON array. Records are batched in groups of 10 (Airtable's limit) with rate limiting to stay within 5 requests/second.

Use this instead of create_record when you have more than a few records to add. Supports up to 1000 records per call.

Each record should be an object with field names as keys. Field names must match the table's field names exactly (case-sensitive), or use typecast to allow Airtable to coerce values.

Example input for records:
[
  {"Name": "Alice", "Email": "alice@example.org", "Status": "Active"},
  {"Name": "Bob", "Email": "bob@example.org", "Status": "Pending"}
]

Returns a summary with created count, failed count, errors (with row indices), and created record IDs.`,
			inputSchema: {
				...tableId,
				records: z.array(z.record(z.string(), z.unknown()))
					.min(1)
					.max(1000)
					.describe('Array of record objects. Each object maps field names to values.'),
				typecast: z.boolean().optional().default(true)
					.describe('If true (default), Airtable will attempt to convert string values to the appropriate cell value. Useful for dates, selects, etc.'),
				stopOnError: z.boolean().optional().default(false)
					.describe('If true, stop importing on first batch error. If false (default), continue and report errors at the end.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
			},
		},
		async (args) => {
			const batchSize = 10;
			const delayMs = 220; // ~4.5 req/s to stay safely under 5/s limit
			const createdRecordIds: string[] = [];
			const errors: {rowIndex: number; error: string}[] = [];

			const batches: {fields: Record<string, unknown>; rowIndex: number}[][] = [];
			for (let i = 0; i < args.records.length; i += batchSize) {
				batches.push(
					args.records.slice(i, i + batchSize).map((fields, j) => ({
						fields,
						rowIndex: i + j,
					})),
				);
			}

			for (const batch of batches) {
				try {
					const response = await ctx.airtableService.createRecordsBatch(
						args.baseId,
						args.tableId,
						batch.map((r) => r.fields),
						args.typecast,
					);
					createdRecordIds.push(...response.map((r) => r.id));
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					for (const item of batch) {
						errors.push({rowIndex: item.rowIndex, error: errorMsg});
					}

					if (args.stopOnError) {
						break;
					}
				}

				// Rate limiting delay between batches
				if (batches.indexOf(batch) < batches.length - 1) {
					await new Promise((resolve) => {
						setTimeout(resolve, delayMs);
					});
				}
			}

			const result = {
				totalRecords: args.records.length,
				createdCount: createdRecordIds.length,
				failedCount: errors.length,
				errors,
				createdRecordIds,
			};
			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result,
			};
		},
	);
}
