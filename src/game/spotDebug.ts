import { Scene } from 'phaser';
import { DebugPanel } from './debugPanel';
import { draftPoints } from './spotAnalyze';

interface SpotLevel
{
    id: number;
    title: string;
    a: string;
    b: string;
    points: { x: number; y: number; r: number; change?: string }[];
}

interface SpotData
{
    levels: SpotLevel[];
}

interface SpotPair
{
    id: number;
    a: string;
    b: string;
}

let analyzing = false;

async function loadFreshTextures (scene: Scene, levels: SpotLevel[])
{
    let pending = false;

    levels.forEach(level =>
    {
        const keyA = `diff-${level.id}A`;
        const keyB = `diff-${level.id}B`;

        if (!scene.textures.exists(keyA))
        {
            scene.load.image(keyA, `assets/spot-diff/${level.a}`);
            pending = true;
        }

        if (!scene.textures.exists(keyB))
        {
            scene.load.image(keyB, `assets/spot-diff/${level.b}`);
            pending = true;
        }
    });

    if (!pending)
    {
        return;
    }

    await new Promise<void>(resolve =>
    {
        scene.load.once('complete', () => resolve());
        scene.load.start();
    });
}

async function analyzeNewImages (scene: Scene, panel: DebugPanel)
{
    if (analyzing)
    {
        return;
    }

    const answers = scene.cache.json.get('spot-diff') as SpotData | undefined;

    if (!answers)
    {
        panel.setStatus('还没有答案数据');
        return;
    }

    analyzing = true;
    panel.setStatus('正在查找新图');

    try
    {
        const response = await fetch('/api/spot-pairs');

        if (!response.ok)
        {
            throw new Error(String(response.status));
        }

        const payload = await response.json() as { pairs?: SpotPair[] };
        const known = new Set(answers.levels.map(level => level.id));
        const fresh = (payload.pairs ?? []).filter(pair => !known.has(pair.id));

        if (fresh.length === 0)
        {
            panel.setStatus('没有新的图');
            return;
        }

        const added: SpotLevel[] = [];

        for (const pair of fresh)
        {
            panel.setStatus(`正在分析第 ${pair.id} 组`);

            const points = await draftPoints(`assets/spot-diff/${pair.a}`, `assets/spot-diff/${pair.b}`);

            if (points.length === 0)
            {
                continue;
            }

            added.push({
                id: pair.id,
                title: `第${pair.id}组`,
                a: pair.a,
                b: pair.b,
                points
            });
        }

        if (added.length === 0)
        {
            panel.setStatus('新图里没有找到足够明显的差异');
            return;
        }

        answers.levels.push(...added);
        answers.levels.sort((left, right) => left.id - right.id);

        const saved = await fetch('/api/spot-answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers)
        });

        if (!saved.ok)
        {
            throw new Error(String(saved.status));
        }

        await loadFreshTextures(scene, added);
        panel.setStatus(`已生成 ${added.length} 组初稿，可在编辑答案里调整`);
    }
    catch
    {
        panel.setStatus('分析失败，请用开发服务器打开');
    }
    finally
    {
        analyzing = false;
    }
}

export function attachSpotDebug (scene: Scene)
{
    const panel = new DebugPanel(scene, 3000);

    panel.addButton('分析新图', () =>
    {
        void analyzeNewImages(scene, panel);
    });
    panel.addButton('编辑答案', () =>
    {
        scene.time.delayedCall(0, () =>
        {
            panel.close();
            scene.scene.start('AnswerEditor');
        });
    });

    return panel;
}
