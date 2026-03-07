import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';

// Open Referral UK / HSDS 3.0 core tables and required fields
const OPEN_REFERRAL_UK_PATTERN: SchemaPattern = {
	name: 'Open Referral UK (HSDS 3.0)',
	description: 'Human Services Data Specification 3.0 — the standard for UK service directories. See https://openreferraluk.org',
	tables: {
		organizations: {
			requiredFields: ['id', 'name', 'description'],
			optionalFields: ['url', 'email', 'logo', 'uri'],
		},
		services: {
			requiredFields: ['id', 'organization_id', 'name', 'description', 'status'],
			optionalFields: ['url', 'email', 'interpretation_services', 'application_process', 'fees_description', 'accreditations', 'assured_date'],
		},
		service_at_locations: {
			requiredFields: ['id', 'service_id', 'location_id'],
			optionalFields: ['description'],
		},
		locations: {
			requiredFields: ['id', 'name'],
			optionalFields: ['description', 'latitude', 'longitude', 'accessibility'],
		},
		contacts: {
			requiredFields: ['id'],
			optionalFields: ['name', 'title', 'department', 'email'],
		},
		phones: {
			requiredFields: ['id', 'number'],
			optionalFields: ['extension', 'type', 'language', 'description'],
		},
		physical_addresses: {
			requiredFields: ['id', 'location_id', 'address_1', 'city', 'postal_code', 'country'],
			optionalFields: ['attention', 'address_2', 'address_3', 'address_4', 'region', 'state_province'],
		},
		regular_schedules: {
			requiredFields: ['id', 'weekday', 'opens_at', 'closes_at'],
			optionalFields: ['description', 'valid_from', 'valid_to', 'dtstart', 'freq', 'interval', 'byday'],
		},
		eligibility: {
			requiredFields: ['id', 'service_id'],
			optionalFields: ['eligibility', 'minimum_age', 'maximum_age'],
		},
		taxonomies: {
			requiredFields: ['id', 'name', 'vocabulary'],
			optionalFields: ['description', 'parent_id', 'parent_name'],
		},
		service_taxonomies: {
			requiredFields: ['id', 'service_id', 'taxonomy_id'],
			optionalFields: ['taxonomy_detail'],
		},
	},
};

// Generic CRM pattern for small organisations
const SIMPLE_CRM_PATTERN: SchemaPattern = {
	name: 'Simple CRM',
	description: 'A basic CRM pattern suitable for small organisations managing contacts, organisations, interactions, and activities.',
	tables: {
		contacts: {
			requiredFields: ['name', 'email'],
			optionalFields: ['phone', 'role', 'organisation', 'notes', 'tags', 'last_contacted'],
		},
		organisations: {
			requiredFields: ['name'],
			optionalFields: ['type', 'website', 'address', 'notes', 'sector'],
		},
		interactions: {
			requiredFields: ['contact', 'date', 'type'],
			optionalFields: ['notes', 'follow_up_date', 'outcome'],
		},
		activities: {
			requiredFields: ['name', 'status'],
			optionalFields: ['description', 'start_date', 'end_date', 'assigned_to', 'contacts'],
		},
	},
};

// Project tracker pattern
const PROJECT_TRACKER_PATTERN: SchemaPattern = {
	name: 'Project Tracker',
	description: 'A project management pattern with projects, tasks, milestones, and team members.',
	tables: {
		projects: {
			requiredFields: ['name', 'status'],
			optionalFields: ['description', 'start_date', 'end_date', 'lead', 'budget'],
		},
		tasks: {
			requiredFields: ['name', 'project', 'status'],
			optionalFields: ['description', 'assigned_to', 'due_date', 'priority', 'estimated_hours'],
		},
		milestones: {
			requiredFields: ['name', 'project', 'due_date'],
			optionalFields: ['description', 'status', 'deliverables'],
		},
		team_members: {
			requiredFields: ['name', 'email'],
			optionalFields: ['role', 'capacity', 'skills'],
		},
	},
};

type SchemaPattern = {
	name: string;
	description: string;
	tables: Record<string, {
		requiredFields: string[];
		optionalFields: string[];
	}>;
};

const PATTERNS: Record<string, SchemaPattern> = {
	open_referral_uk: OPEN_REFERRAL_UK_PATTERN,
	simple_crm: SIMPLE_CRM_PATTERN,
	project_tracker: PROJECT_TRACKER_PATTERN,
};

const outputSchema = z.object({
	patternName: z.string(),
	patternDescription: z.string(),
	overallScore: z.string(),
	missingTables: z.array(z.string()),
	matchedTables: z.array(z.object({
		patternTable: z.string(),
		matchedTo: z.string(),
		missingRequiredFields: z.array(z.string()),
		missingOptionalFields: z.array(z.string()),
		extraFields: z.array(z.string()),
		score: z.string(),
	})),
	unmatchedBaseTables: z.array(z.string()),
	recommendations: z.array(z.string()),
});

export function registerValidateSchema(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'validate_schema',
		{
			title: 'Validate Schema Against Pattern',
			description: `Validate a base's schema against a known pattern/standard. Checks for missing tables, missing required/optional fields, and extra fields.

Available patterns:
- open_referral_uk: Open Referral UK / HSDS 3.0 standard for service directories
- simple_crm: Basic CRM for contacts, organisations, interactions
- project_tracker: Project management with tasks and milestones

You can also pass a custom pattern as JSON.

Returns a score per table and overall, with specific recommendations for alignment.`,
			inputSchema: {
				...baseId,
				pattern: z.string()
					.describe('Pattern name (open_referral_uk, simple_crm, project_tracker) or a JSON string defining a custom pattern with the structure: {"name": "...", "description": "...", "tables": {"tablename": {"requiredFields": [...], "optionalFields": [...]}}}'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			// Resolve pattern
			let pattern: SchemaPattern;
			const builtinPattern = PATTERNS[args.pattern];
			if (builtinPattern) {
				pattern = builtinPattern;
			} else {
				try {
					pattern = JSON.parse(args.pattern) as SchemaPattern;
					if (!pattern.name || !pattern.tables) {
						throw new Error('Custom pattern must have name and tables properties');
					}
				} catch (e) {
					throw new Error(`Unknown pattern "${args.pattern}". Available: ${Object.keys(PATTERNS).join(', ')}. Or provide a valid JSON pattern.`);
				}
			}

			// Get base schema
			const schema = await ctx.airtableService.getBaseSchema(args.baseId);
			const baseTableNames = schema.tables.map((t) => t.name.toLowerCase().replace(/\s+/g, '_'));
			const baseTableMap = new Map(
				schema.tables.map((t) => [t.name.toLowerCase().replace(/\s+/g, '_'), t]),
			);

			const missingTables: string[] = [];
			const matchedTables: Array<{
				patternTable: string;
				matchedTo: string;
				missingRequiredFields: string[];
				missingOptionalFields: string[];
				extraFields: string[];
				score: string;
			}> = [];
			const matchedBaseTableNames = new Set<string>();

			for (const [patternTableName, patternTable] of Object.entries(pattern.tables)) {
				// Try to find a matching table (fuzzy match on normalised name)
				const normalised = patternTableName.toLowerCase().replace(/\s+/g, '_');
				const match = baseTableMap.get(normalised)
					|| baseTableMap.get(normalised + 's')
					|| baseTableMap.get(normalised.replace(/s$/, ''));

				if (!match) {
					missingTables.push(patternTableName);
					continue;
				}

				matchedBaseTableNames.add(match.name.toLowerCase().replace(/\s+/g, '_'));
				const fieldNames = match.fields.map((f) => f.name.toLowerCase().replace(/\s+/g, '_'));
				const fieldNameSet = new Set(fieldNames);

				const allPatternFields = [...patternTable.requiredFields, ...patternTable.optionalFields]
					.map((f) => f.toLowerCase().replace(/\s+/g, '_'));

				const missingRequired = patternTable.requiredFields
					.filter((f) => !fieldNameSet.has(f.toLowerCase().replace(/\s+/g, '_')));
				const missingOptional = patternTable.optionalFields
					.filter((f) => !fieldNameSet.has(f.toLowerCase().replace(/\s+/g, '_')));
				const extras = fieldNames
					.filter((f) => !allPatternFields.includes(f));

				const totalRequired = patternTable.requiredFields.length;
				const presentRequired = totalRequired - missingRequired.length;
				const score = totalRequired > 0
					? `${Math.round((presentRequired / totalRequired) * 100)}%`
					: '100%';

				matchedTables.push({
					patternTable: patternTableName,
					matchedTo: match.name,
					missingRequiredFields: missingRequired,
					missingOptionalFields: missingOptional,
					extraFields: extras,
					score,
				});
			}

			const unmatchedBaseTables = baseTableNames
				.filter((n) => !matchedBaseTableNames.has(n))
				.map((n) => {
					const t = baseTableMap.get(n);
					return t ? t.name : n;
				});

			// Overall score
			const totalPatternTables = Object.keys(pattern.tables).length;
			const matchedCount = matchedTables.length;
			const avgRequiredScore = matchedTables.length > 0
				? matchedTables.reduce((acc, t) => acc + parseInt(t.score), 0) / matchedTables.length
				: 0;
			const tablePresenceScore = totalPatternTables > 0
				? (matchedCount / totalPatternTables) * 100
				: 100;
			const overallScore = `${Math.round((tablePresenceScore + avgRequiredScore) / 2)}%`;

			// Generate recommendations
			const recommendations: string[] = [];
			if (missingTables.length > 0) {
				recommendations.push(`Create missing tables: ${missingTables.join(', ')}`);
			}

			for (const t of matchedTables) {
				if (t.missingRequiredFields.length > 0) {
					recommendations.push(`Add required fields to "${t.matchedTo}": ${t.missingRequiredFields.join(', ')}`);
				}
			}

			if (unmatchedBaseTables.length > 0) {
				recommendations.push(`Tables not in the pattern (may be valid extensions): ${unmatchedBaseTables.join(', ')}`);
			}

			const result = {
				patternName: pattern.name,
				patternDescription: pattern.description,
				overallScore,
				missingTables,
				matchedTables,
				unmatchedBaseTables,
				recommendations,
			};

			return {
				content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
				structuredContent: result,
			};
		},
	);
}
