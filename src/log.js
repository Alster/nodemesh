var rufus = require('rufus')
let filters = process.env.DEBUG ? process.env.DEBUG.split(' ') : []
if (filters.length > 0){
    if (filters[0] != '*' && filters[0] != '-app'){
        rufus.addFilter(rufus.makeFilter(msg=> {
            return new RegExp(filters.join('|')).test(msg.name);
        }))
    }
}
rufus.config({
    handlers: {
        terminal: {
            class: rufus.handlers.Console, format: '%logger: %message\n', 'level': process.env.DEBUG ? rufus.TRACE : rufus.ERROR,
        }
    },
    loggers: {
        root: {
            level: rufus.TRACE,
            handlers: [
                'terminal'
            ]
        }
    }
})
rufus.console()