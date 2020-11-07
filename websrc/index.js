import $ from 'jquery/dist/jquery';
import 'bootstrap/dist/js/bootstrap.bundle';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import {library, dom} from '@fortawesome/fontawesome-svg-core';
import {faUser, faCircleNotch, faQuestionCircle, faSquare} from '@fortawesome/free-solid-svg-icons';

library.add(faUser, faCircleNotch, faQuestionCircle, faSquare);
dom.i2svg();

$(document).ready(async function() {

    let config;
    let configBaseDir;

    const BTN_COLORS = {
        YELLOW: 'btn-warning',
        BLUE: 'btn-primary'
    };

    const ICON_HIDDEN_CLASS = 'icon-hidden';

    const SIDE = {
        LEFT: 0,
        RIGHT: 1
    };

    const COLOR = {
        YELLOW: 0,
        BLUE: 1
    };

    const DEMO_BUTTON = {
        NEXT: 0,
        REDO: 1
    };

    const formArea = $('#formArea');

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

    const demoArea = $('#demoArea');
    const demoHeading = $('#demoHeading');
    const demoText = $('#demoText');
    const demoRedoButton = $('#demoRedoButton');
    const demoNextButton = $('#demoNextButton');

    const game = $('#game');

    const advisorBarDivider = $('#advisorBarDivider');
    const advisorBarArea = $('#advisorBarArea');
    const advisorBarsHeading = $('#advisorBarsHeading');

    const endScreen = $('#endScreen');
    
    const fadeDuration = 400;

    function delayMs(ms) {
        return new Promise(res => setTimeout(res, ms / (window.aaa || 1)));
    }

    function delayWithConfig(delayConfig) {
        if (typeof(delayConfig) === 'number') {
            return delayMs(delayConfig);
        } else {
            const ms = (Math.random() * (delayConfig.max - delayConfig.min)) + delayConfig.min;
            return delayMs(ms);
        }
    }

    function hideAdvice() {
        leftAdvice.addClass(ICON_HIDDEN_CLASS);
        rightAdvice.addClass(ICON_HIDDEN_CLASS);
    }

    function showAdviceForSide(side) {
        if (side === SIDE.LEFT) {
            leftAdvice.removeClass(ICON_HIDDEN_CLASS);
        } else {
            rightAdvice.removeClass(ICON_HIDDEN_CLASS);
        }
    }

    function setButtonsDisabled(disabled) {
        leftButton.prop('disabled', disabled);
        rightButton.prop('disabled', disabled);
    }

    function waitForDecision() {
        return new Promise(res => {
            setButtonsDisabled(false);
            makeDecision.show();

            function handler(event) {
                makeDecision.hide();
                setButtonsDisabled(true);
                leftButton.off('click');
                rightButton.off('click');
                const chosenButtonEl = event.delegateTarget;
                res(leftButton.is(chosenButtonEl) ? 0 : 1);
            }
            leftButton.click(handler);
            rightButton.click(handler);
        });
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

    function setProgress(el, rewards, fraction) {
        const percent = fraction * 100;
        el.css('width', percent + '%');
        let bestReward;
        for (let reward of rewards) {
            if (percent >= reward.startPercent && percent <= reward.endPercent &&
                (!bestReward || bestReward.endPercent < reward.endPercent)) {
                bestReward = reward;
            }
        }
        const rewardStr = bestReward ? bestReward.text : config.noReward;
        el.text(rewardStr);
        return rewardStr;
    }

    function generateRangeIndicator(info) {
        const indicator = $('<div class="progress-bar progress-bar-threshold">');
        indicator.css('left', info.startPercent + '%');
        indicator.css('width', (info.endPercent - info.startPercent) + '%');
        indicator.css('background', info.color);
        indicator.text(info.text);
        return indicator;
    }

    function otherSide(side) {
        return side === SIDE.RIGHT ? side.LEFT : SIDE.RIGHT;
    }

    async function loadAdviceAnimation() {
        gameLoading.show();
        await delayWithConfig(config.delays.waitForAdvice);
        gameLoading.hide();
    }

    async function loadCorrectAnimation() {
        gameLoading.show();
        await delayWithConfig(config.delays.waitForCorrect);
        gameLoading.hide();
    }

    function showPopover(el, content) {
        el.data('popover-content', content);
        el.popover({
            content: function() {
                return $(this).data('popover-content');
            },
            placement: 'top',
            trigger: 'manual'
        });
        el.popover('show');
    }

    async function initGameDisplay() {
        leftButton.addClass(BTN_COLORS.YELLOW);
        rightButton.addClass(BTN_COLORS.BLUE);
        for (let reward of config.rewards) {
            const rangeIndicator = generateRangeIndicator(reward);
            pointsBar.append(rangeIndicator);
        }
    }

    function waitForDemoButton() {
        return new Promise(res => {
            demoNextButton.click(() => {
                demoNextButton.off('click');
                res(DEMO_BUTTON.NEXT);
            });
            demoRedoButton.click(() => {
                demoRedoButton.off('click');
                res(DEMO_BUTTON.REDO);
            });
        });
    }

    async function runGame(gameConfig) {
        const advisorBars = [];
        for (let barInfo of gameConfig.advisorBars || []) {
            const advisorBarWrapper = $('<div class="progress mt-3 position-relative progress-bar-wide">');
            const advisorBar = $('<div class="progress-bar above-threshold" style="width: 0">');
            advisorBarWrapper.append(advisorBar);
            for (let info of barInfo) {
                const rangeIndicator = generateRangeIndicator(info);
                advisorBarWrapper.append(rangeIndicator);
            }
            advisorBarArea.append(advisorBarWrapper);
            advisorBars.push([advisorBar, barInfo, advisorBarWrapper]);
        }

        let points = 0;
        let rewardStr = config.noReward;
        const roundResults = [];

        game.fadeIn(fadeDuration);
        await delayMs(fadeDuration * 4);

        for (let i = 0; i < gameConfig.rounds.length; i++) {
            hideCorrectColor();
            hideAdvice();

            const round = gameConfig.rounds[i];

            const popovers = round.popovers || {};
            const correctColor = round.yellowCorrect ? COLOR.YELLOW : COLOR.BLUE;

            let yellowText;
            let blueText;
            if (gameConfig.hidePointsOnButtons || round.hidePointsOnButtons) {
                yellowText = '';
                blueText = '';
            } else {
                yellowText = round.yellowPoints === undefined ? '' : round.yellowPoints.toString();
                blueText = round.bluePoints === undefined ? '' : round.bluePoints.toString();
            }

            const yellowBtn = round.yellowOnLeft ? leftButton : rightButton;
            const blueBtn = round.yellowOnLeft ? rightButton : leftButton;

            yellowBtn.addClass(BTN_COLORS.YELLOW);
            yellowBtn.removeClass(BTN_COLORS.BLUE);
            yellowBtn.find('.points').text(yellowText);

            blueBtn.addClass(BTN_COLORS.BLUE);
            blueBtn.removeClass(BTN_COLORS.YELLOW);
            blueBtn.find('.points').text(blueText);

            await loadAdviceAnimation();

            const correctSide = getSideForColor(correctColor, round.yellowOnLeft);
            const adviceSide = round.adviceCorrect ? correctSide : otherSide(correctSide);
            if (!round.hideAdvice) {
                showAdviceForSide(adviceSide);
            }
            setButtonsDisabled(false);
            if (popovers.yellowButton) {
                showPopover(yellowBtn, popovers.yellowButton);
            }
            if (popovers.blueButton) {
                showPopover(blueBtn, popovers.blueButton);
            }
            let adviceIcon;
            if (popovers.advice) {
                adviceIcon = adviceSide === SIDE.LEFT ? leftAdvice : rightAdvice;
                showPopover(adviceIcon, popovers.advice);
            }
            const adviceShownTime = performance.now();

            const sideChosen = await waitForDecision();
            if (popovers.yellowButton) {
                yellowBtn.popover('hide');
            }
            if (popovers.blueButton) {
                blueBtn.popover('hide');
            }
            if (popovers.advice) {
                adviceIcon.popover('hide');
            }
            const sideChosenTime = performance.now();
            const decisionMs = sideChosenTime - adviceShownTime;
            const colorChosen = getColorForSide(sideChosen, round.yellowOnLeft);

            const selectedButtonEl = document.activeElement;
            if (selectedButtonEl) {
                selectedButtonEl.blur();
            }
            setButtonsDisabled(true);
            await loadCorrectAnimation();

            showCorrectColor(correctColor);
            const correct = colorChosen === correctColor;
            let pointsChange;
            if (correct) {
                pointsChange = colorChosen === COLOR.YELLOW ? round.yellowPoints : round.bluePoints;
            } else {
                pointsChange = gameConfig.incorrectPenalty;
            }

            const roundResult = {round, colorChosen, correct, pointsChange, decisionMs};
            roundResults.push(roundResult);

            if (round.showAdvisorViews) {
                advisorBarDivider.fadeIn();
                advisorBarArea.fadeIn();
            }
            points += roundResult.pointsChange;
            const fraction = points / gameConfig.totalPoints;
            rewardStr = setProgress(currentPoints, config.rewards, fraction);
            for (let [el, barInfo] of advisorBars) {
                setProgress(el, barInfo, fraction);
            }
            let extraDelay = false;
            const correctIcon = correctColor === COLOR.YELLOW ? yellowCorrect : blueCorrect;
            if (roundResult.correct && popovers.correct) {
                showPopover(correctIcon, popovers.correct);
                extraDelay = true;
            }
            if (!roundResult.correct && popovers.incorrect) {
                showPopover(correctIcon, popovers.incorrect);
                extraDelay = true;
            }
            if (popovers.pointsBar) {
                showPopover(pointsBar, popovers.pointsBar);
                extraDelay = true;
            }
            if (popovers.advisorBar) {
                showPopover(advisorBarArea, popovers.advisorBar);
                extraDelay = true;
            }
            await delayWithConfig(config.delays.startNextRound);
            if (extraDelay) {
                await delayWithConfig(config.delays.popoverExtra);
            }

            if ((roundResult.correct && popovers.correct) || (!roundResult.correct && popovers.incorrect)) {
                correctIcon.popover('hide');
            }
            if (popovers.pointsBar) {
                pointsBar.popover('hide');
            }
            if (popovers.advisorBar) {
                advisorBarArea.popover('hide');
            }

            if (round.form) {
                game.fadeOut(fadeDuration);
                const advisorBarsWereHidden = advisorBarDivider.is(':hidden');
                advisorBarDivider.fadeOut(fadeDuration);
                advisorBarArea.fadeOut(fadeDuration);
                await delayMs(fadeDuration);

                roundResult.formResponses = await runForm(round.form);

                if (i < (gameConfig.rounds.length - 1)) {
                    //before last round
                    game.fadeIn(fadeDuration);
                    if (!advisorBarsWereHidden) {
                        advisorBarDivider.fadeIn(fadeDuration);
                        advisorBarArea.fadeIn(fadeDuration);
                    }
                }
            }
        }

        if (!game.is(':hidden')) {
            game.fadeOut(fadeDuration);
            advisorBarDivider.fadeOut(fadeDuration);
            advisorBarArea.fadeOut(fadeDuration);
            await delayMs(fadeDuration);
            await delayMs(fadeDuration);
        }

        for (let [el, barInfo, wrapper] of advisorBars) {
            wrapper.remove();
        }

        setProgress(currentPoints, config.rewards, 0);

        hideAdvice();
        hideCorrectColor();

        leftButton.add(rightButton).find('.points').text('');

        return {roundResults, rewardStr, points};
    }

    async function runDemo() {

        setButtonsDisabled(true);
        demoHeading.text(config.demoText.heading);
        demoText.text(config.demoText.start);
        demoRedoButton.hide();
        demoRedoButton.text(config.demoText.redoButton);
        demoNextButton.text(config.demoText.nextButton);
        demoArea.show();
        await waitForDemoButton();

        while (true) {
            demoNextButton.prop('disabled', true);
            demoArea.fadeOut(fadeDuration);
            await delayMs(fadeDuration);
            advisorBarsHeading.text(config.demoText.advisorBarsHeading);

            console.log(await runGame(config.demoGame));

            demoText.text(config.demoText.finish);
            demoRedoButton.show();
            demoNextButton.prop('disabled', false);
            demoArea.fadeIn(fadeDuration);
            if (await waitForDemoButton() === DEMO_BUTTON.NEXT) {
                demoArea.fadeOut(fadeDuration);
                await delayMs(fadeDuration);
                break;
            }
        }

    }

    let domIdCounter = 0;
    function uniqueDomId() {
        return 'unique-id-' + (domIdCounter++);
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

                    const radioInput = $('<input type="radio">').prop('required', !!info.required);
                    radioInput.prop('name', info.name);
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
                const textField = $('<input type="text" class="form-control">').attr('id', textFieldId);
                textField.prop('name', info.name);
                textField.prop('required', !!info.required);
                textFieldFormGroup.append(textField);
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

    async function runForm(formObjInfos) {
        formArea.fadeIn(fadeDuration);

        const questionGroupForm = $('<form autocomplete="off">');
        for (let formObjInfo of formObjInfos) {
            const formQuestionObj = getFormQuestionObj(formObjInfo);
            questionGroupForm.append(formQuestionObj);
        }
        const nextButton = $('<button type="submit" class="btn btn-secondary"></button>').text(config.formText.nextButton);
        questionGroupForm.append($('<div class="form-group">').append(nextButton));
        formArea.append(questionGroupForm);
        await new Promise(res => {
            questionGroupForm.submit(function (e) {
                e.preventDefault();
                res();
            });
        });
        const formResponsesArr = questionGroupForm.serializeArray();
        const formResponses = {};
        for (let {name, value} of formResponsesArr) {
            formResponses[name] = value;
        }

        formArea.fadeOut(fadeDuration);
        await delayMs(fadeDuration);
        questionGroupForm.remove();

        return formResponses;
    }

    function sendData(submission) {
        return $.ajax('/api/submitData', {
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(submission),
            dataType: 'json',
            headers: {
                'X-Svtweb-Anti-Csrf': '1'
            }
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

    function warnOnLeave() {
        $(window).on('beforeunload', () => {
            return 'data will be lost'; //browser will not show message to user
        });
    }

    function showEndScreen(rewardStr, submissionId) {
        endScreen.append($('<h3>').text(config.endScreenText.heading));
        const body = config.endScreenText.body.replace('%SUBMISSION_ID%', submissionId).replace('%REWARD%', rewardStr);
        endScreen.append($('<p class="text-with-whitespace">').text(body));
        endScreen.show();
    }

    async function main() {

        const params = new URLSearchParams(window.location.search);

        await loadConfig('/api/config');
        warnOnLeave();
        await initGameDisplay();
        await runDemo();
        const {roundResults, rewardStr, points} = await runGame(config.game);
        game.hide();
        //todo: add "sending..."
        const {submissionId} = await sendData({
            roundResults,
            reward: rewardStr,
            points,
            eventName: params.get('eventName'),
            recordId: params.get('recordId')
        });
        const nextUrl = params.get('nextUrl');
        if (nextUrl) {
            window.location = nextUrl;
        } else {
            showEndScreen(rewardStr, submissionId);
        }

    }

    try {
        await main();
    } catch (e) {
        console.error('critical error %o', e);
        alert('Critical Error: ' + e.toString() + '\nDetails logged to console');
    }
});