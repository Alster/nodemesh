class Node{
    constructor(info){
        this.id = info.id
        this.ip = info.ip
        this.port = info.port
        this.role = info.role
        this.nodesCount = info.nodesCount
        
        Object.defineProperty( this, 'socket', {
            value:info.socket,
            writable:true,
            configurable:true,
            enumerable:false
        })
    }
}

module.exports = Node