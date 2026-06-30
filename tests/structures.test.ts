import { describe, it, expect, beforeEach } from 'vitest'
import { Trie, Graph, Heap, PriorityQueue, LinkedList, Deque, DisjointSet, BloomFilter } from '../src/structures/index.js'

/* ─────────────────────────────── Trie ─────────────────────────────── */

describe('Trie', () => {
  let trie: Trie

  beforeEach(() => {
    trie = new Trie()
  })

  it('insert and search single word', () => {
    trie.insert('hello')
    expect(trie.search('hello')).toBe(true)
  })

  it('search returns false for word not inserted', () => {
    trie.insert('hello')
    expect(trie.search('world')).toBe(false)
  })

  it('search returns false for prefix that is not complete word', () => {
    trie.insert('hello')
    expect(trie.search('hel')).toBe(false)
  })

  it('startsWith returns all words with prefix', () => {
    trie.insert('hello')
    trie.insert('help')
    trie.insert('held')
    const results = trie.startsWith('hel')
    expect(results).toContain('hello')
    expect(results).toContain('help')
    expect(results).toContain('held')
    expect(results.length).toBe(3)
  })

  it('startsWith returns empty array for missing prefix', () => {
    trie.insert('hello')
    expect(trie.startsWith('xyz')).toEqual([])
  })

  it('startsWith with empty prefix returns all words', () => {
    trie.insert('a')
    trie.insert('b')
    expect(trie.startsWith('').length).toBe(2)
  })

  it('delete removes exact word', () => {
    trie.insert('hello')
    trie.delete('hello')
    expect(trie.search('hello')).toBe(false)
  })

  it('delete partial word does not delete full word', () => {
    trie.insert('hello')
    trie.insert('hel')
    trie.delete('hel')
    expect(trie.search('hello')).toBe(true)
    expect(trie.search('hel')).toBe(false)
  })

  it('delete nonexistent word is no-op', () => {
    trie.insert('hello')
    expect(() => trie.delete('xyz')).not.toThrow()
  })

  it('count returns number of distinct words', () => {
    trie.insert('a')
    trie.insert('b')
    trie.insert('c')
    expect(trie.count()).toBe(3)
  })

  it('count after delete decreases', () => {
    trie.insert('a')
    trie.insert('b')
    trie.delete('a')
    expect(trie.count()).toBe(1)
  })

  it('insert duplicate does not increase count', () => {
    trie.insert('a')
    trie.insert('a')
    expect(trie.count()).toBe(1)
  })

  it('handles empty string', () => {
    trie.insert('')
    expect(trie.search('')).toBe(true)
    expect(trie.startsWith('')).toContain('')
  })
})

/* ─────────────────────────────── Graph ─────────────────────────────── */

describe('Graph', () => {
  let g: Graph

  beforeEach(() => {
    g = new Graph()
  })

  it('addEdge creates vertices', () => {
    g.addEdge('a', 'b')
    expect(g.nodeCount()).toBe(2)
    expect(g.edgeCount()).toBe(1)
  })

  it('hasEdge returns true for existing edge', () => {
    g.addEdge('a', 'b')
    expect(g.hasEdge('a', 'b')).toBe(true)
  })

  it('hasEdge returns false for nonexistent edge', () => {
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('bfs returns nodes in BFS order', () => {
    g.addEdge('a', 'b')
    g.addEdge('a', 'c')
    g.addEdge('b', 'd')
    const order = g.bfs('a')
    expect(order[0]).toBe('a')
    expect(order).toContain('b')
    expect(order).toContain('c')
    expect(order).toContain('d')
  })

  it('dfs returns nodes in DFS order', () => {
    g.addEdge('a', 'b')
    g.addEdge('a', 'c')
    g.addEdge('b', 'd')
    const order = g.dfs('a')
    expect(order[0]).toBe('a')
  })

  it('dijkstra shortest path a→a = 0', () => {
    g.addEdge('a', 'b')
    const dist = g.dijkstra('a')
    expect(dist['a']).toBe(0)
  })

  it('dijkstra returns correct distances', () => {
    g.addEdge('a', 'b', 5)
    g.addEdge('a', 'c', 2)
    g.addEdge('c', 'b', 1)
    const dist = g.dijkstra('a')
    expect(dist['a']).toBe(0)
    expect(dist['c']).toBe(2)
    expect(dist['b']).toBe(3)
  })

  it('dijkstra node with no path gets Infinity', () => {
    g.addEdge('a', 'b')
    g.addEdge('c', 'd')
    const dist = g.dijkstra('a')
    expect(dist['c']).toBe(Infinity)
  })

  it('dijkstra on empty graph returns only start', () => {
    const dist = g.dijkstra('a')
    expect(dist).toEqual({ a: 0 })
  })

  it('bfs on empty/starting node returns single-element', () => {
    expect(g.bfs('orphan')).toEqual(['orphan'])
  })

  it('dfs on empty/starting node returns single-element', () => {
    expect(g.dfs('orphan')).toEqual(['orphan'])
  })

  it('cyclic graph does not cause infinite loop in BFS', () => {
    g.addEdge('a', 'b')
    g.addEdge('b', 'c')
    g.addEdge('c', 'a')
    expect(() => g.bfs('a')).not.toThrow()
  })

  it('topoSort returns topological order', () => {
    g.addEdge('a', 'b')
    g.addEdge('b', 'c')
    const order = g.topoSort()
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'))
  })

  it('topoSort throws on cycle', () => {
    g.addEdge('a', 'b')
    g.addEdge('b', 'a')
    expect(() => g.topoSort()).toThrow('Cycle detected')
  })
})

/* ─────────────────────────────── Heap ─────────────────────────────── */

describe('Heap (min-heap)', () => {
  let heap: Heap<number>

  beforeEach(() => {
    heap = new Heap<number>()
  })

  it('push/pop maintains heap property', () => {
    heap.push(3)
    heap.push(1)
    heap.push(2)
    expect(heap.pop()).toBe(1)
    expect(heap.pop()).toBe(2)
    expect(heap.pop()).toBe(3)
  })

  it('peek returns min without removing', () => {
    heap.push(5)
    heap.push(1)
    expect(heap.peek()).toBe(1)
    expect(heap.size).toBe(2)
  })

  it('pop from empty heap returns undefined', () => {
    expect(heap.pop()).toBeUndefined()
  })

  it('peek from empty heap returns undefined', () => {
    expect(heap.peek()).toBeUndefined()
  })

  it('size returns correct count', () => {
    expect(heap.size).toBe(0)
    heap.push(1)
    expect(heap.size).toBe(1)
    heap.push(2)
    expect(heap.size).toBe(2)
    heap.pop()
    expect(heap.size).toBe(1)
  })

  it('isEmpty returns true when empty', () => {
    expect(heap.isEmpty()).toBe(true)
    heap.push(1)
    expect(heap.isEmpty()).toBe(false)
  })

  it('handles duplicates', () => {
    heap.push(1)
    heap.push(1)
    heap.push(1)
    expect(heap.pop()).toBe(1)
    expect(heap.pop()).toBe(1)
    expect(heap.pop()).toBe(1)
    expect(heap.pop()).toBeUndefined()
  })

  it('handles negative numbers', () => {
    heap.push(-5)
    heap.push(0)
    heap.push(-10)
    expect(heap.pop()).toBe(-10)
    expect(heap.pop()).toBe(-5)
    expect(heap.pop()).toBe(0)
  })

  it('max-heap with custom comparator', () => {
    const maxHeap = new Heap<number>({ comparator: (a, b) => b - a })
    maxHeap.push(1)
    maxHeap.push(3)
    maxHeap.push(2)
    expect(maxHeap.pop()).toBe(3)
    expect(maxHeap.pop()).toBe(2)
    expect(maxHeap.pop()).toBe(1)
  })
})

/* ─────────────────────────────── PriorityQueue ─────────────────────── */

describe('PriorityQueue', () => {
  let pq: PriorityQueue<{ name: string; pri: number }>

  beforeEach(() => {
    pq = new PriorityQueue({ priority: (x) => x.pri })
  })

  it('dequeue returns highest priority (lowest number)', () => {
    pq.enqueue({ name: 'low', pri: 5 })
    pq.enqueue({ name: 'high', pri: 1 })
    pq.enqueue({ name: 'mid', pri: 3 })
    expect(pq.dequeue()?.name).toBe('high')
    expect(pq.dequeue()?.name).toBe('mid')
    expect(pq.dequeue()?.name).toBe('low')
  })

  it('peek returns highest priority without removing', () => {
    pq.enqueue({ name: 'a', pri: 2 })
    pq.enqueue({ name: 'b', pri: 1 })
    expect(pq.peek()?.name).toBe('b')
    expect(pq.size).toBe(2)
  })

  it('dequeue from empty returns undefined', () => {
    expect(pq.dequeue()).toBeUndefined()
  })

  it('peek from empty returns undefined', () => {
    expect(pq.peek()).toBeUndefined()
  })

  it('size returns correct count', () => {
    expect(pq.size).toBe(0)
    pq.enqueue({ name: 'a', pri: 1 })
    expect(pq.size).toBe(1)
    pq.dequeue()
    expect(pq.size).toBe(0)
  })

  it('same priority items maintain FIFO roughly', () => {
    pq.enqueue({ name: 'first', pri: 1 })
    pq.enqueue({ name: 'second', pri: 1 })
    const first = pq.dequeue()
    const second = pq.dequeue()
    expect(first?.name).toBe('first')
    expect(second?.name).toBe('second')
  })

  it('default priority extracts value directly', () => {
    const numPQ = new PriorityQueue<number>()
    numPQ.enqueue(5)
    numPQ.enqueue(1)
    numPQ.enqueue(3)
    expect(numPQ.dequeue()).toBe(1)
    expect(numPQ.dequeue()).toBe(3)
    expect(numPQ.dequeue()).toBe(5)
  })
})

/* ─────────────────────────────── LinkedList ─────────────────────────── */

describe('LinkedList', () => {
  let ll: LinkedList<number>

  beforeEach(() => {
    ll = new LinkedList<number>()
  })

  it('append adds to end', () => {
    ll.append(1)
    ll.append(2)
    expect(ll.toArray()).toEqual([1, 2])
  })

  it('prepend adds to front', () => {
    ll.prepend(1)
    ll.prepend(2)
    expect(ll.toArray()).toEqual([2, 1])
  })

  it('append/prepend chain', () => {
    ll.append(2)
    ll.prepend(1)
    ll.append(3)
    expect(ll.toArray()).toEqual([1, 2, 3])
  })

  it('delete removes first occurrence', () => {
    ll.append(1)
    ll.append(2)
    ll.append(1)
    expect(ll.delete(1)).toBe(true)
    expect(ll.toArray()).toEqual([2, 1])
  })

  it('delete nonexistent returns false', () => {
    ll.append(1)
    expect(ll.delete(99)).toBe(false)
  })

  it('find returns value or undefined', () => {
    ll.append(42)
    expect(ll.find(42)).toBe(42)
    expect(ll.find(99)).toBeUndefined()
  })

  it('size returns correct count', () => {
    expect(ll.size).toBe(0)
    ll.append(1)
    expect(ll.size).toBe(1)
    ll.append(2)
    expect(ll.size).toBe(2)
    ll.delete(1)
    expect(ll.size).toBe(1)
  })

  it('isEmpty returns true when empty', () => {
    expect(ll.isEmpty()).toBe(true)
    ll.append(1)
    expect(ll.isEmpty()).toBe(false)
  })

  it('clear removes all nodes', () => {
    ll.append(1)
    ll.append(2)
    ll.clear()
    expect(ll.isEmpty()).toBe(true)
    expect(ll.toArray()).toEqual([])
  })

  it('toArray on empty list returns empty array', () => {
    expect(ll.toArray()).toEqual([])
  })

  it('handles single element append then delete', () => {
    ll.append(1)
    ll.delete(1)
    expect(ll.isEmpty()).toBe(true)
    expect(ll.size).toBe(0)
  })
})

/* ─────────────────────────────── Deque ─────────────────────────────── */

describe('Deque', () => {
  let d: Deque<number>

  beforeEach(() => {
    d = new Deque<number>()
  })

  it('pushBack / popFront', () => {
    d.pushBack(1)
    d.pushBack(2)
    expect(d.popFront()).toBe(1)
    expect(d.popFront()).toBe(2)
  })

  it('pushFront / popBack', () => {
    d.pushFront(1)
    d.pushFront(2)
    expect(d.popBack()).toBe(1)
    expect(d.popBack()).toBe(2)
  })

  it('pushFront / popFront', () => {
    d.pushFront(1)
    d.pushFront(2)
    expect(d.popFront()).toBe(2)
    expect(d.popFront()).toBe(1)
  })

  it('pushBack / popBack', () => {
    d.pushBack(1)
    d.pushBack(2)
    expect(d.popBack()).toBe(2)
    expect(d.popBack()).toBe(1)
  })

  it('popFront on empty returns undefined', () => {
    expect(d.popFront()).toBeUndefined()
  })

  it('popBack on empty returns undefined', () => {
    expect(d.popBack()).toBeUndefined()
  })

  it('peekFront returns front without removing', () => {
    d.pushBack(1)
    d.pushBack(2)
    expect(d.peekFront()).toBe(1)
    expect(d.size).toBe(2)
  })

  it('peekBack returns back without removing', () => {
    d.pushBack(1)
    d.pushBack(2)
    expect(d.peekBack()).toBe(2)
    expect(d.size).toBe(2)
  })

  it('peekFront on empty returns undefined', () => {
    expect(d.peekFront()).toBeUndefined()
  })

  it('peekBack on empty returns undefined', () => {
    expect(d.peekBack()).toBeUndefined()
  })

  it('size returns correct count', () => {
    expect(d.size).toBe(0)
    d.pushBack(1)
    expect(d.size).toBe(1)
    d.pushFront(2)
    expect(d.size).toBe(2)
    d.popBack()
    expect(d.size).toBe(1)
  })

  it('isEmpty returns true when empty', () => {
    expect(d.isEmpty()).toBe(true)
    d.pushBack(1)
    expect(d.isEmpty()).toBe(false)
  })

  it('clear resets deque', () => {
    d.pushBack(1)
    d.pushBack(2)
    d.clear()
    expect(d.isEmpty()).toBe(true)
    expect(d.size).toBe(0)
    expect(d.popFront()).toBeUndefined()
    expect(d.popBack()).toBeUndefined()
  })
})

/* ─────────────────────────────── DisjointSet ─────────────────────────── */

describe('DisjointSet', () => {
  let ds: DisjointSet

  beforeEach(() => {
    ds = new DisjointSet()
  })

  it('find returns the element itself initially', () => {
    expect(ds.find(1)).toBe(1)
  })

  it('find("") does not crash', () => {
    expect(ds.find(0)).toBe(0)
  })

  it('union connects two elements', () => {
    ds.union(1, 2)
    expect(ds.connected(1, 2)).toBe(true)
  })

  it('connected returns false for independent sets', () => {
    ds.union(1, 2)
    expect(ds.connected(1, 3)).toBe(false)
  })

  it('chained union works', () => {
    ds.union(1, 2)
    ds.union(2, 3)
    expect(ds.connected(1, 3)).toBe(true)
  })

  it('setCount decreases on union', () => {
    ds.find(10)
    ds.find(20)
    const before = ds.setCount()
    ds.union(10, 20)
    expect(ds.setCount()).toBe(before - 1)
  })

  it('union same set is no-op', () => {
    ds.union(1, 2)
    const count = ds.setCount()
    ds.union(1, 2)
    expect(ds.setCount()).toBe(count)
  })

  it('handles large numbers', () => {
    ds.union(99999, 88888)
    expect(ds.connected(99999, 88888)).toBe(true)
  })

  it('constructor with initial size', () => {
    const pre = new DisjointSet({ size: 10 })
    expect(pre.setCount()).toBe(10)
    pre.union(0, 1)
    expect(pre.setCount()).toBe(9)
  })
})

/* ─────────────────────────────── BloomFilter ─────────────────────────── */

describe('BloomFilter', () => {
  let bf: BloomFilter

  beforeEach(() => {
    bf = new BloomFilter({ size: 256, hashCount: 3 })
  })

  it('has returns true for added item', () => {
    bf.add('hello')
    expect(bf.has('hello')).toBe(true)
  })

  it('has returns false for non-added item (likely)', () => {
    bf.add('hello')
    expect(bf.has('world')).toBe(false)
  })

  it('no false negatives for multiple items', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    for (const item of items) bf.add(item)
    for (const item of items) expect(bf.has(item)).toBe(true)
  })

  it('false positive rate < 5% with reasonable capacity', () => {
    const bf2 = new BloomFilter({ size: 1000, hashCount: 7 })
    const added = 50
    const trials = 1000
    const items: string[] = []
    for (let i = 0; i < added; i++) {
      const s = `item-${i}`
      bf2.add(s)
      items.push(s)
    }
    let falsePositives = 0
    for (let i = 0; i < trials; i++) {
      const test = `trial-${i}`
      if (!items.includes(test) && bf2.has(test)) falsePositives++
    }
    expect(falsePositives / trials).toBeLessThan(0.05)
  })

  it('clear resets all bits', () => {
    bf.add('test')
    bf.clear()
    // After clear, we can't guarantee a specific item returns false
    // but the bit array is zeroed
    expect(bf.has('test')).toBe(false)
  })

  it('handles empty add', () => {
    expect(() => bf.add('')).not.toThrow()
  })

  it('handles long strings', () => {
    const long = 'x'.repeat(1000)
    bf.add(long)
    expect(bf.has(long)).toBe(true)
  })
})
