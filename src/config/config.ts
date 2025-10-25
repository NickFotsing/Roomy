import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  
  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    },
    from: process.env.EMAIL_FROM || 'noreply@roomy.com',
  },
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Invites Configuration
  invites: {
    tokenSecret: process.env.INVITE_TOKEN_SECRET || 'default-invite-secret-change-in-production',
    tokenExpiration: process.env.INVITE_TOKEN_EXPIRATION || '24h',
  },
  
  // Token Expiration Settings
  passwordResetExpiration: parseInt(process.env.PASSWORD_RESET_EXPIRATION || '60'), // minutes
  emailVerificationExpiration: parseInt(process.env.EMAIL_VERIFICATION_EXPIRATION || '24'), // hours
  
  // Openfort Configuration (for future wallet integration)
  openfort: {
    apiKey: process.env.OPENFORT_API_KEY || process.env.OPENFORT_API_SECRET_KEY || process.env.OPENFORT_API_PUBLIC_KEY,
    secretKey: process.env.OPENFORT_API_SECRET_KEY,
    publicKey: process.env.OPENFORT_API_PUBLIC_KEY,
    environment: process.env.OPENFORT_ENVIRONMENT || 'testnet',
  },
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  if (config.nodeEnv === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️  Running in development mode with default values. Please set up your .env file.');
  }
}

export default config;