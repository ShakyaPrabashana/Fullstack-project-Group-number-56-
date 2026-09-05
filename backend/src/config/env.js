const fs = require('fs')
const path = require('path')

// One env file for the whole stack, at the repository root. Resolved from
// __dirname rather than cwd, so it loads the same whether you run `npm run dev`
// from backend/ or `node backend/src/server.js` from the root.
const ENV_PATH = path.resolve(__dirname, '../../../.env.fullstack')

// dotenv does not overwrite variables that are already set, which is the
// behaviour we want: Docker Compose and GitHub Actions inject real values, and
// those must win over whatever happens to be in the local file.
require('dotenv').config({ path: ENV_PATH })

/**
 * Reads config, failing immediately with a readable message rather than letting
 * a missing key surface later as a confusing crash inside mongoose or jsonwebtoken.
 */
function loadEnv({ required = ['MONGO_URL', 'JWT_SECRET'] } = {}) {
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    const found = fs.existsSync(ENV_PATH)
    throw new Error(
      [
        `Missing required environment ${missing.length > 1 ? 'variables' : 'variable'}: ${missing.join(', ')}`,
        found
          ? `Add them to ${ENV_PATH}`
          : `No env file at ${ENV_PATH} — copy .env.fullstack.example to .env.fullstack and fill it in.`,
      ].join('\n'),
    )
  }

  return {
    mongoUrl: process.env.MONGO_URL,
    mongoUrlTest: process.env.MONGO_URL_TEST,
    jwtSecret: process.env.JWT_SECRET,
    port: Number(process.env.PORT) || 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
  }
}

module.exports = { loadEnv, ENV_PATH }
