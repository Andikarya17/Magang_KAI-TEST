UPDATE `tugas_ppj` AS tugas
SET `status` = 'need_approval'
WHERE `status` = 'completed'
  AND EXISTS (
    SELECT 1
    FROM `tracking` AS hasil
    WHERE hasil.`tugas_id` = tugas.`id`
      AND hasil.`status` = 'stopped'
      AND hasil.`approval_status` <> 'approved'
  );
