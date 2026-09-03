'use strict';

require('react-app-polyfill/ie9');
require('react-app-polyfill/stable');

// React DOM's server renderer expects these Web APIs in the Jest environment.
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
