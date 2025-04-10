// js/entities.js

// --- Base Class (No Change) ---
class Entity {
  /* ... */
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.active = true;
  }
  isOffscreen(canvasWidth, canvasHeight, margin = 50) {
    return (
      this.x < -margin ||
      this.x > canvasWidth + margin ||
      this.y < -margin ||
      this.y > canvasHeight + margin + this.height
    );
  }
  getCenterX() {
    return this.x + this.width / 2;
  }
  getCenterY() {
    return this.y + this.height / 2;
  }
}

// --- Player Class (Updated) ---
class Player extends Entity {
  /* ... */
  constructor(canvasWidth, canvasHeight) {
    const config = GAME_CONFIG.player;
    super(
      canvasWidth / 2,
      canvasHeight - config.initialYOffset,
      config.width,
      config.height,
      config.color
    );
    this.baseSpeed = config.baseSpeed;
    this.speed = this.baseSpeed;
    this.initialLives = config.initialLives;
    this.lives = this.initialLives;
    this.maxLives = config.maxLives;
    this.targetX = this.x;
    this.targetY = this.y; // Initialize target Y position
    this.lastShotTime = 0;
    this.shootDelay = config.shootDelay;
    this.autoFire = true;

    // Track power levels separately for spread and parallel modes
    this.bulletMode = "spread";
    this.spreadPowerLevel = 1;
    this.parallelPowerLevel = 1;
    this.spreadKills = 0;
    this.parallelKills = 0;

    // Get the active power level based on current mode
    this.bulletPowerLevel = 1;

    this.maxReachedPower = 1;
    this.currentLifeScore = 0;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.invincibilityDuration = GAME_CONFIG.INVINCIBILITY_DURATION;

    // Vertical movement constraints
    this.minY = canvasHeight - config.initialYOffset * 1.5; // Higher is more restricted
    this.maxY = canvasHeight - config.initialYOffset * 0.5; // Lower is more restricted
  }

  update(deltaTime, canvasWidth) {
    if (this.invincible) {
      this.invincibilityTimer -= deltaTime;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
        this.invincibilityTimer = 0;
      }
    }

    // X-axis movement
    const dx = this.targetX - this.x;
    this.speed = this.baseSpeed;
    this.x += dx * 0.15;
    this.x = clamp(this.x, this.width / 2, canvasWidth - this.width / 2);

    // Y-axis movement (limited range)
    // Allow movement only within the defined range near the bottom of the screen
    const targetY = clamp(this.targetY, this.minY, this.maxY);
    const dy = targetY - this.y;
    // Use a smaller factor for Y movement to make it more subtle
    this.y += dy * 0.05;
    this.y = clamp(this.y, this.minY, this.maxY);
  }

  draw(ctx) {
    drawPlayerFromBuffer(ctx, this);
  }

  canShoot(currentTime) {
    return currentTime - this.lastShotTime >= this.shootDelay;
  }
  recordShot(currentTime) {
    this.lastShotTime = currentTime;
  }
  addScore(amount, game) {
    this.currentLifeScore += amount;
    game.addScore(amount);
  }
  increaseKillCount(game) {
    if (this.bulletMode === "spread") {
      this.spreadKills++;

      // Calculate how many kills needed for next level using exponential formula
      const currentLevelKillsNeeded = Math.floor(
        GAME_CONFIG.killsPerPowerUp *
        Math.pow(GAME_CONFIG.powerLevelExponent, this.spreadPowerLevel - 1)
      );

      // Check if we have enough kills for next level
      if (this.spreadKills >= currentLevelKillsNeeded && this.spreadPowerLevel < GAME_CONFIG.maxBulletPowerLevel) {
        this.spreadPowerLevel++;
        this.spreadKills = 0; // Reset kills counter for next level
        this.maxReachedPower = Math.max(
          this.maxReachedPower,
          this.spreadPowerLevel
        );
        game.particleManager.createPowerUpEffect(this.x, this.y, this.bulletMode);
        game.uiManager.updateBulletPower(
          this.spreadPowerLevel,
          0,
          this.spreadPowerLevel === GAME_CONFIG.maxBulletPowerLevel
        );
      } else {
        // Update progress bar
        game.uiManager.updateBulletPower(
          this.spreadPowerLevel,
          this.spreadKills,
          false,
          currentLevelKillsNeeded // Pass the required kills for current level
        );
      }
    } else if (this.bulletMode === "parallel") {
      this.parallelKills++;

      // Calculate how many kills needed for next level using exponential formula
      const currentLevelKillsNeeded = Math.floor(
        GAME_CONFIG.killsPerPowerUp *
        Math.pow(GAME_CONFIG.powerLevelExponent, this.parallelPowerLevel - 1)
      );

      // Check if we have enough kills for next level
      if (this.parallelKills >= currentLevelKillsNeeded && this.parallelPowerLevel < GAME_CONFIG.maxBulletPowerLevel) {
        this.parallelPowerLevel++;
        this.parallelKills = 0; // Reset kills counter for next level
        this.maxReachedPower = Math.max(
          this.maxReachedPower,
          this.parallelPowerLevel
        );
        game.particleManager.createPowerUpEffect(this.x, this.y, this.bulletMode);
        game.uiManager.updateBulletPower(
          this.parallelPowerLevel,
          0,
          this.parallelPowerLevel === GAME_CONFIG.maxBulletPowerLevel
        );
      } else {
        // Update progress bar
        game.uiManager.updateBulletPower(
          this.parallelPowerLevel,
          this.parallelKills,
          false,
          currentLevelKillsNeeded // Pass the required kills for current level
        );
      }
    }
  }
  toggleBulletMode(game) {
    this.bulletMode = this.bulletMode === "spread" ? "parallel" : "spread";
    this.bulletPowerLevel = this.bulletMode === "spread" ? this.spreadPowerLevel : this.parallelPowerLevel;
    // Don't reset bullet power level when changing modes
    game.uiManager.updateBulletPower(this.bulletPowerLevel, this.bulletMode === "spread" ? this.spreadKills : this.parallelKills % GAME_CONFIG.killsPerPowerUp,
      this.bulletPowerLevel === GAME_CONFIG.maxBulletPowerLevel);
    return this.bulletMode;
  }
  loseLife(game) {
    if (this.invincible) return true;

    this.lives--;
    this.currentLifeScore = 0;

    // --- Bug Fix: Reduce Kill Count instead of resetting power ---
    const killsPerLevel = GAME_CONFIG.killsPerPowerUp;
    const penalty = Math.floor(killsPerLevel / 3); // Lose 1/3 of a level's worth of kills

    if (this.bulletMode === "spread") {
      // Calculate kills required for current level
      const killsRequiredForCurrentLevel = (this.spreadPowerLevel - 1) * killsPerLevel;
      // Reduce kills, but don't drop below current level's start
      this.spreadKills = Math.max(0, this.spreadKills - penalty);
      // Update UI with correct progress
      const isMax = this.spreadPowerLevel === GAME_CONFIG.maxBulletPowerLevel;
      game.uiManager.updateBulletPower(this.spreadPowerLevel, this.spreadKills, isMax);
    } else {
      // Same for parallel mode
      const killsRequiredForCurrentLevel = (this.parallelPowerLevel - 1) * killsPerLevel;
      this.parallelKills = Math.max(0, this.parallelKills - penalty);
      const isMax = this.parallelPowerLevel === GAME_CONFIG.maxBulletPowerLevel;
      game.uiManager.updateBulletPower(this.parallelPowerLevel, this.parallelKills, isMax);
    }

    game.abilityManager.resetUnlocksOnDeath();

    if (this.lives > 0) {
      this.becomeInvincible();
    }
    return this.lives > 0;
  }
  gainLife() {
    if (this.lives < this.maxLives) {
      this.lives++;
      return true;
    }
    return false;
  }
  becomeInvincible() {
    this.invincible = true;
    this.invincibilityTimer = this.invincibilityDuration;
  }
  resetForNewGame(canvasWidth, canvasHeight) {
    const config = GAME_CONFIG.player;
    this.x = canvasWidth / 2;
    this.y = canvasHeight - config.initialYOffset;
    this.targetX = this.x;
    this.targetY = this.y; // Reset target Y position
    this.minY = canvasHeight - config.initialYOffset * 1.5; // Reset min Y
    this.maxY = canvasHeight - config.initialYOffset * 0.5; // Reset max Y
    this.lives = this.initialLives;
    this.spreadPowerLevel = 1;
    this.parallelPowerLevel = 1;
    this.spreadKills = 0;
    this.parallelKills = 0;
    this.maxReachedPower = 1;
    this.bulletMode = "spread";
    this.autoFire = true;
    this.lastShotTime = 0;
    this.currentLifeScore = 0;
    this.invincible = false;
    this.invincibilityTimer = 0;
  }

  resetAfterDeath(canvasWidth, canvasHeight) {
    const config = GAME_CONFIG.player;
    this.x = canvasWidth / 2;
    this.y = canvasHeight - config.initialYOffset;
    this.targetX = this.x;
    this.targetY = this.y; // Reset target Y position

    // No longer reset power levels here - they're reduced in loseLife() method
    // The bullet kills are still reset
    this.spreadKills = 0;
    this.parallelKills = 0;

    // currentLifeScore is modified in the handlePlayerHit method to reduce by 1/3
    this.lastShotTime = 0;
    this.becomeInvincible();
  }
}

// --- Bullet Class --- (Add seeking behavior for MiniShip Rockets)
class Bullet extends Entity {
  constructor(
    x,
    y,
    config,
    speedX = 0,
    speedY,
    damage,
    owner = "player",
    target = null
  ) {
    // Added owner & optional target
    super(x - config.width / 2, y, config.width, config.height, config.color);
    this.speedX = speedX;
    this.speedY = speedY;
    this.damage = damage;
    this.owner = owner;
    this.config = config; // Store config for properties like turnRate

    // Homing properties
    this.isHoming = owner === "miniShip"; // Only miniship rockets home
    this.target = target; // The alien entity to home towards
    this.turnRate = config.turnRate || 0; // Radians per update step (approx)
  }

  update(deltaTime, gameRef) {
    // Needs gameRef potentially to find new targets?
    const speedFactor = deltaTime / 16.67;

    if (this.isHoming) {
      if (this.target && this.target.active) {
        // Calculate direction to target
        const targetX = this.target.getCenterX();
        const targetY = this.target.getCenterY();
        const desiredAngle = Math.atan2(
          targetY - this.getCenterY(),
          targetX - this.getCenterX()
        );

        // Calculate current angle
        const currentAngle = Math.atan2(this.speedY, this.speedX);

        // Find the difference, handle wrap-around
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Clamp the turn rate
        const turnAmount = clamp(angleDiff, -this.turnRate, this.turnRate);

        // Apply the turn
        const newAngle = currentAngle + turnAmount;

        // Update velocity based on new angle and fixed speed
        const speed = this.config.speed;
        this.speedX = Math.cos(newAngle) * speed;
        this.speedY = Math.sin(newAngle) * speed;
      } else {
        // Target lost or destroyed, continue straight or find new?
        // For now, continue straight. Could add re-targeting logic here.
        this.isHoming = false; // Stop homing if target lost
      }
    }

    // Update position based on velocity
    this.x += this.speedX * speedFactor;
    this.y += this.speedY * speedFactor;
  }

  draw(ctx) {
    // Simple rect for now, could draw as small rocket shape
    drawRect(ctx, this.x, this.y, this.width, this.height, this.color);
  }
}

// --- Rocket Class (Updated with neighbor-based targeting and improved movement) ---
class Rocket extends Entity {
  constructor(x, y) {
    const config = GAME_CONFIG.rocket;
    super(x - config.width / 2, y, config.width, config.height, config.color);
    this.speedY = config.speedY;
    this.damage = config.damage;
    this.explosionRadius = config.explosionRadius;
    this.flameColor = config.flameColor;
    this.target = null;
    this.turnSpeed = config.turnRate;
    this.speed = Math.abs(config.speedY);
    this.currentAngle = -Math.PI / 2; // Start pointing up
  }

  update(deltaTime, aliens) {
    const speedFactor = deltaTime / 16.67;

    // Ensure the rocket always tries to find a target if it doesn't have one or if the current target is inactive
    if (!this.target || !this.target.active) {
      this.findBestTarget(aliens);
    }

    if (this.target) {
      const targetX = this.target.getCenterX();
      const targetY = this.target.getCenterY();
      const desiredAngle = Math.atan2(targetY - this.y, targetX - this.x);
      let angleDiff = desiredAngle - this.currentAngle;

      // Normalize angle difference
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Clamp turn rate
      const turnAmount = clamp(angleDiff, -this.turnSpeed * speedFactor, this.turnSpeed * speedFactor);
      this.currentAngle += turnAmount;
    }

    // Update position based on current angle and speed
    this.x += Math.cos(this.currentAngle) * this.speed * speedFactor;
    this.y += Math.sin(this.currentAngle) * this.speed * speedFactor;

    // Deactivate if offscreen
    if (this.y + this.height < 0) {
      this.active = false;
    }
  }

  findBestTarget(aliens) {
    if (!aliens || aliens.length === 0) return null;

    let bestTarget = null;
    let maxNeighbors = -1;
    const neighborRadius = 150;

    for (const alien of aliens) {
      if (!alien.active || alien.y < -alien.height || alien.y > this.y) continue;

      let neighborCount = 0;
      for (const otherAlien of aliens) {
        if (!otherAlien.active || otherAlien === alien) continue;
        const dx = alien.getCenterX() - otherAlien.getCenterX();
        const dy = alien.getCenterY() - otherAlien.getCenterY();
        if (dx * dx + dy * dy < neighborRadius * neighborRadius) {
          neighborCount++;
        }
      }

      if (neighborCount > maxNeighbors) {
        maxNeighbors = neighborCount;
        bestTarget = alien;
      }
    }

    this.target = bestTarget;
    return bestTarget;
  }

  shouldExplode() {
    // Explode if the rocket is close to its target
    if (this.target) {
      const dx = this.getCenterX() - this.target.getCenterX();
      const dy = this.getCenterY() - this.target.getCenterY();
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= this.explosionRadius * this.explosionRadius;
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.getCenterX(), this.getCenterY());
    ctx.rotate(this.currentAngle + Math.PI / 2);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    // Add rocket nose cone
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2 - 5);
    ctx.lineTo(-this.width / 2, -this.height / 2);
    ctx.lineTo(this.width / 2, -this.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// --- Alien Class (No Change) ---
class Alien extends Entity {
  /* ... */
  constructor(
    x,
    y,
    width,
    height,
    speed,
    health,
    points,
    color,
    type,
    typeConfig,
    gameRef
  ) {
    super(x, y, width, height, color);
    this.speed = speed;
    this.health = health;
    this.maxHealth = health;
    this.points = points;
    this.alienType = type;
    this.typeConfig = typeConfig;
    this.gameRef = gameRef;
    this.state = "descending";
    this.stateTimer = 0;
    this.shootCooldown = 0;
  }
  update(deltaTime, canvasHeight, player) {
    const speedFactor = deltaTime / 16.67;
    this.stateTimer -= deltaTime;
    this.shootCooldown -= deltaTime;
    switch (this.alienType) {
      case "scout":
        this.y += this.speed * speedFactor;
        break;
      case "fighter":
      case "elite":
        switch (this.state) {
          case "descending":
            this.y += this.speed * speedFactor;
            const hoverY =
              canvasHeight * (this.typeConfig.hoverYThreshold || 0.15);
            if (this.y >= hoverY) {
              this.state = "hovering";
              this.stateTimer = this.typeConfig.hoverDuration || 3000;
              this.y = hoverY;
            }
            break;
          case "hovering":
            this.x +=
              Math.sin(performance.now() * 0.001 + this.y) * 0.5 * speedFactor;
            if (this.stateTimer <= 0) {
              this.state = "attacking";
              this.shootCooldown = 0;
            }
            break;
          case "attacking":
            if (this.shootCooldown <= 0) {
              this.shoot(player);
              this.shootCooldown = this.typeConfig.shootDelay || 1500;
            }
            break;
        }
        break;
    }
    this.x = clamp(this.x, 0, this.gameRef.width - this.width);
  }
  shoot(player) {
    if (!this.gameRef || !player) return;
    let bulletConfig = GAME_CONFIG.bullets.alienFighter;
    let bulletSpeed = bulletConfig.speed;
    if (this.alienType === "elite") {
      bulletSpeed *= this.typeConfig.bulletSpeedMultiplier || 1.0;
    }
    const targetX = player.getCenterX();
    const targetY = player.getCenterY();
    const startX = this.getCenterX();
    const startY = this.getCenterY();
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speedX = Math.cos(angle) * bulletSpeed;
    const speedY = Math.sin(angle) * bulletSpeed;
    this.gameRef.addAlienBullet(startX, startY, speedX, speedY, bulletConfig);
  }
  draw(ctx) {
    if (this.alienType === "fighter") this.drawFighter(ctx);
    else if (this.alienType === "elite") this.drawElite(ctx);
    else this.drawScout(ctx);
    const barConfig = GAME_CONFIG.aliens;
    drawHealthBar(
      ctx,
      this.x,
      this.y - barConfig.healthBarYOffset,
      this.width,
      barConfig.healthBarHeight,
      this.health,
      this.maxHealth
    );
  }
  drawScout(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(
      this.getCenterX(),
      this.getCenterY(),
      this.width / 2,
      this.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(
      this.getCenterX(),
      this.y + this.height / 3,
      this.width / 4,
      this.height / 4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  drawFighter(ctx) {
    drawGenericShip(
      ctx,
      this.getCenterX(),
      this.getCenterY(),
      this.width,
      this.height,
      this.color,
      "rgba(255, 100, 100, 0.3)",
      "rgba(255, 50, 50, 0.4)"
    );
  }
  drawElite(ctx) {
    ctx.fillStyle = this.color;
    const centerX = this.getCenterX();
    const centerY = this.getCenterY();
    const w2 = this.width / 2;
    const h2 = this.height / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - h2);
    ctx.lineTo(centerX + w2, centerY);
    ctx.lineTo(centerX, centerY + h2);
    ctx.lineTo(centerX - w2, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 0, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, w2 * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(centerX - w2 * 0.9, centerY - h2 * 0.2, w2 * 0.4, h2 * 0.4);
    ctx.fillRect(centerX + w2 * 0.5, centerY - h2 * 0.2, w2 * 0.4, h2 * 0.4);
  }
  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
  shouldDropItem() {
    return Math.random() < (this.typeConfig.dropChance || 0.05);
  }
}

// --- Particle Class (Add gravity for text bounce) ---
class Particle extends Entity {
  constructor(x, y, config) {
    const radius = config.radius || 0;
    super(x - radius, y - radius, radius * 2, radius * 2, config.color);
    this.radius = radius;
    this.speedX = config.speedX || 0;
    this.speedY = config.speedY || 0;
    this.initialLife = config.life || 1;
    this.life = config.life || 1;
    // this.decay = config.decay || 0.9; // Using linear time decay now
    this.alpha = 1.0;

    this.isText = config.isText || false;
    this.text = config.text || "";
    this.fontSize = config.fontSize || 12;
    this.gravity = config.gravity || 0; // Add gravity property
  }

  update(deltaTime) {
    const speedFactor = deltaTime / 16.67;

    // Apply gravity if specified (for bounce effect)
    if (this.gravity !== 0) {
      this.speedY += this.gravity * speedFactor;
    }

    this.x += this.speedX * speedFactor;
    this.y += this.speedY * speedFactor;
    this.life -= deltaTime;

    this.alpha = clamp(this.life / (this.initialLife * 0.6), 0, 1); // Faster fade

    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.globalAlpha = this.alpha;
    if (this.isText) {
      drawText(
        ctx,
        this.text,
        this.x + this.radius,
        this.y + this.radius,
        this.color,
        this.fontSize
      ); // Draw centered
    } else {
      drawCircle(
        ctx,
        this.x + this.radius,
        this.y + this.radius,
        this.radius,
        this.color
      );
    }
    ctx.globalAlpha = 1.0;
  }
}

// --- Debris Class (No Change) ---
class Debris extends Particle {
  /* ... */
  constructor(x, y, config) {
    super(x, y, {
      radius: Math.max(config.width, config.height) / 2,
      color: config.color,
      speedX: config.speedX,
      speedY: config.speedY,
      life: config.life,
      decay: config.decay || 0.99,
    });
    this.width = config.width;
    this.height = config.height;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = config.rotationSpeed;
    this.damage = config.damage;
    this.isText = false;
  }
  update(deltaTime) {
    super.update(deltaTime);
    this.rotation += this.rotationSpeed * (deltaTime / 16.67);
  }
  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

// --- Wingman Class ---
class Wingman extends Entity {
  constructor(playerX, playerY, offsetX) {
    const config = GAME_CONFIG.wingman;
    super(
      playerX + offsetX,
      playerY + config.offsetY,
      config.width,
      config.height,
      config.color
    );
    this.offsetX = offsetX;
    this.offsetY = config.offsetY;
    this.targetX = this.x;
    this.targetY = this.y;
    this.followLerpFactor = config.followLerpFactor;
    this.lastShotTime = 0;
    this.shootDelay = config.shootDelay || 800;
    this.cockpitColor = config.cockpitColor;
    this.engineColor = config.engineColor;
  }

  update(deltaTime, player, aliens, game) {
    this.targetX = player.x + this.offsetX;
    this.targetY = player.y + this.offsetY;
    this.x += (this.targetX - this.x) * this.followLerpFactor;
    this.y += (this.targetY - this.y) * this.followLerpFactor;

    // Add shooting logic for wingmen
    const currentTime = performance.now();
    if (currentTime - this.lastShotTime >= this.shootDelay) {
      // Find potential targets (nearby active aliens)
      const potentialTargets = aliens.filter((a) => a.active && a.y > 0);
      if (potentialTargets.length > 0) {
        // Simple firing logic - straight line shots
        const bulletConfig = GAME_CONFIG.bullets.player;
        game.bullets.push(
          new Bullet(
            this.getCenterX(),
            this.y - this.height / 2,
            { ...bulletConfig, color: this.color },
            0,
            bulletConfig.speedY,
            bulletConfig.baseDamageMultiplier,
            "wingman"
          )
        );
        this.lastShotTime = currentTime;

        // Create muzzle flash effect
        game.particleManager.createMuzzleFlash(
          this.getCenterX(),
          this.y - this.height / 2,
          this.color
        );
      }
    }
  }

  draw(ctx) {
    drawGenericShip(
      ctx,
      this.getCenterX(),
      this.getCenterY(),
      this.width,
      this.height,
      this.color,
      this.cockpitColor,
      this.engineColor
    );
  }
}

// --- MiniShip Class (Implement Shooting) ---
class MiniShip extends Entity {
  constructor(playerX, playerY, index) {
    const config = GAME_CONFIG.miniShip;
    const initialOffsetX =
      (index - Math.floor(GAME_CONFIG.miniShip.count / 2)) *
      config.spreadOffset;
    super(
      playerX + initialOffsetX,
      playerY,
      config.width,
      config.height,
      config.color
    );
    this.followLerpFactor = config.followLerpFactor;
    this.lastShotTime = 0; // Timestamp of the last shot
    this.shootDelay = config.shootDelay; // Cooldown between shots
    this.targetAlien = null; // Current primary target
    this.cockpitColor = config.cockpitColor;
    this.engineColor = config.engineColor;
    this.returnOffsetY = config.returnOffsetY;
    this.index = index; // Store index for potential targeting coordination
  }

  update(deltaTime, player, aliens, game) {
    // Movement Logic - Always stay in formation with player, don't chase enemies
    const targetX =
      player.x +
      (this.index - Math.floor(GAME_CONFIG.miniShip.count / 2)) *
      GAME_CONFIG.miniShip.spreadOffset *
      0.8; // Formation position
    const targetY = player.y - this.returnOffsetY;

    // Move toward formation position
    this.x += (targetX - this.x) * this.followLerpFactor;
    this.y += (targetY - this.y) * this.followLerpFactor;

    // Find target for shooting, not for movement
    this.findTarget(aliens);

    // --- Shooting Logic ---
    const currentTime = performance.now();
    if (currentTime - this.lastShotTime >= this.shootDelay) {
      // Find potential targets (nearby active aliens)
      const potentialTargets = aliens.filter((a) => a.active && a.y > 0); // Consider only active aliens on screen
      if (potentialTargets.length > 0) {
        // Sort targets by distance (closest first) or some other priority
        potentialTargets.sort((a, b) => distance(this, a) - distance(this, b));

        // Fire a burst (currently just 1 rocket) at the closest target
        const target = potentialTargets[0]; // Shoot closest
        game.shootMiniShipRocket(this, target);
        this.lastShotTime = currentTime; // Reset cooldown after firing
      }
    }
  }

  findTarget(aliens) {
    // Simple targeting: if current target is dead or inactive, find a new one (closest?)
    if (!this.targetAlien || !this.targetAlien.active) {
      this.targetAlien = findClosestEntity(
        this,
        aliens.filter((a) => a.active && a.y > -a.height)
      ); // Find closest active on-screen
    }
  }

  draw(ctx) {
    drawGenericShip(
      ctx,
      this.getCenterX(),
      this.getCenterY(),
      this.width,
      this.height,
      this.color,
      this.cockpitColor,
      this.engineColor
    );
  }
}

// --- Item Class (Updated to handle abilities) ---
class Item extends Entity {
  constructor(x, y, type, value = 0) {
    const config = GAME_CONFIG.items;
    super(
      x - config.size / 2,
      y - config.size / 2,
      config.size,
      config.size,
      "white"
    );
    this.itemType = type;
    this.value = value;
    this.speedY = config.dropSpeedY;
  }
  update(deltaTime) {
    this.y += this.speedY * (deltaTime / 16.67);
  }
  draw(ctx) {
    drawItem(ctx, this);
  }
  applyEffect(player, game) {
    switch (this.itemType) {
      case "xp":
        player.addScore(this.value, game);
        game.particleManager.createXpIndicator(
          this.getCenterX(),
          this.getCenterY(),
          `+${this.value}`
        );
        break;
      case "life":
        if (player.gainLife()) {
          game.uiManager.updateLives(player.lives);
          game.particleManager.createXpIndicator(
            this.getCenterX(),
            this.getCenterY(),
            "+1 Life",
            "#ffaaaa"
          );
        } else {
          player.addScore(500, game);
          game.particleManager.createXpIndicator(
            this.getCenterX(),
            this.getCenterY(),
            "+500 (Max Lives)",
            "#ffdddd"
          );
        }
        break;
      case "bomb":
        game.activateBomb(this.getCenterX(), this.getCenterY());
        break;
      // Handle ability item pickups
      case "rocket":
      case "wingman":
      case "miniShip":
        // Unlock the ability and immediately activate it
        if (game.abilityManager.unlockAbility(this.itemType)) {
          game.particleManager.createXpIndicator(
            this.getCenterX(),
            this.getCenterY(),
            `+${this.itemType}`,
            "#aaffaa"
          );
          // Automatically activate the ability
          game.activateAbility(this.itemType);
        } else {
          // If already unlocked, just add some score
          player.addScore(250, game);
          game.particleManager.createXpIndicator(
            this.getCenterX(),
            this.getCenterY(),
            "+250 (Already Unlocked)",
            "#ffffaa"
          );
        }
        break;
    }
  }
}

// --- Particle Manager (Update XP Indicator, Add MiniRocket Trail) ---
class ParticleManager {
  constructor() {
    this.particles = [];
    this.debris = [];
  }

  createParticle(x, y, config) {
    this.particles.push(new Particle(x, y, config));
  }
  createDebrisPiece(x, y, config) {
    this.debris.push(new Debris(x, y, config));
  }

  // --- Effect Creation Methods ---
  createExplosion(x, y, color, size) {
    const particleCount = Math.max(
      5,
      Math.floor(size * GAME_CONFIG.particles.explosionFactor)
    );
    const pConfig = GAME_CONFIG.particles;
    for (let i = 0; i < particleCount; i++) {
      this.createParticle(x, y, {
        radius: getRandom(2, 6),
        color: color,
        speedX: getRandom(-3, 3),
        speedY: getRandom(-3, 3),
        life: getRandom(pConfig.baseLife, pConfig.baseLife + pConfig.lifeRange),
      });
    }
    if (size > 15) this.createShockwave(x, y);
  }
  createShockwave(x, y) {
    const pConfig = GAME_CONFIG.particles;
    for (let i = 0; i < pConfig.shockwaveCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = pConfig.shockwaveSpeedFactor * 0.5;
      this.createParticle(x, y, {
        radius: getRandom(
          pConfig.shockwaveMinRadius,
          pConfig.shockwaveMinRadius + pConfig.shockwaveRadiusRange
        ),
        color: "rgba(255, 255, 255, 0.7)",
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        life: pConfig.shockwaveLife,
      });
    }
  }
  createMuzzleFlash(x, y, color, directionAngle = -Math.PI / 2) {
    const count = GAME_CONFIG.particles.muzzleFlashCount;
    for (let i = 0; i < count; i++) {
      const speed = getRandom(1, 4);
      const angle = directionAngle + getRandom(-0.5, 0.5);
      this.createParticle(x, y, {
        radius: getRandom(2, 5),
        color: color,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        life: getRandom(15, 25) * 16,
      });
    }
  }
  createBulletTrail(x, y, color) {
    const count = GAME_CONFIG.particles.bulletTrailCount;
    for (let i = 0; i < count; i++) {
      this.createParticle(x, y, {
        radius: getRandom(1, 3),
        color: color,
        speedX: 0,
        speedY: getRandom(0, 1),
        life: getRandom(8, 15) * 16,
      });
    }
  }
  createRocketFlame(x, y) {
    const rConfig = GAME_CONFIG.rocket;
    if (Math.random() > 0.3) {
      this.createParticle(
        x + getRandom(-rConfig.width / 4, rConfig.width / 4),
        y,
        {
          radius: getRandom(3, 7),
          color: rConfig.flameColor,
          speedX: getRandom(-1, 1),
          speedY: getRandom(2, 5),
          life: getRandom(10, 20) * 16,
        }
      );
    }
  }
  createEngineTrail(x, y, width) {
    const count = GAME_CONFIG.particles.engineTrailCount;
    const pConfig = GAME_CONFIG.player;
    for (let i = 0; i < count; i++) {
      this.createParticle(x + getRandom(-width / 4, width / 4), y, {
        radius: getRandom(1, 4),
        color: pConfig.engineColor.replace(/,\s*[\d.]+\)$/, ", 0.5)"),
        speedX: getRandom(-1, 1),
        speedY: getRandom(1, 4),
        life: getRandom(15, 25) * 16,
      });
    }
  }
  createAlienDebris(alien) {
    const dConfig = GAME_CONFIG.particles;
    const count = Math.max(
      1,
      Math.floor(alien.width * dConfig.debrisCountFactor)
    );
    for (let i = 0; i < count; i++) {
      this.createDebrisPiece(alien.getCenterX(), alien.getCenterY(), {
        width: getRandom(
          dConfig.debrisSizeMin,
          dConfig.debrisSizeMin + dConfig.debrisSizeRange
        ),
        height: getRandom(
          dConfig.debrisSizeMin,
          dConfig.debrisSizeMin + dConfig.debrisSizeRange
        ),
        color: alien.color,
        speedX: getRandom(
          -dConfig.debrisSpeedFactor / 2,
          dConfig.debrisSpeedFactor / 2
        ),
        speedY: getRandom(
          -dConfig.debrisSpeedFactor / 2,
          dConfig.debrisSpeedFactor / 2
        ),
        life:
          getRandom(
            dConfig.debrisBaseLife,
            dConfig.debrisBaseLife + dConfig.debrisLifeRange
          ) * 16,
        rotationSpeed: getRandom(
          -dConfig.debrisRotationFactor,
          dConfig.debrisRotationFactor
        ),
        damage: dConfig.debrisDamage,
      });
    }
  }
  createPowerUpEffect(x, y, bulletMode) {
    const color =
      bulletMode === "spread"
        ? GAME_CONFIG.bullets.player.colorSpread
        : GAME_CONFIG.bullets.player.colorParallel;
    for (let i = 0; i < 30; i++) {
      this.createParticle(x, y, {
        radius: getRandom(5, 15),
        color: color,
        speedX: getRandom(-4, 4),
        speedY: getRandom(-4, 4),
        life: getRandom(25, 45) * 16,
      });
    }
  }

  // Update XP Indicator for bounce
  createXpIndicator(x, y, amountText, color = null) {
    const config = GAME_CONFIG.particles.xpIndicator;
    this.createParticle(x, y, {
      isText: true,
      text: amountText,
      color: color || config.color,
      speedX: getRandom(-0.3, 0.3), // Slight horizontal drift
      speedY: config.speedY, // Use configured initial upward speed
      life: config.life,
      fontSize: config.fontSize,
      gravity: config.gravity, // Add gravity for the bounce
    });
  }

  // NEW: Create trails for MiniShip rockets
  createMiniRocketTrail(x, y, color) {
    const tConfig = GAME_CONFIG.particles.miniRocketTrail;
    this.createParticle(x, y, {
      radius: getRandom(tConfig.radiusMin, tConfig.radiusMax),
      color: color,
      speedX: getRandom(-0.2, 0.2),
      speedY: tConfig.speedY,
      life: tConfig.life * getRandom(0.8, 1.2), // Vary life slightly
    });
  }

  // --- Update & Draw & Collision (No Change) ---
  update(deltaTime) {
    this.particles = this.particles.filter((p) => {
      p.update(deltaTime);
      return p.active;
    });
    this.debris = this.debris.filter((d) => {
      d.update(deltaTime);
      return d.active;
    });
  }
  draw(ctx) {
    for (const particle of this.particles) particle.draw(ctx);
    for (const deb of this.debris) deb.draw(ctx);
  }
  checkDebrisCollisions(aliens, game) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const piece = this.debris[i];
      if (!piece.active) continue;
      for (let j = aliens.length - 1; j >= 0; j--) {
        const alien = aliens[j];
        if (!alien.active) continue;
        if (checkCollision(piece, alien)) {
          const destroyed = alien.takeDamage(piece.damage);
          piece.active = false;
          if (destroyed) game.handleAlienDestroyed(alien, j, "debris");
          break;
        }
      }
    }
  }
  reset() {
    this.particles = [];
    this.debris = [];
  }
}


