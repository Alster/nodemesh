class Collection {
    constructor(ownerId) {
        this.ownerId = ownerId
        this.list = {}
    }

    add(node) {
        this._add(node)
    }

    addMany(nodes) {
        for (let node of nodes) {
            this._add(node)
        }
    }

    remove(node) {
    }

    clear() {
        for (let key in this.list) {
            this.list[key].length = 0
        }
    }

    getRandomByRole(role) {
        let arr = this.list[role]
        if (!arr) return null;
        return arr[randomIntInc(0, arr.length - 1)]
    }

    getRandom() {
        let rolesCount = 0
        for (let role in this.list)rolesCount++;
        let selectedRole = randomIntInc(0, rolesCount - 1)
        let selectedArray = []
        rolesCount = 0
        for (let role in this.list) {
            if (selectedRole === rolesCount) {
                selectedArray = this.list[role]
                break;
            }
            rolesCount++;
        }
        return selectedArray[randomIntInc(0, selectedArray.length - 1)]
    }

    get length() {
        let counter = 0
        for (let key in this.list) {
            counter += this.list[key].length
        }
        return counter;
    }

    _add(node) {
        let arr = this.list[node.role] || []
        if (this._contains(arr, node.id)) return;
        arr.push(node)
        this.list[node.role] = arr
    }

    _contains(arr, id) {
        return arr.some(n=>n.id === id)
    }

    getList() {
        let res = []
        for (let key in this.list) {
            res = res.concat(this.list[key])
        }
        return res;
    }

    toString() {
        return JSON.stringify(this.list)
    }
}

module.exports = Collection