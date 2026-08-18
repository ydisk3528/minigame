export const DESIGN = { width: 1080, height: 1920 };

export const CONFIG = {
  baseScore: 100,
  flightDuration: 5,
  historyCount: 8,
  soundVolume: 0.18,
  leaderboardRefreshSeconds: 10,
  leaderboardNames: ['PIXEL ACE', 'RED BARON', 'SKY BYTE', 'JET CAT', 'NOVA KID', 'CLOUD 9', 'GEM WING', 'TURBO FOX'],
  successTips: [
    'LOCK EARLY TO BUILD A SAFE STREAK!',
    'WATCH THE GEMS, THEN PICK YOUR EXIT!',
    'HIGH MULTIPLIERS NEED QUICK REFLEXES!',
    'SHORT FLIGHTS STILL BUILD TOTAL SCORE!'
  ],
  ranges: [
    { min: 1.2, max: 1.5, weight: 38 },
    { min: 1.5, max: 2.5, weight: 31 },
    { min: 2.5, max: 5, weight: 20 },
    { min: 5, max: 10, weight: 9 },
    { min: 10, max: 16, weight: 2 }
  ]
};

export const COLORS = {
  page: 0x050914,
  panel: 0x0a1024,
  panel2: 0x111a32,
  line: 0x324568,
  text: 0xfff4d6,
  muted: 0x8290ad,
  cyan: 0x42cfff,
  green: 0xffb52e,
  gold: 0xffdd57,
  red: 0xff4438,
  purple: 0xbd7cff
};
