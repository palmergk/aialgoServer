const { CreateDeposit, UserDeposits} = require('../controllers/depositControllers')
const { UserMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.post('/create-deposit', UserMiddleware, CreateDeposit)
router.get('/user-deposits', UserMiddleware, UserDeposits)

module.exports = router