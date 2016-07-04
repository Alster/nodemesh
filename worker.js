Error.stackTraceLimit = Infinity
require('./src/log.js')
const http = require('http')
const co = require('co')
const fs = require('fs')
const Roles = require('./roles.js')

const express = require('express')
const app = express()
const server = require('http').Server(app)

const mesh = new (require('./src/nodemesh.js'))({
    entryPort: 4999,
    port: process.env.port,
    role: process.env.role,
    httpServer: server
})

// mesh.broadcaster.on(Roles.GameServer, 'getPlayer', (id, sendAnswer)=>{
//     sendAnswer('hi, im ' + mesh.port)
// })
//
// mesh.broadcaster.broadcast('update', {some: 'azaza'})
// mesh.broadcaster.receive('update', data=>{
//    
// })

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