# Queues

* Great for throttling requests (e.g. a web scraper, API requests, etc.)
* Processing a list asynchronously or synchronously

``` javascript
// Node
const HTTP = require('http');
const ProcessQueue = require('process-queue');

const items = [1, 2, 3, 4, 5];
const handle = function (item, done) {
    const request = HTTP.get(`http://www.example.com/api/${item}`, (response) => {
        return Promise.resolve(response.thing);
    });
};

const queue = new ProcessQueue(handle, items, { concurrent: 2, delay: 150 });
queue.start();

// Browser
const ProcessQueue = window.ProcessQueue;

const items = [1, 2, 3, 4, 5];
const handle = function (item, done) {
    return fetch(`http://www.example.com/api/${item}`)
        .then((response) => response.json());
};

const queue = new ProcessQueue(handle, items, { concurrent: 2, delay: 150 });
queue.start();
```

## TODO

- Optimize recursion of "next" calls
- Add debug mode with logging
