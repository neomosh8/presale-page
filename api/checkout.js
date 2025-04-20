import Stripe from 'stripe';
import { KV } from '@vercel/kv';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { amount, contactMethod, contactValue, shipping } = req.body;
  const kv = new KV();

  // Create or update user
  const userKey = `${contactMethod}:${contactValue}`;
  let user = await kv.get(`user:${userKey}`);
  if (!user) {
    user = { contactMethod, contactValue, created: new Date().toISOString() };
    await kv.set(`user:${userKey}`, user);
  }

  // Create order record
  const orderId = `order_${Date.now()}`;
  const order = { id: orderId, amount, shipping, created: new Date().toISOString(), user: userKey };
  await kv.set(`order:${orderId}`, order);

  // Append to user’s order list
  let orders = (await kv.get(`orders:${userKey}`)) || [];
  orders.push(orderId);
  await kv.set(`orders:${userKey}`, orders);

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Awesome Product Pre‑Order' },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${req.headers.origin}/?success=true`,
    cancel_url:  `${req.headers.origin}/?canceled=true`,
    metadata: { orderId, user: userKey }
  });

  res.status(200).json({ sessionUrl: session.url });
}
