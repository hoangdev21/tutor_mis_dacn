const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Tạo JWT token
const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

// Tạo Access Token
const generateAccessToken = (userId, role) => {
  return generateToken(
    { userId, role },
    process.env.JWT_SECRET,
    process.env.JWT_EXPIRE || '7d'
  );
};

// Tạo Refresh Token
const generateRefreshToken = (userId) => {
  return generateToken(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    process.env.JWT_REFRESH_EXPIRE || '30d'
  );
};

// Verify token
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Verify Access Token
const verifyAccessToken = (token) => {
  return verifyToken(token, process.env.JWT_SECRET);
};

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  return verifyToken(token, process.env.JWT_REFRESH_SECRET);
};

// Tạo random token cho email verification
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Tạo token và hash cho email verification
const generateEmailVerificationToken = () => {
  const token = generateRandomToken();
  const hashedToken = hashToken(token);
  
  return {
    token,
    hashedToken
  };
};

// Tạo password reset token
const generatePasswordResetToken = () => {
  const token = generateRandomToken();
  const hashedToken = hashToken(token);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
  
  return {
    token,
    hashedToken,
    expires
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashToken
};