// js/entities_new.js
// Compatibility layer for new entity architecture

// Import from new architecture
import { Entity } from './entities/base/Entity.js';
import { Player } from './entities/player/Player.js';
import { Bullet } from './entities/projectiles/Bullet.js';
import { Rocket } from './entities/projectiles/Rocket.js';

// Temporary imports from old entities.js for classes not yet split
import { 
    Alien, 
    Particle, 
    Debris, 
    Wingman, 
    MiniShip, 
    Item, 
    ParticleManager 
} from './entities.js';

// Re-export everything for backward compatibility
export {
    Entity,
    Player,
    Bullet,
    Rocket,
    Alien,
    Particle,
    Debris,
    Wingman,
    MiniShip,
    Item,
    ParticleManager
};