import { createClient } from 'redis';
import Stripe from 'stripe';
import { buffer } from 'micro';
import sgMail from '@sendgrid/mail';

export const config = { api: { bodyParser: false } };
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    // Initialize Redis client
    const redis = createClient({
      url: process.env.REDIS_URL,
    });
    await redis.connect();
    
    try {
      const sess = event.data.object;
      const { orderId, user: userKey } = sess.metadata;
      
      const userStr = await redis.get(`user:${userKey}`);
      const orderStr = await redis.get(`order:${orderId}`);
      
      if (!userStr || !orderStr) {
        throw new Error('User or order not found');
      }
      
      const user = JSON.parse(userStr);
      const order = JSON.parse(orderStr);

      console.log(`Processing order ${orderId} for user ${userKey}`);
      
      // Determine recipient email
      // First try shipping email, then check if contact value is an email, otherwise fallback to admin
      let recipientEmail;
      
      if (order.shipping && order.shipping.email) {
        recipientEmail = order.shipping.email;
      } else if (user.contactMethod === 'email') {
        recipientEmail = user.contactValue;
      } else if (user.contactValue && user.contactValue.includes('@')) {
        // It's possible contact value is an email even if method is 'sms'
        recipientEmail = user.contactValue;
      } else {
        // Extract email from shipping phone field if it happens to contain an email
        const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;
        const phoneEmail = order.shipping && order.shipping.phone && order.shipping.phone.match(emailRegex);
        
        if (phoneEmail) {
          recipientEmail = phoneEmail[0];
        } else {
          // Last resort - send to an admin address
          recipientEmail = process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL;
          console.log(`No recipient email found, sending to admin: ${recipientEmail}`);
        }
      }
      
      console.log(`Sending order confirmation email to: ${recipientEmail}`);

      // Send email using SendGrid template
      try {
        if (!process.env.SENDGRID_ORDER_TEMPLATE_ID) {
          throw new Error('SendGrid template ID not configured');
        }
        
        await sgMail.send({
          to: recipientEmail,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: "Your OneSpark Order Confirmation", 
          template_id: process.env.SENDGRID_ORDER_TEMPLATE_ID,
          dynamic_template_data: {
            order_id: order.id,
            amount: order.amount.toFixed(2),
            date: new Date().toLocaleString(),
            customer_name: order.shipping.name || '',
            address_line1: order.shipping.address || '',
            address_city: order.shipping.city || '',
            address_country: order.shipping.country || '',
            phone: order.shipping.phone || '',
            email: recipientEmail,
            items: [
              {
                name: "OneSpark",
                price: `$${order.amount.toFixed(2)}`,
                image_url: "https://sitecontent.s3.us-east-1.amazonaws.com/Neocore_onespark_shop.png"
              }
            ]
          }
        });
        
        console.log('Order confirmation email sent successfully');
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
    } finally {
      // Close Redis connection
      await redis.disconnect();
    }
  }

  res.json({ received: true });
}