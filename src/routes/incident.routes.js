import express from 'express';
import { handleSMSReport, getReports } from '../controllers/incident.controller.js';

const router = express.Router();

router.post('/report', handleSMSReport);
router.get('/reports', getReports);

export default router;