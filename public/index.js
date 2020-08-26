$(document).ready(async function() {

    let config;

    const STATUS = {
        WAIT_FOR_ADVICE: 'Wait for advice...',
        CHOOSE: 'Choose',
        WAIT_FOR_CORRECT: 'Wait for correct answer...',
        CORRECT: 'Correct',
        INCORRECT: 'Incorrect'
    };

    const SIDE = {
        LEFT: 0,
        RIGHT: 1
    };

    const ICON_NAME = {
        ADVISOR: 'user'
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

    function delay({min, max}) {
        const ms = (Math.random() * (max - min)) + min;
        return new Promise(res => setTimeout(res, ms));
    }

    function setStatusText(text) {
        statusText.text(text);
    }

    function genIcon(faIconName, color) {
        const icon = $('<i class="fas big-text mx-2">');
        if (color) {
            icon.css('color', color);
        }
        icon.addClass('fa-' + faIconName);
        return icon;
    }

    /**
     *
     * @param faIconName Font Awesome icon name
     * @param color CSS color
     * @see https://fontawesome.com/cheatsheet
     */
    function addIconLeft(faIconName, color) {
        leftIcons.append(genIcon(faIconName, color));
    }

    function addIconRight(faIconName, color) {
        rightIcons.prepend(genIcon(faIconName, color));
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
            addIconLeft(ICON_NAME.ADVISOR);
        } else {
            addIconRight(ICON_NAME.ADVISOR);
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

        setStatusText(STATUS.WAIT_FOR_ADVICE)
        await delay(config.delays.waitForAdvice);

        setStatusText(STATUS.CHOOSE);
        showAdviceForSide(round.adviceCorrect ? round.correctSide : otherSide(round.correctSide));
        setButtonsDisabled(false);
        const chosenSide = await waitForSideChosen();

        const selectedButtonEl = document.activeElement;
        if (selectedButtonEl) {
            selectedButtonEl.blur();
        }
        setButtonsDisabled(true);
        setStatusText(STATUS.WAIT_FOR_CORRECT);
        await delay(config.delays.waitForCorrect);

        const correct = chosenSide === round.correctSide;
        setStatusText(correct ? STATUS.CORRECT : STATUS.INCORRECT);
        showCorrectSide(round.correctSide);

        await delay(config.delays.startNextRound);
        resetOutlines();
        clearIcons();

        return correct;
    }

    async function main() {
        config = await $.ajax('config.json', {
            dataType: 'json'
        });

        for (let threshold of config.thresholds) {
            if (threshold.percent > 0) {
                addProgressBarThreshold(threshold);
            }
        }

        $(window).on('beforeunload', () => {
            return 'Progress will be lost!';
        });

        const numRounds = config.rounds.length;
        let points = 0;

        for (let i = 0; i < numRounds; i++) {
            const round = config.rounds[i];
            const correct = await runRound(round);
            if (correct) {
                points++;
            }
            setProgress(points / numRounds * 100);
        }
    }

    try {
        await main();
    } catch (e) {
        alert('Critical Error: ' + e.toString() + '\nDetails logged to console');
        console.error(e);
    }
});