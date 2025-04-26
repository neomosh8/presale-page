// api/admin-delete-order.js
import { createClient } from 'redis';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  
  // Get admin token and order ID from headers and query
  const token = req.headers.authorization?.split(' ')[1];
  const { orderId } = req.query;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Verify admin token
    const isAdmin = await redis.get(`admin:${token}`);
    
    if (!isAdmin) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get the order data first so we can get the user key
    const orderData = await redis.get(`order:${orderId}`);
    
    if (!orderData) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = JSON.parse(orderData);
    const userKey = order.user;
    
    // Delete the order
    await redis.del(`order:${orderId}`);
    
    // Remove order from user's orders list
    if (userKey) {
      const userOrdersStr = await redis.get(`orders:${userKey}`);
      if (userOrdersStr) {
        const userOrders = JSON.parse(userOrdersStr);
        const updatedOrders = userOrders.filter(id => id !== orderId);
        await redis.set(`orders:${userKey}`, JSON.stringify(updatedOrders));
      }
    }
    
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}