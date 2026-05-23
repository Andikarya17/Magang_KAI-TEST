# 🔍 Audit Report — KAI RailTrack PPJ

**Tanggal Audit**: 14 Mei 2026  
**Auditor**: Senior System Analyst + Senior Fullstack Code Reviewer  
**Scope**: Seluruh codebase frontend + backend + database + dokumentasi

---

## 1. Executive Summary

> [!IMPORTANT]
> Project secara **keseluruhan sudah cukup well-connected** — alur login, dashboard, tracking, laporan, dan admin sudah saling nyambung. Namun terdapat **beberapa masalah kritis** yang harus diperbaiki sebelum production, serta beberapa inkonsistensi antara dokumentasi dan implementasi.

**Temuan utama:**

| Kategori | Kritis | Sedang | Minor |
|----------|--------|--------|-------|
| Backend API | 3 | 2 | 1 |
| Frontend | 1 | 3 | 3 |
| Database/Prisma | 0 | 2 | 1 |
| Dokumentasi | 0 | 0 | 5 |
| **Total** | **4** | **7** | **10** |

---

## 2. Masalah Kritis

### 🔴 KRITIS-1: Tracking Status Mismatch — Backend uses `completed` but checks for `not stopped`

**File terkait:**
- [tracking.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/tracking.controller.ts#L8)
- [tracking.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/tracking.controller.ts#L105)

**Masalah:**
- `getActiveTracking` (line 8) mencari tracking dengan `status: { not: 'stopped' }` — artinya mencari tracking yang statusnya **bukan** `stopped`.
- Namun `stopTracking` (line 105) menyimpan status tracking sebagai `'completed'`, **bukan** `'stopped'`.
- **Dampak:** Setelah tracking dihentikan, `getActiveTracking` tetap menganggap tracking tersebut **masih aktif** karena status `'completed' !== 'stopped'`. Ini menyebabkan **session restore salah** — halaman inspeksi akan terus me-restore tracking yang sudah selesai.

**Rekomendasi:** Ubah salah satu:
- `stopTracking` → set status ke `'stopped'` (sesuai schema docs), **ATAU**
- `getActiveTracking` → filter `status: { not: 'completed' }` (sesuai implementasi stop)

---

### 🔴 KRITIS-2: `jenisTemuan` Values Inconsistency — Frontend ≠ Backend ≠ Docs

**File terkait:**
- [inspeksi/page.tsx](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/inspeksi/%5Bid%5D/page.tsx#L570-L575) — Frontend emergency modal buttons
- [tugas.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/tugas.controller.ts#L78) — Backend summary query
- AGENTS.md docs (line 126)

**Masalah:**

| Source | Accepted Values |
|--------|----------------|
| **AGENTS.md / Prisma docs** | `ringan`, `berat`, `darurat` |
| **Frontend (inspeksi/page.tsx)** | `berat`, `emergency`, `sedang`, `ringan` |
| **Backend getTugasSummary** | Filters for `emergency` |
| **Backend admin getStats** | Filters for `['emergency', 'berat']` |

Ada **3 inkonsistensi sekaligus**:
1. Docs mengatakan `darurat`, frontend menggunakan `emergency` — ini berbeda!
2. Frontend menambahkan tipe `sedang` yang **tidak ada dalam docs maupun schema**.
3. Backend `getTugasSummary` mencari `jenisTemuan: 'emergency'` → jika frontend mengirim `darurat`, tidak akan pernah match.

**Dampak:** Hitungan emergency reports di dashboard dan admin stats bisa **selalu 0** jika user menggunakan `darurat` sesuai docs. Atau jika frontend mengirim `sedang`, data tersimpan tapi tidak terfilter di mana pun.

**Rekomendasi:** Standardisasi semua ke satu set values:
- Frontend, Backend, dan Docs harus sepakat: `ringan | berat | darurat | emergency` — pilih satu set dan gunakan konsisten.

---

### 🔴 KRITIS-3: `getLaporan` Backend TIDAK Memfilter Per User

**File terkait:**
- [laporan.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/laporan.controller.ts#L26-L46)

**Masalah:**
`getLaporan` (line 26–46) melakukan `prisma.laporan.findMany({})` **tanpa filter `where` berdasarkan user yang login**. Artinya **setiap petugas bisa melihat laporan semua petugas lain**.

**Dampak:** Data leak — petugas A bisa melihat laporan temuan petugas B. Ini masalah keamanan data.

**Rekomendasi:** Tambahkan filter:
```ts
where: { tracking: { tugas: { assignedTo: userId } } }
```

---

### 🔴 KRITIS-4: Default Port Mismatch — `index.ts` vs Documentation

**File terkait:**
- [index.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/index.ts#L14)

**Masalah:**
```ts
const port = process.env.PORT || 5000;  // line 14
```
Default fallback port adalah `5000`, bukan `5001` seperti yang ditulis di README, AGENTS.md, dan `.env`. Jika file `.env` gagal terbaca atau `PORT` tidak diset, backend akan jalan di port `5000`, tapi frontend (api.ts) mengarah ke `localhost:5001`.

**Dampak:** Jika `.env` belum dikonfigurasi → backend di port 5000 → frontend gagal connect → semua API calls fail.

**Rekomendasi:** Ubah fallback ke `5001`: `process.env.PORT || 5001`

---

## 3. Masalah Logika / Flow

### 🟡 FLOW-1: `getAllEmergency` Mengembalikan SEMUA Laporan, Bukan Hanya Darurat

**File:** [admin.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/admin.controller.ts#L107-L126)

**Masalah:** `getAllEmergency` melakukan `prisma.laporan.findMany({})` tanpa filter `jenisTemuan`. Nama endpoint dan docs menyebut "emergency", tapi controller mengembalikan **semua laporan** termasuk `ringan`.

**Dampak:** Tab "Darurat" di admin dashboard menampilkan semua laporan, bukan hanya yang darurat. Tidak kritikal tapi menyesatkan bagi admin.

**Rekomendasi:** Tambahkan filter: `where: { jenisTemuan: { in: ['emergency', 'darurat', 'berat'] } }`

---

### 🟡 FLOW-2: `deleteTugas` Tidak Cascade Delete Tracking + Laporan

**File:** [admin.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/admin.controller.ts#L95-L103)

**Masalah:** `deleteTugas` langsung menghapus `TugasPpj` tanpa menghapus `Tracking` dan `Laporan` yang terkait. Prisma schema tidak mendeklarasikan `onDelete: Cascade`. Ini akan menyebabkan **foreign key constraint error** jika tugas memiliki tracking.

**Dampak:** Admin tidak bisa menghapus tugas yang sudah memiliki tracking → 500 Internal Server Error.

**Rekomendasi:** 
- Tambahkan `onDelete: Cascade` di relasi Prisma, ATAU
- Hapus tracking + laporan secara manual sebelum menghapus tugas.

---

### 🟡 FLOW-3: BottomNav "Track" Link Hardcoded ke `/inspeksi/1`

**File:** [riwayat/page.tsx](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/riwayat/page.tsx#L117)

**Masalah:** Bottom nav di halaman riwayat memiliki link "Track" yang mengarah ke `/inspeksi/1` (hardcoded ID=1). Ini salah karena:
1. Tugas ID 1 mungkin bukan milik user ini
2. BottomNav component (`BottomNav.tsx`) mengarah ke `/inspeksi` (tanpa ID) yang juga bukan halaman valid

**Dampak:** Klik "Track" di bottom nav → 404 atau menuju tugas orang lain.

**Rekomendasi:** Gunakan href ke `/dashboard` atau hilangkan link "Track" dari bottom nav, karena inspeksi membutuhkan ID tugas spesifik.

---

### 🟡 FLOW-4: Root Page Always Redirects to `/login` — Ignores Existing Token

**File:** [page.tsx](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/page.tsx)

**Masalah:** Root page (`/`) selalu `redirect('/login')` tanpa cek apakah user sudah login. Meskipun AuthGuard di layout.tsx akan menangani redirect balik, ini menyebabkan **double redirect** (/ → /login → /dashboard) yang terasa lambat.

**Dampak:** UX minor — user yang sudah login kena redirect dua kali saat buka root URL.

**Rekomendasi:** AGENTS.md menyatakan root page seharusnya "redirect ke /login atau /dashboard" — ini belum diimplementasikan; root page hanya redirect ke /login.

---

### 🟡 FLOW-5: Register Feature Exists But Contradicts Enterprise Context

**File:** [register/page.tsx](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/register/page.tsx), [auth.routes.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/routes/auth.routes.ts#L10)

**Masalah:** 
- Register page dan endpoint (`POST /auth/register`) ada dan berfungsi, tapi **tidak disebutkan** di README maupun AGENTS.md API endpoint list.
- Ini adalah sistem enterprise KAI — self-registration tanpa approval admin adalah **risiko keamanan**.
- Register endpoint tidak memerlukan auth → siapa saja bisa mendaftarkan akun baru, termasuk sebagai admin (jika mengirim `role: 'admin'` di body).

**Dampak:** Celah keamanan — siapa saja bisa membuat akun admin tanpa otorisasi.

**Rekomendasi:** 
- Hapus atau nonaktifkan register endpoint untuk production.
- Jika dipertahankan, JANGAN izinkan user memilih role sendiri di register.

---

## 4. Mismatch Frontend-Backend

| # | Frontend Memanggil | Backend Menyediakan | Dampak | Rekomendasi |
|---|-------------------|---------------------|--------|-------------|
| 1 | `POST /laporan` dengan field `fotoUrl` | `createLaporan` membaca `req.body.fotoUrl` | ✅ Match — tapi **tidak konsisten** dengan AGENTS.md yang menyebut field sebagai `foto` | Standardisasi: gunakan `foto` di semua tempat |
| 2 | `POST /laporan` tidak mengirim field `foto` secara langsung | Backend menyimpan `foto: fotoUrl \|\| ''` | Data tersimpan sebagai empty string bukan `null` saat tidak ada foto | Gunakan `fotoUrl \|\| null` bukan `''` |
| 3 | Dashboard `emergencyReports` stat | Backend `getTugasSummary` filter `jenisTemuan: 'emergency'` | Jika frontend mengirim `darurat` → count selalu 0 | Sinkronkan nilai jenisTemuan |
| 4 | Admin page expects `stats.laporanDarurat` | Backend returns `{ laporanDarurat: count }` | ✅ Match | — |
| 5 | Admin `getAllEmergency` → expects only emergency | Backend returns ALL laporan | Tab darurat menampilkan semua laporan | Filter di backend |
| 6 | Frontend `BottomNav` href `/inspeksi` | Tidak ada halaman `/inspeksi` (yang ada `/inspeksi/[id]`) | Link menuju halaman yang tidak ada | Ubah href atau buat halaman list inspeksi |

---

## 5. Mismatch Database/Prisma

### 🟡 DB-1: Tracking Status Values — Schema Doc vs Implementation

| Source | Tracking Status Values |
|--------|----------------------|
| **AGENTS.md** | `started`, `stopped` |
| **Prisma schema comment** | Tidak ada comment yang mendefinisikan |
| **`startTracking` implementation** | Sets to `'started'` ✅ |
| **`stopTracking` implementation** | Sets to `'completed'` ❌ (docs say `stopped`) |
| **`getActiveTracking` filter** | Checks `not: 'stopped'` ❌ (never actually used) |

**Dampak:** Inkonsistensi yang menyebabkan KRITIS-1 (session restore bug).

**Rekomendasi:** Standarisasi ke `started` | `stopped` sesuai AGENTS.md, atau update semua tempat ke `started` | `completed`.

---

### 🟡 DB-2: Durasi Field — Stored in Minutes but Docs Say Seconds

**File:** [tracking.controller.ts](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/tracking.controller.ts#L94-L104)

| Source | Durasi Unit |
|--------|------------|
| **AGENTS.md** (line 119) | "durasi: Int? (seconds)" |
| **Backend `stopTracking`** (line 96) | `Math.round(durasiMs / 60000)` → **minutes** |
| **Frontend selesai page** (line 98) | Displays `{tracking.durasi} menit` → assumes **minutes** |

**Dampak:** Docs berbohong — docs bilang seconds tapi implementasi menyimpan minutes. Frontend benar menampilkan sebagai menit, tapi docs harus di-update.

---

### 🟢 DB-3: Prisma `@map` Naming — Konsisten ✅

Prisma schema menggunakan camelCase di TypeScript dan `@map("snake_case")` untuk kolom MySQL. Controller dan frontend keduanya menggunakan camelCase (karena Prisma auto-maps). **Tidak ada mismatch naming** — ini sudah benar.

---

## 6. Dokumentasi yang Tidak Sinkron

### 📝 DOC-1: AGENTS.md Menyebut `darurat` Sebagai Jenis Temuan
**Aktual:** Frontend menggunakan `emergency`, bukan `darurat`. AGENTS.md line 126: `"ringan" | "berat" | "darurat"` — seharusnya `"ringan" | "berat" | "emergency"` (atau sebaliknya, sesuai keputusan tim).

### 📝 DOC-2: AGENTS.md / README Tidak Menyebutkan Register
Register page dan endpoint ada di kode tapi **tidak ada dalam dokumentasi**. AGENTS.md section "API Endpoints" tidak menyebutkan `POST /api/auth/register`. README juga tidak menyebutkan.

### 📝 DOC-3: AGENTS.md / README Tidak Menyebutkan `PATCH /api/auth/profile`
README "API Endpoints" section tidak mencantumkan `PATCH /api/auth/profile`. AGENTS.md menyebutkannya.

### 📝 DOC-4: AGENTS.md Menyebut Font "Outfit", Implementasi Menggunakan "Inter"
- AGENTS.md line 228: "Font: Outfit (dari Google Fonts, loaded di layout.tsx)"
- [layout.tsx](file:///e:/Semester%206/KAI%20Magang/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/layout.tsx#L2-L7) mengimport `Inter` dari Google Fonts, bukan `Outfit`.

### 📝 DOC-5: Tracking Durasi Unit
AGENTS.md line 119 menuliskan "durasi: Int? (seconds)" tapi implementasi menyimpan dalam menit (minutes).

### 📝 DOC-6: AGENTS.md `config/database.ts` Disebut "Prisma client singleton"
Implementasi aktual (`config/database.ts`) memang singleton, tapi tidak menggunakan pattern global singleton yang umum di Next.js (tidak ada `globalThis` caching). Ini bisa menyebabkan multiple PrismaClient instances di hot-reload dev environment. Tidak kritikal tapi patut dicatat.

---

## 7. Rekomendasi Perbaikan (Prioritas Tinggi → Rendah)

| # | Prioritas | Perbaikan | File Terkait |
|---|-----------|-----------|-------------|
| 1 | 🔴 **P0** | Fix tracking status mismatch — ubah `stopTracking` status ke `'stopped'` ATAU ubah filter `getActiveTracking` ke `not: 'completed'` | `tracking.controller.ts` |
| 2 | 🔴 **P0** | Fix default port fallback dari `5000` ke `5001` | `src/index.ts` |
| 3 | 🔴 **P0** | Standardisasi `jenisTemuan` values — pilih dan konsistenkan antara `darurat` vs `emergency`, serta putuskan apakah `sedang` valid | Frontend + Backend + Docs |
| 4 | 🔴 **P0** | Tambahkan user filter ke `getLaporan` → hanya return laporan milik petugas yang login | `laporan.controller.ts` |
| 5 | 🟠 **P1** | Tambahkan filter ke `getAllEmergency` → hanya return laporan emergency/darurat/berat | `admin.controller.ts` |
| 6 | 🟠 **P1** | Fix `deleteTugas` → handle cascade delete tracking + laporan, atau tambahkan `onDelete: Cascade` di Prisma schema | `admin.controller.ts` + `schema.prisma` |
| 7 | 🟠 **P1** | Amankan register endpoint — hapus kemampuan user memilih role, atau hapus endpoint sepenuhnya | `auth.controller.ts` + `auth.routes.ts` |
| 8 | 🟡 **P2** | Fix BottomNav "Track" link — jangan hardcode ke `/inspeksi/1` | `riwayat/page.tsx` + `BottomNav.tsx` |
| 9 | 🟡 **P2** | Update AGENTS.md — fix font name (Inter bukan Outfit), fix jenisTemuan values, fix durasi unit, tambahkan register endpoint | `AGENTS.md` |
| 10 | 🟡 **P2** | Update root page `/` — cek token dan redirect sesuai role, bukan selalu ke `/login` | `app/page.tsx` |
| 11 | 🟢 **P3** | Fix `createLaporan` — gunakan `null` bukan empty string untuk foto kosong | `laporan.controller.ts` |
| 12 | 🟢 **P3** | Update README — tambahkan `PATCH /api/auth/profile` dan register endpoint di tabel API | `README.md` |
| 13 | 🟢 **P3** | Pindahkan `petugasColor()` ke `lib/utils.ts` untuk menghindari duplikasi | `AdminMap.tsx` + `admin/page.tsx` |

---

## 8. Checklist Validasi Manual

### A. Authentication & Login Flow
- [ ] **Login PPJ** — Login dengan `KAI-1234` / `password123`
  - Verifikasi: Token + user tersimpan di localStorage
  - Verifikasi: Redirect ke `/dashboard`
- [ ] **Login Admin** — Login dengan `ADMIN-001` / `admin123`
  - Verifikasi: Redirect ke `/admin`
- [ ] **Login gagal** — NIPP salah → error message muncul
- [ ] **NIPP Check real-time** — Ketik NIPP ≥ 5 karakter → verifikasi status muncul
- [ ] **AuthGuard** — Akses `/dashboard` tanpa token → redirect ke `/login`
- [ ] **Role Guard** — Login sebagai petugas → akses `/admin` → redirect ke `/dashboard`
- [ ] **Register flow** ⚠️ — Test apakah user bisa set `role: 'admin'` via register

### B. Profile
- [ ] **Buka `/profile`** — Data diambil dari API (bukan hardcode)
- [ ] **Edit Profile** — Ubah nama, phone → simpan → verifikasi data ter-update
- [ ] **Upload foto** — File > 2MB → error message
- [ ] **NIPP read-only** — NIPP dan role disabled di edit modal
- [ ] **Password change** — Ubah password → logout → login dengan password baru
- [ ] **Logout** — Token + user dihapus dari localStorage → redirect ke `/login`
- [ ] **BottomNav Profile active** — Pastikan tab "Profile" highlighted saat di `/profile`

### C. Dashboard PPJ
- [ ] **Dashboard load** — Stats dan tugas aktif muncul dengan benar
- [ ] **Tugas list** — Hanya menampilkan tugas milik user yang login
- [ ] **Summary stats** — Total, pending, completed, emergency counts benar
- [ ] **Klik tugas** — Navigasi ke `/inspeksi/[id]`

### D. Tracking / Inspeksi
- [ ] **Geofencing** — Tombol start disabled jika di luar radius 500m
- [ ] **Test mode** — Toggle muncul di localhost, bypass geofencing
- [ ] **Identity verification** — Kamera muncul, foto bisa diambil
- [ ] **Start tracking** — API call berhasil, timer mulai berjalan
- [ ] **GPS update** — Path terupdate saat GPS bergerak
- [ ] **Session restore** — Reload halaman saat tracking aktif → ⚠️ **KEMUNGKINAN BUG** (KRITIS-1)
  - Test: Mulai tracking → reload page → cek apakah tracking ter-restore atau duplikat
- [ ] **Stop tracking** — Timer berhenti, redirect ke halaman selesai
- [ ] **Laporan Emergency** — Modal muncul, foto bisa diambil, deskripsi bisa diisi
- [ ] **Kirim laporan** — Data tersimpan ke database via API

### E. Riwayat
- [ ] **List riwayat** — Hanya menampilkan tugas `completed`
- [ ] **Durasi ditampilkan** — Durasi dari tracking record terakhir
- [ ] **Klik item** — Navigasi ke `/inspeksi/[id]/selesai`
- [ ] **BottomNav Track** ⚠️ — Klik "Track" di bottom nav → **kemungkinan masalah** (hardcoded `/inspeksi/1`)

### F. Admin Dashboard
- [ ] **Login admin** — Stats loaded (petugas, tugas aktif, selesai, darurat)
- [ ] **Tab Petugas** — List petugas dengan warna unik per NIPP
- [ ] **Tab Tugas** — List semua tugas + status + tombol hapus
- [ ] **Buat tugas baru** — Pilih petugas, klik peta (snap ke rel), isi form → simpan
- [ ] **Hapus tugas** — ⚠️ **KEMUNGKINAN ERROR** jika tugas memiliki tracking (FK constraint)
- [ ] **Tab Darurat** — ⚠️ **Akan menampilkan SEMUA laporan**, bukan hanya darurat
- [ ] **Emergency detail** — Klik laporan → modal detail muncul
- [ ] **Auto-refresh** — Data refresh setiap 15 detik
- [ ] **Logout admin** — localStorage dihapus → redirect ke `/login`

### G. Endpoint Verification
- [ ] `GET /api/health` → `{ status: 'ok', database: 'connected' }`
- [ ] `POST /api/auth/login` → returns `{ success, token, user }`
- [ ] `GET /api/auth/me` (with Bearer token) → returns full profile
- [ ] `PATCH /api/auth/profile` → updates only provided fields
- [ ] `GET /api/tugas` → returns only current user's tasks
- [ ] `POST /api/tracking/start/:id` → creates tracking record
- [ ] `POST /api/tracking/stop/:id` → ⚠️ sets status to `completed` (should be `stopped`?)
- [ ] `GET /api/tracking/active/:id` → ⚠️ filters by `not: 'stopped'` (mismatch with `completed`)
- [ ] `GET /api/laporan` → ⚠️ returns ALL laporan (not filtered by user)
- [ ] `GET /api/admin/emergency` → ⚠️ returns ALL laporan (not filtered by type)
- [ ] `DELETE /api/admin/tugas/:id` → ⚠️ may fail with FK constraint if tracking exists

---

## Appendix: Ringkasan Temuan Per File

| File | Temuan |
|------|--------|
| `backend/src/index.ts` | Port fallback salah (5000 vs 5001) |
| `backend/src/controllers/tracking.controller.ts` | Status `completed` vs `stopped` mismatch |
| `backend/src/controllers/laporan.controller.ts` | `getLaporan` tidak filter per user; `fotoUrl` field naming |
| `backend/src/controllers/admin.controller.ts` | `getAllEmergency` tidak filter emergency; `deleteTugas` no cascade |
| `backend/src/controllers/tugas.controller.ts` | `jenisTemuan: 'emergency'` mismatch dengan docs (`darurat`) |
| `backend/src/controllers/auth.controller.ts` | Register allows arbitrary role assignment |
| `backend/src/routes/auth.routes.ts` | Register endpoint undocumented |
| `frontend/src/app/layout.tsx` | Uses `Inter` font, docs say `Outfit` |
| `frontend/src/app/inspeksi/[id]/page.tsx` | `sedang` + `emergency` jenis temuan vs docs `darurat` |
| `frontend/src/app/riwayat/page.tsx` | Bottom nav "Track" hardcoded to `/inspeksi/1` |
| `frontend/src/components/layout/BottomNav.tsx` | "Track" href `/inspeksi` → not a valid page |
| `AGENTS.md` | Font name wrong, durasi unit wrong, jenisTemuan values wrong, register undocumented |
| `README.md` | Missing `PATCH /auth/profile`, missing register endpoint |
