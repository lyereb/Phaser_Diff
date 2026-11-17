import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function listSpotPairs ()
{
    const dir = path.resolve('public/assets/spot-diff');
    const names = fs.readdirSync(dir);
    const pairs = new Map();

    names.forEach(name =>
    {
        const match = /^(\d+)([ABab])\.(?:png|jpe?g|webp)$/i.exec(name);

        if (!match)
        {
            return;
        }

        const id = Number(match[1]);
        const side = match[2].toUpperCase();
        const pair = pairs.get(id) ?? { id };

        pair[side === 'A' ? 'a' : 'b'] = name;
        pairs.set(id, pair);
    });

    return [ ...pairs.values() ]
        .filter(pair => pair.a && pair.b)
        .sort((left, right) => left.id - right.id);
}

function saveAnswersPlugin ()
{
    return {
        name: 'save-spot-answers',
        configureServer (server)
        {
            server.middlewares.use('/api/spot-pairs', (req, res, next) =>
            {
                if (req.method !== 'GET')
                {
                    next();
                    return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ pairs: listSpotPairs() }));
            });

            server.middlewares.use('/api/spot-answers', (req, res, next) =>
            {
                if (req.method !== 'POST')
                {
                    next();
                    return;
                }

                const chunks = [];

                req.on('data', (chunk) => chunks.push(chunk));
                req.on('end', () =>
                {
                    try
                    {
                        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));

                        if (!data || !Array.isArray(data.levels))
                        {
                            throw new Error('invalid answers');
                        }

                        const file = path.resolve('public/assets/spot-diff/answers.json');

                        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: true }));
                    }
                    catch
                    {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: false }));
                    }
                });
            });
        }
    };
}

export default defineConfig({
    base: './',
    plugins: [ saveAnswersPlugin() ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080
    }
});
