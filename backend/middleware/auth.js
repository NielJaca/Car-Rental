const path = require('path');
const fs = require('fs');
const debugLogPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');

function debugLog(payload) {
  try {
    fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
    const line = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
    fs.appendFileSync(debugLogPath, line, { flag: 'a' });
  } catch (_) {}
}

const requireAdmin = (req, res, next) => {
  const hasSession = !!req.session;
  const hasAdminId = !!(req.session && req.session.adminId);
  if (req.session && req.session.adminId) {
    return next();
  }
  // #region agent log
  debugLog({ hypothesisId: 'H4,H5', location: 'auth.js:requireAdmin-reject', message: 'Auth failed - no session/adminId', data: { path: req.path, origin: req.get('origin') || 'none', host: req.get('host'), forwardedProto: req.get('x-forwarded-proto'), hasSession, hasAdminId, cookieHeader: req.get('cookie') ? 'present' : 'absent' } });
  // #endregion
  res.status(401).json({ error: 'Unauthorized' });
};

module.exports = { requireAdmin };
