-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "food_entries" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein_g" DOUBLE PRECISION,
    "carbs_g" DOUBLE PRECISION,
    "fat_g" DOUBLE PRECISION,
    "meal_type" "MealType" NOT NULL DEFAULT 'SNACK',
    "logged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "food_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_entries" (
    "id" UUID NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "note" VARCHAR(280),
    "logged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weight_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_entries_logged_at_idx" ON "food_entries"("logged_at");

-- CreateIndex
CREATE INDEX "weight_entries_logged_at_idx" ON "weight_entries"("logged_at");
