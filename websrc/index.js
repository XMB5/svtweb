import $ from 'jquery/dist/jquery'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import {icon} from '@fortawesome/fontawesome-svg-core'
import {faUser} from '@fortawesome/free-solid-svg-icons'

console.log('svtweb index.js loaded');

$(document).ready(async function() {

    let config;

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

    const SIDE = {
        LEFT: 0,
        RIGHT: 1
    };

    const ICON = {
        ADVISOR: faUser
    };

    const OUTLINE_CLASS = {
        CORRECT: 'green-outline',
        INCORRECT: 'red-outline'
    };
    const ALL_OUTLINE_CLASSES = Object.values(OUTLINE_CLASS).join(' ');

    const leftButton = $('#leftButton');
    const rightButton = $('#rightButton');

    const leftButtonOutline = $('#leftButtonOutline');
    const rightButtonOutline = $('#rightButtonOutline');

    const statusText = $('#statusText');

    const leftIcons = $('#leftIcons');
    const rightIcons = $('#rightIcons');

    const pointsBar = $('#pointsBar');
    const currentPoints = $('#currentPoints');

    const formArea = $('#formArea');

    const game = $('#game');

    const thankYou = $('#thankYou');

    function delay({min, max}) {
        const ms = (Math.random() * (max - min)) + min;
        return new Promise(res => setTimeout(res, ms));
    }

    function setStatusText(text) {
        statusText.text(text);
    }

    function genIcon(faIcon) {
        const node = icon(faIcon, {
            transform: {
                size: 48 //starts at 16
            }
        }).node[0];
        return $(node).addClass('mx-4');
    }

    /**
     * @param faIcon Font Awesome icon
     * @see https://fontawesome.com/cheatsheet
     */
    function addIconLeft(faIcon) {
        leftIcons.append(genIcon(faIcon));
    }

    function addIconRight(faIcon) {
        rightIcons.prepend(genIcon(faIcon));
    }

    function clearIcons() {
        leftIcons.empty();
        rightIcons.empty();
    }

    /**
     * Shows advice icon on one side
     * @param side 0==left, 1==right
     */
    function showAdviceForSide(side) {
        if (side === SIDE.LEFT) {
            addIconLeft(ICON.ADVISOR);
        } else {
            addIconRight(ICON.ADVISOR);
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

    function showCorrectSide(side) {
        let correctOutline = side === SIDE.RIGHT ? rightButtonOutline : leftButtonOutline;
        let incorrectOutline = side === SIDE.RIGHT ? leftButtonOutline : rightButtonOutline;
        correctOutline.addClass(OUTLINE_CLASS.CORRECT);
        incorrectOutline.addClass(OUTLINE_CLASS.INCORRECT);
    }

    function resetOutlines() {
        leftButtonOutline.removeClass(ALL_OUTLINE_CLASSES);
        rightButtonOutline.removeClass(ALL_OUTLINE_CLASSES);
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

        setStatusText(TEXT.WAIT_FOR_ADVICE)
        await delay(config.delays.waitForAdvice);

        setStatusText(TEXT.CHOOSE);
        showAdviceForSide(round.adviceCorrect ? round.correctSide : otherSide(round.correctSide));
        setButtonsDisabled(false);
        const adviceShownTime = performance.now();

        const sideChosen = await waitForSideChosen();
        const sideChosenTime = performance.now();
        const decisionMs = sideChosenTime - adviceShownTime;
        const selectedButtonEl = document.activeElement;
        if (selectedButtonEl) {
            selectedButtonEl.blur();
        }
        setButtonsDisabled(true);
        setStatusText(TEXT.WAIT_FOR_CORRECT);
        await delay(config.delays.waitForCorrect);

        const correct = sideChosen === round.correctSide;
        setStatusText(correct ? TEXT.CORRECT : TEXT.INCORRECT);
        showCorrectSide(round.correctSide);

        await delay(config.delays.startNextRound);
        resetOutlines();
        clearIcons();

        return {round, sideChosen, decisionMs};
    }

    async function runGame() {
        const roundResults = [];

        config.rounds = config.rounds.slice(0, 5);

        for (let threshold of config.thresholds) {
            if (threshold.percent > 0) {
                addProgressBarThreshold(threshold);
            }
        }

        const numRounds = config.rounds.length;
        let points = 0;

        game.show();

        for (let i = 0; i < numRounds; i++) {
            const round = config.rounds[i];
            const roundResult = await runRound(round);
            if (roundResult.sideChosen === roundResult.round.correctSide) {
                points++;
            }
            roundResults.push(roundResult);
            setProgress(points / numRounds * 100);
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

    async function loadConfig() {
        config = await $.ajax('/api/config', {
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

        await loadConfig();
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