import { database } from '../services/database';
import { Product } from '../types';

export class ProductModel {
  async findAll(): Promise<Product[]> {
    const result = await database.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async findById(id: number): Promise<Product | null> {
    const result = await database.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const result = await database.query(
      `INSERT INTO products (name, description, price, image_url, stock_quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product.name, product.description, product.price, product.image_url, product.stock_quantity]
    );
    return result.rows[0];
  }
}

export const productModel = new ProductModel();
