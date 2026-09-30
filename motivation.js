/**
 * PROJECT GRIND & SHINE
 * Motivation Engine & Daily Discipline Principles
 * State-driven, original tactical motivational copy.
 */

const Motivation = (() => {
  const PRINCIPLES = [
    "Discipline does not require motivation.",
    "Do the work.",
    "Don't negotiate with the plan.",
    "One difficult day is still one day.",
    "Don't miss twice.",
    "Small actions compound.",
    "Consistency beats intensity.",
    "Your standard is what you tolerate on your worst day.",
    "Action cures hesitation.",
    "The standard is the standard.",
    "Fatigue is a feeling. Execution is a decision.",
    "Build the identity brick by brick.",
    "Win the morning. Hold the line."
  ];

  function getDailyPrinciple(dateKey = Utils.getTodayDateKey()) {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      hash = (hash << 5) - hash + dateKey.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % PRINCIPLES.length;
    return PRINCIPLES[idx];
  }

  function getMessageForState(stats) {
    const { scheduled = 0, completed = 0, partial = 0, missed = 0, maxStreak = 0 } = stats;

    const remaining = scheduled - completed;

    // Milestone highlights take precedence if maxStreak hit
    if (completed === scheduled && scheduled > 0) {
      if (maxStreak >= 100) {
        return {
          headline: "100 DAYS. RELENTLESS CONSISTENCY.",
          subtext: "Triple-digit discipline. The habit is forged into your identity."
        };
      }
      if (maxStreak >= 30) {
        return {
          headline: "30 DAYS. DISCIPLINE IS BECOMING IDENTITY.",
          subtext: "One month of absolute execution. Never let down your guard."
        };
      }
      if (maxStreak >= 7) {
        return {
          headline: "7 DAYS OF PROOF.",
          subtext: "A full week without surrender. Momentum belongs to you."
        };
      }
      return {
        headline: "MISSION COMPLETE.",
        subtext: "Every objective executed today. Recover and prepare for tomorrow."
      };
    }

    if (scheduled > 0 && remaining === 1) {
      return {
        headline: "ONE MISSION LEFT. FINISH IT.",
        subtext: "Close the line. Do not leave the battlefield with unfinished work."
      };
    }

    if (completed > 0 && remaining > 1 && completed >= scheduled / 2) {
      return {
        headline: "THE WORK IS GETTING DONE.",
        subtext: "Over halfway through today's targets. Maintain focus until all boxes are checked."
      };
    }

    if (missed > 0) {
      return {
        headline: "YOU MISSED. RESET. EXECUTE TODAY.",
        subtext: "Yesterday was a lapse. Today is an uncompromised comeback. Don't miss twice."
      };
    }

    if (maxStreak > 3) {
      return {
        headline: `${maxStreak} DAYS. DON'T BREAK THE CHAIN.`,
        subtext: "Consistency is your highest leverage asset. Protect the streak."
      };
    }

    return {
      headline: "DISCIPLINE OVER MOTIVATION.",
      subtext: "Show up. Execute the targets. No excuses, no negotiations."
    };
  }

  return {
    PRINCIPLES,
    getDailyPrinciple,
    getMessageForState
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Motivation;
}
