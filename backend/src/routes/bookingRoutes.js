const { Router } = require('express')
const { requireAuth } = require('../middleware/auth')
const { list, create, remove } = require('../controllers/bookingController')

const router = Router()

router.get('/', requireAuth, list)
router.post('/', requireAuth, create)
router.delete('/:id', requireAuth, remove)

module.exports = router
