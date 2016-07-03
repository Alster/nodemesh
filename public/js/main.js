'use strict'
const Roles = {
    gameServer: {color: 'red'},
    site: {color: 'blue'},
    partner: {color: 'green'}
}

class Drawer {
    constructor(opts) {
        this.graph = {
            nodes: new vis.DataSet(),
            edges: new vis.DataSet()
        }
        this.container = document.getElementById(opts.container)
        var options = {}
        this.network = new vis.Network(this.container, this.graph, options)

        this.network.on("doubleClick", function (params) {
            if (!params.nodes || params.nodes.length === 0) return;
            let filtered = nodes.filter(n=>n.id === params.nodes[0])
            if (!filtered || filtered.length === 0) return;
            filtered = filtered[0]
            window.location.href = `http://${filtered.ip}:${filtered.port}`
        })
    }

    addNode(node) {
        let n = {
            id: node.id,
            label: node.port,
            color: Roles[node.role].color
        }
        if (location.port == node.port) n.color = '#7BE141'
        this.graph.nodes.add(n)
    }

    addEdge(edge) {
        edge.id = edge.from + edge.to
        edge.arrows = 'to'
        this.graph.edges.add(edge)
    }

    clear() {
        this.graph.nodes.clear()
        this.graph.edges.clear()
    }
}

let drawer = new Drawer({container: 'connectionsNetwork'})

let socketMaster = io('http://localhost:4999')
socketMaster.on('connect', ()=> {
})

let nodes = []
let socket = io(window.location.href)

socket.on('connect', ()=> {
    drawer.clear()
    socket.emit('imWebApp', null, ()=>{
        console.log('registered as webApp')
        applyNodeAPI(socket)
    })

    socket.on('nodeBirth', data=>{
        console.log(`node birthed`)
        drawer.addNode(data.info)
    })
})

function applyNodeAPI(socket){
    socket.emit('getList', null, data=> {
        console.log(`Getted stored nodes list ${data.nodes.length}`)
        getNodesTree(data.connectedTo)
        data.nodes.forEach(n=>getNodesTree(n))
    })
}

var itttttter = 0
function getNodesTree(from) {
    if (itttttter > 5000) return;
    itttttter++;

    if (containsNode(from)) return;
    nodes.push(from)
    drawer.addNode(from)

    let nodeSock = io(`http://${from.ip}:${from.port}`)
    nodeSock.on('connect', ()=> {
        nodeSock.emit('getList', null, data=> {
            data.nodes.forEach(n=>getNodesTree(n))
            if (!data.connectedTo) return;
            drawer.addEdge({
                from: from.id,
                to: data.connectedTo.id
            })
            console.log(`${from.port} has connected to  ${data.connectedTo.port}, list length is ${data.nodes.length}`)
            getNodesTree(data.connectedTo)

            nodeSock.close()
        })
    })
}

function containsNode(node) {
    if (nodes.some(n=>n.id === node.id)) return true;
}

$('#refreshNodes').on('click', ()=> {
    socketMaster.emit('spawn', null, ()=> {
    })
})