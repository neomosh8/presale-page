import { createClient } from 'redis';
import crypto from 'crypto';

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
    
    // Get or create user
    let user = await redis.get(`user:${userKey}`);
    if (!user) {
      user = { contactMethod, contactValue, created: new Date().toISOString() };
      await redis.set(`user:${userKey}`, JSON.stringify(user));
    } else {
      user = JSON.parse(user);
    }
    
    // Get user's orders
    let ordersStr = await redis.get(`orders:${userKey}`);
    const ordersKeys = ordersStr ? JSON.parse(ordersStr) : [];
    
    const orders = await Promise.all(
      ordersKeys.map(async (id) => {
        const orderStr = await redis.get(`order:${id}`);
        return orderStr ? JSON.parse(orderStr) : null;
      })
    );
    
    // Generate auth token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token with 30-day expiration
    await redis.set(`token:${token}`, userKey, { EX: 60 * 60 * 24 * 30 });
    
    res.status(200).json({
      user: { contactMethod, contactValue },
      orders: orders.filter(order => order !== null),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Close Redis connection
    await redis.disconnect();
  }
}