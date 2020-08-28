const fs = require('fs');
const path = require('path');
const {promisify} = require('util');

const readFilePromise = promisify(fs.readFile);

class SVTConfigLoader {

    constructor(configDir) {
        this.configDir = configDir;
    }

    async loadConfig() {
        return await readFilePromise(path.join(this.configDir, 'config.json'), 'utf8');
    }

}

module.exports = SVTConfigLoader;