import { Scene } from 'phaser';
import { bindResize, coverImage } from '../layout';
import { createMenuFrames, loadMenuAssets } from '../menu';
import { loadUiAudioAssets } from '../audio';

export class Preloader extends Scene
{
    private background: Phaser.GameObjects.Image;
    private barOutline: Phaser.GameObjects.Rectangle;
    private bar: Phaser.GameObjects.Rectangle;
    private progress = 0;

    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.background = this.add.image(0, 0, 'background');
        this.barOutline = this.add.rectangle(0, 0, 4, 32).setStrokeStyle(1, 0xffffff);
        this.bar = this.add.rectangle(0, 0, 4, 28, 0xffffff).setOrigin(0, 0.5);

        this.layout();
        bindResize(this, () => this.layout());

        this.load.on('progress', (progress: number) =>
        {
            this.progress = progress;
            this.drawBar();
        });
    }

    preload ()
    {
        this.load.setPath('assets');

        this.load.image('menu', 'menu.png');
        this.load.image('park-background', 'park-background.jpg');
        this.load.json('spot-diff', 'spot-diff/answers.json');
        this.load.audio('bgm-spot', 'audio/bgm-spot.wav');
        this.load.audio('sfx-found', 'audio/sfx-found.wav');
        loadMenuAssets(this);
        loadUiAudioAssets(this);
    }

    create ()
    {
        createMenuFrames(this);
        const data = this.cache.json.get('spot-diff') as { levels?: { id: number; a: string; b: string }[] } | undefined;
        const levels = data?.levels ?? [];

        if (levels.length === 0)
        {
            this.scene.start('MainMenu');
            return;
        }

        levels.forEach(level =>
        {
            this.load.image(`diff-${level.id}A`, `spot-diff/${level.a}`);
            this.load.image(`diff-${level.id}B`, `spot-diff/${level.b}`);
        });

        this.load.once('complete', () =>
        {
            this.scene.start('MainMenu');
        });
        this.load.start();
    }

    private layout ()
    {
        coverImage(this.background, this.scale.width, this.scale.height);
        this.drawBar();
    }

    private drawBar ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        const barWidth = Math.round(width * 0.72);
        const innerWidth = barWidth - 8;
        const y = height / 2;

        this.barOutline.setPosition(width / 2, y);
        this.barOutline.setSize(barWidth, 32);

        this.bar.setPosition((width - barWidth) / 2 + 4, y);
        this.bar.width = Math.max(4, innerWidth * this.progress);
    }
}
