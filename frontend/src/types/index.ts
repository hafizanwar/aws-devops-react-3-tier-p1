export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  createdAt: string;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  quantity: number;
  price: number;
}

export interface Order {
  id?: number;
  customerEmail: string;
  totalAmount: number;
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt?: string;
  items: OrderItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Config {
  apiUrl: string;
  environment: string;
}
