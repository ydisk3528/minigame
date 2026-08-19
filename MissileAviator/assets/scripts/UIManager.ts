import { Button, Color, Graphics, Label, Node, UITransform } from 'cc';

export class UIManager {
  private scoreLabel!: Label;
  private comboLabel!: Label;
  private menu!: Node;
  private gameOver!: Node;
  private finalLabel!: Label;

  constructor(private root: Node, private onStart: () => void, private onMenu: () => void) { this.build(); }

  showMenu(): void { this.menu.active = true; this.gameOver.active = false; this.setHud(false); }
  showPlaying(): void { this.menu.active = false; this.gameOver.active = false; this.setHud(true); }
  showGameOver(score: number, best: number): void {
    this.gameOver.active = true; this.setHud(false);
    this.finalLabel.string = `SCORE  ${score}\nBEST  ${best}`;
  }
  updateScore(score: number, combo: number): void {
    this.scoreLabel.string = `SCORE  ${score}`;
    this.comboLabel.string = combo > 1 ? `COMBO  x${combo}` : '';
  }

  private build(): void {
    this.scoreLabel = this.label('ScoreLabel', 'SCORE  0', 38, new Color('#ffffff'), 0, 315);
    this.comboLabel = this.label('ComboLabel', '', 28, new Color('#fff18a'), 0, 270);
    this.menu = this.panel('MainMenu');
    this.label('Title', 'RING AVIATORX', 58, new Color('#fff18a'), 0, 105, this.menu);
    this.label('Subtitle', 'PIXEL SKY CHALLENGE', 22, new Color('#dff8ff'), 0, 48, this.menu);
    this.button('START', 0, -45, this.onStart, this.menu);
    this.button('QUIT', 0, -125, () => globalThis.close?.(), this.menu);
    this.gameOver = this.panel('GameOverPanel');
    this.label('GameOverTitle', 'GAME OVER', 52, new Color('#ffcc66'), 0, 120, this.gameOver);
    this.finalLabel = this.label('FinalScore', '', 30, new Color('#ffffff'), 0, 35, this.gameOver);
    this.button('RESTART', 0, -75, this.onStart, this.gameOver);
    this.button('MAIN MENU', 0, -150, this.onMenu, this.gameOver);
  }

  private setHud(active: boolean): void { this.scoreLabel.node.active = active; this.comboLabel.node.active = active; }

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
}
