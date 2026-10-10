-- CreateTable
CREATE TABLE "sleep_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_wake_time" VARCHAR(5) NOT NULL DEFAULT '06:30',
    "target_sleep_hours" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
    "latency_minutes" INTEGER NOT NULL DEFAULT 15,
    "enable_cognitive_alarm" BOOLEAN NOT NULL DEFAULT true,
    "alarm_challenge_type" VARCHAR(16) NOT NULL DEFAULT 'math',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sleep_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sleep_schedules_user_id_key" ON "sleep_schedules"("user_id");

-- AddForeignKey
ALTER TABLE "sleep_schedules" ADD CONSTRAINT "sleep_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
