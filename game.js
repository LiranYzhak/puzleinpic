// משתנים גלובליים
let currentImageIndex = 0;
let currentPhrase = '';
let guessedPhrase = [];
let score = 100;
let gameData = [];
let availableLetters = [];
let usedImages = new Set();
let timer;
let timeLeft;
let hintsUsed = { easy: false, hard: false, letter: 0 };
let totalTime = 0;
let isDarkMode = false;
let isMuted = false;
let backgroundMusic;
let copyrightClickCount = 0;
let bonusAwarded = false;

// אתחול המשחק
function loadGameData() {
    fetch('game_data.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            gameData = rows.slice(1).map(row => {
                const [image, phrase, easyHint, hardHint] = row.split(',');
                return { image, phrase: phrase.trim(), easyHint, hardHint };
            });
            initializeGame();
        })
        .catch(error => console.error('Error loading game data:', error));
}

function initializeGame() {
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('finish-game').addEventListener('click', resetGame);
    document.getElementById('hint-button').addEventListener('click', toggleHintMenu);
    initializeSettingsModal();
    initializeHintButtons();
    checkSavedTheme();
    initBackgroundMusic();
    loadGameState();
    initializeCopyrightModal();
    updateHintButtons();
}

function initializeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const btn = document.getElementById('settings-button');
    const closeBtn = document.getElementById('close-settings');
    const resetBtn = document.getElementById('reset-game');

    btn.onclick = () => modal.style.display = "block";
    closeBtn.onclick = () => modal.style.display = "none";
    resetBtn.onclick = () => {
        confirmResetGame();
        modal.style.display = "none";
    };
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    };

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('mute-toggle').addEventListener('click', toggleMute);
}

function initializeHintButtons() {
    document.getElementById('easy-hint').addEventListener('click', () => getHint('easy'));
    document.getElementById('hard-hint').addEventListener('click', () => getHint('hard'));
    document.getElementById('letter-hint').addEventListener('click', () => getHint('letter'));
    document.getElementById('skip-image').addEventListener('click', () => getHint('skip'));
}

// ניהול מצב המשחק
function startGame() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    if (usedImages.size === 0) {
        score = 100;
        updateScore();
        loadRandomImage();
    } else {
        updateGuessContainer();
        generateLetters();
        updateImageCounter();
    }
    clearHintDisplay();
    playBackgroundMusic();
}

function loadRandomImage() {
    if (usedImages.size === gameData.length) {
        endGame();
        return;
    }
    
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * gameData.length);
    } while (usedImages.has(randomIndex));
    
    usedImages.add(randomIndex);
    currentImageIndex = randomIndex;
    
    const imageData = gameData[currentImageIndex];
    document.getElementById('current-image').src = imageData.image;
    currentPhrase = imageData.phrase.replace(/\s+/g, '');
    guessedPhrase = Array(currentPhrase.length).fill(null);
    resetHints();
    updateGuessContainer();
    generateLetters();
    updateImageCounter();
    startTimer();
    clearHintDisplay();
    saveGameState();
}

function updateGuessContainer() {
    const container = document.getElementById('guess-container');
    container.innerHTML = '';
    let wordIndex = 0;
    currentPhrase.split('').forEach((letter, index) => {
        if (index > 0 && gameData[currentImageIndex].phrase[wordIndex] === ' ') {
            const space = document.createElement('div');
            space.style.width = '10px';
            container.appendChild(space);
            wordIndex++;
        }
        const box = document.createElement('div');
        box.className = 'letter-box';
        box.textContent = guessedPhrase[index] || '';
        box.addEventListener('click', () => removeLetter(index));
        container.appendChild(box);
        wordIndex++;
    });
    checkAnswer();
}

function generateLetters() {
    availableLetters = Array.from(new Set(currentPhrase));
    const extraLetters = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
    while (availableLetters.length < 14) {
        const randomLetter = extraLetters[Math.floor(Math.random() * extraLetters.length)];
        if (!availableLetters.includes(randomLetter)) {
            availableLetters.push(randomLetter);
        }
    }
    availableLetters = availableLetters.sort(() => Math.random() - 0.5);

    const lettersContainer = document.getElementById('letters-container');
    lettersContainer.innerHTML = '';
    
    for (let row = 0; row < 2; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'letter-row';
        for (let i = 0; i < 7; i++) {
            const letterIndex = row * 7 + i;
            if (letterIndex < availableLetters.length) {
                const letterBox = document.createElement('div');
                letterBox.className = 'letter-box';
                letterBox.textContent = availableLetters[letterIndex];
                letterBox.addEventListener('click', () => handleLetterClick(availableLetters[letterIndex]));
                rowDiv.appendChild(letterBox);
            }
        }
        lettersContainer.appendChild(rowDiv);
    }
}

function handleLetterClick(letter) {
    const emptyIndex = guessedPhrase.indexOf(null);
    if (emptyIndex !== -1) {
        guessedPhrase[emptyIndex] = letter;
        updateGuessContainer();
        saveGameState();
    }
}

function removeLetter(index) {
    if (guessedPhrase[index] !== null) {
        guessedPhrase[index] = null;
        updateGuessContainer();
        saveGameState();
    }
}

function checkAnswer() {
    const guessedWord = guessedPhrase.join('');
    const letterBoxes = document.querySelectorAll('#guess-container .letter-box');
    
    if (guessedWord === currentPhrase) {
        stopTimer();
        letterBoxes.forEach(box => box.classList.add('correct-answer'));
        const finalScore = calculateScore(timeLeft);
        score += finalScore;
        totalTime += (60 - timeLeft);
        updateScore();
        saveGameState();
        
        setTimeout(() => {
            loadRandomImage();
        }, 3000);
    } else if (guessedWord.length === currentPhrase.length) {
        letterBoxes.forEach(box => box.classList.add('incorrect-answer'));
    } else {
        letterBoxes.forEach(box => {
            box.classList.remove('correct-answer', 'incorrect-answer');
        });
    }
}

// ניהול רמזים
function toggleHintMenu(event) {
    const hintMenu = document.getElementById('hint-menu');
    const gameContainer = document.getElementById('game-container');
    const imageElement = document.getElementById('current-image');

    if (hintMenu.style.display === 'none' || hintMenu.style.display === '') {
        hintMenu.style.display = 'block';
        
        const gameRect = gameContainer.getBoundingClientRect();
        const imageRect = imageElement.getBoundingClientRect();
        
        const topPosition = imageRect.top - gameRect.top + 10;
        const leftPosition = (imageRect.left + imageRect.right) / 2 - gameRect.left;
        
        hintMenu.style.top = `${topPosition}px`;
        hintMenu.style.left = `${leftPosition}px`;
        hintMenu.style.transform = 'translateX(-50%)';

        const menuRect = hintMenu.getBoundingClientRect();
        if (menuRect.left < gameRect.left) {
            hintMenu.style.left = '0px';
            hintMenu.style.transform = 'none';
        } else if (menuRect.right > gameRect.right) {
            hintMenu.style.left = 'auto';
            hintMenu.style.right = '0px';
            hintMenu.style.transform = 'none';
        }
        if (menuRect.top < gameRect.top) {
            hintMenu.style.top = '0px';
        }
    } else {
        hintMenu.style.display = 'none';
    }
    
    event.stopPropagation();
    document.addEventListener('click', closeHintMenu);
}

function closeHintMenu(event) {
    const hintMenu = document.getElementById('hint-menu');
    const hintButton = document.getElementById('hint-button');
    if (!hintMenu.contains(event.target) && event.target !== hintButton) {
        hintMenu.style.display = 'none';
        document.removeEventListener('click', closeHintMenu);
    }
}

function getHint(hintType) {
    let cost = 0;
    let hint = '';
    
    switch(hintType) {
        case 'easy':
            if (hintsUsed.easy || score < 20) return;
            cost = 20;
            hint = gameData[currentImageIndex].easyHint;
            hintsUsed.easy = true;
            break;
        case 'hard':
            if (hintsUsed.hard || score < 10) return;
            cost = 10;
            hint = gameData[currentImageIndex].hardHint;
            hintsUsed.hard = true;
            break;
        case 'letter':
            if (score < 15) return;
            cost = 15;
            hint = revealRandomLetter();
            hintsUsed.letter++;
            break;
        case 'skip':
            if (score < 50) return;
            skipImage();
            closeHintMenu();
            return;
    }
    
    score = Math.round(score - cost);
    updateScore();
    showHint(hint);
    updateHintButtons();
    closeHintMenu();
}

function revealRandomLetter() {
    const unrevealedIndices = guessedPhrase.reduce((acc, letter, index) => {
        if (letter === null) acc.push(index);
        return acc;
    }, []);
    
    if (unrevealedIndices.length > 0) {
        const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
        guessedPhrase[randomIndex] = currentPhrase[randomIndex];
        updateGuessContainer();
        return `האות שנחשפה היא: ${currentPhrase[randomIndex]}`;
    }
    return 'כל האותיות כבר נחשפו';
}

function showHint(hint) {
    document.getElementById('hint-display').textContent = hint;
}

function clearHintDisplay() {
    document.getElementById('hint-display').textContent = '';
}

function updateHintButtons() {
    const easyHintBtn = document.getElementById('easy-hint');
    const hardHintBtn = document.getElementById('hard-hint');
    const letterHintBtn = document.getElementById('letter-hint');
    const skipImageBtn = document.getElementById('skip-image');

    easyHintBtn.disabled = hintsUsed.easy || score < 20;
    hardHintBtn.disabled = hintsUsed.hard || score < 10;
    letterHintBtn.disabled = score < 15;
    skipImageBtn.disabled = score < 50;

    easyHintBtn.textContent = `רמז קל (${hintsUsed.easy ? 'נוצל' : '20-'})`;
    hardHintBtn.textContent = `רמז קשה (${hintsUsed.hard ? 'נוצל' : '10-'})`;
    letterHintBtn.textContent = `חשוף אות (15-)`;
    skipImageBtn.textContent = `דלג על תמונה (50-)`;
}

function resetHints() {
    hintsUsed.easy = false;
    hintsUsed.hard = false;
    hintsUsed.letter = 0;
    updateHintButtons();
}

function skipImage() {
    if (score >= 50) {
        score = Math.round(score - 50);
        updateScore();
        loadRandomImage();
        clearHintDisplay();
        showCustomAlert('עברת לתמונה הבאה');
    }
}

// ניהול ניקוד וזמן
function calculateScore(timeLeft) {
    let finalScore = 100;
    finalScore += timeLeft;
    if (hintsUsed.easy) finalScore -= 20;
    if (hintsUsed.hard) finalScore -= 10;
    finalScore -= hintsUsed.letter * 15;
    return Math.round(Math.max(finalScore, 0));
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 60;
    updateTimerDisplay();
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timer);
        }
        saveGameState();
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = timeLeft;
}

function updateScore() {
    score = Math.round(score);
    document.getElementById('score-value').textContent = score;
    updateHintButtons();
}

function updateImageCounter() {
    document.getElementById('image-counter').textContent = `תמונה ${usedImages.size} מתוך ${gameData.length}`;
}

// סיום משחק
function endGame() {
    clearInterval(timer);
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('hints-used').textContent = hintsUsed.easy + hintsUsed.hard + hintsUsed.letter;
    const averageTime = (totalTime / gameData.length).toFixed(2);
    document.getElementById('average-time').textContent = averageTime;
    
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    saveGameState();
}

function resetGame() {
    currentImageIndex = 0;
    score = 100;
    hintsUsed = { easy: false, hard: false, letter: 0 };
    totalTime = 0;
    usedImages.clear();
    copyrightClickCount = 0;
    bonusAwarded = false;
    updateScore();
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('welcome-screen').style.display = 'block';
    clearHintDisplay();
    clearGameState();
    playBackgroundMusic();
}

function confirmResetGame() {
    if (confirm('האם אתה בטוח שברצונך לאפס את המשחק? כל ההתקדמות תאבד.')) {
        resetGame();
        window.location.reload();
    }
}

// ניהול מצב משחק
function saveGameState() {
    const gameState = {
        currentImageIndex,
        currentPhrase,
        guessedPhrase,
        score,
        usedImages: Array.from(usedImages),
        timeLeft,
        hintsUsed,
        totalTime,
        isDarkMode,
        isMuted,
        copyrightClickCount,
        bonusAwarded
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        currentImageIndex = gameState.currentImageIndex;
        currentPhrase = gameState.currentPhrase;
        guessedPhrase = gameState.guessedPhrase;
        score = gameState.score;
        usedImages = new Set(gameState.usedImages);
        hintsUsed = gameState.hintsUsed;
        totalTime = gameState.totalTime;
        isDarkMode = gameState.isDarkMode;
        isMuted = gameState.isMuted;
        copyrightClickCount = gameState.copyrightClickCount || 0;
        bonusAwarded = gameState.bonusAwarded || false;

        timeLeft = 0;
        updateTimerDisplay();
        
        updateScore();
        if (usedImages.size > 0) {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';
            const imageData = gameData[currentImageIndex];
            document.getElementById('current-image').src = imageData.image;
            updateGuessContainer();
            generateLetters();
            updateImageCounter();
        } else {
            score = 100;
            updateScore();
        }
        
        backgroundMusic.muted = isMuted;
        document.getElementById('mute-toggle').textContent = isMuted ? 'הפעל מוזיקה' : 'השתק מוזיקה';
        document.getElementById('theme-toggle').textContent = isDarkMode ? 'מצב בהיר' : 'מצב כהה';
        
        playBackgroundMusic();
    } else {
        score = 100;
        updateScore();
        playBackgroundMusic();
    }
}

function clearGameState() {
    localStorage.removeItem('gameState');
}

// ניהול מוזיקת רקע
function initBackgroundMusic() {
    backgroundMusic = document.getElementById('background-music');
    backgroundMusic.volume = 0.5;
    playBackgroundMusic();
}

function playBackgroundMusic() {
    if (!isMuted) {
        backgroundMusic.play().catch(e => {
            console.error("Error playing audio:", e);
            document.addEventListener('click', function playOnClick() {
                backgroundMusic.play();
                document.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    }
}

function toggleMute() {
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;
    document.getElementById('mute-toggle').textContent = isMuted ? 'הפעל מוזיקה' : 'השתק מוזיקה';
    if (!isMuted) {
        playBackgroundMusic();
    }
    saveGameState();
}

// ניהול ערכת נושא
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    document.getElementById('theme-toggle').textContent = isDarkMode ? 'מצב בהיר' : 'מצב כהה';
}

function checkSavedTheme() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
        isDarkMode = JSON.parse(savedDarkMode);
        document.body.classList.toggle('dark-mode', isDarkMode);
    }
}

// ניהול מודל זכויות יוצרים
function initializeCopyrightModal() {
    const modal = document.getElementById('copyright-modal');
    const btn = document.getElementById('copyright-info');
    const span = document.getElementsByClassName('close')[0];

    btn.onclick = function() {
        modal.style.display = "block";
        copyrightClickCount++;
        checkSecretBonus();
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function checkSecretBonus() {
    if (copyrightClickCount === 10 && !bonusAwarded) {
        score = Math.round(score + 500);
        updateScore();
        showCustomAlert(`
            <strong style="font-size: 24px;">🎉 בונוס מסתורי נחשף! 🎉</strong><br><br>
            גילית סוד נסתר במשחק!<br>
            הסקרנות שלך השתלמה...<br><br>
            <span style="font-size: 20px;">קיבלת 500 נקודות בונוס!</span><br><br>
            המשך לחקור, אולי יש עוד הפתעות...
        `);
        bonusAwarded = true;
        saveGameState();
    }
}

// התראות מותאמות אישית
function showCustomAlert(message) {
    document.getElementById('custom-alert-message').innerHTML = message;
    document.getElementById('custom-alert').style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('custom-alert').style.display = 'none';
}

// אתחול המשחק
window.addEventListener('load', loadGameData);