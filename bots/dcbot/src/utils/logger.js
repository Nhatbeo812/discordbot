// src/utils/logger.js
// Logger đơn giản với timestamp và màu sắc (không cần thư viện ngoài)

const RESET  = '\x1b[0m';
const colors = {
  INFO:  '\x1b[36m',   // Cyan
  WARN:  '\x1b[33m',   // Yellow
  ERROR: '\x1b[31m',   // Red
  OK:    '\x1b[32m',   // Green
  DEBUG: '\x1b[90m',   // Gray
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, ...args) {
  const color = colors[level] ?? RESET;
  console.log(`${color}[${timestamp()}] [${level}]${RESET}`, ...args);
}

export const logger = {
  info:  (...a) => log('INFO',  ...a),
  warn:  (...a) => log('WARN',  ...a),
  error: (...a) => log('ERROR', ...a),
  ok:    (...a) => log('OK',    ...a),
  debug: (...a) => log('DEBUG', ...a),
};
