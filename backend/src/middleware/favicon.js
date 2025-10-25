const path = require('path');

// Serve favicon
const serveFavicon = (req, res, next) => {
  if (req.url === '/favicon.ico') {
    res.status(204).end();
    return;
  }
  next();
};

module.exports = { serveFavicon };