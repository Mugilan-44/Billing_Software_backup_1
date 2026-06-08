import { v2 as cloudinary } from 'cloudinary';
import nodemailer from 'nodemailer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key:    process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

/**
 * Uploads a local PDF to Cloudinary
 * @param {string} filePath - Absolute path to the PDF file
 * @param {string} publicId - Optional public ID for the file
 * @returns {Promise<string>} - The secure URL of the uploaded PDF
 */
export const uploadPdfToCloudinary = async (filePath, publicId) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured in .env');
  }
  
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'raw', // Raw for non-image/video files like PDFs
    public_id: publicId,
    overwrite: true,
  });

  return result.secure_url;
};

/**
 * Sends an email using Nodemailer SMTP
 * @param {Object} mailOptions - { to, subject, text, html }
 */
export const sendSmtpEmail = async (mailOptions) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in .env');
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"Prolync Billing" <${user}>`,
    ...mailOptions,
  });

  return info;
};
