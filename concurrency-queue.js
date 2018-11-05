/* ConcurrencyQueue
 * https://github.com/pjfreeze/queues/concurrency-queue.js
 *
 * This is free and unencumbered software released into the public domain.
 */
(function (global) {
  'use strict';

  /**
   * @private
   * Shorthand for defining a getter-only property
   * @param {object} obj
   * @param {string} property
   * @param {function} getter
   */
  const getter = (obj, property, getter) => {
    Object.defineProperty(obj, property, { enumerable: true, get: getter });
  };

  /**
   * A minimally implemented queue that can be used by the concurrency queue by default.
   */
  class GenericQueue {
    constructor () {
      this._queue = [];
    }

    get size () {
      return this._queue.length;
    }

    enqueue (...args) {
      this._queue.push(...args)
    }

    dequeue () {
      return this._queue.shift();
    }
  }

  /**
   * A queue that enables "concurrent" processing of asynchronous tasks. Useful for abiding by
   * rate limiting and preventing accidental DDOS attacks.
   */
  class ConcurrencyQueue {
    /**
     * @param {object} [options={}]
     * @param {boolean} [options.autoStart=true] - Autostart on construction, or wait for "start"
     * @param {number} [options.concurrent=5] - The maximum number of concurrent consumers
     * @param {number} [options.delay=0] - Milliseconds to wait before each "tick"
     * @param {object} [options.Promise=Promise]
     * @param {Queue} [options.Queue=GenericQueue]
     */
    constructor (options = {}) {
      this.options = Object.assign({}, ConcurrencyQueue.defaults, options);

      this._queue = new this.options.Queue();
      this._pending = [];
      this._isRunning = false;
      this._subscriptions = [];

      this.stats = { queued: 0, pending: 0, completed: 0, failed: 0, total: 0 };
      getter(this.stats, 'queued', () => this._queue.size);
      getter(this.stats, 'pending', () => this._pending.length);
      getter(this.stats, 'total', () => this.stats.queued + this.stats.pending + this.stats.completed + this.stats.failed);

      if (this.options.autoStart) {
        this.start();
      }
    }

    get isRunning () {
      return this._isRunning;
    }

    get isEmpty () {
      return this.stats.queued == 0;
    }

    get isIdle () {
      return this.stats.queued == 0 && this.stats.pending == 0;
    }

    /**
     * Register a handler for the provided event.
     * @param {ConcurrencyQueue.EventType} event
     * @param {function} handler
     */
    on (event, handler) {
      this._subscriptions.push({ event, handler });
    }

    /**
     * De-register a handler for the provided event.
     * @param {ConcurrencyQueue.EventType} event
     * @param {function} handler
     */
    off (event, handler) {
      this._subscriptions = this._subscriptions.filter((subscription) => {
        return subscription.event == event && subscription.handler == handler;
      });
    }

    /**
     * Pass arguments onto the shadowed queue method, ensure the queue is running.
     */
    enqueue (...args) {
      this._queue.enqueue(...args);

      if (this.isRunning) {
        this.start();
      }
    }

    /**
     * Start the maximum number of consumers based on the number of
     * items in the queue and max number of concurrent consumers.
     */
    start () {
      this._isRunning = true;

      // Don't bother evaluating the loop if there are no items that can start
      if (this.isEmpty) { return; }

      // The maximum number of consumers is either the maximum concurrent
      // consumers option, or if smaller, the number of items
      const remainingConsumers = this.options.concurrent - this.stats.pending;
      for (let toStart = Math.min(remainingConsumers, this.stats.queued); toStart > 0; toStart -= 1) {
        this._spawnConsumer();
      }
    }

    /**
     * Stop processing items from the queue. Does not stop in-progress items
     * from being processed.
     */
    stop () {
      this._isRunning = false;
    }

    /**
     * @private
     * Call each handler registered for the provided event.
     */
    _emit (event, ...args) {
      const subscriptions = this._subscriptions.filter(subscription => subscription.event == event);
      subscriptions.forEach(subscription => subscription.handler(...args));
    }

    /**
     * @private
     * Consumes a single entry from the queue
     */
    _spawnConsumer () {
      if (!this.isRunning || this.isEmpty) { return; }

      const task = this._queue.dequeue();

      // Ensure that "tick" is only called once by wrapping it in a conditional
      const proceed = (wasError) => {
        if (proceed.hasBeenCalled) { return; }
        proceed.hasBeenCalled = true;
        this._terminateConsumer(wasError, handle);
      };
      proceed.hasBeenCalled = false;

      // Call the task, determine if it should be handled asynchronously or
      // synchronously by checking for a Promise
      const handle = () => {
        let returned;

        try {
          returned = task();
        } catch (error) {
          this._emit(ConcurrencyQueue.EventType.error, error, task);
          return proceed(true);
        }

        if (returned instanceof this.options.Promise) {
          returned
            .then(() => proceed(false))
            .catch((error) => {
              this._emit(ConcurrencyQueue.EventType.error, error, task);
              proceed(true);
            });
        } else {
          proceed(false);
        }
      };

      this._pending.push(handle);
      setTimeout(handle, this.options.delay);
    }

    /**
     * @private
     * Handles determination of when to call "idle" handler as well as when
     * to continue consuming the queue.
     */
    _terminateConsumer (jobDidFail, handler) {
      const index = this._pending.indexOf(handler);
      this._pending.splice(index, 1);

      const statsProperty = jobDidFail ? 'failed' : 'completed';
      this.stats[statsProperty] += 1;

      // If there are no consumers and nothing in the queue, emit "idle" event
      if (this.isIdle) {
        this._emit(ConcurrencyQueue.EventType.idle, this);
        return;
      }

      this._spawnConsumer();
    }
  }

  ConcurrencyQueue.EventType = {
    idle: 'idle',
    error: 'error',
  };

  ConcurrencyQueue.defaults = {
    autoStart: true,
    concurrent: 5,
    delay: 0, // 0 instead of null to prevent locking up browser threads
    Promise: global.Promise || Promise, // "Native" promises
    Queue: GenericQueue,
  };

  if (typeof define == 'function' && define.amd) {
    define(function () { return ConcurrencyQueue; });
  } else if (typeof exports == 'object') {
    if (typeof module == 'object' && typeof module.exports == 'object') {
      exports = module.exports = ConcurrencyQueue;
    }
    exports.ConcurrencyQueue = ConcurrencyQueue;
  } else {
    global.ConcurrencyQueue = ConcurrencyQueue;
  }
}(typeof window == 'undefined' ? this : window));
