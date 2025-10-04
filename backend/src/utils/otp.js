const crypto = require('crypto');

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - The OTP to hash
 * @returns {string} Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify OTP
 * @param {string} inputOTP - The OTP entered by user
 * @param {string} storedHashedOTP - The hashed OTP from database
 * @returns {boolean} True if OTP matches
 */
const verifyOTP = (inputOTP, storedHashedOTP) => {
  const hashedInput = hashOTP(inputOTP);
  return hashedInput === storedHashedOTP;
};

/**
 * Generate OTP expiry time (10 minutes from now)
 * @returns {Date} Expiry time
 */
const generateOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  generateOTPExpiry
};
