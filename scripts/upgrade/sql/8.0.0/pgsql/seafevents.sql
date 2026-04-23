ALTER TABLE "VirusFile"
    ADD COLUMN "has_ignored" BOOLEAN NOT NULL DEFAULT false,
    ALTER COLUMN "has_handle" TYPE BOOLEAN,
    ALTER COLUMN "has_deleted" TYPE BOOLEAN;
CREATE INDEX has_deleted ON VirusFile ("has_deleted");
CREATE INDEX has_ignored ON VirusFile ("has_ignored");
