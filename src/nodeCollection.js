const MeshNode = require('./meshNode.js')
const EventEmitter = require('events')

class Collection {
    constructor(ownerId, role) {
        this.ownerId = ownerId
        this.role = role
        
        this.list = []
        this.inputs = []
        this.outputs = []
        
        this.events = new EventEmitter()
    }

    add(node) {
        this._addToList(node)
    }

    getById(id){
        for (let n of this.list){
            if (n.id === id) return n;
        }
        return null;
    }

    addMany(nodes) {
        for (let node of nodes) this._addToList(node)
    }
    
    addInput(node){
        this.inputs.push(this.packNode(node))
    }
    
    getInputs(){
        return this.inputs;
    }
    
    addOutput(node){
        this.outputs.push(this.packNode(node))
    }
    
    getOutputs(){
        return this.outputs;
    }
    
    hasOutput(){
        return this.outputs.length > 0
    }

    remove(node) {
        Collection.notImplemented()
    }

    clear() {
        this.list.length = 0
    }
    
    getByRole(role){
        let filtered = this.list.filter(n=>n.role === role)
        if (!filtered || filtered.length === 0) return [];
        return filtered;
    }

    getRandomByRole(role) {
        let filtered = this.getByRole(role)
        if (filtered.length === 0) return null;
        return filtered[randomIntInc(0, filtered.length - 1)]
    }

    getRandom() {
        if (this.list.length === 0) return null;
        return this.list[randomIntInc(0, this.list.length - 1)]
    }

    getConnectCandidate(){
        //TODO Организовать "умный" алгоритм выбора ноды для подключения
        // let middle = this.list.reduce((sum, node)=>sum + node.nodesCount, 0) / this.list.length
        return this.getRandom()
    }

    get length() {
        return this.list.length;
    }

    getList() {
        return this.list;
    }

    _addToList(node) {
        let alreadyHave = this.getById(node.id)
        if (alreadyHave) {
            if (!alreadyHave.socket) alreadyHave.socket = node.socket;
            return;
        }
        this.list.push(this.packNode(node))
        if (node.id !== this.ownerId && node.role === this.role) this.events.emit('sameRole', node)
    }

    _contains(id) {
        return this.getById(id) !== null
    }
    
    packNode(node){
        return node instanceof MeshNode ? node : new MeshNode(node)
    }

    toString() {
        return JSON.stringify(this.list)
    }
    
    static notImplemented(){
        throw new Error('notImplemented')
    }
}

module.exports = Collection