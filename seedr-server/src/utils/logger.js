const info = (...a) => console.log('[i]', ...a);
const warn = (...a) => console.warn('[!]', ...a);
const error = (...a) => console.error('[x]', ...a);
const debug = (...a) => console.log('[d]', ...a);
module.exports = { logger: { info, warn, error, debug } };
