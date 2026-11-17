import { Scene } from 'phaser';
import { bindResize } from '../layout';
import { drawCreamPanel } from '../parkTheme';
import type { Game } from './Game';

interface PauseData
{
    stageNumber?: number;
    found?: number;
    total?: number;
    remainingMs?: number;
}

/** Separate overlay remains interactive while the gameplay scene is genuinely paused. */
export class PauseMenu extends Scene
{
    private shade: Phaser.GameObjects.Graphics;
    private blocker: Phaser.GameObjects.Zone;
    private decoration: Phaser.GameObjects.Graphics;
    private title: Phaser.GameObjects.Text;
    private info: Phaser.GameObjects.Text;
    private summary: Phaser.GameObjects.Text;
    private timeLabel: Phaser.GameObjects.Text;
    private continueLabel: Phaser.GameObjects.Text;
    private exitLabel: Phaser.GameObjects.Text;
    private note: Phaser.GameObjects.Text;
    private closeLabel: Phaser.GameObjects.Text;
    private continueButton: Phaser.GameObjects.Zone;
    private exitButton: Phaser.GameObjects.Zone;
    private closeButton: Phaser.GameObjects.Zone;
    private leaving = false;

    constructor ()
    {
        super('PauseMenu');
    }

    create (data: PauseData = {})
    {
        this.leaving = false;
        this.sys.settings.data = {};
        this.shade = this.add.graphics().setDepth(-1);
        this.blocker = this.add.zone(0, 0, 1, 1).setOrigin(0)
            .setInteractive().setData('ui', true);
        this.decoration = this.add.graphics().setDepth(1);
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#945622',
            align: 'center'
        };
        this.title = this.add.text(0, 0, '游戏已暂停', {
            ...style, fontSize: 44, fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5).setDepth(2);
        this.info = this.add.text(0, 0, '倒计时已暂停，当前进度已保留', {
            ...style, fontSize: 23, color: '#a4875c'
        }).setOrigin(0.5).setDepth(2);
        this.summary = this.add.text(0, 0, `第${data.stageNumber ?? 1}关 · 已找到 ${data.found ?? 0}/${data.total ?? 0} 处不同`, {
            ...style, fontSize: 24, color: '#a57d49'
        }).setOrigin(0.5).setDepth(2);
        const seconds = Math.ceil((data.remainingMs ?? 60000) / 1000);
        const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        this.timeLabel = this.add.text(0, 0, `剩余时间 ${time}`, {
            ...style, fontSize: 24, fontStyle: 'bold', color: '#677c36'
        }).setOrigin(0.5).setDepth(2);
        this.continueLabel = this.add.text(0, 0, '继续游戏', {
            ...style, fontSize: 32, fontStyle: 'bold', color: '#ffffff', stroke: '#bb7330', strokeThickness: 3
        }).setOrigin(0.5).setDepth(2);
        this.exitLabel = this.add.text(0, 0, '退出并返回主菜单', {
            ...style, fontSize: 28
        }).setOrigin(0.5).setDepth(2);
        this.note = this.add.text(0, 0, '退出后将结束本次挑战', {
            ...style, fontSize: 19, color: '#a4875c'
        }).setOrigin(0.5).setDepth(2);
        this.closeLabel = this.add.text(0, 0, '×', {
            ...style, fontSize: 32, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2);
        this.continueButton = this.add.zone(0, 0, 1, 1).setInteractive().setData('ui', true).setDepth(5);
        this.exitButton = this.add.zone(0, 0, 1, 1).setInteractive().setData('ui', true).setDepth(5);
        this.closeButton = this.add.zone(0, 0, 1, 1).setInteractive().setData('ui', true).setDepth(5);
        this.continueButton.on('pointerdown', () => this.leave(false));
        this.closeButton.on('pointerdown', () => this.leave(false));
        this.exitButton.on('pointerdown', () => this.leave(true));
        this.layout();
        bindResize(this, () => this.layout());
        this.scene.bringToTop();
    }

    private leave (exit: boolean)
    {
        if (this.leaving)
        {
            return;
        }

        this.leaving = true;
        const game = this.scene.get('Game') as Game;

        if (exit)
        {
            game.exitToMainMenu();
        }
        else
        {
            game.resumeFromMenu();
        }
    }

    private layout ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        const unit = Math.min(width / 720, height / 1000, 1.15);
        const centerX = width / 2;
        const cardWidth = Math.min(width * 0.84, 560 * unit);
        const cardHeight = 478 * unit;
        const left = centerX - cardWidth / 2;
        const top = height / 2 - cardHeight / 2;
        this.shade.clear().fillStyle(0x3e3025, 0.54).fillRect(0, 0, width, height);
        this.blocker.setSize(width, height, true);
        const graphics = this.decoration;
        graphics.clear();
        drawCreamPanel(graphics, left, top, cardWidth, cardHeight, 32 * unit, 4 * unit);

        const closeX = left + cardWidth - 32 * unit;
        const closeY = top + 32 * unit;
        graphics.fillStyle(0xf5e6c2, 1);
        graphics.fillCircle(closeX, closeY, 21 * unit);
        this.closeButton.setPosition(closeX, closeY).setSize(48 * unit, 48 * unit, true);
        this.closeLabel.setFontSize(Math.round(32 * unit)).setPosition(closeX, closeY - unit);

        const buttonWidth = cardWidth - 90 * unit;
        const continueY = top + 291 * unit;
        const continueHeight = 74 * unit;
        graphics.fillStyle(0xc18430, 1);
        graphics.fillRoundedRect(centerX - buttonWidth / 2, continueY - continueHeight / 2 + 5 * unit, buttonWidth, continueHeight, 37 * unit);
        graphics.fillGradientStyle(0xffd76a, 0xffd76a, 0xf1ad43, 0xf1ad43, 1);
        graphics.fillRoundedRect(centerX - buttonWidth / 2, continueY - continueHeight / 2, buttonWidth, continueHeight, 37 * unit);
        graphics.lineStyle(3 * unit, 0xda9b37, 1);
        graphics.strokeRoundedRect(centerX - buttonWidth / 2, continueY - continueHeight / 2, buttonWidth, continueHeight, 37 * unit);
        graphics.lineStyle(2 * unit, 0xffedb4, 1);
        graphics.strokeRoundedRect(centerX - buttonWidth / 2 + 5 * unit, continueY - continueHeight / 2 + 5 * unit, buttonWidth - 10 * unit, continueHeight - 10 * unit, 32 * unit);
        const exitY = top + 384 * unit;
        const exitHeight = 64 * unit;
        drawCreamPanel(graphics, centerX - buttonWidth / 2, exitY - exitHeight / 2, buttonWidth, exitHeight, 32 * unit, 2 * unit);
        this.continueButton.setPosition(centerX, continueY).setSize(buttonWidth, continueHeight, true);
        this.exitButton.setPosition(centerX, exitY).setSize(buttonWidth, exitHeight, true);

        this.title.setFontSize(Math.round(44 * unit)).setPosition(centerX, top + 84 * unit);
        this.info.setFontSize(Math.round(23 * unit)).setPosition(centerX, top + 138 * unit);
        this.summary.setFontSize(Math.round(24 * unit)).setPosition(centerX, top + 180 * unit);
        this.timeLabel.setFontSize(Math.round(24 * unit)).setPosition(centerX, top + 217 * unit);
        this.continueLabel.setFontSize(Math.round(32 * unit)).setPosition(centerX, continueY);
        this.exitLabel.setFontSize(Math.round(28 * unit)).setPosition(centerX, exitY);
        this.note.setFontSize(Math.round(19 * unit)).setPosition(centerX, top + 439 * unit);
    }
}
