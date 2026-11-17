import { Scene } from 'phaser';
import { DebugPanel } from '../debugPanel';
import { bindResize } from '../layout';
import { applyAudioSettings } from '../audio';
import { attachSpotDebug } from '../spotDebug';
import { ParkBackdrop, drawCreamPanel, drawStar } from '../parkTheme';
import { RoundChallenge, ROUND_RULES } from '../roundChallenge';

interface SpotPoint
{
    x: number;
    y: number;
    r: number;
}

interface SpotLevel
{
    id: number;
    title: string;
    a: string;
    b: string;
    points: SpotPoint[];
}

interface SpotData
{
    levels: SpotLevel[];
}

function shuffle (list: number[])
{
    const copy = list.slice();

    for (let index = copy.length - 1; index > 0; index--)
    {
        const swap = Math.floor(Math.random() * (index + 1));
        const current = copy[index];
        copy[index] = copy[swap];
        copy[swap] = current;
    }

    return copy;
}

export class Game extends Scene
{
    private level: SpotLevel;
    private found = new Set<number>();
    private advancing = false;
    private round: RoundChallenge;
    private penaltyFlashUntil = 0;
    private timeBar: Phaser.GameObjects.Graphics;
    private timeText: Phaser.GameObjects.Text;
    private timeBarBounds = { x: 0, y: 0, width: 0, height: 0 };

    private stageNumber = 1;
    private imageA: Phaser.GameObjects.Image;
    private imageB: Phaser.GameObjects.Image;
    private rings: { point: SpotPoint, angle: number }[] = [];
    private ringA: Phaser.GameObjects.Graphics;
    private ringB: Phaser.GameObjects.Graphics;
    private levelText: Phaser.GameObjects.Text;
    private progress: Phaser.GameObjects.Graphics;
    private backdrop: ParkBackdrop;
    private decoration: Phaser.GameObjects.Graphics;
    private hint: Phaser.GameObjects.Text;
    private menuDecoration: Phaser.GameObjects.Graphics;
    private menuLabel: Phaser.GameObjects.Text;
    private menuButton: Phaser.GameObjects.Zone;
    private pausedBgm = false;
    private debugPanel: DebugPanel;

    constructor ()
    {
        super('Game');
    }

    create (data: { retryLevelId?: number } = {})
    {
        const answers = this.cache.json.get('spot-diff') as SpotData;
        this.level = this.takeLevel(answers.levels, data.retryLevelId);
        // Phaser retains scene data on starts without a new payload. Consume retry only once.
        this.sys.settings.data = {};
        this.found.clear();
        this.rings = [];
        this.advancing = false;
        this.penaltyFlashUntil = 0;
        this.pausedBgm = false;
        this.round = new RoundChallenge(performance.now());

        this.cameras.main.setBackgroundColor(0xffe7cf);
        this.backdrop = new ParkBackdrop(this, true);
        this.decoration = this.add.graphics().setDepth(-5);

        this.imageA = this.add.image(0, 0, `diff-${this.level.id}A`).setOrigin(0.5);
        this.imageB = this.add.image(0, 0, `diff-${this.level.id}B`).setOrigin(0.5);
        this.ringA = this.add.graphics();
        this.ringB = this.add.graphics();

        const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            fontSize: 36,
            fontStyle: 'bold',
            color: '#945622',
            stroke: '#ffffff',
            strokeThickness: 4
        };

        this.levelText = this.add.text(0, 0, `第${this.stageNumber}关`, labelStyle).setOrigin(0.5);
        this.progress = this.add.graphics();
        this.timeBar = this.add.graphics();
        this.timeText = this.add.text(0, 0, '01:00', {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            fontSize: 27,
            fontStyle: 'bold',
            color: '#677c36'
        }).setOrigin(0.5);
        this.hint = this.add.text(0, 0, `点错扣${ROUND_RULES.wrongPenaltyMs / 1000}秒 · 请先观察再点击`, {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            fontSize: 22,
            color: '#677c36',
            stroke: '#fffbe9',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        this.menuDecoration = this.add.graphics().setDepth(1500);
        this.menuLabel = this.add.text(0, 0, '菜单', {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            fontSize: 28,
            fontStyle: 'bold',
            color: '#945622'
        }).setOrigin(0.5).setDepth(1501);
        this.menuButton = this.add.zone(0, 0, 152, 76)
            .setInteractive().setData('ui', true).setDepth(1502);
        this.menuButton.on('pointerdown', () => this.openPauseMenu());

        this.imageA.setInteractive();
        this.imageB.setInteractive();
        this.imageA.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.tryHit(this.imageA, pointer));
        this.imageB.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.tryHit(this.imageB, pointer));

        this.ensureBgm();
        this.debugPanel = attachSpotDebug(this);
        this.layout();
        bindResize(this, () => this.layout());
    }

    update ()
    {
        if (this.advancing || this.round.isPaused)
        {
            return;
        }

        const now = performance.now();
        this.drawTimeBar(now);

        if (this.round.tick(now) === 'lost')
        {
            this.failLevel();
        }
    }

    private openPauseMenu ()
    {
        if (this.advancing || this.round.isPaused)
        {
            return;
        }

        const now = performance.now();

        if (!this.round.pause(now))
        {
            if (this.round.status === 'lost')
            {
                this.failLevel();
            }

            return;
        }

        this.drawTimeBar(now);
        this.debugPanel.close();
        const bgm = this.sound.get('bgm-spot');
        this.pausedBgm = Boolean(bgm?.isPlaying);

        if (this.pausedBgm)
        {
            bgm?.pause();
        }

        this.scene.launch('PauseMenu', {
            stageNumber: this.stageNumber,
            found: this.found.size,
            total: this.level.points.length,
            remainingMs: this.round.remainingMs(now)
        });
        // Pause the entire scene, including input, its clock, and ring/feedback tweens.
        this.scene.pause();
    }

    resumeFromMenu ()
    {
        if (!this.round.resume(performance.now()))
        {
            return;
        }

        if (this.pausedBgm)
        {
            this.sound.get('bgm-spot')?.resume();
        }

        this.pausedBgm = false;
        this.scene.stop('PauseMenu');
        this.scene.resume('Game');
    }

    exitToMainMenu ()
    {
        this.advancing = true;
        this.pausedBgm = false;
        this.sound.get('bgm-spot')?.stop();
        this.registry.set('spotDeck', []);
        this.registry.set('spotStage', 0);
        this.scene.stop('PauseMenu');
        // Starting from this scene also shuts down the paused gameplay scene.
        this.scene.start('MainMenu', {});
    }

    private ensureBgm ()
    {
        applyAudioSettings(this);
        let bgm = this.sound.get('bgm-spot');

        if (!bgm)
        {
            bgm = this.sound.add('bgm-spot', { loop: true, volume: 0.34 });
        }

        if (!bgm.isPlaying)
        {
            bgm.play();
        }
    }

    private takeLevel (levels: SpotLevel[], retryLevelId?: number): SpotLevel
    {
        const retry = levels.find(level => level.id === retryLevelId);

        if (retry)
        {
            this.stageNumber = this.registry.get('spotStage') as number | undefined ?? 1;
            return retry;
        }

        let deck = this.registry.get('spotDeck') as number[] | undefined;

        if (!deck || deck.length === 0)
        {
            deck = shuffle(levels.map(level => level.id));
        }

        const id = deck.pop() as number;
        this.registry.set('spotDeck', deck);
        this.stageNumber = (this.registry.get('spotStage') as number | undefined ?? 0) + 1;
        this.registry.set('spotStage', this.stageNumber);

        return levels.find(level => level.id === id) ?? levels[0];
    }

    private tryHit (image: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer)
    {
        if (this.advancing || this.round.isPaused)
        {
            return;
        }

        const now = performance.now();

        if (this.round.tick(now) === 'lost')
        {
            this.failLevel();
            return;
        }

        if (this.input.hitTestPointer(pointer).some(object => object.getData('ui')))
        {
            return;
        }

        const localX = (pointer.x - (image.x - image.displayWidth / 2)) / image.displayWidth;
        const localY = (pointer.y - (image.y - image.displayHeight / 2)) / image.displayHeight;

        if (localX < 0 || localX > 1 || localY < 0 || localY > 1)
        {
            return;
        }

        const minRadius = image.displayWidth * 0.06;
        let bestIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        let hitFound = false;

        for (let index = 0; index < this.level.points.length; index++)
        {
            const point = this.level.points[index];
            const dx = (localX - point.x) * image.displayWidth;
            const dy = (localY - point.y) * image.displayHeight;
            const distance = dx * dx + dy * dy;
            const radius = Math.max(point.r * image.displayWidth, minRadius);

            if (distance <= radius * radius && distance < bestDistance)
            {
                if (this.found.has(index))
                {
                    hitFound = true;
                    continue;
                }

                bestDistance = distance;
                bestIndex = index;
            }
        }

        // Re-tapping an already marked difference is harmless, not an error.
        if (bestIndex < 0 && hitFound)
        {
            return;
        }

        if (!this.round.attempt(now))
        {
            return;
        }

        if (bestIndex < 0)
        {
            this.showWrongClick(pointer, now);
            return;
        }

        const point = this.level.points[bestIndex];
        this.found.add(bestIndex);
        this.sound.play('sfx-found', { volume: 0.72 });
        this.revealRing(point);
        this.layout();

        if (this.found.size === this.level.points.length)
        {
            this.finishLevel();
        }
    }

    private finishLevel ()
    {
        if (!this.round.complete(performance.now()))
        {
            this.failLevel();
            return;
        }

        this.advancing = true;
        this.layout();

        this.time.delayedCall(650, () =>
        {
            if (this.scene.isActive())
            {
                this.scene.start('LevelClear');
            }
        });
    }

    private failLevel ()
    {
        if (this.advancing)
        {
            return;
        }

        this.advancing = true;
        this.scene.start('GameOver', {
            levelId: this.level.id,
            stageNumber: this.stageNumber,
            found: this.found.size,
            total: this.level.points.length
        });
    }

    private showWrongClick (pointer: Phaser.Input.Pointer, now: number)
    {
        const status = this.round.penalize(now);
        this.penaltyFlashUntil = now + 700;
        this.drawTimeBar(now);

        const feedback = this.add.text(
            Math.max(85, Math.min(this.scale.width - 85, pointer.x)),
            Math.max(40, pointer.y - 25),
            `×  -${ROUND_RULES.wrongPenaltyMs / 1000}秒`,
            {
                fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                fontSize: 30,
                fontStyle: 'bold',
                color: '#d8584a',
                stroke: '#fff9eb',
                strokeThickness: 5
            }
        ).setOrigin(0.5).setDepth(10);

        this.tweens.add({
            targets: feedback,
            y: feedback.y - 24,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => feedback.destroy()
        });

        if (status === 'lost')
        {
            this.failLevel();
        }
    }

    private layout ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        const margin = Math.max(16, height * 0.03);
        const fontSize = Math.round(Math.min(40, width * 0.055));
        const dot = Math.min(22, Math.max(14, width * 0.028));
        const progressHeight = dot * 2 + dot * 1.9;
        const headerGap = Math.max(10, height * 0.012);
        const titleHeight = fontSize + 24;
        const timerHeight = 48;
        const ruleHeight = 38;
        const headerHeight = titleHeight + headerGap + progressHeight + headerGap + timerHeight + ruleHeight + 14;
        const gap = Math.max(24, height * 0.02);
        const maxStack = height - margin * 2 - headerHeight - gap;

        let imageWidth = width * 0.92;
        let imageHeight = imageWidth * 9 / 16;

        if (imageHeight * 2 > maxStack)
        {
            imageHeight = maxStack / 2;
            imageWidth = imageHeight * 16 / 9;
        }

        const blockHeight = headerHeight + imageHeight * 2 + gap;
        const top = (height - blockHeight) / 2;
        const centerX = width / 2;

        this.imageA.setDisplaySize(imageWidth, imageHeight);
        this.imageB.setDisplaySize(imageWidth, imageHeight);
        this.imageA.setPosition(centerX, top + headerHeight + imageHeight / 2);
        this.imageB.setPosition(centerX, this.imageA.y + imageHeight + gap);

        this.levelText.setFontSize(fontSize);
        this.levelText.setPosition(centerX, top + titleHeight / 2);
        this.drawProgress(centerX, top + titleHeight + headerGap + progressHeight / 2);

        const timerTop = top + titleHeight + headerGap + progressHeight + headerGap;
        const timerWidth = Math.min(imageWidth, 450);
        this.timeBarBounds = { x: centerX - timerWidth / 2, y: timerTop, width: timerWidth, height: timerHeight };
        this.timeText.setPosition(centerX + timerWidth / 2 - 58, timerTop + timerHeight / 2);
        this.drawTimeBar(performance.now());

        this.backdrop.layout(width, height);
        this.drawDecoration(fontSize, titleHeight);
        this.hint.setFontSize(Math.round(Math.min(24, width * 0.032)));
        this.hint.setWordWrapWidth(width * 0.9);
        this.hint.setPosition(centerX, timerTop + timerHeight + ruleHeight / 2 + 3);

        this.drawRings();
        this.layoutMenuButton(width);
        this.debugPanel.layout(width, height, 174);
    }

    private layoutMenuButton (width: number)
    {
        const buttonWidth = 152;
        const buttonHeight = 76;
        const left = width - buttonWidth - 20;
        const top = 20;
        const graphics = this.menuDecoration;
        graphics.clear();
        drawCreamPanel(graphics, left, top, buttonWidth, buttonHeight, 22);
        graphics.fillStyle(0xdca448, 1);
        graphics.fillRoundedRect(left + 22, top + 22, 8, 32, 3);
        graphics.fillRoundedRect(left + 37, top + 22, 8, 32, 3);
        this.menuLabel.setPosition(left + 101, top + buttonHeight / 2);
        this.menuButton.setPosition(left + buttonWidth / 2, top + buttonHeight / 2);
    }

    private drawTimeBar (now: number)
    {
        const { x, y, width, height } = this.timeBarBounds;
        const remaining = this.round.remainingMs(now);
        const fraction = remaining / ROUND_RULES.durationMs;
        const urgent = remaining <= ROUND_RULES.warningMs;
        const color = urgent ? 0xde6751 : remaining <= 20_000 ? 0xe8ad42 : 0x91bd5b;
        const seconds = Math.ceil(remaining / 1000);
        const minutesText = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secondsText = String(seconds % 60).padStart(2, '0');
        this.timeText.setText(`${minutesText}:${secondsText}`);
        this.timeText.setColor(urgent || now < this.penaltyFlashUntil ? '#c35443' : '#677c36');

        const graphics = this.timeBar;
        graphics.clear();
        drawCreamPanel(graphics, x, y, width, height, height / 2, 2);
        graphics.lineStyle(2.5, 0xbb883e, 1);
        graphics.strokeCircle(x + 26, y + height / 2, 11);
        graphics.beginPath();
        graphics.moveTo(x + 26, y + height / 2 - 7);
        graphics.lineTo(x + 26, y + height / 2);
        graphics.lineTo(x + 31, y + height / 2 + 3);
        graphics.strokePath();

        const trackX = x + 50;
        const trackY = y + 15;
        const trackWidth = width - 161;
        const trackHeight = 18;
        graphics.fillStyle(0xebdfbf, 1);
        graphics.fillRoundedRect(trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
        const fillWidth = trackWidth * fraction;

        if (fillWidth > 0)
        {
            graphics.fillStyle(color, 1);
            graphics.fillRoundedRect(trackX, trackY, fillWidth, trackHeight, Math.min(trackHeight / 2, fillWidth / 2));
        }
    }

    private drawDecoration (fontSize: number, titleHeight: number)
    {
        const graphics = this.decoration;
        const centerX = this.scale.width / 2;
        const plaqueWidth = Math.max(190, this.levelText.width + fontSize * 2.1);
        const plaqueTop = this.levelText.y - titleHeight / 2;

        graphics.clear();
        drawCreamPanel(graphics, centerX - plaqueWidth / 2, plaqueTop, plaqueWidth, titleHeight, 22);
        drawStar(graphics, centerX - plaqueWidth / 2 - 20, this.levelText.y, 13);
        drawStar(graphics, centerX + plaqueWidth / 2 + 20, this.levelText.y, 13);

        [ this.imageA, this.imageB ].forEach(image =>
        {
            const padding = 7;
            drawCreamPanel(
                graphics,
                image.x - image.displayWidth / 2 - padding,
                image.y - image.displayHeight / 2 - padding,
                image.displayWidth + padding * 2,
                image.displayHeight + padding * 2,
                12, 2
            );
        });
    }

    private drawProgress (centerX: number, centerY: number)
    {
        const count = this.level.points.length;
        const dot = Math.min(22, Math.max(14, this.scale.width * 0.028));
        const spacing = dot * 2.55;
        const padX = dot * 1.35;
        const padY = dot * 0.95;
        const barWidth = padX * 2 + spacing * (count - 1);
        const barHeight = padY * 2 + dot * 2;
        const left = centerX - barWidth / 2;
        const top = centerY - barHeight / 2;

        this.progress.clear();
        drawCreamPanel(this.progress, left, top, barWidth, barHeight, barHeight / 2);

        for (let index = 0; index < count; index++)
        {
            const x = left + padX + spacing * index;
            const y = centerY;
            const found = index < this.found.size;

            this.progress.fillStyle(found ? 0x83bc51 : 0xeadcb9, 1);
            this.progress.fillCircle(x, y, dot);
            this.progress.lineStyle(2, found ? 0x568e38 : 0xcfb685, 1);
            this.progress.strokeCircle(x, y, dot);

            if (found)
            {
                this.progress.lineStyle(Math.max(3, dot * 0.2), 0xffffff, 1);
                this.progress.beginPath();
                this.progress.moveTo(x - dot * 0.42, y);
                this.progress.lineTo(x - dot * 0.08, y + dot * 0.32);
                this.progress.lineTo(x + dot * 0.45, y - dot * 0.34);
                this.progress.strokePath();
            }
        }
    }

    private revealRing (point: SpotPoint)
    {
        const ring = { point, angle: 0 };
        this.rings.push(ring);

        this.tweens.add({
            targets: ring,
            angle: 360,
            duration: 500,
            ease: 'Linear',
            onUpdate: () => this.drawRings()
        });
    }

    private drawRings ()
    {
        this.ringA.clear();
        this.ringB.clear();

        this.rings.forEach(ring =>
        {
            this.strokeRing(this.ringA, this.imageA, ring.point, ring.angle);
            this.strokeRing(this.ringB, this.imageB, ring.point, ring.angle);
        });
    }

    private strokeRing (graphics: Phaser.GameObjects.Graphics, image: Phaser.GameObjects.Image, point: SpotPoint, angle: number)
    {
        if (angle <= 0)
        {
            return;
        }

        const x = image.x - image.displayWidth / 2 + point.x * image.displayWidth;
        const y = image.y - image.displayHeight / 2 + point.y * image.displayHeight;
        const radius = point.r * image.displayWidth;
        const start = -Math.PI / 2;
        const end = start + Math.min(angle, 359.9) * Math.PI / 180;

        const paint = (lineWidth: number, color: number) =>
        {
            graphics.lineStyle(lineWidth, color, 1);

            if (angle >= 359.9)
            {
                graphics.strokeCircle(x, y, radius);
                return;
            }

            graphics.beginPath();
            graphics.arc(x, y, radius, start, end, false);
            graphics.strokePath();
        };

        paint(6, 0xffffff);
        paint(3, 0xff4d4f);
    }
}
