// api/admin-orders.js
import { createClient } from 'redis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  // Get admin token from headers
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
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
    
    // Get all keys that match order:*
    const orderKeys = await redis.keys('order:*');
    
    // Get all orders
    const orders = await Promise.all(
      orderKeys.map(async (key) => {
        const orderStr = await redis.get(key);
        return orderStr ? JSON.parse(orderStr) : null;
      })
    );
    
    // Filter out null values and sort by creation date (newest first)
    const validOrders = orders
      .filter(order => order !== null)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    // For each order, get user information
    const ordersWithUserInfo = await Promise.all(
      validOrders.map(async (order) => {
        if (!order.user) return order;
        
        const userStr = await redis.get(`user:${order.user}`);
        const user = userStr ? JSON.parse(userStr) : null;
        
        return {
          ...order,
          userDetails: user
        };
      })
    );
    
    res.status(200).json(ordersWithUserInfo);
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}
