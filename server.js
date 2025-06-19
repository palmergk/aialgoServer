require('dotenv').config()
const express = require('express')
const http = require('http')
const fileUpload = require('express-fileupload')
const cors = require('cors')

const app = express()
const port = process.env.PORT
const server = http.createServer(app)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        
        const allowedOrigins = [
            /^http:\/\/localhost:(5173|5174|5175)$/,
            /\.vercel\.app$/,
        ]

        if (allowedOrigins.some(pattern => {
            if (typeof pattern === 'string') return origin === pattern;
            if (pattern instanceof RegExp) return pattern.test(origin);
            return false;
        })) {
            return callback(null, true)
        }

        return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}))

app.options('*', cors())

app.use(express.json())
app.use(fileUpload())
app.use(express.static('public'))

app.use('/api/user', require('./routes/userRoutes'))
app.use('/api/deposit', require('./routes/depositRoute'))
app.use('/api/admin', require('./routes/adminRoute'))
app.use('/api/notification', require('./routes/notificationRoute'))
app.use('/api/withdraw', require('./routes/withdrawalRoute'))
app.use('/api/investment', require('./routes/investmentRoute'))
app.use('/api/tax', require('./routes/taxRoute'))
app.use('/api/kyc', require('./routes/kycRoute'))

server.listen(port, () => console.log(`Server running on http://localhost:${port}`))
