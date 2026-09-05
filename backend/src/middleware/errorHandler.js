/* eslint-disable no-unused-vars -- Express only recognises a 4-arg function as an error handler. */
function errorHandler(err, req, res, next) {
  // A second registration racing the same email past the existence check still
  // hits this: the unique index is the real guarantee, the controller check is
  // just the friendly first line.
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That email is already registered.' })
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0].message })
  }

  console.error(err)
  res.status(err.status ?? 500).json({ message: err.message ?? 'Something went wrong.' })
}

module.exports = { errorHandler }
