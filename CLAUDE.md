# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Space Defender Evolved is a browser-based 2D space shooter game built with vanilla JavaScript and HTML5 Canvas. The game features a player ship defending against waves of alien enemies with progressively increasing difficulty, power-ups, abilities, and a leveling system.

## Development Setup

This is a static web application - no build process required. Simply open `index.html` in a browser to run the game.

For development:
- Use a local web server (e.g., `python -m http.server 8000` or Live Server extension)
- The game requires loading ES modules, so file:// protocol won't work in most browsers

## Architecture

### Core Module Structure

- **`js/main.js`** - Entry point, initializes game and sets up event listeners
- **`js/game.js`** - Main Game class containing game loop, state management, and entity coordination
- **`js/config.js`** - All game configuration constants and tuning parameters
- **`js/entities.js`** - Entity classes (Player, Alien, Bullet, Rocket, etc.) with game logic
- **`js/drawing.js`** - Canvas rendering utilities, starfield, and visual effects
- **`js/input.js`** - Input handling for mouse, keyboard, and touch
- **`js/ui.js`** - UI state management and DOM updates
- **`js/abilities.js`** - Ability system for special powers (rockets, wingmen, mini ships)
- **`js/audio.js`** - Audio system with dynamic music based on game level
- **`js/utils.js`** - Helper functions for collision detection, math utilities
- **`js/services/CollisionService.js`** - Centralized collision detection logic

### Game Systems

**Entity Management**: Game class manages arrays of entities (bullets, aliens, items, etc.) with update/render loops

**Collision System**: Service-based collision detection between bullets, aliens, player, and items

**Ability System**: Three unlockable abilities (rockets, wingmen, mini ships) with cooldowns and durations

**Leveling**: Player ship grows and gains power through alien kills and score progression

**Audio System**: Dynamic music that changes based on game level (1-5, 6-15, 16+)

**Configuration-Driven**: All game parameters centralized in `config.js` for easy tuning

### Key Game Mechanics

- **Weapon Modes**: Spread vs Parallel bullet patterns, switchable with SPACE key
- **Shield System**: Player has energy shield that absorbs hits and recharges over time
- **Enemy Types**: Scouts (spawn fighters when escaping), Fighters (hover and shoot), Elites (heavy armor)
- **Power-ups**: XP stars, extra lives, bombs, and ability items dropped by enemies
- **Progressive Difficulty**: Spawn rates, enemy speed, and health scale with level

## Development Utilities

Several Python scripts are included for project management:
- `concatenate_sources.py` - Combines all JS files for analysis
- `split_sources.py` - Splits concatenated files back to individual modules
- `update_project_files.py` - Updates project structure documentation
- `make_proj.py` - Project build/packaging utility

## Known Issues

Refer to `buglist.txt` for current bugs:
- Rocket explosions need proper area damage implementation
- Ability unlock bar resets incorrectly on player death
- Active power-ups should persist through death

## Future Features

See `newfeatures.txt` for planned enhancements including boss battles, safe areas, global rankings, and galaxy map.