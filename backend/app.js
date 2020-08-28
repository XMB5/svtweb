'use strict';

const Hapi = require('@hapi/hapi');

const SVTConfigLoader = require('./SVTConfigLoader.js');
const SubmissionSaver = require('./SubmissionSaver.js');
const log = require('./log.js')('app');

const init = async () => {

    const configDir = process.env.API_CONFIG_DIR;
    if (!configDir) {
        throw new Error('pass svt config directory in environment variable API_CONFIG_DIR');
    }
    const submissionsDir = process.env.API_SUBMISSIONS_DIR;
    if (!submissionsDir) {
        throw new Error('pass submissions directory in environment variable API_SUBMISSIONS_DIR');
    }
    const staticDir = process.env.API_STATIC_DIR;
    if (!staticDir) {
        log('environment variable API_STATIC_DIR is empty - will not serve any static files');
    }
    const port = parseInt(process.env.API_PORT) || 9090;
    const host = process.env.API_HOST || 'localhost';

    const svtConfigLoader = new SVTConfigLoader(configDir);
    const config = svtConfigLoader.loadConfig();

    const submissionSaver = new SubmissionSaver(submissionsDir);
    await submissionSaver.checkAccess();

    const server = Hapi.server({
        port,
        host
    });

    server.route({
        method: 'GET',
        path: '/api/config',
        handler: () => {
            return config;
        }
    });

    server.route({
        method: 'POST',
        path: '/api/submitData',
        handler: async request => {
            const submissionObj = request.payload;
            const fileName = await submissionSaver.saveSubmission(submissionObj);
            return {fileName};
        },
        config: {
            payload: {
                maxBytes: 10e6 //10MB
            }
        }
    });

    if (staticDir) {
        await server.register(require('@hapi/inert'));
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

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', err => {
    console.error(err);
    process.exit(1);
});

init();