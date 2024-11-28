
const { MakeWithdrawal, UserWithdrawals } = require('../controllers/withdrawalController')
const { UserMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.post('/make-withdrawal', UserMiddleware, MakeWithdrawal)
router.get('/user-withdrawals', UserMiddleware, UserWithdrawals)

module.exports = router