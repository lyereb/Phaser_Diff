import { Scene } from 'phaser';
import { isSoundEnabled, setSoundEnabled } from './audioPreferences';

export type SfxKey = 'ui' | 'deny';
const VOLUME: Record<SfxKey, number> = { ui: 0.32, deny: 0.36 };

export function isAudioEnabled (): boolean { return isSoundEnabled(); }

/** One shared SoundManager controls both existing gameplay music and all effects without changing volumes. */
export function applyAudioSettings (scene: Scene): boolean
{
    const enabled = isSoundEnabled();
    try { scene.sound.mute = !enabled; }
    catch { /* Keep settings usable in browsers without audio support. */ }
    return enabled;
}

export function setAudioEnabled (scene: Scene, enabled: boolean)
{
    setSoundEnabled(enabled);
    applyAudioSettings(scene);
}

export function loadUiAudioAssets (scene: Scene)
{
    scene.load.audio('sfx-ui', 'audio/ui.mp3');
    scene.load.audio('sfx-deny', 'audio/deny.wav');
}

/** Original Jump UI sound/unlock behavior, narrowed to the only effects this menu needs. */
export function playSfx (scene: Scene, key: SfxKey)
{
    if (!applyAudioSettings(scene)) return;
    const play = () =>
    {
        if (!applyAudioSettings(scene)) return;
        scene.sound.play(`sfx-${key}`, { volume: VOLUME[key] });
    };

    try
    {
        if (!scene.sound.locked)
        {
            play();
            return;
        }

        scene.sound.once('unlocked', play);
        scene.sound.unlock();
    }
    catch
    {
        // Audio permissions must not prevent opening settings or starting gameplay.
    }
}
