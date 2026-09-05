const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { signToken } = require('../utils/jwt')

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MIN_PASSWORD = 8

function toSession(user) {
  return { id: user._id.toString(), name: user.name, email: user.email }
}

async function register(req, res, next) {
  try {
    const name = (req.body.name ?? '').trim()
    const email = (req.body.email ?? '').trim().toLowerCase()
    const password = req.body.password ?? ''

    if (name.length < 2) {
      return res.status(400).json({ message: 'Enter the name your teammates will recognise on the board.' })
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'That email is missing an @ or a domain. Check it and try again.' })
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ message: `Use at least ${MIN_PASSWORD} characters for your password.` })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(409).json({ message: 'That email is already registered. Sign in instead.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, passwordHash })

    res.status(201).json({ token: signToken(user), user: toSession(user) })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const email = (req.body.email ?? '').trim().toLowerCase()
    const password = req.body.password ?? ''

    // Same response either way — don't reveal which half of the credentials was wrong.
    const rejection = () => res.status(401).json({ message: 'That email and password do not match an account.' })

    const user = await User.findOne({ email })
    if (!user) return rejection()

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return rejection()

    res.json({ token: signToken(user), user: toSession(user) })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login }
