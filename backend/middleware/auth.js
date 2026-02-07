const path = require('path');
const fs = require('fs');
const debugLogPath = path.join(process.cwd(), '.cursor', 'debug.log');
let getValidateAdminToken;

function debugLog(payload) {
  try {
    fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
    const line = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
    fs.appendFileSync(debugLogPath, line, { flag: 'a' });
  } catch (_) {}
}

function setTokenValidator(fn) {
  getValidateAdminToken = fn;
}

const requireAdmin = (req, res, next) => {
  const hasSession = !!req.session;
  const hasAdminId = !!(req.session && req.session.adminId);
  if (req.session && req.session.adminId) {
    return next();
  }
  const auth = req.get('authorization');
  const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (bearer && getValidateAdminToken && getValidateAdminToken(bearer)) {
    return next();
  }
  // #region agent log
  const d = { path: req.path, origin: req.get('origin') || 'none', host: req.get('host'), forwardedProto: req.get('x-forwarded-proto'), hasSession, hasAdminId, cookieHeader: req.get('cookie') ? 'present' : 'absent', bearerPresent: !!bearer, userAgent: req.get('user-agent')?.slice(0, 60) };
  debugLog({ hypothesisId: 'H4,H5', location: 'auth.js:requireAdmin-reject', message: 'Auth failed - no session/adminId', data: d });
  console.log('[session] auth failed', d.path, d.cookieHeader, d.bearerPresent, d.origin);
  // #endregion
  res.status(401).json({ error: 'Unauthorized' });
};

module.exports = { requireAdmin, setTokenValidator };
