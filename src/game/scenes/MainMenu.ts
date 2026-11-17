import { GameObjects, Input, Scene } from 'phaser';
import { applyAudioSettings, playSfx } from '../audio';
import { DebugPanel } from '../debugPanel';
import { bindResize, coverImage } from '../layout';
import { MENU_BUTTONS, menuButtonFrame, MenuButtonId } from '../menu';
import { playPressBounce, PRESS_BOUNCE_MS } from '../pressBounce';
import { attachSpotDebug } from '../spotDebug';
import { showToast } from '../toast';
import { SETTINGS_SCENE } from './Settings';

type ButtonNode = { id: MenuButtonId; image: GameObjects.Image };

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    private buttons: ButtonNode[] = [];
    private started = false;
    private settingsOpen = false;
    private debugPanel: DebugPanel;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.started = false;
        this.settingsOpen = false;
        this.buttons = [];
        applyAudioSettings(this);
        this.background = this.add.image(0, 0, 'menu');

        MENU_BUTTONS.forEach(id =>
        {
            const art = menuButtonFrame(id);
            const image = this.add.image(0, 0, art.key, art.frame)
                .setOrigin(0.5).setDepth(3)
                .setInteractive({ useHandCursor: true }).setData('ui', true);
            image.on('pointerdown', (pointer: Input.Pointer) =>
            {
                if (pointer.button !== undefined && pointer.button !== 0) return;
                this.onButton(id, image);
            });
            this.buttons.push({ id, image });
        });

        // No screen-wide start handler: background, ranking, and settings never start a round.
        this.debugPanel = attachSpotDebug(this);
        this.layout();
        bindResize(this, () => this.layout());
        this.events.once('shutdown', () =>
        {
            if (this.settingsOpen)
            {
                this.settingsOpen = false;
                this.scene.stop(SETTINGS_SCENE);
            }
        });
    }

    private onButton (id: MenuButtonId, image: GameObjects.Image)
    {
        if (this.started || this.settingsOpen) return;
        playPressBounce(image, () => ({ x: image.getData('sx') as number, y: image.getData('sy') as number }));

        if (id === 'rank')
        {
            showToast(this, '功能未开放');
            return;
        }

        playSfx(this, 'ui');

        if (id === 'settings')
        {
            this.settingsOpen = true;
            this.time.delayedCall(PRESS_BOUNCE_MS, () => this.openSettings());
            return;
        }

        this.started = true;
        this.time.delayedCall(PRESS_BOUNCE_MS, () =>
        {
            if (!this.started || !this.scene.isActive()) return;
            this.registry.set('spotDeck', []);
            this.registry.set('spotStage', 0);
            this.scene.start('Game', {});
        });
    }

    private openSettings ()
    {
        if (!this.settingsOpen || !this.scene.isActive()) return;
        this.scene.launch(SETTINGS_SCENE, {
            onClose: () =>
            {
                if (!this.settingsOpen) return;
                this.settingsOpen = false;

                if (this.scene.isPaused())
                {
                    this.layout();
                    // Restore immediately, never queue a stale resume after menu shutdown.
                    this.sys.resume();
                }
            }
        });
        this.scene.pause();
    }

    private place (id: MenuButtonId, x: number, y: number, displayWidth: number)
    {
        const image = this.buttons.find(button => button.id === id)!.image;
        const art = menuButtonFrame(id);
        this.tweens.killTweensOf(image);
        image.setDisplaySize(displayWidth, displayWidth * art.h / art.w).setPosition(x, y);
        image.setData('sx', image.scaleX);
        image.setData('sy', image.scaleY);
        image.setData('dw', image.displayWidth);
        image.setData('dh', image.displayHeight);
    }

    private layout ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        coverImage(this.background, width, height);
        const buttonWidth = Math.min(width * 0.58, 440, height * 0.44);
        const startArt = menuButtonFrame('start');
        const rankArt = menuButtonFrame('rank');
        const startHeight = buttonWidth * startArt.h / startArt.w;
        const rankHeight = buttonWidth * rankArt.h / rankArt.w;
        const gap = Math.max(24, Math.min(36, height * 0.022));
        const totalHeight = startHeight + gap + rankHeight;
        const top = height * 0.58 - totalHeight / 2;
        this.place('start', width / 2, top + startHeight / 2, buttonWidth);
        this.place('rank', width / 2, top + startHeight + gap + rankHeight / 2, buttonWidth);

        const settingsWidth = 96;
        const settingsArt = menuButtonFrame('settings');
        const settingsHeight = settingsWidth * settingsArt.h / settingsArt.w;
        this.place('settings', width - 20 - settingsWidth / 2, 20 + settingsHeight / 2, settingsWidth);
        this.debugPanel.layout(width, height, 132);
    }
}
