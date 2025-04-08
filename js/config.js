// js/config.js

const GAME_CONFIG = {
  // General
  STAR_COUNT: 350,
  MAX_BULLETS_DISPLAY: 5,
  LOCAL_STORAGE_HISCORE_KEY: "spaceDefenderHighScores",
  INVINCIBILITY_DURATION: 2500,

  // Player
  player: {
    baseSpeed: 8,
    width: 30,
    height: 40,
    initialYOffset: 50,
    shootDelay: 300,
    color: "#00ffff",
    invincibleColor: "rgba(255, 255, 255, 0.5)",
    cockpitGradient: ["white", "blue"],
    engineColor: "rgba(255, 100, 0, 0.8)",
    initialLives: 3,
    maxLives: 5,
  },

  // Bullets
  bullets: {
    player: {
      width: 3,
      height: 15,
      speedY: -10,
      spreadAngleMultiplier: 0.3,
      parallelOffsetMultiplier: 15,
      colorSpread: "#00ffff",
      colorParallel: "#00ff00",
      baseDamageMultiplier: 1,
      parallelDamageFactor: 0.5,
    },
    alienFighter: {
      width: 5,
      height: 10,
      speed: 5,
      color: "#ff4444",
      damage: 1,
    },
    miniShipRocket: {
      width: 5,
      height: 12,
      speed: 9,
      color: "#99ddff", // Lighter blue
      damage: 2.5, // Small rockets, decent damage
      turnRate: 0.15, // How fast they can turn towards target (radians per frame approx)
      trailColor: "#ccf0ff",
    },
  },

  // Rockets (Player Ability)
  rocket: {
    width: 15,
    height: 30,
    speedY: -8,
    color: "#ff5500",
    explosionRadius: 100,
    damage: 5,
    flameColor: "#ffaa00",
  },

  // Wingmen
  wingman: {
    count: 2,
    width: 15,
    height: 20,
    offsetX: 60,
    offsetY: 0,
    color: "#55ff00",
    // shootDelay: 800, // No shooting logic currently active
    followLerpFactor: 0.1,
    cockpitColor: "rgba(255, 255, 255, 0.2)",
    engineColor: "rgba(150, 255, 100, 0.2)",
  },

  // Mini Ships
  miniShip: {
    count: 3,
    width: 10,
    height: 15,
    color: "#00aaff",
    shootDelay: 600, // Time between firing bursts
    burstCount: 1, // How many rockets per ship per burst
    maxTargets: 5, // Max simultaneous targets for the group
    followLerpFactor: 0.05,
    cockpitColor: "rgba(255, 255, 255, 0.2)",
    engineColor: "rgba(100, 200, 255, 0.2)",
    spreadOffset: 40,
    returnOffsetY: 50,
  },

  // Aliens
  aliens: {
    initialSpawnInterval: 1800,
    initialSpeed: 0.6,
    initialHealth: 1.8,
    minOnScreenBase: 3,
    minOnScreenLevelScale: 0.8,
    levelSpawnIntervalMultiplier: 0.985,
    levelSpawnIntervalMinFactor: 0.85,
    levelSpeedMultiplier: 1.06,
    levelSpeedMinFactor: 1.04,
    levelHealthMultiplier: 1.07,
    levelHealthMinFactor: 1.04,
    basePoints: 10,
    healthBarHeight: 4,
    healthBarYOffset: 8,
    scout: {
      colorHueMin: 300,
      colorHueRange: 60,
      saturation: "70%",
      lightness: "50%",
      sizeMin: 20,
      sizeRange: 25,
      healthMultiplier: 0.9,
      speedMultiplier: 1.1,
      pointsMultiplier: 0.8,
      fighterSpawnCount: 2,
      dropChance: 0.05,
    },
    fighter: {
      color: "hsl(0, 80%, 60%)",
      sizeMin: 25,
      sizeRange: 30,
      healthMultiplier: 1.2,
      speedMultiplier: 0.9,
      pointsMultiplier: 1.2,
      hoverYThreshold: 0.15,
      hoverDuration: 3000,
      shootDelay: 1500,
      dropChance: 0.1,
    },
    elite: {
      color: "hsl(270, 80%, 60%)",
      sizeMin: 35,
      sizeRange: 35,
      healthMultiplier: 3.5,
      speedMultiplier: 0.7,
      pointsMultiplier: 3.0,
      hoverYThreshold: 0.18,
      hoverDuration: 5000,
      shootDelay: 300, // Stays higher longer
      bulletSpeedMultiplier: 1.2,
      dropChance: 0.25,
    },
    spawnRatioScout: 0.6,
    spawnRatioFighter: 0.35,
    spawnRatioElite: 0.05,
  },

  // Power Ups / Leveling
  killsPerPowerUp: 5,
  maxBulletPowerLevel: 5,
  levelScoreBase: 1500,
  levelScoreExponent: 1.15,

  // --- Ability Unlock System ---
  unlockSystem: {
    // Bar color defined in CSS now
    rocketUnlockScore: 500,
    wingmanUnlockScore: 1500,
    miniShipUnlockScore: 3000,
    glowDuration: 500, // ms for the glow effect on unlock bar progress
  },

  // Items / Drops
  items: {
    xpValueMin: 50,
    xpValueMax: 250,
    dropSpeedY: 2,
    size: 20,
    xpColor: "#000000",
    lifeColor: "#ffffff",
    bombColor: "#ffff00",
    lifeMaxValue: 1,
    bombEffectRadius: 400,
    bombDamage: 50,
  },

  // Particles & Effects
  particles: {
    explosionFactor: 0.8,
    muzzleFlashCount: 8,
    bulletTrailCount: 1,
    engineTrailCount: 2,
    debrisCountFactor: 0.2,
    debrisBaseLife: 100,
    debrisLifeRange: 100,
    debrisDamage: 1,
    debrisSpeedFactor: 6,
    debrisRotationFactor: 0.1,
    debrisSizeMin: 4,
    debrisSizeRange: 8,
    shockwaveCount: 10,
    shockwaveMinRadius: 5,
    shockwaveRadiusRange: 15,
    shockwaveLife: 40 * 16, // ms
    shockwaveDecay: 0.85, // (Handled by alpha fade now)
    shockwaveSpeedFactor: 10,
    baseDecay: 0.9, // (Handled by linear time decay now)
    baseLife: 20 * 16, // ms
    lifeRange: 30 * 16, // ms
    xpIndicator: {
      life: 1500, // Longer life for bounce
      speedY: -1.8, // Faster upward initial speed
      gravity: 0.05, // Slight downward pull for bounce effect
      fontSize: 22, // Slightly larger
      color: "#ffffaa",
    },
    miniRocketTrail: {
      // Config for miniship rocket trails
      life: 150, // Short life
      radiusMin: 1,
      radiusMax: 2,
      speedY: 0.5, // Slight drift
    },
    bombExplosionColor: "#ffcc00",
  },

  // Abilities (Cooldowns/Durations)
  abilities: {
    rocket: { maxCooldown: 5000, duration: 0 },
    wingman: { maxCooldown: 15000, duration: 10000 },
    miniShip: { maxCooldown: 25000, duration: 10000 },
    feedbackDuration: 500,
    readyFlashDuration: 1500,
  },

  // UI
  levelUpMessageDuration: 2000,
};
