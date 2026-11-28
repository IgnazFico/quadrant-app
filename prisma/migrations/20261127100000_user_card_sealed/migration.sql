-- WO-140 (Card C1): users.cardSealed holds one sealed avatar card (bytea).
ALTER TABLE "users" ADD COLUMN "cardSealed" BYTEA;
