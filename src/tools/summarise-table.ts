import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';

const outputSchema = z.object({
	tableName: z.string(),
	totalRecords: z.number(),
	fields: z.array(z.object({
		name: z.string(),
		type: z.string(),
		filledCount: z.number(),
		emptyCount: z.number(),
		completeness: z.string(),
		uniqueValues: z.number().optional(),
		topValues: z.array(z.object({
			value: z.string(),
			count: z.number(),
		})).optional(),
		numericStats: z.object({
			min: z.number(),
			max: z.number(),
			mean: z.number(),
			sum: z.number(),
		}).optional(),
	})),
});

export function registerSummariseTable(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'summarise_table',
		{
			title: 'Summarise Table',
			description: `Analyse a table's data and return summary statistics including:
- Total record count
- Per-field completeness (filled vs empty)
- Value distributions for text/select fields (top values and counts)
- Numeric statistics (min, max, mean, sum) for number fields
- Unique value counts

Useful for data quality assessment, understanding a dataset before working with it, or generating quick reports. Fetches all records in the table (respecting Airtable's pagination).

Optionally filter to specific fields with the fieldNames parameter.`,
			inputSchema: {
				...tableId,
				fieldNames: z.array(z.string()).optional()
					.describe('Optional list of field names to analyse. If not provided, analyses all fields.'),
				maxRecords: z.number().optional()
					.describe('Maximum records to analyse. Defaults to all records.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			// Get schema for field metadata
			const schema = await ctx.airtableService.getBaseSchema(args.baseId);
			const table = schema.tables.find((t) => t.id === args.tableId || t.name === args.tableId);
			if (!table) {
				throw new Error(`Table ${args.tableId} not found in base ${args.baseId}`);
			}

			// Get records
			const records = await ctx.airtableService.listRecords(
				args.baseId,
				args.tableId,
				{maxRecords: args.maxRecords},
			);

			const totalRecords = records.length;

			// Filter fields if specified
			const fieldsToAnalyse = args.fieldNames
				? table.fields.filter((f) => args.fieldNames!.includes(f.name))
				: table.fields;

			const numericTypes = new Set(['number', 'currency', 'percent', 'duration', 'count', 'autoNumber']);
			const categoricalTypes = new Set([
				'singleSelect', 'multipleSelects', 'singleLineText',
				'checkbox', 'singleCollaborator',
			]);

			const fieldStats = fieldsToAnalyse.map((field) => {
				const values = records.map((r) => r.fields[field.name]);
				const filledValues = values.filter((v) => v !== undefined && v !== null && v !== '');
				const filledCount = filledValues.length;
				const emptyCount = totalRecords - filledCount;
				const completeness = totalRecords > 0
					? `${Math.round((filledCount / totalRecords) * 100)}%`
					: '0%';

				const stat: Record<string, unknown> = {
					name: field.name,
					type: field.type,
					filledCount,
					emptyCount,
					completeness,
				};

				// Unique values for all types
				const stringValues = filledValues.map((v) => {
					if (Array.isArray(v)) return v.join(', ');
					if (typeof v === 'object' && v !== null) return JSON.stringify(v);
					return String(v);
				});
				const uniqueSet = new Set(stringValues);
				stat.uniqueValues = uniqueSet.size;

				// Top values for categorical/text fields
				if (categoricalTypes.has(field.type) || field.type === 'singleLineText') {
					const counts = new Map<string, number>();
					for (const sv of stringValues) {
						counts.set(sv, (counts.get(sv) || 0) + 1);
					}

					const sorted = [...counts.entries()]
						.sort((a, b) => b[1] - a[1])
						.slice(0, 10);
					stat.topValues = sorted.map(([value, count]) => ({value, count}));
				}

				// Numeric stats
				if (numericTypes.has(field.type)) {
					const nums = filledValues
						.map((v) => typeof v === 'number' ? v : parseFloat(String(v)))
						.filter((n) => !isNaN(n));

					if (nums.length > 0) {
						const sum = nums.reduce((a, b) => a + b, 0);
						stat.numericStats = {
							min: Math.min(...nums),
							max: Math.max(...nums),
							mean: Math.round((sum / nums.length) * 100) / 100,
							sum: Math.round(sum * 100) / 100,
						};
					}
				}

				return stat;
			});

			const result = {
				tableName: table.name,
				totalRecords,
				fields: fieldStats,
			};

			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result as z.infer<typeof outputSchema>,
			};
		},
	);
}
