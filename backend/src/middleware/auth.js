const { verifyToken } = require('../utils/jwt')

/** Protects a route: valid Bearer token required, or the request never reaches the controller. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Sign in to do that.' })
  }

  try {
    req.user = verifyToken(token) // { id, name, email }
    next()
  } catch {
    res.status(401).json({ message: 'Your session has expired or is invalid. Sign in again.' })
  }
}

module.exports = { requireAuth }
