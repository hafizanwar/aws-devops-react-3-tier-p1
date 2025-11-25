import { Router } from 'express';
import { healthController } from '../controllers/healthController';

const router = Router();

router.get('/health', (req, res) => healthController.healthCheck(req, res));

export default router;
