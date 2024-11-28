
const { PayTax, UserTaxes } = require('../controllers/taxesController')
const { UserMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.post('/pay-tax', UserMiddleware, PayTax)
router.get('/user-taxes', UserMiddleware, UserTaxes)

module.exports = router