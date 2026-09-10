type TaskApprovalState = {
  status: string;
  tracking?: readonly { status: string; approvalStatus: string }[];
};

/** Frontend guard untuk respons backend/data lama sebelum status need_approval tersedia. */
export function resolveTugasStatus<T extends TaskApprovalState>(tugas: T): T {
  if (tugas.status !== 'completed' && tugas.status !== 'need_approval') return tugas;

  const latestTracking = tugas.tracking?.[0];
  if (latestTracking?.status !== 'stopped') return tugas;

  const status = latestTracking.approvalStatus === 'approved' ? 'completed' : 'need_approval';
  return status === tugas.status ? tugas : { ...tugas, status };
}
