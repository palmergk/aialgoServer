const { CreateAccount, LoginAccount, GetProfile, UpdateProfile, VerifyOtp, ChangePasswordOnRequest, ContactFromUsers, DeleteAcount, UserWallet, Get_Admin_Cryptocurrency_And_Their_Wallets, DeleteProfilePhoto, VerifyEmailSignIn, SendOTP } = require('../controllers/userController')
const { UserMiddleware, AllMiddleware } = require('../middleware/auth')

const router = require('express').Router()

router.post('/create-account', CreateAccount)
router.post('/login-account', LoginAccount)
router.get('/profile', AllMiddleware, GetProfile)
router.put('/update-profile', AllMiddleware, UpdateProfile)
router.post('/verify-email', VerifyEmailSignIn)
router.post('/send-otp', SendOTP)
router.post('/verify-otp', VerifyOtp)
router.post('/change-password', ChangePasswordOnRequest)
router.post('/contact', ContactFromUsers)
router.put('/delete-profile-photo', AllMiddleware, DeleteProfilePhoto)
router.put('/delete-account', UserMiddleware, DeleteAcount)
router.get('/user-wallet', UserMiddleware, UserWallet)
router.get('/get_crypto_and_thier_wallets', UserMiddleware, Get_Admin_Cryptocurrency_And_Their_Wallets)

module.exports = router