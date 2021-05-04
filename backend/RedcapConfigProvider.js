const log = require('./log.js')('RedcapConfigProvider');
const fs = require('fs');
const {promisify} = require('util');
const readFilePromise = promisify(fs.readFile);

class RedcapConfig {

    constructor(jsonObj) {
        if (typeof jsonObj.apiUrl === 'string') {
            this.apiUrl = jsonObj.apiUrl;
        } else {
            throw new Error('invalid or missing apiUrl');
        }

        if (typeof jsonObj.token === 'string') {
            this.token = jsonObj.token;
        } else {
            throw new Error('invalid or missing token');
        }

        if (typeof jsonObj.fieldNamePrefix === 'string') {
            this.fieldNamePrefix = jsonObj.fieldNamePrefix;
        } else {
            throw new Error('invalid or missing fieldPrefix');
        }

        if (typeof jsonObj.allowExport === 'boolean' || jsonObj.allowExport === undefined) {
            this.allowExport = jsonObj.allowExport === true;
        } else {
            throw new Error('invalid allowExport');
        }
    }

    allowsFieldName(fieldName) {
        return fieldName.startsWith(this.fieldNamePrefix);
    }

}

class RedcapConfigProvider {

    constructor(redcapConfigsFile) {
        this.redcapConfigsFile = redcapConfigsFile;
    }

    async init() {
        if (this.redcapConfigsFile) {
            log('provider redcap tokens from file', this.redcapConfigsFile);
        } else {
            log('no redcap tokens file');
        }
    }

    async getConfig(name) {
        log('get token with name', name);
        const allConfigs = await this.getAllConfigs();
        return allConfigs.get(name);
    }

    async getAllConfigs() {
        if (!this.redcapConfigsFile) {
            return new Map();
        }

        try {
            log('read tokens file');
            const raw = await readFilePromise(this.redcapConfigsFile, 'utf8');
            const obj = JSON.parse(raw);
            const tokens = new Map();
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const configJson = obj[key];
                    try {
                        const config = new RedcapConfig(configJson);
                        tokens.set(key, config);
                    } catch (e) {
                        log('warning, could not process config with key', key, e);
                    }
                }
            }
            return tokens;
        } catch (e) {
            log('warning, could process tokens file', e);
            return new Map();
        }

    }

}

module.exports = RedcapConfigProvider;