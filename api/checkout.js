import { createClient } from 'redis';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { amount, contactMethod, contactValue, shipping } = req.body;

  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();

  try {
    // Create or update user
    const userKey = `${contactMethod}:${contactValue}`;
    let user = await redis.get(`user:${userKey}`);
    user = user ? JSON.parse(user) : null;
    
    if (!user) {
      user = { contactMethod, contactValue, created: new Date().toISOString() };
      await redis.set(`user:${userKey}`, JSON.stringify(user));
    }

    // Create order record
    const orderId = `order_${Date.now()}`;
    const order = { id: orderId, amount, shipping, created: new Date().toISOString(), user: userKey };
    await redis.set(`order:${orderId}`, JSON.stringify(order));

    // Append to user's order list
    let orders = await redis.get(`orders:${userKey}`);
    orders = orders ? JSON.parse(orders) : [];
    orders.push(orderId);
    await redis.set(`orders:${userKey}`, JSON.stringify(orders));

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'neocore OneSpark' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: { orderId, user: userKey }
    });

    res.status(200).json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Close Redis connection
    await redis.disconnect();
  }
}