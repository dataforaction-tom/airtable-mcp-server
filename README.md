# airtable-plus-mcp-server

An extended Airtable MCP server for Claude Code (and other MCP clients). Provides full CRUD plus bulk import/upsert, data analysis, schema validation against known standards, and data export.

Built on [domdomegg/airtable-mcp-server](https://github.com/domdomegg/airtable-mcp-server) (MIT license) — all original tools preserved, with 6 additional power-user tools added.

## Quick Start

### 1. Create an Airtable Personal Access Token

Go to [airtable.com/create/tokens](https://airtable.com/create/tokens) and create a token with these scopes:

- `schema.bases:read`
- `schema.bases:write`
- `data.records:read`
- `data.records:write`
- `data.recordComments:read`
- `data.recordComments:write`

Set access to the bases you need (or "All current and future bases").

### 2. Configure Claude Code

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "airtable": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/airtable-plus-mcp-server/dist/main.js"],
      "env": {
        "AIRTABLE_API_KEY": "patYOUR_TOKEN_HERE"
      }
    }
  }
}
```

### 3. HTTP Transport (optional)

For reusable HTTP mode:

```bash
AIRTABLE_API_KEY=patYOUR_TOKEN MCP_TRANSPORT=http PORT=3000 node dist/main.js
```

Then point any MCP client at `http://localhost:3000/mcp`.

## All Tools (22)

### Core Read (6 — from domdomegg)

| Tool | Description |
|------|-------------|
| `list_bases` | List all accessible bases |
| `list_tables` | List tables in a base (with detail level control) |
| `describe_table` | Get detailed info about a specific table |
| `list_records` | List/filter/sort records from a table |
| `search_records` | Full-text search across text fields |
| `get_record` | Get a single record by ID |

### Core Write (3 — from domdomegg)

| Tool | Description |
|------|-------------|
| `create_record` | Create a single record |
| `update_records` | Update one or more records |
| `delete_records` | Delete one or more records |

### Schema Management (5 — 4 from domdomegg + 1 new)

| Tool | Description |
|------|-------------|
| `create_table` | Create a new table with field definitions |
| `update_table` | Update table name/description |
| `create_field` | Add a field to an existing table |
| `update_field` | Update field name/description |
| `delete_field` | **NEW** — Delete a field from a table |

### Comments & Attachments (3 — from domdomegg)

| Tool | Description |
|------|-------------|
| `create_comment` | Add a comment to a record |
| `list_comments` | List comments on a record |
| `upload_attachment` | Upload an attachment to a record field |

### Extended Tools (5 — all new)

| Tool | Description |
|------|-------------|
| `bulk_import` | Import up to 1000 records with batching (groups of 10) and rate limiting. Handles errors per-batch with optional stop-on-error. |
| `bulk_upsert` | Create-or-update records based on merge field(s). Batched with rate limiting. Ideal for syncing data from external sources. |
| `summarise_table` | Analyse a table: record count, per-field completeness, value distributions, numeric stats (min/max/mean/sum), unique value counts. |
| `export_table` | Export table data as JSON or CSV. Supports filtering, field selection, sorting. |
| `validate_schema` | Validate a base against known patterns. Built-in patterns: `open_referral_uk` (HSDS 3.0), `simple_crm`, `project_tracker`. Also accepts custom patterns as JSON. |

## Schema Validation Patterns

The `validate_schema` tool includes three built-in patterns:

**open_referral_uk** — The Open Referral UK / HSDS 3.0 standard for service directories. Checks for tables like organizations, services, locations, contacts, phones, physical_addresses, regular_schedules, eligibility, taxonomies, and service_taxonomies with their required and optional fields.

**simple_crm** — A basic CRM pattern with contacts, organisations, interactions, and activities tables.

**project_tracker** — Project management with projects, tasks, milestones, and team_members tables.

You can also pass a custom pattern as a JSON string:

```json
{
  "name": "My Standard",
  "description": "Custom schema pattern",
  "tables": {
    "people": {
      "requiredFields": ["name", "email"],
      "optionalFields": ["phone", "role"]
    }
  }
}
```

## Building from Source

```bash
git clone <this-repo>
cd airtable-plus-mcp-server
npm install
npm run build
```

## Acknowledgements

This project extends [domdomegg/airtable-mcp-server](https://github.com/domdomegg/airtable-mcp-server) (MIT license). All original tools, types, and architecture are preserved. The extended tools follow the same patterns and conventions.

## License

MIT — see [LICENSE](LICENSE).
