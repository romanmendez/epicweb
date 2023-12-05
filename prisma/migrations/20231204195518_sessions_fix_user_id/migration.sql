-- DropIndex
DROP INDEX "Session_userId_key";

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
