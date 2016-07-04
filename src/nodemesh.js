const Client = require('socket.io-client')
const Server = require('socket.io')
const ip = require("ip")
const co = require('co')
const uuid = require('uuid-v4')
const getPort = require('get-port')
const NodesCollection = require('./nodeCollection.js')
const Broadcaster = require('./broadcaster.js')
const MeshNode = require('./meshNode.js')
const Roles = require('./../roles.js')

class Mesh {
    constructor(opts) {
        this.role = null
        this.httpServer = null
        this.port = 0
        Object.assign(this, opts)
        this.id = uuid()
        this.server = null

        this.nodes = new NodesCollection(this.id, this.role)
        this.nodes.events.on('sameRole', node=> {
            if (node.socket === null || node.socket === undefined) {
                // console.log(`${this.port} need ${node.port}`)
                // co(this._tryConnect(node))
            }
            // let srvSockets = this.server.sockets.sockets;
            // let len = Object.keys(srvSockets).length
            // if (len > 0) console.log(`${this.port} Clients ${len}`)
        })
        this.broadcaster = new Broadcaster(this.id, this.nodes, this.role)
        this.broadcaster.receive('nodeBirth', birthed=>{
            let holder = this.nodes.getById(birthed.holder)
            if (holder) holder.nodesCount += 1
            this.nodes.add(birthed.info)
        })

        this.connectingStarted = false
    }

    *Connect() {
        if (this.connectingStarted) throw new Error('Connecting already started')
        this.connectingStarted = true
        yield this._startListen(this.port === 0 ? yield getPort() : this.port)
        this._applyServerAPI()

        yield this._talkToMaster()

        let iterator = 0
        let node = null
        let socket = null
        while (!this.nodes.hasOutput() && iterator < 99) {
            iterator++
            node = this.nodes.getConnectCandidate(this.role)
            if (node.id === this.id) continue;
            yield this._tryToGetConnectionNode(node)
        }

        if (this.nodes.hasOutput()) console.info(`${this.port} started`)
        else console.warn(`${this.port} Cannot connect to any`)
    }

    _startListen(port) {
        return new Promise((resolve, reject)=> {
            if (this.httpServer) {
                this.port = port
                this.httpServer.listen(this.port, ()=> {
                    this.server = Server(this.httpServer)
                    resolve()
                })
            }
            else {
                this.server = Server({transports: ['websocket']})
                this.server.listen(this.port)
                resolve()
            }
        })
    }

    _applyServerAPI() {
        //When some node connected to us
        this.server.on('connection', socket=> {
            socket.on('hello', (data, sendAnswer)=> {
                let node = new MeshNode(Object.assign({}, data.info, {socket: socket}))
                this.nodes.addInput(node)
                this.nodes.add(node)
                if (this.nodes.hasOutput()) {
                    sendAnswer({nodes: this.nodes.getList(), accept: true})
                }
                else {
                    sendAnswer({nodes: this.nodes.getList(), accept: true})
                    // co(this._tryToGetConnectionNode(this.nodes.getConnectCandidate()))
                }

                this.broadcaster.broadcast('nodeBirth', {info: node, holder: this.id}, node.id)
                this.broadcaster.applyNode(node)
            })

            socket.on('imWebApp', (data, sendAnswer)=> {
                this._initializeAPIForWebApp(socket)
                this.broadcaster.addWebApp(socket)
                sendAnswer()
            })

            socket.on('getList', (data, sendAnswer)=> {
                sendAnswer({
                    nodes: this.nodes.getList(),
                    outputs: this.nodes.hasOutput() ? this.nodes.getOutputs() : null
                })
            })

            // socket.on('getPlayers', (data, sendAnswer)=> {
            //     this.broadcaster.toAllOfRole(Roles.GameServer, 'getPlayer', 'someId', result=> {
            //         console.log(`Getted getPlayer result: ${JSON.stringify(result)}`)
            //     })
            //     // sendAnswer({
            //     //     nodes: this.nodes.getList(),
            //     //     outputs: this.nodes.hasOutput() ? this.nodes.getOutputs() : null
            //     // })
            // })

            socket.on('disconnect', ()=> this.broadcaster.removeWebApp(socket))
        })
    }

    *_tryToGetConnectionNode(node) {
        let socket = yield this._tryConnect(node)
        if (socket) this.nodes.addOutput(node)
    }

    _tryConnect(node) {
        if (!node) throw new Error('nodeIsNull')
        return new Promise((resolve, reject)=> {
            node.socket = Client.connect(`http://${node.ip}:${node.port}`)

            //When we connected to some node
            node.socket.on('connect', ()=> {
                node.socket.emit('hello', {info: this.getInfo()}, res=> {
                    if (!res.accept) {
                        node.socket.close()
                        node.socket = null
                        return resolve(null);
                    }
                    // console.log(`${this.port} > ${node.port}`)
                    // this.nodes.clear()
                    this.nodes.addMany(res.nodes)
                    resolve(node.socket)

                    this.broadcaster.applyNode(node)
                })
            })
            node.socket.on('connect_error', err=> {
                node.socket = undefined
                resolve(null)
            })
        })
    }

    _initializeAPIForWebApp(socket) {
    }

    _talkToMaster() {
        return new Promise((resolve, reject)=> {
            let master = Client.connect(`http://localhost:${this.entryPort}`)
            master.on('connect', ()=> {
                master.emit('helloMaster', {info: this.getInfo()}, data=> {
                    data.nodes = JSON.parse(data.nodes)
                    if (this.nodes.length === 0) this.nodes.addMany(data.nodes)
                    master.close()
                    resolve()
                })
            })
            master.on('connect_error', err=> reject(err))
        })
    }

    getInfo() {
        return {
            ip: ip.address(),
            port: this.port,
            id: this.id,
            role: this.role,
            nodesCount: this.nodes.length
        }
    }

    consoleLogFor5000(log) {
        if (this.port !== 5000) return;
        console.log(`${this.port} ${log}`)
    }
}

module.exports = Mesh