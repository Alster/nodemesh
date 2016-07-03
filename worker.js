require('./src/log.js')
const http = require('http')
const co = require('co')
const fs = require('fs')

const express = require('express')
const app = express()
const server = require('http').Server(app)

const mesh = new (require('./src/nodemesh.js'))({
    entryPort: 4999,
    port: process.env.port,
    role: process.env.role,
    httpServer: server
})

app.get('/', function (req, res) {
    res.send(fs.readFileSync('./public/index.html', 'utf8'))
})

app.use('/public', express.static('public'))

co(function*() {
    yield mesh.Connect()
}).catch(err=>console.error(err.stack))

global.randomIntInc = function (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low)
}