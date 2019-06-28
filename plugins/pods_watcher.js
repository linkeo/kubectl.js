const notifier = require('node-notifier');

module.exports = class PodsWatcher {
  constructor(namespace) {
    this.namespace = namespace;
    this.pods = new Map();
    this.history = new Map();
  }
  update(text) {
    const records = String(text || '')
      .split('\n')
      .map(line => line.split(/\s+/));
    const touched = [];

    // Detect changes
    for (const [name, ready, status] of records) {
      if (name === 'NAME') {
        continue;
      }
      touched.push(name);
      const curr = `${status} ${ready}`;
      if (this.pods.has(name)) {
        const prev = this.pods.get(name);
        if (prev !== curr) {
          const history = this.history.get(curr) || [];
          notifier.notify({
            title: `[${this.namespace}] Pod status: ${curr}`,
            subtitle: name,
            message: history.join('\n'),
          });
          history.unshift(name);
          this.history.set(curr, history.slice(0, 5));
        }
      }
      this.pods.set(name, curr);
    }

    // Clean up removed pods
    const untouched = [];
    for (const name of this.pods.keys()) {
      if (!touched.includes(name)) {
        untouched.push(name);
      }
    }
    for (const name of untouched) {
      this.pods.delete(name);
    }
  }
};
