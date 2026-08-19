import { instantiate, Node, Prefab } from 'cc';

export class ObjectPoolManager {
  private pools = new Map<string, Node[]>();

  acquire(key: string, prefab: Prefab, parent: Node): Node {
    const pool = this.pools.get(key) ?? [];
    this.pools.set(key, pool);
    const node = pool.pop() ?? instantiate(prefab);
    node.active = true;
    node.setParent(parent);
    return node;
  }

  release(key: string, node: Node): void {
    node.active = false;
    node.removeFromParent();
    (this.pools.get(key) ?? this.makePool(key)).push(node);
  }

  clear(): void {
    this.pools.forEach(pool => pool.forEach(node => node.destroy()));
    this.pools.clear();
  }

  private makePool(key: string): Node[] {
    const pool: Node[] = [];
    this.pools.set(key, pool);
    return pool;
  }
}
