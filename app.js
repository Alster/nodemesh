require('./src/log.js')
const fork = require('child_process').fork
const path = require('path')
const Roles = require('./roles.js')
const uuid = require('uuid-v4')

let threads = []
let nodePortCounter = 5000

spawnNode(Roles.GameServer, 10)
spawnNode(Roles.Partner, 10)
spawnNode(Roles.Site, 10)

function spawnNode(role, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(()=> {
            threads.push(fork(__dirname + '/worker.js',
                [], {
                    cwd: path.join(__dirname, '.'),
                    env: Object.assign({}, process.env, {role: role, port: nodePortCounter})
                }))
            nodePortCounter++
        }, 500 + (10 * i))
    }
}

let nodes = []

const server = require('socket.io')({transports: ['websocket']})
server.listen(4999)
server.on('connection', socket=> {
    socket.on('helloMaster', (data, sendAnswer)=> {
        let info = data.info
        if (!uuid.isUUID(info.id)) return console.warn(`Uncorrect node id ${info.id}`)

        nodes.push(info)
        // console.log(`${info.role} joined at ${info.ip}:${info.port}`)

        sendAnswer({
            nodes: JSON.stringify(nodes)
        })
    })

    socket.on('spawn', data=> {
        spawnNode(Roles.GameServer, 1)
    })
})