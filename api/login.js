import { createClient } from 'redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { contactMethod, contactValue } = req.body;
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    const userKey = `${contactMethod}:${contactValue}`;
    let ordersStr = await redis.get(`orders:${userKey}`);
    const ordersKeys = ordersStr ? JSON.parse(ordersStr) : [];
    
    const orders = await Promise.all(
      ordersKeys.map(async (id) => {
        const orderStr = await redis.get(`order:${id}`);
        return orderStr ? JSON.parse(orderStr) : null;
      })
    );
    
    res.status(200).json({
      user: { contactMethod, contactValue },
      orders: orders.filter(order => order !== null)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Close Redis connection
    await redis.disconnect();
  }
}