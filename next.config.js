const path = require('path');

module.exports = {
  // ... rest of your config ...
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};