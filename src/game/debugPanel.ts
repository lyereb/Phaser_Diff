import { GameObjects, Scene } from 'phaser';

/**
 * Debug corner UI.
 * - `npm run dev`: shown
 * - `npm run build`: hidden
 */
export const SHOW_DEBUG_UI = import.meta.env.DEV;

const MARGIN = 16;
const BUTTON_W = 112;
const BUTTON_H = 44;
const PANEL_W = 280;
const GAP = 8;
const ROW_H = 44;

type Row = {
    bg: GameObjects.Rectangle;
    label: GameObjects.Text;
};

/** Plain corner button and box. Clicks are marked `ui` so they do not start a level. */
export class DebugPanel
{
    private readonly enabled = SHOW_DEBUG_UI;
    private open = false;
    private buttonBg: GameObjects.Rectangle | null = null;
    private buttonLabel: GameObjects.Text | null = null;
    private panelBg: GameObjects.Rectangle | null = null;
    private panelTitle: GameObjects.Text | null = null;
    private status: GameObjects.Text | null = null;
    private rows: Row[] = [];

    constructor (scene: Scene, depth: number)
    {
        if (!this.enabled)
        {
            return;
        }

        this.buttonBg = scene.add.rectangle(0, 0, BUTTON_W, BUTTON_H, 0x222222)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(depth)
            .setInteractive()
            .setData('ui', true);

        this.buttonLabel = scene.add.text(0, 0, '调试', {
            fontFamily: 'Arial',
            fontSize: 22,
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

        this.panelBg = scene.add.rectangle(0, 0, PANEL_W, 160, 0x111111)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(depth)
            .setVisible(false)
            .setData('ui', true);

        this.panelTitle = scene.add.text(0, 0, '调试', {
            fontFamily: 'Arial',
            fontSize: 22,
            color: '#ffffff'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 1).setVisible(false);

        this.status = scene.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#d7d7d7',
            align: 'center',
            wordWrap: { width: PANEL_W - 36 }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 2).setVisible(false);

        this.buttonBg.on('pointerdown', () => this.toggle());
    }

    /** Stack a plain button under the title. Only receives clicks while the panel is open. */
    addButton (label: string, onClick: () => void)
    {
        if (!this.buttonBg)
        {
            return;
        }

        const depth = this.buttonBg.depth;
        const bg = this.buttonBg.scene.add.rectangle(0, 0, PANEL_W - 32, ROW_H, 0x333333)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(depth + 1)
            .setVisible(false)
            .setData('ui', true);
        const text = this.buttonBg.scene.add.text(0, 0, label, {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2).setVisible(false);

        bg.on('pointerdown', () => onClick());
        this.rows.push({ bg, label: text });
    }

    setStatus (message: string)
    {
        if (!this.status)
        {
            return;
        }

        this.status.setText(message);
    }

    close ()
    {
        if (this.open)
        {
            this.toggle();
        }
    }

    layout (width: number, height: number, rightInset = 0)
    {
        if (!this.buttonBg || !this.buttonLabel || !this.panelBg || !this.panelTitle || !this.status)
        {
            return;
        }

        const buttonX = width - MARGIN - BUTTON_W / 2 - rightInset;
        const buttonY = MARGIN + BUTTON_H / 2;
        const contentH = 56 + this.rows.length * (ROW_H + GAP) + 72;
        const panelH = Math.min(contentH, Math.max(160, height - buttonY - BUTTON_H / 2 - GAP - MARGIN));
        const panelX = width - MARGIN - PANEL_W / 2 - rightInset;
        const panelY = buttonY + BUTTON_H / 2 + GAP + panelH / 2;

        this.buttonBg.setPosition(buttonX, buttonY);
        this.buttonLabel.setPosition(buttonX, buttonY);

        this.panelBg.setSize(PANEL_W, panelH);
        this.panelBg.setPosition(panelX, panelY);
        this.panelTitle.setPosition(panelX, panelY - panelH / 2 + 14);

        const rowTop = panelY - panelH / 2 + 52;

        this.rows.forEach((row, index) =>
        {
            const y = rowTop + index * (ROW_H + GAP) + ROW_H / 2;

            row.bg.setPosition(panelX, y);
            row.label.setPosition(panelX, y);

            if (this.open)
            {
                row.bg.setInteractive();
            }
        });

        const lastRow = this.rows.length === 0 ? rowTop : rowTop + (this.rows.length - 1) * (ROW_H + GAP) + ROW_H;

        this.status.setPosition(panelX, lastRow + 16);
        this.status.setWordWrapWidth(PANEL_W - 36);

        if (this.open)
        {
            this.panelBg.setInteractive();
        }
    }

    private toggle ()
    {
        if (!this.buttonLabel || !this.panelBg || !this.panelTitle || !this.status)
        {
            return;
        }

        this.open = !this.open;
        this.buttonLabel.setText(this.open ? '关闭' : '调试');
        this.panelBg.setVisible(this.open);
        this.panelTitle.setVisible(this.open);
        this.status.setVisible(this.open);

        this.rows.forEach(row =>
        {
            row.bg.setVisible(this.open);
            row.label.setVisible(this.open);

            if (this.open)
            {
                row.bg.setInteractive();
            }
            else
            {
                row.bg.disableInteractive();
            }
        });

        if (this.open)
        {
            this.panelBg.setInteractive();
        }
        else
        {
            this.panelBg.disableInteractive();
        }
    }
}
