const Mailing = require('../config/emailDesign')
const Tax = require('../models').taxes
const User = require('../models').users
const Notification = require('../models').notifications
const AdminWallet = require('../models').admin_wallets
const moment = require('moment')
const { webURL } = require('../utils/utils')


exports.PayTax = async (req, res) => {
    try {

        const { amount, wallet_id } = req.body
        if (!amount || !wallet_id) return res.json({ status: 404, msg: `Incomplete request found` })
        if (isNaN(amount)) return res.json({ status: 404, msg: `Enter a valid number` })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        const adminWallet = await AdminWallet.findOne({ where: { id: wallet_id } })
        if (!adminWallet) return res.json({ status: 404, msg: 'Invalid deposit address' })

        const tax = await Tax.create({
            user: req.user,
            amount,
            crypto: adminWallet.crypto_name,
            network: adminWallet.network,
            deposit_address: adminWallet.address
        })

        await Notification.create({
            user: req.user,
            title: `tax payment success`,
            content: `Your tax payment amount of $${tax.amount.toLocaleString()} was successful, pending confirmation.`,
            URL: '/dashboard/tax-payment?screen=2',
        })

        const admins = await User.findAll({ where: { role: 'admin' } })
        if (admins) {

            admins.map(async ele => {

                await Notification.create({
                    user: ele.id,
                    title: `tax payment alert`,
                    content: `Hello Admin, ${user.username} just made a tax payment amount of $${tax.amount.toLocaleString()} with ${tax.crypto} on ${tax.network} network deposit address, please confirm transaction.`,
                    URL: '/admin-controls/taxes',
                })

                await Mailing({
                    subject: `Tax Payment Alert`,
                    eTitle: `New tax payment`,
                    eBody: `
                     <div style="font-size: 0.85rem"><span style="font-style: italic">amount:</span><span style="padding-left: 1rem">$${tax.amount.toLocaleString()}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">crypto:</span><span style="padding-left: 1rem">${tax.crypto}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">network:</span><span style="padding-left: 1rem">${tax.network}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">deposit address:</span><span style="padding-left: 1rem">${tax.deposit_address}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">sender:</span><span style="padding-left: 1rem">${user.username}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">email:</span><span style="padding-left: 1rem">${user.email}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">date:</span><span style="padding-left: 1rem">${moment(tax.createdAt).format('DD-MM-yyyy')}</span></div>
                     <div style="font-size: 0.85rem; margin-top: 0.5rem"><span style="font-style: italic">time:</span><span style="padding-left: 1rem">${moment(tax.createdAt).format('h:mm')}</span></div>
                     <div style="margin-top: 1rem">Tax payment confirmed? Update transaction status <a href='${webURL}/admin-controls/taxes'  style="text-decoration: underline; color: #E96E28">here</a></div>
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

        return res.json({ status: 200, msg: 'Tax payment success', notis: notifications, unread: unreadnotis })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}

exports.UserTaxes = async (req, res) => {
    try {
        const taxes = await Tax.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: taxes })
    } catch (error) {
        return res.json({ status: 400, msg: error.message })
    }
}