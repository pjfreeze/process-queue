/* PriorityQueue
 * https://github.com/pjfreeze/queues/priority-queue.js
 *
 * This is free and unencumbered software released into the public domain.
 */
(function (global) {
  'use strict';

  /**
   * Lazily sorted queue, ordered based on priority score & time enqueued.
   */
  class PriorityQueue {
    constructor () {
      this._queue = [];
      this._isSortOutOfDate = false;
    }

    /**
     * @private
     * Sort the queue based on priority and enqueue time. Mark itself as up-to-date
     * to prevent additional sort iterations.
     */
    _sort () {
      this._queue.sort(priorityAndEnqueuedTime);
      this._isSortOutOfDate = false;
    }

    /**
     * @param {*} item - The item to add to the queue
     * @param {number} [priority] - Larger number == higher priority
     */
    enqueue (item, opts = {}) {
      const defaultOptions = { enqueuedTime: Date.now(), priority: 0  };
      const options = Object.assign(defaultOptions, opts);
      this._queue.push({ item, options });
      this._isSortOutOfDate = true;
    }

    /**
     * Sort queue if out-of-date, then release the first item in the queue.
     * @returns {*} Whatever the first parameter of the enqueue call was.
     */
    dequeue () {
      this._isSortOutOfDate && this._sort();
      const hasAtLeastOneItem = this.size > 0;
      return hasAtLeastOneItem ? this._queue.shift().item : undefined;
    }

    get size () {
      return this._queue.length;
    }
  }

  const sort = {
    doNotMove: 0,
    moveCloserToStart: -1,
    moveCloserToEnd: 1,
  };

  const higherMovesTowardsFront = (a, b) => {
    if (a == b) { return sort.doNotMove; }
    return a > b ? sort.moveCloserToFront : sort.moveCloserToEnd;
  };

  const lowerMovesTowardsFront = (a, b) => {
    if (a == b) { return sort.doNotMove; }
    return a < b ? sort.moveCloserToFront : sort.moveCloserToEnd;
  };

  const priorityAndEnqueuedTime = ({ options: itemA }, { options: itemB }) => {
    if (itemA.priority != itemB.priority) {
      // Higher priorities ahead of lower priorities
      return higherMovesTowardsFront(itemA.priority, itemB.priority);
    } else {
      // Earlier times ahead of later times
      return lowerMovesTowardsFront(itemA.enqueuedTime, itemB.enqueuedTime);
    }
  };

  if (typeof define == 'function' && define.amd) {
    define(function () { return PriorityQueue; });
  } else if (typeof exports == 'object') {
    if (typeof module == 'object' && typeof module.exports == 'object') {
      exports = module.exports = PriorityQueue;
    }
    exports.PriorityQueue = PriorityQueue;
  } else {
    global.PriorityQueue = PriorityQueue;
  }
}(typeof window == 'undefined' ? this : window));
