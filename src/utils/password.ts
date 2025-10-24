import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 * @param password - The plain text password
 * @param hashedPassword - The hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Validate password strength for express-validator
 * @param password - The password to validate
 * @returns True if valid, throws error if invalid
 */
export const validatePasswordStrength = (password: string): boolean => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }

  return true;
};

