'use strict';

const assert = require('assert');
const sinon = require('sinon');

const ConcurrencyQueue = require('./../concurrency-queue.js');

const noop = function () {};

describe('ConcurrencyQueue#constructor', () => {
  it('should auto start by default', () => {
    const queue = new ConcurrencyQueue();
    assert(queue.isRunning);
  });

  it('should not start the "autoStart" option was set to false', () => {
    const queue = new ConcurrencyQueue({ autoStart: false });
    assert(queue.isRunning == false);
  });
});

describe('ConcurrencyQueue#enqueue', () => {
  it('should start the items in the order the queue dequeue them in', () => {
    const queue = new ConcurrencyQueue({ autoStart: false });
    queue.enqueue(() => false);
    assert.equal(queue.stats.queued, 1);
  });
});

describe('ConcurrencyQueue#start', () => {
  it('should mark itself as running', () => {
    const queue = new ConcurrencyQueue({ autoStart: false });
    queue.start();
    assert(queue.isRunning);
  });

  it('should call each item only once', (done) => {
    const queue = new ConcurrencyQueue();
    const spy = sinon.spy();
    queue.on('idle', () => {
      assert.equal(spy.callCount, 1);
      done();
    });
    queue.enqueue(spy);
  });
});

describe('ConcurrencyQueue#on("idle")', () => {
  it('should call the event handler when it is done', (done) => {
    const queue = new ConcurrencyQueue();
    queue.on('idle', () => {
      assert.equal(queue.stats.completed, 1);
      assert.equal(queue.stats.total, 1);
      done();
    });
    queue.enqueue(() => true);
  });

  it('should call the event handler when it is done even with errors', (done) => {
    const queue = new ConcurrencyQueue();
    queue.on('idle', () => {
      assert.equal(queue.stats.failed, 1);
      assert.equal(queue.stats.total, 1);
      done();
    });
    queue.enqueue(() => {
      throw new Error('Test Error');
    });
  });
});

describe('ConcurrencyQueue#on("error")', () => {
  it('should call the event handler for each error', (done) => {
    const queue = new ConcurrencyQueue();
    const spy = sinon.spy();
    queue.on('error', spy);
    queue.on('idle', () => {
      assert.equal(spy.callCount, 2);
      done();
    });
    queue.enqueue(() => {
      throw new Error('Test Error');
    }, () => {
      throw new Error('Test Error');
    });
  });

  it('should call the event handler for each error even with non-errors in between', (done) => {
    const queue = new ConcurrencyQueue();
    const spy = sinon.spy();
    queue.on('error', spy);
    queue.on('idle', () => {
      assert.equal(queue.stats.total, 3);
      assert.equal(queue.stats.failed, 2);
      assert.equal(spy.callCount, 2);
      done();
    });
    queue.enqueue(() => {
      throw new Error('Test Error');
    }, () => {
      return true;
    }, () => {
      throw new Error('Test Error');
    });
  });
});
