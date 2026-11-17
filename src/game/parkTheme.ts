import { GameObjects, Math as PhaserMath, Scene } from 'phaser';
import { coverImage } from './layout';

/** A quiet version of the main menu's sunny, warm cartoon park. */
export class ParkBackdrop
{
    private image: GameObjects.Image;
    private wash: GameObjects.Graphics;

    constructor (scene: Scene, private readonly softened = false)
    {
        this.image = scene.add.image(0, 0, 'park-background').setDepth(-20);
        this.wash = scene.add.graphics().setDepth(-19);
    }

    layout (width: number, height: number)
    {
        coverImage(this.image, width, height);
        this.wash.clear();

        // Keep the gameplay photos as the highest-contrast area on screen.
        if (this.softened)
        {
            this.wash.fillStyle(0xfff7e5, 0.2);
            this.wash.fillRect(0, 0, width, height);
        }
    }
}

export function drawCreamPanel (
    graphics: GameObjects.Graphics,
    x: number, y: number, width: number, height: number, radius: number,
    stroke = 3
)
{
    graphics.fillStyle(0x8b542b, 0.16);
    graphics.fillRoundedRect(x, y + 6, width, height, radius);
    graphics.fillStyle(0xfff7df, 1);
    graphics.fillRoundedRect(x, y, width, height, radius);
    graphics.lineStyle(stroke, 0xdba14b, 1);
    graphics.strokeRoundedRect(x, y, width, height, radius);
    graphics.lineStyle(Math.max(1, stroke * 0.5), 0xffffff, 0.9);
    graphics.strokeRoundedRect(x + 4, y + 4, width - 8, height - 8, Math.max(2, radius - 4));
}

export function drawStar (
    graphics: GameObjects.Graphics,
    x: number, y: number, radius: number,
    color = 0xffd451, outline = 0xdf9635
)
{
    const points: PhaserMath.Vector2[] = [];

    for (let index = 0; index < 10; index++)
    {
        const angle = -Math.PI / 2 + index * Math.PI / 5;
        const size = index % 2 === 0 ? radius : radius * 0.49;
        points.push(new PhaserMath.Vector2(x + Math.cos(angle) * size, y + Math.sin(angle) * size));
    }

    graphics.fillStyle(color, 1);
    graphics.fillPoints(points, true);
    graphics.lineStyle(Math.max(2, radius * 0.055), outline, 1);
    graphics.strokePoints(points, true);
    graphics.fillStyle(0xfff3ac, 0.8);
    graphics.fillEllipse(x - radius * 0.13, y - radius * 0.24, radius * 0.3, radius * 0.17);
}
