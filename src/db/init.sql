-- Drop existing objects if they exist to start fresh
DROP TABLE IF EXISTS "Contact";
DROP TYPE IF EXISTS "LinkPrecedence";

CREATE TYPE "LinkPrecedence" AS ENUM ('primary', 'secondary');

CREATE TABLE "Contact" (
    "id" SERIAL PRIMARY KEY,
    "phoneNumber" VARCHAR(255),
    "email" VARCHAR(255),
    "linkedId" INTEGER,
    "linkPrecedence" "LinkPrecedence" NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP,
    FOREIGN KEY ("linkedId") REFERENCES "Contact"("id")
);

CREATE INDEX "idx_contact_email_phone" ON "Contact" ("email", "phoneNumber");

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_updated_at
BEFORE UPDATE ON "Contact"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();