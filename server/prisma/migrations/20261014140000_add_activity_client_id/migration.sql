-- AlterTable
ALTER TABLE "activity_entries" ADD COLUMN     "client_id" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "activity_entries_user_id_client_id_key" ON "activity_entries"("user_id", "client_id");
