import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../services/api';
import { Product } from '../types';
import Logger from '../utils/logger';
import './ProductDetail.css';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (id) {
      loadProduct(parseInt(id));
    }
  }, [id]);

  const loadProduct = async (productId: number) => {
    try {
      setLoading(true);
      setError(null);
      Logger.info('Loading product details', { product_id: productId });
      const data = await productService.getById(productId);
      setProduct(data);
      Logger.info('Product details loaded successfully', { product_id: productId });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load product details. Please try again.';
      setError(errorMessage);
      Logger.error('Error loading product details', err, {
        component: 'ProductDetail',
        product_id: productId,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cartItems.find((item: any) => item.product.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cartItems.push({ product, quantity });
    }
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    alert(`${quantity} x ${product.name} added to cart!`);
  };

  if (loading) {
    return <div className="loading">Loading product details...</div>;
  }

  if (error) {
    return (
      <div className="product-detail-container">
        <div className="error-message">
          {error}
          <button onClick={() => id && loadProduct(parseInt(id))} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Products
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container">
        <p>Product not found.</p>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate('/')} className="back-btn">
        ← Back to Products
      </button>
      
      <div className="product-detail">
        <div className="product-detail-image">
          <img src={product.imageUrl} alt={product.name} />
        </div>
        
        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-detail-price">${product.price.toFixed(2)}</p>
          
          <div className="product-detail-description">
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>
          
          <div className="product-detail-stock">
            <p>
              <strong>Availability:</strong>{' '}
              {product.stockQuantity > 0 
                ? `${product.stockQuantity} in stock` 
                : 'Out of stock'}
            </p>
          </div>
          
          {product.stockQuantity > 0 && (
            <div className="product-detail-actions">
              <div className="quantity-selector">
                <label htmlFor="quantity">Quantity:</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={product.stockQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stockQuantity, parseInt(e.target.value) || 1)))}
                />
              </div>
              <button onClick={handleAddToCart} className="add-to-cart-detail-btn">
                Add to Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
