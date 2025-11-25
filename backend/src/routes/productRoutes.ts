import { Router } from 'express';
import { productController } from '../controllers/productController';
import { validateProductCreation, validateProductId } from '../middleware/validation';

const router = Router();

router.get('/products', (req, res) => productController.getAllProducts(req, res));
router.get('/products/:id', validateProductId, (req, res) => productController.getProductById(req, res));
router.post('/products', validateProductCreation, (req, res) => productController.createProduct(req, res));

export default router;
