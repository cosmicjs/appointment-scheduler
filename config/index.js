// const env = process.env.NODE_ENV || 'development'
// const config = require('./' + env)
// module.exports = config

const path = require('path');
// console.log("path", path);

// if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const env = require('dotenv').config({path: '.env'});
// console.log("env: ", env);

const configPath = path.join(__dirname, '..', 'config/production');
// console.log("configPath: ", configPath);

const configObj = require(configPath);
// console.log("configObj: ", configObj);

const config = configObj[env];
// console.log("config: ", config);

module.exports = configObj