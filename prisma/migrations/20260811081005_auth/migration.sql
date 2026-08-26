/*
  Warnings:

  - Added the required column `saltPassword` to the `auth_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saltRecovery` to the `auth_keys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "auth_keys" ADD COLUMN     "saltPassword" BYTEA NOT NULL,
ADD COLUMN     "saltRecovery" BYTEA NOT NULL;
