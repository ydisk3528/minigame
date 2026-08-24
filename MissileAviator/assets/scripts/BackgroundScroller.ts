import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
const { ccclass } = _decorator;

type ScrollLayer = { nodes: Node[]; speed: number };

@ccclass('BackgroundScroller')
export class BackgroundScroller extends Component {
  private offset = 0;
  private graphics!: Graphics;
  private layers: ScrollLayer[] = [];

  onLoad(): void {
    this.getComponent(UITransform) ?? this.addComponent(UITransform).setContentSize(1280, 720);
    this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    this.drawFallback();
    this.loadLayers();
  }

  scroll(dt: number, speed: number): void {
    if (!this.layers.length) {
      this.offset = (this.offset + speed * dt) % 320;
      this.drawFallback();
      return;
    }
    for (const layer of this.layers) {
      for (const tile of layer.nodes) tile.setPosition(tile.position.x - speed * layer.speed * dt, tile.position.y);
      for (const tile of layer.nodes) {
        if (tile.position.x > -1920) continue;
        const rightmost = layer.nodes.reduce((right, other) => other.position.x > right.position.x ? other : right);
        tile.setPosition(rightmost.position.x + 1280, tile.position.y);
      }
    }
  }

  private loadLayers(): void {
    const names = ['sky', 'clouds', 'distant-trees', 'grass'];
    Promise.all(names.map(name => new Promise<SpriteFrame | null>(resolve =>
      resources.load(`art/background/${name}/spriteFrame`, SpriteFrame, (error, frame) => resolve(error ? null : frame)))))
      .then(([sky, clouds, trees, grass]) => {
        if (!this.isValid || !sky || !clouds || !trees || !grass) return;
        this.graphics.enabled = false;
        this.layers = [
          { nodes: this.tiles('Sky', sky, 720, 0), speed: .08 },
          { nodes: this.tiles('Clouds', clouds, 210, 120), speed: .28 },
          { nodes: this.tiles('DistantTrees', trees, 300, -165), speed: .58 },
          { nodes: this.tiles('Grass', grass, 120, -350), speed: 1.35 },
        ];
      });
  }

  private tiles(name: string, frame: SpriteFrame, height: number, y: number): Node[] {
    return [
      this.sprite(`${name}Left`, frame, 1280, height, -1280, y),
      this.sprite(`${name}Center`, frame, 1280, height, 0, y),
      this.sprite(`${name}Right`, frame, 1280, height, 1280, y),
    ];
  }

  private sprite(name: string, frame: SpriteFrame, width: number, height: number, x: number, y: number): Node {
    const node = new Node(name); node.layer = this.node.layer; node.setParent(this.node); node.setPosition(x, y);
    node.addComponent(UITransform).setContentSize(width, height);
    const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame;
    return node;
  }

  private drawFallback(): void {
    const g = this.graphics; g.clear();
    g.fillColor = new Color('#65b9e8'); g.rect(-640, -360, 1280, 720); g.fill();
    g.fillColor = new Color('#dff8ff');
    for (let x = -750 - this.offset; x < 760; x += 320) { g.rect(x, 160, 120, 24); g.rect(x + 22, 184, 60, 18); }
    g.fill();
    g.fillColor = new Color('#325a63'); g.rect(-640, -305, 1280, 70); g.fill();
  }
}
