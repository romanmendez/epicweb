-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "digits" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "charSet" TEXT NOT NULL,
    "expiresAt" DATETIME
);
INSERT INTO "new_Verification" ("algorithm", "charSet", "createdAt", "digits", "expiresAt", "id", "period", "secret", "target", "type") SELECT "algorithm", "charSet", "createdAt", "digits", "expiresAt", "id", "period", "secret", "target", "type" FROM "Verification";
DROP TABLE "Verification";
ALTER TABLE "new_Verification" RENAME TO "Verification";
CREATE UNIQUE INDEX "Verification_target_type_key" ON "Verification"("target", "type");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
