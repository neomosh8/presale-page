import { createClient } from 'redis';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { action, token, contactMethod, contactValue } = req.body;
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Generate a new token
    if (action === 'create') {
      if (!contactMethod || !contactValue) {
        return res.status(400).json({ error: 'Missing contact information' });
      }
      
      const userKey = `${contactMethod}:${contactValue}`;
      
      // Create a random token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store token with 30-day expiration
      await redis.set(`token:${token}`, userKey, { EX: 60 * 60 * 24 * 30 });
      
      return res.status(200).json({ token });
    }
    
    // Validate an existing token
    if (action === 'validate') {
      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }
      
      const userKey = await redis.get(`token:${token}`);
      
      if (!userKey) {
        return res.status(401).json({ valid: false });
      }
      
      // Extract contact method and value
      const [contactMethod, contactValue] = userKey.split(':');
      
      // Extend token validity for another 30 days
      await redis.expire(`token:${token}`, 60 * 60 * 24 * 30);
      
      return res.status(200).json({ 
        valid: true, 
        user: { contactMethod, contactValue } 
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Token management error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}