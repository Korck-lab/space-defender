// js/ui.js

class UIManager {
  constructor() {
    // Cache UI elements
    this.scoreElement = document.getElementById("score");
    this.livesElement = document.getElementById("lives");
    this.levelElement = document.getElementById("level");
    this.bulletPowerElement = document.getElementById("bulletPower");
    this.powerFillElement = document.getElementById("powerFill"); // Bullet power bar fill
    this.finalScoreElement = document.getElementById("finalScore");
    this.finalPowerElement = document.getElementById("finalPower");
    this.pauseScoreElement = document.getElementById("pauseScore");

    this.startScreen = document.getElementById("startScreen");
    this.gameOverScreen = document.getElementById("gameOverScreen");
    this.pauseScreen = document.getElementById("pauseScreen");

    this.unlockBarContainer = document.getElementById("unlockBarContainer");
    this.unlockBarFill = document.getElementById("unlockBarFill");
    // this.unlockBarText removed

    this.highScoresListElement = document.getElementById("highScoresList");
    this.highScoresListElementGameOver = document.getElementById(
      "highScoresListGameOver"
    ); // Cache second list

    this.durationTimers = {
      wingman: document.getElementById("wingmanTimer"),
      miniShip: document.getElementById("miniShipTimer"),
    };

    this.maxBulletsDisplay = GAME_CONFIG.MAX_BULLETS_DISPLAY;
    this.feedbackTimeout = null;
    this.nextUnlockScore = Infinity;
    this.maxUnlockScore = 0;
    this.lastUnlockBarWidth = -1; // Store previous width for glow effect
    this.unlockGlowTimeout = null; // Timeout handle for glow effect

    this.calculateUnlockScoreLimits();
  }

  calculateUnlockScoreLimits() {
    const thresholds = Object.values(GAME_CONFIG.unlockSystem);
    this.maxUnlockScore = thresholds
      .filter((v) => typeof v === "number" && v > 0) // Ensure positive numbers
      .reduce((max, val) => Math.max(max, val), 1); // Avoid division by zero if no unlocks
  }

  updateNextUnlockThreshold(unlockedAbilitiesSet) {
    let nextScore = Infinity;
    const thresholds = GAME_CONFIG.unlockSystem;
    for (const key in GAME_CONFIG.abilities) {
      const unlockKey = `${key}UnlockScore`;
      if (thresholds[unlockKey] && !unlockedAbilitiesSet.has(key)) {
        nextScore = Math.min(nextScore, thresholds[unlockKey]);
      }
    }
    this.nextUnlockScore = nextScore;
  }

  // --- Score, Lives, Level ---
  updateScore(score) {
    this.scoreElement.textContent = score;
  }
  updateLives(lives) {
    this.livesElement.textContent = lives;
  }
  updateLevel(level) {
    this.levelElement.textContent = level;
  }

  // --- Bullet Power ---
  updateBulletPower(level, killsProgress, isMaxLevel) {
    // Added isMaxLevel flag
    this.bulletPowerElement.textContent = `${level}/${this.maxBulletsDisplay}`;

    let progressPercent = 0;
    if (isMaxLevel) {
      progressPercent = 100;
      this.powerFillElement.classList.add("max-level-blink"); // Add blink class
    } else {
      progressPercent = (killsProgress / GAME_CONFIG.killsPerPowerUp) * 100;
      this.powerFillElement.classList.remove("max-level-blink"); // Remove blink class
    }
    this.powerFillElement.style.width = `${clamp(progressPercent, 0, 100)}%`;
  }

  // --- Unlock Bar Update ---
  updateUnlockBar(currentLifeScore, unlockedAbilitiesSet) {
    this.updateNextUnlockThreshold(unlockedAbilitiesSet);

    let progressPercent = 0;
    const score = Math.max(0, currentLifeScore); // Ensure score isn't negative

    if (this.nextUnlockScore !== Infinity) {
      // Calculate progress based on the highest achieved threshold or 0
      let previousThreshold = 0;
      const achievedThresholds = Object.entries(GAME_CONFIG.unlockSystem)
        .filter(
          ([key, value]) =>
            typeof value === "number" &&
            unlockedAbilitiesSet.has(key.replace("UnlockScore", ""))
        )
        .map(([, value]) => value); // Get score values of unlocked abilities

      if (achievedThresholds.length > 0) {
        previousThreshold = Math.max(...achievedThresholds);
      }

      // Safety check in case maxUnlockScore is 0 or less
      const safeMaxScore = Math.max(1, this.maxUnlockScore);
      progressPercent = clamp((score / safeMaxScore) * 100, 0, 100);
    } else {
      // All abilities unlocked
      progressPercent = 100;
    }

    const newWidth = `${progressPercent}%`;

    // Apply width change
    if (this.unlockBarFill.style.width !== newWidth) {
      this.unlockBarFill.style.width = newWidth;

      // Trigger glow effect only if width increased and not already maxed
      if (progressPercent > this.lastUnlockBarWidth && progressPercent < 100) {
        this.triggerUnlockGlow();
      }
      this.lastUnlockBarWidth = progressPercent;
    }

    // Handle max level blink for unlock bar
    if (progressPercent >= 100) {
      this.unlockBarFill.classList.add("max-level-blink");
    } else {
      this.unlockBarFill.classList.remove("max-level-blink");
    }
  }

  // Trigger the glow animation on the unlock bar fill
  triggerUnlockGlow() {
    if (this.unlockGlowTimeout) clearTimeout(this.unlockGlowTimeout); // Clear existing timeout
    this.unlockBarFill.classList.remove("progress-glow"); // Remove class first to re-trigger animation
    void this.unlockBarFill.offsetWidth; // Force reflow to restart animation
    this.unlockBarFill.classList.add("progress-glow");
    this.unlockGlowTimeout = setTimeout(() => {
      this.unlockBarFill.classList.remove("progress-glow");
    }, GAME_CONFIG.unlockSystem.glowDuration); // Duration from config
  }

  // --- Screens & High Scores (No Change) ---
  showStartScreen(highScores) {
    this.displayHighScores(highScores);
    this.startScreen.classList.remove("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
  }
  showGameOverScreen(score, maxPower, highScores) {
    this.finalScoreElement.textContent = score;
    this.finalPowerElement.textContent = `${maxPower}/${this.maxBulletsDisplay}`;
    this.displayHighScores(highScores);
    this.startScreen.classList.add("hidden");
    this.gameOverScreen.classList.remove("hidden");
    this.pauseScreen.classList.add("hidden");
  }
  showPauseScreen(score) {
    this.pauseScoreElement.textContent = score;
    this.startScreen.classList.add("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseScreen.classList.remove("hidden");
  }
  hideAllScreens() {
    this.startScreen.classList.add("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
  }
  displayHighScores(scores) {
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
  }

  // --- Abilities UI (No Change) ---
  updateAbilityCooldownVisual(element, cooldownPercent, isOnCooldown) {
    if (!element || element.classList.contains("locked")) return;
    const cooldownOverlay = element.querySelector(".ability-cooldown");
    if (cooldownOverlay) {
      cooldownOverlay.style.height = `${clamp(cooldownPercent * 100, 0, 100)}%`;
    }
    element.classList.toggle("on-cooldown", isOnCooldown);
  }
  updateAbilityActiveState(element, isActive) {
    if (!element || element.classList.contains("locked")) return;
    element.classList.toggle("duration-active", isActive);
  }
  updateAbilityLockState(element, isLocked) {
    if (!element) return;
    element.classList.toggle("locked", isLocked);
    if (isLocked) {
      element.classList.remove(
        "on-cooldown",
        "duration-active",
        "feedback-active",
        "ready-flash",
        "parallel-active"
      );
      const cooldownOverlay = element.querySelector(".ability-cooldown");
      if (cooldownOverlay) cooldownOverlay.style.height = "0%";
    }
  }
  triggerAbilityFeedback(element) {
    if (!element || element.classList.contains("locked")) return;
    element.classList.add("feedback-active");
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      element.classList.remove("feedback-active");
    }, GAME_CONFIG.abilities.feedbackDuration);
  }
  triggerAbilityReadyFlash(element) {
    if (!element || element.classList.contains("locked")) return;
    element.classList.add("ready-flash");
    setTimeout(() => {
      element.classList.remove("ready-flash");
    }, GAME_CONFIG.abilities.readyFlashDuration);
  }
  updateBulletModeIcon(element, mode) {
    if (!element || element.classList.contains("locked")) return;
    element.classList.toggle("parallel-active", mode === "parallel");
  }

  // --- Duration Timers ---
  updateDurationTimer(timerElement, durationMs, isVisible = null) {
    if (!timerElement) return;

    // If isVisible is explicitly set (true/false), use that value
    // Otherwise, determine visibility based on remaining duration
    const shouldShow = isVisible !== null ? isVisible : durationMs > 0;

    timerElement.classList.toggle("visible", shouldShow);

    if (shouldShow && durationMs > 0) {
      const seconds = Math.ceil(durationMs / 1000);
      const baseText =
        timerElement.id === "wingmanTimer" ? "Wingmen: " : "Mini Ships: ";
      timerElement.textContent = `${baseText}${seconds}s`;
    }
  }

  // --- Level Up Message (No Change) ---
  showLevelUpMessage(level) {
    const levelUpDiv = document.createElement("div");
    levelUpDiv.className = "level-up-message";
    levelUpDiv.textContent = `LEVEL ${level}`;
    document.body.appendChild(levelUpDiv);
    setTimeout(() => {
      levelUpDiv.remove();
    }, GAME_CONFIG.levelUpMessageDuration);
  }

  // --- Reset UI State ---
  resetUI(unlockedAbilitiesSet) {
    this.updateScore(0);
    this.updateLives(GAME_CONFIG.player.initialLives);
    this.updateLevel(1);
    this.updateBulletPower(1, 0, false); // Start not maxed
    this.updateUnlockBar(0, unlockedAbilitiesSet);
    this.unlockBarFill.classList.remove("max-level-blink"); // Ensure blink off
    this.lastUnlockBarWidth = 0; // Reset last width
    if (this.durationTimers.wingman)
      this.durationTimers.wingman.classList.remove("visible");
    if (this.durationTimers.miniShip)
      this.durationTimers.miniShip.classList.remove("visible");
  }
}


