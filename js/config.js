// js/config.js

export const GAME_VERSION = "1.1.0"; // Use semantic versioning
export const LOCAL_STORAGE_VERSION_KEY = "spaceDefenderVersion";
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const GAME_CONFIG = {
  // General
  STAR_COUNT: 350,
  MAX_BULLETS_DISPLAY: 10,
  LOCAL_STORAGE_HISCORE_KEY: "spaceDefenderHighScores",
  LOCAL_STORAGE_VERSION_KEY: LOCAL_STORAGE_VERSION_KEY, // Add reference to version key
  GAME_VERSION: GAME_VERSION, // Add reference to version
  INVINCIBILITY_DURATION: 3000,

  // Aim
  aim: {
    crosshairSize: 20,       // Size of the crosshair in pixels
    color: 'rgba(0, 255, 255, 0.6)', // Color of the aiming elements
    pulseSpeed: 0.005,       // Speed of crosshair pulse animation
  },

  // Ship Configuration
  ship: {
    imageFile: "assets/images/player-ship2.png",
    baseSize: { width: 150, height: 150 }, // Base size when loaded
    scaleFactor: 0.5, // Scale down from the image's native size
    enginePositions: [
      { x: -13, y: 12, width: 20, height: 32 }, // Left engine
      // { x: 13, y: 12, width: 10, height: 22 }   // Right engine
    ],
    engineColor: "rgba(255, 0, 0, 0.54)",
    engineIntensityFactor: 0.5, // Factor for engine glow intensity
    // Leveling parameters
    levelUpScale: 1.08, // Ship grows by 8% each level, up to maxLevel
    maxLevel: 5, // Maximum ship growth level
    // Ability slots increase with ship level
    abilitySlotsPerLevel: [3, 3, 3, 3, 3],
    // Shield configuration
    shield: {
      imagefile: "assets/images/shield2.gif",
      useImage: true, // Set to true to use the animation image instead of drawn effects
      maxCapacity: 2, // Number of hits shield can absorb
      color: "rgba(0, 255, 174, 0.54)", // Shield visual color if not using image
      rechargeDelay: 3000, // Time without damage before shield starts recharging (ms)
      rechargeRate: 1000, // Time to recharge one unit (ms)
      // Visual settings for drawing
      visual: {
        baseSize: 2.5, // Fixed multiplier for shield size 
        pulseFrequency: 0.3, // Intensity of pulse
        pulseSpeed: 200, // Animation speed for pulse
        pulseAmplitude: 0.1, // Shield pulse variation (10% of shield size)
        baseAlpha: 0.1, // Base opacity
        capacityAlpha: 0.2, // Additional opacity based on shield capacity
        innerGlowAlpha: 1.5, // Brightness multiplier for inner glow
        innerCircleSizeFactor: 2.0, // Size divisor for inner glowing circle
        strokeWidth: 1 // Thickness of inner glow
      },
      // Image-based shield visual settings
      imageVisual: {
        sizeFactor: 0.175, // Size multiplier relative to player
        blendMode: 'screen', // Blend mode for transparency: 'screen', 'lighten', etc.
        opacity: 0.6, // Base opacity for the shield image
        pulseAmplitude: 0.1, // Shield pulse variation (10% of shield size)
        pulseSpeed: 200, // Animation speed for pulse
        rotation: 0.1, // Rotation speed of the shield image
        // capacityAlpha: 0.2 // Additional opacity based on shield capacity
      }
    },
  },

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
      parallelOffsetMultiplier: 10,
      colorSpread: "#00ffff",
      colorParallel: "#00ff00",
      baseDamageMultiplier: 1,
      parallelDamageFactor: 0.5,
      weaponPositions: [
        { x: 15, y: -35 }   // Center weapon
      ],
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
    explosionRadius: 150, // Increased explosion radius for area damage
    damage: 12, // Increased damage
    flameColor: "#ffaa00",
    turnRate: 0.05, // How quickly rockets can turn toward target
    distanceToStartChasing: 150, // Distance from top when rocket starts targeting
    areaDamageFalloff: 0.9, // Damage reduces with distance from explosion center
  },

  // Wingmen
  wingman: {
    count: 2,
    width: 15,
    height: 20,
    offsetX: 60,
    offsetY: 0,
    color: "#55ff00",
    shootDelay: 200,
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
    burstCount: 3, // How many rockets per ship per burst
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
    levelSpeedMinFactor: 1.01,
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
  killsPerPowerUp: 5, // Base kills needed for level 1 -> 2
  powerLevelExponent: 1.5, // Exponential factor for required kills per level
  maxBulletPowerLevel: 10, // Increased max power level (previously 5)
  levelScoreBase: 1500,
  levelScoreExponent: 1.15,

  // --- Ability Unlock System ---
  unlockSystem: {
    // Bar color defined in CSS now
    rocketUnlockScore: 0,
    wingmanUnlockScore: 0,
    miniShipUnlockScore: 0,
    glowDuration: 500, // ms for the glow effect on unlock bar progress
  },

  // Items / Drops
  items: {
    xpValueMin: 50,
    xpValueMax: 250,
    dropSpeedY: 1.8,
    size: 30, // Increased from 20 for better visibility
    xpColor: "rgba(0, 0, 0, 0)", // Yellow with transparency
    lifeColor: "rgba(0, 0, 0, 0)", // Red with transparency
    bombColor: "rgba(255, 255, 253, 0)", // Orange with transparency
    // New ability item colors
    rocketColor: "rgba(255, 85, 0, 0.8)",  // Orange-red for rocket ability
    wingmanColor: "rgba(85, 170, 0, 0.8)", // Green for wingman ability
    miniShipColor: "rgba(0, 85, 255, 0.8)", // Blue for miniship ability
    lifeMaxValue: 1,
    bombEffectRadius: 400,
    bombDamage: 50,
    // Ability drop chances
    abilityDropChance: 0.15, // Chance of an ability dropping instead of normal item
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

// Expose configuration via ES modules
// (GAME_VERSION, LOCAL_STORAGE_VERSION_KEY, GAME_WIDTH, GAME_HEIGHT, GAME_CONFIG are exported above)


