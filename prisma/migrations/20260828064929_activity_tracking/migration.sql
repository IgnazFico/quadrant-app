-- CreateTable
CREATE TABLE "activity_days" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "activity_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_days_userId_date_key" ON "activity_days"("userId", "date");

-- AddForeignKey
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
