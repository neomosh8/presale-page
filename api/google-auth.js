// api/google-auth.js
import { createClient } from 'redis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

// Create a new OAuth client with your Google client ID
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ error: 'ID token is required' });
  }
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;
    
    // Check if user exists by email
    const emailKey = `email:${email}`;
    let user = await redis.get(`user:${emailKey}`);
    
    if (!user) {
      // Create new user
      user = {
        contactMethod: 'email',
        contactValue: email,
        name,
        googleId,
        picture,
        created: new Date().toISOString()
      };
      
      // Save the user
      await redis.set(`user:${emailKey}`, JSON.stringify(user));
    } else {
      // Parse existing user
      user = JSON.parse(user);
      
      // Update Google ID if not present
      if (!user.googleId) {
        user.googleId = googleId;
        user.name = name || user.name;
        user.picture = picture || user.picture;
        await redis.set(`user:${emailKey}`, JSON.stringify(user));
      }
    }
    
    // Get user's orders
    let ordersStr = await redis.get(`orders:${emailKey}`);
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
    await redis.set(`token:${token}`, emailKey, { EX: 60 * 60 * 24 * 30 });
    
    // Check if phone number exists
    const needsPhone = !user.phone;
    
    res.status(200).json({
      user,
      orders: orders.filter(order => order !== null),
      token,
      needsPhone
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}