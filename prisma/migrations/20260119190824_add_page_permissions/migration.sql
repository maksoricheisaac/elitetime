-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "allowedRoles" "UserRole"[],

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagePermission" (
    "pageId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "PagePermission_pkey" PRIMARY KEY ("pageId","permissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_code_key" ON "Page"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Page_path_key" ON "Page"("path");

-- AddForeignKey
ALTER TABLE "PagePermission" ADD CONSTRAINT "PagePermission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagePermission" ADD CONSTRAINT "PagePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
