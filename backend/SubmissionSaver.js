'use strict';

const path = require('path');
const fs = require('fs');
const {promisify} = require('util');
const log = require('./log.js')('SubmissionSaver');
const axios = require('axios');
const querystring = require('querystring');
const FormData = require('form-data');

const writeFilePromise = promisify(fs.writeFile);
const accessPromise = promisify(fs.access);

class SubmissionSaver {

    constructor({submissionsDir, redcapConfigProvider}) {
        this.submissionsDir = submissionsDir;
        this.redcapConfigProvider = redcapConfigProvider;
        this.redcapAxios = axios.create({
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            responseType: 'json',
            validateStatus: undefined
        });
    }

    isSavingToFile() {
        return !!this.submissionsDir;
    }

    async checkAccess() {
        if (this.isSavingToFile()) {
            log('check access for directory', this.submissionsDir);
            await accessPromise(this.submissionsDir, fs.constants.W_OK | fs.constants.X_OK);
        }

        const allConfigs = await this.redcapConfigProvider.getAllConfigs();
        if (allConfigs.size === 0) {
            log('no redcap configs to check access to');
        } else {
            for (const [configName, redcapConfig] of allConfigs) {
                log('check redcap config', configName, 'with api url', redcapConfig.apiUrl, 'token of length', redcapConfig.token.length, 'and allow export', redcapConfig.allowExport);
                //export project info request
                const res = await this.redcapAxios({
                    baseURL: redcapConfig.apiUrl,
                    data: querystring.stringify({
                        token: redcapConfig.token,
                        content: 'project',
                        format: 'json',
                        returnFormat: 'json'
                    })
                });
                if (res.status === 403) {
                    if (res.data.error === 'You do not have API Export privileges') {
                        //success
                        //export privileges would be security risk
                        //if hacker stole api token, they shouldn't be able to steal data
                        log('redcap config', configName, 'api token works, and token does not have export privileges')
                    } else if (res.data.error === 'You do not have permissions to use the API') {
                        throw new Error('redcap api access forbidden (perhaps invalid api token?)');
                    } else {
                        throw new Error('redcap error: ' + res.data.error)
                    }
                } else if (res.status === 200) {
                    if (redcapConfig.allowExport) {
                        log('redcap config', configName, 'allows exporting data, continuing because allowExport is true');
                    } else {
                        log('!! WARNING !! redcap config', configName, 'allows exporting data but allowExport is false, could leak sensitive information if token is stolen');
                    }
                }
            }
        }

    }

    async saveCsvToFile(csvData, submissionId) {
        for (let i = 0; i < 100; i++) {
            const fileName = submissionId + (i > 0 ? ('-' + i) : '') + '.csv';
            const filePath = path.join(this.submissionsDir, fileName);
            try {
                await writeFilePromise(filePath, csvData, {
                    flag: 'wx' //fail if exists
                });
                log('submission saved to', filePath);
                return fileName;
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

    async saveCsvToRedcap({csvStr, submissionId, reward, eventName, recordId, redcapCsvField, redcapRewardField, redcapConfigName}) {
        if (!recordId) {
            throw new Error('empty recordId, required when submitting to redcap');
        }
        if (typeof(reward) !== 'string') {
            throw new Error('missing or invalid reward');
        }
        if (typeof(redcapRewardField) !== 'string') {
            throw new Error('missing or invalid redcapRewardField');
        }
        if (typeof(redcapCsvField) !== 'string') {
            throw new Error('missing or invalid redcapCsvField');
        }
        if (typeof(redcapConfigName) !== 'string') {
            throw new Error('missing or invalid redcapConfigName');
        }

        const redcapConfig = await this.redcapConfigProvider.getConfig(redcapConfigName);
        if (!redcapConfig) {
            throw new Error('redcapConfigName provided, but config not found');
        }
        if (!redcapConfig.allowsFieldName(redcapCsvField) || !redcapConfig.allowsFieldName(redcapRewardField)) {
            throw new Error('redcap field name not allowed');
        }

        //save csv file
        const fileForm = new FormData();
        fileForm.append('token', redcapConfig.token);
        fileForm.append('content', 'file');
        fileForm.append('action', 'import');
        fileForm.append('returnFormat', 'json');
        fileForm.append('record', recordId);
        fileForm.append('field', redcapCsvField);
        if (eventName) {
            fileForm.append('event', eventName);
        }
        const filename = submissionId + '.csv';
        fileForm.append('filename', filename);
        fileForm.append('file', csvStr, {filename});
        log('save csv for submission id', submissionId, 'in redcap field', redcapCsvField);
        const fileRes = await this.redcapAxios({
            baseURL: redcapConfig.apiUrl,
            data: fileForm,
            headers: fileForm.getHeaders()
        });
        if (fileRes.data.error) {
            throw new Error('redcap error: ' + fileRes.data.error);
        }

        //save reward
        if (redcapRewardField) {
            const record = {
                'record': recordId,
                'field_name': redcapRewardField,
                'value': reward
            };
            if (eventName) {
                record['redcap_event_name'] = eventName;
            }
            const rewardForm = new FormData();
            rewardForm.append('token', redcapConfig.token);
            rewardForm.append('content', 'record');
            rewardForm.append('format', 'json');
            rewardForm.append('type', 'eav');
            rewardForm.append('overwriteBehavior', 'normal');
            rewardForm.append('forceAutoNumber', 'false');
            rewardForm.append('returnContent', 'nothing');
            rewardForm.append('returnFormat', 'json');
            rewardForm.append('data', JSON.stringify([record]));
            log('save reward for submission id', submissionId, 'in redcap field', redcapRewardField);
            const rewardRes = await this.redcapAxios({
                baseURL: redcapConfig.apiUrl,
                data: rewardForm,
                headers: rewardForm.getHeaders()
            });
            if (rewardRes.data.error) {
                throw new Error('redcap error: ' + rewardRes.data.error);
            }
        }
    }

    async saveSubmission(submissionObj) {
        const recordId = submissionObj['recordId'];
        const eventName = submissionObj['eventName'];

        let submissionId = 'submission-';
        if (recordId) {
            submissionId += recordId + '-';
        }
        if (eventName) {
            submissionId += eventName + '-';
        }
        submissionId += new Date().toISOString();

        const csvStr = SubmissionSaver.objToCSV(submissionObj);
        if (this.isSavingToFile()) {
            await this.saveCsvToFile(csvStr, submissionId);
        }
        try {
            await this.saveCsvToRedcap({
                csvStr,
                submissionId,
                reward: submissionObj.reward,
                recordId,
                eventName,
                redcapRewardField: submissionObj.redcapRewardField,
                redcapCsvField: submissionObj.redcapCsvField,
                redcapConfigName: submissionObj.redcapConfigName
            });
        } catch (e) {
            if (this.isSavingToFile()) {
                log('failed to save submission', submissionId, 'to redcap, but saved to file successfully, redcap error', e);
            } else {
                log('failed to save submission', submissionId, 'to redcap, and not configured to save to file');
                throw e;
            }
        }

        return submissionId;
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

    static objToCSV(submissionObj) {
        const summaryRows = [
            ['summary'],
            ['reward', 'points'],
            [submissionObj.reward, submissionObj.points]
        ];
        const summaryCsv = SubmissionSaver.convertToCsv(summaryRows);

        const eventRows = [
            ['round results'],
            ['yellow correct', 'advice correct', 'yellow points', 'blue points', 'yellow on left', 'color chosen (0=yellow, 1=blue)', 'correct color chosen', 'decision milliseconds', 'form responses']
        ];
        submissionObj.roundResults.forEach(roundResult => {
            eventRows.push([
                roundResult.round.yellowCorrect, roundResult.round.adviceCorrect,
                roundResult.round.yellowPoints, roundResult.round.bluePoints,
                roundResult.round.yellowOnLeft,
                roundResult.colorChosen, roundResult.correct, roundResult.decisionMs,
                roundResult.formResponses || ''
            ]);
        });
        const eventCsv = SubmissionSaver.convertToCsv(eventRows);

        return [summaryCsv, eventCsv].join('\r\n\r\n');
    }

}

module.exports = SubmissionSaver;