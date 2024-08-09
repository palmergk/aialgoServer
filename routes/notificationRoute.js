
const { GetUserNotifications, DeleteNotification, UpdateAllNotifications, UpdateSingleNotifications, UnreadNotifications, GetAdminNotifications, AdminUnreadNotifications, UpdateAdminNotifications, UpdateAdminSingleNotifications } = require('../controllers/notificationController')
const { UserMiddleware, AdminMiddleware } = require('../middleware/auth')



const router = require('express').Router()

router.get('/user-notifications', UserMiddleware, GetUserNotifications)
router.get('/admin-notifications', AdminMiddleware, GetAdminNotifications)
router.get('/unread-notis', UserMiddleware, UnreadNotifications)
router.get('/admin-unread-notis', AdminMiddleware, AdminUnreadNotifications)
router.post('/delete-notification', UserMiddleware, DeleteNotification)
router.put('/update-all', UserMiddleware, UpdateAllNotifications)
router.put('/update-admin-all', AdminMiddleware, UpdateAdminNotifications)
router.put('/update-single', UserMiddleware, UpdateSingleNotifications)
router.put('/update-admin-single', AdminMiddleware, UpdateAdminSingleNotifications)


module.exports = router