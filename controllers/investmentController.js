const Investment = require('../models').investments
const Notification = require('../models').notifications
const Up = require('../models').ups
const Wallet = require('../models').wallets
const TradingPlans = require('../models').trading_plans
const User = require('../models').users
const moment = require('moment')
const otpGenerator = require('otp-generator')


exports.CreateInvestment = async (req, res) => {
    try {
        const { amount, plan_id } = req.body
        if (!amount || !plan_id) return res.json({ status: 404, msg: `Incomplete request found` })
        if (isNaN(amount)) return res.json({ status: 404, msg: `Amount must be a number` })

        const user = await User.findOne({ where: { id: req.user } })
        if (!user) return res.json({ status: 404, msg: 'User not found' })

        const tradingPlan = await TradingPlans.findOne({ where: { id: plan_id } })
        if (!tradingPlan) return res.json({ status: 404, msg: 'Trading plan not found' })

        const wallet = await Wallet.findOne({ where: { user: req.user } })
        if (!wallet) return res.json({ status: 404, msg: `User wallet not found` })

        if (amount < tradingPlan.price_start || amount > tradingPlan.price_limit) return res.json({ status: 404, msg: `${tradingPlan.title} plan is from $${tradingPlan.price_start} - $${tradingPlan.price_limit}` })
        if (amount > wallet.balance) return res.json({ status: 404, msg: 'Insufficient wallet balance' })

        if (tradingPlan.title === 'test run') {
            const TestRunInvestment = await Investment.findAll({ where: { user: req.user, trading_plan: 'test run' } })
            if (TestRunInvestment.length > 0) return res.json({ status: 404, msg: `Test run is one trial only` })
        }

        wallet.balance -= amount
        await wallet.save()

        const topupTime = moment().add(parseFloat(1), `${tradingPlan.duration_type}`)
        const endDate = moment().add(parseFloat(tradingPlan.duration), `${tradingPlan.duration_type}`)
        const gen_id = otpGenerator.generate(10, { specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false, })

        const investment = await Investment.create({
            user: req.user,
            gen_id,
            amount,
            trading_plan: tradingPlan.title,
            plan_id,
            endDate: `${endDate}`,
            topupTime: `${topupTime}`
        })

        await Notification.create({
            user: req.user,
            title: `investment success`,
            content: `You've successfully bought ${investment.trading_plan} plan for $${investment.amount.toLocaleString()} from wallet balance, trading begins now.`,
            URL: '/dashboard/investment',
        })

        const admins = await User.findAll({ where: { role: 'admin' } })
        if (admins) {
            admins.map(async ele => {
                await Notification.create({
                    user: ele.id,
                    title: `investment alert`,
                    content: `Hello Admin, ${user.username} just made an investment of $${investment.amount.toLocaleString()} ${investment.trading_plan} plan, trading begins now.`,
                    URL: '/admin-controls/investments',
                })
            })
        }

        const ups = await Up.findOne({ where: { user: req.user } })
        if (!ups) {
            await Up.create({
                new_profit: 0,
                new_bonus: 0,
                user: req.user
            })
        }

        return res.json({ status: 200, msg: 'Investment success' })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UserInvestments = async (req, res) => {
    try {
        const investments = await Investment.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: investments })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.UserUnclaimInvestments = async (req, res) => {
    try {
        const investments = await Investment.findAll({
            where: {
                user: req.user, claim: 'false',
            },
            order: [['createdAt', 'DESC']],
        })

        return res.json({ status: 200, msg: investments })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

exports.ClaimInvestment = async (req, res) => {
    try {
        const { invest_id } = req.body
        if (!invest_id) return res.json({ status: 404, msg: `Provide an investment id` })

        const investment = await Investment.findOne({ where: { id: invest_id } })
        if (!investment) return res.json({ status: 404, msg: `Investment not found` })

        const wallet = await Wallet.findOne({ where: { user: req.user } })
        if (!wallet) return res.json({ status: 404, msg: `User wallet not found` })

        const ups = await Up.findOne({ where: { user: req.user } })
        if (!ups) return res.json({ status: 404, msg: `User ups not found` })

        if (investment.status !== 'completed') return res.json({ status: 404, msg: 'Profit still running' })
        if (investment.claim === 'true') return res.json({ status: 404, msg: 'Investment already claimed' })

        wallet.total_profit += investment.profit
        wallet.total_bonus += investment.bonus
        let altbalance = investment.amount + investment.profit + investment.bonus
        wallet.balance += altbalance
        await wallet.save()

        ups.new_profit = investment.profit
        ups.new_bonus = investment.bonus
        await ups.save()

        investment.claim = 'true'
        await investment.save()

        await Notification.create({
            user: req.user,
            title: `claim success`,
            content: `Your $${investment.amount.toLocaleString()} ${investment.trading_plan} plan investment, profit and bonus generated has been successfully claimed to your wallet.`,
            URL: '/dashboard',
        })

        const notifications = await Notification.findAll({
            where: { user: req.user },
            order: [['createdAt', 'DESC']],
        })

        const unreadnotis = await Notification.findAll({
            where: { user: req.user, read: 'false' },
        })

        return res.json({ status: 200, msg: 'Investment claim success', invt: investment, notis: notifications, unread: unreadnotis })
    } catch (error) {
        res.json({ status: 500, msg: error.message })
    }
}

