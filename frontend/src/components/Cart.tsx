import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem } from '../types';
import './Cart.css';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const items = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(items);
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    const updatedItems = cartItems.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: Math.max(1, Math.min(item.product.stockQuantity, newQuantity)) };
      }
      return item;
    });
    setCartItems(updatedItems);
    localStorage.setItem('cart', JSON.stringify(updatedItems));
  };

  const removeItem = (productId: number) => {
    const updatedItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(updatedItems);
    localStorage.setItem('cart', JSON.stringify(updatedItems));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    navigate('/order');
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <h2>Shopping Cart</h2>
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <button onClick={() => navigate('/')} className="continue-shopping-btn">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h2>Shopping Cart</h2>
        <button onClick={() => navigate('/')} className="continue-shopping-btn">
          Continue Shopping
        </button>
      </div>

      <div className="cart-items">
        {cartItems.map((item) => (
          <div key={item.product.id} className="cart-item">
            <div className="cart-item-image">
              <img src={item.product.imageUrl} alt={item.product.name} />
            </div>
            
            <div className="cart-item-details">
              <h3>{item.product.name}</h3>
              <p className="cart-item-price">${item.product.price.toFixed(2)} each</p>
            </div>
            
            <div className="cart-item-quantity">
              <label>Quantity:</label>
              <input
                type="number"
                min="1"
                max={item.product.stockQuantity}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="cart-item-total">
              <p>${(item.product.price * item.quantity).toFixed(2)}</p>
            </div>
            
            <button 
              className="remove-item-btn"
              onClick={() => removeItem(item.product.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Subtotal ({cartItems.length} items):</span>
          <span className="cart-total">${calculateTotal().toFixed(2)}</span>
        </div>
        
        <div className="cart-actions">
          <button onClick={clearCart} className="clear-cart-btn">
            Clear Cart
          </button>
          <button onClick={handleCheckout} className="checkout-btn">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
