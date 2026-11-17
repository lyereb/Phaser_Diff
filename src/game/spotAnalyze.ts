export interface DraftPoint
{
    x: number;
    y: number;
    r: number;
    change: string;
}

interface Component
{
    count: number;
    sumX: number;
    sumY: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

const MAX_POINTS = 5;

function loadHtmlImage (url: string)
{
    return new Promise<HTMLImageElement>((resolve, reject) =>
    {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`无法读取 ${url}`));
        image.src = url;
    });
}

function pixelsOf (image: HTMLImageElement, width: number, height: number)
{
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context)
    {
        throw new Error('无法读取图片像素');
    }

    context.drawImage(image, 0, 0, width, height);

    return context.getImageData(0, 0, width, height).data;
}

function collectComponents (diff: Uint8Array, width: number, height: number)
{
    const labels = new Int32Array(width * height);
    const components: Component[] = [];
    const stack: number[] = [];

    for (let start = 0; start < diff.length; start++)
    {
        if (!diff[start] || labels[start] !== 0)
        {
            continue;
        }

        const x0 = start % width;
        const y0 = (start - x0) / width;
        const component: Component = {
            count: 0,
            sumX: 0,
            sumY: 0,
            minX: x0,
            minY: y0,
            maxX: x0,
            maxY: y0
        };

        components.push(component);
        labels[start] = 1;
        stack.push(start);

        while (stack.length > 0)
        {
            const index = stack.pop() as number;
            const x = index % width;
            const y = (index - x) / width;

            component.count += 1;
            component.sumX += x;
            component.sumY += y;
            component.minX = Math.min(component.minX, x);
            component.minY = Math.min(component.minY, y);
            component.maxX = Math.max(component.maxX, x);
            component.maxY = Math.max(component.maxY, y);

            if (x > 0)
            {
                visit(index - 1);
            }

            if (x + 1 < width)
            {
                visit(index + 1);
            }

            if (y > 0)
            {
                visit(index - width);
            }

            if (y + 1 < height)
            {
                visit(index + width);
            }
        }

        function visit (next: number)
        {
            if (!diff[next] || labels[next] !== 0)
            {
                return;
            }

            labels[next] = 1;
            stack.push(next);
        }
    }

    return components;
}

/** Draft circles from the changed pixels. Close objects stay separate so they can be edited later. */
export async function draftPoints (urlA: string, urlB: string): Promise<DraftPoint[]>
{
    const [imageA, imageB] = await Promise.all([ loadHtmlImage(urlA), loadHtmlImage(urlB) ]);
    const scale = Math.min(1, 720 / imageA.naturalWidth);
    const width = Math.max(1, Math.round(imageA.naturalWidth * scale));
    const height = Math.max(1, Math.round(imageA.naturalHeight * scale));
    const pixelsA = pixelsOf(imageA, width, height);
    const pixelsB = pixelsOf(imageB, width, height);
    const diff = new Uint8Array(width * height);
    const minArea = Math.max(36, width * height * 0.00035);
    const maxArea = width * height * 0.08;

    for (let index = 0; index < diff.length; index++)
    {
        const offset = index * 4;
        const distance = Math.max(
            Math.abs(pixelsA[offset] - pixelsB[offset]),
            Math.abs(pixelsA[offset + 1] - pixelsB[offset + 1]),
            Math.abs(pixelsA[offset + 2] - pixelsB[offset + 2])
        );

        if (distance > 52)
        {
            diff[index] = 1;
        }
    }

    const ranked = collectComponents(diff, width, height)
        .filter(component => component.count >= minArea && component.count <= maxArea)
        .sort((left, right) => right.count - left.count)
        .slice(0, MAX_POINTS)
        .map(component =>
        {
            const x = component.sumX / component.count / width;
            const y = component.sumY / component.count / height;
            const radius = Math.hypot(
                Math.max(x * width - component.minX, component.maxX - x * width),
                Math.max(y * height - component.minY, component.maxY - y * height)
            ) / width + 0.008;

            return {
                x: Math.round(x * 10000) / 10000,
                y: Math.round(y * 10000) / 10000,
                r: Math.round(Math.min(0.2, Math.max(0.02, radius)) * 10000) / 10000,
                change: '自动标记'
            };
        })
        .sort((left, right) => left.y - right.y || left.x - right.x);

    return ranked;
}
