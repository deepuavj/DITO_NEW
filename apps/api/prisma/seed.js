// @ts-check
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// ─── Default categories ───────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Sofas & Seating', icon: '🛋',  color: '#D4A017', sortOrder: 1 },
  { name: 'Tables',          icon: '🪑',  color: '#10B981', sortOrder: 2 },
  { name: 'Beds',            icon: '🛏',  color: '#3B82F6', sortOrder: 3 },
  { name: 'Storage',         icon: '🗄',  color: '#EF4444', sortOrder: 4 },
  { name: 'Lighting',        icon: '💡',  color: '#8B5CF6', sortOrder: 5 },
  { name: 'Decor',           icon: '🪴',  color: '#F59E0B', sortOrder: 6 },
  { name: 'Uncategorised',   icon: '📦',  color: '#6B7280', sortOrder: 99 },
];

// ─── Default assets with full metadata ───────────────────────────────────────

const DEFAULT_ASSETS = [
  // ── Sofas & Seating ──────────────────────────────────────────────────────
  {
    name: '3-Seater Sofa',
    category: 'Sofas & Seating',
    glbUrl: '',
    thumbnailUrl: null,
    tags: ['sofa', 'modern', 'seating', 'living-room'],
    isPublic: true,
    metadata: {
      type: 'sofa',
      style: 'Modern',
      dimensions: { width: 2.2, height: 0.85, depth: 0.95 },
      material: { frame: 'Oak', fabric: 'Linen' },
      colors: { fabric: 'Warm Beige', legs: 'Black Metal' },
      appearance: { condition: 'New', wrinkles: 'Natural', cushions: 'Soft' },
    },
  },
  {
    name: 'Accent Chair',
    category: 'Sofas & Seating',
    glbUrl: '',
    tags: ['chair', 'accent', 'seating'],
    isPublic: true,
    metadata: {
      type: 'chair',
      style: 'Contemporary',
      dimensions: { width: 0.75, height: 0.9, depth: 0.7 },
      material: { frame: 'Walnut', fabric: 'Velvet' },
      colors: { fabric: 'Midnight Blue', legs: 'Natural Wood' },
      appearance: { condition: 'New', cushions: 'Firm' },
    },
  },
  {
    name: 'Loveseat',
    category: 'Sofas & Seating',
    glbUrl: '',
    tags: ['sofa', 'loveseat', 'seating', 'compact'],
    isPublic: true,
    metadata: {
      type: 'sofa',
      style: 'Scandinavian',
      dimensions: { width: 1.5, height: 0.82, depth: 0.88 },
      material: { frame: 'Pine', fabric: 'Cotton Blend' },
      colors: { fabric: 'Light Grey', legs: 'Natural Pine' },
      appearance: { condition: 'New', cushions: 'Medium' },
    },
  },
  {
    name: 'Ottoman',
    category: 'Sofas & Seating',
    glbUrl: '',
    tags: ['ottoman', 'footrest', 'seating'],
    isPublic: true,
    metadata: {
      type: 'ottoman',
      style: 'Modern',
      dimensions: { width: 0.8, height: 0.4, depth: 0.8 },
      material: { frame: 'Solid Wood', fabric: 'Boucle' },
      colors: { fabric: 'Cream White', legs: 'Dark Walnut' },
      appearance: { condition: 'New', shape: 'Round' },
    },
  },

  // ── Tables ───────────────────────────────────────────────────────────────
  {
    name: 'Coffee Table',
    category: 'Tables',
    glbUrl: '',
    tags: ['table', 'coffee', 'living-room'],
    isPublic: true,
    metadata: {
      type: 'coffee_table',
      style: 'Industrial',
      dimensions: { width: 1.2, height: 0.45, depth: 0.6 },
      material: { top: 'Tempered Glass', legs: 'Steel' },
      colors: { top: 'Clear', legs: 'Matte Black' },
      finish: 'Powder Coated',
    },
  },
  {
    name: 'Dining Table',
    category: 'Tables',
    glbUrl: '',
    tags: ['table', 'dining', 'kitchen'],
    isPublic: true,
    metadata: {
      type: 'dining_table',
      style: 'Farmhouse',
      dimensions: { width: 1.8, height: 0.76, depth: 0.9 },
      material: { top: 'Solid Oak', legs: 'Oak' },
      colors: { top: 'Natural Oak', legs: 'Natural Oak' },
      finish: 'Oil',
      seats: 6,
    },
  },
  {
    name: 'Side Table',
    category: 'Tables',
    glbUrl: '',
    tags: ['table', 'side', 'bedside'],
    isPublic: true,
    metadata: {
      type: 'side_table',
      style: 'Minimalist',
      dimensions: { width: 0.5, height: 0.55, depth: 0.5 },
      material: { body: 'Marble', legs: 'Brass' },
      colors: { top: 'White Marble', legs: 'Antique Brass' },
      finish: 'Polished',
    },
  },

  // ── Beds ─────────────────────────────────────────────────────────────────
  {
    name: 'Queen Bed',
    category: 'Beds',
    glbUrl: '',
    tags: ['bed', 'queen', 'bedroom'],
    isPublic: true,
    metadata: {
      type: 'bed',
      size: 'Queen',
      dimensions: { width: 1.6, height: 1.2, depth: 2.1 },
      material: { frame: 'Walnut', headboard: 'Upholstered Linen' },
      colors: { frame: 'Dark Walnut', headboard: 'Warm Sand' },
      finish: 'Matte',
      storageDrawers: false,
    },
  },
  {
    name: 'King Bed',
    category: 'Beds',
    glbUrl: '',
    tags: ['bed', 'king', 'bedroom', 'luxury'],
    isPublic: true,
    metadata: {
      type: 'bed',
      size: 'King',
      dimensions: { width: 1.9, height: 1.2, depth: 2.2 },
      material: { frame: 'Oak', headboard: 'Channeled Velvet' },
      colors: { frame: 'Light Oak', headboard: 'Forest Green' },
      finish: 'Matte',
      storageDrawers: true,
    },
  },

  // ── Storage ──────────────────────────────────────────────────────────────
  {
    name: 'Wardrobe',
    category: 'Storage',
    glbUrl: '',
    tags: ['wardrobe', 'storage', 'bedroom', 'closet'],
    isPublic: true,
    metadata: {
      type: 'wardrobe',
      dimensions: { width: 2.4, height: 2.5, depth: 0.65 },
      material: { body: 'Walnut', handles: 'Brushed Aluminum' },
      finish: 'Matte',
      doorType: 'Swing',
      doors: 3,
      interior: { hangingRails: 2, shelves: 4, drawers: 2 },
    },
  },
  {
    name: 'Bookshelf',
    category: 'Storage',
    glbUrl: '',
    tags: ['bookshelf', 'storage', 'living-room', 'books'],
    isPublic: true,
    metadata: {
      type: 'bookshelf',
      style: 'Open Frame',
      dimensions: { width: 1.0, height: 1.8, depth: 0.3 },
      material: { body: 'Pine', backPanel: 'MDF' },
      colors: { body: 'White', backPanel: 'White' },
      finish: 'Satin',
      shelves: 5,
      adjustable: true,
    },
  },

  // ── Lighting ─────────────────────────────────────────────────────────────
  {
    name: 'Floor Lamp',
    category: 'Lighting',
    glbUrl: '',
    tags: ['lamp', 'floor', 'lighting', 'ambient'],
    isPublic: true,
    metadata: {
      type: 'floor_lamp',
      style: 'Arc',
      dimensions: { width: 0.4, height: 1.8, depth: 0.4 },
      material: { pole: 'Brushed Steel', shade: 'Linen' },
      colors: { pole: 'Brushed Silver', shade: 'Ivory' },
      bulb: { type: 'E27', wattage: 40, lumen: 450 },
      dimmable: true,
    },
  },
  {
    name: 'Pendant Light',
    category: 'Lighting',
    glbUrl: '',
    tags: ['pendant', 'ceiling', 'lighting', 'decorative'],
    isPublic: true,
    metadata: {
      type: 'pendant_light',
      style: 'Industrial',
      dimensions: { width: 0.35, height: 0.35, depth: 0.35 },
      material: { shade: 'Blown Glass', cord: 'Textile' },
      colors: { shade: 'Smoked Grey', cord: 'Charcoal' },
      bulb: { type: 'E27', wattage: 25, lumen: 250 },
      cableLength: 1.5,
    },
  },
];

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  // 1. Admin user
  const adminEmail = 'admin@dito.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin@123', 12);
    const admin = await prisma.user.create({
      data: { name: 'admin', email: adminEmail, passwordHash, role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log('✅ Admin user created:', admin);
  } else {
    console.log('ℹ️  Admin user already exists — skipping.');
  }

  // 2. Categories
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Category created: ${cat.icon} ${cat.name}`);
    }
  }

  // 3. Default assets
  const existingCount = await prisma.asset.count();
  if (existingCount === 0) {
    for (const asset of DEFAULT_ASSETS) {
      await prisma.asset.create({ data: { ...asset, glbUrl: asset.glbUrl ?? '' } });
      console.log(`✅ Asset created: ${asset.name}`);
    }
  } else {
    console.log(`ℹ️  ${existingCount} assets already exist — skipping asset seed.`);
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
