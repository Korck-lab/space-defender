import os


def create_empty_file(file_path: str) -> None:
    directory = os.path.dirname(file_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)
    open(file_path, "w").close()


def main() -> None:
    paths = [
        "./index.html",
        "./css/main.css",
        "./css/ui.css",
        "./js/config.js",
        "./js/game.js",
        "./js/entities/Player.js",
        "./js/entities/Alien.js",
        "./js/entities/Bullet.js",
        "./js/entities/Rocket.js",
        "./js/entities/Particle.js",
        "./js/entities/Debris.js",
        "./js/entities/Wingman.js",
        "./js/entities/MiniShip.js",
        "./js/abilities/Ability.js",
        "./js/abilities/BulletMode.js",
        "./js/abilities/Rocket.js",
        "./js/abilities/Wingman.js",
        "./js/abilities/MiniShip.js",
        "./js/utils/drawing.js",
        "./js/utils/collision.js",
        "./js/utils/math.js",
    ]

    for path in paths:
        create_empty_file(path)


if __name__ == "__main__":
    main()
