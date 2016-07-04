const EventEmitter = require('events')

const Separator = ':::'
const BroadcastPrefix = 'broadcast'

class Broadcaster{
    constructor(ownerId, nodes, role){
        this.ownerId = ownerId
        this.role = role

        this.nodes = nodes
        this.webApps = []

        this.events = new EventEmitter()
    }

    broadcast(action, data, senderId){
        action = Broadcaster.packAction(BroadcastPrefix, action)
        let exclude = []
        if (senderId) exclude.push(senderId)
        if (this.nodes.hasOutput()) {
            this.nodes.getOutputs().forEach(n=>{
                if (n.id == senderId) return;
                n.socket.emit(action, data)
                exclude.push(n.id)
            })
        }
        this._broadcastToNodesIn(action, data, exclude)
        this._broadcastToWebApps(action, data)
    }

    receive(action, cb){
        this.events.on(Broadcaster.packAction(BroadcastPrefix, action), cb)
    }

    toId(id, action, data, cb){}

    toOneOfRole(role, action, data, cb){

    }

    toAllOfRole(role, action, data, cb){
        if (this.role !== role) return console.error(`${this.role} is not equals ${role}`);
        console.log(`Trying to emit for: \n${this.nodes.getByRole(role).map(n=>{
            return JSON.stringify({
                port: n.port,
                socket: n.socket !== undefined && n.socket !== null
            })
        }).join('\n')}`)
        Promise.all(this.nodes.getByRole(role).map(n=>Broadcaster.emitPromised(n.socket, Broadcaster.packAction(role, action), data)))
            .then(cb)
            .catch(err=>console.error(err.stack))
    }
    
    applyNode(node){
        if (node.socket.applyed) return;
        node.socket.applyed = true;
        let onevent = node.socket.onevent
        node.socket.onevent = function (packet) {
            var args = packet.data || []
            onevent.call (this, packet)
            packet.data = ["*"].concat(args)
            onevent.call(this, packet)
        }
        node.socket.on("*",(event, data, sendAnswer)=>{
            let unpacked = Broadcaster.unpackAction(event)
            if (unpacked[0] === BroadcastPrefix) this.broadcast(unpacked[1], data, node.id)
            this.events.emit(event, data, sendAnswer)
        })
    }

    on(role, action, cb){
        this.events.on(Broadcaster.packAction(role, action), cb)
    }

    addWebApp(socket){
        this.webApps.push(socket)
    }
    
    removeWebApp(socket){
        let index = this.webApps.indexOf(socket)
        if (index !== -1 ) this.webApps.splice(index, 1)
    }

    static packAction(prefix, action){
        return `${prefix}${Separator}${action}`
    }

    static unpackAction(action){
        return action.split(Separator)
    }

    _broadcastToNodesIn(action, data, exclude) {
        this.nodes.getInputs().forEach(n=> {
            if (exclude.some(s=>s === n.id)) return;
            n.socket.emit(action, data)
        })
    }

    _broadcastToWebApps(action, data) {
        this.webApps.forEach(app=> {
            app.emit(action, data)
        })
    }

    static emitPromised(socket, action, data){
        return new Promise(resolve=>{
            socket.emit(action, data, res=>resolve(res))
        })
    }
}

module.exports = Broadcaster