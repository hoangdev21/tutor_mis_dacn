const path = require('path');

// Serve favicon
const serveFavicon = (req, res, next) => {
  if (req.url === '/favicon.ico') {
    // Return 204 No Content to avoid cluttering console with 404 errors
    res.status(204).end();
    return;
  }
  next();
};

module.exports = { serveFavicon };