-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RoleToUser_AB_unique" ON "_RoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");

INSERT INTO Permission VALUES('clpoc5q05000012yak9tdq140','create','user','own','',1701538615013,1701538615013);
INSERT INTO Permission VALUES('clpoc5q09000112yanvgbxae7','create','user','any','',1701538615018,1701538615018);
INSERT INTO Permission VALUES('clpoc5q0a000212yaibuve5w6','read','user','own','',1701538615019,1701538615019);
INSERT INTO Permission VALUES('clpoc5q0b000312ya6a0qqiw5','read','user','any','',1701538615019,1701538615019);
INSERT INTO Permission VALUES('clpoc5q0c000412yanvncyr3s','update','user','own','',1701538615020,1701538615020);
INSERT INTO Permission VALUES('clpoc5q0c000512ya0b4iygkk','update','user','any','',1701538615021,1701538615021);
INSERT INTO Permission VALUES('clpoc5q0d000612yal1zp38yx','delete','user','own','',1701538615021,1701538615021);
INSERT INTO Permission VALUES('clpoc5q0d000712yax7gypdi2','delete','user','any','',1701538615022,1701538615022);
INSERT INTO Permission VALUES('clpoc5q0e000812ya98nrfcws','create','note','own','',1701538615022,1701538615022);
INSERT INTO Permission VALUES('clpoc5q0f000912ya6gq58mzy','create','note','any','',1701538615023,1701538615023);
INSERT INTO Permission VALUES('clpoc5q0f000a12yaooac5ix3','read','note','own','',1701538615024,1701538615024);
INSERT INTO Permission VALUES('clpoc5q0g000b12yanrje6het','read','note','any','',1701538615024,1701538615024);
INSERT INTO Permission VALUES('clpoc5q0g000c12ya427xci5g','update','note','own','',1701538615025,1701538615025);
INSERT INTO Permission VALUES('clpoc5q0g000d12yawe8stjcb','update','note','any','',1701538615025,1701538615025);
INSERT INTO Permission VALUES('clpoc5q0h000e12yai42iyxp5','delete','note','own','',1701538615025,1701538615025);
INSERT INTO Permission VALUES('clpoc5q0h000f12yaakqdyr8x','delete','note','any','',1701538615026,1701538615026);

INSERT INTO Role VALUES('clpoc5q0i000g12yayaj633vf','admin','',1701538615027,1701538615027);
INSERT INTO Role VALUES('clpoc5q0j000h12ya5abtrk7k','user','',1701538615028,1701538615028);

INSERT INTO _PermissionToRole VALUES('clpoc5q09000112yanvgbxae7','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0b000312ya6a0qqiw5','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0c000512ya0b4iygkk','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0d000712yax7gypdi2','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0f000912ya6gq58mzy','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0g000b12yanrje6het','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0g000d12yawe8stjcb','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q0h000f12yaakqdyr8x','clpoc5q0i000g12yayaj633vf');
INSERT INTO _PermissionToRole VALUES('clpoc5q05000012yak9tdq140','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0a000212yaibuve5w6','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0c000412yanvncyr3s','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0d000612yal1zp38yx','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0e000812ya98nrfcws','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0f000a12yaooac5ix3','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0g000c12ya427xci5g','clpoc5q0j000h12ya5abtrk7k');
INSERT INTO _PermissionToRole VALUES('clpoc5q0h000e12yai42iyxp5','clpoc5q0j000h12ya5abtrk7k');
