import { checkCollision } from '../utils.js';

/**
 * Handles all collision detection and related game events.
 * @param {Game} game - The game instance.
 */
export function checkCollisions(game) {
    const { bullets, aliens, player, items, particleManager } = game;

    // Bullets vs Aliens / Player
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet.active) continue;

        if (bullet.owner === 'player' || bullet.owner === 'miniShip' || bullet.owner === 'wingman') {
            for (let j = aliens.length - 1; j >= 0; j--) {
                const alien = aliens[j];
                if (!alien.active) continue;
                if (checkCollision(bullet, alien)) {
                    const destroyed = alien.takeDamage(bullet.damage);
                    bullet.active = false;
                    particleManager.createExplosion(
                        bullet.getCenterX(),
                        bullet.getCenterY(),
                        alien.color,
                        3
                    );
                    if (destroyed) game.handleAlienDestroyed(alien, j, bullet.owner);
                    break;
                }
            }
        } else if (bullet.owner === 'alien') {
            if (!player.invincible && checkCollision(bullet, player)) {
                bullet.active = false;
                game.handlePlayerHit('alien_bullet');
                if (!game.running) break;
            }
        }
    }

    // Player vs Aliens
    if (!player.invincible) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            const alien = aliens[j];
            if (!alien.active) continue;
            const playerHitbox = {
                x: player.x - player.width / 3,
                y: player.y - player.height / 3,
                width: player.width * 0.67,
                height: player.height * 0.67,
            };
            if (checkCollision(playerHitbox, alien)) {
                game.handlePlayerHit(alien, j);
                if (!game.running) break;
                if (player.invincible) break;
            }
        }
    }

    // Player vs Items
    for (let k = items.length - 1; k >= 0; k--) {
        const item = items[k];
        if (!item.active) continue;
        if (checkCollision(player, item)) {
            item.applyEffect(player, game);
            item.active = false;
        }
    }

    // Debris vs Aliens
    particleManager.checkDebrisCollisions(aliens, game);
}
