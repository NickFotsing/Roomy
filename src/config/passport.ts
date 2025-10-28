import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import config from './config.js';

const prisma = new PrismaClient();

// Configure Google OAuth strategy (only if credentials are provided)
if (config.google.clientId && config.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackUrl
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await prisma.user.findFirst({
      where: { googleId: profile.id }
    });

    if (user) {
      // User exists, transform to JWTPayload format
      const jwtUser = {
        userId: user.id,
        email: user.email,
        username: user.username
      };
      return done(null, jwtUser);
    }

    // Check if user exists with the same email
    const email = profile.emails?.[0]?.value;
    const existingUser = email ? await prisma.user.findUnique({
      where: { email }
    }) : null;

    if (existingUser) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: profile.id,
          isEmailVerified: true, // Auto-verify email for Google users
          emailVerifiedAt: new Date()
        }
      });
      const jwtUser = {
        userId: user.id,
        email: user.email,
        username: user.username
      };
      return done(null, jwtUser);
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email: profile.emails?.[0]?.value || '',
        username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        googleId: profile.id,
        isEmailVerified: true, // Auto-verify email for Google users
        emailVerifiedAt: new Date(),
        password: '' // Google users don't need a password
      }
    });

    const jwtUser = {
      userId: user.id,
      email: user.email,
      username: user.username
    };
    return done(null, jwtUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, false);
  }
  }));
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isEmailVerified: true,
        is2FAEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (user) {
      // Transform to match JWTPayload interface
      const jwtUser = {
        userId: user.id,
        email: user.email,
        username: user.username
      };
      done(null, jwtUser);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
});

export default passport;