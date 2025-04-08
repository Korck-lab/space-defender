// js/utils.js

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamps a number between a minimum and maximum value.
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Simple Axis-Aligned Bounding Box (AABB) collision detection.
 * Assumes objects have x, y, width, height properties.
 * Note: x, y are often top-left corners in this context.
 */
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

/**
 * Calculates the distance between two points (objects with x, y).
 */
function distance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Finds the closest entity from a list to a source entity.
 * Assumes entities have x, y properties.
 * Returns the closest entity or null if the list is empty.
 */
function findClosestEntity(source, targets) {
    let closest = null;
    let minDistSq = Infinity; // Use squared distance for efficiency

    for (const target of targets) {
        // Skip dead targets if applicable (assuming a 'health' property > 0 means alive)
        if (target.health !== undefined && target.health <= 0) continue;

        const dx = source.x - target.x;
        const dy = source.y - target.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq) {
            minDistSq = distSq;
            closest = target;
        }
    }
    return closest;
}

/**
* Finds the furthest entity from a list to a source entity.
* Assumes entities have x, y properties.
* Returns the furthest entity or null if the list is empty.
*/
function findFurthestEntity(source, targets) {
   let furthest = null;
   let maxDistSq = -1; // Use squared distance

   for (const target of targets) {
       // Skip dead targets if applicable
       if (target.health !== undefined && target.health <= 0) continue;

       const dx = source.x - target.x;
       const dy = source.y - target.y;
       const distSq = dx * dx + dy * dy;

       if (distSq > maxDistSq) {
           maxDistSq = distSq;
           furthest = target;
       }
   }
   return furthest;
}


// Export functions if using modules, otherwise they are global
// export { getRandom, getRandomInt, clamp, checkCollision, distance, findClosestEntity, findFurthestEntity };

