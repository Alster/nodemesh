const Client = require('socket.io-client')
const Server = require('socket.io')
const ip = require("ip")
const co = require('co')
const uuid = require('uuid-v4')
const getPort = require('get-port')
const NodesCollection = require('./nodeCollection.js')
const Broadcaster = require('./broadcaster.js')

class Mesh {
    constructor(opts) {
        this.role = []
        this.httpServer = null
        this.port = 0
        Object.assign(this, opts)
        this.id = uuid()
        this.nodes = new NodesCollection(this.id)
        this.nodeOut = null
        this.nodesIn = []
        this.webApps = []

        this.broadcaster = new Broadcaster()

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
        while (!this.nodeOut && iterator < 99) {
            iterator++
            node = this.nodes.getRandom(this.role)
            if (node.id === this.id) continue;
            yield this._tryToGetConnectionNode(node)
        }

        console.info(`${this.port} started`)
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
                this.nodesIn.push({
                    info: data.info,
                    socket: socket
                })
                this.nodes.add(data.info)
                if (this.nodeOut){
                    sendAnswer({nodes: this.nodes.getList(), accept: true})
                }
                else {
                    sendAnswer({nodes: this.nodes.getList(), accept: this.nodes.length > 0})
                    co(this._tryToGetConnectionNode(data.info))
                }
                this._broadcastEvent('nodeBirth', {info: data.info}, data.info.id)

                socket.on('nodeBirth', birthed=> {
                    this.nodes.add(birthed.info)
                    this._broadcastEvent('nodeBirth', {info: birthed.info}, data.info.id)
                })
            })

            socket.on('imWebApp', (data, sendAnswer)=> {
                this._initializeAPIForWebApp(socket)
                this.webApps.push(socket)
                sendAnswer()
            })

            socket.on('getList', (data, sendAnswer)=> {
                sendAnswer({nodes: this.nodes.getList(), connectedTo: this.nodeOut ? this.nodeOut.info : null})
            })

            socket.on('disconnect', ()=> {
                let index = this.webApps.indexOf(socket)
                if (index !== -1 ){
                    this.webApps.splice(index, 1)
                }
            })
        })
    }

    *_tryToGetConnectionNode(node) {
        let socket = yield this._tryConnect(node)
        if (socket) {
            this.nodeOut = {
                info: node,
                socket: socket
            }
        }
    }

    _tryConnect(node) {
        if (!node) throw new Error('nodeIsNull')
        return new Promise((resolve, reject)=> {
            let socket = Client.connect(`http://${node.ip}:${node.port}`)

            //When we connected to some node
            socket.on('connect', ()=> {
                socket.emit('hello', {info: this.getInfo()}, res=> {
                    if (!res.accept) return resolve(null)
                    this.nodes.clear()
                    this.nodes.addMany(res.nodes)
                    resolve(socket)
                })
            })

            socket.on('connect_error', err=> {
                resolve(null)
            })

            socket.on('nodeBirth', data=> {
                this.nodes.add(data.info)
                this._broadcastEvent('nodeBirth', {info: data.info}, node.id)
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

            master.on('connect_error', err=> {
                reject(err)
            })
        })
    }

    _broadcastEvent(action, data, senderId) {
        let exclude = [senderId]
        if (this.nodeOut && this.nodeOut.info.id !== senderId) {
            this.nodeOut.socket.emit(action, data)
            exclude.push(this.nodeOut.info.id)
        }
        this._broadcastToNodesIn(action, data, exclude)
        this._broadcastToWebApps(action, data)
    }

    _broadcastToWebApps(action, data) {
        this.webApps.forEach(app=> {
            app.emit(action, data)
        })
    }

    _broadcastToNodesIn(action, data, exclude) {
        this.nodesIn.forEach(n=> {
            if (exclude.some(s=>s === n.info.id)) return;
            n.socket.emit(action, data)
        })
    }

    getInfo() {
        return {
            ip: ip.address(),
            port: this.port,
            id: this.id,
            role: this.role
        }
    }
}

module.exports = Mesh