import { Scene } from 'phaser';
import { DebugPanel } from '../debugPanel';
import { bindResize } from '../layout';
import { ParkBackdrop, drawCreamPanel } from '../parkTheme';
import { attachSpotDebug } from '../spotDebug';

interface FailureData
{
    levelId?: number;
    stageNumber?: number;
    found?: number;
    total?: number;
}

export class GameOver extends Scene
{
    private backdrop: ParkBackdrop;
    private decoration: Phaser.GameObjects.Graphics;
    private title: Phaser.GameObjects.Text;
    private result: Phaser.GameObjects.Text;
    private encouragement: Phaser.GameObjects.Text;
    private retryLabel: Phaser.GameObjects.Text;
    private menuLabel: Phaser.GameObjects.Text;
    private retryButton: Phaser.GameObjects.Zone;
    private menuButton: Phaser.GameObjects.Zone;
    private debugPanel: DebugPanel;
    private levelId?: number;
    private leaving = false;

    constructor ()
    {
        super('GameOver');
    }

    create (data: FailureData = {})
    {
        this.levelId = data.levelId;
        this.leaving = false;
        this.cameras.main.setBackgroundColor(0xffe7cf);
        this.backdrop = new ParkBackdrop(this);
        this.decoration = this.add.graphics();

        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#945622',
            align: 'center'
        };
        this.title = this.add.text(0, 0, '时间到！', {
            ...style, fontSize: 48, fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5);
        const stage = data.stageNumber ?? this.registry.get('spotStage') ?? 1;
        this.result = this.add.text(0, 0, `第${stage}关 · 已找到 ${data.found ?? 0}/${data.total ?? 0} 处不同`, {
            ...style, fontSize: 24, color: '#a57d49'
        }).setOrigin(0.5);
        this.encouragement = this.add.text(0, 0, `本次已通过 ${Math.max(0, Number(stage) - 1)} 关`, {
            ...style, fontSize: 23, color: '#a4875c'
        }).setOrigin(0.5);
        this.retryLabel = this.add.text(0, 0, '重新挑战本关', {
            ...style, fontSize: 27, color: '#986933'
        }).setOrigin(0.5);
        this.menuLabel = this.add.text(0, 0, '返回主菜单', {
            ...style, fontSize: 32, fontStyle: 'bold', color: '#ffffff', stroke: '#bb7330', strokeThickness: 3
        }).setOrigin(0.5);
        this.retryButton = this.add.zone(0, 0, 1, 1).setInteractive().setData('ui', true);
        this.menuButton = this.add.zone(0, 0, 1, 1).setInteractive().setData('ui', true);
        this.retryButton.on('pointerdown', () => this.leave(true));
        this.menuButton.on('pointerdown', () => this.leave(false));

        this.debugPanel = attachSpotDebug(this);
        this.layout();
        bindResize(this, () => this.layout());
    }

    private leave (retry: boolean)
    {
        if (this.leaving)
        {
            return;
        }

        this.leaving = true;

        if (retry && this.levelId !== undefined)
        {
            this.scene.start('Game', { retryLevelId: this.levelId });
        }
        else
        {
            this.sound.get('bgm-spot')?.stop();
            this.scene.start('MainMenu', {});
        }
    }

    private layout ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        const unit = Math.min(width / 720, height / 1000, 1.15);
        const centerX = width / 2;
        const cardWidth = Math.min(width * 0.84, 560 * unit);
        const cardHeight = 440 * unit;
        const left = centerX - cardWidth / 2;
        const top = height / 2 - cardHeight / 2;
        const graphics = this.decoration;
        this.backdrop.layout(width, height);
        graphics.clear();
        drawCreamPanel(graphics, left, top, cardWidth, cardHeight, 36 * unit, 4 * unit);

        const clockY = top + 4 * unit;
        graphics.fillStyle(0xfff9e3, 1);
        graphics.fillCircle(centerX, clockY, 59 * unit);
        graphics.lineStyle(4 * unit, 0xdfa052, 1);
        graphics.strokeCircle(centerX, clockY, 59 * unit);
        graphics.lineStyle(3 * unit, 0xe0b76f, 1);
        graphics.strokeCircle(centerX, clockY, 46 * unit);
        graphics.lineStyle(5 * unit, 0xc78041, 1);
        graphics.beginPath();
        graphics.moveTo(centerX, clockY - 25 * unit);
        graphics.lineTo(centerX, clockY);
        graphics.lineTo(centerX + 21 * unit, clockY + 13 * unit);
        graphics.strokePath();
        graphics.fillStyle(0xc78041, 1);
        graphics.fillCircle(centerX, clockY, 4 * unit);

        const buttonWidth = cardWidth - 90 * unit;
        const retryY = top + 267 * unit;
        const retryHeight = 74 * unit;
        graphics.fillStyle(0xc18430, 1);
        graphics.fillRoundedRect(centerX - buttonWidth / 2, retryY - retryHeight / 2 + 5 * unit, buttonWidth, retryHeight, 37 * unit);
        graphics.fillGradientStyle(0xffd76a, 0xffd76a, 0xf1ad43, 0xf1ad43, 1);
        graphics.fillRoundedRect(centerX - buttonWidth / 2, retryY - retryHeight / 2, buttonWidth, retryHeight, 37 * unit);
        graphics.lineStyle(3 * unit, 0xda9b37, 1);
        graphics.strokeRoundedRect(centerX - buttonWidth / 2, retryY - retryHeight / 2, buttonWidth, retryHeight, 37 * unit);
        graphics.lineStyle(2 * unit, 0xffedb4, 1);
        graphics.strokeRoundedRect(centerX - buttonWidth / 2 + 5 * unit, retryY - retryHeight / 2 + 5 * unit, buttonWidth - 10 * unit, retryHeight - 10 * unit, 32 * unit);

        const menuY = top + 365 * unit;
        const menuHeight = 58 * unit;
        drawCreamPanel(graphics, centerX - buttonWidth / 2, menuY - menuHeight / 2, buttonWidth, menuHeight, 29 * unit, 2 * unit);
        this.menuButton.setPosition(centerX, retryY).setSize(buttonWidth, retryHeight, true);
        this.retryButton.setPosition(centerX, menuY).setSize(buttonWidth, menuHeight, true);
        // Keep hit areas synchronized after window/orientation changes.
        this.retryButton.setInteractive();
        this.menuButton.setInteractive();

        this.title.setFontSize(Math.round(48 * unit)).setPosition(centerX, top + 103 * unit);
        this.result.setFontSize(Math.round(24 * unit)).setPosition(centerX, top + 156 * unit);
        this.encouragement.setFontSize(Math.round(23 * unit)).setPosition(centerX, top + 191 * unit);
        this.menuLabel.setFontSize(Math.round(32 * unit)).setPosition(centerX, retryY);
        this.retryLabel.setFontSize(Math.round(27 * unit)).setPosition(centerX, menuY);
        this.debugPanel.layout(width, height);
    }
}
