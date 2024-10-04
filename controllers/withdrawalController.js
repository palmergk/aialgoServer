const Withdrawal = require('../models').withdrawals
const Notification = require('../models').notifications
const Wallet = require('../models').wallets
const User = require('../models').users
const AdminWallet = require('../models').admin_wallets
const moment = require('moment')
const { webURL } = require('../utils/utils')
const Mailing = require('../config/emailDesign')


exports.MakeWithdrawal = async (req, res) => {
    try {

        const { amount, crypto, network, withdrawal_address } = req.body
        if (!amount || !crypto || !network || !withdrawal_address) return res.json({ status: 404, msg: `Incomplete request found` })

        if (isNaN(amount)) return res.json({ status: 404, msg: `Enter a valid number` })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        const wallet = await Wallet.findOne({ where: { user: req.user } })
        if (!wallet) return res.json({ status: 404, msg: `User wallet not found` })

        if (amount < user.withdrawal_minimum) return res.json({ status: 404, msg: `Minimum withdrawal amount is $${user.withdrawal_minimum}` })

        if (amount > wallet.balance) return res.json({ status: 404, msg: 'Insufficient balance' })

        const adminWallet = await AdminWallet.findOne({ where: { crypto_name: crypto, network: network } })
        if (!adminWallet) return res.json({ status: 404, msg: 'Crypto/Network not supported' })

        if (user.email_verified === 'false' || user.kyc_verified === 'false') return res.json({ status: 404, msg: 'Complete your account verification to continue' })

        wallet.total_withdrawal += amount
        wallet.balance -= amount
        await wallet.save()

        const withdrawal = await Withdrawal.create({
            user: req.user,
            amount,
            crypto,
            network,
            withdrawal_address,
        })

        await Notification.create({
            user: req.user,
            title: `withdrawal success`,
            content: `Your withdrawal amount of $${withdrawal.amount.toLocaleString()} was successful, now processing.`,
            URL: '/dashboard/withdraw?screen=2',
        })

        const admins = await User.findAll({ where: { role: 'admin' } })
        if (admins) {

            admins.map(async ele => {

                await Notification.create({
                    user: ele.id,
                    title: `withdrawal alert`,
                    content: `Hello Admin, ${user.username} just made a withdrawal of $${withdrawal.amount.toLocaleString()}.`,
                    URL: '/admin-controls/withdrawals',
                })

                await Mailing({
                    subject: `Withdrawal Alert`,
                    eTitle: `New withdrawal made`,
                    eBody: `
                     <div style="font-size: 0.85rem"><span style="font-style: italic">amount:</span><span style="padding-left: 1rem">$${withdrawal.amount.toLocaleString()}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">from:</span><span style="padding-left: 1rem">${user.username}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">email:</span><span style="padding-left: 1rem">${user.email}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">crypto:</span><span style="padding-left: 1rem">${withdrawal.crypto}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">network:</span><span style="padding-left: 1rem">${withdrawal.network}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">withdrawal address:</span><span style="padding-left: 1rem">${withdrawal.withdrawal_address}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">date:</span><span style="padding-left: 1rem">${moment(withdrawal.createdAt).format('DD-MM-yyyy')}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">time:</span><span style="padding-left: 1rem">${moment(withdrawal.createdAt).format('h:mm')}</span></div>
                     <div style="margin-top: 1rem">Update this withdrawal <a href='${webURL}/admin-controls/withdrawals' style="text-decoration: underline; color: #E96E28">here</a></div>
                    `,
                    account: ele.dataValues,
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

        const updatedwallet = await Wallet.findOne({ where: { user: req.user } })

        return res.json({ status: 200, msg: 'Withdrawal success', notis: notifications, unread: unreadnotis, wallet: updatedwallet })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UserWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: withdrawals })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}