# Implementasi Sistem 5 Role Baru (Admin, QC, KUPT, Guest, PPJ)

## Latar Belakang

Migrasi dari 2 role (`admin`, `petugas`) ke **5 role** dengan akses yang berbeda-beda.

## Keputusan Final

| Aspek | Keputusan |
|-------|-----------|
| Role naming | `petugas` → `ppj` |
| Model wilayah | Tabel baru `Wilayah` + `UserWilayah` (many-to-many) |
| Jumlah wilayah | **12 wilayah** (JR 6.1 s/d JR 6.12) — JR 6.13 dihapus |
| Guest | **Tanpa login** — halaman peta publik |
| QC permissions | **View-only** (lihat stats, tugas, petugas, insiden, peta di wilayahnya) |
| KUPT permissions | **CRUD tugas + manage petugas** di 1 wilayahnya |
| Admin permissions | **Full CRUD** semua wilayah + **CRUD akun** (QC, KUPT, PPJ) |

---

## Role Matrix (Final — Revisi)

| Fitur | Admin | QC | KUPT | Guest | PPJ |
|-------|-------|-----|------|-------|-----|
| Dashboard stats | ✅ Semua | ✅ Scoped wilayah | ✅ Scoped 1 wilayah | ❌ | ❌ |
| View Petugas/User | ✅ Semua | ✅ Scoped wilayah | ✅ Scoped 1 wilayah | ❌ | ❌ |
| Add/Remove Petugas PPJ | ✅ | ❌ | ✅ Di wilayahnya | ❌ | ❌ |
| **CRUD Akun (QC/KUPT/PPJ)** | ✅ **Admin only** | ❌ | ❌ | ❌ | ❌ |
| Create/Delete Tugas | ✅ | ❌ | ✅ Di wilayahnya | ❌ | ❌ |
| View Tugas | ✅ Semua | ✅ Scoped wilayah | ✅ Scoped 1 wilayah | ❌ | ❌ |
| View Insiden | ✅ Semua | ✅ Scoped wilayah | ✅ Scoped 1 wilayah | ❌ | ❌ |
| **Live View peta** | ✅ **Semua PPJ** | ✅ **PPJ di wilayahnya** | ✅ **PPJ di wilayahnya** | ✅ Peta publik | ✅ **Posisi diri sendiri** |
| Jalankan inspeksi | ❌ | ❌ | ❌ | ❌ | ✅ |
| Login required | ✅ | ✅ | ✅ | ❌ | ✅ |

### Detail Live View Per Role

| Role | Apa yang terlihat di peta |
|------|--------------------------|
| **Admin** | Semua task routes + semua PPJ yang sedang bertugas + emergency markers |
| **QC** | Task routes di wilayahnya + PPJ yang bertugas di wilayahnya + emergency di wilayahnya |
| **KUPT** | Task routes di 1 wilayahnya + PPJ yang bertugas di wilayahnya + emergency |
| **Guest** | Task routes (tanpa data sensitif) + emergency markers (publik, tanpa login) |
| **PPJ** | Posisi GPS diri sendiri + track path dari titik awal ke titik akhir tugas (sudah ada di `inspeksi/[id]` — DynamicMap) |

### Detail CRUD Akun (Admin Only)

Admin bisa mengelola semua akun user:

| Aksi | Target | Keterangan |
|------|--------|------------|
| **Create** akun | QC, KUPT, PPJ | Buat user baru dengan role & assign wilayah |
| **Edit** akun | QC, KUPT, PPJ | Ubah nama, role, wilayah, status aktif |
| **Delete/Deactivate** akun | QC, KUPT, PPJ | Nonaktifkan atau hapus user |
| **View** semua akun | QC, KUPT, PPJ | Lihat daftar semua user beserta role & wilayah |

> [!NOTE]
> Saat ini admin hanya bisa "add/remove petugas ke kelolaan" (`managerId`). Fitur CRUD akun ini **sepenuhnya baru** — perlu endpoint baru + UI baru di admin panel.

---

## Daftar 12 Wilayah

| Kode | Nama | Stasiun |
|------|------|---------|
| JR 6.1 | Jenar | Sta. Jenar |
| JR 6.2 | Wojo | Sta. Wojo |
| JR 6.3 | Wates | Sta. Wates |
| JR 6.4 | Yogyakarta | Sta. Yogyakarta, Sta. Lempuyangan, Sta. Maguwo, Sta. Patukan |
| JR 6.5 | Brambanan | Sta. Brambanan |
| JR 6.6 | Klaten | Sta. Klaten |
| JR 6.7 | Delanggu | Sta. Delanggu |
| JR 6.8 | Solobalapan | Sta. Solo Balapan |
| JR 6.9 | Wonogiri | Sta. Wonogiri |
| JR 6.10 | Sumberlawang | Sta. Sumberlawang |
| JR 6.11 | Palur | Sta. Palur |
| JR 6.12 | Sragen | Sta. Sragen |

**QC Assignment:**
- QC A → JR 6.1, 6.2, 6.3, 6.4
- QC B → JR 6.5, 6.6, 6.7, 6.8
- QC C → JR 6.9, 6.10, 6.11, 6.12

---

## Proposed Changes

### Komponen 1: Database Schema

#### [MODIFY] [schema.prisma](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/prisma/schema.prisma)

1. Ubah default role dari `"petugas"` ke `"ppj"`, update komentar → `// admin | qc | kupt | guest | ppj`
2. Tambah relasi `wilayahAssignments UserWilayah[]` di model `User`
3. Tambah model `Wilayah` dan `UserWilayah`:

```prisma
model Wilayah {
  id        Int             @id @default(autoincrement())
  kode      String          @unique @db.VarChar(20)   // "JR 6.1"
  nama      String          @db.VarChar(100)           // "Jenar"
  stations  String          @db.Text                   // JSON array: '["Sta. Jenar"]'
  users     UserWilayah[]
  @@map("wilayah")
}

model UserWilayah {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  wilayahId  Int      @map("wilayah_id")
  user       User     @relation(fields: [userId], references: [id])
  wilayah    Wilayah  @relation(fields: [wilayahId], references: [id])
  @@unique([userId, wilayahId])
  @@map("user_wilayah")
}
```

4. Data migration: `UPDATE users SET role = 'ppj' WHERE role = 'petugas'`

---

### Komponen 2: Backend Middleware

#### [MODIFY] [auth.middleware.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/middleware/auth.middleware.ts)

Tambah middleware baru:

- `requireRole(...roles)` — factory yang cek apakah `user.role` ada di daftar roles
- `requireAdminLike` — shortcut untuk `requireRole('admin', 'qc', 'kupt')`
- `requireCanWrite` — shortcut untuk `requireRole('admin', 'kupt')` (yang bisa CRUD tugas/petugas)
- Keep `requireAdmin` untuk endpoint khusus super admin (CRUD akun)

---

### Komponen 3: Backend Controllers

#### [MODIFY] [admin.controller.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/admin.controller.ts)

**A. Helper function `getStationsForUser(userId, role)`:**
- `admin` → return `null` (no filter = semua)
- `qc`/`kupt` → query `UserWilayah` → ambil `wilayah.stations` → parse JSON → return list nama stasiun

**B. Scoping logic per endpoint:**

| Endpoint | Admin | QC | KUPT |
|----------|-------|-----|------|
| `getStats` | No filter | Filter by stations | Filter by stations |
| `getAllPetugas` | `managerId: adminId` | Petugas with tugas in QC stations (read-only) | `managerId: kuptId` |
| `getAvailablePetugas` | ✅ | ❌ 403 | ✅ (managerId = null) |
| `addPetugasToManager` | ✅ | ❌ 403 | ✅ (set managerId = kuptId) |
| `removePetugasFromManager` | ✅ | ❌ 403 | ✅ |
| `getAllTugas` | `managerId: adminId` | Filter by stations | `managerId: kuptId` |
| `createTugas` | ✅ | ❌ 403 | ✅ (validate stations in wilayah) |
| `deleteTugas` | ✅ | ❌ 403 | ✅ (validate task in wilayah) |
| `getAllEmergency` | `managerId: adminId` | Filter by stations | `managerId: kuptId` |

**C. Endpoint CRUD Akun (BARU — Admin Only):**

```typescript
// GET /admin/users — list semua user (QC, KUPT, PPJ) + wilayah info
export const getAllUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'admin' } },
    include: { wilayahAssignments: { include: { wilayah: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: users });
};

// POST /admin/users — create user baru (dengan role & wilayah)
export const createUser = async (req, res) => {
  const { nipp, nama, password, role, wilayahIds } = req.body;
  // Validasi: role harus 'qc' | 'kupt' | 'ppj'
  // KUPT hanya boleh 1 wilayah, QC boleh banyak, PPJ tidak perlu wilayah
  // Hash password, create user, create UserWilayah entries
};

// PATCH /admin/users/:id — update user (nama, role, wilayah, isActive)
export const updateUser = async (req, res) => {
  // Update data user, re-sync wilayah assignments
  // Jika role berubah ke KUPT, enforce max 1 wilayah
};

// DELETE /admin/users/:id — hapus atau deactivate user
export const deleteUser = async (req, res) => {
  // Soft delete (isActive = false) atau hard delete
  // TIDAK boleh hapus admin lain
};

// GET /admin/wilayah — list semua wilayah (untuk dropdown di form create/edit user)
export const getAllWilayah = async (req, res) => {
  const wilayah = await prisma.wilayah.findMany({ orderBy: { kode: 'asc' } });
  return res.json({ success: true, data: wilayah });
};
```

#### [MODIFY] [auth.controller.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/auth.controller.ts)

1. `register()` — default role dari `"petugas"` ke `"ppj"`
2. `getMe()` — tambah include `wilayahAssignments` dengan detail wilayah jika role QC/KUPT

#### [NEW] `src/controllers/guest.controller.ts`

```typescript
// GET /api/guest/map-data — public endpoint, tanpa auth
export const getGuestMapData = async (req, res) => {
  // Return tugas routes (koordinat only) + emergency markers
  // TIDAK return data sensitif (nama petugas, NIPP)
};
```

---

### Komponen 4: Backend Routes

#### [MODIFY] [admin.routes.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/routes/admin.routes.ts)

```typescript
// ── Read endpoints — admin, qc, kupt ──
router.get('/stats', requireAuth, requireAdminLike, getStats);
router.get('/petugas', requireAuth, requireAdminLike, getAllPetugas);
router.get('/tugas', requireAuth, requireAdminLike, getAllTugas);
router.get('/emergency', requireAuth, requireAdminLike, getAllEmergency);

// ── Write endpoints — admin + kupt only ──
router.get('/petugas/available', requireAuth, requireCanWrite, getAvailablePetugas);
router.post('/petugas/add', requireAuth, requireCanWrite, addPetugasToManager);
router.post('/petugas/remove', requireAuth, requireCanWrite, removePetugasFromManager);
router.post('/tugas', requireAuth, requireCanWrite, createTugas);
router.delete('/tugas/:id', requireAuth, requireCanWrite, deleteTugas);

// ── Account management — admin only ──
router.get('/users', requireAuth, requireAdmin, getAllUsers);
router.post('/users', requireAuth, requireAdmin, createUser);
router.patch('/users/:id', requireAuth, requireAdmin, updateUser);
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser);
router.get('/wilayah', requireAuth, requireAdmin, getAllWilayah);
```

#### [NEW] `src/routes/guest.routes.ts`

```typescript
// Public — no auth required
router.get('/map-data', getGuestMapData);
```

#### [MODIFY] [index.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/index.ts)

Tambah: `app.use('/api/guest', guestRoutes);`

---

### Komponen 5: Backend Seeder

#### [MODIFY] [seed-user.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/seed-user.ts)

1. **Migrate existing data**: Update semua user `role = 'petugas'` → `role = 'ppj'`
2. **Seed 12 wilayah** (JR 6.1 s/d JR 6.12) dengan mapping stasiun
3. **Seed user baru:**

| NIPP | Role | Nama | Password | Wilayah |
|------|------|------|----------|---------|
| `ADMIN-001` | admin | Admin Super | admin123 | — (all access) |
| `QC-A001` | qc | QC Region A | qc123 | JR 6.1, 6.2, 6.3, 6.4 |
| `QC-B001` | qc | QC Region B | qc123 | JR 6.5, 6.6, 6.7, 6.8 |
| `QC-C001` | qc | QC Region C | qc123 | JR 6.9, 6.10, 6.11, 6.12 |
| `KUPT-001` | kupt | KUPT Jenar | kupt123 | JR 6.1 |
| `KAI-1234` | ppj | Budi Santoso | password123 | — (managerId → ADMIN-001) |

4. **Seed `UserWilayah`** entries untuk QC & KUPT

---

### Komponen 6: Frontend Auth & Routing

#### [MODIFY] [AuthGuard.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/components/common/AuthGuard.tsx)

```
Route logic:
- /admin     → allowed for: admin, qc, kupt
- /inspeksi  → allowed for: ppj
- /guest     → public (no auth needed)
- /login, /register → public

Redirect map:
- admin/qc/kupt → /admin
- ppj → /inspeksi
- no token at /guest → allowed
- no token at anything else → /login
```

#### [MODIFY] [login/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/login/page.tsx)

Update redirect setelah login: `['admin','qc','kupt'].includes(role) ? '/admin' : '/inspeksi'`

#### [MODIFY] [register/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/register/page.tsx)

Sama — update redirect logic.

---

### Komponen 7: Frontend Admin Page

#### [MODIFY] [admin/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/admin/page.tsx)

**A. Sidebar — tambah menu ke-3 untuk Admin:**

Saat ini 2 menu: **Tugas** + **Live**. Perubahan:

| Menu | Admin | QC | KUPT |
|------|-------|-----|------|
| Tugas (penugasan) | ✅ Full CRUD | ✅ View only | ✅ CRUD scoped |
| Live (peta) | ✅ Semua PPJ | ✅ PPJ di wilayahnya | ✅ PPJ di wilayahnya |
| **Akun** (baru) | ✅ **CRUD user** | ❌ Hidden | ❌ Hidden |

Sidebar menu "Akun" (icon `manage_accounts`) hanya muncul jika `role === 'admin'`.

**B. Tab Akun UI (Admin Only) — panel baru:**

```
┌──────────────────────────────────────────────────┐
│ Kelola Akun Pengguna                             │
│ ─────────────────────────────────────────────     │
│ [+ Buat Akun Baru]                               │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ 🟢 QC-A001 — QC Region A (qc)               │ │
│ │    Wilayah: JR 6.1, 6.2, 6.3, 6.4           │ │
│ │    [Edit] [Nonaktifkan]                      │ │
│ ├──────────────────────────────────────────────┤ │
│ │ 🟢 KUPT-001 — KUPT Jenar (kupt)             │ │
│ │    Wilayah: JR 6.1                           │ │
│ │    [Edit] [Nonaktifkan]                      │ │
│ ├──────────────────────────────────────────────┤ │
│ │ 🟢 KAI-1234 — Budi Santoso (ppj)            │ │
│ │    Manager: Admin Super                      │ │
│ │    [Edit] [Nonaktifkan]                      │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Modal Buat/Edit Akun:**
- Field: NIPP, Nama, Password (opsional saat edit), Role dropdown (qc/kupt/ppj)
- Jika role = QC → multi-select wilayah
- Jika role = KUPT → single-select wilayah
- Jika role = PPJ → tidak perlu wilayah

**C. Role-based UI di view yang sudah ada:**

```typescript
const canWrite = role === 'admin' || role === 'kupt';
const isAdmin = role === 'admin';

// CRUD tugas & petugas
{canWrite && <button>Tugaskan Petugas</button>}
{canWrite && <button>Tambah Petugas</button>}

// Sidebar menu Akun
{isAdmin && <button>Akun</button>}
```

**D. Header badge per role:**
- Admin: `Portal Admin`
- QC: `Quality Control`
- KUPT: `KUPT`

**E. Dropdown stasiun di modal tugas — filtered per wilayah:**
- Admin → semua 15 stasiun
- KUPT → hanya stasiun di 1 wilayahnya

---

### Komponen 8: Frontend Guest Page (BARU)

#### [NEW] `src/app/guest/page.tsx`

Halaman publik (tanpa login) — full-screen peta read-only:
- Menggunakan `AdminMap` component
- Header: branding KAI + "Guest View" badge + link ke login
- Fetch data dari `GET /api/guest/map-data` (public endpoint)
- Menampilkan task routes + emergency markers
- **TIDAK** menampilkan data sensitif (nama petugas, NIPP)

---

### Komponen 9: Frontend Inspeksi/PPJ (Minimal)

#### [MODIFY] [inspeksi/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/inspeksi/page.tsx)

Perubahan minimal — PPJ live view sudah ada di `inspeksi/[id]/page.tsx` (DynamicMap menampilkan posisi GPS + track path). Hanya perlu ganti referensi `role === 'petugas'` → `role === 'ppj'`.

---

## Semua File yang Berubah

### Backend (9 files)
| File | Aksi | Deskripsi |
|------|------|-----------|
| [schema.prisma](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/prisma/schema.prisma) | MODIFY | + model Wilayah, UserWilayah, role default |
| [auth.middleware.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/middleware/auth.middleware.ts) | MODIFY | + requireRole, requireAdminLike, requireCanWrite |
| [admin.controller.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/admin.controller.ts) | MODIFY | Scoping per role + **CRUD akun endpoints** |
| [auth.controller.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/controllers/auth.controller.ts) | MODIFY | Default role ppj, getMe + wilayah |
| [admin.routes.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/routes/admin.routes.ts) | MODIFY | Split middleware + user CRUD routes |
| [index.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/src/index.ts) | MODIFY | Register guest routes |
| `src/controllers/guest.controller.ts` | NEW | Public map data endpoint |
| `src/routes/guest.routes.ts` | NEW | Route `/api/guest/*` |
| [seed-user.ts](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-backend/seed-user.ts) | MODIFY | Seed wilayah, QC, KUPT, migrate ppj |

### Frontend (5 files)
| File | Aksi | Deskripsi |
|------|------|-----------|
| [AuthGuard.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/components/common/AuthGuard.tsx) | MODIFY | Routing logic 5 role |
| [login/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/login/page.tsx) | MODIFY | Redirect logic |
| [register/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/register/page.tsx) | MODIFY | Redirect logic |
| [admin/page.tsx](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/ppj-kai-frontend/src/app/admin/page.tsx) | MODIFY | Role-based UI + **panel Akun baru** + sidebar menu ke-3 |
| `src/app/guest/page.tsx` | NEW | Halaman peta publik |

### Docs (1 file)
| File | Aksi | Deskripsi |
|------|------|-----------|
| [AGENTS.md](file:///e:/Semester%206/KAI%20Magang%20PT%202/PROJECT-PPJ-KAI/AGENTS.md) | MODIFY | Update role docs, akun default, routing |

---

## Verification Plan

### Automated Tests
```bash
# 1. Migrasi database
cd ppj-kai-backend
npx prisma db push && npx prisma generate

# 2. Seed data baru
npx tsx seed-user.ts

# 3. Build check
cd ppj-kai-frontend && npm run build
cd ppj-kai-backend && npx tsc --noEmit
```

### Manual Verification

**Login & Redirect:**
1. `ADMIN-001` → `/admin` → badge "Portal Admin" → 3 menu sidebar (Tugas, Live, Akun)
2. `QC-A001` → `/admin` → badge "QC" → 2 menu (Tugas, Live) → view only → data JR 6.1-6.4
3. `KUPT-001` → `/admin` → badge "KUPT" → 2 menu → bisa CRUD → data JR 6.1 only
4. `/guest` tanpa login → peta publik read-only
5. `KAI-1234` → `/inspeksi` → tracking normal → live view posisi sendiri

**CRUD Akun (Admin Only):**
6. Admin buat akun QC baru → assign wilayah → login berhasil
7. Admin edit akun KUPT → ubah wilayah → data berubah
8. Admin deactivate akun PPJ → user tidak bisa login

**Authorization (Negatif):**
9. QC coba `POST /admin/tugas` → 403
10. KUPT coba `POST /admin/users` → 403
11. Guest coba akses `/admin` → redirect
12. PPJ coba akses `/admin` → redirect ke `/inspeksi`

**Live View Scoping:**
13. Admin live view → muncul semua PPJ + task routes
14. QC A live view → hanya PPJ di JR 6.1-6.4
15. KUPT live view → hanya PPJ di JR 6.1
