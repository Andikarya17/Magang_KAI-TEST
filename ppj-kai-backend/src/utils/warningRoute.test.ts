import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectWarningRecipients } from './warningRoute';

const now = new Date();
const route = { startPointName: 'Sta. A', endPointName: 'Sta. B', startPointLat: -7, startPointLong: 110, endPointLat: -7, endPointLong: 111 };
const sender = { userId: 1, latitude: -7, longitude: 110.5 };
const candidate = (id: number, longitude: number) => ({ id, userId: id, latitude: -7, longitude, updatedAt: now, tugas: route });

test('selects one nearest PPJ on each side even beyond 1 km', () => {
  assert.deepEqual(selectWarningRecipients(sender, route, [candidate(2, 110.4), candidate(3, 110.2), candidate(4, 110.6), candidate(5, 110.8)], now).sort(), [2, 4]);
});

test('ignores sender, stale GPS, invalid GPS, and different routes; allows reversed station names', () => {
  const reversed = { ...candidate(6, 110.7), tugas: { ...route, startPointName: 'B', endPointName: 'A' } };
  const result = selectWarningRecipients(sender, route, [
    candidate(1, 110.51),
    { ...candidate(2, 110.52), updatedAt: new Date(now.getTime() - 120001) },
    { ...candidate(3, 110.53), latitude: NaN },
    { ...candidate(4, 110.54), tugas: { ...route, endPointName: 'C' } },
    reversed,
  ], now);
  assert.deepEqual(result, [6]);
});

test('one occupied side yields only one recipient; duplicate sessions use latest position', () => {
  assert.deepEqual(selectWarningRecipients(sender, route, [candidate(2, 110.6), candidate(3, 110.7)], now), [2]);
  assert.deepEqual(selectWarningRecipients(sender, route, [candidate(2, 110.6), { ...candidate(3, 110.4), userId: 2, updatedAt: new Date(now.getTime() - 1000) }], now), [2]);
});

test('invalid route direction produces no recipient', () => {
  assert.deepEqual(selectWarningRecipients(sender, { ...route, endPointLong: 110 }, [candidate(2, 110.6)], now), []);
});
