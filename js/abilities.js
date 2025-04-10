// js/abilities.js

class AbilityManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.abilities = {};
        // Track the order of ability acquisition for removing the oldest on death
        this.abilityAcquisitionOrder = [];
        // Only bulletMode is initially unlocked
        this.unlockedAbilities = new Set();
        this.initializeAbilities();
    }

    initializeAbilities() {
        const config = GAME_CONFIG.abilities;

        for (const key in config) {
            if (!GAME_CONFIG.abilities.hasOwnProperty(key)) continue; // Ensure it's an ability config

            this.abilities[key] = {
                key: key,
                cooldown: 0,
                maxCooldown: config[key].maxCooldown,
                duration: 0,
                maxDuration: config[key].duration,
                ready: false,
                active: false,
                element: document.getElementById(`ability-${key}`),
                timerElement: document.getElementById(`${key}Timer`),
            };

            // Only bulletMode is unlocked by default
            if (key === 'bulletMode') {
                this.unlockedAbilities.add(key);
                this.abilities[key].ready = true;
            }
        }
        this.updateAllUI(); // Initial UI setup (shows locked state)
    }

    // Unlock a specific ability
    unlockAbility(key) {
        if (this.isUnlocked(key)) return false; // Already unlocked

        if (this.abilities[key]) {
            this.unlockedAbilities.add(key);
            this.abilities[key].ready = true; // Becomes ready immediately upon unlock
            this.abilities[key].cooldown = 0; // Ensure cooldown is zeroed

            // Add to acquisition order to track which was acquired first
            this.abilityAcquisitionOrder.push(key);

            console.log(`Ability Unlocked: ${key}`);
            this.updateAbilityUI(key);
            return true;
        }
        return false;
    }

    isUnlocked(key) {
        return this.unlockedAbilities.has(key);
    }

    isReady(key) {
        const ability = this.abilities[key];
        // Must be unlocked AND cooldown ready
        return ability && this.isUnlocked(key) && ability.ready;
    }

    isActive(key) {
        // Must be unlocked AND duration active
        const ability = this.abilities[key];
        return ability && this.isUnlocked(key) && ability.active;
    }

    activate(key) {
        const ability = this.abilities[key];
        // Check if ready (which includes unlocked check)
        if (!ability || !this.isReady(key)) return false;

        if (key === 'bulletMode') {
            this.triggerVisualFeedback(key);
            return true; // Bullet mode doesn't have cooldown/duration here
        }

        ability.ready = false;
        ability.cooldown = ability.maxCooldown;

        if (ability.maxDuration > 0) {
            ability.active = true;
            ability.duration = ability.maxDuration;
            if (ability.timerElement) {
                this.uiManager.updateDurationTimer(ability.timerElement, ability.duration, true);
            }
        }

        this.triggerVisualFeedback(key);
        this.updateAbilityUI(key);

        return true;
    }

    update(deltaTime) {
        let uiNeedsUpdate = false;
        for (const key in this.abilities) {
            const ability = this.abilities[key];

            // Don't update cooldown/duration if not unlocked (unless it's bullet mode)
            if (!this.isUnlocked(key) && key !== 'bulletMode') continue;

            if (!ability.ready) {
                ability.cooldown -= deltaTime;
                if (ability.cooldown <= 0) {
                    ability.cooldown = 0;
                    ability.ready = true;
                    if (this.isUnlocked(key)) { // Only flash if unlocked
                        this.uiManager.triggerAbilityReadyFlash(ability.element);
                    }
                }
                uiNeedsUpdate = true;
            }

            if (ability.active) {
                ability.duration -= deltaTime;
                if (ability.timerElement) {
                    this.uiManager.updateDurationTimer(ability.timerElement, ability.duration);
                }
                if (ability.duration <= 0) {
                    ability.duration = 0;
                    ability.active = false;
                    if (ability.timerElement) {
                        this.uiManager.updateDurationTimer(ability.timerElement, 0, false);
                    }
                    uiNeedsUpdate = true;
                }
            }
        }

        if (uiNeedsUpdate) {
            this.updateAllUI();
        }
    }

    triggerVisualFeedback(key) {
        const ability = this.abilities[key];
        if (ability && ability.element && this.isUnlocked(key)) { // Only feedback if unlocked
            this.uiManager.triggerAbilityFeedback(ability.element);
        }
        if (key === 'bulletMode') {
            this.uiManager.updateBulletModeIcon( /* need current mode */);
        }
    }

    updateBulletModeVisuals(mode) {
        const ability = this.abilities['bulletMode'];
        if (ability && ability.element) {
            this.uiManager.updateBulletModeIcon(ability.element, mode);
        }
    }

    updateAbilityUI(key) {
        const ability = this.abilities[key];
        if (!ability || !ability.element) return;

        const isLocked = !this.isUnlocked(key);
        this.uiManager.updateAbilityLockState(ability.element, isLocked);

        if (!isLocked) {
            const cooldownPercent = ability.maxCooldown > 0 ? (ability.cooldown / ability.maxCooldown) : 0;
            this.uiManager.updateAbilityCooldownVisual(ability.element, cooldownPercent, !ability.ready);
            this.uiManager.updateAbilityActiveState(ability.element, ability.active);
        } else {
            // Ensure locked state visuals override others
            this.uiManager.updateAbilityCooldownVisual(ability.element, 0, false); // Hide cooldown overlay
            this.uiManager.updateAbilityActiveState(ability.element, false); // Hide active state
        }
    }

    updateAllUI() {
        for (const key in this.abilities) {
            this.updateAbilityUI(key);
        }
        // Ensure bullet mode visual is correct initially/on reset
        this.updateBulletModeVisuals('spread');
    }

    // Remove the oldest ability when player dies
    resetUnlocksOnDeath() {
        // Always keep the bulletMode ability
        if (this.abilityAcquisitionOrder.length > 0) {
            // Get the oldest ability that's not bulletMode
            const oldestAbilityKey = this.abilityAcquisitionOrder.shift();

            if (oldestAbilityKey) {
                console.log(`Removing oldest ability: ${oldestAbilityKey}`);
                this.unlockedAbilities.delete(oldestAbilityKey);

                // Reset the ability's state
                const ability = this.abilities[oldestAbilityKey];
                if (ability) {
                    ability.ready = false;
                    ability.active = false;
                    ability.cooldown = 0;
                    ability.duration = 0;

                    // Update UI to show locked state
                    this.updateAbilityUI(oldestAbilityKey);
                }
            }
        }

        // Return true if there was an ability to remove
        return this.abilityAcquisitionOrder.length > 0;
    }

    // Full reset for new game
    reset() {
        // Clear all unlocked abilities except bulletMode
        this.unlockedAbilities = new Set(['bulletMode']);
        this.abilityAcquisitionOrder = [];

        // Reset all abilities to default state
        for (const key in this.abilities) {
            const ability = this.abilities[key];
            ability.ready = key === 'bulletMode'; // Only bulletMode is ready
            ability.active = false;
            ability.cooldown = 0;
            ability.duration = 0;
        }

        this.updateAllUI();
    }
}


