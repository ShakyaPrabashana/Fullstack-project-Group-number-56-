const jwt = require('jsonwebtoken')

const EXPIRES_IN = '7d'

/** Payload carries what the UI needs, so a valid token never needs a DB round trip. */
function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: EXPIRES_IN },
  )
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

module.exports = { signToken, verifyToken }
