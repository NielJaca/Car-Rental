let getValidateAdminToken;

function setTokenValidator(fn) {
  getValidateAdminToken = fn;
}

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  const auth = req.get('authorization');
  const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (bearer && getValidateAdminToken && getValidateAdminToken(bearer)) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

module.exports = { requireAdmin, setTokenValidator };
