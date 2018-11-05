'use strict';

const assert = require('assert');

const PriorityQueue = require('./../priority-queue.js');


describe('PriorityQueue#constructor', () => {
  it('should create an empty queue', () => {
    const queue = new PriorityQueue();
    assert(queue.size == 0);
  });
});

describe('PriorityQueue#enqueue', () => {
  it('should add a new item to the queue', () => {
    const queue = new PriorityQueue();
    queue.enqueue('Hello');
    assert(queue.size == 1);
  });

  it('should accept an options parameter that supports a "priority" property', () => {
    const queue = new PriorityQueue();
    queue.enqueue('Hello', { priority: 1 });
    queue.enqueue('World', { priority: 2 });
    queue.enqueue('!', { priority: 3 });

    const item = queue.dequeue();
    assert(item == '!');
  });
});

describe('PriorityQueue#dequeue', () => {
  it('should dequeue items based on order if no priority was provided', () => {
    const queue = new PriorityQueue();
    queue.enqueue('Hello');
    queue.enqueue('World');
    queue.enqueue('!');

    const item = queue.dequeue();
    assert(item == 'Hello');
  });

  it('should dequeue items based on priority', () => {
    const queue = new PriorityQueue();
    queue.enqueue('Hello', { priority: 1 });
    queue.enqueue('World', { priority: 2 });
    queue.enqueue('!', { priority: 3 });

    const item = queue.dequeue();
    assert(item == '!');
  });

  it('should dequeue items based on order if they have the same priority', () => {
    const queue = new PriorityQueue();
    queue.enqueue('Hello', { priority: 1 });
    queue.enqueue('World', { priority: 1 });
    queue.enqueue('!', { priority: 0 });

    const item = queue.dequeue();
    assert(item == 'Hello');
  });
});
