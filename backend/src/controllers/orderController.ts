import { Request, Response } from 'express';
import { orderModel } from '../models/order';
import { Logger } from '../middleware/logging';

export class OrderController {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData = req.body;
      const order = await orderModel.create(orderData);

      Logger.info('Order created successfully', {
        request_id: req.requestId,
        order_id: order.id,
        customer_email: orderData.customer_email,
      });

      res.status(201).json(order);
    } catch (error) {
      Logger.error('Error creating order', error, {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
      });
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Insufficient stock')) {
          res.status(400).json({ 
            error: 'Failed to create order',
            message: error.message,
            request_id: req.requestId,
          });
          return;
        }
      }

      res.status(500).json({ 
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: req.requestId,
      });
    }
  }

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const order = await orderModel.findById(id);

      if (!order) {
        Logger.warn('Order not found', {
          request_id: req.requestId,
          order_id: id,
        });
        res.status(404).json({ 
          error: 'Order not found',
          request_id: req.requestId,
        });
        return;
      }

      // Get order items
      const items = await orderModel.getOrderItems(id);

      res.json({
        ...order,
        items,
      });
    } catch (error) {
      Logger.error('Error fetching order', error, {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        order_id: req.params.id,
      });
      res.status(500).json({ 
        error: 'Failed to fetch order',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: req.requestId,
      });
    }
  }
}

export const orderController = new OrderController();
