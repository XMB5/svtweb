import $ from 'jquery/dist/jquery'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import {library, dom} from '@fortawesome/fontawesome-svg-core'
import {faUser, faCircleNotch, faQuestionCircle, faSquare} from '@fortawesome/free-solid-svg-icons'

console.log('svtweb index.js loaded');

library.add(faUser, faCircleNotch, faQuestionCircle, faSquare);
dom.i2svg();

$(document).ready(async function() {

    let config;
    let configBaseDir;
    let points;

    const TEXT = {
        WAIT_FOR_ADVICE: 'Wait for advice...',
        CHOOSE: 'Choose',
        WAIT_FOR_CORRECT: 'Wait for correct answer...',
        CORRECT: 'Correct',
        INCORRECT: 'Incorrect',
        PROGRESS_WILL_BE_LOST: 'Progress will be lost!',
        THANK_YOU: 'Thank you!',
        SUBMISSION_ID: 'Submission ID: %s'
    };

    const BTN_COLORS = {
        YELLOW: 'btn-warning',
        BLUE: 'btn-primary'
    };

    const SIDE = {
        LEFT: 0,
        RIGHT: 1
    };

    const COLOR = {
        YELLOW: 0,
        BLUE: 1
    };

    const leftButton = $('#leftButton');
    const rightButton = $('#rightButton');

    const gameLoading = $('#gameLoading');
    const makeDecision = $('#makeDecision');

    const yellowCorrect = $('#yellowCorrect');
    const blueCorrect = $('#blueCorrect');

    const leftAdvice = $('#leftAdvice');
    const rightAdvice = $('#rightAdvice');

    const pointsBar = $('#pointsBar');
    const currentPoints = $('#currentPoints');

    const formArea = $('#formArea');

    const game = $('#game');

    const thankYou = $('#thankYou');

    function delay(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    function delayRange({min, max}) {
        const ms = (Math.random() * (max - min)) + min;
        return delay(ms);
    }

    function clearAdvice() {
        leftAdvice.hide();
        rightAdvice.hide();
    }

    function showAdviceForSide(side) {
        if (side === SIDE.LEFT) {
            leftAdvice.show();
        } else {
            rightAdvice.show();
        }
    }

    function setButtonsDisabled(disabled) {
        leftButton.prop('disabled', disabled);
        rightButton.prop('disabled', disabled);
    }

    function waitForSideChosen() {
        return new Promise(res => {
            function handler(event) {
                leftButton.off('click');
                rightButton.off('click');
                const chosenButtonEl = event.delegateTarget;
                res(leftButton.is(chosenButtonEl) ? 0 : 1);
            }
            leftButton.click(handler);
            rightButton.click(handler);
        });
    }

    function setButtonColors(yellowOnLeft) {
        const yellowBtn = yellowOnLeft ? leftButton : rightButton;
        const blueBtn = yellowOnLeft ? rightButton : leftButton;

        yellowBtn.addClass(BTN_COLORS.YELLOW);
        yellowBtn.removeClass(BTN_COLORS.BLUE);

        blueBtn.addClass(BTN_COLORS.BLUE);
        blueBtn.removeClass(BTN_COLORS.YELLOW);
    }

    function getSideForColor(color, yellowOnLeft) {
        if (color === COLOR.YELLOW) {
            return yellowOnLeft ? SIDE.LEFT : SIDE.RIGHT;
        } else {
            return yellowOnLeft ? SIDE.RIGHT : SIDE.LEFT;
        }
    }

    function getColorForSide(side, yellowOnLeft) {
        if (side === SIDE.LEFT) {
            return yellowOnLeft ? COLOR.YELLOW : COLOR.BLUE;
        } else {
            return yellowOnLeft ? COLOR.BLUE : COLOR.YELLOW;
        }
    }

    function showCorrectColor(color) {
        if (color === COLOR.YELLOW) {
            yellowCorrect.show();
        } else {
            blueCorrect.show();
        }
    }

    function hideCorrectColor() {
        yellowCorrect.hide();
        blueCorrect.hide();
    }

    function setProgress(percent) {
        currentPoints.css('width', percent + '%');
        let highestThreshold;
        let highestThresholdPercent = -1;
        for (let threshold of config.thresholds) {
            if (percent >= threshold.percent && threshold.percent > highestThresholdPercent) {
                highestThreshold = threshold;
                highestThresholdPercent = threshold.percent;
            }
        }
        if (highestThreshold) {
            currentPoints.text(highestThreshold.text);
        } else {
            currentPoints.text('');
        }
    }

    function addProgressBarThreshold(info) {
        const threshold = $('<div class="progress-bar progress-bar-threshold"></div>');
        if (info.percent === 100) {
            threshold.css('right', '0');
        } else {
            threshold.css('left', info.percent + '%');
        }
        threshold.css('background', info.color);
        threshold.text(info.text);
        pointsBar.append(threshold);
    }

    function otherSide(side) {
        return side === SIDE.RIGHT ? side.LEFT : SIDE.RIGHT;
    }

    async function runRound(round) {
        console.log('run round %o', round);

        setButtonColors(round.yellowOnLeft);

        gameLoading.show();
        await delayRange(config.delays.waitForAdvice);
        gameLoading.hide();

        const correctSide = getSideForColor(round.correctColor, round.yellowOnLeft);
        const adviceSide = round.adviceCorrect ? correctSide : otherSide(correctSide);
        showAdviceForSide(adviceSide);
        setButtonsDisabled(false);
        makeDecision.show();
        const adviceShownTime = performance.now();

        const sideChosen = await waitForSideChosen();
        const sideChosenTime = performance.now();
        const decisionMs = sideChosenTime - adviceShownTime;
        const colorChosen = getColorForSide(sideChosen, round.yellowOnLeft);
        makeDecision.hide();

        const selectedButtonEl = document.activeElement;
        if (selectedButtonEl) {
            selectedButtonEl.blur();
        }
        setButtonsDisabled(true);
        gameLoading.show();
        await delayRange(config.delays.waitForCorrect);
        gameLoading.hide();

        showCorrectColor(round.correctColor);
        const correct = colorChosen === round.correctColor;
        if (correct) {
            points++;
            setProgress(points / config.rounds.length * 100);
        }

        await delayRange(config.delays.startNextRound);
        hideCorrectColor();
        clearAdvice();

        return {round, colorChosen, correct, decisionMs};
    }

    async function runGame() {
        points = 0;
        const roundResults = [];

        //temp
        config.rounds = config.rounds.slice(0, 5);

        for (let threshold of config.thresholds) {
            if (threshold.percent > 0) {
                addProgressBarThreshold(threshold);
            }
        }

        game.show();

        for (let i = 0; i < config.rounds.length; i++) {
            const round = config.rounds[i];
            const roundResult = await runRound(round);
            roundResults.push(roundResult);
        }

        game.hide();

        return roundResults;
    }

    function sendData(submission) {
        return $.ajax('/api/submitData', {
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(submission),
            dataType: 'json'
        });
    }

    async function loadConfig(configBaseDirP) {
        configBaseDir = configBaseDirP;
        if (!configBaseDir.endsWith('/')) {
            configBaseDir += '/';
        }
        config = await $.ajax(configBaseDir + 'config.json', {
            dataType: 'json'
        });
    }

    let domIdCounter = 0;
    function uniqueDomId() {
        return 'id-' + domIdCounter++;
    }

    function getFormQuestionObj(info) {
        switch (info.type) {
            case 'heading':
                return $('<h3>').text(info.text);
            case 'paragraph':
                return $('<p>').text(info.text);
            case 'radioButtons':
                const radioFormGroup = $('<div class="form-group">');
                radioFormGroup.append($('<label>').text(info.text));
                for (let option of info.options) {
                    const div = $('<div class="form-check">');

                    const radioInput = $('<input type="radio" required>');
                    const inputId = uniqueDomId();
                    radioInput.attr('id', inputId);
                    radioInput.attr('name', info.text);
                    div.append(radioInput);

                    div.append(' ');

                    const label = $('<label>');
                    label.attr('for', inputId);
                    div.append(label);

                    if (typeof option === 'string') {
                        label.text(option);
                        radioInput.val(option);
                    } else {
                        label.text(option.display);
                        radioInput.val(option.value);
                    }

                    radioFormGroup.append(div);
                }
                return radioFormGroup;
            case 'textField':
                const textFieldFormGroup = $('<div class="form-group">');
                const textFieldId = uniqueDomId();
                textFieldFormGroup.append($('<label>').attr('for', textFieldId).text(info.text));
                textFieldFormGroup.append($('<input type="text" class="form-control" required>').attr('id', textFieldId));
                return textFieldFormGroup;
            case 'audio':
                const audioText = $('<div>').text(info.text);
                // controlsList="nodownload" hides download button on chrome
                // noinspection HtmlUnknownAttribute
                const audio = $('<audio controls controlsList="nodownload">').attr('src', configBaseDir + info.source);
                return $('<div class="form-group">').append(audioText, audio);
            case 'image':
                const imgText = $('<div>').text(info.text);
                // noinspection HtmlRequiredAltAttribute,RequiredAttributes
                const img = $('<img class="img-fluid">').attr('src', configBaseDir + info.source);
                return $('<div class="form-group">').append(imgText, img);
            default:
                throw new Error('unknwon form field type ' + info.type);
        }
    }

    async function runForm(formInfo) {
        const formResponses = [];
        formArea.show();
        for (let questionGroup of formInfo) {
            const questionGroupForm = $('<form autocomplete="off">');
            for (let question of questionGroup) {
                const formQuestionObj = getFormQuestionObj(question);
                questionGroupForm.append(formQuestionObj);
            }
            questionGroupForm.append($('<div class="form-group">').append($('<button type="submit" class="btn btn-secondary">Next</button>')))
            formArea.append(questionGroupForm);
            await new Promise(res => {
                questionGroupForm.submit(function (e) {
                    e.preventDefault();
                    res();
                });
            });
            questionGroupForm.remove();
            formResponses.push(...questionGroupForm.serializeArray());
        }
        formArea.hide();
        return formResponses;
    }

    function warnOnLeave() {
        $(window).on('beforeunload', () => {
            return '!'; //not shown to user
        });
    }

    function showThankYou(fileName) {
        thankYou.append($('<h3>').text(TEXT.THANK_YOU));
        thankYou.append($('<p>').text(TEXT.SUBMISSION_ID.replace('%s', fileName)));
        thankYou.show();
    }

    async function main() {

        await loadConfig('/api/config');
        warnOnLeave();
        const preFormResponses = await runForm(config.preForm);
        const roundResults = await runGame();
        const postFormResponses = await runForm(config.postForm);
        const {fileName} = await sendData({preFormResponses, postFormResponses, roundResults});
        showThankYou(fileName);

    }

    try {
        await main();
    } catch (e) {
        console.error('critical error %o', e);
        alert('Critical Error: ' + e.toString() + '\nDetails logged to console');
    }
});