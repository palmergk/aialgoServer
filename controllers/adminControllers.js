const User = require('../models').users
const Investment = require('../models').investments
const Deposit = require('../models').deposits
const Notification = require('../models').notifications
const Withdrawal = require('../models').withdrawals
const Wallet = require('../models').wallets
const Crypto = require('../models').crypto
const AdminWallet = require('../models').admin_wallets
const TradingPlans = require('../models').trading_plans
const AdminStore = require('../models').admin_store
const Tax = require('../models').taxes
const Kyc = require('../models').kyc
const fs = require('fs')
const slug = require('slug')
const otpGenerator = require('otp-generator')
var cron = require('node-cron');
const moment = require('moment')
const Mailing = require('../config/emailDesign')
const { webShort, webURL, webName } = require('../utils/utils')
const { Op } = require('sequelize')



exports.AllDeposits = async (req, res) => {
    try {
        const deposits = await Deposit.findAll({
            include: [
                {
                    model: User,
                    as: 'depositUser',
                    attributes: {
                        exclude: ['password', 'createdAt', 'updatedAt', 'role']
                    }
                },
            ],

            order: [['createdAt', 'DESC']]
        })

        return res.json({ status: 200, msg: deposits })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UpdateDeposits = async (req, res) => {
    try {
        const { status, deposit_id } = req.body
        if (!deposit_id) return res.json({ status: 404, msg: `Provide a deposit id` })

        const deposit = await Deposit.findOne({ where: { id: deposit_id } })
        if (!deposit) return res.json({ status: 400, msg: 'Deposit not found' })

        const depositUser = await User.findOne({ where: { id: deposit.user } })
        if (!depositUser) return res.json({ status: 400, msg: 'Deposit User not found' })

        if (deposit.status !== 'pending') return res.json({ status: 400, msg: 'Deposit already updated' })

        if (status === 'confirmed') {

            const wallet = await Wallet.findOne({ where: { user: deposit.user } })
            if (!wallet) return res.json({ status: 404, msg: `User wallet not found` })

            wallet.total_deposit += deposit.amount
            wallet.balance += deposit.amount
            await wallet.save()

            deposit.status = status
            await deposit.save()

            await Notification.create({
                user: deposit.user,
                title: `deposit confirmed`,
                content: `Your deposit amount of $${deposit.amount.toLocaleString()} confirmed. See wallet for your current balance.`,
                URL: '/dashboard',
            })

            await Mailing({
                subject: `Deposit Confirmation`,
                eTitle: `Deposit confirmed`,
                eBody: `
                      <div>Hello ${depositUser.username}, your deposit amount of $${deposit.amount.toLocaleString()} made on ${moment(deposit.createdAt).format('DD-MM-yyyy')} / ${moment(deposit.createdAt).format('h:mm')} has been successfully confirmed. See your current balance <a href='${webURL}/dashboard/deposit' style="text-decoration: underline; color: #E96E28">here</a></div>
                    `,
                account: depositUser
            })

            const UserConfirmedDeposits = await Deposit.findAll({ where: { user: deposit.user, status: 'confirmed' } })
            if (UserConfirmedDeposits.length === 1) {
                const findMyReferral = await User.findOne({ where: { referral_id: depositUser.my_referral } })

                if (findMyReferral) {
                    const myReferralWallet = await Wallet.findOne({ where: { user: findMyReferral.id } })

                    if (myReferralWallet) {
                        const adminStore = await AdminStore.findOne({
                        })

                        if (adminStore) {
                            const referralBonus = deposit.amount * adminStore.referral_bonus_percentage / 100

                            myReferralWallet.referral += parseFloat(referralBonus.toFixed(1))
                            myReferralWallet.balance += parseFloat(referralBonus.toFixed(1))
                            await myReferralWallet.save()

                            await Notification.create({
                                user: findMyReferral.id,
                                title: `referral bonus`,
                                content: `Your wallet has been credited with $${referralBonus.toLocaleString()}, ${adminStore.referral_bonus_percentage}% commission on your referral ${depositUser.username} first deposit. Thank you for introducing more people to ${webShort}.`,
                                URL: '/dashboard',
                            })

                            await Mailing({
                                subject: `Referral Bonus`,
                                eTitle: `Referral bonus credited`,
                                eBody: `
                                      <div>Hello ${findMyReferral.username}, your wallet has been credited with $${referralBonus.toLocaleString()}, ${adminStore.referral_bonus_percentage}% commission on your referral <span style="font-style: italic">${depositUser.username}</span> first deposit. Thank you for introducing more people to ${webShort}.</div>
                                    `,
                                account: findMyReferral
                            })
                        }
                    }
                }
            }
        }

        if (status === 'failed') {

            deposit.status = status
            await deposit.save()

            await Notification.create({
                user: deposit.user,
                title: `deposit failed`,
                content: `Your deposit amount of $${deposit.amount.toLocaleString()} confirmation failed. This deposit was not confirmed.`,
                status: 'failed',
                URL: '/dashboard/deposit?screen=2',
            })

            await Mailing({
                subject: `Deposit Failed`,
                eTitle: `Deposit failed`,
                eBody: `
                      <div>Hello ${depositUser.username}, your deposit amount of $${deposit.amount.toLocaleString()} made on ${moment(deposit.createdAt).format('DD-MM-yyyy')} / ${moment(deposit.createdAt).format('h:mm')} confirmation failed, this deposit was not confirmed. Did you make this deposit? File a complaint <a href='${webURL}/dashboard/feedback' style="text-decoration: underline; color: #E96E28">here</a></div>
                    `,
                account: depositUser
            })
        }

        return res.json({ status: 200, msg: 'Deposit updated successfully' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.AllInvestments = async (req, res) => {
    try {
        const investments = await Investment.findAll({
            include: [
                {
                    model: User,
                    as: 'investmentUser',
                    attributes: {
                        exclude: ['password', 'createdAt', 'updatedAt', 'role']
                    }
                },
            ],

            order: [['createdAt', 'DESC']]
        })

        return res.json({ status: 200, msg: investments })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UpdateInvestments = async (req, res) => {
    try {
        const { status, investment_id, profit, bonus, } = req.body
        if (!investment_id) return res.json({ status: 404, msg: `Provide an investment id` })

        const investment = await Investment.findOne({ where: { id: investment_id } })
        if (!investment) return res.json({ status: 400, msg: 'Investment not found' })

        const investmentUser = await User.findOne({ where: { id: investment.user } })
        if (!investmentUser) return res.json({ status: 400, msg: 'Investment User not found' })

        if (investment.status === 'running') {

            if (status === 'completed') {

                await Notification.create({
                    user: investment.user,
                    title: `profit completed`,
                    content: `Profits for your $${investment.amount.toLocaleString()} ${investment.trading_plan} plan investment is completed and ready to claim.`,
                    URL: '/dashboard/investment',
                })

                await Mailing({
                    subject: `Investment Profit Completed`,
                    eTitle: `Investment profit completed`,
                    eBody: `
                      <div>Hello ${investmentUser.username}, your investment of $${investment.amount.toLocaleString()} ${investment.trading_plan} plan made on ${moment(investment.createdAt).format('DD-MM-yyyy')} / ${moment(investment.createdAt).format('h:mm')} profit generation is completed. You can see total profit generated and claim to your wallet <a href='${webURL}/dashboard/investment' style="text-decoration: underline; color: #E96E28">here</a></div>
                    `,
                    account: investmentUser
                })
            }

            investment.status = status
        }

        if (profit) {
            if (isNaN(profit)) return res.json({ status: 404, msg: `Enter a number` })
            investment.profit += profit
        }
        if (bonus) {
            if (isNaN(bonus)) return res.json({ status: 404, msg: `Enter a number` })
            investment.bonus += bonus
        }
        await investment.save()

        return res.json({ status: 200, msg: 'Investment updated successfully' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.AllWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.findAll({
            include: [
                {
                    model: User,
                    as: 'wthUser',
                    attributes: {
                        exclude: ['password', 'createdAt', 'updatedAt', 'role']
                    }
                },
            ],

            order: [['createdAt', 'DESC']]
        })

        return res.json({ status: 200, msg: withdrawals })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UpdateWithdrawals = async (req, res) => {
    try {
        const { status, message, withdrawal_id } = req.body
        if (!withdrawal_id) return res.json({ status: 404, msg: `Provide a withdrawal id` })

        const withdrawal = await Withdrawal.findOne({ where: { id: withdrawal_id } })
        if (!withdrawal) return res.json({ status: 400, msg: 'Withdrawal not found' })

        const withdrawalUser = await User.findOne({ where: { id: withdrawal.user } })
        if (!withdrawalUser) return res.json({ status: 400, msg: 'Withdrawal user not found' })

        if (withdrawal.status === 'processing') {

            if (status === 'confirmed') {

                await Notification.create({
                    user: withdrawal.user,
                    title: `withdrawal confirmed`,
                    content: `Your withdrawal amount of $${withdrawal.amount.toLocaleString()} for wallet address ${withdrawal.withdrawal_address?.slice(0, 5)}....${withdrawal.withdrawal_address?.slice(-10)} has been successfully processed.`,
                    URL: '/dashboard/withdraw?screen=2',
                })

                await Mailing({
                    subject: `Withdrawal Confirmation`,
                    eTitle: `Withdrawal confirmed`,
                    eBody: `
                      <div>Hello ${withdrawalUser.username}, your withdrawal of $${withdrawal.amount.toLocaleString()} made on ${moment(withdrawal.createdAt).format('DD-MM-yyyy')} / ${moment(withdrawal.createdAt).format('h:mm')} for wallet address ${withdrawal.withdrawal_address} has been confirmed.</div>
                    `,
                    account: withdrawalUser
                })

            }

            withdrawal.status = status
            await withdrawal.save()
        }

        if (message) {

            await Notification.create({
                user: withdrawal.user,
                title: `Support Team`,
                content: message,
                URL: '/dashboard/tax-payment',
            })

            await Mailing({
                subject: `Support Team`,
                eTitle: `Withdrawal notice`,
                eBody: `
                  <div>${message}</div>
                `,
                account: withdrawalUser
            })

        }

        return res.json({ status: 200, msg: 'Withdrawal updated successfully' })
    } catch (error) {
        return res.json({ status: 200, msg: error.message })
    }
}

exports.AllTaxes = async (req, res) => {
    try {
        const taxes = await Tax.findAll({
            include: [
                {
                    model: User,
                    as: 'taxPayer',
                    attributes: {
                        exclude: ['password', 'createdAt', 'updatedAt', 'role']
                    }
                },
            ],

            order: [['createdAt', 'DESC']]
        })

        return res.json({ status: 200, msg: taxes })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UpdateTaxes = async (req, res) => {
    try {
        const { status, tax_id } = req.body
        if (!tax_id) return res.json({ status: 404, msg: `Provide a tax id` })

        const tax = await Tax.findOne({ where: { id: tax_id } })
        if (!tax) return res.json({ status: 400, msg: 'tax not found' })

        const taxPayer = await User.findOne({ where: { id: tax.user } })
        if (!taxPayer) return res.json({ status: 400, msg: 'Tax Payer not found' })

        if (tax.status !== 'processing') return res.json({ status: 400, msg: 'Tax payment already updated' })

        if (status === 'confirmed') {

            await Notification.create({
                user: tax.user,
                title: `tax payment confirmed`,
                content: `Your tax payment amount of $${tax.amount.toLocaleString()} confirmed and the tax cleared.`,
                URL: '/dashboard/tax-payment?screen=2',
            })

            await Mailing({
                subject: `Tax Payment Confirmation`,
                eTitle: `Tax payment confirmed`,
                eBody: `
                      <div>Hello ${taxPayer.username}, your tax payment amount of $${tax.amount.toLocaleString()} made on ${moment(tax.createdAt).format('DD-MM-yyyy')} / ${moment(tax.createdAt).format('h:mm')} has been confirmed and the tax cleared.</div>
                    `,
                account: taxPayer
            })

        }

        if (status === 'failed') {

            await Notification.create({
                user: tax.user,
                title: `tax payment failed`,
                content: `Your tax payment amount of $${tax.amount.toLocaleString()} confirmation failed. This payment was not confirmed.`,
                status: 'failed',
                URL: '/dashboard/tax-payment?screen=2',
            })

            await Mailing({
                subject: `Tax Payment Failed`,
                eTitle: `Tax payment failed`,
                eBody: `
                      <div>Hello ${taxPayer.username}, your tax payment amount of $${tax.amount.toLocaleString()} made on ${moment(tax.createdAt).format('DD-MM-yyyy')} / ${moment(tax.createdAt).format('h:mm')} confirmation failed. This payment was not confirmed. Did you make this payment? File a complaint <a href='${webURL}/dashboard/feedback' style="text-decoration: underline; color: #E96E28">here</a></div>
                    `,
                account: taxPayer
            })
        }

        tax.status = status
        await tax.save()

        return res.json({ status: 200, msg: 'Tax updated successfully' })
    } catch (error) {
        return res.json({ status: 200, msg: error.message })
    }
}

exports.AllUsers = async (req, res) => {
    try {
        const admin = await User.findOne({ where: { id: req.user } })
        let allusers;

        if (admin.id !== 1) {
            allusers = await User.findAll({
                where: { role: 'user' },
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: Kyc,
                        as: 'kycUser',
                    },
                ],
            })

        } else {
            allusers = await User.findAll({
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: Kyc,
                        as: 'kycUser',
                    },
                ],
            })
        }

        return res.json({ status: 200, msg: allusers })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.AdminCreateAccount = async (req, res) => {
    try {
        const { full_name, username, email, password, role, country, country_flag, } = req.body
        if (!full_name || !username || !email || !password || !role || !country) return res.json({ status: 404, msg: 'Incomplete request found' })
        const roleArray = ["user", "admin"]
        if (!roleArray.includes(role)) return res.json({ status: 404, msg: `Invalid role provided` })
        if (password.length < 6) return res.json({ status: 404, msg: `Password must be at least 6 characters long` })

        const findUsername = await User.findOne({ where: { username: username } })
        if (findUsername) return res.json({ status: 400, msg: `Username already exists` })
        const findEmail = await User.findOne({ where: { email: email } })
        if (findEmail) return res.json({ status: 400, msg: `Email already exists` })

        const myReferralId = 'AI_' + otpGenerator.generate(8, { specialChars: false })

        if (role === 'user') {

            const user = await User.create({
                full_name,
                username,
                email,
                password,
                country,
                country_flag: country_flag ? country_flag : null,
                email_verified: 'true',
                referral_id: myReferralId,
            })

            await Wallet.create({
                user: user.id
            })

            await Notification.create({
                user: user.id,
                title: `welcome ${user.username}`,
                content: `Welcome to ${webName} where we focus on making cryptocurrency trading easy. Get started by making your first deposit.`,
                URL: '/dashboard/deposit',
            })

            await Mailing({
                subject: `Welcome To ${webShort}`,
                eTitle: `Welcome ${user.username}`,
                eBody: `
                 <div>Welcome to ${webName} where we focus on making cryptocurrency trading easy. Get started by making your first <a href='${webURL}/dashboard/deposit' style="text-decoration: underline; color: #E96E28">deposit</a></div>
                `,
                account: user,
            })
        }

        if (role === 'admin') {
            const findAdmin = await User.findOne({ where: { id: req.user } })
            if (!findAdmin) return res.json({ status: 400, msg: 'Admin not found' })
            if (findAdmin.role !== 'super admin') return res.json({ status: 400, msg: 'Only a super admin can create another admin' })

            const newAdmin = await User.create({
                full_name,
                username,
                email,
                password,
                country,
                country_flag: country_flag ? country_flag : null,
                email_verified: 'true',
                referral_id: myReferralId,
                role: role
            })

            await Notification.create({
                user: newAdmin.id,
                title: `welcome ${newAdmin.username}`,
                content: `Welcome to ${webName} admin, see all users?`,
                URL: '/admin-controls/users',
            })
        }

        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super admin'] } } })
        if (admins) {
            admins.map(async ele => {
                await Notification.create({
                    user: ele.id,
                    title: `${username} joins ${webShort}`,
                    content: `Hello Admin, you have successfully created ${full_name} as a new ${role} on the system.`,
                    URL: '/admin-controls/users',
                })
            })
        }

        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        const unreadnotis = await Notification.findAll({
            where: { user: req.user, read: 'false' },
        })

        return res.json({ status: 200, msg: `Account created successfully`, notis: notifications, unread: unreadnotis })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UpdateUsers = async (req, res) => {
    try {
        const { user_id, password, fundAmount, minimumAmount } = req.body
        if (!user_id) return res.json({ status: 404, msg: `Provide a user id` })

        const user = await User.findOne({ where: { id: user_id } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        if (fundAmount) {
            if (isNaN(fundAmount)) return res.json({ status: 404, msg: `Amount must be a number` })

            const wallet = await Wallet.findOne({ where: { user: user.id } })
            if (!wallet) return res.json({ status: 404, msg: 'User wallet not found' })

            wallet.balance += fundAmount
            await wallet.save()

            await Notification.create({
                user: user_id,
                title: `wallet funded`,
                content: `Your account has been funded with $${fundAmount.toLocaleString()}, check your balance.`,
                URL: '/dashboard',
            })

            await Mailing({
                subject: `Wallet Funded`,
                eTitle: `Wallet funded`,
                eBody: `
                  <div>Hello ${user.username}, your wallet has been funded with $${fundAmount.toLocaleString()} today ${moment().format('DD-MM-yyyy')} / ${moment().format('h:mm')}. See your current balance <a href='${webURL}/dashboard/deposit' style="text-decoration: underline; color: #E96E28">here</a></div>
                `,
                account: user
            })
        }

        if (minimumAmount) {
            if (isNaN(minimumAmount)) return res.json({ status: 404, msg: `Amount must be a number` })
            user.withdrawal_minimum = minimumAmount
        }

        if (password) {
            const findAdmin = await User.findOne({ where: { id: req.user } })
            if (!findAdmin) return res.json({ status: 400, msg: `Admin not found` })
            if (password !== findAdmin.password) return res.json({ status: 404, msg: `Incorrect password entered` })
            if (findAdmin.role !== 'super admin') return res.json({ status: 400, msg: 'Unauthorized action' })

            user.suspend = user.suspend === 'true' ? 'false' : 'true'
        }

        await user.save()

        return res.json({ status: 200, msg: 'Action successful' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.ReactivateUsers = async (req, res) => {
    try {
        const { user_id } = req.body
        if (!user_id) return res.json({ status: 404, msg: `Provide a user id` })

        const user = await User.findOne({ where: { id: user_id } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })
        if (user.account_deletion !== 'true') return res.json({ status: 404, msg: `Account is active` })

        const findAdmin = await User.findOne({ where: { id: req.user } })
        if (!findAdmin) return res.json({ status: 400, msg: `Admin not found` })
        if (findAdmin.role !== 'super admin') return res.json({ status: 400, msg: 'Unauthorized action' })

        user.account_deletion = 'false'
        await user.save()

        await Notification.create({
            user: user.id,
            title: `welcome back`,
            content: `Welcome back to ${webShort} ${user.username}. Your account has been successfully reactivated and you can trade on our platform again.`,
            URL: '/dashboard/investment',
        })

        await Mailing({
            subject: `Welcome Back To ${webShort}`,
            eTitle: `Welcome Back ${user.username}`,
            eBody: `
             <div>Your account has been successfully reactivated, you can now login to your account and trade cryptocurrency on our platform again. Login <a href='${webURL}/login' style="text-decoration: underline; color: #E96E28">here</a></div>
            `,
            account: user,
        })

        return res.json({ status: 200, msg: 'Account reactivated' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.GetUserFigures = async (req, res) => {
    try {
        const { user_id } = req.body
        if (!user_id) return res.json({ status: 404, msg: `Provide a user id` })

        const user = await User.findOne({ where: { id: user_id } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        const userFigures = {
            total_deposit: 0,
            wallet_balance: 0
        }

        const userdeposits = await Deposit.findAll({
            where: { user: user.id, status: 'confirmed' }
        })
        if (userdeposits) {
            userdeposits.map(item => {
                userFigures.total_deposit += item.amount
            })
        }

        const wallet = await Wallet.findOne({ where: { user: user.id } })
        if (wallet) {
            userFigures.wallet_balance = wallet.balance
        }

        return res.json({ status: 200, msg: userFigures })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UpdateKYC = async (req, res) => {
    try {
        const { kyc_id, status, message } = req.body
        if (!kyc_id) return res.json({ status: 404, msg: `Provide a KYC id` })

        const kyc = await Kyc.findOne({ where: { id: kyc_id } })
        if (!kyc) return res.json({ status: 400, msg: 'KYC not found' })

        const kycUser = await User.findOne({ where: { id: kyc.user } })
        if (!kycUser) return res.json({ status: 400, msg: 'KYC User not found' })

        if (kyc.status !== 'processing') return res.json({ status: 400, msg: 'KYC already updated' })

        if (status === 'verified') {

            kycUser.kyc_verified = 'true'
            await kycUser.save()

            await Notification.create({
                user: kyc.user,
                title: `KYC verified`,
                content: `Your KYC details submitted has been successfully verified.`,
                URL: '/dashboard/settings/kyc',
            })

            await Mailing({
                subject: `KYC Verification Success`,
                eTitle: `KYC details verified`,
                eBody: `
                      <div>Hello ${kycUser.username}, Your KYC details submitted has been successfully verified.</div>
                    `,
                account: kycUser
            })
        }

        if (message) {
            if (status === 'processing') return res.json({ status: 400, msg: 'Update KYC status' })
        }
        if (status === 'failed') {

            if (!message) return res.json({ status: 400, msg: 'Provide a reason for failed verification' })

            await Notification.create({
                user: kyc.user,
                title: `KYC verification failed`,
                content: message,
                status: 'failed',
                URL: '/dashboard/settings/kyc',
            })

            await Mailing({
                subject: `KYC Verification Failed`,
                eTitle: `KYC details rejected`,
                eBody: `
                      <div>${message}</div>
                    `,
                account: kycUser
            })
        }

        kyc.status = status
        await kyc.save()

        return res.json({ status: 200, msg: 'KYC updated successfully' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.CreateCryptocurrency = async (req, res) => {
    try {
        const { crypto_name } = req.body
        if (!crypto_name) return res.json({ status: 404, msg: `Crypto name is required` })

        const matchingCrypto = await Crypto.findOne({ where: { crypto_name: crypto_name } })
        if (matchingCrypto) return res.json({ status: 404, msg: `${crypto_name} already exists` })

        if (!req.files) return res.json({ status: 404, msg: `Crypto image is required` })
        const crypto_img = req.files.crypto_img
        if (crypto_img.size >= 1000000) return res.json({ status: 404, msg: `Image size too large, file must not exceed 1mb` })
        if (!crypto_img.mimetype.startsWith('image/')) return res.json({ status: 404, msg: `File error, upload a valid image format (jpg, jpeg, png, svg)` })
        const filePath = './public/cryptocurrency'
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, { recursive: true })
        }
        const cryptoImgName = `${slug(crypto_name, '-')}.jpg`
        await crypto_img.mv(`${filePath}/${cryptoImgName}`)

        await Crypto.create({
            crypto_name,
            crypto_img: cryptoImgName,
        })

        return res.json({ status: 200, msg: 'Cryptocurrency created successfully' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.GetCryptocurrency = async (req, res) => {
    try {
        const cryptocurrency = await Crypto.findAll({
        })

        return res.json({ status: 200, msg: cryptocurrency })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UpdateCryptocurrency = async (req, res) => {
    try {
        const { crypto_name, crypto_id } = req.body
        if (!crypto_id) return res.json({ status: 404, msg: `Provide a crypto id` })

        const cryptocurrency = await Crypto.findOne({ where: { id: crypto_id } })
        if (!cryptocurrency) return res.json({ status: 404, msg: 'Crypto not found' })

        if (crypto_name) {
            if (cryptocurrency.crypto_name !== crypto_name) {
                const matchingCrypto = await Crypto.findOne({ where: { crypto_name: crypto_name } })
                if (matchingCrypto) return res.json({ status: 404, msg: `${crypto_name} already exists` })
                cryptocurrency.crypto_name = crypto_name

                const cryptoWallets = await AdminWallet.findAll({ where: { crypto: cryptocurrency.id } })
                if (cryptoWallets) {
                    cryptoWallets.map(async ele => {
                        ele.crypto_name = crypto_name
                        await ele.save()
                    })
                }
            }
        }

        const crypto_img = req?.files?.crypto_img
        let cryptoImgName;
        const filePath = './public/cryptocurrency'
        const currentCryptoImgPath = `${filePath}/${cryptocurrency.crypto_img}`

        if (crypto_img) {
            if (fs.existsSync(currentCryptoImgPath)) {
                fs.unlinkSync(currentCryptoImgPath)
            }
            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath, { recursive: true })
            }
            if (crypto_name) {
                cryptoImgName = `${slug(crypto_name, '-')}.jpg`
            } else {
                cryptoImgName = `${slug(cryptocurrency.crypto_name, '-')}.jpg`
            }

            await crypto_img.mv(`${filePath}/${cryptoImgName}`)
            cryptocurrency.crypto_img = cryptoImgName
        }

        await cryptocurrency.save()

        return res.json({ status: 200, msg: 'Cryptocurrency updated successfully' })
    } catch (error) {
        res.json({ status: 400, msg: error.message })
    }
}

exports.DeleteCryptocurrency = async (req, res) => {
    try {
        const { crypto_id } = req.body
        if (!crypto_id) return res.json({ status: 404, msg: `Provide a crypto id` })

        const cryptocurrency = await Crypto.findOne({ where: { id: crypto_id } })
        if (!cryptocurrency) return res.json({ status: 404, msg: 'Crypto not found' })

        const CryptoImgPath = `./public/cryptocurrency/${cryptocurrency.crypto_img}`
        if (fs.existsSync(CryptoImgPath)) {
            fs.unlinkSync(CryptoImgPath)
        }

        const cryptoWallets = await AdminWallet.findAll({ where: { crypto: cryptocurrency.id } })
        if (cryptoWallets) {
            for (const ele of cryptoWallets) {
                await ele.destroy()
            }
        }

        await cryptocurrency.destroy()

        return res.json({ status: 200, msg: 'Cryptocurrency deleted successfully' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.CreateAdminWallets = async (req, res) => {
    try {

        const { crypto_id, crypto_name, network, address, } = req.body
        if (!crypto_id || !crypto_name || !network || !address) return res.json({ status: 404, msg: `Incomplete request found` })

        const cryptocurrency = await Crypto.findOne({ where: { id: crypto_id } })
        if (!cryptocurrency) return res.json({ status: 404, msg: 'Crypto not found' })

        const matchingNetwork = await AdminWallet.findOne({ where: { crypto: crypto_id, network: network } })
        if (matchingNetwork) return res.json({ status: 404, msg: `${network} network already exists on ${crypto_name}` })

        await AdminWallet.create({
            crypto: cryptocurrency.id,
            crypto_name,
            network,
            address,
        })

        return res.json({ status: 200, msg: 'Wallet created successfully' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.GetAdminWallets = async (req, res) => {
    try {
        const adminWallets = await AdminWallet.findAll({
        })

        return res.json({ status: 200, msg: adminWallets })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UpdateAdminWallet = async (req, res) => {
    try {
        const { network, address, wallet_id } = req.body
        if (!wallet_id) return res.json({ status: 404, msg: `Provide a wallet id` })

        const adminWallet = await AdminWallet.findOne({ where: { id: wallet_id } })
        if (!adminWallet) return res.json({ status: 404, msg: 'Wallet not found' })

        if (network) {
            if (adminWallet.network !== network) {
                const matchingNetwork = await AdminWallet.findOne({ where: { crypto: adminWallet.crypto, network: network } })
                if (matchingNetwork) return res.json({ status: 404, msg: `${network} network already exists on ${adminWallet.crypto_name}` })
                adminWallet.network = network
            }
        }
        if (address) {
            adminWallet.address = address
        }

        await adminWallet.save()

        return res.json({ status: 200, msg: 'Wallet updated successfully' })
    } catch (error) {
        res.json({ status: 400, msg: error.message })
    }
}

exports.DeleteWallet = async (req, res) => {
    try {
        const { wallet_id } = req.body
        if (!wallet_id) return res.json({ status: 404, msg: `Provide a wallet id` })

        const adminWallet = await AdminWallet.findOne({ where: { id: wallet_id } })
        if (!adminWallet) return res.json({ status: 404, msg: 'Wallet not found' })

        await adminWallet.destroy()

        return res.json({ status: 200, msg: 'Wallet deleted successfully' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.CreateTradingPlan = async (req, res) => {
    try {
        const { title, price_start, price_limit, profit_return, plan_bonus, duration, duration_type } = req.body
        if (!title || !price_start || !price_limit || !profit_return || !plan_bonus || !duration || !duration_type) return res.json({ status: 404, msg: `Incomplete request found` })
        if (isNaN(price_start) || isNaN(price_limit) || isNaN(profit_return) || isNaN(plan_bonus) || isNaN(duration)) return res.json({ status: 404, msg: `Enter valid numbers` })

        const matchingPlan = await TradingPlans.findOne({ where: { title: title } })
        if (matchingPlan) return res.json({ status: 404, msg: `${title} plan already exists` })

        await TradingPlans.create({
            title,
            price_start,
            price_limit,
            profit_return,
            plan_bonus,
            duration,
            duration_type
        })

        return res.json({ status: 200, msg: 'Trading plan created successfully' })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.GetTradingPlans = async (req, res) => {
    try {
        const tradingplans = await TradingPlans.findAll({
        })

        return res.json({ status: 200, msg: tradingplans })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UpdateTradingPlan = async (req, res) => {
    try {
        const { plan_id, title, price_start, price_limit, profit_return, plan_bonus, duration, duration_type } = req.body
        if (!plan_id) return res.json({ status: 404, msg: `Provide a trading plan id` })
        if (isNaN(price_start) || isNaN(price_limit) || isNaN(profit_return) || isNaN(plan_bonus) || isNaN(duration)) return res.json({ status: 404, msg: `Enter valid numbers` })

        const tradingPlan = await TradingPlans.findOne({ where: { id: plan_id } })
        if (!tradingPlan) return res.json({ status: 404, msg: 'Trading plan not found' })

        const investments = await Investment.findAll({ where: { plan_id: plan_id, status: 'running' } })
        if (investments.length > 0) return res.json({ status: 404, msg: 'Ongoing investment(s) on this plan, try again when completed' })

        if (title) {
            if (tradingPlan.title !== title) {
                const matchingPlan = await TradingPlans.findOne({ where: { title: title } })
                if (matchingPlan) return res.json({ status: 404, msg: `${title} plan already exists` })
                tradingPlan.title = title
            }
        }
        if (price_start) {
            tradingPlan.price_start = price_start
        }
        if (price_limit) {
            tradingPlan.price_limit = price_limit
        }
        if (profit_return) {
            tradingPlan.profit_return = profit_return
        }
        if (plan_bonus) {
            tradingPlan.plan_bonus = plan_bonus
        }
        if (duration) {
            tradingPlan.duration = duration
        }
        if (duration_type) {
            tradingPlan.duration_type = duration_type
        }

        await tradingPlan.save()

        return res.json({ status: 200, msg: 'Trading plan updated successfully' })
    } catch (error) {
        res.json({ status: 400, msg: error.message })
    }
}

exports.DeleteTradingPlan = async (req, res) => {
    try {
        const { plan_id } = req.body
        if (!plan_id) return res.json({ status: 404, msg: `Provide a trading plan id` })

        const tradingPlan = await TradingPlans.findOne({ where: { id: plan_id } })
        if (!tradingPlan) return res.json({ status: 404, msg: 'Trading plan not found' })

        const investments = await Investment.findAll({ where: { plan_id: tradingPlan.id, status: 'running' } })
        if (investments.length > 0) return res.json({ status: 404, msg: 'Ongoing investment(s) on this plan, try again when completed' })

        await tradingPlan.destroy()

        return res.json({ status: 200, msg: 'Trading plan deleted successfully' })
    } catch (error) {
        return res.json({ status: 500, msg: error.message })
    }
}

exports.GetAdminStore = async (req, res) => {
    try {
        const adminStore = await AdminStore.findOne({
        })
        if (!adminStore) return res.json({ status: 400, msg: 'Admin store not found' })

        return res.json({ status: 200, msg: adminStore })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UpdateAdminStore = async (req, res) => {
    try {
        const { referral_bonus_percentage, tax_percentage, deposit_minimum } = req.body
        const adminStore = await AdminStore.findOne({
        })
        if (!adminStore) return res.json({ status: 400, msg: 'Admin Store not found' })

        if (referral_bonus_percentage) {
            if (isNaN(referral_bonus_percentage)) return res.json({ status: 404, msg: `Enter a valid number` })
            adminStore.referral_bonus_percentage = referral_bonus_percentage
        }
        if (tax_percentage) {
            if (isNaN(tax_percentage)) return res.json({ status: 404, msg: `Enter a valid number` })
            adminStore.tax_percentage = tax_percentage
        }
        if (deposit_minimum) {
            if (isNaN(deposit_minimum)) return res.json({ status: 404, msg: `Enter a valid number` })
            adminStore.deposit_minimum = deposit_minimum
        }

        await adminStore.save()

        const updated = await AdminStore.findOne({
        })

        return res.json({ status: 200, msg: 'Action successful', store: updated })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}


cron.schedule('* * * * *', async () => {

    const investments = await Investment.findAll({ where: { status: 'running' } })

    if (investments) {
        investments.map(async ele => {
            const investmentUser = await User.findOne({ where: { id: ele.user } })
            const tradingPlan = await TradingPlans.findOne({ where: { id: ele.plan_id } })

            if (tradingPlan) {
                const totalProfit = ele.amount * tradingPlan.profit_return / 100
                const totalBonus = ele.amount * tradingPlan.plan_bonus / tradingPlan.price_limit
                const topupProfit = totalProfit / tradingPlan.duration
                const topupBonus = totalBonus / tradingPlan.duration

                if (moment().isSameOrAfter(new Date(ele.endDate))) {
                    ele.profit = parseFloat(totalProfit.toFixed(1))
                    ele.bonus = parseFloat(totalBonus.toFixed(1))
                    ele.status = 'completed'
                    await ele.save()

                    await Notification.create({
                        user: ele.user,
                        title: `profit completed`,
                        content: `Profits for your $${ele.amount.toLocaleString()} ${ele.trading_plan} plan investment is completed and ready to claim.`,
                        URL: '/dashboard/investment',
                    })

                    await Mailing({
                        subject: `Investment Profit Completed`,
                        eTitle: `Investment profit completed`,
                        eBody: `
                              <div>Hello ${investmentUser.username}, your investment of $${ele.amount.toLocaleString()} ${ele.trading_plan} plan made on ${moment(ele.createdAt).format('DD-MM-yyyy')} / ${moment(ele.createdAt).format('h:mm')} profit generation is completed. You can see total profit generated and claim to your wallet <a href='${webURL}/dashboard/investment' style="text-decoration: underline; color: #E96E28">here</a></div>
                            `,
                        account: investmentUser
                    })
                } else {
                    if (moment().isSameOrAfter(new Date(ele.topupTime))) {
                        ele.profit += parseFloat(topupProfit.toFixed(1))
                        ele.bonus += parseFloat(topupBonus.toFixed(1))
                        const newTopupTime = moment().add(parseFloat(1), `${tradingPlan.duration_type}`)
                        ele.topupTime = `${newTopupTime}`
                        await ele.save()
                    }
                }
            }
        })
    }
})
