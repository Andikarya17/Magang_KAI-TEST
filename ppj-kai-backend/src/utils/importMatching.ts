type Station = { name: string };

function normalizeUnicode(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
}

/** NIPP tetap mempertahankan tanda baca, tetapi mengabaikan kapital dan semua spasi. */
export function normalizeNipp(value: string): string {
  return normalizeUnicode(value).replace(/\s+/g, '').toUpperCase();
}

/**
 * Nama stasiun mengabaikan kapital, spasi, tanda baca, dan prefiks "Sta/Stasiun".
 * Contoh: " STA.  Solo Balapan " dan "solo-balapan" menjadi "solobalapan".
 */
export function normalizeStationName(value: string): string {
  return normalizeUnicode(value)
    .toLowerCase()
    .trim()
    .replace(/^(?:stasiun|sta)\b[\s.:-]*/u, '')
    .replace(/[^a-z0-9]/g, '');
}

export function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[right.length]!;
}

export type StationMatch<T extends Station> = {
  station: T;
  distance: number;
};

export type ImportTimeResult =
  | { valid: true; value: string | null }
  | { valid: false; value: null };

function formatImportTime(hours: number, minutes: number): ImportTimeResult {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { valid: false, value: null };
  }
  return {
    valid: true,
    value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

function parseNumericImportTime(value: number): ImportTimeResult {
  if (!Number.isFinite(value) || value < 0) return { valid: false, value: null };

  // Nilai waktu asli Excel adalah pecahan satu hari.
  if (value < 1) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    return formatImportTime(Math.floor(totalMinutes / 60), totalMinutes % 60);
  }

  // Input angka biasa seperti 8, 8.5, 800, atau 1630.
  if (value <= 23) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return minutes === 60 ? formatImportTime(hours + 1, 0) : formatImportTime(hours, minutes);
  }
  if (Number.isInteger(value) && value >= 100 && value <= 2359) {
    return formatImportTime(Math.floor(value / 100), value % 100);
  }

  // Beberapa workbook menyimpan tanggal dan jam dalam satu serial Excel.
  if (!Number.isInteger(value)) {
    return parseNumericImportTime(value - Math.floor(value));
  }

  return { valid: false, value: null };
}

/**
 * Excel menyimpan jam yang diketik pengguna sebagai pecahan satu hari
 * (misalnya 08:00 menjadi 0.333333...). Template bawaan memakai teks, sehingga
 * Format jam yang lazim diketik pengguna (08:00, 08.00, 800, dan 8) juga
 * diterima agar perubahan langsung di workbook tidak membuat import gagal.
 */
export function parseImportTime(value: unknown): ImportTimeResult {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: true, value: null };
  }

  if (typeof value === 'number') {
    return parseNumericImportTime(value);
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return {
      valid: true,
      value: `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`,
    };
  }

  const text = String(value).trim().replace(/\s*(?:WIB|WITA|WIT)\s*$/i, '');
  const separated = text.match(/^(\d{1,2})[.:](\d{2})(?::\d{2})?$/);
  if (separated) return formatImportTime(Number(separated[1]), Number(separated[2]));

  // Angka yang oleh Excel tersimpan sebagai teks tetap diproses seperti angka.
  if (/^\d+(?:[.,]\d+)?$/.test(text)) {
    return parseNumericImportTime(Number(text.replace(',', '.')));
  }

  return { valid: false, value: null };
}

/**
 * Mengembalikan satu kandidat stasiun yang paling dekat. Kandidat dengan skor seri
 * ditolak agar typo tidak menyebabkan penugasan ke stasiun yang ambigu.
 */
export function findStationMatch<T extends Station>(input: string, stations: readonly T[]): StationMatch<T> | null {
  const normalizedInput = normalizeStationName(input);
  if (!normalizedInput) return null;

  const ranked = stations
    .map(station => ({
      station,
      distance: levenshteinDistance(normalizedInput, normalizeStationName(station.name)),
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = ranked[0];
  if (!best) return null;

  // Maksimal dua edit untuk nama panjang, satu edit untuk nama pendek.
  const maxDistance = Math.min(2, Math.max(1, Math.floor(normalizedInput.length * 0.2)));
  if (best.distance > maxDistance) return null;
  if (ranked[1]?.distance === best.distance) return null;

  return best;
}
