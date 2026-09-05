const { Router } = require('express')
const { requireAuth } = require('../middleware/auth')
const { list } = require('../controllers/resourceController')

const router = Router()

router.get('/', requireAuth, list)

module.exports = router
