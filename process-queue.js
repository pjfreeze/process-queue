/* ProcessQueue
 * https://github.com/pjfreeze/process-queue
 *
 * This is free and unencumbered software released into the public domain.
 */
(function (global) {
  'use strict';

  const noop = function () {};
  const defaults = {
    concurrent: 5,
    delay: 0, // Using 0 to prevent locking up the browser thread
    onEmpty: noop,
    onError: noop,
    Promise: Promise, // "Native" promises
  };

  const setProperty = (obj, property, getter) => {
    Object.defineProperty(obj, property, { get: getter });
  };

  /**
   * @classdesc
   * Iterate through provided items. Make it asynchronous by returning a promise.
   * Make it synchronous by limiting concurrency.
   *
   * Optionally: customize delay, change limit of concurrent consumers,
   * or listen for an empty queue.
   */
  class ProcessQueue {
    /**
     * @param {function} processFn - The function that will process each item
     * @param {array<*>} [queue=[]] - The queue may contain any type, items processed with processFn
     * @param {object} [options={}]
     * @param {boolean} [options.autostart=false] - Autostart on construction, or wait for "start"
     * @param {number} [options.concurrent=5] - The maximum number of active/concurrent consumers
     * @param {number} [options.delay=0] - Milliseconds to wait before each "tick"
     * @param {function} [options.onEmpty=noop] - Called each time the queue becomes empty
     * @param {function} [options.onError=noop] - Called for each error encountered while processing
     * @param {function} [options.Promise=Promise] - The Promise to test processFn return values for
     */
    constructor(processFn, queue = [], options = {}) {
      this.processFn = processFn;
      this._unprocessed = Array.from(queue);

      this.activeConsumerCount = 0;
      this.isRunning = false;

      this.options = {};
      this.options.concurrent = options.concurrent || defaults.concurrent;
      this.options.delay = options.delay || defaults.delay;
      this.options.onEmpty = options.onEmpty || defaults.onEmpty;
      this.options.onError = options.onError || defaults.onError;
      this.options.Promise = options.Promise || defaults.Promise;

      this.stats = {};
      this.stats.processed = 0;
      this.stats.errored = 0;
      setProperty(this.stats, 'completed', () => this.stats.processed + this.stats.errored);
      setProperty(this.stats, 'remaining', () => this._unprocessed.length + this.activeConsumerCount);
      setProperty(this.stats, 'total', () => this.stats.remaining + this.stats.completed);

      if (options.autostart) {
        this.start();
      }
    }

    get isEmpty() {
      return this._unprocessed.length == 0;
    }

    get hasActiveConsumer() {
      return this.activeConsumerCount > 0;
    }

    /**
     * Add one or more items to the end of the queue. If the queue has been
     * started and is empty, restart the queue.
     */
    append(...args) {
      this._unprocessed.push(...args);

      // If there are items to process and the queue has been started, continue
      if (!this.isEmpty && this.isRunning) {
        this.start();
      }
    }

    /**
     * Add one or more items to the beginning of the queue. If the queue has been
     * started and is empty, restart the queue.
     */
    prepend(...args) {
      this._unprocessed.unshift(...args);

      // If there are items to process and the queue has been started, continue
      if (!this.isEmpty && this.isRunning) {
        this.start();
      }
    }

    /**
     * Start the maximum number of consumers based on the number of
     * items in the queue and max number of concurrent consumers.
     */
    start() {
      this.isRunning = true;

      // Don't bother evaluating the loop if there are no items that can start
      if (this.isEmpty) { return; }

      // The maximum number of consumers is either the maximum concurrent
      // consumers option, or if smaller, the number of items
      const numberOfItems = this._unprocessed.length;
      const concurrent = this.options.concurrent - this.activeConsumerCount;
      for (let toStart = Math.min(concurrent, numberOfItems); toStart > 0; toStart -= 1) {
        this._consume();
      }
    }

    /**
     * Stop processing items from the queue. Does not stop in-progress items
     * from being processed.
     */
    stop() {
      this.isRunning = false;
    }

    /**
     * Should only be called by ProcessQueue. Consumes a single item from the queue
     * and then returns control to "tick"
     */
    _consume() {
      if (this.isRunning && !this.isEmpty) {
        // Add this consumer to the total known
        this.activeConsumerCount += 1;

        const item = this._unprocessed.shift();

        // Ensure that "tick" is only called once by wrapping it in a conditional
        const proceed = (wasError) => {
          if (!proceed.called) {
            proceed.called = true;
            this._tick(wasError);
          }
        };
        proceed.called = false;

        // Call the provided "processFn" function, determine if it should be
        // handled asynchronously or synchronously by checking for a Promise
        const handle = () => {
          let returned;

          try {
            returned = this.processFn(item);
          } catch (error) {
            this.options.onError(error, item);
            return proceed(true);
          }

          if (returned instanceof this.options.Promise) {
            returned
              .then(proceed.bind(null, false))
              .catch((error) => {
                this.options.onError(error, item);
                proceed(true);
              });
          } else {
            proceed(false);
          }
        };

        setTimeout(handle, this.options.delay);
      }
    }

    /**
     * Handles determination of when to call "onEmpty" handler as well as when
     * to continue consuming the queue.
     */
    _tick(wasError) {
      if (wasError) {
        this.stats.errored += 1;
      } else {
        this.stats.processed += 1;
      }
      this.activeConsumerCount -= 1;

      // If there are no consumers and nothing in the queue, call "onEmpty"
      if (this.isEmpty && !this.hasActiveConsumer) {
        this.options.onEmpty();
        return;
      }

      this._consume();
    }
  }

  // Export logic based on Scott Hamper's Cookies.js project
  // https://github.com/ScottHamper/Cookies/blob/1.2.3/src/cookies.js
  if (typeof define == 'function' && define.amd) {
    // AMD support
    define(function () { return ProcessQueue; });
  } else if (typeof exports == 'object') {
    // CommonJS/Node.js support
    // Support Node.js specific `module.exports` (which can be a function)
    if (typeof module == 'object' && typeof module.exports == 'object') {
      exports = module.exports = ProcessQueue;
    }
    // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
    exports.ProcessQueue = ProcessQueue;
  } else {
    global.ProcessQueue = ProcessQueue;
  }
}(typeof window == 'undefined' ? this : window));
