-- CreateTable
CREATE TABLE "activity_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_day" DATE,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "active_calories" INTEGER NOT NULL DEFAULT 0,
    "distance_km" DOUBLE PRECISION DEFAULT 0.0,
    "exercise_type" VARCHAR(60),
    "duration_minutes" INTEGER,
    "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_entries_user_id_date_idx" ON "activity_entries"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "activity_entries_user_id_source_sync_day_key" ON "activity_entries"("user_id", "source", "sync_day");

-- AddForeignKey
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
