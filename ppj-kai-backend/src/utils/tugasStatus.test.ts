import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTugasStatus } from './tugasStatus';

test('completed data lama tetap menunggu approval jika tracking belum approved', () => {
  assert.equal(resolveTugasStatus('completed', [{ status: 'stopped', approvalStatus: 'not_approved' }]), 'need_approval');
});

test('tugas need approval menjadi selesai jika tracking sudah approved', () => {
  assert.equal(resolveTugasStatus('need_approval', [{ status: 'stopped', approvalStatus: 'approved' }]), 'completed');
});

test('status perjalanan aktif dan status terminal lain tidak diubah', () => {
  assert.equal(resolveTugasStatus('in_progress', [{ status: 'started', approvalStatus: 'not_approved' }]), 'in_progress');
  assert.equal(resolveTugasStatus('missed', [{ status: 'stopped', approvalStatus: 'not_approved' }]), 'missed');
  assert.equal(resolveTugasStatus('cancelled', [{ status: 'stopped', approvalStatus: 'not_approved' }]), 'cancelled');
});
