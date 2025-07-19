import { Game } from './game.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const game = new Game(canvas, ctx);

    // --- Music Control Event Listeners ---
    const muteButtonStart = document.getElementById('muteButtonStart');
    const volumeSliderStart = document.getElementById('volumeSliderStart');
    const muteButtonPause = document.getElementById('muteButtonPause');
    const volumeSliderPause = document.getElementById('volumeSliderPause');

    const updateMuteButtons = (isMuted) => {
        const iconClass = isMuted ? 'fa-volume-mute' : 'fa-volume-high';
        if (muteButtonStart) muteButtonStart.innerHTML = `<i class="fas ${iconClass}"></i>`;
        if (muteButtonPause) muteButtonPause.innerHTML = `<i class="fas ${iconClass}"></i>`;
    };

    const updateVolumeSliders = (volume) => {
        if (volumeSliderStart) volumeSliderStart.value = volume;
        if (volumeSliderPause) volumeSliderPause.value = volume;
    };

    const handleMuteClick = async () => {
        try {
            await game.audioManager.initContext();
            const isMuted = game.audioManager.toggleMute();
            updateMuteButtons(isMuted);
            if (!game.audioManager.isPlaying && !isMuted) {
                console.log("Starting intro music after mute toggle interaction.");
                game.audioManager.playIntroMusic().catch(e => console.error("Failed to play intro after mute:", e));
            }
        } catch (e) {
            console.error("Error handling mute click:", e);
        }
    };

    const handleVolumeChange = async (event) => {
        const newVolume = event.target.value;
        try {
            await game.audioManager.initContext();
            game.audioManager.setVolume(newVolume);
            updateVolumeSliders(newVolume);
            if (!game.audioManager.isPlaying && !game.audioManager.isMuted) {
                console.log("Starting intro music after volume change interaction.");
                game.audioManager.playIntroMusic().catch(e => console.error("Failed to play intro after volume change:", e));
            }
        } catch (e) {
            console.error("Error handling volume change:", e);
        }
    };

    if (muteButtonStart) muteButtonStart.addEventListener('click', handleMuteClick);
    if (volumeSliderStart) volumeSliderStart.addEventListener('input', handleVolumeChange);
    if (muteButtonPause) muteButtonPause.addEventListener('click', handleMuteClick);
    if (volumeSliderPause) volumeSliderPause.addEventListener('input', handleVolumeChange);

    document.getElementById("startButton")?.addEventListener("click", () => game.start());
    document.getElementById("restartButton")?.addEventListener("click", () => game.start());
    document.getElementById("restartButton2")?.addEventListener("click", () => game.start());
    document.getElementById("resumeButton")?.addEventListener("click", () => game.togglePause());

    game.uiManager.highScoresListElementGameOver = document.getElementById("highScoresListGameOver");
    game.uiManager.displayHighScores = function (scores) {
        const displayList = (listElement) => {
            if (!listElement) return;
            listElement.innerHTML = "";
            if (!scores || scores.length === 0) {
                listElement.innerHTML = "<li>No scores yet!</li>";
                return;
            }
            scores.forEach((score, index) => {
                const li = document.createElement("li");
                li.innerHTML = `<span>#${index + 1}</span><span>${score}</span>`;
                listElement.appendChild(li);
            });
        };
        displayList(this.highScoresListElement);
        displayList(this.highScoresListElementGameOver);
    };

    game.uiManager.showStartScreen(game.highScores);

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    document.body.addEventListener(
        "touchmove",
        (e) => {
            if (e.cancelable) e.preventDefault();
        },
        { passive: false }
    );

    console.log("Game Evolved Ready.");
});