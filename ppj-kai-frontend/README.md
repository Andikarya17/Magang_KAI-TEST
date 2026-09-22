# Frontend KAI RailTrack PPJ

Frontend Next.js 14 untuk dashboard admin/KUPT, monitoring QC dan guest, serta inspeksi PPJ. Fitur, API, database, dan deployment lengkap tersedia di [README utama](../README.md).

## Menjalankan

Buat `.env.local` di direktori ini:

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:5001/api"
NEXT_PUBLIC_TRACKING_BYPASS_ENABLED=false
```

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000` dan jalankan backend sesuai README utama.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server development |
| `npm run lint` | ESLint |
| `npm run build` | Build production, lint, dan pemeriksaan tipe |
| `npm start` | Jalankan hasil build production |

PWA aktif pada build production. Variabel `NEXT_PUBLIC_*` dibaca saat build, sehingga perubahan URL API atau bypass membutuhkan rebuild. Bypass dapat muncul di production bila flag tidak diatur ke `false`; backend memiliki flag terpisah.

Halaman: `/login`, `/register`, `/admin`, `/qc`, `/guest`, `/inspeksi`, `/inspeksi/[id]`, dan `/inspeksi/[id]/selesai`. Guest bersifat publik; halaman lain mengikuti role.

HTTP client: `src/lib/api.ts`. Data stasiun: `src/lib/stations.ts`. Geometri rel: `src/lib/railway.ts`. Service worker `public/sw.js` dapat berubah setelah build.
