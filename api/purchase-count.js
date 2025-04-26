// api/purchase-count.js
import { createClient } from 'redis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Get all keys that match order:*
    const orderKeys = await redis.keys('order:*');
    
    // Get all orders
    const orders = await Promise.all(
      orderKeys.map(async (key) => {
        const orderStr = await redis.get(key);
        return orderStr ? JSON.parse(orderStr) : null;
      })
    );
    
    // Filter for valid orders and count those that match the discounted price
    const discountedPrice = 299; // Your "Buy Now" price
    const buyNowCount = orders
      .filter(order => order !== null && order.amount === discountedPrice)
      .length;
    
    res.status(200).json({ 
      count: buyNowCount,
      maxSpots: parseInt(process.env.MAX_SPOTS || '10')
    });
  } catch (error) {
    console.error('Purchase count error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}