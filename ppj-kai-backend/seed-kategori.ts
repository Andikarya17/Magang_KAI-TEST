import prisma from './src/config/database';

async function seedKategori() {
  const defaults = [
    { key: 'kerusakan_rel', label: 'Kerusakan Rel', icon: 'railway_alert', color: 'error', sortOrder: 1 },
    { key: 'gangguan_struktur', label: 'Gangguan Struktur Jalur', icon: 'foundation', color: 'error', sortOrder: 2 },
    { key: 'anjlokan_kecelakaan', label: 'Anjlokan atau Kecelakaan', icon: 'train', color: 'error', sortOrder: 3 },
    { key: 'lainnya', label: 'Lainnya', icon: 'more_horiz', color: 'primary', sortOrder: 4 },
  ];

  for (const d of defaults) {
    await prisma.kategoriTemuan.upsert({
      where: { key: d.key },
      update: {}, // Don't overwrite if admin already customized
      create: d,
    });
  }

  console.log('✅ Seeded 4 default kategori temuan (KAI)');
}

seedKategori()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
