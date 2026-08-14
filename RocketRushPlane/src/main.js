import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLORS, CONFIG, DESIGN } from './config.js';
import { FlightMultiplierGenerator, GameMachine, GameState, MultiplierController, SaveStore } from './game.js';
import './style.css';

const app = new Application();
await app.init({ resizeTo: window, antialias: true, background: COLORS.page, resolution: Math.min(devicePixelRatio, 2) });
document.querySelector('#app').appendChild(app.canvas);

const root = new Container();
app.stage.addChild(root);
const fit = () => {
  const scale = Math.min(app.screen.width / DESIGN.width, app.screen.height / DESIGN.height);
  root.scale.set(scale);
  root.position.set((app.screen.width - DESIGN.width * scale) / 2, (app.screen.height - DESIGN.height * scale) / 2);
};
window.addEventListener('resize', fit); fit();

const font = 'Inter, system-ui, sans-serif';
const labelStyle = (size, color = COLORS.text, weight = '600', spacing = 0) => new TextStyle({ fontFamily: font, fontSize: size, fill: color, fontWeight: weight, letterSpacing: spacing });
const text = (value, size, color, weight, spacing) => new Text({ text: value, style: labelStyle(size, color, weight, spacing) });
const center = (node, x) => { node.anchor?.set(0.5, node.anchor.y); node.x = x; return node; };

function panel(x, y, width, height, radius = 30, fill = COLORS.panel, stroke = COLORS.line) {
  return new Graphics().roundRect(x, y, width, height, radius).fill(fill).stroke({ color: stroke, width: 2 });
}

const chrome = new Graphics().rect(0, 0, DESIGN.width, DESIGN.height).fill(COLORS.page);
chrome.roundRect(0, 0, 12, DESIGN.height, 0).fill(COLORS.green);
root.addChild(chrome);

// Header
const logo = new Container(); logo.position.set(55, 48); root.addChild(logo);
logo.addChild(new Graphics().roundRect(0, 0, 88, 88, 25).fill(COLORS.green));
const rf = center(text('RF', 38, 0x07150f, '900'), 44); rf.anchor.y = 0.5; rf.y = 44; logo.addChild(rf);
const title = text('ROCKET', 28, COLORS.text, '800', 5); title.position.set(112, 10); logo.addChild(title);
const subtitle = text('RUSH PLANE', 20, COLORS.muted, '700', 3); subtitle.position.set(112, 51); logo.addChild(subtitle);

const soundButton = new Container(); soundButton.position.set(610, 60); soundButton.eventMode = 'static'; soundButton.cursor = 'pointer'; root.addChild(soundButton);
soundButton.addChild(new Graphics().roundRect(0, 0, 175, 67, 22).fill(COLORS.panel2).stroke({ color: COLORS.line, width: 2 }));
const soundText = center(text('', 20, COLORS.cyan, '700', 2), 88); soundText.anchor.y = 0.5; soundText.y = 34; soundButton.addChild(soundText);
const totalTitle = text('TOTAL SCORE', 18, COLORS.muted, '700', 3); totalTitle.position.set(830, 52); root.addChild(totalTitle);
const totalText = text('0', 42, COLORS.text, '800'); totalText.anchor.set(1, 0); totalText.position.set(1025, 80); root.addChild(totalText);

// History
const historyLabel = text('RECENT FLIGHTS', 18, COLORS.muted, '700', 3); historyLabel.position.set(55, 172); root.addChild(historyLabel);
const history = new Container(); history.position.set(55, 211); root.addChild(history);

// Flight viewport
const flight = new Container(); flight.position.set(40, 292); root.addChild(flight);
const flightMask = new Graphics().roundRect(0, 0, 1000, 1120, 48).fill(0xffffff); flight.mask = flightMask; flight.addChild(flightMask);
flight.addChild(new Graphics().roundRect(0, 0, 1000, 1120, 48).fill({ color: 0x071020 }).stroke({ color: COLORS.line, width: 3 }));

const farStars = new Container();
const midStars = new Container();
function starLayer(layer, count, color, size, seed) {
  const g = new Graphics();
  for (let i = 0; i < count; i++) {
    const x = (i * 197 + seed * 43) % 970 + 15;
    const y = (i * 283 + seed * 79) % 1090 + 15;
    g.circle(x, y, (i % size) + 1).fill({ color, alpha: 0.32 + (i % 4) * 0.12 });
    g.circle(x, y + 1120, (i % size) + 1).fill({ color, alpha: 0.32 + (i % 4) * 0.12 });
  }
  layer.addChild(g); flight.addChild(layer);
}
starLayer(farStars, 58, 0x92aeca, 2, 3); starLayer(midStars, 24, 0xe3f7ff, 3, 7);

const horizon = new Graphics().rect(0, 735, 1000, 385).fill({ color: 0x071a25, alpha: 0.7 }); flight.addChild(horizon);
const grid = new Graphics(); flight.addChild(grid);
function drawGrid(offset = 0) {
  grid.clear();
  grid.moveTo(0, 735).lineTo(1000, 735).stroke({ color: COLORS.cyan, alpha: 0.32, width: 2 });
  for (let i = -8; i <= 8; i++) grid.moveTo(500, 735).lineTo(500 + i * 155, 1120).stroke({ color: COLORS.cyan, alpha: 0.12, width: 2 });
  for (let i = 0; i < 11; i++) {
    const p = ((i / 10 + offset) % 1) ** 2;
    const y = 735 + p * 385;
    grid.moveTo(0, y).lineTo(1000, y).stroke({ color: COLORS.cyan, alpha: 0.08 + p * 0.14, width: 2 });
  }
}
drawGrid();

const multiplierText = center(text('1.00x', 132, COLORS.text, '800', -3), 500); multiplierText.anchor.y = 0; multiplierText.y = 80; flight.addChild(multiplierText);
const flightStatus = center(text('READY FOR LAUNCH', 22, COLORS.cyan, '700', 5), 500); flightStatus.anchor.y = 0; flightStatus.y = 230; flight.addChild(flightStatus);
const accent = new Graphics().roundRect(410, 274, 180, 5, 3).fill({ color: COLORS.cyan, alpha: 0.65 }); flight.addChild(accent);

function createRocket() {
  const c = new Container();
  const trail = new Graphics();
  trail.moveTo(-160, 0).lineTo(-35, 0).stroke({ color: COLORS.red, alpha: 0.08, width: 34 });
  trail.moveTo(-120, 0).lineTo(-28, 0).stroke({ color: COLORS.gold, alpha: 0.17, width: 15 });
  c.addChild(trail);
  const flame = new Graphics().moveTo(-31, -13).lineTo(-90, 0).lineTo(-31, 13).closePath().fill(COLORS.gold);
  flame.moveTo(-32, -7).lineTo(-65, 0).lineTo(-32, 7).closePath().fill(0xffffff); c.addChild(flame); c.flame = flame;
  const ship = new Graphics();
  ship.moveTo(-42, -31).bezierCurveTo(0, -45, 57, -26, 86, 0).bezierCurveTo(57, 26, 0, 45, -42, 31).closePath().fill(COLORS.red);
  ship.moveTo(33, -29).bezierCurveTo(62, -19, 77, -8, 86, 0).bezierCurveTo(75, 2, 64, 3, 52, 2).closePath().fill(0xff8a62);
  ship.moveTo(-20, 28).lineTo(-48, 62).lineTo(18, 30).closePath().fill(0xc9393f);
  ship.moveTo(-20, -28).lineTo(-48, -62).lineTo(18, -30).closePath().fill(0xc9393f);
  ship.circle(18, 0, 14).fill(0x183c55).stroke({ color: 0xb7f5ff, width: 5 }); c.addChild(ship);
  c.rotation = -0.47; c.scale.set(1.18); return c;
}
const flightTrail = new Graphics(); flight.addChild(flightTrail);
const rocket = createRocket(); rocket.position.set(210, 850); flight.addChild(rocket);

function drawFlightTrail(progress) {
  flightTrail.clear();
  if (progress <= 0) return;
  const endX = rocket.x - 55, endY = rocket.y + 30;
  flightTrail.moveTo(80, 965).bezierCurveTo(260, 930, endX - 250, endY + 190, endX, endY).stroke({ color: COLORS.red, alpha: 0.12, width: 24 });
  flightTrail.moveTo(80, 965).bezierCurveTo(260, 930, endX - 250, endY + 190, endX, endY).stroke({ color: COLORS.gold, alpha: 0.75, width: 6 });
}

// Result card
const resultCard = new Container(); resultCard.visible = false; resultCard.position.set(135, 360); flight.addChild(resultCard);
resultCard.addChild(new Graphics().roundRect(0, 0, 730, 420, 38).fill({ color: 0x09172b, alpha: 0.97 }).stroke({ color: COLORS.line, width: 3 }));
const resultTitle = center(text('', 29, COLORS.green, '800', 5), 365); resultTitle.y = 65; resultCard.addChild(resultTitle);
const resultMultiplier = center(text('', 100, COLORS.text, '800'), 365); resultMultiplier.y = 120; resultCard.addChild(resultMultiplier);
const resultScore = center(text('', 34, COLORS.green, '700', 2), 365); resultScore.y = 270; resultCard.addChild(resultScore);
const resultHint = center(text('', 18, COLORS.muted, '600', 2), 365); resultHint.y = 337; resultCard.addChild(resultHint);

// Stats and action
const statsY = 1450, cardW = 303, gap = 15;
const statNodes = [];
[['BASE SCORE', '100'], ['POTENTIAL', '100'], ['BEST FLIGHT', '1.00x']].forEach(([name, value], i) => {
  const x = 55 + i * (cardW + gap); root.addChild(panel(x, statsY, cardW, 170, 28));
  const nameNode = center(text(name, 18, COLORS.muted, '700', 3), x + cardW / 2); nameNode.y = statsY + 34; root.addChild(nameNode);
  const valueNode = center(text(value, 47, i === 1 ? COLORS.green : COLORS.text, '800'), x + cardW / 2); valueNode.y = statsY + 82; root.addChild(valueNode); statNodes.push(valueNode);
});

const action = new Container(); action.position.set(55, 1660); action.eventMode = 'static'; action.cursor = 'pointer'; root.addChild(action);
const actionBg = new Graphics().roundRect(0, 0, 970, 166, 34).fill(COLORS.green); action.addChild(actionBg);
const actionText = center(text('START FLIGHT', 35, 0x06140d, '900', 3), 485); actionText.anchor.y = 0.5; actionText.y = 70; action.addChild(actionText);
const actionSub = center(text('TAP TO LAUNCH', 17, 0x164c2b, '700', 4), 485); actionSub.anchor.y = 0.5; actionSub.y = 118; action.addChild(actionSub);
const legal = center(text('VIRTUAL SCORE ONLY · NO REAL-WORLD VALUE', 15, COLORS.muted, '600', 2), 540); legal.y = 1856; root.addChild(legal);

const machine = new GameMachine();
const generator = new FlightMultiplierGenerator();
const multiplierController = new MultiplierController();
const store = new SaveStore();
const save = store.load();
let elapsed = 0, maxMultiplier = 2, multiplier = 1, potential = CONFIG.baseScore;
let shownPotential = potential, shownTotal = save.totalScore, outcome = null, resultTimer = 0, pulse = 0, historySlide = 0;

const audioContext = () => new (window.AudioContext || window.webkitAudioContext)();
let audio;
function beep(frequency = 420, duration = 0.06) {
  if (!save.soundEnabled) return;
  audio ??= audioContext();
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.frequency.value = frequency; gain.gain.value = CONFIG.soundVolume;
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function vibrate(ms = 18) { navigator.vibrate?.(ms); }

function multiplierColor(value) { return value >= 5 ? COLORS.purple : value >= 2.5 ? COLORS.gold : value >= 1.5 ? COLORS.green : COLORS.muted; }
function drawHistory() {
  history.removeChildren();
  const items = save.history.slice(0, CONFIG.historyCount);
  const width = 112, gap = 10;
  items.forEach((value, i) => {
    const item = new Container(); item.x = i * (width + gap); history.addChild(item);
    item.addChild(new Graphics().roundRect(0, 0, width, 55, 20).fill(COLORS.panel2).stroke({ color: multiplierColor(value), alpha: 0.5, width: 2 }));
    const t = center(text(`${value.toFixed(2)}x`, 20, multiplierColor(value), '700'), width / 2); t.anchor.y = 0.5; t.y = 28; item.addChild(t);
  });
  historyLabel.text = items.length ? 'RECENT FLIGHTS' : 'RECENT FLIGHTS · NO FLIGHTS YET';
}
function updateSound() { soundText.text = save.soundEnabled ? '◖  SOUND ON' : 'SOUND OFF'; }
drawHistory(); updateSound(); totalText.text = String(save.totalScore); statNodes[2].text = `${save.bestMultiplier.toFixed(2)}x`;

function enterReady() {
  if (machine.state === GameState.Idle || machine.state === GameState.Result) machine.move(GameState.Ready);
  resultCard.visible = false; outcome = null; multiplier = 1; potential = CONFIG.baseScore; shownPotential = potential;
  flightTrail.clear();
  rocket.visible = true; rocket.position.set(210, 850); multiplierText.text = '1.00x'; flightStatus.text = 'READY FOR LAUNCH'; flightStatus.style.fill = COLORS.cyan;
  actionText.text = 'START FLIGHT'; actionSub.text = 'TAP TO LAUNCH'; actionBg.clear().roundRect(0, 0, 970, 166, 34).fill(COLORS.green);
}
function startFlight() {
  machine.move(GameState.Flying); elapsed = 0; multiplier = 1; maxMultiplier = generator.next(); potential = CONFIG.baseScore;
  flightStatus.text = 'FLIGHT ACTIVE'; flightStatus.style.fill = COLORS.green;
  actionText.text = 'END FLIGHT'; actionSub.text = 'LOCK SCORE'; beep(520, 0.09); vibrate();
}
function endFlight(success) {
  if (machine.state !== GameState.Flying) return;
  machine.move(GameState.Ending); outcome = success ? 'success' : 'failed';
  if (success) {
    save.totalScore += potential; save.bestMultiplier = Math.max(save.bestMultiplier, multiplier);
    resultTitle.text = save.bestMultiplier === multiplier && multiplier > 1 ? 'NEW BEST · FLIGHT COMPLETE' : 'FLIGHT COMPLETE';
    resultTitle.style.fill = COLORS.green; resultScore.text = `+${potential} SCORE`; resultHint.text = 'SCORE LOCKED AND SAVED'; beep(760, 0.16);
    flightStatus.text = 'SCORE LOCKED'; flightStatus.style.fill = COLORS.green;
  } else {
    resultTitle.text = 'ENGINE FAILURE'; resultTitle.style.fill = COLORS.red; resultScore.text = '+0 SCORE'; resultHint.text = 'THE ROCKET REACHED ITS LIMIT'; beep(130, 0.25);
    flightStatus.text = 'FLIGHT TERMINATED'; flightStatus.style.fill = COLORS.red;
  }
  save.history.unshift(multiplier); save.history = save.history.slice(0, CONFIG.historyCount); store.save(save);
  resultMultiplier.text = `${multiplier.toFixed(2)}x`; resultCard.visible = true; historySlide = 1; drawHistory(); resultTimer = 0; vibrate(success ? 35 : 120);
}
function finishEnding() {
  machine.move(outcome === 'success' ? GameState.Success : GameState.Failed);
  machine.move(GameState.Result);
  actionText.text = 'FLY AGAIN'; actionSub.text = 'NEW FLIGHT';
  actionBg.clear().roundRect(0, 0, 970, 166, 34).fill(outcome === 'success' ? COLORS.green : COLORS.red);
}

action.on('pointerdown', () => { action.scale.set(0.975); action.position.x += 12; action.position.y += 2; beep(); });
action.on('pointerupoutside', () => { action.scale.set(1); action.position.set(55, 1660); });
action.on('pointerup', () => {
  action.scale.set(1); action.position.set(55, 1660);
  if (machine.state === GameState.Ready) startFlight(); else if (machine.state === GameState.Flying) endFlight(true); else if (machine.state === GameState.Result) enterReady();
});
soundButton.on('pointertap', () => { save.soundEnabled = !save.soundEnabled; store.save(save); updateSound(); if (save.soundEnabled) beep(600); });

enterReady();
app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 0.05);
  const time = performance.now() / 1000;
  farStars.y = (time * 28) % 1120 - 1120; midStars.y = (time * 72) % 1120 - 1120;
  drawGrid((time * 0.17) % 0.1);
  rocket.flame.scale.x = 0.9 + Math.sin(time * 19) * 0.1;
  rocket.y += Math.sin(time * 4) * 0.18;
  if (historySlide > 0.001) { historySlide *= 0.84; history.x = 55 + historySlide * 55; } else history.x = 55;

  if (machine.state === GameState.Flying) {
    elapsed += dt; const oldHundredth = Math.floor(multiplier * 100);
    multiplier = multiplierController.valueAt(elapsed, maxMultiplier); potential = Math.floor(CONFIG.baseScore * multiplier);
    if (Math.floor(multiplier * 100) !== oldHundredth) pulse = 1;
    const progress = Math.min((multiplier - 1) / Math.max(maxMultiplier - 1, 0.1), 0.96);
    const eased = 1 - (1 - progress) ** 2;
    rocket.x = 210 + eased * 580 + Math.sin(time * 2.2) * 9;
    rocket.y = 850 - eased * 440 + Math.sin(time * 4.1) * 8;
    rocket.rotation = -0.47 + Math.sin(time * 3) * 0.018;
    drawFlightTrail(progress);
    multiplierText.text = `${multiplier.toFixed(2)}x`;
    if (multiplier >= maxMultiplier) endFlight(false);
  }
  pulse *= 0.78; multiplierText.scale.set(1 + pulse * 0.035);
  shownPotential += (potential - shownPotential) * Math.min(dt * 10, 1);
  shownTotal += (save.totalScore - shownTotal) * Math.min(dt * 7, 1);
  statNodes[1].text = String(Math.round(shownPotential)); statNodes[2].text = `${save.bestMultiplier.toFixed(2)}x`; totalText.text = String(Math.round(shownTotal));
  if (machine.state === GameState.Ending) { resultTimer += dt; rocket.rotation += (outcome === 'failed' ? Math.sin(time * 35) * 0.035 : 0); if (resultTimer > 0.5) finishEnding(); }
});
