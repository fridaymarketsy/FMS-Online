function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = status < 500;
  return error;
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}\b/gi, '[REDACTED_KEY]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b((?:[A-Z0-9]+[_-])*(?:password|token|authorization|service[_-]?role[_-]?key|api[_-]?(?:key|secret)|secret|email|phone|username|full[_-]?name|surname))\s*([=:])\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1$2[REDACTED]')
    .replace(/\b(username|full_name|surname|phone|email)\)\s*=\s*\([^)]*\)/gi, '$1)=([REDACTED])')
    .replace(/\b\d{7,}\b/g, '[REDACTED_NUMBER]');
}

function logError(operation, error) {
  const source = error?.cause || error || {};
  const diagnostic = {
    operation,
    message: redactSensitiveText(source.message || error?.message || 'Unknown error'),
    name: redactSensitiveText(source.name || error?.name || 'Error'),
  };

  for (const field of ['code', 'details', 'hint']) {
    if (source[field] !== undefined && source[field] !== null) {
      diagnostic[field] = redactSensitiveText(source[field]);
    }
  }

  if (process.env.NODE_ENV === 'development' && source.stack) {
    diagnostic.stack = redactSensitiveText(source.stack);
  }

  console.error(JSON.stringify(diagnostic));
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { httpError, asyncHandler, logError, redactSensitiveText };
