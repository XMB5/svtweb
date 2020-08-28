'use strict';

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');

const SVTConfigLoader = require('./SVTConfigLoader.js');
const SubmissionSaver = require('./SubmissionSaver.js');

const init = async () => {

    const configDir = process.env.API_CONFIG_DIR;
    if (!configDir) {
        throw new Error('pass svt config directory in environment variable API_CONFIG_DIR');
    }
    const submissionsDir = process.env.API_SUBMISSIONS_DIR;
    if (!submissionsDir) {
        throw new Error('pass submissions directory in environment variable API_SUBMISSIONS_DIR');
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

    await server.register(Inert);

    server.route({
        method: 'GET',
        path: '/api/config',
        handler: (request, h) => {
            return config;
        }
    });

    server.route({
        method: 'POST',
        path: '/api/submitData',
        handler: async (request, h) => {
            const submissionObj = request.payload;
            await submissionSaver.saveSubmission(submissionObj);
            return h.response();
        },
        config: {
            payload: {
                maxBytes: 10e6 //10MB
            }
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', err => {
    console.error(err);
    process.exit(1);
});

init();