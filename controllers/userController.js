const slug = require('slug')
const fs = require('fs')
const User = require('../models').users
const Notification = require('../models').notifications
const Wallet = require('../models').wallets
const Up = require('../models').ups
const AdminStore = require('../models').admin_store
const TradingPlans = require('../models').trading_plans
const Crypto = require('../models').crypto
const AdminWallet = require('../models').admin_wallets
const jwt = require('jsonwebtoken')
const otpGenerator = require('otp-generator')
const Mailing = require('../config/emailDesign')
const moment = require('moment')
const { webName, webShort, webURL } = require('../utils/utils')
const { Op } = require('sequelize')


exports.CreateAccount = async (req, res) => {
    try {
        const { full_name, username, email, referral_code, country, country_flag, password, confirm_password } = req.body
        if (!full_name) return res.json({ status: 404, msg: `Your full name is required` })
        if (!username) return res.json({ status: 404, msg: `Username is required` })
        if (!email) return res.json({ status: 404, msg: `Email address is required` })
        if (!country) return res.json({ status: 404, msg: `Country is required` })
        if (!password) return res.json({ status: 404, msg: `Password is required` })
        if (password.length < 6) return res.json({ status: 404, msg: `Password must be at least 6 characters long` })
        if (!confirm_password) return res.json({ status: 404, msg: `Confirm password is required` })
        if (confirm_password !== password) return res.json({ status: 404, msg: `Passwords mismatch` })

        const findUsername = await User.findOne({ where: { username: username } })
        if (findUsername) return res.json({ status: 404, msg: `Username unavailable` })
        const findEmail = await User.findOne({ where: { email: email } })
        if (findEmail) return res.json({ status: 404, msg: `Email address already exists` })

        if (referral_code) {
            const findMyReferral = await User.findOne({ where: { referral_id: referral_code } })
            if (!findMyReferral) return res.json({ status: 404, msg: 'Invalid referral code' })
        }

        const profileImage = req?.files?.image
        const filePath = './public/profiles'
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, { recursive: true })
        }
        let imageName;
        if (profileImage) {
            if (profileImage.size >= 1000000) return res.json({ status: 404, msg: `Image size too large, file must not exceed 1mb` })
            if (!profileImage.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
            imageName = `${slug(username, '-')}.jpg`
            await profileImage.mv(`${filePath}/${imageName}`)
        }

        const myReferralId = 'AI_' + otpGenerator.generate(8, { specialChars: false })

        const user = await User.create({
            image: profileImage ? imageName : null,
            full_name,
            username,
            email,
            password,
            country,
            country_flag: country_flag ? country_flag : null,
            referral_id: myReferralId,
            my_referral: referral_code ? referral_code : null
        })

        await Wallet.create({
            user: user.id
        })

        await Notification.create({
            user: user.id,
            title: `welcome ${username}`,
            content: `Welcome to ${webName} where we focus on making cryptocurrency trading easy. Get started by making your first deposit.`,
            URL: '/dashboard/deposit',
        })

        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super admin'] } } })
        if (admins) {
            admins.map(async ele => {

                await Notification.create({
                    user: ele.id,
                    title: `${user.username} joins ${webShort}`,
                    content: `Hello Admin, you have a new user as ${user.username} joins the platform.`,
                    URL: '/admin-controls/users',
                })

                Mailing({
                    subject: 'New User Alert',
                    eTitle: `New user joins ${webShort}`,
                    eBody: `
                     <div>Hello admin, you have a new user as ${user.username} joins ${webName} today ${moment(user.createdAt).format('DD-MM-yyyy')} / ${moment(user.createdAt).format('h:mma')}.</div> 
                    `,
                    account: ele.dataValues,
                })

            })
        }

        const otp = otpGenerator.generate(6, { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false })

        Mailing({
            subject: 'Email Verification Code',
            eTitle: `Your email verification code`,
            eBody: `
             <div style="font-size: 2rem">${otp}</div>
             <div style="margin-top: 1.5rem">This code can only be used once. If you didn't request a code, please ignore this email. Never share this code with anyone else.</div>
            `,
            account: user,
        })

        user.resetcode = otp
        await user.save()

        const adminStore = await AdminStore.findOne({
        })
        if (!adminStore) {
            await AdminStore.create({
            })
        }

        return res.json({ status: 200, msg: 'Account creation successful' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.VerifyEmailSignIn = async (req, res) => {
    try {
        const { email, code } = req.body
        if (!email || !code) return res.json({ status: 404, msg: 'Incomplete request found' })

        const findAccount = await User.findOne({ where: { email: email } })
        if (!findAccount) return res.json({ status: 404, msg: `No account belongs to this email` })
        if (code !== findAccount.resetcode) return res.json({ status: 404, msg: 'Invalid code entered' })

        findAccount.resetcode = null
        findAccount.email_verified = 'true'
        await findAccount.save()

        const token = jwt.sign({ id: findAccount.id, role: findAccount.role }, process.env.JWT_SECRET, { expiresIn: '10h' })

        Mailing({
            subject: `Welcome To ${webShort}`,
            eTitle: `Welcome ${findAccount.username}`,
            eBody: `
             <div>Welcome to ${webName} where we focus on making cryptocurrency trading easy. Get started by making your first <a href='${webURL}/dashboard/deposit' style="text-decoration: underline; color: #E96E28">deposit</a>.</div>
            `,
            account: findAccount,
        })

        return res.json({ status: 200, token })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.LoginAccount = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) return res.json({ status: 404, msg: `Incomplete request` })

        const findEmail = await User.findOne({ where: { email: email } })
        if (!findEmail) return res.json({ status: 400, msg: `No account belongs to the email` })
        if (password !== findEmail.password) return res.json({ status: 404, msg: `Incorrect password entered` })

        const findIfSuspended = await User.findOne({ where: { id: findEmail.id, suspend: 'true' } })
        if (findIfSuspended) return res.json({ status: 400, msg: `Your account has been suspended, kindly contact support team` })

        const findIfDeleted = await User.findOne({ where: { id: findEmail.id, account_deletion: 'true' } })
        if (findIfDeleted) return res.json({ status: 400, msg: `This account was deactivated, kindly contact support team for possible reactivation` })

        const token = jwt.sign({ id: findEmail.id, role: findEmail.role }, process.env.JWT_SECRET, { expiresIn: '10h' })

        return res.json({ status: 200, msg: `Login successful`, token })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.SendOTP = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) return res.json({ status: 404, msg: `Provide your email address` })

        const findAccount = await User.findOne({ where: { email: email } })
        if (!findAccount) return res.json({ status: 404, msg: `No account belongs to this email` })

        const otp = otpGenerator.generate(6, { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false })

        Mailing({
            subject: 'Email Verification Code',
            eTitle: `Your email verification code`,
            eBody: `
             <div style="font-size: 2rem">${otp}</div>
             <div style="margin-top: 1.5rem">This code can only be used once. If you didn't request a code, please ignore this email. Never share this code with anyone else.</div>
            `,
            account: findAccount,
        })

        findAccount.resetcode = otp
        await findAccount.save()

        return res.json({ status: 200, msg: 'Verification code sent to email address' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.VerifyOtp = async (req, res) => {
    try {
        const { email, code } = req.body
        if (!email || !code) return res.json({ status: 404, msg: 'Incomplete request found' })

        const findAccount = await User.findOne({ where: { email: email } })
        if (!findAccount) return res.json({ status: 404, msg: `Account does not exists with us` })
        if (code !== findAccount.resetcode) return res.json({ status: 404, msg: 'Invalid code entered' })

        findAccount.resetcode = null
        findAccount.email_verified = 'true'
        await findAccount.save()

        return res.json({ status: 200, msg: findAccount })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.ChangePasswordOnRequest = async (req, res) => {
    try {
        const { email, password, confirm_password } = req.body
        if (!email || !password || !confirm_password) return res.json({ status: 404, msg: 'Incomplete request found' })

        if (confirm_password !== password) return res.json({ status: 400, msg: 'Passwords mismatch' })
        if (password.length < 6) return res.json({ status: 404, msg: `New Password must be at least six characters long` })

        const findAccount = await User.findOne({ where: { email: email } })
        if (!findAccount) return res.json({ status: 404, msg: `Account does not exists with us` })

        findAccount.password = password
        await findAccount.save()

        return res.json({ status: 200, msg: 'Password change successful' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.ContactFromUsers = async (req, res) => {
    try {
        const { email, subject, message } = req.body
        if (!email || !message) return res.json({ status: 404, msg: `Incomplete request found` })

        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super admin'] } } })
        if (admins) {
            admins.map(async ele => {

                Mailing({
                    subject: `Contact From ${webShort} User`,
                    eTitle: `${webShort} user sends message`,
                    eBody: `
                     <div><span style="font-style: italic; font-size: 0.85rem">from:</span><span style="padding-left: 1rem">${email}</span></div>
                     <div style="margin-top: 0.5rem"><span style="font-style: italic; font-size: 0.85rem;">subject:</span><span style="padding-left: 1rem">${subject ? subject : 'no subject'}</span></div>
                     <div style="margin-top: 1rem; font-style: italic; font-size: 0.85rem">message:</div>
                     <div style="margin-top: 0.5rem">${message}</div>
                    `,
                    account: ele.dataValues,
                })
            })
        }

        return res.json({ status: 200, msg: 'Message delivered' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.GetProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user);
        if (!user) return res.json({ status: 404, msg: `Account not found` });

        const myReferrals = await User.findAll({
            where: { my_referral: user.referral_id }
        });

        const details = {
            ...user.toJSON(),
            referrals: myReferrals.length
        };

        return res.json({ status: 200, msg: details });
    } catch (error) {
        res.json({ status: 500, msg: error.message });
    }
};

exports.UpdateProfile = async (req, res) => {
    try {
        const { full_name, username, email, old_password, new_password, facebook, instagram, twitter, telegram } = req.body

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'Account not found' })

        if (username) {
            if (username !== user.username) {
                const matchedSomeoneElse = await User.findOne({ where: { username: username } })
                if (matchedSomeoneElse) return res.json({ status: 404, msg: 'Username unavailable' })
                user.username = username
            }
        }

        if (email) {
            if (email !== user.email) {
                const matchedSomeoneElse = await User.findOne({ where: { email: email } })
                if (matchedSomeoneElse) return res.json({ status: 404, msg: 'Email entered already exists' })
                user.email = email
                user.email_verified = 'false'
            }
        }

        if (old_password) {
            if (user.password !== old_password) return res.json({ status: 404, msg: 'Incorrect old password' })
            if (!new_password) return res.json({ status: 404, msg: `Create a new password` })
        }

        if (new_password) {
            if (!old_password) return res.json({ status: 404, msg: `Enter your old password` })
            if (new_password.length < 6) return res.json({ status: 404, msg: `New Password must be at least six characters long` })
            user.password = new_password
        }

        if (full_name) {
            user.full_name = full_name
        }

        const image = req?.files?.image
        let imageName;
        const filePath = './public/profiles'
        const currentImagePath = `${filePath}/${user.image}`

        if (image) {
            if (image.size >= 1000000) res.json({ status: 404, msg: `Image size too large, file must not exceed 1mb` })
            if (!image.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })

            if (fs.existsSync(currentImagePath)) {
                fs.unlinkSync(currentImagePath)
            }
            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath, { recursive: true })
            }
            imageName = `${slug(username ? username : user.username, '-')}.jpg`
            await image.mv(`${filePath}/${imageName}`)
            user.image = imageName
        }

        await user.save()

        const adminStore = await AdminStore.findOne({
        })
        if (adminStore) {
            if (facebook) {
                adminStore.facebook = facebook
            }
            if (instagram) {
                adminStore.instagram = instagram
            }
            if (twitter) {
                adminStore.twitter = twitter
            }
            if (telegram) {
                adminStore.telegram = telegram
            }
        }
        await adminStore.save()

        return res.json({ status: 200, msg: 'Profile updated', user: user, store: adminStore })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.DeleteProfilePhoto = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'Account not found' })
        if (!user.image) return res.json({ status: 404, msg: 'Profile image not found' })

        const profileImage = `./public/profiles/${user.image}`
        if (fs.existsSync(profileImage)) {
            fs.unlinkSync(profileImage)
        }
        user.image = null
        await user.save()

        return res.json({ status: 200, msg: 'Profile image deleted', user: user })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.DeleteAcount = async (req, res) => {
    try {
        const { password } = req.body
        if (!password) return res.json({ status: 404, msg: 'Password is required' })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'Account not found' })
        if (password !== user.password) return res.json({ status: 404, msg: `Incorrect password entered` })

        user.account_deletion = 'true'
        await user.save()

        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super admin'] } } })
        if (admins) {
            admins.map(async ele => {
                await Notification.create({
                    user: ele.id,
                    title: `${user.username} leaves ${webShort}`,
                    content: `Hello Admin, ${user.username} leaves ${webName} as trader deletes account.`,
                    URL: '/admin-controls/users',
                })

                Mailing({
                    subject: 'User Deletes Account',
                    eTitle: `User leaves ${webShort}`,
                    eBody: `
                     <div>Hello admin, ${user.username} leaves ${webName} as trader deletes account today ${moment().format('DD-MM-yyyy')} / ${moment().format('h:mma')}.</div> 
                    `,
                    account: ele.dataValues,
                })
            })
        }

        return res.json({ status: 200, msg: 'Account deletion successful' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.UserWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ where: { user: req.user } })
        if (!wallet) return res.json({ status: 404, msg: 'User wallet not found' })

        let altups = {}
        const ups = await Up.findOne({ where: { user: req.user } })
        if (ups) {
            altups = ups
        }

        let altTR = {}
        const testRunPlan = await TradingPlans.findOne({ where: { title: 'test run' } })
        if (testRunPlan) {
            altTR = testRunPlan
        }

        return res.json({ status: 200, msg: wallet, ups: altups, testRun: altTR })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.Get_Admin_Cryptocurrency_And_Their_Wallets = async (req, res) => {
    try {
        const crypto_and_wallets = await Crypto.findAll({
            include: [
                {
                    model: AdminWallet,
                    as: 'cryptoWallet',
                },
            ],
        })

        return res.json({ status: 200, msg: crypto_and_wallets })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}