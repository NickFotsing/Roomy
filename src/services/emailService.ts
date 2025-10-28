import nodemailer from 'nodemailer';
import config from '../config/config.js';

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.smtp.user,
    pass: config.email.smtp.password,
  },
});

/**
 * Send email
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content
 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration is invalid:', error);
    return false;
  }
};