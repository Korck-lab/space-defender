// js/game.js

class Game {
  // --- Constructor and other methods mostly unchanged ---
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Set fixed game dimensions
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 600;

    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;

    // Set up initial canvas dimensions and scaling
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    // Apply initial resizing
    this.handleWindowResize();

    this.running = false;
    this.paused = false;
    this.score = 0;
    this.level = 1;
    this.lastTimestamp = 0;
    this.animationFrameId = null;
    this.highScores = this.loadHighScores();
    this.alienSpawnTimer = 0;
    this.alienSpawnInterval = GAME_CONFIG.aliens.initialSpawnInterval;
    this.alienBaseSpeed = GAME_CONFIG.aliens.initialSpeed;
    this.alienBaseHealth = GAME_CONFIG.aliens.initialHealth;
    this.minAliensOnScreen = GAME_CONFIG.aliens.minOnScreenBase;
    this.uiManager = new UIManager();
    this.abilityManager = new AbilityManager(this.uiManager);
    this.particleManager = new ParticleManager();
    this.audioManager = new AudioManager();
    this.player = new Player(this.width, this.height);
    this.bullets = [];
    this.rockets = [];
    this.aliens = [];
    this.wingmen = [];
    this.miniShips = [];
    this.items = [];
    this.inputHandler = new InputHandler(
      this.canvas,
      this,
      this.player,
      this.abilityManager
    );
    initStarfield(this.width, this.height);
    createPlayerBuffer(GAME_CONFIG.player);
    this.gameLoop = this.gameLoop.bind(this);
    window.addEventListener("resize", this.handleWindowResize.bind(this));
  }
  async start() {
    // Check game version against stored version
    this.checkGameVersion();

    this.resetGame();
    this.running = true;
    this.paused = false;
    this.uiManager.hideAllScreens();
    this.uiManager.resetUI(this.abilityManager.unlockedAbilities);
    this.lastTimestamp = performance.now();

    // Initialize audio context and start music
    try {
      await this.audioManager.initContext(); // Ensure context is ready
      this.audioManager.playTrackForLevel(this.level);
    } catch (e) {
      console.error("Could not start audio:", e);
      // Optionally inform the user via UI
    }

    this.requestLoop();
    console.log("Game Started");
  }

  checkGameVersion() {
    const storedVersion = localStorage.getItem(GAME_CONFIG.LOCAL_STORAGE_VERSION_KEY);
    const currentVersion = GAME_CONFIG.GAME_VERSION;

    if (storedVersion !== currentVersion) {
      console.log(`Game version changed: ${storedVersion || 'none'} -> ${currentVersion}`);

      // Clear potentially incompatible data
      localStorage.removeItem(GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY);

      // Store the new version
      localStorage.setItem(GAME_CONFIG.LOCAL_STORAGE_VERSION_KEY, currentVersion);
    }
  }

  gameOver() {
    this.running = false;
    this.cancelLoop();
    this.saveHighScore(this.score);
    this.highScores = this.loadHighScores();
    this.audioManager.stopAll(); // Stop music on game over
    // Optionally play a game over sound: this.audioManager.playSfx('gameOver');

    this.uiManager.showGameOverScreen(
      this.score,
      this.player.maxReachedPower,
      this.highScores
    );
    console.log("Game Over - Score:", this.score);
  }
  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.cancelLoop();
      // Slightly reduce volume on pause
      if (this.audioManager.audioContext && !this.audioManager.isMuted) {
        this.audioManager.masterGain.gain.linearRampToValueAtTime(this.audioManager.currentVolume * 0.5, this.audioManager.audioContext.currentTime + 0.2);
      }
      this.uiManager.showPauseScreen(this.score);
    } else {
      this.uiManager.hideAllScreens();
      // Restore volume on resume if changed above
      if (this.audioManager.audioContext && !this.audioManager.isMuted) {
        this.audioManager.masterGain.gain.linearRampToValueAtTime(this.audioManager.currentVolume, this.audioManager.audioContext.currentTime + 0.2);
      }
      this.lastTimestamp = performance.now();
      this.requestLoop();
    }
  }
  resetGame() {
    this.score = 0;
    this.level = 1;
    this.alienSpawnTimer = 0;
    this.alienSpawnInterval = GAME_CONFIG.aliens.initialSpawnInterval;
    this.alienBaseSpeed = GAME_CONFIG.aliens.initialSpeed;
    this.alienBaseHealth = GAME_CONFIG.aliens.initialHealth;
    this.minAliensOnScreen = GAME_CONFIG.aliens.minOnScreenBase;
    this.bullets = [];
    this.rockets = [];
    this.aliens = [];
    this.wingmen = [];
    this.miniShips = [];
    this.items = [];
    this.particleManager.reset();
    this.abilityManager.reset();
    this.player.resetForNewGame(this.width, this.height);
    this.uiManager.resetUI(this.abilityManager.unlockedAbilities);
    this.audioManager.stopAll(); // Ensure music stops on reset
  }
  // Updated handleWindowResize for fixed logical canvas size and UI positioning
  handleWindowResize() {
    const GAME_WIDTH = 800; // Fixed logical width
    const GAME_HEIGHT = 600; // Fixed logical height
    const aspectRatio = GAME_WIDTH / GAME_HEIGHT;

    // Set the fixed logical size for game calculations
    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;

    // Physical canvas size will be set based on window dimensions while maintaining aspect ratio
    let displayWidth = window.innerWidth;
    let displayHeight = window.innerHeight;

    // Calculate the scaling factor to fit the screen while maintaining aspect ratio
    const screenRatio = displayWidth / displayHeight;

    if (screenRatio > aspectRatio) {
      // Window is wider than our target ratio
      displayWidth = displayHeight * aspectRatio;
    } else {
      // Window is taller than our target ratio
      displayHeight = displayWidth / aspectRatio;
    }

    // Set the canvas display size with CSS (this handles the visual scaling)
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Set the logical canvas resolution for proper rendering
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    // Center the canvas
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${(window.innerWidth - displayWidth) / 2}px`;
    this.canvas.style.top = `${(window.innerHeight - displayHeight) / 2}px`;

    // Ensure UI elements follow the canvas position and scaling
    const gameUiContainer = document.getElementById("gameUiContainer") || document.body;
    if (gameUiContainer) {
      // Position the UI container to match the canvas position and size
      gameUiContainer.style.position = 'absolute';
      gameUiContainer.style.left = `${(window.innerWidth - displayWidth) / 2}px`;
      gameUiContainer.style.top = `${(window.innerHeight - displayHeight) / 2}px`;
      gameUiContainer.style.width = `${displayWidth}px`;
      gameUiContainer.style.height = `${displayHeight}px`;
    }

    // Specifically update the abilities container and unlock bar positions to stay within bounds
    const abilitiesContainer = document.querySelector('.abilities-container');
    if (abilitiesContainer) {
      abilitiesContainer.style.position = 'absolute';
      abilitiesContainer.style.right = '20px';
      abilitiesContainer.style.top = '20px';
    }

    const unlockBarContainer = document.getElementById('unlockBarContainer');
    if (unlockBarContainer) {
      unlockBarContainer.style.position = 'absolute';
      unlockBarContainer.style.top = '80px';
      unlockBarContainer.style.right = '20px';
    }

    // Redraw if needed
    if (this.running) {
      this.draw();
    }
  }
  loadHighScores() {
    const scoresJSON = localStorage.getItem(
      GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY
    );
    try {
      const scores = scoresJSON ? JSON.parse(scoresJSON) : [];
      return scores.sort((a, b) => b - a).slice(0, 3);
    } catch (e) {
      console.error("Error loading high scores:", e);
      return [];
    }
  }
  saveHighScore(newScore) {
    if (newScore <= 0) return;
    let scores = this.loadHighScores();
    scores.push(newScore);
    scores = scores.sort((a, b) => b - a).slice(0, 3);
    try {
      localStorage.setItem(
        GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY,
        JSON.stringify(scores)
      );
    } catch (e) {
      console.error("Error saving high scores:", e);
    }
  }
  requestLoop() {
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }
  cancelLoop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
  gameLoop(timestamp) {
    if (!this.running || this.paused) return;
    const deltaTime = Math.min(timestamp - this.lastTimestamp, 50);
    this.lastTimestamp = timestamp;
    this.update(deltaTime);
    this.draw();
    this.requestLoop();
  }

  update(deltaTime) {
    this.player.update(deltaTime, this.width);
    this.abilityManager.update(deltaTime);
    this.particleManager.update(deltaTime);

    this.updateEntities(deltaTime, this.bullets, this); // Pass gameRef to bullet update for target finding?
    this.updateEntities(deltaTime, this.rockets);
    this.updateEntities(deltaTime, this.aliens, this.height, this.player);
    this.updateEntities(
      deltaTime,
      this.wingmen,
      this.player,
      this.aliens,
      this
    );
    this.updateEntities(
      deltaTime,
      this.miniShips,
      this.player,
      this.aliens,
      this
    );
    this.updateEntities(deltaTime, this.items);

    this.spawnAliens(deltaTime);
    this.handlePlayerShooting(performance.now());
    this.checkCollisions();
    this.checkActiveAbilities();
    this.checkLevelUp();

    this.bullets = this.bullets.filter((e) => e.active);
    this.rockets = this.rockets.filter((e) => e.active);
    this.aliens = this.aliens.filter((e) => e.active);
    this.items = this.items.filter((e) => e.active);
  }

  updateEntities(deltaTime, entities, ...args) {
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      if (!entity.active) continue;
      entity.update(deltaTime, ...args);
      if (entity.isOffscreen(this.width, this.height)) {
        if (entity instanceof Alien && entity.y > this.height) {
          this.handleAlienLeak(entity, i);
        } else if (
          entity instanceof Bullet ||
          entity instanceof Rocket ||
          entity instanceof Item ||
          entity instanceof Debris
        ) {
          entity.active = false;
        }
      }
      if (entity instanceof Rocket && entity.shouldExplode(this.height)) {
        this.handleRocketExplosion(entity);
      }
    }
  }

  // Improved alien spawn function to prevent overlapping
  spawnAliens(deltaTime) {
    this.alienSpawnTimer += deltaTime;
    const activeAlienCount = this.aliens.filter((a) => a.active).length;
    const shouldSpawn =
      this.alienSpawnTimer >= this.alienSpawnInterval ||
      activeAlienCount < this.minAliensOnScreen;

    if (shouldSpawn) {
      this.alienSpawnTimer = 0;
      const rand = Math.random();
      let type = "scout";
      let typeConfig = GAME_CONFIG.aliens.scout;
      let baseHealth = this.alienBaseHealth;
      let baseSpeed = this.alienBaseSpeed;
      let pointsMultiplier = typeConfig.pointsMultiplier;
      let specificConfig = GAME_CONFIG.aliens.scout;

      // Determine alien type based on probability
      const eliteChance =
        GAME_CONFIG.aliens.spawnRatioElite * (1 + (this.level - 1) * 0.05);
      const fighterChance = GAME_CONFIG.aliens.spawnRatioFighter;

      if (rand < eliteChance && this.level > 3) {
        type = "elite";
        specificConfig = GAME_CONFIG.aliens.elite;
      } else if (rand < eliteChance + fighterChance) {
        type = "fighter";
        specificConfig = GAME_CONFIG.aliens.fighter;
      } else {
        type = "scout";
        specificConfig = GAME_CONFIG.aliens.scout;
      }

      typeConfig = specificConfig;
      baseHealth *= typeConfig.healthMultiplier || 1.0;
      baseSpeed *= typeConfig.speedMultiplier || 1.0;
      pointsMultiplier = typeConfig.pointsMultiplier || 1.0;

      const size = getRandom(
        typeConfig.sizeMin,
        typeConfig.sizeMin + typeConfig.sizeRange
      );

      const health =
        baseHealth +
        (this.level - 1) * 0.5 * (typeConfig.healthMultiplier || 1.0);
      const speed =
        baseSpeed +
        (this.level - 1) * 0.05 * (typeConfig.speedMultiplier || 1.0);
      const points = Math.floor(
        (GAME_CONFIG.aliens.basePoints + health * 5) * pointsMultiplier
      );

      const color =
        typeConfig.color ||
        `hsl(${getRandom(
          typeConfig.colorHueMin,
          typeConfig.colorHueMin + typeConfig.colorHueRange
        )}, ${typeConfig.saturation}, ${typeConfig.lightness})`;

      // Find a suitable spawn position to avoid overlaps
      let spawnX;
      let attempts = 0;
      const maxAttempts = 10; // Limit attempts to prevent infinite loops

      do {
        spawnX = Math.random() * (this.width - size);
        attempts++;

        // Break if we can't find a non-overlapping position after max attempts
        if (attempts >= maxAttempts) {
          break;
        }

      } while (this.isPositionOverlappingAliens(spawnX, -size, size, size));

      this.aliens.push(
        new Alien(
          spawnX,
          -size,
          size,
          size,
          speed,
          health,
          points,
          color,
          type,
          typeConfig,
          this
        )
      );
    }
  }

  // Helper method to check if a position would overlap with existing aliens
  isPositionOverlappingAliens(x, y, width, height) {
    const margin = width * 0.5; // Add some extra space between aliens

    const rect = {
      x: x - margin,
      y: y - margin,
      width: width + margin * 2,
      height: height + margin * 2
    };

    // Check for overlaps with existing aliens
    for (const alien of this.aliens) {
      if (!alien.active) continue;

      // Simple rectangle collision check
      if (rect.x < alien.x + alien.width &&
        rect.x + rect.width > alien.x &&
        rect.y < alien.y + alien.height &&
        rect.y + rect.height > alien.y) {
        return true; // Overlap detected
      }
    }

    return false; // No overlap
  }

  spawnFighterWave(xPos) {
    console.log("Scout leaked, spawning fighters!");
    const count = GAME_CONFIG.aliens.scout.fighterSpawnCount || 1;
    const typeConfig = GAME_CONFIG.aliens.fighter;
    const size = getRandom(
      typeConfig.sizeMin,
      typeConfig.sizeMin + typeConfig.sizeRange
    );
    for (let i = 0; i < count; i++) {
      const baseHealth =
        this.alienBaseHealth * (typeConfig.healthMultiplier || 1.0);
      const baseSpeed =
        this.alienBaseSpeed * (typeConfig.speedMultiplier || 1.0);
      const pointsMultiplier = typeConfig.pointsMultiplier || 1.0;
      const health =
        baseHealth +
        (this.level - 1) * 0.5 * (typeConfig.healthMultiplier || 1.0);
      const speed =
        baseSpeed +
        (this.level - 1) * 0.05 * (typeConfig.speedMultiplier || 1.0);
      const points = Math.floor(
        (GAME_CONFIG.aliens.basePoints + health * 5) * pointsMultiplier
      );
      const color = typeConfig.color;
      const spawnX = clamp(
        xPos + (i - (count - 1) / 2) * size * 1.5,
        size / 2,
        this.width - size * 1.5
      );
      this.aliens.push(
        new Alien(
          spawnX,
          -size * (i + 1),
          size,
          size,
          speed,
          health,
          points,
          color,
          "fighter",
          typeConfig,
          this
        )
      );
    }
  }
  handlePlayerShooting(currentTime) {
    if (this.player.autoFire && this.player.canShoot(currentTime)) {
      this.player.recordShot(currentTime);
      this.createPlayerBullets();
      this.particleManager.createMuzzleFlash(
        this.player.x,
        this.player.y - this.player.height / 2,
        this.player.bulletMode === "spread"
          ? GAME_CONFIG.bullets.player.colorSpread
          : GAME_CONFIG.bullets.player.colorParallel
      );
    }
  }
  createPlayerBullets() {
    const pConfig = GAME_CONFIG.player;
    const bConfig = GAME_CONFIG.bullets.player;
    const power = this.player.bulletPowerLevel;
    const damage =
      bConfig.baseDamageMultiplier *
      (power * 0.5 + 0.5) *
      (this.player.bulletMode === "parallel"
        ? bConfig.parallelDamageFactor
        : 1);
    if (this.player.bulletMode === "spread") {
      const color = bConfig.colorSpread;
      for (let i = 0; i < power; i++) {
        const angleOffset =
          (i - (power - 1) / 2) * bConfig.spreadAngleMultiplier;
        const speedX = Math.sin(angleOffset) * 3;
        this.bullets.push(
          new Bullet(
            this.player.x,
            this.player.y - pConfig.height / 2,
            { ...bConfig, color },
            speedX,
            bConfig.speedY,
            damage,
            "player"
          )
        );
      }
    } else {
      const color = bConfig.colorParallel;
      for (let i = 0; i < power; i++) {
        const xOffset =
          (i - (power - 1) / 2) * bConfig.parallelOffsetMultiplier;
        this.bullets.push(
          new Bullet(
            this.player.x + xOffset,
            this.player.y - pConfig.height / 2,
            { ...bConfig, color },
            0,
            bConfig.speedY,
            damage,
            "player"
          )
        );
      }
    }
  }
  addAlienBullet(x, y, speedX, speedY, config) {
    this.bullets.push(
      new Bullet(x, y, config, speedX, speedY, config.damage, "alien")
    );
  }

  // NEW: Implement MiniShip shooting
  shootMiniShipRocket(miniShip, target) {
    if (!target) return; // Need a target

    const config = GAME_CONFIG.bullets.miniShipRocket;
    const startX = miniShip.getCenterX();
    const startY = miniShip.getCenterY();

    // Initial velocity towards the target
    const angle = Math.atan2(
      target.getCenterY() - startY,
      target.getCenterX() - startX
    );
    const speedX = Math.cos(angle) * config.speed;
    const speedY = Math.sin(angle) * config.speed;

    // Add the homing bullet
    this.bullets.push(
      new Bullet(
        startX,
        startY,
        config,
        speedX,
        speedY,
        config.damage,
        "miniShip",
        target // Pass target for homing
      )
    );

    // Optional: Muzzle flash effect
    this.particleManager.createMuzzleFlash(startX, startY, config.color, angle);
  }

  checkCollisions() {
    // Bullets vs Aliens / Player
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.active) continue;

      if (bullet.owner === "player" || bullet.owner === "miniShip") {
        // Player or MiniShip bullets vs Aliens
        for (let j = this.aliens.length - 1; j >= 0; j--) {
          const alien = this.aliens[j];
          if (!alien.active) continue;
          if (checkCollision(bullet, alien)) {
            const destroyed = alien.takeDamage(bullet.damage);
            bullet.active = false;
            this.particleManager.createExplosion(
              bullet.getCenterX(),
              bullet.getCenterY(),
              alien.color,
              3
            );
            if (destroyed) this.handleAlienDestroyed(alien, j, bullet.owner); // Track source
            break;
          }
        }
      } else if (bullet.owner === "alien") {
        // Alien bullet vs Player
        if (!this.player.invincible && checkCollision(bullet, this.player)) {
          bullet.active = false;
          this.handlePlayerHit("alien_bullet");
          if (!this.running) break;
        }
      }
    }
    // Player vs Aliens
    if (!this.player.invincible) {
      for (let j = this.aliens.length - 1; j >= 0; j--) {
        const alien = this.aliens[j];
        if (!alien.active) continue;
        const playerHitbox = {
          x: this.player.x - this.player.width / 3,
          y: this.player.y - this.player.height / 3,
          width: this.player.width * 0.67,
          height: this.player.height * 0.67,
        };
        if (checkCollision(playerHitbox, alien)) {
          this.handlePlayerHit(alien, j);
          if (!this.running) break;
          if (this.player.invincible) break;
        }
      }
    }
    // Player vs Items
    for (let k = this.items.length - 1; k >= 0; k--) {
      const item = this.items[k];
      if (!item.active) continue;
      if (checkCollision(this.player, item)) {
        item.applyEffect(this.player, this);
        item.active = false;
      }
    }
    // Debris vs Aliens
    this.particleManager.checkDebrisCollisions(this.aliens, this);
  }

  handleAlienDestroyed(alien, index, source) {
    this.player.addScore(alien.points, this);
    // Only player kills count towards bullet level up
    if (source === "player") {
      this.player.increaseKillCount(this);
    }
    this.particleManager.createExplosion(
      alien.getCenterX(),
      alien.getCenterY(),
      alien.color,
      10 + alien.width * 0.2
    );
    this.particleManager.createAlienDebris(alien);
    this.particleManager.createXpIndicator(
      alien.getCenterX(),
      alien.getCenterY(),
      `+${alien.points}`
    );
    if (alien.shouldDropItem()) {
      this.spawnItem(alien.getCenterX(), alien.getCenterY());
    }
    alien.active = false;
  }
  handleAlienLeak(alien, index) {
    if (alien.alienType === "scout") {
      this.spawnFighterWave(alien.getCenterX());
      alien.active = false;
    } else if (alien.alienType === "fighter" || alien.alienType === "elite") {
      alien.active = false;
      this.handlePlayerHit("alien_leak");
    } else {
      alien.active = false;
    }
  }
  handlePlayerHit(source, alienIndex = -1) {
    if (this.player.invincible) return;
    if (source instanceof Alien && alienIndex !== -1) {
      this.handleAlienDestroyed(source, alienIndex, "player_collision");
    }
    if (!this.player.loseLife()) {
      this.particleManager.createExplosion(
        this.player.x,
        this.player.y,
        this.player.color,
        50
      );
      this.gameOver();
    } else {
      this.player.resetAfterDeath(this.width, this.height);
      this.abilityManager.resetUnlocksOnDeath();
      this.uiManager.updateLives(this.player.lives);
      this.uiManager.updateBulletPower(this.player.bulletPowerLevel, 0, false);
      this.uiManager.updateUnlockBar(0, this.abilityManager.unlockedAbilities);
      this.particleManager.createExplosion(
        this.player.x,
        this.player.y,
        this.player.color,
        20
      );
      console.log("Player died, respawning. Lives left:", this.player.lives);
    }
  }
  handleRocketExplosion(rocket) {
    rocket.active = false;
    const explosionX = rocket.getCenterX();
    const explosionY = rocket.getCenterY();
    this.particleManager.createExplosion(
      explosionX,
      explosionY,
      rocket.color,
      30 + rocket.width
    );
    for (let j = this.aliens.length - 1; j >= 0; j--) {
      const alien = this.aliens[j];
      if (!alien.active) continue;
      const dist = distance({ x: explosionX, y: explosionY }, alien);
      if (dist < rocket.explosionRadius) {
        const destroyed = alien.takeDamage(rocket.damage);
        if (destroyed) this.handleAlienDestroyed(alien, j, "rocket");
      }
    }
  }
  spawnItem(x, y) {
    let type = "xp";
    const rand = Math.random();
    if (rand < 0.1 && this.player.lives < this.player.maxLives) {
      type = "life";
    } else if (rand < 0.2) {
      type = "bomb";
    } else {
      type = "xp";
    }
    const value =
      type === "xp"
        ? getRandomInt(
          GAME_CONFIG.items.xpValueMin,
          GAME_CONFIG.items.xpValueMax
        )
        : 0;
    this.items.push(
      new Item(x, y, type, value)
    ); /* console.log(`Item spawned: ${type}`); */
  }
  activateBomb(x, y) {
    console.log("BOMB ACTIVATED!");
    const cfg = GAME_CONFIG.items;
    this.particleManager.createExplosion(
      x,
      y,
      cfg.bombColor,
      cfg.bombEffectRadius * 0.5
    );
    this.particleManager.createShockwave(x, y);
    for (let j = this.aliens.length - 1; j >= 0; j--) {
      const alien = this.aliens[j];
      if (!alien.active || alien.y < 0) continue;
      const destroyed = alien.takeDamage(cfg.bombDamage);
      if (destroyed) {
        this.handleAlienDestroyed(alien, j, "bomb");
      } else {
        this.particleManager.createExplosion(
          alien.getCenterX(),
          alien.getCenterY(),
          alien.color,
          5
        );
      }
    }
  }

  addScore(amount) {
    if (!this.running) return; // Don't add score if game isn't running
    this.score += amount;
    this.uiManager.updateScore(this.score);
    // Check unlocks based on player's current life score
    this.abilityManager.checkUnlocks(this.player.currentLifeScore);
    // Update UI bar based on player's current life score
    this.uiManager.updateUnlockBar(
      this.player.currentLifeScore,
      this.abilityManager.unlockedAbilities
    );
  }

  checkLevelUp() {
    const scoreNeeded =
      GAME_CONFIG.levelScoreBase *
      Math.pow(this.level, GAME_CONFIG.levelScoreExponent);
    if (this.score >= scoreNeeded) {
      const oldLevel = this.level;

      this.level++;
      this.uiManager.updateLevel(this.level);
      this.uiManager.showLevelUpMessage(this.level);

      // Check if music needs to change
      const oldTrackKey = this.audioManager.getTrackKeyForLevel(oldLevel);
      const newTrackKey = this.audioManager.getTrackKeyForLevel(this.level);
      if (newTrackKey !== oldTrackKey) {
        console.log(`Level ${this.level}: Changing music track...`);
        this.audioManager.playTrackForLevel(this.level); // Triggers crossfade
      }


      const config = GAME_CONFIG.aliens;
      this.alienSpawnInterval = Math.max(
        this.alienSpawnInterval * config.levelSpawnIntervalMultiplier,
        GAME_CONFIG.aliens.initialSpawnInterval *
        config.levelSpawnIntervalMinFactor
      );
      this.minAliensOnScreen = Math.floor(
        config.minOnScreenBase + this.level * config.minOnScreenLevelScale
      );
      console.log(
        `Level Up! Lvl: ${this.level}, Min Aliens: ${this.minAliensOnScreen
        }, Spawn Interval: ${this.alienSpawnInterval.toFixed(0)}`
      );
    }
  }
  activateAbility(key) {
    if (!this.abilityManager.isReady(key)) {
      /* console.log(`Ability ${key} not ready or locked.`); */ return;
    }
    let activated = false;
    switch (key) {
      case "rocket":
        if (this.abilityManager.activate(key)) {
          this.rockets.push(new Rocket(this.player.x, this.player.y));
          activated = true;
        }
        break;
      case "wingman":
        if (this.abilityManager.activate(key)) {
          this.spawnWingmen();
          activated = true;
        }
        break;
      case "miniShip":
        if (this.abilityManager.activate(key)) {
          this.spawnMiniShips();
          activated = true;
        }
        break;
    } /* if (activated) console.log(`Ability Activated: ${key}`); */
  }
  togglePlayerBulletMode() {
    const newMode = this.player.toggleBulletMode(this);
    this.abilityManager.updateBulletModeVisuals(newMode);
    this.abilityManager.triggerVisualFeedback("bulletMode");
    this.particleManager.createPowerUpEffect(
      this.player.x,
      this.player.y,
      newMode
    );
    console.log("Bullet mode swapped, power reset.");
  }
  spawnWingmen() {
    this.wingmen = [];
    const count = GAME_CONFIG.wingman.count;
    const offsetX = GAME_CONFIG.wingman.offsetX;
    for (let i = 0; i < count; i++) {
      const sign = i % 2 === 0 ? -1 : 1;
      this.wingmen.push(
        new Wingman(this.player.x, this.player.y, sign * offsetX)
      );
      this.particleManager.createExplosion(
        this.player.x + sign * offsetX,
        this.player.y,
        GAME_CONFIG.wingman.color,
        15
      );
    }
  }
  spawnMiniShips() {
    // Ensure MiniShips are properly cleared before spawning new ones
    this.miniShips = [];
    const count = GAME_CONFIG.miniShip.count;
    for (let i = 0; i < count; i++) {
      this.miniShips.push(new MiniShip(this.player.x, this.player.y, i));
    }
    this.particleManager.createExplosion(
      this.player.x,
      this.player.y,
      GAME_CONFIG.miniShip.color,
      25
    );
    console.log("Spawned MiniShips:", this.miniShips.length); // Debug log
  }
  checkActiveAbilities() {
    // Check Wingmen duration
    if (this.wingmen.length > 0 && !this.abilityManager.isActive("wingman")) {
      console.log("Wingman duration ended."); // Debug log
      this.particleManager.createExplosion(
        this.player.x,
        this.player.y,
        GAME_CONFIG.wingman.color,
        20
      );
      this.wingmen = [];
    }
    // Check MiniShips duration
    if (
      this.miniShips.length > 0 &&
      !this.abilityManager.isActive("miniShip")
    ) {
      console.log("MiniShip duration ended."); // Debug log
      this.particleManager.createExplosion(
        this.player.x,
        this.player.y,
        GAME_CONFIG.miniShip.color,
        20
      );
      this.miniShips = [];
    }
  }

  draw() {
    drawStarfield(this.ctx);
    this.drawEntities(this.aliens);
    this.drawEntities(this.rockets);
    this.drawEntities(this.items);
    this.drawEntities(this.wingmen);
    this.drawEntities(this.miniShips);
    this.player.draw(this.ctx);
    this.drawEntities(this.bullets);
    this.particleManager.draw(this.ctx);
  }

  drawEntities(entities) {
    for (const entity of entities) {
      if (entity.active) {
        entity.draw(this.ctx);
        // Particle hooks for trails
        if (entity instanceof Bullet && entity.owner === "player") {
          this.particleManager.createBulletTrail(
            entity.getCenterX(),
            entity.y + entity.height,
            entity.color
          );
        } else if (entity instanceof Bullet && entity.owner === "miniShip") {
          // Trail for miniship rockets
          this.particleManager.createMiniRocketTrail(
            entity.getCenterX(),
            entity.getCenterY(),
            entity.config.trailColor || entity.color
          );
        } else if (entity instanceof Rocket) {
          this.particleManager.createRocketFlame(
            entity.x,
            entity.y + entity.height
          );
        }
      }
    }
  }
  isRunning() {
    return this.running;
  }
  isPaused() {
    return this.paused;
  }
}


