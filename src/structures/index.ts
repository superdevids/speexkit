/**
 * @file Over-engineered data structures for speexkit. Zero deps, ESM, strict.
 *
 * If you need something simpler, you have come to the wrong place.
 * — speexkit
 */

/* ──────────────────────────────────────────── Trie ─────────────────────── */

class TrieNode {
  children: Map<string, TrieNode> = new Map()
  isEnd = false
}

/**
 * Prefix tree (trie) for autocomplete / dictionary workloads.
 *
 * @example
 * ```ts
 * const t = new Trie()
 * t.insert("hello"); t.insert("help")
 * t.startsWith("hel") // ["hello", "help"]
 * ```
 */
export class Trie {
  #root = new TrieNode()
  #size = 0

  /** Insert a word into the trie. */
  insert(word: string): void {
    let node = this.#root
    for (const ch of word) {
      let next = node.children.get(ch)
      if (!next) {
        next = new TrieNode()
        node.children.set(ch, next)
      }
      node = next
    }
    if (!node.isEnd) this.#size++
    node.isEnd = true
  }

  /** Returns `true` if the exact word exists. */
  search(word: string): boolean {
    const node = this.#traverse(word)
    return node !== null && node.isEnd
  }

  /** Returns every stored word that starts with the given prefix. */
  startsWith(prefix: string): string[] {
    const node = this.#traverse(prefix)
    if (!node) return []
    const results: string[] = []
    this.#collect(node, prefix, results)
    return results
  }

  /** Remove a word from the trie. */
  delete(word: string): void {
    const path: { node: TrieNode; ch: string }[] = []
    let node = this.#root
    for (const ch of word) {
      const next = node.children.get(ch)
      if (!next) return
      path.push({ node, ch })
      node = next
    }
    if (!node.isEnd) return
    node.isEnd = false
    this.#size--
    for (let i = path.length - 1; i >= 0; i--) {
      const { node: parent, ch } = path[i]!
      const child = parent.children.get(ch)!
      if (child.children.size === 0 && !child.isEnd) {
        parent.children.delete(ch)
      } else {
        break
      }
    }
  }

  /** Number of distinct words stored. */
  count(): number {
    return this.#size
  }

  /* ---- private helpers ---- */

  #traverse(prefix: string): TrieNode | null {
    let node: TrieNode | undefined = this.#root
    for (const ch of prefix) {
      node = node.children.get(ch)
      if (!node) return null
    }
    return node
  }

  #collect(node: TrieNode, prefix: string, out: string[]): void {
    if (node.isEnd) out.push(prefix)
    for (const [ch, child] of node.children) {
      this.#collect(child, prefix + ch, out)
    }
  }
}

/* ──────────────────────────────────────────── Graph ────────────────────── */

interface AdjEntry {
  node: string
  weight: number
}

/**
 * Adjacency-list directed graph with BFS, DFS, Dijkstra, and topological sort.
 *
 * @example
 * ```ts
 * const g = new Graph()
 * g.addEdge("a", "b", 5); g.addEdge("a", "c", 2)
 * g.dijkstra("a") // { a: 0, c: 2, b: 5 }
 * ```
 */
export class Graph {
  #adj = new Map<string, AdjEntry[]>()
  #edgeCount = 0

  /** Add a directed edge (default weight = 1). */
  addEdge(from: string, to: string, weight = 1): void {
    let edges = this.#adj.get(from)
    if (!edges) {
      edges = []
      this.#adj.set(from, edges)
    }
    edges.push({ node: to, weight })
    if (!this.#adj.has(to)) this.#adj.set(to, [])
    this.#edgeCount++
  }

  /** Returns `true` if a direct edge exists. */
  hasEdge(from: string, to: string): boolean {
    const edges = this.#adj.get(from)
    if (!edges) return false
    return edges.some(e => e.node === to)
  }

  /** Return all outgoing neighbours (with weight). */
  getNeighbors(node: string): AdjEntry[] {
    return this.#adj.get(node) ?? []
  }

  /** Breadth-first traversal from `start`. */
  bfs(start: string): string[] {
    const visited = new Set<string>()
    const queue: string[] = [start]
    const order: string[] = []
    visited.add(start)
    while (queue.length) {
      const v = queue.shift()!
      order.push(v)
      for (const { node } of this.#adj.get(v) ?? []) {
        if (!visited.has(node)) {
          visited.add(node)
          queue.push(node)
        }
      }
    }
    return order
  }

  /** Depth-first traversal from `start`. */
  dfs(start: string): string[] {
    const visited = new Set<string>()
    const order: string[] = []
    this.#dfs(start, visited, order)
    return order
  }

  /** Dijkstra shortest paths from `start`. */
  dijkstra(start: string): Record<string, number> {
    const dist = new Map<string, number>()
    const pq: { node: string; dist: number }[] = []
    for (const v of this.#adj.keys()) dist.set(v, Infinity)
    dist.set(start, 0)
    pq.push({ node: start, dist: 0 })

    while (pq.length) {
      pq.sort((a, b) => a.dist - b.dist)
      const { node: u, dist: du } = pq.shift()!
      if (du !== dist.get(u)) continue
      for (const { node: v, weight } of this.#adj.get(u) ?? []) {
        const nd = du + weight
        if (nd < (dist.get(v) ?? Infinity)) {
          dist.set(v, nd)
          pq.push({ node: v, dist: nd })
        }
      }
    }

    const out: Record<string, number> = {}
    for (const [k, v] of dist) out[k] = v
    return out
  }

  /** Topological sort. Throws if a cycle is detected. */
  topoSort(): string[] {
    const visited = new Set<string>()
    const stack = new Set<string>()
    const order: string[] = []

    const dfs = (u: string): void => {
      visited.add(u)
      stack.add(u)
      for (const { node: v } of this.#adj.get(u) ?? []) {
        if (stack.has(v))
          throw new Error(`Cycle detected: ${u} -> ${v}`)
        if (!visited.has(v)) dfs(v)
      }
      stack.delete(u)
      order.unshift(u)
    }

    for (const v of this.#adj.keys()) {
      if (!visited.has(v)) dfs(v)
    }
    return order
  }

  /** Number of distinct nodes. */
  nodeCount(): number {
    return this.#adj.size
  }

  /** Number of directed edges. */
  edgeCount(): number {
    return this.#edgeCount
  }

  /* ---- private helpers ---- */

  #dfs(v: string, visited: Set<string>, order: string[]): void {
    visited.add(v)
    order.push(v)
    for (const { node } of this.#adj.get(v) ?? []) {
      if (!visited.has(node)) this.#dfs(node, visited, order)
    }
  }
}

/* ──────────────────────────────────────────── Bloom Filter ─────────────── */

/**
 * Probabilistic membership test. False positives possible; false negatives not.
 *
 * @example
 * ```ts
 * const bf = new BloomFilter({ size: 256, hashCount: 3 })
 * bf.add("foo")
 * bf.has("foo") // true
 * bf.has("bar") // probably false
 * ```
 */
export class BloomFilter {
  #bits: number[]
  #size: number
  #hashCount: number

  constructor(opts: { size: number; hashCount: number }) {
    this.#size = opts.size
    this.#hashCount = opts.hashCount
    this.#bits = new Array<number>(this.#size).fill(0)
  }

  /** Insert an item. */
  add(item: string): void {
    for (let i = 0; i < this.#hashCount; i++) {
      this.#bits[this.#hash(item, i) % this.#size] = 1
    }
  }

  /** Test membership (may false-positive). */
  has(item: string): boolean {
    for (let i = 0; i < this.#hashCount; i++) {
      if (!this.#bits[this.#hash(item, i) % this.#size]) return false
    }
    return true
  }

  /** Reset all bits. */
  clear(): void {
    this.#bits.fill(0)
  }

  /**
   * djb2-style hash with seed.
   */
  #hash(s: string, seed: number): number {
    let h = 5381 + seed * 0x9e3779b9
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0
    }
    return h >>> 0
  }
}

/* ──────────────────────────────────── Heap ─────────────────────────────── */

/**
 * Binary heap (min or max via custom comparator).
 *
 * @example
 * ```ts
 * const h = new Heap<number>()                          // min-heap
 * const mx = new Heap<number>({ comparator: (a,b) => b - a }) // max-heap
 * ```
 */
export class Heap<T> {
  #data: T[] = []
  #cmp: (a: T, b: T) => number

  constructor(opts?: { comparator?: (a: T, b: T) => number }) {
    this.#cmp = opts?.comparator ?? ((a: T, b: T) => (a as any) - (b as any))
  }

  /** Insert a value. */
  push(value: T): void {
    this.#data.push(value)
    this.#bubbleUp(this.#data.length - 1)
  }

  /** Remove and return the min/max value, or `undefined` if empty. */
  pop(): T | undefined {
    if (this.#data.length === 0) return undefined
    const top = this.#data[0]
    const bottom = this.#data.pop()!
    if (this.#data.length > 0) {
      this.#data[0] = bottom
      this.#bubbleDown(0)
    }
    return top
  }

  /** Return the min/max value without removing it. */
  peek(): T | undefined {
    return this.#data[0]
  }

  /** Number of elements. */
  get size(): number {
    return this.#data.length
  }

  /** Returns `true` when the heap is empty. */
  isEmpty(): boolean {
    return this.#data.length === 0
  }

  /* ---- private helpers ---- */

  #bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.#cmp(this.#data[i]!, this.#data[p]!) >= 0) break
      ;[this.#data[i]!, this.#data[p]!] = [this.#data[p]!, this.#data[i]!]
      i = p
    }
  }

  #bubbleDown(i: number): void {
    const n = this.#data.length
    while (true) {
      let smallest = i
      const l = (i << 1) + 1
      const r = l + 1
      if (l < n && this.#cmp(this.#data[l]!, this.#data[smallest]!) < 0) smallest = l
      if (r < n && this.#cmp(this.#data[r]!, this.#data[smallest]!) < 0) smallest = r
      if (smallest === i) break
      ;[this.#data[i]!, this.#data[smallest]!] = [this.#data[smallest]!, this.#data[i]!]
      i = smallest
    }
  }
}

/* ───────────────────────────── Priority Queue ─────────────────────────── */

type Priority<T> = (item: T) => number

/**
 * Priority queue built on a min-heap.
 *
 * @example
 * ```ts
 * const pq = new PriorityQueue<{ name: string; pri: number }>({
 *   priority: x => x.pri
 * })
 * pq.enqueue({ name: "low", pri: 5 })
 * pq.enqueue({ name: "high", pri: 1 })
 * pq.dequeue() // { name: "high", pri: 1 }
 * ```
 */
export class PriorityQueue<T> {
  #heap: Heap<{ value: T }>

  constructor(opts?: { priority?: Priority<T> }) {
    const pri = opts?.priority ?? ((x: T) => (x as any))
    this.#heap = new Heap({
      comparator: (a, b) => pri(a.value) - pri(b.value),
    })
  }

  /** Insert a value. */
  enqueue(value: T): void {
    this.#heap.push({ value })
  }

  /** Remove and return the highest-priority item. */
  dequeue(): T | undefined {
    return this.#heap.pop()?.value
  }

  /** View the highest-priority item without removing it. */
  peek(): T | undefined {
    return this.#heap.peek()?.value
  }

  /** Number of items. */
  get size(): number {
    return this.#heap.size
  }
}

/* ─────────────────────────────── Doubly Linked List ────────────────────── */

class ListNode<T> {
  value: T
  next: ListNode<T> | null = null
  prev: ListNode<T> | null = null
  constructor(value: T) {
    this.value = value
  }
}

/**
 * Doubly linked list with O(1) append/prepend.
 *
 * @example
 * ```ts
 * const ll = new LinkedList<number>()
 * ll.append(1); ll.prepend(2)
 * ll.toArray() // [2, 1]
 * ```
 */
export class LinkedList<T> {
  #head: ListNode<T> | null = null
  #tail: ListNode<T> | null = null
  #size = 0

  /** Append to the end. */
  append(value: T): void {
    const node = new ListNode(value)
    if (!this.#tail) {
      this.#head = this.#tail = node
    } else {
      this.#tail.next = node
      node.prev = this.#tail
      this.#tail = node
    }
    this.#size++
  }

  /** Prepend to the front. */
  prepend(value: T): void {
    const node = new ListNode(value)
    if (!this.#head) {
      this.#head = this.#tail = node
    } else {
      this.#head.prev = node
      node.next = this.#head
      this.#head = node
    }
    this.#size++
  }

  /** Delete the first occurrence. Returns `true` if an element was removed. */
  delete(value: T): boolean {
    let cur = this.#head
    while (cur) {
      if (cur.value === value) {
        this.#removeNode(cur)
        return true
      }
      cur = cur.next
    }
    return false
  }

  /** Find the first occurrence (by reference). */
  find(value: T): T | undefined {
    let cur = this.#head
    while (cur) {
      if (cur.value === value) return cur.value
      cur = cur.next
    }
    return undefined
  }

  /** Convert to a plain array. */
  toArray(): T[] {
    const out: T[] = []
    let cur = this.#head
    while (cur) {
      out.push(cur.value)
      cur = cur.next
    }
    return out
  }

  /** Number of nodes. */
  get size(): number {
    return this.#size
  }

  /** Returns `true` when the list is empty. */
  isEmpty(): boolean {
    return this.#size === 0
  }

  /** Remove all nodes. */
  clear(): void {
    this.#head = null
    this.#tail = null
    this.#size = 0
  }

  /* ---- private helpers ---- */

  #removeNode(node: ListNode<T>): void {
    if (node.prev) node.prev.next = node.next
    else this.#head = node.next

    if (node.next) node.next.prev = node.prev
    else this.#tail = node.prev

    this.#size--
  }
}

/* ───────────────────────────── Deque ───────────────────────────────────── */

/**
 * Double-ended queue backed by a plain array (ring-buffer semantics).
 *
 * @example
 * ```ts
 * const d = new Deque<number>()
 * d.pushBack(1); d.pushFront(2)
 * d.popFront() // 2
 * d.popBack()  // 1
 * ```
 */
export class Deque<T> {
  #data: (T | undefined)[] = []
  #front = 0
  #back = 0

  /** Insert at the front. */
  pushFront(value: T): void {
    this.#front--
    this.#data[this.#front] = value
  }

  /** Insert at the back. */
  pushBack(value: T): void {
    this.#data[this.#back] = value
    this.#back++
  }

  /** Remove and return the front element. */
  popFront(): T | undefined {
    if (this.#front >= this.#back) return undefined
    const val = this.#data[this.#front]
    this.#data[this.#front] = undefined
    this.#front++
    return val
  }

  /** Remove and return the back element. */
  popBack(): T | undefined {
    if (this.#front >= this.#back) return undefined
    this.#back--
    const val = this.#data[this.#back]
    this.#data[this.#back] = undefined
    return val
  }

  /** View the front element without removing it. */
  peekFront(): T | undefined {
    return this.#data[this.#front]
  }

  /** View the back element without removing it. */
  peekBack(): T | undefined {
    return this.#data[this.#back - 1]
  }

  /** Number of elements. */
  get size(): number {
    return this.#back - this.#front
  }

  /** Returns `true` when the deque is empty. */
  isEmpty(): boolean {
    return this.#front >= this.#back
  }

  /** Remove all elements. */
  clear(): void {
    this.#data = []
    this.#front = 0
    this.#back = 0
  }
}

/* ───────────────────────────── Disjoint Set (Union-Find) ───────────────── */

/**
 * Union-Find data structure with path compression and union by size.
 *
 * @example
 * ```ts
 * const ds = new DisjointSet()
 * ds.union(1, 2); ds.union(2, 3)
 * ds.connected(1, 3) // true
 * ds.setCount()       // 1 (assuming only these three)
 * ```
 */
export class DisjointSet {
  #parent: number[] = []
  #size: number[] = []
  #sets = 0

  constructor(opts?: { size?: number }) {
    if (opts?.size) {
      for (let i = 0; i < opts.size; i++) this.#makeSet(i)
    }
  }

  /** Find the root of `x` (with path compression). */
  find(x: number): number {
    this.#ensure(x)
    if (this.#parent[x]! !== x) {
      this.#parent[x]! = this.find(this.#parent[x]!)
    }
    return this.#parent[x]!
  }

  /** Union the sets containing `x` and `y`. */
  union(x: number, y: number): void {
    const rx = this.find(x)
    const ry = this.find(y)
    if (rx === ry) return
    const sx = this.#size[rx]!
    const sy = this.#size[ry]!
    if (sx < sy) {
      this.#parent[rx]! = ry
      this.#size[ry]! += sx
    } else {
      this.#parent[ry]! = rx
      this.#size[rx]! += sy
    }
    this.#sets--
  }

  /** Returns `true` if `x` and `y` share the same root. */
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y)
  }

  /** Number of distinct sets. */
  setCount(): number {
    return this.#sets
  }

  /* ---- private helpers ---- */

  #ensure(x: number): void {
    while (this.#parent.length <= x) {
      this.#makeSet(this.#parent.length)
    }
  }

  #makeSet(x: number): void {
    this.#parent[x] = x
    this.#size[x] = 1
    this.#sets++
  }
}
