require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing SMTP connection...');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

console.log('\nAttempting to verify connection...');

transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection successful!');
    return transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: process.env.SMTP_USER,
      subject: 'Test Email from MyPeerCloud',
      text: 'If you receive this, SMTP is working correctly!',
    });
  })
  .then((info) => {
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SMTP Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);

    if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      console.log('\n🔥 This is a network/firewall issue:');
      console.log('1. Check Windows Firewall settings');
      console.log('2. Check antivirus software');
      console.log('3. Your ISP may be blocking SMTP ports');
      console.log('4. Try using port 465 with secure:true instead');
    }
    process.exit(1);
  });
