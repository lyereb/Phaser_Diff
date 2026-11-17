import { Scene } from 'phaser';
import { DebugPanel } from '../debugPanel';
import { bindResize } from '../layout';
import { attachSpotDebug } from '../spotDebug';
import { ParkBackdrop, drawCreamPanel, drawStar } from '../parkTheme';

export class LevelClear extends Scene
{
    private backdrop: ParkBackdrop;
    private decoration: Phaser.GameObjects.Graphics;
    private medal: Phaser.GameObjects.Container;
    private title: Phaser.GameObjects.Text;
    private subtitle: Phaser.GameObjects.Text;
    private prompt: Phaser.GameObjects.Text;
    private note: Phaser.GameObjects.Text;
    private debugPanel: DebugPanel;
    private continuing = false;

    constructor ()
    {
        super('LevelClear');
    }

    create ()
    {
        this.continuing = false;
        this.cameras.main.setBackgroundColor(0xffe7cf);
        this.backdrop = new ParkBackdrop(this);
        this.decoration = this.add.graphics();

        const badge = this.add.graphics();
        badge.fillStyle(0xf3aa62, 1);
        badge.fillTriangle(-45, 35, -14, 48, -40, 91);
        badge.fillTriangle(45, 35, 14, 48, 40, 91);
        badge.fillStyle(0x9c612b, 0.15);
        badge.fillCircle(0, 6, 69);
        badge.fillStyle(0xfff9e3, 1);
        badge.fillCircle(0, 0, 69);
        badge.lineStyle(4, 0xe3aa48, 1);
        badge.strokeCircle(0, 0, 69);
        badge.lineStyle(2, 0xffe2a0, 1);
        badge.strokeCircle(0, 0, 60);
        drawStar(badge, 0, 0, 48);
        this.medal = this.add.container(0, 0, [ badge ]);

        const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#945622',
            align: 'center'
        };
        this.title = this.add.text(0, 0, '太棒啦！', {
            ...textStyle,
            fontSize: 52,
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 5
        }).setOrigin(0.5);
        const stage = this.registry.get('spotStage') as number | undefined ?? 1;
        this.subtitle = this.add.text(0, 0, `第${stage}关挑战成功`, {
            ...textStyle,
            fontSize: 25,
            color: '#a57d49'
        }).setOrigin(0.5);
        this.prompt = this.add.text(0, 0, '点击进入下一关', {
            ...textStyle,
            fontSize: 34,
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#bb7330',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.note = this.add.text(0, 0, '点击屏幕任意位置继续', {
            ...textStyle,
            fontSize: 22,
            color: '#a4875c'
        }).setOrigin(0.5);

        this.debugPanel = attachSpotDebug(this);
        this.layout();
        bindResize(this, () => this.layout());

        this.tweens.add({
            targets: this.medal,
            angle: { from: -4, to: 4 },
            duration: 1800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        this.tweens.add({
            targets: this.prompt,
            alpha: { from: 0.85, to: 1 },
            duration: 900,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Preserve the existing tap-anywhere flow, including debug UI isolation.
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
        {
            const hitUi = this.input.hitTestPointer(pointer).some(object => object.getData('ui'));

            if (hitUi || this.continuing)
            {
                return;
            }

            this.continuing = true;
            this.scene.start('Game');
        });
    }

    private layout ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        const unit = Math.min(width / 720, height / 1000, 1.15);
        const centerX = width / 2;
        const cardWidth = Math.min(width * 0.82, 560 * unit);
        const cardHeight = 420 * unit;
        const left = centerX - cardWidth / 2;
        const top = height * 0.5 - cardHeight / 2;
        const graphics = this.decoration;

        this.backdrop.layout(width, height);
        graphics.clear();
        drawCreamPanel(graphics, left, top, cardWidth, cardHeight, 36 * unit, 4 * unit);
        drawStar(graphics, left - 15 * unit, top + 80 * unit, 15 * unit);
        drawStar(graphics, left + cardWidth + 12 * unit, top + 125 * unit, 11 * unit);

        const buttonWidth = cardWidth - 90 * unit;
        const buttonHeight = 76 * unit;
        const buttonTop = top + 237 * unit;
        graphics.fillStyle(0xc18430, 1);
        graphics.fillRoundedRect(centerX - buttonWidth / 2, buttonTop + 5 * unit, buttonWidth, buttonHeight, 38 * unit);
        graphics.fillGradientStyle(0xffd76a, 0xffd76a, 0xf1ad43, 0xf1ad43, 1);
        graphics.fillRoundedRect(centerX - buttonWidth / 2, buttonTop, buttonWidth, buttonHeight, 38 * unit);
        graphics.lineStyle(3 * unit, 0xda9b37, 1);
        graphics.strokeRoundedRect(centerX - buttonWidth / 2, buttonTop, buttonWidth, buttonHeight, 38 * unit);
        graphics.lineStyle(2 * unit, 0xffedb4, 1);
        graphics.strokeRoundedRect(centerX - buttonWidth / 2 + 5 * unit, buttonTop + 5 * unit, buttonWidth - 10 * unit, buttonHeight - 10 * unit, 33 * unit);

        this.medal.setPosition(centerX, top + 8 * unit).setScale(unit);
        this.title.setFontSize(Math.round(52 * unit));
        this.title.setPosition(centerX, top + 119 * unit);
        this.subtitle.setFontSize(Math.round(25 * unit));
        this.subtitle.setPosition(centerX, top + 179 * unit);
        this.prompt.setFontSize(Math.round(34 * unit));
        this.prompt.setPosition(centerX, buttonTop + buttonHeight / 2);
        this.note.setFontSize(Math.round(22 * unit));
        this.note.setPosition(centerX, top + 365 * unit);
        this.debugPanel.layout(width, height);
    }
}
