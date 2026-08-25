import { Button, Color, instantiate, Label, Node, Prefab, ProgressBar, tween, Tween, UITransform } from 'cc';

export class UIManager {
  private scoreLabel!: Label;
  private comboLabel!: Label;
  private livesLabel!: Label;
  private gameOver!: Node;
  private gameOverTitle!: Label;
  private finalLabel!: Label;
  private healthBar: Node | null = null;
  private healthFill: ProgressBar | null = null;
  private healthRatio = 1;
  private hudActive = false;
  private reviveButton: Node | null = null;
  private reviveMessage: Label | null = null;
  private testButton: Node | null = null;

  constructor(private root: Node, private onRestart: () => void, private onMenu: () => void, private onRevive: () => void) { this.build(); }

  showPlaying(): void { this.gameOver.active = false; this.setHud(true); }
  showGameOver(score: number, best: number, canRevive: boolean): void {
    this.gameOver.active = true; this.setHud(false);
    this.gameOverTitle.string = 'AIRCRAFT LOST';
    this.finalLabel.string = `SCORE  ${score}\nBEST  ${best}`;
    if (this.reviveButton) this.reviveButton.active = canRevive;
    if (this.reviveMessage) this.reviveMessage.string = canRevive ? 'WATCH A VIDEO TO RETURN' : 'NO REVIVES LEFT';
  }
  showLevelComplete(score: number, best: number, nextLevelId?: number): void {
    this.gameOver.active = true; this.setHud(false); this.gameOverTitle.string = 'MISSION COMPLETE';
    this.finalLabel.string = `SCORE  ${score}\nBEST  ${best}`;
    if (this.reviveButton) this.reviveButton.active = false;
    if (this.reviveMessage) this.reviveMessage.string = nextLevelId ? `LOADING LEVEL ${nextLevelId}...` : 'ALL LEVELS COMPLETE';
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
    this.gameOverTitle = this.prefabLabel(this.gameOver.getChildByName('Title')!, 'AIRCRAFT LOST', 42, new Color('#ffd36d'));
    this.finalLabel = this.prefabLabel(this.gameOver.getChildByName('FinalScore')!, '', 24, Color.WHITE);
    this.reviveMessage = this.prefabLabel(this.gameOver.getChildByName('Message')!, '', 16, new Color('#b8d5e7'));
    this.reviveButton = this.gameOver.getChildByName('ReviveButton')!; this.prefabButton(this.reviveButton, this.onRevive);
    this.prefabButton(this.gameOver.getChildByName('RestartButton')!, this.onRestart);
    this.prefabButton(this.gameOver.getChildByName('MenuButton')!, this.onMenu);
  }

  attachTestButton(prefab: Prefab, callback: () => void): void {
    this.testButton = instantiate(prefab); this.testButton.layer = this.root.layer; this.testButton.setParent(this.root); this.testButton.setPosition(520, 310); this.testButton.active = this.hudActive;
    this.prefabButton(this.testButton, callback);
  }

  setReviveBusy(busy: boolean, failed = false): void {
    if (this.reviveButton) this.reviveButton.getComponent(Button)!.interactable = !busy;
    if (this.reviveMessage) this.reviveMessage.string = failed ? 'VIDEO NOT AVAILABLE' : busy ? 'LOADING VIDEO...' : 'WATCH A VIDEO TO RETURN';
  }

  private build(): void {
    this.scoreLabel = this.label('ScoreLabel', 'SCORE  0', 38, new Color('#ffffff'), 0, 315);
    this.comboLabel = this.label('ComboLabel', '', 28, new Color('#fff18a'), 0, 270);
    this.livesLabel = this.label('LivesLabel', 'LIVES  3', 30, new Color('#ff9a86'), -510, 315);
    this.gameOver = new Node('GameOverPlaceholder'); this.gameOver.setParent(this.root); this.gameOver.active = false;
  }

  private setHud(active: boolean): void { this.hudActive = active; this.scoreLabel.node.active = active; this.comboLabel.node.active = active; this.livesLabel.node.active = active; if (this.healthBar) this.healthBar.active = active; if (this.testButton) this.testButton.active = active; }

  private label(name: string, text: string, size: number, color: Color, x: number, y: number, parent = this.root): Label {
    const node = new Node(name); node.layer = parent.layer; node.setParent(parent); node.setPosition(x, y); node.addComponent(UITransform).setContentSize(600, Math.max(60, size * 2));
    const label = node.addComponent(Label); label.string = text; label.fontSize = size; label.lineHeight = size + 8;
    label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
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
