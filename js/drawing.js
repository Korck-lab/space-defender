// js/drawing.js

import { GAME_CONFIG } from './config.js';
import { clamp } from './utils.js';

// --- Offscreen Canvas Buffers ---
let starfieldBuffer = null;
let playerBuffer = null;
let playerInvincibleOverlayBuffer = null; // Separate overlay for invincibility effect

// --- Ship image assets ---
let shipImage = null;
let shipImageLoaded = false;
let shipImageError = false;

function createOffscreenCanvas(width, height) {
    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    return buffer;
}

// --- Load ship image ---
function loadShipImage() {
    if (shipImage) return; // Don't reload if already loaded

    shipImage = new Image();
    shipImage.onload = () => {
        console.log("Ship image loaded successfully");
        shipImageLoaded = true;
        shipImageError = false;

        // Create ship buffers when image loads
        if (playerBuffer) {
            createPlayerBuffer(GAME_CONFIG.player);
        }
    };

    shipImage.onerror = (err) => {
        console.error("Failed to load ship image:", err);
        shipImageLoaded = false;
        shipImageError = true;
    };

    // Start loading the image
    shipImage.src = GAME_CONFIG.ship.imageFile;
}

// --- Starfield ---
let stars = []; // Keep star data accessible

function initStarfield(width, height) {
    stars = [];
    for (let i = 0; i < GAME_CONFIG.STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * 10 + 1, // Depth
            size: Math.random() * 3 + 1
        });
    }
    // Create or resize buffer
    if (!starfieldBuffer || starfieldBuffer.width !== width || starfieldBuffer.height !== height) {
        starfieldBuffer = createOffscreenCanvas(width, height);
    }
    // Initial draw onto buffer
    drawStarsToBuffer();
}

function drawStarsToBuffer() {
    if (!starfieldBuffer) return;
    const ctx = starfieldBuffer.getContext('2d');
    const { width, height } = starfieldBuffer;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
        const speedFactor = star.z * 0.15;
        star.y += speedFactor;

        if (star.y > height) {
            star.y = -star.size; // Start slightly above
            star.x = Math.random() * width;
        }

        const alpha = 0.2 + (star.z / 10) * 0.8;
        ctx.globalAlpha = alpha;
        const hue = 360; // Color based on depth
        const sat = 100;
        const light = Math.max(40 + star.z * 5, 75 + Math.random() * 30); // Lightness based on depth
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1; // Reset alpha
}

function drawStarfield(mainCtx) {
    drawStarsToBuffer(); // Update buffer every frame for smooth parallax
    if (starfieldBuffer) {
        mainCtx.drawImage(starfieldBuffer, 0, 0);
    }
}

// --- Player Ship Buffer ---
function _drawPlayerShipShape(ctx, config, bufferWidth, bufferHeight, colorOverride = null) {
    const centerX = bufferWidth / 2;
    const centerY = bufferHeight / 2;
    const mainColor = colorOverride || config.color;

    // --- Ship Body ---
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - config.height / 2);
    ctx.lineTo(centerX - config.width / 3, centerY - config.height / 4);
    ctx.lineTo(centerX - config.width / 2, centerY + config.height / 2);
    ctx.lineTo(centerX, centerY + config.height / 3);
    ctx.lineTo(centerX + config.width / 2, centerY + config.height / 2);
    ctx.lineTo(centerX + config.width / 3, centerY - config.height / 4);
    ctx.closePath();
    ctx.fill();

    // --- Cockpit ---
    if (!colorOverride) { // Don't draw detailed cockpit for simple invincible overlay
        const gradient = ctx.createLinearGradient(centerX, centerY - config.height / 2, centerX, centerY);
        gradient.addColorStop(0, config.cockpitGradient[0]);
        gradient.addColorStop(1, config.cockpitGradient[1]);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY - config.height / 5, config.width / 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Simple overlay cockpit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX, centerY - config.height / 5, config.width / 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function _drawPlayerShipImage(ctx, shipConfig, bufferWidth, bufferHeight, invincible = false) {
    const centerX = bufferWidth / 2;
    const centerY = bufferHeight / 2;

    // Clear the buffer first
    ctx.clearRect(0, 0, bufferWidth, bufferHeight);

    // For invincible effect, we no longer modify the main ship drawing here
    // as we'll use a separate overlay

    // Draw the ship image centered on the buffer
    const drawWidth = shipConfig.baseSize.width * shipConfig.scaleFactor;
    const drawHeight = shipConfig.baseSize.height * shipConfig.scaleFactor;

    ctx.drawImage(
        shipImage,
        centerX - drawWidth / 2,
        centerY - drawHeight / 2,
        drawWidth,
        drawHeight
    );
}

// New function to create invincibility overlay effect
function createInvincibilityOverlay(bufferWidth, bufferHeight) {
    playerInvincibleOverlayBuffer = createOffscreenCanvas(bufferWidth, bufferHeight);
    const ctx = playerInvincibleOverlayBuffer.getContext('2d');

    // Create a radial gradient that will serve as the overlay
    const gradient = ctx.createRadialGradient(
        bufferWidth / 2, bufferHeight / 2, 0,
        bufferWidth / 2, bufferHeight / 2, bufferWidth / 2
    );

    // Semi-transparent white for the shield-like effect
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(140, 200, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, bufferWidth, bufferHeight);
}

function createPlayerBuffer(playerConfig) {
    const shipConfig = GAME_CONFIG.ship;

    // Use larger buffer size for the image-based ship
    const bufferWidth = shipConfig.baseSize.width * shipConfig.scaleFactor + 10;
    const bufferHeight = shipConfig.baseSize.height * shipConfig.scaleFactor + 10;

    playerBuffer = createOffscreenCanvas(bufferWidth, bufferHeight);
    const bufferCtx = playerBuffer.getContext('2d');

    // Draw the ship based on whether the image loaded successfully
    if (shipImageLoaded && shipImage) {
        // Draw ship from loaded image
        _drawPlayerShipImage(bufferCtx, shipConfig, bufferWidth, bufferHeight);
    } else {
        // Fallback to shape drawing if image failed to load
        _drawPlayerShipShape(bufferCtx, playerConfig, bufferWidth, bufferHeight);

        // Attempt to load the image again
        loadShipImage();
    }

    // Create the invincibility overlay
    createInvincibilityOverlay(bufferWidth, bufferHeight);
}

function drawPlayerFromBuffer(mainCtx, player) {
    if (!playerBuffer) {
        // Attempt to load the ship image first
        if (!shipImage) {
            loadShipImage();
        }
        createPlayerBuffer(GAME_CONFIG.player); // Create if missing
    }

    if (playerBuffer) {
        mainCtx.drawImage(playerBuffer,
            player.getCenterX() - playerBuffer.width / 2,
            player.getCenterY() - playerBuffer.height / 2
        );

        // Draw dynamic engine glow based on ship config
        if (shipImageLoaded) {
            drawShipEngines(mainCtx, player);
        } else if (!player.invincible) {
            drawFallbackEngines(mainCtx, player);
        }

        // Draw invincibility effect overlay if player is invincible
        if (player.invincible && playerInvincibleOverlayBuffer) {
            // Calculate pulsing effect based on invincibility timer
            const pulseRatio = Math.sin(player.invincibilityTimer / 100) * 0.3 + 0.7;

            // Save context for restoration
            mainCtx.save();

            // Set the blend mode for glow effect
            mainCtx.globalAlpha = pulseRatio;
            mainCtx.globalCompositeOperation = 'lighter';

            // Draw the invincibility overlay on top of the ship
            mainCtx.drawImage(
                playerInvincibleOverlayBuffer,
                player.getCenterX() - playerInvincibleOverlayBuffer.width / 2,
                player.getCenterY() - playerInvincibleOverlayBuffer.height / 2
            );

            // Restore context
            mainCtx.globalCompositeOperation = 'source-over';
            mainCtx.globalAlpha = 1.0;
            mainCtx.restore();
        }
    }
}

// New function to draw engine glow based on ship config
function drawShipEngines(mainCtx, player) {
    const shipConfig = GAME_CONFIG.ship;
    const engineIntensity = clamp(Math.abs(player.targetX - player.x) / (player.width * 2), 0.3, 1);
    const alpha = engineIntensity * shipConfig.engineIntensityFactor;

    mainCtx.fillStyle = shipConfig.engineColor.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);

    // Draw all engines defined in the ship config
    for (const engine of shipConfig.enginePositions) {
        mainCtx.beginPath();

        // Scale the flame size based on velocity
        const flameHeight = engine.height * (0.8 + engineIntensity * 0.5);

        mainCtx.moveTo(
            player.x + engine.x,
            player.y + engine.y
        );
        mainCtx.lineTo(
            player.x + engine.x - engine.width / 2,
            player.y + engine.y + flameHeight
        );
        mainCtx.lineTo(
            player.x + engine.x + engine.width / 2,
            player.y + engine.y + flameHeight
        );
        mainCtx.closePath();
        mainCtx.fill();
    }
}

// Fallback engine drawing if image fails to load
function drawFallbackEngines(mainCtx, player) {
    const engineIntensity = clamp(Math.abs(player.targetX - player.x) / (player.width * 2), 0, 1);
    if (engineIntensity > 0.1) {
        mainCtx.fillStyle = GAME_CONFIG.player.engineColor.replace(/,\s*[\d.]+\)$/, `, ${engineIntensity * 0.8})`);
        mainCtx.beginPath();
        mainCtx.moveTo(player.x - player.width / 4, player.y + player.height / 3);
        mainCtx.lineTo(player.x, player.y + player.height / 2 + 3);
        mainCtx.lineTo(player.x + player.width / 4, player.y + player.height / 3);
        mainCtx.closePath();
        mainCtx.fill();
    }
}

// --- General Drawing Helpers ---

function drawRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawCircle(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawText(ctx, text, x, y, color, fontSize = 12, align = 'center', baseline = 'middle') {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
}

function drawHealthBar(ctx, x, y, width, height, currentHealth, maxHealth) {
    const healthPercent = clamp(currentHealth / maxHealth, 0, 1);
    if (healthPercent < 1) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(x, y, width * healthPercent, height);
    }
}

function drawGenericShip(ctx, x, y, width, height, color, cockpitColor, engineColor) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - height / 2);
    ctx.lineTo(x - width / 3, y - height / 4);
    ctx.lineTo(x - width / 2, y + height / 2);
    ctx.lineTo(x, y + height / 3);
    ctx.lineTo(x + width / 2, y + height / 2);
    ctx.lineTo(x + width / 3, y - height / 4);
    ctx.closePath();
    ctx.fill();

    if (cockpitColor) {
        ctx.fillStyle = cockpitColor;
        ctx.beginPath();
        ctx.arc(x, y - height / 3, width / 5, 0, Math.PI * 2);
        ctx.fill();
    }
    if (engineColor) {
        ctx.fillStyle = engineColor;
        ctx.beginPath();
        ctx.moveTo(x - width / 4, y + height / 3);
        ctx.lineTo(x, y + height / 2);
        ctx.lineTo(x + width / 4, y + height / 3);
        ctx.closePath();
        ctx.fill();
    }
}

// NEW: Draw Item function with improved visuals
function drawItem(ctx, item) {
    const cfg = GAME_CONFIG.items;
    let icon;
    let color;
    let glowColor;

    switch (item.itemType) {
        case 'xp':
            icon = '⭐'; // Star icon
            color = cfg.xpColor;
            glowColor = 'rgba(255, 255, 100, 0.4)';
            break;
        case 'life':
            icon = '❤️'; // Heart icon
            color = cfg.lifeColor;
            glowColor = 'rgba(255, 150, 150, 0.5)';
            break;
        case 'bomb':
            icon = '💣'; // Bomb icon
            color = cfg.bombColor;
            glowColor = 'rgba(255, 200, 50, 0.5)';
            break;
        case 'rocket':
            icon = '🚀'; // Rocket icon
            color = cfg.rocketColor;
            glowColor = 'rgba(255, 120, 50, 0.5)';
            break;
        case 'wingman':
            icon = '👾'; // Alien/robot icon
            color = cfg.wingmanColor;
            glowColor = 'rgba(120, 255, 50, 0.5)';
            break;
        case 'miniShip':
            icon = '🛸'; // UFO icon
            color = cfg.miniShipColor;
            glowColor = 'rgba(50, 150, 255, 0.5)';
            break;
        default:
            icon = '?';
            color = 'white';
            glowColor = 'rgba(255, 255, 255, 0.3)';
    }

    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const radius = item.width / 1.8;

    // Draw outer glow with pulsing effect for ability items
    const isPowerup = ['rocket', 'wingman', 'miniShip'].includes(item.itemType);
    const glowRadius = isPowerup ?
        radius * (1.5 + Math.sin(performance.now() * 0.01) * 0.2) :
        radius * 1.5;

    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, glowRadius);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw item background with transparency
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add a subtle inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Draw icon text inside
    drawText(ctx, icon, centerX, centerY, 'white', cfg.size * 0.7);
}

// --- Draw Aim Crosshair ---
function drawAimCrosshair(ctx, x, y) {
    const config = GAME_CONFIG.aim;
    const size = config.crosshairSize;
    const halfSize = size / 2;

    // Calculate pulsing effect based on time
    const pulseAmount = Math.sin(performance.now() * config.pulseSpeed) * 0.2 + 0.8;
    const scaledSize = size * pulseAmount;
    const halfScaledSize = scaledSize / 2;

    ctx.save();

    // Set drawing properties
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;

    // Draw crosshair lines
    ctx.beginPath();

    // Horizontal line with gap in middle
    ctx.moveTo(x - scaledSize, y);
    ctx.lineTo(x - halfScaledSize, y);
    ctx.moveTo(x + halfScaledSize, y);
    ctx.lineTo(x + scaledSize, y);

    // Vertical line with gap in middle
    ctx.moveTo(x, y - scaledSize);
    ctx.lineTo(x, y - halfScaledSize);
    ctx.moveTo(x, y + halfScaledSize);
    ctx.lineTo(x, y + scaledSize);

    // Draw the crosshair
    ctx.stroke();

    // Add a small circle in the middle
    ctx.beginPath();
    ctx.arc(x, y, halfScaledSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

// Export all the drawing functions
export {
    createOffscreenCanvas,
    loadShipImage,
    initStarfield,
    drawStarsToBuffer,
    drawStarfield,
    createPlayerBuffer,
    drawPlayerFromBuffer,
    drawShipEngines,
    drawFallbackEngines,
    drawRect,
    drawCircle,
    drawText,
    drawHealthBar,
    drawGenericShip,
    drawItem,
    drawAimCrosshair
};
