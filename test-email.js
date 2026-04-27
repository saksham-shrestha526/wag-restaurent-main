import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('Testing email with domain: noreply@saksham-shrestha.com.np');
  console.log('API Key exists:', !!process.env.RESEND_API_KEY);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@saksham-shrestha.com.np',
      to: ['sakshamshrestha526@gmail.com'],  // Your verified email
      subject: 'Test Email',
      html: '<h1>Test</h1><p>If you see this, domain is working!</p>',
    });
    
    if (error) {
      console.error('❌ Error:', error);
      console.error('Error message:', error.message);
    } else {
      console.log('✅ Success:', data);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testEmail();