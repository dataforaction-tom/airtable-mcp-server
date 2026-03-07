import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {ToolContext} from './types.js';
import {registerListRecords} from './list-records.js';
import {registerSearchRecords} from './search-records.js';
import {registerListBases} from './list-bases.js';
import {registerListTables} from './list-tables.js';
import {registerDescribeTable} from './describe-table.js';
import {registerGetRecord} from './get-record.js';
import {registerCreateRecord} from './create-record.js';
import {registerUpdateRecords} from './update-records.js';
import {registerDeleteRecords} from './delete-records.js';
import {registerCreateTable} from './create-table.js';
import {registerUpdateTable} from './update-table.js';
import {registerCreateField} from './create-field.js';
import {registerUpdateField} from './update-field.js';
import {registerCreateComment} from './create-comment.js';
import {registerListComments} from './list-comments.js';
import {registerUploadAttachment} from './upload-attachment.js';
import {registerBulkImport} from './bulk-import.js';
import {registerBulkUpsert} from './bulk-upsert.js';
import {registerSummariseTable} from './summarise-table.js';
import {registerExportTable} from './export-table.js';
import {registerValidateSchema} from './validate-schema.js';
import {registerDeleteField} from './delete-field.js';
import {registerCreateBase} from './create-base.js';
import {registerListViews} from './list-views.js';
import {registerListWebhooks} from './list-webhooks.js';
import {registerCreateWebhook} from './create-webhook.js';
import {registerDeleteWebhook} from './delete-webhook.js';
import {registerGetWebhookPayloads} from './get-webhook-payloads.js';
import {registerRefreshWebhook} from './refresh-webhook.js';

export type {ToolContext} from './types.js';

export function registerAll(server: McpServer, ctx: ToolContext): void {
	// Core read tools
	registerListRecords(server, ctx);
	registerSearchRecords(server, ctx);
	registerListBases(server, ctx);
	registerListTables(server, ctx);
	registerDescribeTable(server, ctx);
	registerGetRecord(server, ctx);

	// Core write tools
	registerCreateRecord(server, ctx);
	registerUpdateRecords(server, ctx);
	registerDeleteRecords(server, ctx);

	// Schema management
	registerCreateBase(server, ctx);
	registerCreateTable(server, ctx);
	registerUpdateTable(server, ctx);
	registerCreateField(server, ctx);
	registerUpdateField(server, ctx);
	registerDeleteField(server, ctx);

	// Comments & attachments
	registerCreateComment(server, ctx);
	registerListComments(server, ctx);
	registerUploadAttachment(server, ctx);

	// Views
	registerListViews(server, ctx);

	// Webhooks
	registerListWebhooks(server, ctx);
	registerCreateWebhook(server, ctx);
	registerDeleteWebhook(server, ctx);
	registerGetWebhookPayloads(server, ctx);
	registerRefreshWebhook(server, ctx);

	// Extended tools
	registerBulkImport(server, ctx);
	registerBulkUpsert(server, ctx);
	registerSummariseTable(server, ctx);
	registerExportTable(server, ctx);
	registerValidateSchema(server, ctx);
}
