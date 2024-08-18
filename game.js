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

function initializeGame() {
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('reveal-letter').addEventListener('click', revealLetter);
    document.getElementById('next-image').addEventListener('click', nextImage);
    document.getElementById('skip-image').addEventListener('click', skipImage);
    document.getElementById('finish-game').addEventListener('click', resetGame);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('mute-toggle').addEventListener('click', toggleMute);
    document.getElementById('reset-game').addEventListener('click', confirmResetGame);
    checkSavedTheme();
    initBackgroundMusic();
    loadGameState();
}

function initBackgroundMusic() {
    backgroundMusic = document.getElementById('background-music');
    backgroundMusic.volume = 0.5;
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
        startTimer();
    }
    playBackgroundMusic();
}

function playBackgroundMusic() {
    if (!isMuted) {
        backgroundMusic.play().catch(e => console.error("Error playing audio:", e));
    }
}

function toggleMute() {
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;
    document.getElementById('mute-toggle').textContent = isMuted ? 'הפעל מוזיקה' : 'השתק מוזיקה';
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
    document.getElementById('next-image').style.display = 'none';
    document.getElementById('skip-image').style.display = 'inline-block';
    updateImageCounter();
    startTimer();
    saveGameState();
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
    availableLetters.forEach(letter => {
        const letterBox = document.createElement('div');
        letterBox.className = 'letter-box';
        letterBox.textContent = letter;
        letterBox.addEventListener('click', () => handleLetterClick(letter));
        lettersContainer.appendChild(letterBox);
    });
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
        clearInterval(timer);
        letterBoxes.forEach(box => box.classList.add('correct-answer'));
        score += 100;
        if (timeLeft > 0) {
            score += 50;
        }
        totalTime += (60 - timeLeft);
        document.getElementById('score-value').textContent = score;
        document.getElementById('next-image').style.display = 'inline-block';
        document.getElementById('skip-image').style.display = 'none';
        saveGameState();
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
            saveGameState();
        }
    } else {
        alert('אין מספיק נקודות לחשיפת אות');
    }
}

function nextImage() {
    loadRandomImage();
}

function skipImage() {
    if (score >= 50) {
        score -= 50;
        document.getElementById('score-value').textContent = score;
        loadRandomImage();
        saveGameState();
    } else {
        alert('אין מספיק נקודות לדילוג על תמונה');
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
    document.getElementById('score-value').textContent = score;
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('welcome-screen').style.display = 'block';
    clearGameState();
    playBackgroundMusic();
}

function confirmResetGame() {
    if (confirm('האם אתה בטוח שברצונך לאפס את המשחק? כל ההתקדמות תאבד.')) {
        resetGame();
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
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
        isMuted
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
        timeLeft = gameState.timeLeft;
        hintsUsed = gameState.hintsUsed;
        totalTime = gameState.totalTime;
        isDarkMode = gameState.isDarkMode;
        isMuted = gameState.isMuted;

        document.getElementById('score-value').textContent = score;
        if (usedImages.size > 0) {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';
            const imageData = gameData[currentImageIndex];
            document.getElementById('current-image').src = imageData.image;
            updateGuessContainer();
            generateLetters();
            updateImageCounter();
            startTimer();
            document.getElementById('skip-image').style.display = 'inline-block';
        }
        backgroundMusic.muted = isMuted;
        document.getElementById('mute-toggle').textContent = isMuted ? 'הפעל מוזיקה' : 'השתק מוזיקה';
        if (!isMuted) {
            playBackgroundMusic();
        }
    }
}

function clearGameState() {
    localStorage.removeItem('gameState');
}

window.addEventListener('load', loadGameData);
