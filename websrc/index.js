import $ from 'jquery/dist/jquery';
import 'bootstrap/dist/js/bootstrap.bundle';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import {library, dom} from '@fortawesome/fontawesome-svg-core';
import {faUser, faCircleNotch, faQuestionCircle, faSquare} from '@fortawesome/free-solid-svg-icons';

console.log('svtweb index.js loaded');

library.add(faUser, faCircleNotch, faQuestionCircle, faSquare);
dom.i2svg();

$(document).ready(async function() {

    let config;
    let configBaseDir;

    const TEXT = {
        THANK_YOU: 'Thank you!',
        SUBMISSION_ID: 'Submission ID: %s'
    };

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
    const demoText = $('#demoText');
    const demoNextButton = $('#demoNextButton');

    const game = $('#game');

    const advisorBarDivider = $('#advisorBarDivider');
    const advisorBarArea = $('#advisorBarArea');

    const thankYou = $('#thankYou');

    function delay(ms) {
        return new Promise(res => setTimeout(res, ms / (window.aaa || 1)));
    }

    function delayRange({min, max}) {
        const ms = (Math.random() * (max - min)) + min;
        return delay(ms);
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
        await delayRange(config.delays.waitForAdvice);
        gameLoading.hide();
    }

    async function loadCorrectAnimation() {
        gameLoading.show();
        await delayRange(config.delays.waitForCorrect);
        gameLoading.hide();
    }

    async function showPopover(el, content) {
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

    async function runRound(round) {
        console.log('run round %o', round);

        const popovers = round.popovers || {};

        setButtonColors(round.yellowOnLeft);

        await loadAdviceAnimation();

        const correctSide = getSideForColor(round.correctColor, round.yellowOnLeft);
        const adviceSide = round.adviceCorrect ? correctSide : otherSide(correctSide);
        if (!round.hideAdvice) {
            showAdviceForSide(adviceSide);
        }
        setButtonsDisabled(false);
        if (popovers.leftButton) {
            showPopover(leftButton, popovers.leftButton);
        }
        if (popovers.rightButton) {
            showPopover(rightButton, popovers.rightButton);
        }
        let adviceIcon;
        if (popovers.advice) {
            adviceIcon = adviceSide === SIDE.LEFT ? leftAdvice : rightAdvice;
            showPopover(adviceIcon, popovers.advice);
        }
        const adviceShownTime = performance.now();

        const sideChosen = await waitForDecision();
        if (popovers.leftButton) {
            leftButton.popover('hide');
        }
        if (popovers.rightButton) {
            rightButton.popover('hide');
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

        showCorrectColor(round.correctColor);
        const correct = colorChosen === round.correctColor;

        return {round, colorChosen, correct, decisionMs};
    }

    async function initGameDisplay() {
        for (let reward of config.rewards) {
            const rangeIndicator = generateRangeIndicator(reward);
            pointsBar.append(rangeIndicator);
        }
    }

    async function runGame() {
        game.fadeIn();

        let points = 0;
        const roundResults = [];
        let rewardStr = config.noReward;

        //temp
        config.rounds = config.rounds.slice(0, 5);

        for (let i = 0; i < config.rounds.length; i++) {
            const round = config.rounds[i];
            const roundResult = await runRound(round, {});
            if (roundResult.correct) {
                points++;
                rewardStr = setProgress(currentPoints, config.rewards, points / config.rounds.length);
            }
            await delayRange(config.delays.startNextRound);
            hideCorrectColor();
            hideAdvice();
            roundResults.push(roundResult);
        }

        return {roundResults, rewardStr};
    }

    function waitForDemoButton() {
        return new Promise(res => {
            demoNextButton.click(() => {
                demoNextButton.off('click');
                res();
            });
        });
    }

    async function runDemo() {
        demoArea.show();

        const advisorBars = [];
        for (let barInfo of config.demoAdvisorBars) {
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

        setButtonColors(config.demoRounds[0].yellowOnLeft);
        setButtonsDisabled(true);
        demoText.text('To learn how the game works, play a demo against the computer');
        await waitForDemoButton();

        demoNextButton.prop('disabled', true);
        demoArea.hide();
        game.fadeIn();
        await delay(1400);

        const totalPoints = 10;
        let points = 0;

        for (let i = 0; i < 5; i++) {
            const round = config.demoRounds[i];
            const popovers = round.popovers || {};
            const roundResult = await runRound(round);
            if (round.showAdvisorViews) {
                advisorBarDivider.fadeIn();
                advisorBarArea.fadeIn();
            }
            if (roundResult.correct) {
                points++;
                const fraction = points / totalPoints;
                setProgress(currentPoints, config.rewards, points / totalPoints);
                for (let [el, barInfo] of advisorBars) {
                    setProgress(el, barInfo, fraction);
                }
            }
            let extraDelay = false;
            const correctIcon = round.correctColor === COLOR.YELLOW ? yellowCorrect : blueCorrect;
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
            await delayRange(config.delays.startNextRound);
            if (extraDelay) {
                await delayRange(config.delays.demoPopoverExtra);
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
            hideCorrectColor();
            hideAdvice();
        }

        const fadeDuration = 400;
        game.fadeOut(fadeDuration);
        advisorBarDivider.fadeOut(fadeDuration);
        advisorBarArea.fadeOut(fadeDuration);
        await delay(fadeDuration);
        setProgress(currentPoints, config.rewards, 0);

        demoText.text('Ready to play for real?');
        demoNextButton.prop('disabled', false);
        demoArea.fadeIn(fadeDuration);
        await waitForDemoButton();
        demoArea.fadeOut(fadeDuration);
        await delay(fadeDuration);

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

    function showThankYou(submissionId) {
        thankYou.append($('<h3>').text(TEXT.THANK_YOU));
        thankYou.append($('<p>').text(TEXT.SUBMISSION_ID.replace('%s', submissionId)));
        thankYou.show();
    }

    async function main() {

        await loadConfig('/api/config');
        warnOnLeave();
        await initGameDisplay();
        await runDemo();
        const {roundResults, rewardStr} = await runGame();
        game.hide();
        //todo: add "sending..."
        const {submissionId} = await sendData({
            roundResults,
            reward: rewardStr,
            searchParams: window.location.search
        });
        showThankYou(submissionId);

    }

    try {
        await main();
    } catch (e) {
        console.error('critical error %o', e);
        alert('Critical Error: ' + e.toString() + '\nDetails logged to console');
    }
});