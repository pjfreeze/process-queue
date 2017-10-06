const assert = require('assert');
const sinon = require('sinon');

const ProcessQueue = require('./../process-queue.js');

const noop = function () {};

describe('ProcessQueue', () => {
  describe('new ProcessQueue()', () => {
    it('should start if the "autostart" option is truthy', () => {
      const processFn = noop;
      const processQueue = new ProcessQueue(processFn, [1, 2, 3], { autostart: true });
      assert(processQueue.running);
    });

    it('should process all items in the queue', (done) => {
      const processFn = sinon.spy();
      const items = [1, 2, 3];
      const onEmpty = function () {
        assert(processFn.callCount === items.length);
        done();
      };

      const processQueue = new ProcessQueue(processFn, items, { onEmpty, autostart: true });
    });

    it('should call the "onEmpty" handler when the queue has no more items in it', (done) => {
      const processFn = noop;
      const items = [1, 2, 3];
      const onEmpty = function () {
        assert(processQueue.stats.processed === items.length);
        assert(processQueue.stats.remaining === 0);
        done();
      };

      const processQueue = new ProcessQueue(processFn, items, { onEmpty, autostart: true });
    });

    it('should call the "onError" handler if processing an items throws an error or rejects a promise', (done) => {
      const processFn = function (item) {
        throw new Error();
      };
      const items = [1, 2, 3];
      const onError = sinon.spy();
      const onEmpty = function () {
        assert(onError.callCount === items.length);
        done();
      };

      const processQueue = new ProcessQueue(processFn, items, { onEmpty, onError, autostart: true });
    });

    it('should continue processing items after encountering an error', (done) => {
      const items = [1, 2, 3];
      const processFn = function (item) {
        if (item == items[0]) throw new Error();
      };
      const onError = sinon.spy();
      const onEmpty = function () {
        assert(onError.callCount === 1);
        assert(processQueue.stats.processed === items.length - 1);
        done();
      };

      const processQueue = new ProcessQueue(processFn, items, { onEmpty, onError, autostart: true });
    });
  });

  describe('ProcessQueue#append', () => {
    it('should add the items to the end', () => {
      const items = [3, 4, 5];
      const toAppend = [6, 7];
      const processFn = noop;
      const processQueue = new ProcessQueue(processFn, items);

      processQueue.append.apply(processQueue, toAppend);

      assert(processQueue.queue.length === (items.length + toAppend.length));
      const lastInQueue = processQueue.queue[processQueue.queue.length - 1];
      const lastFromAppend = toAppend[toAppend.length - 1];
      assert(lastInQueue === lastFromAppend);
    });
  });

  describe('ProcessQueue#prepend', () => {
    it('should add the items to the beginning', () => {
      const items = [3, 4, 5];
      const toPrepend = [1, 2];
      const processFn = noop;
      const processQueue = new ProcessQueue(processFn, items);

      processQueue.prepend.apply(processQueue, toPrepend);

      assert(processQueue.queue.length === (items.length + toPrepend.length));
      const firstInQueue = processQueue.queue[0];
      const firstFromPrepend = toPrepend[0];
      assert(firstInQueue === firstFromPrepend);
    });
  });
});
