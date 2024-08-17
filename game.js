// הגדרת משתנים גלובליים
let currentImageIndex = 0;
let currentPhrase = '';
let guessedPhrase = '';
let score = 0;
let gameData = [];
let availableLetters = [];

// פונקציה לטעינת הנתונים מקובץ ה-CSV
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

// פונקציה לאתחול המשחק
function initializeGame() {
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('hint-button').addEventListener('click', giveHint);
    document.getElementById('next-image').addEventListener('click', nextImage);
    document.getElementById('finish-game').addEventListener('click', resetGame);
}

// פונקציה להתחלת המשחק
function startGame() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    loadImage(currentImageIndex);
}

// פונקציה לטעינת תמונה
function loadImage(index) {
    if (index < gameData.length) {
        const imageData = gameData[index];
        document.getElementById('current-image').src = imageData.image;
        currentPhrase = imageData.phrase;
        guessedPhrase = '_'.repeat(currentPhrase.length);
        updateGuessContainer();
        generateLetters();
        document.getElementById('next-image').style.display = 'none';
    } else {
        endGame();
    }
}

// פונקציה לעדכון תצוגת הניחוש
function updateGuessContainer() {
    document.getElementById('guess-container').textContent = guessedPhrase;
}

// פונקציה ליצירת אותיות לבחירה
function generateLetters() {
    availableLetters = Array.from(new Set(currentPhrase.replace(/\s/g, ''))); // הסרת רווחים וכפילויות
    const extraLetters = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
    while (availableLetters.length < 20 && extraLetters.length > 0) {
        const randomLetter = extraLetters.splice(Math.floor(Math.random() * extraLetters.length), 1)[0];
        if (!availableLetters.includes(randomLetter)) {
            availableLetters.push(randomLetter);
        }
    }
    availableLetters = availableLetters.sort(() => Math.random() - 0.5); // ערבוב האותיות

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

// פונקציה לטיפול בלחיצה על אות
function handleLetterClick(letter) {
    const nextIndex = guessedPhrase.indexOf('_');
    if (nextIndex !== -1 && currentPhrase[nextIndex] === letter) {
        guessedPhrase = guessedPhrase.substr(0, nextIndex) + letter + guessedPhrase.substr(nextIndex + 1);
        updateGuessContainer();
        
        if (guessedPhrase === currentPhrase) {
            score++;
            document.getElementById('score-value').textContent = score;
            document.getElementById('next-image').style.display = 'inline-block';
        }
    }
}

// פונקציה למתן רמז
function giveHint() {
    if (score > 0) {
        const nextIndex = guessedPhrase.indexOf('_');
        if (nextIndex !== -1) {
            guessedPhrase = guessedPhrase.substr(0, nextIndex) + currentPhrase[nextIndex] + guessedPhrase.substr(nextIndex + 1);
            updateGuessContainer();
            score--;
            document.getElementById('score-value').textContent = score;
        }
    }
}

// פונקציה למעבר לתמונה הבאה
function nextImage() {
    currentImageIndex++;
    loadImage(currentImageIndex);
}

// פונקציה לסיום המשחק
function endGame() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
}

// פונקציה לאיפוס המשחק
function resetGame() {
    currentImageIndex = 0;
    score = 0;
    document.getElementById('score-value').textContent = score;
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('welcome-screen').style.display = 'block';
}

// טעינת נתוני המשחק בעת טעינת הדף
window.addEventListener('load', loadGameData);
