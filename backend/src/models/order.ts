import { database } from '../services/database';
import { Order, OrderItem, CreateOrderRequest } from '../types';

export class OrderModel {
  async findById(id: number): Promise<Order | null> {
    const result = await database.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const result = await database.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );
    return result.rows;
  }

  async create(orderData: CreateOrderRequest): Promise<Order> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      // Calculate total amount
      let totalAmount = 0;
      const orderItems: { product_id: number; quantity: number; price: number }[] = [];

      for (const item of orderData.items) {
        const productResult = await client.query(
          'SELECT price, stock_quantity FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const product = productResult.rows[0];

        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}`);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_email, total_amount, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [orderData.customer_email, totalAmount, 'pending']
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.product_id, item.quantity, item.price]
        );

        // Update product stock
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const orderModel = new OrderModel();
