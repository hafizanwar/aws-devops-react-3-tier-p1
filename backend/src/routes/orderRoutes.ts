import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { validateOrderCreation, validateOrderId } from '../middleware/validation';

const router = Router();

router.post('/orders', validateOrderCreation, (req, res) => orderController.createOrder(req, res));
router.get('/orders/:id', validateOrderId, (req, res) => orderController.getOrderById(req, res));

export default router;
