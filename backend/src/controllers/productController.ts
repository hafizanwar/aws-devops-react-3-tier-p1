import { Request, Response } from 'express';
import { productModel } from '../models/product';
import { Logger } from '../middleware/logging';

export class ProductController {
  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await productModel.findAll();
      res.json(products);
    } catch (error) {
      Logger.error('Error fetching products', error, {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
      });
      res.status(500).json({ 
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: req.requestId,
      });
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await productModel.findById(id);

      if (!product) {
        Logger.warn('Product not found', {
          request_id: req.requestId,
          product_id: id,
        });
        res.status(404).json({ 
          error: 'Product not found',
          request_id: req.requestId,
        });
        return;
      }

      res.json(product);
    } catch (error) {
      Logger.error('Error fetching product', error, {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        product_id: req.params.id,
      });
      res.status(500).json({ 
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: req.requestId,
      });
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, price, image_url, stock_quantity } = req.body;

      const product = await productModel.create({
        name,
        description: description || '',
        price,
        image_url: image_url || '',
        stock_quantity: stock_quantity || 0,
      });

      Logger.info('Product created successfully', {
        request_id: req.requestId,
        product_id: product.id,
      });

      res.status(201).json(product);
    } catch (error) {
      Logger.error('Error creating product', error, {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
      });
      res.status(500).json({ 
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: req.requestId,
      });
    }
  }
}

export const productController = new ProductController();
