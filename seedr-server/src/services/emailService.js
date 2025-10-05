const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  // Initialize email transporter with SMTP settings
  init() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM_NAME,
      SMTP_FROM_EMAIL
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️  SMTP configuration not found. Email service will not work.');
      console.warn('⚠️  Please configure SMTP settings in .env file:');
      console.warn('   - SMTP_HOST (e.g., smtp.gmail.com)');
      console.warn('   - SMTP_PORT (e.g., 587)');
      console.warn('   - SMTP_SECURE (true/false)');
      console.warn('   - SMTP_USER (your email)');
      console.warn('   - SMTP_PASS (your app password)');
      console.warn('   - SMTP_FROM_NAME (optional, e.g., Seedr-Lite)');
      console.warn('   - SMTP_FROM_EMAIL (optional, defaults to SMTP_USER)');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    this.fromName = SMTP_FROM_NAME || 'Seedr-Lite';
    this.fromEmail = SMTP_FROM_EMAIL || SMTP_USER;

    console.log('✅ Email service initialized successfully');
  }

  // Send OTP verification email
  async sendOTPEmail(email, otp) {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set up SMTP settings.');
    }

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: email,
      subject: 'Verify your email - Seedr-Lite',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
              padding: 30px;
              color: white;
            }
            .otp-box {
              background: white;
              color: #333;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #667eea;
              margin: 10px 0;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Email Verification</h1>
            <p>Welcome to Seedr-Lite! To complete your registration, please verify your email address.</p>

            <div class="otp-box">
              <p style="margin: 0; color: #666;">Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; color: #666; font-size: 14px;">This code will expire in 10 minutes</p>
            </div>

            <p>If you didn't request this code, please ignore this email.</p>

            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Seedr-Lite. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Seedr-Lite!

        Your email verification code is: ${otp}

        This code will expire in 10 minutes.

        If you didn't request this code, please ignore this email.
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully to:', email, otp);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw new Error('Failed to send verification email. Please try again later.');
    }
  }

  // Verify SMTP connection
  async verifyConnection() {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton
const emailService = new EmailService();
module.exports = emailService;
