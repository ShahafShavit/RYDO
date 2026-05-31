namespace Rydo.Api.Services;

public static class GamificationLevelHelper
{
    public const int FirstStepXp = 100;
    public const int SecondStepXp = 150;
    public const double StepGrowthFactor = 1.25;

    public static int XpToAdvance(int level)
    {
        if (level < 1) level = 1;
        if (level == 1) return FirstStepXp;
        if (level == 2) return SecondStepXp;
        var step = SecondStepXp;
        for (var l = 3; l <= level; l++)
            step = (int)Math.Ceiling(step * StepGrowthFactor);
        return step;
    }

    public static int TotalXpForLevel(int level)
    {
        if (level <= 1) return 0;
        var sum = 0;
        for (var l = 1; l < level; l++)
            sum += XpToAdvance(l);
        return sum;
    }

    public static int LevelFromTotalXp(int totalXp)
    {
        var level = 1;
        var remaining = totalXp;
        while (remaining >= XpToAdvance(level))
        {
            remaining -= XpToAdvance(level);
            level++;
        }
        return level;
    }

    public static (int xpIntoLevel, int xpToNext, double progressPercent) ProgressWithinLevel(int totalXp, int level)
    {
        var floor = TotalXpForLevel(level);
        var into = totalXp - floor;
        var need = XpToAdvance(level);
        var pct = need <= 0 ? 100 : Math.Min(100, Math.Round(into * 100.0 / need, 1));
        return (into, need - into, pct);
    }
}
