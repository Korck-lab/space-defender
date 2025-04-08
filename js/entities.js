// js/entities.js

// --- Base Class ---
class Entity {
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
      this.x < -margin - this.width || // Check right edge against left border
      this.x > canvasWidth + margin || // Check left edge against right border
      this.y < -margin - this.height || // Check bottom edge against top border
      this.y > canvasHeight + margin // Check top edge against bottom border
    );
  }
  getCenterX() {
    return this.x + this.width / 2;
  }
  getCenterY() {
    return this.y + this.height / 2;
  }
}

// --- Player Class ---
class Player extends Entity {
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
    this.lastShotTime = 0;
    this.shootDelay = config.shootDelay;
    this.autoFire = true;
    this.bulletPowerLevel = 1;
    this.bulletMode = "spread";
    this.kills = 0;
    this.maxReachedPower = 1;
    this.currentLifeScore = 0;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.invincibilityDuration = GAME_CONFIG.INVINCIBILITY_DURATION;
  }
  update(deltaTime, canvasWidth) {
    // Update Invincibility Timer
    if (this.invincible) {
      this.invincibilityTimer -= deltaTime;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
        this.invincibilityTimer = 0;
        console.log("Player invincibility ended.");
      }
    }

    // Smooth Movement (Lerp)
    const currentCenterX = this.getCenterX();
    const dx = this.targetX - currentCenterX;
    // Adjust lerp factor based on distance? Or keep it simple.
    // 0.15 is a decent smooth factor. Higher = faster response.
    const moveAmount = dx * 0.15;
    this.x += moveAmount;

    // Clamp player position within screen bounds
    this.x = clamp(this.x, 0, canvasWidth - this.width);
  }

  draw(ctx) {
    // Use the buffered drawing function from drawing.js
    drawPlayerFromBuffer(ctx, this);

    // Optional: Draw engine trail particles if needed (can also be done in game.drawEntities)
    // if (!this.invincible && Math.abs(this.targetX - this.getCenterX()) > 1) {
    //     // Assuming particleManager is accessible via game instance passed somewhere
    //     // game.particleManager.createEngineTrail(this.getCenterX(), this.y + this.height / 2, this.width);
    // }
  }

  canShoot(currentTime) {
    return currentTime - this.lastShotTime >= this.shootDelay;
  }
  recordShot(currentTime) {
    this.lastShotTime = currentTime;
  }
  addScore(amount, game) {
    // Add score logic moved to game.addScore to handle unlocks in one place
    game.addScore(amount);
    this.currentLifeScore += amount; // Track score for this life separately for unlocks
  }
  increaseKillCount(game) {
    this.kills++;
    const killsNeeded = GAME_CONFIG.killsPerPowerUp;
    const newPowerLevel = Math.min(
      Math.floor(this.kills / killsNeeded) + 1,
      GAME_CONFIG.maxBulletPowerLevel
    );

    if (newPowerLevel > this.bulletPowerLevel) {
      this.bulletPowerLevel = newPowerLevel;
      this.maxReachedPower = Math.max(
        this.maxReachedPower,
        this.bulletPowerLevel
      );
      game.particleManager.createPowerUpEffect(
        this.getCenterX(),
        this.getCenterY(),
        this.bulletMode
      ); // Use center
      game.uiManager.updateBulletPower(
        this.bulletPowerLevel,
        0, // Reset progress bar on level up
        this.bulletPowerLevel === GAME_CONFIG.maxBulletPowerLevel
      );
      console.log("Bullet Power Leveled Up:", this.bulletPowerLevel);
    } else if (this.bulletPowerLevel < GAME_CONFIG.maxBulletPowerLevel) {
      // Update progress bar if not maxed
      game.uiManager.updateBulletPower(
        this.bulletPowerLevel,
        this.kills % killsNeeded,
        false
      );
    }
  }
  toggleBulletMode(game) {
    this.bulletMode = this.bulletMode === "spread" ? "parallel" : "spread";
    this.bulletPowerLevel = 1; // Reset power level on switch
    this.kills = 0; // Reset kill count for power level
    this.maxReachedPower = Math.max(this.maxReachedPower, 1); // Ensure max power tracks the reset
    game.uiManager.updateBulletPower(this.bulletPowerLevel, 0, false); // Update UI
    return this.bulletMode; // Return the new mode for UI/sound purposes
  }
  loseLife() {
    if (this.invincible) return true; // Don't lose life if invincible

    this.lives--;
    this.currentLifeScore = 0; // Reset score for this life (for unlocks)
    this.bulletPowerLevel = 1; // Reset power
    this.kills = 0; // Reset kills

    if (this.lives > 0) {
      this.becomeInvincible(); // Become invincible after losing a life (if not game over)
    }
    return this.lives > 0; // Return true if player still has lives left
  }
  gainLife() {
    if (this.lives < this.maxLives) {
      this.lives++;
      return true;
    }
    return false; // Return false if already at max lives
  }
  becomeInvincible() {
    this.invincible = true;
    this.invincibilityTimer = this.invincibilityDuration;
    console.log(`Player invincible for ${this.invincibilityDuration}ms`);
  }
  resetForNewGame(canvasWidth, canvasHeight) {
    const config = GAME_CONFIG.player;
    this.x = canvasWidth / 2 - this.width / 2; // Center X
    this.y = canvasHeight - config.initialYOffset - this.height / 2; // Center Y based on offset
    this.targetX = this.getCenterX();
    this.lives = this.initialLives;
    this.bulletPowerLevel = 1;
    this.kills = 0;
    this.maxReachedPower = 1;
    this.bulletMode = "spread"; // Default mode
    this.autoFire = true; // Default autofire state
    this.lastShotTime = 0;
    this.currentLifeScore = 0;
    this.invincible = false; // Start not invincible
    this.invincibilityTimer = 0;
    this.active = true; // Make sure player is active
  }
  resetAfterDeath(canvasWidth, canvasHeight) {
    const config = GAME_CONFIG.player;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - config.initialYOffset - this.height / 2;
    this.targetX = this.getCenterX();
    // Lives are handled by loseLife()
    this.bulletPowerLevel = 1; // Reset power on death
    this.kills = 0; // Reset kills on death
    this.currentLifeScore = 0; // Reset life score on death
    this.lastShotTime = 0; // Allow shooting immediately
    this.becomeInvincible(); // Become invincible upon respawn
  }
}

// --- Bullet Class ---
class Bullet extends Entity {
  constructor(
    x, // Starting center X
    y, // Starting center Y
    config,
    speedX = 0,
    speedY,
    damage,
    owner = "player",
    target = null // Optional target for homing
  ) {
    super(x - config.width / 2, y, config.width, config.height, config.color);

    this.speedX = speedX;
    this.speedY = speedY;
    this.damage = damage;
    this.owner = owner;
    this.config = config; // Store config for properties like turnRate, speed

    // Homing properties
    this.isHoming = owner === "miniShip"; // Only miniship rockets home currently
    this.target = target; // The alien entity to home towards
    this.turnRate = config.turnRate || 0; // Radians per update step (approx)
    this.baseSpeed =
      config.speed || Math.sqrt(speedX * speedX + speedY * speedY); // Store base speed if provided
  }

  update(deltaTime, gameRef) {
    // Pass gameRef if needed for target finding etc.
    const speedFactor = deltaTime / 16.67; // Normalize speed based on 60fps

    if (this.isHoming) {
      // Check if target is valid and active
      if (this.target && this.target.active && this.target.health > 0) {
        const targetX = this.target.getCenterX();
        const targetY = this.target.getCenterY();
        const currentX = this.getCenterX();
        const currentY = this.getCenterY();

        // Calculate desired angle towards target
        const desiredAngle = Math.atan2(targetY - currentY, targetX - currentX);

        // Calculate current angle of movement
        const currentAngle = Math.atan2(this.speedY, this.speedX);

        // Find the shortest angle difference (handle wrap-around)
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Clamp the turning amount based on turnRate
        const turnAmount = clamp(
          angleDiff,
          -this.turnRate * speedFactor,
          this.turnRate * speedFactor
        ); // Scale turn rate by delta time

        // Calculate the new angle
        const newAngle = currentAngle + turnAmount;

        // Update velocity components based on the new angle and base speed
        this.speedX = Math.cos(newAngle) * this.baseSpeed;
        this.speedY = Math.sin(newAngle) * this.baseSpeed;
      } else {
        // Target lost or destroyed, continue straight
        this.isHoming = false; // Stop homing
        this.target = null;
        // Optional: Could add logic to find a new target here
      }
    }

    // Update position based on velocity
    this.x += this.speedX * speedFactor;
    this.y += this.speedY * speedFactor;

    // Check if offscreen (specific logic for bullets might be stricter)
    if (this.y + this.height < 0 || this.y > gameRef.height) {
      // Simple top/bottom check
      this.active = false;
    }
  }

  draw(ctx) {
    // Could add rotation for homing missiles if desired
    drawRect(ctx, this.x, this.y, this.width, this.height, this.color);
  }
}

// --- Rocket Class (Player Ability) ---
class Rocket extends Entity {
  constructor(playerCenterX, playerCenterY) {
    // Start from player center
    const config = GAME_CONFIG.rocket;
    super(
      playerCenterX - config.width / 2,
      playerCenterY - config.height, // Start slightly above player center
      config.width,
      config.height,
      config.color
    );
    this.speedY = config.speedY;
    this.explosionRadius = config.explosionRadius;
    this.damage = config.damage;
  }

  update(deltaTime) {
    this.y += this.speedY * (deltaTime / 16.67);
    // Deactivation happens in game loop via shouldExplode or isOffscreen
  }

  draw(ctx) {
    // Simple rocket shape
    ctx.fillStyle = this.color;
    ctx.beginPath();
    // Pointy top
    ctx.moveTo(this.getCenterX(), this.y);
    // Bottom corners
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    // Optional: Small fins
    // ctx.fillStyle = darkenColor(this.color, 0.2); // Needs a darkenColor helper
    // ctx.fillRect(this.x - 2, this.y + this.height * 0.7, 2, this.height * 0.3);
    // ctx.fillRect(this.x + this.width, this.y + this.height * 0.7, 2, this.height * 0.3);
  }

  // Method to check if the rocket should explode (e.g., reached top)
  shouldExplode(canvasHeight) {
    return this.y + this.height < 0; // Explode when completely off the top edge
  }
}

// --- Alien Class ---
class Alien extends Entity {
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
    this.baseSpeed = speed; // Store base speed for reference
    this.health = health;
    this.maxHealth = health;
    this.points = points;
    this.alienType = type;
    this.typeConfig = typeConfig;
    this.gameRef = gameRef; // Reference to the main game object

    // State Machine for Fighters/Elites
    this.state = "descending"; // Initial state
    this.stateTimer = 0; // Timer for states like hovering
    this.shootCooldown = getRandom(
      typeConfig.shootDelay * 0.8,
      typeConfig.shootDelay * 1.2
    ); // Add initial variation
    this.movementPatternTimer = 0; // For sinusoidal movement
  }

  update(deltaTime, canvasHeight, player) {
    const speedFactor = deltaTime / 16.67;
    this.stateTimer -= deltaTime;
    this.shootCooldown -= deltaTime;

    // Common vertical movement
    this.y += this.speed * speedFactor;

    // Type-specific behavior
    switch (this.alienType) {
      case "scout":
        // Scouts just move down
        break;

      case "fighter":
      case "elite":
        // Horizontal Movement (simple sine wave for hover/attack)
        if (this.state === "hovering" || this.state === "attacking") {
          this.movementPatternTimer += deltaTime;
          const frequency = 0.001; // How fast the sine wave oscillates
          const amplitude = this.width * 0.5; // How far side-to-side
          const horizontalOffset =
            Math.sin(this.movementPatternTimer * frequency + this.y) *
            amplitude; // Use 'y' to desync aliens
          // This needs careful application - maybe apply to a targetX and lerp?
          // For simplicity, let's just add a small wiggle directly for now
          this.x +=
            Math.sin(this.movementPatternTimer * 0.002 + this.y) *
            0.5 *
            speedFactor;
        }

        // State Transitions
        switch (this.state) {
          case "descending":
            const hoverY =
              canvasHeight * (this.typeConfig.hoverYThreshold || 0.15);
            if (this.y >= hoverY) {
              this.state = "hovering";
              this.stateTimer = this.typeConfig.hoverDuration || 3000;
              this.y = hoverY; // Snap to hover position
              this.speed = 0; // Stop vertical movement while hovering
              // console.log(`Alien ${this.alienType} reached hover Y, switching to hovering state.`);
            }
            break;

          case "hovering":
            if (this.stateTimer <= 0) {
              this.state = "attacking";
              this.speed = this.baseSpeed * 0.5; // Resume slow descent while attacking
              this.shootCooldown = getRandom(100, 500); // Start shooting quickly after hover
              // console.log(`Alien ${this.alienType} finished hovering, switching to attacking state.`);
            }
            break;

          case "attacking":
            // Continuously attack (vertical movement resumed slightly)
            if (this.shootCooldown <= 0 && player && player.active) {
              // Only shoot if player exists and is active
              this.shoot(player);
              // Reset cooldown with some variance
              this.shootCooldown = getRandom(
                this.typeConfig.shootDelay * 0.8,
                this.typeConfig.shootDelay * 1.2
              );
            }
            break;
        }
        break; // End fighter/elite block
    }

    // Keep alien within horizontal bounds
    this.x = clamp(this.x, 0, this.gameRef.width - this.width);

    // Check if offscreen (handled in game loop now)
  }

  shoot(player) {
    if (!this.gameRef || !player) return;

    let bulletConfig = { ...GAME_CONFIG.bullets.alienFighter }; // Clone config
    let bulletSpeed = bulletConfig.speed;

    if (this.alienType === "elite") {
      bulletSpeed *= this.typeConfig.bulletSpeedMultiplier || 1.0;
      // Maybe use a different bullet appearance or damage for elites?
      // bulletConfig.color = '#ff00ff';
      // bulletConfig.damage *= 1.5;
    }

    const targetX = player.getCenterX();
    const targetY = player.getCenterY(); // Aim at player center
    const startX = this.getCenterX();
    const startY = this.getCenterY() + this.height / 2; // Shoot from bottom-center

    // Calculate angle to player
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speedX = Math.cos(angle) * bulletSpeed;
    const speedY = Math.sin(angle) * bulletSpeed;

    // Add the bullet via the game reference
    this.gameRef.addAlienBullet(startX, startY, speedX, speedY, bulletConfig);
    // console.log(`Alien ${this.alienType} fired a bullet.`);
  }

  draw(ctx) {
    // Choose drawing method based on type
    if (this.alienType === "fighter") this.drawFighter(ctx);
    else if (this.alienType === "elite") this.drawElite(ctx);
    else this.drawScout(ctx); // Default to scout shape

    // Draw health bar (only if damaged)
    if (this.health < this.maxHealth) {
      const barConfig = GAME_CONFIG.aliens;
      drawHealthBar(
        ctx,
        this.x,
        this.y - barConfig.healthBarYOffset, // Position above the alien
        this.width,
        barConfig.healthBarHeight,
        this.health,
        this.maxHealth
      );
    }
  }

  // --- Specific Alien Drawing Methods ---
  drawScout(ctx) {
    // Simple oval shape
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(
      this.getCenterX(),
      this.getCenterY(),
      this.width / 2,
      this.height / 2, // Radii
      0,
      0,
      Math.PI * 2 // Angle, start/end angle
    );
    ctx.fill();
    // Simple cockpit indication
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.ellipse(
      this.getCenterX(),
      this.y + this.height * 0.3, // Position cockpit lower
      this.width / 5,
      this.height / 5,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  drawFighter(ctx) {
    // Use the generic ship drawing function for consistency
    drawGenericShip(
      ctx,
      this.getCenterX(),
      this.getCenterY(),
      this.width,
      this.height,
      this.color, // Main color
      "rgba(255, 100, 100, 0.5)", // Cockpit color (reddish)
      "rgba(255, 150, 50, 0.6)" // Engine color (orangey)
    );
  }

  drawElite(ctx) {
    // More complex shape for Elites
    ctx.fillStyle = this.color; // Purple base
    const centerX = this.getCenterX();
    const centerY = this.getCenterY();
    const w2 = this.width / 2;
    const h2 = this.height / 2;

    // Diamond-like main body
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - h2); // Top point
    ctx.lineTo(centerX + w2 * 0.8, centerY - h2 * 0.2); // Top right wing inset
    ctx.lineTo(centerX + w2, centerY + h2 * 0.5); // Bottom right wing point
    ctx.lineTo(centerX, centerY + h2); // Bottom center point
    ctx.lineTo(centerX - w2, centerY + h2 * 0.5); // Bottom left wing point
    ctx.lineTo(centerX - w2 * 0.8, centerY - h2 * 0.2); // Top left wing inset
    ctx.closePath();
    ctx.fill();

    // Central glowing cockpit
    ctx.fillStyle = "rgba(255, 0, 255, 0.7)"; // Bright magenta
    ctx.beginPath();
    ctx.arc(centerX, centerY, w2 * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Add some details/lines maybe?
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - h2);
    ctx.lineTo(centerX, centerY + h2); // Vertical line
    ctx.moveTo(centerX - w2, centerY + h2 * 0.5);
    ctx.lineTo(centerX + w2, centerY + h2 * 0.5); // Horizontal line lower
    ctx.stroke();
  }
  // --- End Drawing Methods ---

  takeDamage(amount) {
    this.health -= amount;
    // console.log(`Alien ${this.alienType} took ${amount} damage, ${this.health} HP left.`);
    return this.health <= 0; // Return true if health is 0 or less
  }

  // Determine if this alien should drop an item upon destruction
  shouldDropItem() {
    return Math.random() < (this.typeConfig.dropChance || 0.05);
  }
}

// --- Particle Class ---
class Particle extends Entity {
  constructor(x, y, config) {
    // Use radius for width/height if it's a circle particle
    const size = (config.radius || 1) * 2;
    super(x - size / 2, y - size / 2, size, size, config.color);

    this.radius = config.radius || 0; // Keep radius for drawing circles
    this.speedX = config.speedX || 0;
    this.speedY = config.speedY || 0;
    this.initialLife = config.life || 1000; // Default life in ms
    this.life = this.initialLife;
    this.alpha = 1.0;

    // Text particle properties
    this.isText = config.isText || false;
    this.text = config.text || "";
    this.fontSize = config.fontSize || 12;
    this.gravity = config.gravity || 0; // Gravity for effects like bouncing text
    this.textAlign = config.textAlign || "center";
    this.textBaseline = config.textBaseline || "middle";
  }

  update(deltaTime) {
    const speedFactor = deltaTime / 16.67;

    // Apply gravity if specified
    if (this.gravity !== 0) {
      this.speedY += this.gravity * speedFactor;
    }

    // Update position
    this.x += this.speedX * speedFactor;
    this.y += this.speedY * speedFactor;

    // Decrease life
    this.life -= deltaTime;

    // Calculate alpha based on remaining life (linear fade out)
    // Fade starts earlier maybe? e.g., fade over last 60% of life
    const fadeStartTime = this.initialLife * 0.6;
    if (this.life < fadeStartTime) {
      this.alpha = clamp(this.life / fadeStartTime, 0, 1);
    } else {
      this.alpha = 1.0;
    }

    // Deactivate when life runs out
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.globalAlpha = this.alpha; // Apply calculated alpha

    if (this.isText) {
      // Use the drawText utility function
      drawText(
        ctx,
        this.text,
        this.getCenterX(), // Use center X
        this.getCenterY(), // Use center Y
        this.color,
        this.fontSize,
        this.textAlign,
        this.textBaseline
      );
    } else {
      // Use the drawCircle utility function for non-text particles
      drawCircle(
        ctx,
        this.getCenterX(), // Draw circle at center X
        this.getCenterY(), // Draw circle at center Y
        this.radius,
        this.color
      );
    }

    ctx.globalAlpha = 1.0; // Reset global alpha
  }
}

// --- Debris Class ---
class Debris extends Particle {
  // Inherit from Particle for base movement/life
  constructor(x, y, config) {
    // Debris doesn't use radius directly, it has width/height
    // We pass relevant particle config to the Particle constructor
    super(x - config.width / 2, y - config.height / 2, {
      // Particle constructor expects radius, speed, life, color etc.
      // Debris doesn't draw as a circle, so radius isn't critical here.
      // Pass other relevant properties if needed by Particle's update.
      color: config.color,
      speedX: config.speedX,
      speedY: config.speedY,
      life: config.life,
      gravity: config.gravity || 0, // Allow gravity for debris too
    });

    // Override or set debris-specific properties
    this.width = config.width;
    this.height = config.height;
    this.rotation = Math.random() * Math.PI * 2; // Initial random rotation
    this.rotationSpeed = config.rotationSpeed;
    this.damage = config.damage;
    this.isText = false; // Ensure debris is not treated as text
  }

  update(deltaTime) {
    // Call Particle's update for movement, life decay, gravity
    super.update(deltaTime);

    // Add rotation
    this.rotation += this.rotationSpeed * (deltaTime / 16.67);
  }

  draw(ctx) {
    if (!this.active) return;

    // Save context state for rotation/alpha
    ctx.save();

    // Translate to the center of the debris for rotation
    ctx.translate(this.getCenterX(), this.getCenterY());
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.alpha; // Use alpha calculated by Particle update
    ctx.fillStyle = this.color;

    // Draw the rectangle centered at the translated origin
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Restore context state
    ctx.restore();
  }
}

// --- Wingman Class ---
class Wingman extends Entity {
  constructor(playerX, playerY, offsetX) {
    // offsetX determines left or right
    const config = GAME_CONFIG.wingman;
    // Initial position relative to player
    const startX = playerX + offsetX;
    const startY = playerY + config.offsetY;

    super(
      startX - config.width / 2,
      startY - config.height / 2,
      config.width,
      config.height,
      config.color
    );

    this.offsetX = offsetX; // Target offset X from player center
    this.offsetY = config.offsetY; // Target offset Y from player center
    this.targetX = startX; // Initial target X
    this.targetY = startY; // Initial target Y
    this.followLerpFactor = config.followLerpFactor;
    // this.lastShotTime = 0; // Shooting logic removed/commented
    // this.shootDelay = config.shootDelay;
    this.cockpitColor = config.cockpitColor;
    this.engineColor = config.engineColor;
  }

  update(deltaTime, player, aliens, game) {
    // player is the Player object
    if (!player) return;

    // Calculate target position based on player's *center*
    this.targetX = player.getCenterX() + this.offsetX;
    this.targetY = player.getCenterY() + this.offsetY;

    // Smoothly interpolate (lerp) towards the target position
    const currentCenterX = this.getCenterX();
    const currentCenterY = this.getCenterY();
    this.x +=
      (this.targetX - currentCenterX) *
      this.followLerpFactor *
      (deltaTime / 16.67); // Scale lerp by deltaTime
    this.y +=
      (this.targetY - currentCenterY) *
      this.followLerpFactor *
      (deltaTime / 16.67);

    // Wingmen currently do not shoot, but logic could be added here:
    // const currentTime = performance.now();
    // if (currentTime - this.lastShotTime >= this.shootDelay) {
    //     // Find target, create bullet etc.
    //     // game.addWingmanBullet(...)
    //     this.lastShotTime = currentTime;
    // }
  }

  draw(ctx) {
    // Use the generic ship drawing function
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

// --- MiniShip Class ---
class MiniShip extends Entity {
  constructor(playerX, playerY, index) {
    // index helps position them
    const config = GAME_CONFIG.miniShip;
    const count = GAME_CONFIG.miniShip.count;
    // Calculate initial offset based on index
    const initialOffsetX =
      (index - Math.floor(count / 2)) * config.spreadOffset;
    const startX = playerX + initialOffsetX;
    const startY = playerY; // Start near player

    super(
      startX - config.width / 2,
      startY - config.height / 2,
      config.width,
      config.height,
      config.color
    );

    this.index = index; // Store index for positioning and potential targeting logic
    this.followLerpFactor = config.followLerpFactor;
    this.lastShotTime = performance.now() + getRandom(0, config.shootDelay); // Stagger initial shots
    this.shootDelay = config.shootDelay;
    this.burstCount = config.burstCount || 1;
    this.targetAlien = null; // Current primary target
    this.cockpitColor = config.cockpitColor;
    this.engineColor = config.engineColor;
    this.returnOffsetY = config.returnOffsetY;
    this.state = "following"; // States: following, attacking
    this.currentTargets = []; // Could hold multiple targets if implementing multi-target logic
  }

  update(deltaTime, player, aliens, game) {
    if (!player) return;

    this.findTarget(aliens); // Update target if needed

    // Determine target position: Follow player formation or move towards target?
    // Simple approach: always try to maintain formation relative to player
    const count = GAME_CONFIG.miniShip.count;
    const config = GAME_CONFIG.miniShip;
    const formationOffsetX =
      (this.index - Math.floor(count / 2)) * config.spreadOffset;
    const targetX = player.getCenterX() + formationOffsetX;
    // Target Y slightly behind player when idle/no target, maybe above when attacking?
    const targetY =
      player.getCenterY() - (this.targetAlien ? 0 : this.returnOffsetY); // Stay behind if no target

    // Smooth movement towards target position
    const currentCenterX = this.getCenterX();
    const currentCenterY = this.getCenterY();
    this.x +=
      (targetX - currentCenterX) * this.followLerpFactor * (deltaTime / 16.67);
    this.y +=
      (targetY - currentCenterY) * this.followLerpFactor * (deltaTime / 16.67);

    // --- Shooting Logic ---
    const currentTime = performance.now();
    if (
      this.targetAlien &&
      currentTime - this.lastShotTime >= this.shootDelay
    ) {
      // Check if target is still valid before shooting
      if (this.targetAlien.active && this.targetAlien.health > 0) {
        // Fire one rocket per burst (as burstCount is 1)
        game.shootMiniShipRocket(this, this.targetAlien); // Pass target to game function
        this.lastShotTime = currentTime; // Reset cooldown
      } else {
        // Target became invalid before shooting, find a new one immediately
        this.targetAlien = null;
        this.findTarget(aliens);
      }
    }
  }

  findTarget(aliens) {
    // If current target is invalid (null, inactive, dead), find a new one
    if (
      !this.targetAlien ||
      !this.targetAlien.active ||
      this.targetAlien.health <= 0
    ) {
      // Find the closest, active, on-screen alien
      const potentialTargets = aliens.filter(
        (a) =>
          a.active &&
          a.health > 0 &&
          a.y > -a.height &&
          a.y < this.gameRef.height
      ); // Ensure on screen vertically

      this.targetAlien = findClosestEntity(this, potentialTargets);

      // if (this.targetAlien) {
      //     console.log(`MiniShip ${this.index} acquired new target.`);
      // } else {
      //     console.log(`MiniShip ${this.index} has no targets.`);
      // }
    }
    // If current target is still valid, keep it.
  }

  draw(ctx) {
    // Use the generic ship drawing function
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

    // Optional: Draw line to target? (for debugging)
    // if (this.targetAlien && this.targetAlien.active) {
    //    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    //    ctx.beginPath();
    //    ctx.moveTo(this.getCenterX(), this.getCenterY());
    //    ctx.lineTo(this.targetAlien.getCenterX(), this.targetAlien.getCenterY());
    //    ctx.stroke();
    // }
  }
}

// --- Item Class ---
class Item extends Entity {
  constructor(x, y, type, value = 0) {
    const config = GAME_CONFIG.items;
    super(
      x - config.size / 2, // Center the item at spawn location
      y - config.size / 2,
      config.size,
      config.size,
      config[`${type}Color`] || "white" // Use color from config if available
    );
    this.itemType = type;
    this.value = value;
    this.speedY = config.dropSpeedY;
  }

  update(deltaTime) {
    this.y += this.speedY * (deltaTime / 16.67);
    // Deactivation happens in game loop based on isOffscreen or collision
  }

  draw(ctx) {
    // Use the dedicated drawItem function from drawing.js
    drawItem(ctx, this);
  }

  // Called when the player collects the item
  applyEffect(player, game) {
    switch (this.itemType) {
      case "xp":
        player.addScore(this.value, game); // Use player's method to trigger game score update
        game.particleManager.createXpIndicator(
          this.getCenterX(),
          this.getCenterY(),
          `+${this.value}`
        );
        game.audioManager.playSound("itemPickup", { itemType: "xp" }); // Play XP sound
        break;
      case "life":
        if (player.gainLife()) {
          // gainLife returns true if successful
          game.uiManager.updateLives(player.lives); // Update UI directly
          game.particleManager.createXpIndicator(
            this.getCenterX(),
            this.getCenterY(),
            "+1 Life",
            "#ffaaaa" // Pinkish color for life text
          );
          game.audioManager.playSound("itemPickup", { itemType: "life" }); // Play life sound
        } else {
          // Player was already at max lives, give score bonus instead
          player.addScore(500, game); // Give bonus score
          game.particleManager.createXpIndicator(
            this.getCenterX(),
            this.getCenterY(),
            "+500 (Max ❤️)",
            "#ffdddd" // Lighter pink
          );
          // Optional: Play a different sound for max lives pickup?
          game.audioManager.playSound("itemPickup", { itemType: "xp" }); // Play regular pickup sound maybe?
        }
        break;
      case "bomb":
        // Bomb effect and sound are handled by the game.activateBomb method
        game.activateBomb(this.getCenterX(), this.getCenterY());
        break;
      default:
        console.warn(`Unknown item type collected: ${this.itemType}`);
    }
    // Item is deactivated after collision check in the main game loop
  }
}

// --- Particle Manager ---
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
