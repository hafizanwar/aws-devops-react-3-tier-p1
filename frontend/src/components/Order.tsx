import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/api';
import { CartItem, Order as OrderType, OrderItem } from '../types';
import Logger from '../utils/logger';
import './Order.css';

const Order: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('cart') || '[]');
    if (items.length === 0) {
      navigate('/cart');
    }
    setCartItems(items);
  }, [navigate]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderItems: OrderItem[] = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const order: OrderType = {
        customerEmail: email,
        totalAmount: calculateTotal(),
        items: orderItems,
      };

      Logger.info('Submitting order', {
        customer_email: email,
        total_amount: calculateTotal(),
        item_count: cartItems.length,
      });

      const createdOrder = await orderService.create(order);
      
      Logger.info('Order created successfully', {
        order_id: createdOrder.id,
        customer_email: email,
      });

      setOrderId(createdOrder.id || null);
      setSuccess(true);
      
      // Clear cart after successful order
      localStorage.removeItem('cart');
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create order. Please try again.';
      setError(errorMessage);
      Logger.error('Error creating order', err, {
        component: 'Order',
        customer_email: email,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="order-container">
        <div className="order-success">
          <h2>Order Placed Successfully!</h2>
          <p>Thank you for your order.</p>
          {orderId && <p>Order ID: <strong>#{orderId}</strong></p>}
          <p>A confirmation email has been sent to: <strong>{email}</strong></p>
          <button onClick={() => navigate('/')} className="continue-shopping-btn">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-container">
      <h2>Checkout</h2>
      
      <div className="order-content">
        <div className="order-summary">
          <h3>Order Summary</h3>
          <div className="order-items">
            {cartItems.map((item) => (
              <div key={item.product.id} className="order-item">
                <div className="order-item-info">
                  <span className="order-item-name">{item.product.name}</span>
                  <span className="order-item-quantity">x {item.quantity}</span>
                </div>
                <span className="order-item-price">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          
          <div className="order-total">
            <span>Total:</span>
            <span className="total-amount">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        <div className="order-form-section">
          <h3>Customer Information</h3>
          
          {error && (
            <div className="error-message">
              {error}
              <button onClick={handleRetry} style={{ marginLeft: '10px' }}>
                Retry
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitOrder} className="order-form">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={loading}
              />
              <small>Order confirmation will be sent to this email</small>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => navigate('/cart')} 
                className="back-to-cart-btn"
                disabled={loading}
              >
                Back to Cart
              </button>
              <button 
                type="submit" 
                className="place-order-btn"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Order;
