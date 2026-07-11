import prisma from './src/config/database';

async function seedKategori() {
  const defaults = [
    { key: 'berat', label: 'Baut Lepas', icon: 'construction', color: 'error', sortOrder: 1 },
    { key: 'emergency', label: 'Rel Retak', icon: 'broken_image', color: 'error', sortOrder: 2 },
    { key: 'sedang', label: 'Penghalang', icon: 'block', color: 'primary', sortOrder: 3 },
    { key: 'ringan', label: 'Lainnya', icon: 'more_horiz', color: 'primary', sortOrder: 4 },
  ];

  for (const d of defaults) {
    await prisma.kategoriTemuan.upsert({
      where: { key: d.key },
      update: {}, // Don't overwrite if admin already customized
      create: d,
    });
  }

  console.log('✅ Seeded 4 default kategori temuan');
}

seedKategori()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
