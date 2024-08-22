let currentImageIndex = 0;
let currentPhrase = '';
let guessedPhrase = [];
let score = 0;
let gameData = [];
let availableLetters = [];
let usedImages = new Set();
let timer;
let timeLeft;
let hintsUsed = 0;
let totalTime = 0;
let isDarkMode = false;
let isMuted = false;
let backgroundMusic;
let copyrightClickCount = 0;
let bonusAwarded = false;

function loadGameData() {
    fetch('game_data.csv')
        .then(response => response.text())
        .then(data => {
            gameData = data.split('\n').map(row => {
                const [image, phrase] = row.split(',');
                return { image, phrase: phrase.trim() };
            });
            initializeGame();
        })
        .catch(error => console.error('Error loading game data:', error));
}

function initializeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const btn = document.getElementById('settings-button');
    const closeBtn = document.getElementById('close-settings');
    const resetBtn = document.getElementById('reset-game');

    btn.onclick = function() {
        modal.style.display = "block";
    }

    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    resetBtn.onclick = function() {
        confirmResetGame();
        modal.style.display = "none"; // סגירת המודל לאחר לחיצה על אפס משחק
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
    // הוספת האזנה לכפתורים נוספים בתפריט ההגדרות
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('mute-toggle').addEventListener('click', toggleMute);
}

function initializeGame() {
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('reveal-letter').addEventListener('click', revealLetter);
    document.getElementById('skip-image').addEventListener('click', skipImage);
    document.getElementById('finish-game').addEventListener('click', resetGame);
    // הסרנו את האזנה לכפתור 'reset-game' מכאן
    initializeSettingsModal();
    checkSavedTheme();
    initBackgroundMusic();
    loadGameState();
    initializeCopyrightModal();
}

function initBackgroundMusic() {
    backgroundMusic = document.getElementById('background-music');
    backgroundMusic.volume = 0.5;
    playBackgroundMusic(); // הפעלה אוטומטית בתחילת המשחק
}

function startGame() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    if (usedImages.size === 0) {
        loadRandomImage();
    } else {
        updateGuessContainer();
        generateLetters();
        updateImageCounter();
    }
    playBackgroundMusic(); // וודא שהמוזיקה מופעלת בתחילת המשחק
}

function playBackgroundMusic() {
    if (!isMuted) {
        backgroundMusic.play().catch(e => {
            console.error("Error playing audio:", e);
            // במקרה של שגיאה, ננסה להפעיל את המוזיקה בלחיצת המשתמש הבאה
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
        playBackgroundMusic(); // הפעלת המוזיקה אם מבטלים השתקה
    }
    saveGameState();
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
    updateGuessContainer();
    generateLetters();
    updateSkipButtonVisibility();
    updateImageCounter();
    startTimer();
    saveGameState();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 60;
    updateTimerDisplay();
    updateSkipButtonVisibility(); // מסתיר את כפתור הדילוג בתחילת הטיימר
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timer);
            updateSkipButtonVisibility(); // מציג את כפתור הדילוג כשהטיימר מסתיים
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

function updateImageCounter() {
    document.getElementById('image-counter').textContent = `תמונה ${usedImages.size} מתוך ${gameData.length}`;
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
        score += 100;
        if (timeLeft > 0) {
            score += 50;
        }
        totalTime += (60 - timeLeft);
        document.getElementById('score-value').textContent = score;
        updateSkipButtonVisibility();
        saveGameState();
        
        setTimeout(loadRandomImage, 3000); // מעבר אוטומטי לתמונה הבאה לאחר 3 שניות
    } else if (guessedWord.length === currentPhrase.length) {
        letterBoxes.forEach(box => box.classList.add('incorrect-answer'));
    } else {
        letterBoxes.forEach(box => {
            box.classList.remove('correct-answer', 'incorrect-answer');
        });
    }
}

function revealLetter() {
    if (score >= 50) {
        const emptyIndices = guessedPhrase.reduce((acc, letter, index) => {
            if (letter === null) acc.push(index);
            return acc;
        }, []);
        if (emptyIndices.length > 0) {
            const hintIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            guessedPhrase[hintIndex] = currentPhrase[hintIndex];
            updateGuessContainer();
            score -= 50;
            hintsUsed++;
            document.getElementById('score-value').textContent = score;
            updateSkipButtonVisibility();
            saveGameState();
        }
    } else {
        showCustomAlert('אין מספיק נקודות לחשיפת אות');
    }
}

function skipImage() {
    if (timeLeft <= 0 && score >= 50) {
        score -= 50;
        document.getElementById('score-value').textContent = score;
        loadRandomImage();
        updateSkipButtonVisibility();
        saveGameState();
    } else {
        showCustomAlert('אין אפשרות לדלג על תמונה זו כעת');
    }
}

function updateSkipButtonVisibility() {
    const skipButton = document.getElementById('skip-image');
    if (timeLeft <= 0 && score >= 50) {
        skipButton.style.display = 'inline-block';
    } else {
        skipButton.style.display = 'none';
    }
}

function endGame() {
    clearInterval(timer);
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('hints-used').textContent = hintsUsed;
    const averageTime = (totalTime / usedImages.size).toFixed(2);
    document.getElementById('average-time').textContent = averageTime;
    
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    saveGameState();
}

function resetGame() {
    currentImageIndex = 0;
    score = 0;
    hintsUsed = 0;
    totalTime = 0;
    usedImages.clear();
    copyrightClickCount = 0;
    bonusAwarded = false;
    document.getElementById('score-value').textContent = score;
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('welcome-screen').style.display = 'block';
    clearGameState();
    playBackgroundMusic();
}

function confirmResetGame() {
    if (confirm('האם אתה בטוח שברצונך לאפס את המשחק? כל ההתקדמות תאבד.')) {
        resetGame();
        window.location.reload();
    }
}

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
        updateSkipButtonVisibility();
        
        document.getElementById('score-value').textContent = score;
        if (usedImages.size > 0) {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';
            const imageData = gameData[currentImageIndex];
            document.getElementById('current-image').src = imageData.image;
            updateGuessContainer();
            generateLetters();
            updateImageCounter();
        }
        
        backgroundMusic.muted = isMuted;
        document.getElementById('mute-toggle').textContent = isMuted ? 'הפעל מוזיקה' : 'השתק מוזיקה';
        document.getElementById('theme-toggle').textContent = isDarkMode ? 'מצב בהיר' : 'מצב כהה';
        
        playBackgroundMusic(); // הפעלה אוטומטית של המוזיקה
    } else {
        playBackgroundMusic(); // הפעלה אוטומטית גם אם אין מצב שמור
    }
}

function clearGameState() {
    localStorage.removeItem('gameState');
}

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
        score += 1000;
        document.getElementById('score-value').textContent = score;
        showCustomAlert('<strong style="font-size: 28px;">בונוס סודי!</strong><br>גילית את הבונוס הנסתר!<br>קיבלת 1000 נקודות בונוס!');
        bonusAwarded = true;
        updateSkipButtonVisibility();
        saveGameState();
    }
}

function showCustomAlert(message) {
    document.getElementById('custom-alert-message').innerHTML = message;
    document.getElementById('custom-alert').style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('custom-alert').style.display = 'none';
}

window.addEventListener('load', loadGameData);
