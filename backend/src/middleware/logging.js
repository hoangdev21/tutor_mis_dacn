const ActivityLog = require('../models/ActivityLog');

// Extract device/browser info from user agent
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  
  // Detect OS
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'MacOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  // Detect browser
  let browser = 'Unknown';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';
  
  // Detect device
  let device = 'Desktop';
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';
  
  return { device, browser, os };
};

// Main logging middleware - logs all API requests
const requestLogger = async (req, res, next) => {
  // Skip logging for certain paths
  const skipPaths = ['/health', '/api-docs', '/uploads', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Capture response
  const originalSend = res.send;
  let responseBody;
  
  res.send = function(data) {
    responseBody = data;
    originalSend.apply(res, arguments);
  };
  
  // Log after response
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const userAgent = req.get('user-agent') || '';
      const { device, browser, os } = parseUserAgent(userAgent);
      
      // Determine log type based on endpoint
      let logType = 'system';
      let action = `${req.method} ${req.path}`;
      let resource = 'system';
      
      if (req.path.startsWith('/api/auth')) {
        logType = 'auth';
        resource = 'user';
      } else if (req.path.includes('/user')) {
        logType = 'user';
        resource = 'user';
      } else if (req.path.includes('/booking')) {
        logType = 'booking';
        resource = 'booking';
      } else if (req.path.includes('/transaction') || req.path.includes('/financial')) {
        logType = 'transaction';
        resource = 'transaction';
      } else if (req.path.includes('/blog')) {
        logType = 'blog';
        resource = 'blog';
      } else if (req.path.includes('/message')) {
        logType = 'message';
        resource = 'message';
      } else if (req.path.includes('/support')) {
        logType = 'support';
        resource = 'ticket';
      } else if (req.path.includes('/admin')) {
        logType = 'admin';
        resource = 'system';
      }
      
      // Determine severity based on status code
      let severity = 'info';
      let status = 'success';
      
      if (res.statusCode >= 500) {
        severity = 'error';
        status = 'failed';
      } else if (res.statusCode >= 400) {
        severity = 'warning';
        status = 'failed';
      }
      
      // Build description
      let description = `${req.method} request to ${req.path}`;
      if (req.user) {
        description = `${req.user.email} made ${req.method} request to ${req.path}`;
      }
      
      // Create log data
      const logData = {
        type: logType,
        action,
        user: req.user?._id,
        userRole: req.user?.role,
        resource,
        description,
        severity,
        status,
        metadata: {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration
        },
        request: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent,
          device,
          browser,
          os
        }
      };
      
      // Only log important requests or errors
      const shouldLog = 
        res.statusCode >= 400 || // Log all errors
        req.method !== 'GET' || // Log all non-GET requests
        req.path.includes('/admin') || // Log all admin requests
        req.path.includes('/auth'); // Log all auth requests
      
      // Only log if we have a valid user (avoid guest role issue)
      if (shouldLog && req.user && req.user.role) {
        await ActivityLog.logActivity(logData);
      }
      
    } catch (error) {
      // Silently fail - don't interrupt the request
      console.error('Request logging error:', error);
    }
  });
  
  next();
};

// Specific action loggers
const logAuth = async (action, userId, userRole, status, metadata = {}) => {
  try {
    await ActivityLog.logActivity({
      type: 'auth',
      action,
      user: userId,
      userRole,
      resource: 'user',
      description: `User ${action}`,
      severity: status === 'success' ? 'info' : 'warning',
      status,
      metadata
    });
  } catch (error) {
    console.error('Auth logging error:', error);
  }
};

const logUserAction = async (action, userId, userRole, targetUserId, description, metadata = {}) => {
  try {
    await ActivityLog.logActivity({
      type: 'user',
      action,
      user: userId,
      userRole,
      resource: 'user',
      resourceId: targetUserId,
      description,
      severity: 'info',
      status: 'success',
      metadata: {
        ...metadata,
        targetUser: targetUserId
      }
    });
  } catch (error) {
    console.error('User action logging error:', error);
  }
};

const logBookingAction = async (action, userId, userRole, bookingId, description, metadata = {}) => {
  try {
    await ActivityLog.logActivity({
      type: 'booking',
      action,
      user: userId,
      userRole,
      resource: 'booking',
      resourceId: bookingId,
      description,
      severity: 'info',
      status: 'success',
      metadata
    });
  } catch (error) {
    console.error('Booking action logging error:', error);
  }
};

const logTransaction = async (action, userId, userRole, transactionId, amount, description, metadata = {}) => {
  try {
    await ActivityLog.logActivity({
      type: 'transaction',
      action,
      user: userId,
      userRole,
      resource: 'transaction',
      resourceId: transactionId,
      description,
      severity: 'info',
      status: 'success',
      metadata: {
        ...metadata,
        amount
      }
    });
  } catch (error) {
    console.error('Transaction logging error:', error);
  }
};

const logAdminAction = async (action, adminId, description, metadata = {}, severity = 'info') => {
  try {
    await ActivityLog.logActivity({
      type: 'admin',
      action,
      user: adminId,
      userRole: 'admin',
      resource: 'system',
      description,
      severity,
      status: 'success',
      metadata
    });
  } catch (error) {
    console.error('Admin action logging error:', error);
  }
};

const logError = async (error, req, additionalInfo = {}) => {
  try {
    const userAgent = req?.get('user-agent') || '';
    const { device, browser, os } = parseUserAgent(userAgent);
    
    await ActivityLog.logActivity({
      type: 'error',
      action: 'system_error',
      user: req?.user?._id,
      userRole: req?.user?.role || 'guest',
      resource: 'system',
      description: error.message || 'An error occurred',
      severity: 'error',
      status: 'failed',
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack,
        endpoint: req?.path,
        method: req?.method,
        ...additionalInfo
      },
      request: {
        ip: req?.ip,
        userAgent,
        device,
        browser,
        os
      }
    });
  } catch (err) {
    console.error('Error logging error:', err);
  }
};

const logSecurityEvent = async (event, severity, req, metadata = {}) => {
  try {
    const userAgent = req?.get('user-agent') || '';
    const { device, browser, os } = parseUserAgent(userAgent);
    
    await ActivityLog.logActivity({
      type: 'security',
      action: event,
      user: req?.user?._id,
      userRole: req?.user?.role || 'guest',
      resource: 'system',
      description: `Security event: ${event}`,
      severity,
      status: 'success',
      metadata,
      request: {
        ip: req?.ip,
        userAgent,
        device,
        browser,
        os
      }
    });
  } catch (error) {
    console.error('Security logging error:', error);
  }
};

module.exports = {
  requestLogger,
  logAuth,
  logUserAction,
  logBookingAction,
  logTransaction,
  logAdminAction,
  logError,
  logSecurityEvent,
  parseUserAgent
};
