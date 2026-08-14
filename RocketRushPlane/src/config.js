export const DESIGN = { width: 1080, height: 1920 };

export const CONFIG = {
  baseScore: 100,
  flightDuration: 5,
  historyCount: 8,
  soundVolume: 0.08,
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
  panel: 0x091426,
  panel2: 0x0d1b31,
  line: 0x18324f,
  text: 0xf4f8ff,
  muted: 0x7890aa,
  cyan: 0x55dbea,
  green: 0x61e78f,
  gold: 0xffcd66,
  red: 0xff5a55,
  purple: 0xbd7cff
};
