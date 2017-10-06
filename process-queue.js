/**
 * ProcessQueue
 * https://github.com/pjfreeze/process-queue
 *
 * This is free and unencumbered software released into the public domain.
 */
(function(global) {
  'use strict';

  const noop = function () {};
  const DEFAULT_CONCURRENT = 5;
  const DEFAULT_DELAY = 0; // Using 0 to prevent locking up a/the thread
  const DEFAULT_PROMISE = Promise; // Using 0 to prevent locking up a/the thread

  /**
   * @class ProcessQueue
   * @classdesc
   * Iterate through provided items. Make it asynchronous by returning a promise.
   * Make it synchronous by limiting concurrency.
   *
   * Optionally: customize delay, change limit of concurrent consumers,
   * or listen for an empty queue.
   */
  class ProcessQueue {
    /**
     * @param {Function} processFn - function that will process each item
     * @param {Array} [queue=[]] - may contain any type, items processed with processFn
     * @param {Object} [options={}]
     * @param {Boolean} [options.autostart] - autostart on construction
     * @param {Number} [options.concurrent=5] - maximum number of concurrent consumers
     * @param {Number} [options.delay=0] - delay in milliseconds before each tick
     * @param {Function} [options.onEmpty=noop] - callback for the queue being empty
     * @param {Function} [options.onError=noop] - callback for an error encountered during processing
     * @param {Function} [options.Promise=Promise] - optionally specify the promise constructor used
     *
     * @return {ProcessQueue}
     */
    constructor(processFn, queue=[], options={}) {
      this.queue = Array.from(queue);

      this.processFn = processFn;

      // Number of active consumers
      this.consumers = 0;
      this.running = false;

      this.stats = {
        processed: 0,
        remaining: 0,
        errors: 0,
      };

      Object.defineProperty(this.stats, 'remaining', {
        get: () => this.queue.length,
      });

      this.options = {};
      this.options.concurrent = options.concurrent || DEFAULT_CONCURRENT;
      this.options.delay = options.delay || DEFAULT_DELAY;
      this.options.onEmpty = options.onEmpty || noop;
      this.options.onError = options.onError || noop;
      this.options.Promise = options.Promise || DEFAULT_PROMISE;

      if (options.autostart) {
        this.start();
      }
    }

    /**
     * Add one or more items to the end of the queue. If the queue has been
     * started and is empty, restart the queue.
     */
    append() {
      Array.prototype.push.apply(this.queue, Array.from(arguments));

      // If there are items to process and the queue has been started, continue
      if (this.queue.length > 0 && this.running) {
        this.start();
      }
    }

    /**
     * Add one or more items to the beginning of the queue. If the queue has been
     * started and is empty, restart the queue.
     */
    prepend() {
      Array.prototype.unshift.apply(this.queue, Array.from(arguments));

      // If there are items to process and the queue has been started, continue
      if (this.queue.length > 0 && this.running) {
        this.start();
      }
    }

    /**
     * Start the maximum number of consumers based on the number of
     * items in the queue and max number of concurrent consumers.
     */
    start() {
      this.running = true;

      // Don't bother evaluating the loop if there are no items that can start
      if (this.queue.length === 0) { return; }

      // The maximum number of consumers is either the maximum concurrent
      // consumers option, or if smaller, the number of items
      const numberOfItems = this.queue.length;
      const concurrent = this.options.concurrent - this.consumers;
      for (let toStart = Math.min(concurrent, numberOfItems); toStart > 0; toStart -= 1) {
        this.consume();
      }
    }

    /**
     * Stop processing items from the queue. Does not stop in-progress items
     * from being processed.
     */
    stop() {
      this.running = false;
    }

    /**
     * @private
     * Should only be called by ProcessQueue. Consumes a single item from the queue
     * and then returns control to "tick"
     */
    consume() {
      if (this.running && this.queue.length > 0) {
        // Add this consumer to the total known
        this.consumers += 1;

        const item = this.queue.shift();

        // Ensure that "tick" is only called once by wrapping it in a conditional
        const proceed = () => {
          if (!proceed.called) {
            proceed.called = true;
            // Remove this consumer now that it has completed
            this.consumers -= 1;
            this.tick();
          }
        };
        proceed.called = false;

        // Call the provided "processFn" function, determine if it should be
        // handled asynchronously or synchronously by checking for a Promise
        const handle = () => {
          let returned = null;

          try {
            returned = this.processFn(item);
            this.stats.processed += 1;
          } catch (error) {
            this.options.onError(error, item);
            this.stats.errors += 1;
            return proceed();
          }

          if (returned instanceof this.options.Promise) {
            returned
              .then(proceed)
              .catch((error) => {
                this.options.onError(error, item);
                this.stats.errors += 1;
                proceed();
              });
          } else {
            proceed();
          }
        };

        setTimeout(handle, this.options.delay);
      }
    }

    /**
     * @private
     * Handles determination of when to call "onEmpty" handler as well as when
     * to continue consuming the queue.
     */
    tick() {
      // If there are no consumers and nothing in the queue, call "onEmpty"
      if (this.queue.length === 0 && this.consumers === 0) {
        this.options.onEmpty();
        return;
      }

      // If the queue is currently processing, continue with the next item
      if (this.running && this.queue.length > 0) {
        this.consume();
      }
    }
  }

  // Export logic based on Scott Hamper's Cookies.js project
  // https://github.com/ScottHamper/Cookies/blob/1.2.3/src/cookies.js
  global.ProcessQueue = global.ProcessQueue || ProcessQueue;

  if (typeof define === 'function' && define.amd) {
    // AMD support
    define(function () { return ProcessQueue; });
  } else if (typeof exports === 'object') {
    // CommonJS/Node.js support
    // Support Node.js specific `module.exports` (which can be a function)
    if (typeof module === 'object' && typeof module.exports === 'object') {
      exports = module.exports = ProcessQueue;
    }
    // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
    exports.ProcessQueue = ProcessQueue;
  } else {
    global.ProcessQueue = ProcessQueue;
  }
}(typeof window === 'undefined' ? this : window));
