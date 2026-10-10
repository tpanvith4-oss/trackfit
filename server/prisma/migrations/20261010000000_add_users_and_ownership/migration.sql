-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseline_weight" DOUBLE PRECISION NOT NULL DEFAULT 64.0,
    "target_weight_min" DOUBLE PRECISION NOT NULL DEFAULT 58.0,
    "target_weight_max" DOUBLE PRECISION NOT NULL DEFAULT 60.0,
    "daily_calories" INTEGER NOT NULL DEFAULT 1800,
    "daily_protein" INTEGER NOT NULL DEFAULT 135,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AlterTable: add ownership as nullable first so existing rows can be backfilled
ALTER TABLE "food_entries" ADD COLUMN "user_id" TEXT;
ALTER TABLE "weight_entries" ADD COLUMN "user_id" TEXT;

-- Backfill: rows logged before accounts existed are parked on a locked placeholder owner.
-- The username contains a hyphen, which registration rejects, and the password hash is not a
-- bcrypt hash, so nobody can sign in as it. Move the rows to a real account with
-- `npm run claim-legacy-data --workspace server -- <username>`.
INSERT INTO "users" ("id", "username", "password_hash", "name")
SELECT 'legacy-owner', 'legacy-owner', '!locked', 'Pre-account data'
WHERE EXISTS (SELECT 1 FROM "food_entries") OR EXISTS (SELECT 1 FROM "weight_entries");

UPDATE "food_entries" SET "user_id" = 'legacy-owner' WHERE "user_id" IS NULL;
UPDATE "weight_entries" SET "user_id" = 'legacy-owner' WHERE "user_id" IS NULL;

ALTER TABLE "food_entries" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "weight_entries" ALTER COLUMN "user_id" SET NOT NULL;

-- Replace single-column indexes with per-user indexes (every query is now scoped by user)
DROP INDEX "food_entries_logged_at_idx";
DROP INDEX "weight_entries_logged_at_idx";
CREATE INDEX "food_entries_user_id_logged_at_idx" ON "food_entries"("user_id", "logged_at");
CREATE INDEX "weight_entries_user_id_logged_at_idx" ON "weight_entries"("user_id", "logged_at");

-- AddForeignKey
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
