import { Scene } from 'phaser';

/** Reused Phaser_Jump artwork and its original opaque bounds; unrelated menu assets stay out. */
const BUTTONS = {
    start: { file: 'UI/button_start.png', x: 18, y: 12, w: 222, h: 60 },
    rank: { file: 'UI/button_ranking.png', x: 19, y: 8, w: 218, h: 63 },
    settings: { file: 'UI/button_setting.png', x: 0, y: 4, w: 128, h: 121 }
};

export const MENU_BUTTONS = [ 'start', 'rank', 'settings' ] as const;
export type MenuButtonId = typeof MENU_BUTTONS[number];

export function menuButtonKey (id: MenuButtonId)
{
    return `menu-btn-${id}`;
}

export function loadMenuAssets (scene: Scene)
{
    MENU_BUTTONS.forEach(id => scene.load.image(menuButtonKey(id), BUTTONS[id].file));
}

export function createMenuFrames (scene: Scene)
{
    MENU_BUTTONS.forEach(id =>
    {
        const texture = scene.textures.get(menuButtonKey(id));
        const region = BUTTONS[id];

        if (!texture.has('art'))
        {
            texture.add('art', 0, region.x, region.y, region.w, region.h);
        }
    });
}

export function menuButtonFrame (id: MenuButtonId)
{
    return { key: menuButtonKey(id), frame: 'art', ...BUTTONS[id] };
}
