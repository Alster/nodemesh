class Broadcaster{
    constructor(ownerId, nodes, nodesOut, nodesIn){
        this.ownerId = ownerId
        this.nodes = nodes
        this.nodesOut = nodesOut
        this.nodesIn = nodesIn
    }

    toAll(action, data, cb){}

    toId(id, action, data, cb){}

    toOneOfRole(role, action, data, cb){}

    toAllOfRole(role, action, data, cb){}
}

module.exports = Broadcaster