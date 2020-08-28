const path = require('path');
const fs = require('fs');
const {promisify} = require('util');
const log = require('./log.js')('SubmissionSaver');

const writeFilePromise = promisify(fs.writeFile);
const accessPromise = promisify(fs.access);

class SubmissionSaver {

    constructor(outputDir) {
        this.outputDir = outputDir;
    }

    async checkAccess() {
        await accessPromise(this.outputDir, fs.constants.W_OK | fs.constants.X_OK);
    }

    async saveSubmission(submissionObj) {
        const fileData = SubmissionSaver.objToCSV(submissionObj);
        const dateString = new Date().toISOString();
        for (let i = 0; i < 100; i++) {
            const fileName = 'submission-' + dateString + '-' + i + '.csv';
            const filePath = path.join(this.outputDir, fileName);
            try {
                await writeFilePromise(filePath, fileData, {
                    flag: 'wx' //fail if exists
                });
                log('submission saved to', filePath);
                return;
            } catch (e) {
                if (e.code === 'EEXIST') {
                    log(`failed to save submission to ${filePath}, file already exists`);
                } else {
                    throw e;
                }
            }
        }
        throw new Error('failed to save submission after multiple tries');
    }

    static csvEscape(val) {
        const type = typeof val;
        if (type === 'string') {
            if (/["\r\n,]/.test(val)) {
                return '"' + val.replace(/"/g, '""') + '"';
            } else {
                return val;
            }
        } else if (type === 'object') {
            return SubmissionSaver.csvEscape(JSON.stringify(val));
        } else if (type === 'undefined') {
            return '';
        } else {
            return SubmissionSaver.csvEscape(val.toString());
        }
    }

    static convertToCsv(csvRows) {
        return csvRows.map(row => row.map(SubmissionSaver.csvEscape).join(',')).join('\r\n');
    }

    static csvFromForm(name, responses) {
        const preformRows = [
            [name],
            ['question', 'answer']
        ];
        responses.forEach(response => {
            preformRows.push([response.name, response.value]);
        });
        return SubmissionSaver.convertToCsv(preformRows);
    }

    static objToCSV(submissionObj) {
        const preFormCsv = SubmissionSaver.csvFromForm('preform responses', submissionObj.preFormResponses);
        const postFormCsv = SubmissionSaver.csvFromForm('postform responses', submissionObj.postFormResponses);

        const eventRows = [
            ['events'],
            ['type', 'ms', 'data']
        ];
        submissionObj.events.forEach(event => {
            eventRows.push([event.type, event.ms, event.data]);
        });
        const eventCsv = SubmissionSaver.convertToCsv(eventRows);

        return preFormCsv + '\r\n\r\n' + postFormCsv + '\r\n\r\n' + eventCsv;
    }

}

module.exports = SubmissionSaver;