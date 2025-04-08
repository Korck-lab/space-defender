// js/drawing.js

// --- Offscreen Canvas Buffers ---
let starfieldBuffer = null;
let playerBuffer = null;
let playerInvincibleBuffer = null; // NEW buffer for invincible state

function createOffscreenCanvas(width, height) {
    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    return buffer;
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
        const hue = 200 + star.z * 10;
        ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
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


function createPlayerBuffer(playerConfig) {
    const bufferWidth = playerConfig.width + 10;
    const bufferHeight = playerConfig.height + 10;
    playerBuffer = createOffscreenCanvas(bufferWidth, bufferHeight);
    const bufferCtx = playerBuffer.getContext('2d');
    _drawPlayerShipShape(bufferCtx, playerConfig, bufferWidth, bufferHeight);

    // NEW: Create invincible buffer (simple white overlay version)
    playerInvincibleBuffer = createOffscreenCanvas(bufferWidth, bufferHeight);
    const invincibleCtx = playerInvincibleBuffer.getContext('2d');
    _drawPlayerShipShape(invincibleCtx, playerConfig, bufferWidth, bufferHeight, playerConfig.invincibleColor);
}

function drawPlayerFromBuffer(mainCtx, player) {
    let bufferToDraw = playerBuffer; // Default buffer

    // Check for invincibility and alternate drawing
    if (player.invincible) {
        // Simple flashing effect by alternating buffers or alpha
        if (Math.floor(player.invincibilityTimer / 100) % 2 === 0) {
            bufferToDraw = playerInvincibleBuffer;
        }
        // Or: use mainCtx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.2; before drawing playerBuffer
    }

    if (!bufferToDraw) {
        createPlayerBuffer(GAME_CONFIG.player); // Create if missing
        bufferToDraw = playerBuffer; // Fallback
    }

    if (bufferToDraw) {
        mainCtx.drawImage(bufferToDraw,
            player.x - bufferToDraw.width / 2,
            player.y - bufferToDraw.height / 2
        );

        // Draw Dynamic Elements (Engine Glow) - Only if NOT invincible maybe?
        // Or make engine glow less intense when invincible
        if (!player.invincible) {
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

// NEW: Draw Item function
function drawItem(ctx, item) {
    const cfg = GAME_CONFIG.items;
    let icon;
    let color = 'white';

    switch(item.itemType) {
        case 'xp':
            icon = '⭐'; // Or draw a coin/star shape
            color = cfg.xpColor;
            break;
        case 'life':
            icon = '❤️'; // Or draw a heart shape
            color = cfg.lifeColor;
            break;
        case 'bomb':
            icon = '💣'; // Or draw a bomb shape
            color = cfg.bombColor;
            break;
        default:
            icon = '?';
    }

    // Draw a simple circle background
    drawCircle(ctx, item.x + item.width / 2, item.y + item.height / 2, item.width / 2 + 2, 'rgba(0,0,0,0.5)');
    drawCircle(ctx, item.x + item.width / 2, item.y + item.height / 2, item.width / 2, color);

    // Draw icon text inside
    drawText(ctx, icon, item.x + item.width / 2, item.y + item.height / 2, 'black', cfg.size * 0.7);

}


