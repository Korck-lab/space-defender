// js/game.js

class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    // Game State
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.level = 1;
    this.lastTimestamp = 0;
    this.animationFrameId = null;
    this.highScores = this.loadHighScores();

    // Timers & Spawning
    this.alienSpawnTimer = 0;
    this.alienSpawnInterval = GAME_CONFIG.aliens.initialSpawnInterval;
    this.alienBaseSpeed = GAME_CONFIG.aliens.initialSpeed;
    this.alienBaseHealth = GAME_CONFIG.aliens.initialHealth;
    this.minAliensOnScreen = GAME_CONFIG.aliens.minOnScreenBase;
    this.lastMusicUpdateTime = 0; // Timer for music intensity updates
    this.musicUpdateInterval = 1000; // Update music intensity every second

    // Managers
    this.audioManager = new AudioManager();
    this.uiManager = new UIManager();
    this.abilityManager = new AbilityManager(this.uiManager); // Pass UIManager
    this.particleManager = new ParticleManager();

    // Entities
    this.player = new Player(this.width, this.height);
    this.bullets = [];
    this.rockets = [];
    this.aliens = [];
    this.wingmen = [];
    this.miniShips = [];
    this.items = []; // For pickups like XP, Life, Bomb

    // Input
    this.inputHandler = new InputHandler(
      this.canvas,
      this,
      this.player,
      this.abilityManager
    );

    // Initial Setup
    initStarfield(this.width, this.height);
    createPlayerBuffer(GAME_CONFIG.player); // Create player ship buffer

    // Bind game loop context
    this.gameLoop = this.gameLoop.bind(this);
  }

  // --- Game Lifecycle ---

  start() {
    // Audio context should be initialized/resumed by button click before calling start
    if (!this.audioManager.isInitialized) {
      console.warn("AudioContext not initialized before game start!");
      // Attempt init here, but it might fail if not user-triggered
      this.audioManager.initAudioContext();
    } else if (this.audioManager.audioContext.state === "suspended") {
      this.audioManager.audioContext.resume(); // Ensure it's running
    }

    this.resetGame(); // Reset all game variables and entities
    this.running = true;
    this.paused = false;
    this.uiManager.hideAllScreens();
    this.uiManager.resetUI(this.abilityManager.unlockedAbilities); // Reset UI state
    this.lastTimestamp = performance.now();
    this.lastMusicUpdateTime = this.lastTimestamp;
    this.audioManager.startMusic(); // Start background music sequence
    this.requestLoop(); // Start the game loop
    console.log("Game Started - Level:", this.level);
  }

  gameOver() {
    console.log("Game Over Triggered");
    this.running = false;
    this.cancelLoop();
    this.audioManager.stopMusic(); // Stop background music
    // Optional: Play game over sound effect
    // this.audioManager.playSound('gameOver');

    this.saveHighScore(this.score);
    this.highScores = this.loadHighScores(); // Reload scores to include the new one
    this.uiManager.showGameOverScreen(
      this.score,
      this.player.maxReachedPower,
      this.highScores
    );
    console.log("Game Over - Final Score:", this.score);
  }

  togglePause() {
    if (!this.running) return; // Can't pause if not running

    this.paused = !this.paused;

    if (this.paused) {
      this.cancelLoop(); // Stop requesting new frames
      // Suspend audio context and music timer
      if (this.audioManager.isInitialized) {
        this.audioManager.audioContext.suspend();
        if (this.audioManager.musicInterval) {
          clearTimeout(this.audioManager.musicInterval);
          this.audioManager.musicInterval = null; // Clear interval ID
        }
      }
      this.uiManager.showPauseScreen(this.score);
      console.log("Game Paused");
    } else {
      // Resume game
      // Resume audio context and restart music scheduler
      if (this.audioManager.isInitialized) {
        this.audioManager.audioContext
          .resume()
          .then(() => {
            // Restart music sequence only after context is resumed
            // Use startMusic to reset sequence timing correctly, avoid calling if interval exists
            if (!this.audioManager.musicInterval) {
              this.audioManager.startMusic();
            }
          })
          .catch((e) => console.error("Error resuming audio context:", e));
      }
      this.uiManager.hideAllScreens();
      this.lastTimestamp = performance.now(); // Reset timestamp to avoid large deltaTime jump
      this.requestLoop(); // Restart the game loop
      console.log("Game Resumed");
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

    // Clear entity arrays
    this.bullets = [];
    this.rockets = [];
    this.aliens = [];
    this.wingmen = [];
    this.miniShips = [];
    this.items = [];

    // Reset managers
    this.particleManager.reset();
    this.abilityManager.reset(); // Resets cooldowns and unlocks (except defaults)

    // Reset player state
    this.player.resetForNewGame(this.width, this.height);

    // Reset UI (passing the reset unlocked set)
    this.uiManager.resetUI(this.abilityManager.unlockedAbilities);

    // Ensure music state is reset if needed (stopMusic handles this partially)
    this.audioManager.stopMusic(); // Ensure previous music fully stopped
    this.audioManager.activeMusicLayers = 1;
    this.audioManager.beatsPerMinute = this.audioManager.minBpm;

    console.log("Game Reset");
  }

  // --- Game Loop ---

  requestLoop() {
    // Ensure only one loop is requested at a time
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  }

  cancelLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  gameLoop(timestamp) {
    if (!this.running || this.paused) {
      this.animationFrameId = null; // Ensure we can request a new frame if paused/resumed
      return;
    }

    // Calculate deltaTime, limiting to prevent large jumps after pause/lag
    const deltaTime = Math.min(timestamp - this.lastTimestamp, 100); // Max 100ms step
    this.lastTimestamp = timestamp;

    // --- Update Phase ---
    this.update(deltaTime);

    // --- Draw Phase ---
    this.draw();

    // Request the next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop); // Request next immediately
  }

  // --- Update Logic ---

  update(deltaTime) {
    // Update Player
    this.player.update(deltaTime, this.width);

    // Update Managers
    this.abilityManager.update(deltaTime);
    this.particleManager.update(deltaTime);

    // Update Entities (using helper function)
    // Pass necessary arguments for each entity type's update method
    this.updateEntities(deltaTime, this.bullets, this); // Pass gameRef for boundary checks
    this.updateEntities(deltaTime, this.rockets);
    this.updateEntities(deltaTime, this.aliens, this.height, this.player); // Pass height and player ref
    this.updateEntities(
      deltaTime,
      this.wingmen,
      this.player,
      this.aliens,
      this
    ); // Pass player, aliens, game
    this.updateEntities(
      deltaTime,
      this.miniShips,
      this.player,
      this.aliens,
      this
    ); // Pass player, aliens, game
    this.updateEntities(deltaTime, this.items);

    // Game Logic Updates
    this.spawnAliens(deltaTime);
    this.handlePlayerShooting(performance.now()); // Use high-res time for shooting checks
    this.checkCollisions();
    this.checkActiveAbilities(); // Check duration-based abilities (Wingmen, MiniShips)
    this.checkLevelUp();

    // Update Music Intensity periodically
    if (
      this.audioManager.isInitialized &&
      this.lastTimestamp - this.lastMusicUpdateTime > this.musicUpdateInterval
    ) {
      this.audioManager.updateMusicIntensity(
        this.level,
        this.aliens.filter((a) => a.active).length
      );
      this.lastMusicUpdateTime = this.lastTimestamp;
    }

    // Cleanup inactive entities (separate loop after updates & collisions)
    this.cleanupEntities();
  }

  // Helper to update a list of entities and handle offscreen logic
  updateEntities(deltaTime, entities, ...args) {
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      if (!entity.active) continue; // Skip inactive

      // Call the entity's update method with provided arguments
      entity.update(deltaTime, ...args);

      // Check if entity is offscreen AFTER updating position
      // Use a generous margin for most things, stricter for bullets maybe
      const offscreenMargin =
        entity instanceof Bullet || entity instanceof Rocket ? 10 : 50;
      if (entity.isOffscreen(this.width, this.height, offscreenMargin)) {
        // Handle specific offscreen logic
        if (
          entity instanceof Alien &&
          entity.y > this.height + offscreenMargin
        ) {
          // Alien leaked past the bottom
          this.handleAlienLeak(entity, i);
        } else if (
          entity instanceof Bullet ||
          entity instanceof Rocket ||
          entity instanceof Item ||
          entity instanceof Debris ||
          entity instanceof Particle
        ) {
          // Bullets, rockets, items, debris, particles get deactivated when offscreen
          entity.active = false;
        }
        // Player is handled by clamping within update
        // Wingmen/Miniships follow player, shouldn't go significantly offscreen unless player does
      }

      // Specific checks like rocket explosion
      if (entity instanceof Rocket && entity.shouldExplode(this.height)) {
        this.handleRocketExplosion(entity);
      }
    }
  }

  // Helper to remove inactive entities
  cleanupEntities() {
    this.bullets = this.bullets.filter((e) => e.active);
    this.rockets = this.rockets.filter((e) => e.active);
    this.aliens = this.aliens.filter((e) => e.active);
    this.items = this.items.filter((e) => e.active);
    // Wingmen/MiniShips are removed based on ability duration in checkActiveAbilities
  }

  // --- Spawning Logic ---

  spawnAliens(deltaTime) {
    this.alienSpawnTimer += deltaTime;
    const activeAlienCount = this.aliens.filter((a) => a.active).length;

    // Determine if we should spawn: timer elapsed OR below minimum count
    const spawnInterval =
      this.alienSpawnInterval / (1 + (this.level - 1) * 0.05); // Faster spawns at higher levels
    const shouldSpawn =
      this.alienSpawnTimer >= spawnInterval ||
      activeAlienCount < this.minAliensOnScreen;

    if (shouldSpawn && this.running) {
      // Ensure game is running
      this.alienSpawnTimer = 0; // Reset timer

      // Determine Alien Type based on ratios and level
      const rand = Math.random();
      let type = "scout";
      let specificConfig = GAME_CONFIG.aliens.scout;

      const baseEliteChance = GAME_CONFIG.aliens.spawnRatioElite;
      const baseFighterChance = GAME_CONFIG.aliens.spawnRatioFighter;
      // Increase chance of harder enemies at higher levels
      const levelMultiplier = 1 + (this.level - 1) * 0.03;
      const eliteChance = baseEliteChance * levelMultiplier;
      const fighterChance = baseFighterChance * levelMultiplier;

      if (rand < eliteChance && this.level >= 3) {
        // Elites appear from level 3
        type = "elite";
        specificConfig = GAME_CONFIG.aliens.elite;
      } else if (rand < eliteChance + fighterChance) {
        type = "fighter";
        specificConfig = GAME_CONFIG.aliens.fighter;
      }
      // Else defaults to scout

      // Calculate Alien Stats based on type, level, and base values
      const healthMultiplier = specificConfig.healthMultiplier || 1.0;
      const speedMultiplier = specificConfig.speedMultiplier || 1.0;
      const pointsMultiplier = specificConfig.pointsMultiplier || 1.0;

      const size = getRandom(
        specificConfig.sizeMin,
        specificConfig.sizeMin + specificConfig.sizeRange
      );
      // Scale health/speed more significantly with level
      const health =
        (this.alienBaseHealth + (this.level - 1) * 0.8) * healthMultiplier;
      const speed =
        (this.alienBaseSpeed + (this.level - 1) * 0.1) * speedMultiplier;
      const points = Math.floor(
        (GAME_CONFIG.aliens.basePoints + health * 2 + speed * 10) *
          pointsMultiplier
      ); // Adjusted points calculation

      const color =
        specificConfig.color ||
        `hsl(${getRandom(
          specificConfig.colorHueMin,
          specificConfig.colorHueMin + specificConfig.colorHueRange
        )}, ${specificConfig.saturation}, ${specificConfig.lightness})`;

      // Create and add the new alien
      this.aliens.push(
        new Alien(
          Math.random() * (this.width - size), // Random X position (within bounds)
          -size, // Start just above the screen
          size,
          size, // Use calculated size
          speed,
          health,
          points,
          color,
          type,
          specificConfig,
          this // Pass game reference
        )
      );
    }
  }

  spawnFighterWave(leakedScoutX) {
    console.log("Scout leaked, spawning fighter wave!");
    const count = GAME_CONFIG.aliens.scout.fighterSpawnCount || 1;
    const typeConfig = GAME_CONFIG.aliens.fighter;
    const baseSize = getRandom(
      typeConfig.sizeMin,
      typeConfig.sizeMin + typeConfig.sizeRange
    );

    for (let i = 0; i < count; i++) {
      // Calculate stats similar to spawnAliens but specifically for fighters
      const healthMultiplier = typeConfig.healthMultiplier || 1.0;
      const speedMultiplier = typeConfig.speedMultiplier || 1.0;
      const pointsMultiplier = typeConfig.pointsMultiplier || 1.0;
      const size = baseSize * getRandom(0.9, 1.1); // Slight size variation

      const health =
        (this.alienBaseHealth + (this.level - 1) * 0.8) * healthMultiplier;
      const speed =
        (this.alienBaseSpeed + (this.level - 1) * 0.1) * speedMultiplier;
      const points = Math.floor(
        (GAME_CONFIG.aliens.basePoints + health * 2 + speed * 10) *
          pointsMultiplier
      );
      const color = typeConfig.color;

      // Spawn fighters near where the scout leaked, slightly spread out and staggered vertically
      const spawnX = clamp(
        leakedScoutX + (i - (count - 1) / 2) * size * 1.2, // Spread horizontally
        size / 2,
        this.width - size * 1.5
      );
      const spawnY = -size * (i + 1) * 1.5; // Stagger vertical start

      this.aliens.push(
        new Alien(
          spawnX,
          spawnY,
          size,
          size,
          speed,
          health,
          points,
          color,
          "fighter", // Explicitly set type
          typeConfig,
          this
        )
      );
    }
  }

  spawnItem(x, y) {
    let type = "xp"; // Default to XP
    const rand = Math.random();
    const itemConfig = GAME_CONFIG.items;

    // Determine item type based on chance and player state
    if (rand < 0.1 && this.player.lives < this.player.maxLives) {
      // Life drop chance (if not max lives)
      type = "life";
    } else if (rand < 0.2) {
      // Bomb drop chance (adjust as needed)
      type = "bomb";
    }
    // Else remains 'xp'

    const value =
      type === "xp"
        ? getRandomInt(itemConfig.xpValueMin, itemConfig.xpValueMax)
        : 1; // Value is 1 for life/bomb

    this.items.push(new Item(x, y, type, value));
    // console.log(`Item spawned: ${type} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }

  spawnWingmen() {
    this.wingmen = []; // Clear existing wingmen
    const count = GAME_CONFIG.wingman.count;
    const offsetX = GAME_CONFIG.wingman.offsetX;
    for (let i = 0; i < count; i++) {
      const sign = i % 2 === 0 ? -1 : 1; // Alternate sides
      const startX = this.player.getCenterX() + sign * offsetX;
      const startY = this.player.getCenterY() + GAME_CONFIG.wingman.offsetY;
      this.wingmen.push(
        new Wingman(this.player.x, this.player.y, sign * offsetX)
      ); // Pass player base coords and offset

      // Spawn effect
      this.particleManager.createExplosion(
        startX,
        startY,
        GAME_CONFIG.wingman.color,
        0.8
      ); // Smaller explosion
    }
    console.log(`Spawned ${this.wingmen.length} Wingmen.`);
  }

  spawnMiniShips() {
    this.miniShips = []; // Clear existing ones
    const count = GAME_CONFIG.miniShip.count;
    for (let i = 0; i < count; i++) {
      // Pass player coords and index for positioning
      this.miniShips.push(new MiniShip(this.player.x, this.player.y, i));
      // Assign gameRef to miniship if needed in its methods
      this.miniShips[this.miniShips.length - 1].gameRef = this;
    }
    // Spawn effect at player location
    this.particleManager.createExplosion(
      this.player.getCenterX(),
      this.player.getCenterY(),
      GAME_CONFIG.miniShip.color,
      1.2
    );
    console.log(`Spawned ${this.miniShips.length} MiniShips.`);
  }

  // --- Player Actions ---

  handlePlayerShooting(currentTime) {
    // Check autofire toggle and cooldown
    if (
      this.player.autoFire &&
      this.player.canShoot(currentTime) &&
      this.player.active
    ) {
      this.player.recordShot(currentTime); // Update last shot time
      this.createPlayerBullets(); // Create the actual bullets
      // Muzzle flash particle effect
      this.particleManager.createMuzzleFlash(
        this.player.getCenterX(), // Start flash at center-top
        this.player.y,
        this.player.bulletMode === "spread"
          ? GAME_CONFIG.bullets.player.colorSpread
          : GAME_CONFIG.bullets.player.colorParallel
      );
      // Play laser sound effect
      this.audioManager.playSound("laser", { pitch: 1.0 });
    }
  }

  createPlayerBullets() {
    const pConfig = GAME_CONFIG.player;
    const bConfig = GAME_CONFIG.bullets.player;
    const power = this.player.bulletPowerLevel;
    const startX = this.player.getCenterX();
    const startY = this.player.y; // Bullets start from the top of the player sprite

    // Calculate damage based on power level and mode
    const damageMultiplier = bConfig.baseDamageMultiplier * (power * 0.4 + 0.6); // Scale damage less aggressively
    const damage =
      damageMultiplier *
      (this.player.bulletMode === "parallel"
        ? bConfig.parallelDamageFactor
        : 1);

    if (this.player.bulletMode === "spread") {
      const color = bConfig.colorSpread;
      const angleStep =
        bConfig.spreadAngleMultiplier / Math.max(1, power * 0.5); // Wider spread for more bullets? Or tighter? Let's try tighter.
      for (let i = 0; i < power; i++) {
        // Calculate angle: 0 is straight up (-PI/2)
        const angleOffset = (i - (power - 1) / 2) * angleStep;
        const currentAngle = -Math.PI / 2 + angleOffset;
        const speedX = Math.cos(currentAngle) * Math.abs(bConfig.speedY); // Use speed magnitude
        const speedY = Math.sin(currentAngle) * Math.abs(bConfig.speedY);

        this.bullets.push(
          new Bullet(
            startX,
            startY,
            { ...bConfig, color }, // Pass specific color
            speedX,
            speedY,
            damage,
            "player"
          )
        );
      }
    } else {
      // Parallel mode
      const color = bConfig.colorParallel;
      const offsetStep = bConfig.parallelOffsetMultiplier;
      for (let i = 0; i < power; i++) {
        const xOffset = (i - (power - 1) / 2) * offsetStep;
        this.bullets.push(
          new Bullet(
            startX + xOffset,
            startY,
            { ...bConfig, color }, // Pass specific color
            0,
            bConfig.speedY,
            damage,
            "player"
          )
        );
      }
    }
  }

  // Method for aliens (or other entities) to add bullets to the game
  addAlienBullet(x, y, speedX, speedY, config) {
    this.bullets.push(
      new Bullet(x, y, config, speedX, speedY, config.damage, "alien")
    );
  }

  // Method for MiniShips to shoot rockets
  shootMiniShipRocket(miniShip, target) {
    if (!target || !target.active) return; // Need a valid target

    const config = GAME_CONFIG.bullets.miniShipRocket;
    const startX = miniShip.getCenterX();
    const startY = miniShip.getCenterY();

    // Initial velocity calculation (target needed for homing)
    const angle = Math.atan2(
      target.getCenterY() - startY,
      target.getCenterX() - startX
    );
    const speedX = Math.cos(angle) * config.speed;
    const speedY = Math.sin(angle) * config.speed;

    // Create the homing bullet
    this.bullets.push(
      new Bullet(
        startX,
        startY,
        config,
        speedX,
        speedY,
        config.damage,
        "miniShip", // Set owner
        target // Pass target for homing behavior
      )
    );

    // Play sound
    this.audioManager.playSound("laser", { pitch: 1.4 + Math.random() * 0.2 }); // Higher pitch for mini-ships

    // Optional: Muzzle flash effect
    this.particleManager.createMuzzleFlash(startX, startY, config.color, angle);
  }

  // --- Collision Detection & Handling ---

  checkCollisions() {
    // 1. Player Bullets vs Aliens
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (
        !bullet.active ||
        (bullet.owner !== "player" && bullet.owner !== "miniShip")
      )
        continue;

      for (let j = this.aliens.length - 1; j >= 0; j--) {
        const alien = this.aliens[j];
        if (!alien.active || alien.health <= 0) continue;

        if (checkCollision(bullet, alien)) {
          const destroyed = alien.takeDamage(bullet.damage);
          bullet.active = false; // Deactivate bullet on hit

          // Create impact particles
          this.particleManager.createExplosion(
            bullet.getCenterX(),
            bullet.getCenterY(),
            alien.color,
            0.3
          );

          if (destroyed) {
            this.handleAlienDestroyed(alien, j, bullet.owner); // Pass owner (player/miniship)
          }
          // Bullet hit an alien, no need to check other aliens for this bullet
          break;
        }
      }
    }

    // 2. Alien Bullets vs Player
    if (!this.player.invincible) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const bullet = this.bullets[i];
        if (!bullet.active || bullet.owner !== "alien") continue;

        if (checkCollision(bullet, this.player)) {
          bullet.active = false; // Deactivate bullet
          this.handlePlayerHit("alien_bullet");
          // If player dies, game over is handled within handlePlayerHit
          if (!this.player.active) break; // Stop checking if player died
        }
      }
    }

    // 3. Player vs Aliens (Collision)
    if (!this.player.invincible) {
      for (let j = this.aliens.length - 1; j >= 0; j--) {
        const alien = this.aliens[j];
        if (!alien.active || alien.health <= 0) continue;

        // Use a slightly smaller hitbox for the player for forgiveness
        const playerHitbox = {
          x: this.player.x + this.player.width * 0.15,
          y: this.player.y + this.player.height * 0.15,
          width: this.player.width * 0.7,
          height: this.player.height * 0.7,
        };

        if (checkCollision(playerHitbox, alien)) {
          // Player hit an alien directly
          this.handlePlayerHit(alien, j); // Pass alien reference and index
          // If player dies, game over is handled within handlePlayerHit
          if (!this.player.active) break; // Stop checking if player died
          // If player survived (invincible now), break loop as they can't be hit again immediately
          if (this.player.invincible) break;
        }
      }
    }

    // 4. Player vs Items
    for (let k = this.items.length - 1; k >= 0; k--) {
      const item = this.items[k];
      if (!item.active) continue;

      if (checkCollision(this.player, item)) {
        item.applyEffect(this.player, this); // Apply effect (handles sound)
        item.active = false; // Deactivate item
      }
    }

    // 5. Debris vs Aliens
    this.particleManager.checkDebrisCollisions(this.aliens, this);

    // 6. Rockets vs Aliens (Explosion handled separately) - No direct collision needed
  }

  handleAlienDestroyed(alien, index, source) {
    // Add score - only player kills count towards power-up progression
    if (source === "player") {
      this.player.addScore(alien.points, this); // Use player method to trigger game score
      this.player.increaseKillCount(this); // Increase kill count for player power-up
    } else {
      // For miniship, rocket, debris kills, just add score directly to game
      this.addScore(alien.points); // Use game method directly
    }

    // Sound effect
    this.audioManager.playSound("explosion", { size: alien.width / 40 }); // Scale sound by size

    // Particle effects
    this.particleManager.createExplosion(
      alien.getCenterX(),
      alien.getCenterY(),
      alien.color,
      alien.width / 30
    ); // Scale effect by size
    this.particleManager.createAlienDebris(alien);
    // XP indicator only if killed by player? Or always? Let's do always.
    this.particleManager.createXpIndicator(
      alien.getCenterX(),
      alien.getCenterY(),
      `+${alien.points}`
    );

    // Check for item drop
    if (alien.shouldDropItem()) {
      this.spawnItem(alien.getCenterX(), alien.getCenterY());
    }

    // Mark alien as inactive (will be removed by cleanup loop)
    alien.active = false;
    // console.log(`Alien ${alien.alienType} destroyed by ${source}.`);
  }

  handleAlienLeak(alien, index) {
    console.log(`Alien ${alien.alienType} leaked!`);
    if (alien.alienType === "scout") {
      // Spawn fighter wave near where scout leaked
      this.spawnFighterWave(alien.getCenterX());
      alien.active = false; // Remove the scout
      // Optional: Penalty? Sound?
      // this.audioManager.playSound('scoutLeak');
    } else if (alien.alienType === "fighter" || alien.alienType === "elite") {
      // Fighters/Elites leaking cause player damage/death
      alien.active = false; // Remove the alien first
      this.handlePlayerHit("alien_leak"); // Then handle player hit
    } else {
      // Unknown type, just remove it
      alien.active = false;
    }
  }

  handlePlayerHit(source, alienCollidedWith = null, alienIndex = -1) {
    if (this.player.invincible) return; // Can't be hit if invincible

    console.log(
      `Player hit by: ${source instanceof Alien ? source.alienType : source}`
    );
    this.audioManager.playSound("playerHit"); // Play hit sound

    // If hit by an alien collision, destroy that alien (counts as player kill technically)
    if (source instanceof Alien && alienCollidedWith) {
      // No index needed if we have the reference, but handleAlienDestroyed expects it
      // Let's find the index again for safety, or modify handleAlienDestroyed
      const collidedAlienIndex = this.aliens.findIndex(
        (a) => a === alienCollidedWith
      );
      if (collidedAlienIndex !== -1) {
        this.handleAlienDestroyed(
          alienCollidedWith,
          collidedAlienIndex,
          "player_collision"
        );
      } else {
        // Fallback if index not found (shouldn't happen often)
        alienCollidedWith.active = false;
        this.particleManager.createExplosion(
          alienCollidedWith.getCenterX(),
          alienCollidedWith.getCenterY(),
          alienCollidedWith.color,
          1.0
        );
      }
    }

    // Player loses a life
    if (!this.player.loseLife()) {
      // Player has no lives left - GAME OVER
      this.player.active = false; // Mark player as inactive
      // Create large player explosion
      this.particleManager.createExplosion(
        this.player.getCenterX(),
        this.player.getCenterY(),
        this.player.color,
        2.5
      );
      this.gameOver(); // Trigger game over sequence
    } else {
      // Player has lives left - Respawn procedure
      this.player.resetAfterDeath(this.width, this.height); // Resets position, gives invincibility
      this.abilityManager.resetUnlocksOnDeath(); // Reset ability unlocks
      this.uiManager.updateLives(this.player.lives);
      this.uiManager.updateBulletPower(this.player.bulletPowerLevel, 0, false); // Reset power UI
      // Reset unlock bar UI based on zero currentLifeScore
      this.uiManager.updateUnlockBar(0, this.abilityManager.unlockedAbilities);

      // Respawn explosion effect
      this.particleManager.createExplosion(
        this.player.getCenterX(),
        this.player.getCenterY(),
        this.player.color,
        1.5
      );
      console.log("Player died, respawning. Lives left:", this.player.lives);
    }
  }

  handleRocketExplosion(rocket) {
    if (!rocket.active) return; // Prevent double explosions

    rocket.active = false; // Deactivate rocket
    const explosionX = rocket.getCenterX();
    const explosionY = rocket.getCenterY();

    console.log("Rocket exploded!");
    this.audioManager.playSound("explosion", { size: 1.5 }); // Play large explosion sound

    // Create large visual explosion
    this.particleManager.createExplosion(
      explosionX,
      explosionY,
      rocket.color,
      1.8
    );
    this.particleManager.createShockwave(explosionX, explosionY, 1.5);

    // Damage aliens within radius
    for (let j = this.aliens.length - 1; j >= 0; j--) {
      const alien = this.aliens[j];
      if (!alien.active || alien.health <= 0) continue;

      // Calculate distance from explosion center to alien center
      const dist = distance(
        { x: explosionX, y: explosionY },
        { x: alien.getCenterX(), y: alien.getCenterY() }
      );

      if (dist < rocket.explosionRadius) {
        // Apply damage (maybe falloff with distance?)
        const damage = rocket.damage; // Simple fixed damage for now
        const destroyed = alien.takeDamage(damage);

        // Small particle effect on hit alien
        this.particleManager.createExplosion(
          alien.getCenterX(),
          alien.getCenterY(),
          alien.color,
          0.2
        );

        if (destroyed) {
          this.handleAlienDestroyed(alien, j, "rocket");
        }
      }
    }
  }

  // Called when player collects a bomb item
  activateBomb(x, y) {
    console.log("BOMB ACTIVATED!");
    const cfg = GAME_CONFIG.items;

    // Sound & Visuals first
    this.audioManager.playSound("explosion", { size: 2.5 }); // Big bomb sound
    this.particleManager.createExplosion(x, y, cfg.bombColor, 3.0); // Large visual
    this.particleManager.createShockwave(x, y, 2.5); // Large shockwave

    // Damage all active aliens on screen
    for (let j = this.aliens.length - 1; j >= 0; j--) {
      const alien = this.aliens[j];
      // Ensure alien is active and actually on screen (y > negative height)
      if (!alien.active || alien.health <= 0 || alien.y < -alien.height)
        continue;

      const destroyed = alien.takeDamage(cfg.bombDamage);
      // Small explosion on each damaged alien
      this.particleManager.createExplosion(
        alien.getCenterX(),
        alien.getCenterY(),
        alien.color,
        0.4
      );

      if (destroyed) {
        // Handle destruction - source is 'bomb'
        this.handleAlienDestroyed(alien, j, "bomb");
      }
    }
  }

  // --- Game State & Progression ---

  addScore(amount) {
    if (!this.running || amount <= 0) return; // Ignore if not running or zero amount

    this.score += amount;
    this.uiManager.updateScore(this.score); // Update total score UI

    // Check for ability unlocks based on the player's *current life score*
    const previouslyUnlockedCount = this.abilityManager.unlockedAbilities.size;
    this.abilityManager.checkUnlocks(this.player.currentLifeScore); // Check unlocks
    const newlyUnlockedCount = this.abilityManager.unlockedAbilities.size;

    // If an ability was just unlocked, play the sound
    if (newlyUnlockedCount > previouslyUnlockedCount) {
      this.audioManager.playSound("unlock");
      console.log("Ability Unlocked - Sound Played");
    }

    // Update unlock bar UI based on player's current life score
    this.uiManager.updateUnlockBar(
      this.player.currentLifeScore,
      this.abilityManager.unlockedAbilities
    );
  }

  checkLevelUp() {
    // Calculate score needed for next level
    const scoreNeeded =
      GAME_CONFIG.levelScoreBase *
      Math.pow(this.level, GAME_CONFIG.levelScoreExponent);

    if (this.score >= scoreNeeded) {
      this.level++;
      this.uiManager.updateLevel(this.level);
      this.uiManager.showLevelUpMessage(this.level); // Display "LEVEL X" message
      this.audioManager.playSound("levelUp"); // Play level up sound

      // Increase difficulty: Adjust alien stats/spawning for the new level
      const config = GAME_CONFIG.aliens;
      this.alienSpawnInterval = Math.max(
        GAME_CONFIG.aliens.initialSpawnInterval *
          Math.pow(config.levelSpawnIntervalMultiplier, this.level - 1),
        GAME_CONFIG.aliens.initialSpawnInterval *
          config.levelSpawnIntervalMinFactor // Minimum interval cap
      );
      this.alienBaseSpeed = Math.min(
        GAME_CONFIG.aliens.initialSpeed *
          Math.pow(config.levelSpeedMultiplier, this.level - 1),
        GAME_CONFIG.aliens.initialSpeed / config.levelSpeedMinFactor // Maximum speed cap (minFactor applied as divisor)
      );
      this.alienBaseHealth =
        GAME_CONFIG.aliens.initialHealth *
        Math.pow(config.levelHealthMultiplier, this.level - 1);

      this.minAliensOnScreen = Math.floor(
        config.minOnScreenBase + (this.level - 1) * config.minOnScreenLevelScale
      );

      console.log(`Level Up! Reached Level ${this.level}.`);
      console.log(` - Spawn Interval: ${this.alienSpawnInterval.toFixed(0)}ms`);
      console.log(` - Base Speed: ${this.alienBaseSpeed.toFixed(2)}`);
      console.log(` - Base Health: ${this.alienBaseHealth.toFixed(2)}`);
      console.log(` - Min Aliens: ${this.minAliensOnScreen}`);
    }
  }

  activateAbility(key) {
    if (!this.abilityManager.isReady(key)) {
      // console.log(`Ability ${key} not ready or locked.`);
      return; // Do nothing if not ready/unlocked
    }

    let activated = false; // Flag to track if activation succeeded

    // Attempt to activate via AbilityManager (checks cooldowns, sets state)
    if (this.abilityManager.activate(key)) {
      // If activation successful, perform game action
      switch (key) {
        case "rocket":
          // Create rocket entity starting from player center
          this.rockets.push(
            new Rocket(this.player.getCenterX(), this.player.getCenterY())
          );
          activated = true;
          break;
        case "wingman":
          this.spawnWingmen(); // Handle spawning logic
          activated = true;
          break;
        case "miniShip":
          this.spawnMiniShips(); // Handle spawning logic
          activated = true;
          break;
        // Note: bulletMode is handled separately by togglePlayerBulletMode
      }

      // Play activation sound only if successful
      if (activated) {
        this.audioManager.playSound("abilityActivate", { abilityKey: key });
        console.log(`Ability Activated: ${key}`);
      }
    } else {
      console.log(`Failed to activate ability ${key} via AbilityManager.`);
    }
  }

  togglePlayerBulletMode() {
    // Perform the mode switch and stat reset on the player object
    const newMode = this.player.toggleBulletMode(this);

    // Update the UI icon state via AbilityManager/UIManager
    this.abilityManager.updateBulletModeVisuals(newMode);

    // Trigger visual feedback on the icon
    this.abilityManager.triggerVisualFeedback("bulletMode");

    // Create particle effect for visual feedback
    this.particleManager.createPowerUpEffect(
      this.player.getCenterX(),
      this.player.getCenterY(),
      newMode
    );

    // Play a sound effect for weapon swap?
    this.audioManager.playSound("abilityActivate", {
      abilityKey: "bulletMode",
    }); // Use a generic sound maybe?

    console.log(`Bullet mode swapped to ${newMode}, power reset.`);
  }

  checkActiveAbilities() {
    // Check Wingmen duration - remove if timer expired in AbilityManager
    if (this.wingmen.length > 0 && !this.abilityManager.isActive("wingman")) {
      console.log("Wingman duration ended.");
      // Add visual effect for removal
      this.particleManager.createExplosion(
        this.player.getCenterX(),
        this.player.getCenterY(),
        GAME_CONFIG.wingman.color,
        1.0
      );
      this.wingmen = []; // Remove wingmen entities
    }

    // Check MiniShips duration - remove if timer expired
    if (
      this.miniShips.length > 0 &&
      !this.abilityManager.isActive("miniShip")
    ) {
      console.log("MiniShip duration ended.");
      // Add visual effect
      this.particleManager.createExplosion(
        this.player.getCenterX(),
        this.player.getCenterY(),
        GAME_CONFIG.miniShip.color,
        1.2
      );
      this.miniShips = []; // Remove miniship entities
    }
  }

  // --- Drawing ---

  draw() {
    // Clear canvas (or draw background)
    // drawStarfield handles the background drawing
    drawStarfield(this.ctx);

    // Draw Entities (order matters for layering)
    this.drawEntities(this.aliens);
    this.drawEntities(this.items); // Items below player/bullets
    this.drawEntities(this.rockets);
    this.drawEntities(this.wingmen);
    this.drawEntities(this.miniShips);

    // Draw Player
    if (this.player.active) {
      this.player.draw(this.ctx);
    }

    // Draw Bullets (on top of most things)
    this.drawEntities(this.bullets);

    // Draw Particles (usually drawn last, on top of everything)
    this.particleManager.draw(this.ctx);

    // Note: UI is handled by HTML/CSS elements outside the canvas
  }

  // Helper function to draw a list of entities and add particle trails
  drawEntities(entities) {
    for (const entity of entities) {
      if (entity.active) {
        entity.draw(this.ctx);

        // Add particle effects specific to entity types during draw phase
        if (entity instanceof Bullet) {
          if (entity.owner === "player") {
            this.particleManager.createBulletTrail(
              entity.getCenterX(),
              entity.y + entity.height,
              entity.color
            );
          } else if (entity.owner === "miniShip") {
            this.particleManager.createMiniRocketTrail(
              entity.getCenterX(),
              entity.getCenterY(),
              entity.config.trailColor || entity.color
            );
          }
          // Add trail for alien bullets?
        } else if (entity instanceof Rocket) {
          // Rocket flame comes from the bottom center
          this.particleManager.createRocketFlame(
            entity.getCenterX(),
            entity.y + entity.height
          );
        }
        // Add engine trail for player? (Can be done here or in Player.draw)
        // if (entity instanceof Player && !entity.invincible) {
        //    this.particleManager.createEngineTrail(entity.getCenterX(), entity.y + entity.height*0.7, entity.width);
        // }
      }
    }
  }

  // --- Utility & High Scores ---

  handleResize() {
    console.log("Resizing window...");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // Reinitialize starfield for new dimensions
    initStarfield(this.width, this.height);
    // Adjust player position if needed (e.g., keep Y offset)
    if (this.player) {
      this.player.y =
        this.height -
        GAME_CONFIG.player.initialYOffset -
        this.player.height / 2;
      // Clamp X in case resize made it invalid
      this.player.x = clamp(this.player.x, 0, this.width - this.player.width);
      this.player.targetX = this.player.getCenterX(); // Update target
    }
    // Redraw immediately after resize? Optional. Loop will handle it.
    if (this.running && !this.paused) {
      this.draw();
    }
  }

  loadHighScores() {
    try {
      const scoresJSON = localStorage.getItem(
        GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY
      );
      const scores = scoresJSON ? JSON.parse(scoresJSON) : [];
      // Ensure scores are numbers and sort descending, limit to top 5
      return scores
        .map(Number) // Convert to numbers
        .filter((score) => !isNaN(score) && score >= 0) // Filter out NaN/invalid
        .sort((a, b) => b - a) // Sort descending
        .slice(0, 5); // Keep top 5
    } catch (e) {
      console.error("Error loading high scores:", e);
      localStorage.removeItem(GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY); // Clear invalid data
      return [];
    }
  }

  saveHighScore(newScore) {
    if (newScore <= 0 || isNaN(newScore)) return; // Ignore invalid scores

    let scores = this.loadHighScores(); // Get current valid scores
    scores.push(newScore); // Add the new score
    scores = scores.sort((a, b) => b - a).slice(0, 5); // Re-sort and keep top 5

    try {
      localStorage.setItem(
        GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY,
        JSON.stringify(scores)
      );
    } catch (e) {
      console.error("Error saving high scores:", e);
    }
  }

  // --- Getters for state ---
  isRunning() {
    return this.running;
  }
  isPaused() {
    return this.paused;
  }
}
