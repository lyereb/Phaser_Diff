/** Keep balance settings together so the penalty and cooldown are easy to tune. */
export const ROUND_RULES = {
    durationMs: 60_000,
    wrongPenaltyMs: 3_000,
    clickCooldownMs: 350,
    warningMs: 10_000
} as const;

export type RoundStatus = 'playing' | 'won' | 'lost';

/** Wall-clock timing with explicit pause accounting; unpaused background tabs still consume time. */
export class RoundChallenge
{
    private penaltyMs = 0;
    private nextClickAt = 0;
    private frozenRemainingMs = ROUND_RULES.durationMs as number;
    private currentStatus: RoundStatus = 'playing';
    private pausedAt: number | null = null;
    private pausedDurationMs = 0;

    constructor (private readonly startedAt: number)
    {
    }

    get status (): RoundStatus
    {
        return this.currentStatus;
    }

    get isPaused ()
    {
        return this.pausedAt !== null;
    }

    pause (now: number)
    {
        if (this.isPaused || this.tick(now) !== 'playing')
        {
            return false;
        }

        this.pausedAt = now;
        return true;
    }

    resume (now: number)
    {
        if (this.pausedAt === null || this.currentStatus !== 'playing')
        {
            return false;
        }

        const duration = Math.max(0, now - this.pausedAt);
        this.pausedDurationMs += duration;

        if (this.nextClickAt > 0)
        {
            this.nextClickAt += duration;
        }

        this.pausedAt = null;
        return true;
    }

    remainingMs (now: number)
    {
        if (this.currentStatus !== 'playing')
        {
            return this.frozenRemainingMs;
        }

        const elapsed = Math.max(0, (this.pausedAt ?? now) - this.startedAt - this.pausedDurationMs);
        return Math.max(0, ROUND_RULES.durationMs - elapsed - this.penaltyMs);
    }

    tick (now: number): RoundStatus
    {
        if (this.currentStatus === 'playing' && this.remainingMs(now) <= 0)
        {
            this.currentStatus = 'lost';
            this.frozenRemainingMs = 0;
        }

        return this.currentStatus;
    }

    /** One gate shared by both photos, so alternating photos or fingers cannot bypass the cooldown. */
    attempt (now: number)
    {
        if (this.isPaused || this.tick(now) !== 'playing' || now < this.nextClickAt)
        {
            return false;
        }

        this.nextClickAt = now + ROUND_RULES.clickCooldownMs;
        return true;
    }

    penalize (now: number)
    {
        if (this.currentStatus === 'playing' && !this.isPaused)
        {
            this.penaltyMs += ROUND_RULES.wrongPenaltyMs;
        }

        return this.tick(now);
    }

    complete (now: number)
    {
        // Check the deadline before awarding a win, even if the next rendered frame has not run yet.
        if (this.isPaused || this.tick(now) !== 'playing')
        {
            return false;
        }

        this.frozenRemainingMs = this.remainingMs(now);
        this.currentStatus = 'won';
        return true;
    }
}
