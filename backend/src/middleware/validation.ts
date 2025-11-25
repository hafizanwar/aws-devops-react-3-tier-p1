import { Request, Response, NextFunction } from 'express';

export function validateProductCreation(req: Request, res: Response, next: NextFunction) {
  const { name, description, price, image_url, stock_quantity } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Product name is required and must be a non-empty string' });
  }

  if (name.length > 255) {
    return res.status(400).json({ error: 'Product name must not exceed 255 characters' });
  }

  if (description && typeof description !== 'string') {
    return res.status(400).json({ error: 'Product description must be a string' });
  }

  if (!price || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Product price is required and must be a positive number' });
  }

  if (image_url && typeof image_url !== 'string') {
    return res.status(400).json({ error: 'Product image_url must be a string' });
  }

  if (image_url && image_url.length > 512) {
    return res.status(400).json({ error: 'Product image_url must not exceed 512 characters' });
  }

  if (stock_quantity !== undefined && (typeof stock_quantity !== 'number' || stock_quantity < 0)) {
    return res.status(400).json({ error: 'Product stock_quantity must be a non-negative number' });
  }

  // Sanitize inputs
  req.body.name = name.trim();
  if (description) {
    req.body.description = description.trim();
  }
  if (image_url) {
    req.body.image_url = image_url.trim();
  }

  next();
}

export function validateProductId(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  req.params.id = id.toString();
  next();
}

export function validateOrderCreation(req: Request, res: Response, next: NextFunction) {
  const { customer_email, items } = req.body;

  // Validate customer email
  if (!customer_email || typeof customer_email !== 'string' || customer_email.trim().length === 0) {
    return res.status(400).json({ error: 'Customer email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customer_email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (customer_email.length > 255) {
    return res.status(400).json({ error: 'Customer email must not exceed 255 characters' });
  }

  // Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  // Validate each item
  for (const item of items) {
    if (!item.product_id || typeof item.product_id !== 'number' || item.product_id <= 0) {
      return res.status(400).json({ error: 'Each item must have a valid product_id' });
    }

    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ error: 'Each item must have a valid quantity greater than 0' });
    }
  }

  // Sanitize email
  req.body.customer_email = customer_email.trim().toLowerCase();

  next();
}

export function validateOrderId(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  req.params.id = id.toString();
  next();
}
