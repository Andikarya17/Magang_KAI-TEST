import { Router } from 'express';
import { startTracking, updateTracking, stopTracking, getActiveTracking, createNearbyWarning, getNearbyWarnings } from '../controllers/tracking.controller';
import { getCurrentTrainAlerts } from '../controllers/trainSchedule.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/train-alerts', requireRole('ppj'), getCurrentTrainAlerts);
router.post('/warnings', requireRole('ppj'), createNearbyWarning);
router.get('/warnings/nearby', requireRole('ppj'), getNearbyWarnings);
router.get('/active/:tugasId', getActiveTracking);
router.post('/start/:tugasId', startTracking);
router.post('/update/:id', updateTracking);
router.post('/stop/:id', stopTracking);

export default router;
