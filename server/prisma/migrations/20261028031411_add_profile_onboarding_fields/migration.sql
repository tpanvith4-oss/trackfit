-- AlterTable
ALTER TABLE "users" ADD COLUMN     "baseline_waist_cm" DOUBLE PRECISION,
ADD COLUMN     "profile_completed" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "protocol_start" SET DEFAULT '2026-10-24 00:00:00+00'::timestamptz,
ALTER COLUMN "target_deadline" SET DEFAULT '2027-01-01 00:00:00+00'::timestamptz;
