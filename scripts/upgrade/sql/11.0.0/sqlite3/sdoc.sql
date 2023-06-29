CREATE TABLE IF NOT EXISTS "operation_log" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "doc_uuid" varchar(36) NOT NULL, "op_id" bigint NOT NULL, "op_time" bigint NOT NULL, "operations" text NOT NULL, "author" varchar(255) NOT NULL);
CREATE INDEX IF NOT EXISTS "operation_log_op_time" ON "operation_log" ("op_time");
CREATE INDEX IF NOT EXISTS "operation_log_doc_uuid" ON "operation_log" ("doc_uuid");
CREATE INDEX IF NOT EXISTS "idx_operation_log_doc_uuid_op_id" ON "operation_log" ("doc_uuid", "op_id");
