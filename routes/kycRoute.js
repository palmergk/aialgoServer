
const { UserKYC, Create_Update_KYC } = require('../controllers/kycController')
const { UserMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.get('/user-kyc', UserMiddleware, UserKYC)
router.post('/create-update-kyc', UserMiddleware, Create_Update_KYC)

module.exports = router