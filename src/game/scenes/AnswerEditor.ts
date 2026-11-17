import { Scene } from 'phaser';
import { bindResize } from '../layout';

interface SpotPoint
{
    x: number;
    y: number;
    r: number;
    change?: string;
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
    imageWidth: number;
    imageHeight: number;
    note: string;
    levels: SpotLevel[];
}

export class AnswerEditor extends Scene
{
    private answers: SpotData;
    private levelIndex = 0;
    private selected = -1;
    private drag: { mode: 'move' | 'resize'; index: number; image: Phaser.GameObjects.Image } | null = null;

    private imageA: Phaser.GameObjects.Image;
    private imageB: Phaser.GameObjects.Image;
    private marks: Phaser.GameObjects.Graphics;
    private labels: Phaser.GameObjects.Text[] = [];
    private title: Phaser.GameObjects.Text;
    private detail: Phaser.GameObjects.Text;
    private hint: Phaser.GameObjects.Text;
    private status: Phaser.GameObjects.Text;
    private backButton: Phaser.GameObjects.Text;
    private prevButton: Phaser.GameObjects.Text;
    private nextButton: Phaser.GameObjects.Text;
    private deleteButton: Phaser.GameObjects.Text;
    private saveButton: Phaser.GameObjects.Text;

    constructor ()
    {
        super('AnswerEditor');
    }

    create ()
    {
        this.answers = this.cache.json.get('spot-diff') as SpotData;
        this.levelIndex = this.registry.get('editLevelIndex') as number | undefined ?? 0;
        this.selected = -1;
        this.drag = null;

        this.cameras.main.setBackgroundColor(0xf6f1e8);

        this.imageA = this.add.image(0, 0, `diff-${this.level.id}A`).setOrigin(0.5);
        this.imageB = this.add.image(0, 0, `diff-${this.level.id}B`).setOrigin(0.5);
        this.marks = this.add.graphics().setDepth(2);

        this.title = this.add.text(0, 0, '', this.labelStyle(30, '#5c4a3a')).setOrigin(0.5).setDepth(10);
        this.detail = this.add.text(0, 0, '', {
            ...this.labelStyle(22, '#5c4a3a'),
            align: 'center',
            wordWrap: { width: 640 }
        }).setOrigin(0.5).setDepth(10);
        this.hint = this.add.text(0, 0, '点空白处新增，拖圆内移动，拖边缘改大小', this.labelStyle(20, '#8a7058')).setOrigin(0.5).setDepth(10);
        this.status = this.add.text(0, 0, '', this.labelStyle(20, '#2f6b3a')).setOrigin(0.5).setDepth(10);

        this.backButton = this.makeButton('返回', () => this.scene.start('MainMenu'));
        this.prevButton = this.makeButton('上一关', () => this.stepLevel(-1));
        this.nextButton = this.makeButton('下一关', () => this.stepLevel(1));
        this.deleteButton = this.makeButton('删除', () => this.deleteSelected());
        this.saveButton = this.makeButton('保存', () =>
        {
            void this.save();
        });

        this.rebuildLabels();
        this.layout();
        bindResize(this, () => this.layout());

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.beginPointer(pointer));
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.movePointer(pointer));
        this.input.on('pointerup', () =>
        {
            this.drag = null;
        });
    }

    private get level ()
    {
        return this.answers.levels[this.levelIndex];
    }

    private labelStyle (fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle
    {
        return {
            fontFamily: 'Arial',
            fontSize,
            color
        };
    }

    private makeButton (label: string, onClick: () => void)
    {
        const button = this.add.text(0, 0, label, {
            fontFamily: 'Arial',
            fontSize: 26,
            color: '#5c4a3a',
            backgroundColor: '#f4e4c4',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(10);

        button.setData('ui', true);
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', onClick);

        return button;
    }

    private stepLevel (delta: number)
    {
        const count = this.answers.levels.length;
        this.levelIndex = (this.levelIndex + delta + count) % count;
        this.registry.set('editLevelIndex', this.levelIndex);
        this.selected = -1;
        this.drag = null;
        this.imageA.setTexture(`diff-${this.level.id}A`);
        this.imageB.setTexture(`diff-${this.level.id}B`);
        this.rebuildLabels();
        this.layout();
    }

    private deleteSelected ()
    {
        if (this.selected < 0)
        {
            return;
        }

        this.level.points.splice(this.selected, 1);
        this.selected = -1;
        this.markDirty();
        this.rebuildLabels();
        this.layout();
    }

    private markDirty ()
    {
        this.status.setText('有未保存的修改');
        this.status.setColor('#9a6230');
    }

    private async save ()
    {
        this.status.setText('正在保存');
        this.status.setColor('#5c4a3a');

        try
        {
            const response = await fetch('/api/spot-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.answers)
            });

            if (!response.ok)
            {
                throw new Error(String(response.status));
            }

            this.status.setText('已保存');
            this.status.setColor('#2f6b3a');
        }
        catch
        {
            this.status.setText('保存失败');
            this.status.setColor('#a33b32');
        }
    }

    private rebuildLabels ()
    {
        this.labels.forEach(label => label.destroy());
        this.labels = [];

        this.level.points.forEach((_, index) =>
        {
            for (let copy = 0; copy < 2; copy++)
            {
                const label = this.add.text(0, 0, String(index + 1), {
                    fontFamily: 'Arial',
                    fontSize: 22,
                    color: '#3a2a1a',
                    stroke: '#ffffff',
                    strokeThickness: 4
                }).setOrigin(0.5).setDepth(4);

                this.labels.push(label);
            }
        });
    }

    private beginPointer (pointer: Phaser.Input.Pointer)
    {
        if (this.input.hitTestPointer(pointer).some(object => object.getData('ui')))
        {
            return;
        }

        const image = this.imageAt(pointer);

        if (!image)
        {
            return;
        }

        const local = this.localOf(image, pointer);
        const hit = this.pickPoint(image, local.x, local.y);

        if (!hit)
        {
            const point: SpotPoint = {
                x: this.clamp(local.x),
                y: this.clamp(local.y),
                r: 0.045,
                change: ''
            };

            this.level.points.push(point);
            this.selected = this.level.points.length - 1;
            this.drag = { mode: 'move', index: this.selected, image };
            this.markDirty();
            this.rebuildLabels();
            this.layout();
            return;
        }

        this.selected = hit.index;
        this.drag = { mode: hit.mode, index: hit.index, image };
        this.drawMarks();
        this.refreshCopy();
    }

    private movePointer (pointer: Phaser.Input.Pointer)
    {
        if (!this.drag || !pointer.isDown)
        {
            return;
        }

        const point = this.level.points[this.drag.index];
        const local = this.localOf(this.drag.image, pointer);

        if (this.drag.mode === 'move')
        {
            point.x = this.clamp(local.x);
            point.y = this.clamp(local.y);
        }
        else
        {
            const dx = (local.x - point.x) * this.drag.image.displayWidth;
            const dy = (local.y - point.y) * this.drag.image.displayHeight;
            point.r = Math.min(0.25, Math.max(0.012, Math.hypot(dx, dy) / this.drag.image.displayWidth));
        }

        this.markDirty();
        this.drawMarks();
    }

    private pickPoint (image: Phaser.GameObjects.Image, localX: number, localY: number)
    {
        let moveHit: { index: number; distance: number } | null = null;
        let resizeHit: { index: number; gap: number } | null = null;

        for (let index = 0; index < this.level.points.length; index++)
        {
            const point = this.level.points[index];
            const dx = (localX - point.x) * image.displayWidth;
            const dy = (localY - point.y) * image.displayHeight;
            const distance = Math.hypot(dx, dy);
            const radius = Math.max(8, point.r * image.displayWidth);
            const inner = Math.max(12, radius * 0.62);

            if (distance <= inner && (!moveHit || distance < moveHit.distance))
            {
                moveHit = { index, distance };
            }

            const gap = Math.abs(distance - radius);

            if (distance > inner && gap <= 18 && (!resizeHit || gap < resizeHit.gap))
            {
                resizeHit = { index, gap };
            }
        }

        if (moveHit)
        {
            return { index: moveHit.index, mode: 'move' as const };
        }

        if (resizeHit)
        {
            return { index: resizeHit.index, mode: 'resize' as const };
        }

        return null;
    }

    private imageAt (pointer: Phaser.Input.Pointer)
    {
        return [ this.imageA, this.imageB ].find(image =>
        {
            const local = this.localOf(image, pointer);

            return local.x >= 0 && local.x <= 1 && local.y >= 0 && local.y <= 1;
        }) ?? null;
    }

    private localOf (image: Phaser.GameObjects.Image, pointer: Phaser.Input.Pointer)
    {
        return {
            x: (pointer.x - (image.x - image.displayWidth / 2)) / image.displayWidth,
            y: (pointer.y - (image.y - image.displayHeight / 2)) / image.displayHeight
        };
    }

    private clamp (value: number)
    {
        return Math.min(1, Math.max(0, value));
    }

    private layout ()
    {
        const width = this.scale.width;
        const height = this.scale.height;
        const margin = Math.max(12, height * 0.02);
        const header = Math.max(118, height * 0.11);
        const footer = Math.max(92, height * 0.09);
        const gap = Math.max(8, height * 0.01);
        const maxStack = height - margin * 2 - header - footer - gap;

        let imageWidth = width * 0.94;
        let imageHeight = imageWidth * 9 / 16;

        if (imageHeight * 2 > maxStack)
        {
            imageHeight = maxStack / 2;
            imageWidth = imageHeight * 16 / 9;
        }

        const blockHeight = header + imageHeight * 2 + gap + footer;
        const top = (height - blockHeight) / 2;
        const centerX = width / 2;

        this.imageA.setDisplaySize(imageWidth, imageHeight);
        this.imageB.setDisplaySize(imageWidth, imageHeight);
        this.imageA.setPosition(centerX, top + header + imageHeight / 2);
        this.imageB.setPosition(centerX, this.imageA.y + imageHeight + gap);

        this.backButton.setPosition(margin + 52, top + 22);
        this.title.setPosition(centerX, top + 22);
        this.prevButton.setPosition(centerX - 90, top + 68);
        this.nextButton.setPosition(centerX + 90, top + 68);
        this.hint.setPosition(centerX, top + header - 16);
        this.detail.setWordWrapWidth(width * 0.9);
        this.detail.setPosition(centerX, top + header + imageHeight * 2 + gap + 18);
        this.deleteButton.setPosition(centerX - 120, top + header + imageHeight * 2 + gap + 62);
        this.saveButton.setPosition(centerX, top + header + imageHeight * 2 + gap + 62);
        this.status.setPosition(centerX + 130, top + header + imageHeight * 2 + gap + 62);

        this.refreshCopy();
        this.drawMarks();
    }

    private refreshCopy ()
    {
        const point = this.selected >= 0 ? this.level.points[this.selected] : null;
        const name = point ? (point.change || '未命名') : '未选中';

        this.title.setText(`${this.levelIndex + 1}/${this.answers.levels.length} ${this.level.title}`);
        this.detail.setText(point ? `第 ${this.selected + 1} 处  ${name}` : '点一个圆圈来修改');
    }

    private drawMarks ()
    {
        this.marks.clear();

        this.level.points.forEach((point, index) =>
        {
            this.strokeMark(this.imageA, point, index === this.selected);
            this.strokeMark(this.imageB, point, index === this.selected);
        });

        this.level.points.forEach((point, index) =>
        {
            [ this.imageA, this.imageB ].forEach((image, imageIndex) =>
            {
                const label = this.labels[index * 2 + imageIndex];

                if (!label)
                {
                    return;
                }

                label.setPosition(
                    image.x - image.displayWidth / 2 + point.x * image.displayWidth,
                    image.y - image.displayHeight / 2 + point.y * image.displayHeight
                );
                label.setColor(index === this.selected ? '#1d4ed8' : '#3a2a1a');
            });
        });
    }

    private strokeMark (image: Phaser.GameObjects.Image, point: SpotPoint, selected: boolean)
    {
        const x = image.x - image.displayWidth / 2 + point.x * image.displayWidth;
        const y = image.y - image.displayHeight / 2 + point.y * image.displayHeight;
        const radius = point.r * image.displayWidth;
        const color = selected ? 0x2f6fed : 0xff4d4f;

        this.marks.lineStyle(selected ? 7 : 6, 0xffffff, 1);
        this.marks.strokeCircle(x, y, radius);
        this.marks.lineStyle(selected ? 4 : 3, color, 1);
        this.marks.strokeCircle(x, y, radius);
    }
}
