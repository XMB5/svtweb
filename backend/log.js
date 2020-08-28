function generateLogger(name) {
    return function(...args) {
        console.log('[%s]', name, ...args);
    }
}

module.exports = generateLogger;