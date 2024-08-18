let currentImageIndex = 0;
let currentPhrase = '';
let guessedPhrase = [];
let score = 0;
let gameData = [];
let availableLetters = [];
let usedImages = new Set();

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
    document.getElementById('hint-button').addEventListener('click', giveHint);
    document.getElementById('next-image').addEventListener('click', nextImage);
    document.getElementById('finish-game').addEventListener('click', resetGame);
}

function startGame() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    loadRandomImage();
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
    updateImageCounter();
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
        box.className = guessedPhrase[index] ? 'answer-box' : 'letter-box';
        box.textContent = guessedPhrase[index] || '';
        box.addEventListener('click', () => removeLetter(index));
        container.appendChild(box);
        wordIndex++;
    });
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
        checkAnswer();
    }
}

function removeLetter(index) {
    if (guessedPhrase[index] !== null) {
        guessedPhrase[index] = null;
        updateGuessContainer();
    }
}

function checkAnswer() {
    if (guessedPhrase.join('') === currentPhrase) {
        score += 100;
        document.getElementById('score-value').textContent = score;
        document.getElementById('next-image').style.display = 'inline-block';
    }
}

function giveHint() {
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
            document.getElementById('score-value').textContent = score;
            checkAnswer();
        }
    }
}

function nextImage() {
    loadRandomImage();
}

function endGame() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
}

function resetGame() {
    currentImageIndex = 0;
    score = 0;
    usedImages.clear();
    document.getElementById('score-value').textContent = score;
    document.getElementById('end-screen').style.display = 'none';
    startGame();
}

window.addEventListener('load', loadGameData);
