-- CreateEnum
CREATE TYPE "SplitDay" AS ENUM ('PUSH', 'PULL_ABS_A', 'LEGS_QUAD', 'HIIT_ABS_B', 'UPPER', 'LEGS_POSTERIOR_ABS_C', 'REST');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'LATS', 'UPPER_BACK', 'SPINAL_ERECTORS', 'FRONT_DELTS', 'SIDE_DELTS', 'REAR_DELTS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'RECTUS_ABDOMINIS', 'OBLIQUES', 'TVA');

-- AlterTable
ALTER TABLE "food_entries" ADD COLUMN     "added_oil_ml" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "atwater_calories" INTEGER,
ADD COLUMN     "diaas_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "effective_protein_g" DOUBLE PRECISION,
ADD COLUMN     "fiber_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "is_macro_verified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_raw_weight" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weight_g" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "height_cm" DOUBLE PRECISION NOT NULL DEFAULT 165.0,
ADD COLUMN     "neck_cm" DOUBLE PRECISION NOT NULL DEFAULT 37.0,
ADD COLUMN     "protocol_start" TIMESTAMPTZ(3) NOT NULL DEFAULT '2026-10-24 00:00:00+00'::timestamptz,
ADD COLUMN     "target_deadline" TIMESTAMPTZ(3) NOT NULL DEFAULT '2027-01-01 00:00:00+00'::timestamptz,
ADD COLUMN     "target_waist_cm" DOUBLE PRECISION NOT NULL DEFAULT 76.2;

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "waist_umbilical_cm" DOUBLE PRECISION NOT NULL,
    "waist_narrowest_cm" DOUBLE PRECISION,
    "neck_cm" DOUBLE PRECISION NOT NULL DEFAULT 37.0,
    "estimated_bf_pct" DOUBLE PRECISION NOT NULL,
    "fat_mass_kg" DOUBLE PRECISION NOT NULL,
    "lean_mass_kg" DOUBLE PRECISION NOT NULL,
    "whtr" DOUBLE PRECISION NOT NULL,
    "is_fasted" BOOLEAN NOT NULL DEFAULT true,
    "gi_bloat_score" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_food_log_complete" BOOLEAN NOT NULL DEFAULT false,
    "water_ml" INTEGER NOT NULL DEFAULT 0,
    "creatine_taken" BOOLEAN NOT NULL DEFAULT false,
    "vacuum_sets_completed" INTEGER NOT NULL DEFAULT 0,
    "soya_triple_rinsed" BOOLEAN NOT NULL DEFAULT false,
    "bedtime_at" TIMESTAMPTZ(3),
    "wake_at" TIMESTAMPTZ(3),
    "actual_sleep_hours" DOUBLE PRECISION,
    "alarm_solved_at" TIMESTAMPTZ(3),
    "alarm_solve_duration_sec" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "split_day" "SplitDay" NOT NULL,
    "mesocycle_week" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "duration_minutes" INTEGER,
    "session_rpe" INTEGER,
    "notes" TEXT,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" TEXT NOT NULL,
    "workout_session_id" TEXT NOT NULL,
    "exercise_name" TEXT NOT NULL,
    "primary_muscle" "MuscleGroup" NOT NULL,
    "secondary_muscles" "MuscleGroup"[],
    "set_number" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL,
    "rir" INTEGER NOT NULL DEFAULT 1,
    "is_warmup" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_templates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diaas_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_raw_weight" BOOLEAN NOT NULL DEFAULT true,
    "cost_inr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recipe_notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_measurements_user_id_logged_at_idx" ON "body_measurements"("user_id", "logged_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkins_user_id_date_key" ON "daily_checkins"("user_id", "date");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_started_at_idx" ON "workout_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "workout_sets_workout_session_id_idx" ON "workout_sets"("workout_session_id");

-- CreateIndex
CREATE INDEX "meal_templates_user_id_sort_order_idx" ON "meal_templates"("user_id", "sort_order");

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
