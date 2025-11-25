import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/api';
import { Product } from '../types';
import ProductCard from './ProductCard';
import Logger from '../utils/logger';
import './ProductList.css';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      Logger.info('Loading products');
      const data = await productService.getAll();
      setProducts(data);
      Logger.info('Products loaded successfully', { count: data.length });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load products. Please try again.';
      setError(errorMessage);
      Logger.error('Error loading products', err, {
        component: 'ProductList',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    // Store cart items in localStorage for now
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cartItems.find((item: any) => item.product.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cartItems.push({ product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    alert(`${product.name} added to cart!`);
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="product-list-container">
        <div className="error-message">
          {error}
          <button onClick={loadProducts} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <h2>Products</h2>
        <button onClick={() => navigate('/cart')} className="view-cart-btn">
          View Cart
        </button>
      </div>
      
      {products.length === 0 ? (
        <p className="no-products">No products available.</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
