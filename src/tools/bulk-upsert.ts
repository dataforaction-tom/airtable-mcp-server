import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';

const outputSchema = z.object({
	totalRecords: z.number(),
	createdCount: z.number(),
	updatedCount: z.number(),
	createdRecordIds: z.array(z.string()),
	updatedRecordIds: z.array(z.string()),
	errors: z.array(z.object({
		batchIndex: z.number(),
		error: z.string(),
	})),
});

export function registerBulkUpsert(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'bulk_upsert',
		{
			title: 'Bulk Upsert Records',
			description: `Create or update records based on merge field(s). If a record with matching merge field values exists, it is updated; otherwise a new record is created.

Records are batched in groups of 10 with rate limiting. Supports up to 1000 records per call.

The fieldsToMergeOn parameter specifies which field(s) to use for matching. These fields must have unique values in the table. If multiple fields are specified, records are matched on the combination.

Example: Upserting contacts by email:
  fieldsToMergeOn: ["Email"]
  records: [{"Email": "alice@example.org", "Name": "Alice Updated", "Status": "Active"}]

This will update the existing record with that email, or create a new one if not found.`,
			inputSchema: {
				...tableId,
				records: z.array(z.record(z.string(), z.unknown()))
					.min(1)
					.max(1000)
					.describe('Array of record objects. Each must include the merge field(s).'),
				fieldsToMergeOn: z.array(z.string())
					.min(1)
					.max(3)
					.describe('Field names to match on for upsert. These fields must have unique values.'),
				typecast: z.boolean().optional().default(true)
					.describe('If true (default), Airtable will attempt to convert string values to the appropriate cell value.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
			},
		},
		async (args) => {
			const batchSize = 10;
			const delayMs = 220;
			const createdRecordIds: string[] = [];
			const updatedRecordIds: string[] = [];
			const errors: {batchIndex: number; error: string}[] = [];

			const batches: Record<string, unknown>[][] = [];
			for (let i = 0; i < args.records.length; i += batchSize) {
				batches.push(args.records.slice(i, i + batchSize));
			}

			for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
				const batch = batches[batchIdx]!;
				try {
					const response = await ctx.airtableService.upsertRecords(
						args.baseId,
						args.tableId,
						batch,
						args.fieldsToMergeOn,
						args.typecast,
					);
					createdRecordIds.push(...response.createdRecords);
					updatedRecordIds.push(...response.updatedRecords);
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					errors.push({batchIndex: batchIdx, error: errorMsg});
				}

				if (batchIdx < batches.length - 1) {
					await new Promise((resolve) => {
						setTimeout(resolve, delayMs);
					});
				}
			}

			const result = {
				totalRecords: args.records.length,
				createdCount: createdRecordIds.length,
				updatedCount: updatedRecordIds.length,
				createdRecordIds,
				updatedRecordIds,
				errors,
			};
			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result,
			};
		},
	);
}
