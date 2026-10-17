const { supabase } = require('../config/supabase');
const { httpError } = require('../utils/errors');

async function resolveUser(req) {
  const authorization = req.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw httpError(401, 'غير مصرح');
  return data.user;
}

async function requireAuth(req, _res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) throw httpError(401, 'سجّل الدخول');
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, _res, next) {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth, optionalAuth };
