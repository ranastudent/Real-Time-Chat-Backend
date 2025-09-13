/*
  Warnings:

  - Made the column `title` on table `Chat` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Chat" ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'TEMP_PASSWORD';
