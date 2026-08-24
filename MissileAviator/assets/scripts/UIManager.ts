import { Button, Color, Graphics, instantiate, Label, Node, Prefab, ProgressBar, tween, Tween, UITransform } from 'cc';

export class UIManager {
  private scoreLabel!: Label;
  private comboLabel!: Label;
  private livesLabel!: Label;
  private menu!: Node;
  private gameOver!: Node;
  private finalLabel!: Label;
  private healthBar: Node | null = null;
  private healthFill: ProgressBar | null = null;
  private healthRatio = 1;
  private hudActive = false;
  private reviveButton: Node | null = null;
  private reviveMessage: Label | null = null;

  constructor(private root: Node, private onPlay: () => void, private onRestart: () => void, private onMenu: () => void, private onRevive: () => void) { this.build(); }

  showMenu(): void { this.menu.active = true; this.gameOver.active = false; this.setHud(false); }
  showPlaying(): void { this.menu.active = false; this.gameOver.active = false; this.setHud(true); }
  showGameOver(score: number, best: number, canRevive: boolean): void {
    this.gameOver.active = true; this.setHud(false);
    this.finalLabel.string = `SCORE  ${score}\nBEST  ${best}`;
    if (this.reviveButton) this.reviveButton.active = canRevive;
    if (this.reviveMessage) this.reviveMessage.string = canRevive ? 'WATCH A VIDEO TO RETURN' : 'NO REVIVES LEFT';
  }
  updateScore(score: number, combo: number): void {
    this.scoreLabel.string = `SCORE  ${score}`;
    this.comboLabel.string = combo > 1 ? `COMBO  x${combo}` : '';
  }
  updateLives(lives: number): void { this.livesLabel.string = `LIVES  ${lives}`; }
  updateHealth(current: number, max: number): void {
    this.healthRatio = Math.max(0, Math.min(1, current / max));
    if (this.healthFill) { Tween.stopAllByTarget(this.healthFill); tween(this.healthFill).to(.22, { progress: this.healthRatio }).start(); }
  }
  attachHealthBar(prefab: Prefab): void {
    this.healthBar = instantiate(prefab); this.healthBar.layer = this.root.layer; this.healthBar.setParent(this.root); this.healthBar.setPosition(-490, 270); this.healthBar.active = this.hudActive;
    this.healthFill = this.healthBar.getChildByName('HealthFill')?.getComponent(ProgressBar) ?? null;
    if (this.healthFill) { this.healthFill.totalLength = 172; this.healthFill.progress = this.healthRatio; }
  }

  attachRevivePanel(prefab: Prefab): void {
    this.gameOver.destroy(); this.gameOver = instantiate(prefab); this.gameOver.layer = this.root.layer; this.gameOver.setParent(this.root); this.gameOver.active = false;
    this.prefabLabel(this.gameOver.getChildByName('Title')!, 'AIRCRAFT LOST', 42, new Color('#ffd36d'));
    this.finalLabel = this.prefabLabel(this.gameOver.getChildByName('FinalScore')!, '', 24, Color.WHITE);
    this.reviveMessage = this.prefabLabel(this.gameOver.getChildByName('Message')!, '', 16, new Color('#b8d5e7'));
    this.reviveButton = this.gameOver.getChildByName('ReviveButton')!; this.prefabButton(this.reviveButton, this.onRevive);
    this.prefabButton(this.gameOver.getChildByName('RestartButton')!, this.onRestart);
    this.prefabButton(this.gameOver.getChildByName('MenuButton')!, this.onMenu);
  }

  setReviveBusy(busy: boolean, failed = false): void {
    if (this.reviveButton) this.reviveButton.getComponent(Button)!.interactable = !busy;
    if (this.reviveMessage) this.reviveMessage.string = failed ? 'VIDEO NOT AVAILABLE' : busy ? 'LOADING VIDEO...' : 'WATCH A VIDEO TO RETURN';
  }

  private build(): void {
    this.scoreLabel = this.label('ScoreLabel', 'SCORE  0', 38, new Color('#ffffff'), 0, 315);
    this.comboLabel = this.label('ComboLabel', '', 28, new Color('#fff18a'), 0, 270);
    this.livesLabel = this.label('LivesLabel', 'LIVES  3', 30, new Color('#ff9a86'), -510, 315);
    this.menu = this.panel('MainMenu');
    this.label('Title', 'MISSILE AVIATOR', 58, new Color('#fff18a'), 0, 105, this.menu);
    this.label('Subtitle', 'PIXEL AIR COMBAT', 22, new Color('#dff8ff'), 0, 48, this.menu);
    this.button('START', 0, -45, this.onPlay, this.menu);
    this.gameOver = this.panel('GameOverPanel');
    this.label('GameOverTitle', 'GAME OVER', 52, new Color('#ffcc66'), 0, 120, this.gameOver);
    this.finalLabel = this.label('FinalScore', '', 30, new Color('#ffffff'), 0, 35, this.gameOver);
    this.button('RESTART', 0, -75, this.onRestart, this.gameOver);
    this.button('MAIN MENU', 0, -150, this.onMenu, this.gameOver);
  }

  private setHud(active: boolean): void { this.hudActive = active; this.scoreLabel.node.active = active; this.comboLabel.node.active = active; this.livesLabel.node.active = active; if (this.healthBar) this.healthBar.active = active; }

  private panel(name: string): Node {
    const node = new Node(name); node.layer = this.root.layer; node.setParent(this.root); node.addComponent(UITransform).setContentSize(640, 440);
    const g = node.addComponent(Graphics); g.fillColor = new Color(12, 28, 52, 235); g.roundRect(-320, -220, 640, 440, 12); g.fill();
    g.strokeColor = new Color('#f6b83f'); g.lineWidth = 5; g.roundRect(-320, -220, 640, 440, 12); g.stroke();
    return node;
  }

  private label(name: string, text: string, size: number, color: Color, x: number, y: number, parent = this.root): Label {
    const node = new Node(name); node.layer = parent.layer; node.setParent(parent); node.setPosition(x, y); node.addComponent(UITransform).setContentSize(600, Math.max(60, size * 2));
    const label = node.addComponent(Label); label.string = text; label.fontSize = size; label.lineHeight = size + 8;
    label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
  }

  private button(text: string, x: number, y: number, callback: () => void, parent: Node): void {
    const node = new Node(`${text}Button`); node.layer = parent.layer; node.setParent(parent); node.setPosition(x, y); node.addComponent(UITransform).setContentSize(260, 58);
    const g = node.addComponent(Graphics); g.fillColor = new Color('#d06a32'); g.roundRect(-130, -29, 260, 58, 7); g.fill();
    g.strokeColor = new Color('#fff18a'); g.lineWidth = 3; g.roundRect(-130, -29, 260, 58, 7); g.stroke();
    const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 1.06;
    node.on(Button.EventType.CLICK, callback);
    this.label('Text', text, 28, new Color('#ffffff'), 0, 0, node);
  }

  private prefabLabel(node: Node, value: string, size: number, color: Color): Label {
    const label = node.getComponent(Label); if (!label) throw new Error(`${node.name} missing Label in prefab`); label.string = value; label.fontSize = size; label.lineHeight = size + 6; label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; return label;
  }

  private prefabButton(node: Node, callback: () => void): void {
    if (!node.getComponent(Button) || !node.getChildByName('Text')?.getComponent(Label)) throw new Error(`${node.name} is incomplete in RevivePanel prefab`);
    node.on(Button.EventType.CLICK, callback);
  }
}
