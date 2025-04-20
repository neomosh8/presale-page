import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import { buffer } from 'micro';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

export const config = { api: { bodyParser: false } };
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const sess = event.data.object;
    const { orderId, user: userKey } = sess.metadata;
    
    const user = await kv.get(`user:${userKey}`);
    const order = await kv.get(`order:${orderId}`);

    const details = [
      `Thank you for your purchase!`,
      `Order ID: ${order.id}`,
      `Amount: $${order.amount.toFixed(2)}`,
      `Shipping to: ${order.shipping.address}, ${order.shipping.city}, ${order.shipping.country}`
    ].join('\n');

    if (user.contactMethod === 'sms') {
      await twClient.messages.create({
        body: details,
        to: user.contactValue,
        from: process.env.TWILIO_PHONE_NUMBER
      });
    } else {
      await sgMail.send({
        to: user.contactValue,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Your Order Details',
        text: details
      });
    }
  }

  res.json({ received: true });
}