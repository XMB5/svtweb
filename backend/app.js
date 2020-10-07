'use strict';

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const SubmissionSaver = require('./SubmissionSaver.js');
const log = require('./log.js')('main');
const fs = require('fs');
const {promisify} = require('util');

const readFilePromise = promisify(fs.readFile);

const init = async () => {

    const configDir = process.env.SVTWEB_CONFIG_DIR;
    if (!configDir) {
        throw new Error('must pass svt config directory in environment variable SVTWEB_CONFIG_DIR');
    }
    const staticDir = process.env.SVTWEB_STATIC_DIR;
    if (!staticDir) {
        log('not serving static files (environment variable SVTWEB_STATIC_DIR is empty)');
    }

    const redcapApiTokenFile = process.env.SVTWEB_REDCAP_API_TOKEN_FILE;
    let redcapApiToken;
    if (redcapApiTokenFile) {
        log('read api token file', redcapApiTokenFile);
        redcapApiToken = await readFilePromise(redcapApiTokenFile, 'utf8').trim();
    } else {
        redcapApiToken = '';
    }
    const submissionSaver = new SubmissionSaver({
        submissionsDir: process.env.SVTWEB_SUBMISSIONS_DIR,
        redcapApiUrl: process.env.SVTWEB_REDCAP_API_URL,
        redcapApiToken,
        redcapCsvField: process.env.SVTWEB_REDCAP_CSV_FIELD,
        redcapRewardField: process.env.SVTWEB_REDCAP_REWARD_FIELD
    });

    if (submissionSaver.isSavingToFile()) {
        log('submission will be saved to directory', submissionSaver.submissionsDir);
    }
    if (submissionSaver.isSavingToRedcap()) {
        if (!submissionSaver.redcapApiToken) {
            throw new Error('redcap api url set, but missing redcap api token');
        }
        log('submissions will be saved to redcap at api url', submissionSaver.redcapApiUrl,
            'in csv field', submissionSaver.redcapCsvField,
            'with reward field', submissionSaver.redcapRewardField || '(none)',
            'with api token of length', submissionSaver.redcapApiToken.length);
    }
    if (!submissionSaver.isSavingToRedcap() && !submissionSaver.isSavingToFile()) {
        log('submissions will not be saved anywhere');
    }

    const redcapAllowExport = process.env.SVTWEB_REDCAP_ALLOW_EXPORT === '1';
    await submissionSaver.checkAccess(redcapAllowExport);

    const port = parseInt(process.env.SVTWEB_PORT) || 9090;
    const host = process.env.SVTWEB_HOST || 'localhost';

    const server = Hapi.server({
        port,
        host
    });

    await server.register(Inert);

    server.route({
        method: 'GET',
        path: '/api/config/{file*}',
        handler: {
            directory: {
                path: configDir,
                index: false
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/api/submitData',
        handler: async (request, h) => {
            if (request.headers['x-svtweb-anti-csrf'] === '1') {
                const submissionObj = request.payload;
                const submissionId = await submissionSaver.saveSubmission(submissionObj);
                return {submissionId};
            } else {
                return h.response().code(403);
            }
        },
        config: {
            payload: {
                maxBytes: 10e6 //10MB
            }
        }
    });

    if (staticDir) {
        server.route({
            method: 'GET',
            path: '/{file*}',
            handler: {
                directory: {
                    path: staticDir
                }
            }
        });
    }

    server.ext('onPreResponse', (request, h) => {
        if (request.response.isBoom) {
            log('error handling request to', request.path, '\n' + request.response.stack);
        }
        return h.continue;
    });

    process.on('SIGTERM', async () => {
        log('caught SIGTERM, stopping');
        await server.stop();
    });

    await server.start();
    log('listening on', server.info.uri);
};

process.on('unhandledRejection', err => {
    console.error(err);
    process.exit(1);
});

init();