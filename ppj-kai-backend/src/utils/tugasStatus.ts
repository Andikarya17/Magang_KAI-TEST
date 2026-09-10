type ApprovalTracking = {
  status: string;
  approvalStatus: string;
};

/**
 * Menjaga kompatibilitas data lama yang sudah berstatus completed sebelum
 * alur need_approval ditambahkan. Tracking terbaru menjadi sumber kebenaran.
 */
export function resolveTugasStatus(taskStatus: string, tracking: readonly ApprovalTracking[] | undefined): string {
  if (taskStatus !== 'completed' && taskStatus !== 'need_approval') return taskStatus;

  const latestTracking = tracking?.[0];
  if (latestTracking?.status !== 'stopped') return taskStatus;

  return latestTracking.approvalStatus === 'approved' ? 'completed' : 'need_approval';
}
