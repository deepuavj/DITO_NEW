-- CreateTable: categories (dynamic, admin-managed)
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📦',
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- Migrate assets.category from AssetCategory enum to TEXT
ALTER TABLE "assets" ALTER COLUMN "category" TYPE TEXT USING category::TEXT;

-- Make glb_url optional (empty string default for procedural-only assets)
ALTER TABLE "assets" ALTER COLUMN "glb_url" SET DEFAULT '';

-- Drop the now-unused AssetCategory enum
DROP TYPE IF EXISTS "AssetCategory";
