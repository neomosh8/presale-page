// api/admin-auth.js
import { createClient } from 'redis';

// Simple admin credentials check - in a real app, you would use more secure methods
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Set this in environment variables

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { username, password } = req.body;
  
  // Validate credentials
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
  }
  
  // Generate simple admin token
  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Store admin token with 4-hour expiration
    await redis.set(`admin:${token}`, 'true', { EX: 60 * 60 * 4 });
    
    res.status(200).json({ 
      authenticated: true, 
      token,
      expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}
