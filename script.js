/*********************
* RESPONSIVE WARNING *
*********************/

const responsiveWarning = document.getElementById("responsive-warning");
// "true" if the site is optimized for responsive design, "false" if not.
const responsiveDesign = false;

// Show mobile warning if the user is on mobile and responsive-design is false.
if (!responsiveDesign && window.innerWidth <= 768) {
	responsiveWarning.classList.add("show");
}


/***********************
* MODE TOGGLE BEHAVIOR *
***********************/

// Get elements that change with the mode.
const toggleModeBtn = document.getElementById("toggle-mode-btn");
const portfolioLink = document.getElementById("portfolio-link");
const body = document.body;

// Function to apply mode.
function applyMode(mode) {
	body.classList.remove("light-mode", "dark-mode");
	body.classList.add(mode);

	if (mode === "dark-mode") {
		// Set dark mode styles.
		toggleModeBtn.style.color = "rgb(245, 245, 245)";
		toggleModeBtn.innerHTML = '<i class="bi bi-sun-fill"></i>';

		portfolioLink.style.color = "rgb(245, 245, 245)";

		responsiveWarning.style.backgroundColor = "rgb(2, 4, 8)";
	} else {
		// Set light mode styles.
		toggleModeBtn.style.color = "rgb(2, 4, 8)";
		toggleModeBtn.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';

		portfolioLink.style.color = "rgb(2, 4, 8)";

		responsiveWarning.style.backgroundColor = "rgb(245, 245, 245)";
	}
}

// Check and apply saved mode on page load
let savedMode = localStorage.getItem("mode");

if (savedMode === null) {
	savedMode = "light-mode"; // Default mode.
}
applyMode(savedMode);

// Toggle mode and save preference.
toggleModeBtn.addEventListener("click", function () {
	let newMode;

	if (body.classList.contains("light-mode")) {
		newMode = "dark-mode";
	} else {
		newMode = "light-mode";
	}

	applyMode(newMode);

	// Save choice.
	localStorage.setItem("mode", newMode);
});


/********************
* FLAPPY BIRD CLONE *
********************/

// Global settings.
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const GAME_SPEED = 2;
const OBSTACLE_WIDTH = 50;
const GAP_HEIGHT = 150;

// Bird settings.
const BIRD_SPRITE_WIDTH = 16;
const BIRD_SPRITE_HEIGHT = 16;
const BIRD_SCALE = 2;
const HITBOX_FACTOR = 0.8;

// Explosion settings.
const EXPLOSION_SPRITE_WIDTH = 48;
const EXPLOSION_SPRITE_HEIGHT = 48;
const EXPLOSION_SCALE = 72;
const EXPLOSION_FRAME_DELAY = 5;
const EXPLOSION_TOTAL_FRAMES = 7;

// Canvas and contexts.
const backgroundCanvas = document.getElementById("background-canvas");
const backgroundCtx = backgroundCanvas.getContext("2d");

const gameCanvas = document.getElementById("game-canvas");
const gameCtx = gameCanvas.getContext("2d");
gameCtx.imageSmoothingEnabled = false;

const uiCanvas = document.getElementById("ui-canvas");
const uiCtx = uiCanvas.getContext("2d");

// Audio settings.
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();

let soundEnabled = true;
let backgroundMusicSource = null;
let backgroundMusicBuffer = null;
let hitSoundBuffer = null;
let pointSoundBuffer = null;

// Helper function to load an audio file and decode it.
async function loadAudio(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();

	return await audioCtx.decodeAudioData(arrayBuffer);
}

// Load and warm up hit sound.
loadAudio("assets/sounds/hit.mp3").then((buffer) => {
	hitSoundBuffer = buffer;
	const warmupSource = audioCtx.createBufferSource();
	warmupSource.buffer = hitSoundBuffer;
	const gainNode = audioCtx.createGain();
	gainNode.gain.value = 0;
	warmupSource.connect(gainNode);
	gainNode.connect(audioCtx.destination);
	warmupSource.start(audioCtx.currentTime);
	warmupSource.stop(audioCtx.currentTime + 0.05);
});

// Load background music.
loadAudio("assets/sounds/background_music.mp3").then((buffer) => {
	backgroundMusicBuffer = buffer;
});

// Load point sound.
loadAudio("assets/sounds/point.mp3").then((buffer) => {
	pointSoundBuffer = buffer;
});

// Play collision sound.
function playCollisionSound() {
	if (soundEnabled && hitSoundBuffer !== null) {
		const collisionSource = audioCtx.createBufferSource();
		collisionSource.buffer = hitSoundBuffer;
		collisionSource.connect(audioCtx.destination);
		collisionSource.start(audioCtx.currentTime);
	}
}

// Play point sound.
function playPointSound() {
	if (soundEnabled && pointSoundBuffer !== null) {
		const pointSource = audioCtx.createBufferSource();
		pointSource.buffer = pointSoundBuffer;
		const gainNode = audioCtx.createGain();
		gainNode.gain.value = 0.1;
		pointSource.connect(gainNode);
		gainNode.connect(audioCtx.destination);
		pointSource.start(audioCtx.currentTime);
	}
}

// Play background music on loop.
function playBackgroundMusic() {
	if (soundEnabled && backgroundMusicBuffer !== null) {
		stopBackgroundMusic();
		backgroundMusicSource = audioCtx.createBufferSource();
		backgroundMusicSource.buffer = backgroundMusicBuffer;
		backgroundMusicSource.loop = true;
		backgroundMusicSource.connect(audioCtx.destination);
		backgroundMusicSource.start(audioCtx.currentTime);
	}
}

// Stop background music.
function stopBackgroundMusic() {
	if (backgroundMusicSource !== null) {
		backgroundMusicSource.stop();
		backgroundMusicSource = null;
	}
}

// Toggle sound on button click.
const soundToggleButton = document.getElementById("sound-toggle-btn");

document.addEventListener("keydown", (event) => {
	if (event.key === "s" || event.key === "S") {
		soundEnabled = !soundEnabled;

		if (soundEnabled) {
			soundToggleButton.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
			if (gameState === "playing") {
				playBackgroundMusic();
			}
		} else {
			soundToggleButton.innerHTML = '<i class="bi bi-volume-mute-fill"></i>';
			stopBackgroundMusic();
		}
	}
});

// Game settings.
let gameState = "start"; // Possible states: "start", "playing", "exploding", "gameover".
let score = 0;
let bestScore = 0;

// Bird properties.
const bird = {
	x: 50,
	y: gameCanvas.height / 2,
	velocity: 0
};

// Array to store obstacles.
let obstacles = [];

// Explosion animation variables.
let explosionX = 0;
let explosionY = 0;
let explosionFrameCounter = 0;
let explosionCurrentFrame = 0;

// Used for animation and pipe timing.
let frameCounter = 0;

// Best score management.
function loadBestScore() {
	const storedScore = localStorage.getItem("bestScore");

	if (storedScore !== null) {
		bestScore = parseInt(storedScore, 10);
	} else {
		bestScore = 0;
	}
}
loadBestScore();

function updateBestScore() {
	if (score > bestScore) {
		bestScore = score;
		localStorage.setItem("bestScore", bestScore);
	}
}

// Background parallax setup.
const backgroundLayers = [];

// Initialize background layers with images and speeds.
function initializeBackgroundLayers() {
	const layerImages = [
		"assets/images/parallax_background-001.png",
		"assets/images/parallax_background-002.png",
		"assets/images/parallax_background-003.png",
		"assets/images/parallax_background-004.png"
	];

	const speeds = [0.2, 0.4, 0.6, 0.8];

	for (let i = 0; i < layerImages.length; i++) {
		const image = new Image();
		image.src = layerImages[i];
		backgroundLayers.push({
			image: image,
			x: 0,
			speed: speeds[i]
		});
	}
}

initializeBackgroundLayers();

// Draw background layers with a parallax effect.
function drawBackground() {
	backgroundLayers.forEach((layer) => {
		if (!layer.image.complete) {
			return;
		}

		const scale = backgroundCanvas.height / layer.image.height;
		const scaledWidth = layer.image.width * scale;

		if (gameState === "playing") {
			layer.x = layer.x - GAME_SPEED * layer.speed;
			if (layer.x <= -scaledWidth) {
				layer.x = layer.x + scaledWidth;
			}
		}

		backgroundCtx.drawImage(layer.image, layer.x, 0, scaledWidth, backgroundCanvas.height);
		backgroundCtx.drawImage(layer.image, layer.x + scaledWidth - 1, 0, scaledWidth, backgroundCanvas.height);
	});
}

// Game assets (images).
const birdSpriteImage = new Image();
birdSpriteImage.src = "assets/images/bird.png";

const pipeImage = new Image();
pipeImage.src = "assets/images/pipe.png";

const explosionSpriteImage = new Image();
explosionSpriteImage.src = "assets/images/explosion.png";

const logoImage = new Image();
logoImage.src = "assets/images/logo.png";

const gameOverImage = new Image();
gameOverImage.src = "assets/images/gameover.png";

const logoPadding = 20;
const logoFadeTop = 30;

const digitImages = [];

for (let i = 0; i < 10; i++) {
	const image = new Image();
	image.src = `./assets/images/numbers/${i}.png`;
	digitImages.push(image);
}

// Canvas clear functions.
function clearBackground() {
	backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
}

function clearGame() {
	gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
}

function clearUI() {
	uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
}

// Reset game to initial state.
function resetGame() {
	bird.y = gameCanvas.height / 2;
	bird.velocity = 0;
	obstacles = [];
	frameCounter = 0;
	score = 0;
	gameState = "start";

	backgroundLayers.forEach((layer) => {
		layer.x = 0;
	});

	stopBackgroundMusic();
}

// Resume audio context on user interaction.
document.addEventListener("click", () => {
	if (audioCtx.state === "suspended") {
		audioCtx.resume();
	}
});

// Keyboard controls for game actions.
document.addEventListener("keydown", (event) => {
	if (event.code === "Space" || event.code === "ArrowUp") {
		if (gameState === "start") {
			resetGame();
			gameState = "playing";
			playBackgroundMusic();
		} else if (gameState === "playing") {
			bird.velocity = JUMP_STRENGTH;
		} else if (gameState === "gameover") {
			resetGame();
		}
	}
});

// Update physics, pipes, score and collisions.
function updateGame() {
	// Update bird physics.
	bird.velocity += GRAVITY;
	bird.y += bird.velocity;

	// Generate a new obstacle every 90 frames.
	if (frameCounter % 90 === 0) {
		const minGapTop = 10;
		const maxGapTop = gameCanvas.height - GAP_HEIGHT - 10;
		const gapTop = Math.random() * (maxGapTop - minGapTop) + minGapTop;
		obstacles.push({
			x: gameCanvas.width,
			topHeight: gapTop,
			bottomY: gapTop + GAP_HEIGHT,
			scored: false
		});
	}

	// Update obstacle positions and check for scoring.
	obstacles.forEach((obstacle) => {
		obstacle.x -= GAME_SPEED;

		if (obstacle.scored === false && (obstacle.x + OBSTACLE_WIDTH) < bird.x) {
			score++;
			obstacle.scored = true;
			playPointSound();
		}
	});

	// Remove obstacles that have moved off screen.
	obstacles = obstacles.filter((obstacle) => {
		if ((obstacle.x + OBSTACLE_WIDTH) > 0) {
			return true;
		}

		return false;
	});

	// Calculate bird hitbox dimensions.
	const hitboxWidth = BIRD_SPRITE_WIDTH * BIRD_SCALE * HITBOX_FACTOR;
	const hitboxHeight = BIRD_SPRITE_HEIGHT * BIRD_SCALE * HITBOX_FACTOR;
	const hitboxLeft = bird.x - hitboxWidth / 2;
	const hitboxRight = bird.x + hitboxWidth / 2;
	const hitboxTop = bird.y - hitboxHeight / 2;
	const hitboxBottom = bird.y + hitboxHeight / 2;

	// Check collisions with obstacles.
	for (let i = 0; i < obstacles.length; i++) {
		const obstacle = obstacles[i];

		if (hitboxRight > obstacle.x && hitboxLeft < obstacle.x + OBSTACLE_WIDTH) {
			if (hitboxTop < obstacle.topHeight || hitboxBottom > obstacle.bottomY) {
				stopBackgroundMusic();
				playCollisionSound();
				explosionX = bird.x;
				explosionY = bird.y;
				explosionCurrentFrame = 0;
				explosionFrameCounter = 0;
				gameState = "exploding";
				return;
			}
		}
	}

	// Check for collision with canvas boundaries.
	const birdBottomEdge = bird.y + (BIRD_SPRITE_HEIGHT * BIRD_SCALE) / 2;
	const birdTopEdge = bird.y - (BIRD_SPRITE_HEIGHT * BIRD_SCALE) / 2;

	if (birdBottomEdge > gameCanvas.height || birdTopEdge < 0) {
		stopBackgroundMusic();
		playCollisionSound();
		explosionX = bird.x;
		explosionY = bird.y;
		explosionCurrentFrame = 0;
		explosionFrameCounter = 0;
		gameState = "exploding";
		return;
	}
}

function updateExplosion() {
	explosionFrameCounter++;

	if (explosionFrameCounter >= EXPLOSION_FRAME_DELAY) {
		explosionCurrentFrame++;
		explosionFrameCounter = 0;
		if (explosionCurrentFrame >= EXPLOSION_TOTAL_FRAMES) {
			gameState = "gameover";
			updateBestScore();
		}
	}
}

// Draw sprites.
function drawGameObjects() {
	if (gameState === "exploding") {
		gameCtx.drawImage(
			explosionSpriteImage,
			explosionCurrentFrame * EXPLOSION_SPRITE_WIDTH, 0,
			EXPLOSION_SPRITE_WIDTH, EXPLOSION_SPRITE_HEIGHT,
			explosionX - EXPLOSION_SCALE / 2,
			explosionY - EXPLOSION_SCALE / 2,
			EXPLOSION_SCALE, EXPLOSION_SCALE
		);
	} else if (gameState === "playing") {
		const frameIndex = Math.floor(frameCounter / 10) % 4;
		gameCtx.drawImage(
			birdSpriteImage,
			frameIndex * BIRD_SPRITE_WIDTH, 0,
			BIRD_SPRITE_WIDTH, BIRD_SPRITE_HEIGHT,
			bird.x - (BIRD_SPRITE_WIDTH * BIRD_SCALE) / 2,
			bird.y - (BIRD_SPRITE_HEIGHT * BIRD_SCALE) / 2,
			BIRD_SPRITE_WIDTH * BIRD_SCALE,
			BIRD_SPRITE_HEIGHT * BIRD_SCALE
		);
	}

	// Draw obstacles (pipes).
	if (pipeImage.complete !== true) {
		return;
	}

	const pipeScale = OBSTACLE_WIDTH / pipeImage.width;
	const pipeScaledHeight = pipeImage.height * pipeScale;

	obstacles.forEach((obstacle) => {
		// Draw bottom pipe.
		gameCtx.drawImage(pipeImage, obstacle.x, obstacle.bottomY, OBSTACLE_WIDTH, pipeScaledHeight);
		// Draw top pipe (flipped vertically).
		gameCtx.save();
		gameCtx.translate(obstacle.x, obstacle.topHeight);
		gameCtx.scale(1, -1);
		gameCtx.drawImage(pipeImage, 0, 0, OBSTACLE_WIDTH, pipeScaledHeight);
		gameCtx.restore();
	});
}

// Draw current score.
function drawPlayerScore() {
	let scoreStr = score.toString();

	while (scoreStr.length < 4) {
		scoreStr = "0" + scoreStr;
	}

	let digitWidth = 20;
	let digitHeight = 30;

	if (digitImages[0].complete === true) {
		digitWidth = digitImages[0].width;
		digitHeight = digitImages[0].height;
	}

	const totalWidth = digitWidth * scoreStr.length;
	const startX = (uiCanvas.width - totalWidth) / 2;
	const posY = 10;

	for (let i = 0; i < scoreStr.length; i++) {
		const digit = parseInt(scoreStr.charAt(i), 10);

		if (digitImages[digit].complete === true) {
			uiCtx.drawImage(digitImages[digit], startX + i * digitWidth, posY, digitWidth, digitHeight);
		} else {
			uiCtx.fillStyle = "#fff";
			uiCtx.font = "24px Arial";
			uiCtx.textAlign = "center";
			uiCtx.fillText(
				scoreStr.charAt(i),
				startX + i * digitWidth + digitWidth / 2,
				posY + digitHeight
			);
		}
	}
}

// Draw the best score on the UI.
function drawBestScore() {
	let bestStr = bestScore.toString();

	while (bestStr.length < 4) {
		bestStr = "0" + bestStr;
	}

	let digitWidth = 20;
	let digitHeight = 30;

	if (digitImages[0].complete === true) {
		digitWidth = digitImages[0].width;
		digitHeight = digitImages[0].height;
	}

	const totalWidth = digitWidth * bestStr.length;
	const startX = (uiCanvas.width - totalWidth) / 2;
	const bottomMargin = 10;
	const posY = uiCanvas.height - digitHeight - bottomMargin;

	for (let i = 0; i < bestStr.length; i++) {
		const digit = parseInt(bestStr.charAt(i), 10);

		if (digitImages[digit].complete === true) {
			uiCtx.drawImage(digitImages[digit], startX + i * digitWidth, posY, digitWidth, digitHeight);
		} else {
			uiCtx.fillStyle = "#fff";
			uiCtx.font = "24px Arial";
			uiCtx.textAlign = "center";
			uiCtx.fillText(
				bestStr.charAt(i),
				startX + i * digitWidth + digitWidth / 2,
				posY + digitHeight
			);
		}
	}
}

// Draw the start screen.
function drawStartScreen() {
	clearUI();

	let logoBottom = logoFadeTop;

	if (logoImage.complete === true) {
		const logoWidth = uiCanvas.width - 2 * logoPadding;
		const logoHeight = logoWidth * (logoImage.height / logoImage.width);
		uiCtx.drawImage(logoImage, logoPadding, logoFadeTop, logoWidth, logoHeight);
		logoBottom = logoFadeTop + logoHeight;
	} else {
		uiCtx.fillStyle = "#000";
		uiCtx.font = "36px Arial";
		uiCtx.textAlign = "center";
		uiCtx.fillText("Flappy Bird", uiCanvas.width / 2, logoFadeTop + 50);
		logoBottom = logoFadeTop + 50;
	}

	drawBestScore();

	let bestScoreY;

	if (digitImages[0].complete === true) {
		bestScoreY = uiCanvas.height - (digitImages[0].height + 10);
	} else {
		bestScoreY = uiCanvas.height - (30 + 10);
	}

	const centerY = (logoBottom + bestScoreY) / 2;

	// Blink start instruction message.
	if (frameCounter % 60 < 30) {
		uiCtx.fillStyle = "#fff";
		uiCtx.font = "20px Arial";
		uiCtx.textAlign = "center";
		uiCtx.fillText("Press SPACE to start", uiCanvas.width / 2, centerY);
	}
}

// Draw the game over screen.
function drawGameOverScreen() {
	clearUI();

	uiCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
	uiCtx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);

	drawPlayerScore();

	const centerY = uiCanvas.height / 2;
	if (gameOverImage.complete === true) {
		const gameOverWidth = uiCanvas.width - 2 * logoPadding;
		const gameOverHeight = gameOverWidth * (gameOverImage.height / gameOverImage.width);
		const gameOverY = centerY - gameOverHeight / 2;
		uiCtx.drawImage(gameOverImage, logoPadding, gameOverY, gameOverWidth, gameOverHeight);
	} else {
		uiCtx.fillStyle = "#fff";
		uiCtx.font = "48px Arial";
		uiCtx.textAlign = "center";
		uiCtx.fillText("GAME OVER", uiCanvas.width / 2, centerY);
	}

	if (frameCounter % 60 < 30) {
		uiCtx.fillStyle = "#fff";
		uiCtx.font = "20px Arial";
		uiCtx.textAlign = "center";
		uiCtx.fillText("Press SPACE to return to title", uiCanvas.width / 2, uiCanvas.height - 30);
	}
}

// Main game loop.
function gameLoop() {
	clearBackground();
	drawBackground();

	if (gameState === "playing") {
		updateGame();
	} else if (gameState === "exploding") {
		updateExplosion();
	}

	clearGame();
	drawGameObjects();
	clearUI();

	if (gameState === "start") {
		drawStartScreen();
	} else if (gameState === "playing") {
		drawPlayerScore();
	} else if (gameState === "gameover") {
		drawGameOverScreen();
	}

	frameCounter++;
	requestAnimationFrame(gameLoop);
}

// Start the game loop.
gameLoop();
