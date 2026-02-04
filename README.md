# timelog-console

Prepends human-readable timestamps to Node.js console methods.

Designed for production use in PM2, Docker, and Kubernetes environments.

## Installation

```bash
npm install timelog-console
```

## Usage

### CommonJS

```javascript
require('timelog-console');

console.log('Server started');
// Output: [04-Feb-2026 15:42:31] Server started
``` 

The package auto-initializes on require. No additional setup needed.

### ES Modules (ESM)

The package is implemented in CommonJS but works seamlessly in ESM projects via Node.js interop.

```javascript
import 'timelog-console';

console.log('Server started');
// Output: [04-Feb-2026 15:42:31] Server started
```

### Explicit Initialization (Optional)

For advanced use cases, the package exports an init function. Calling it multiple times is safe (idempotent).

**CommonJS:**

```javascript
const init = require('timelog-console');
init();
```

**ESM:**

```javascript
import init from 'timelog-console';
init();
```

## PM2 Usage

Preload the module using `--node-args` to add timestamps without modifying application code:

```bash
pm2 start app.js --node-args="-r timelog-console"
```

In `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'my-app',
    script: 'app.js',
    node_args: '-r timelog-console'
  }]
};
```

## Docker Usage

```dockerfile
CMD ["node", "-r", "timelog-console", "app.js"]
```

## Patched Methods

The following console methods are patched to prepend timestamps:

**Inline timestamp:**
- `console.log`
- `console.info`
- `console.warn`
- `console.error`
- `console.debug`

**Timestamp on separate line** (preserves formatting):
- `console.table`
- `console.time` (no output, just starts timer)
- `console.timeEnd`
- `console.timeLog`

## Unmodified Methods

These methods remain unchanged and behave exactly like native Node.js:

- `console.dir`
- `console.trace`
- `console.count`
- `console.assert`
- `console.clear`

These methods have specialized output formats where prepending a timestamp would break functionality or produce confusing output.

## Timestamp Format

```
[DD-MMM-YYYY HH:mm:ss]
```

| Component | Description |
|-----------|-------------|
| DD | Zero-padded day (01–31) |
| MMM | Short month name (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec) |
| YYYY | Full year |
| HH:mm:ss | 24-hour time, zero-padded |

Uses local system time.

## Example Output

```
[04-Feb-2026 15:42:31] Application starting
[04-Feb-2026 15:42:31] Config loaded { port: 3000, env: 'production' }
[04-Feb-2026 15:42:32] Database connected
[04-Feb-2026 15:42:32] Server listening on port 3000
[04-Feb-2026 15:43:15] Error: Connection timeout
    at Socket.emit (events.js:315:20)
    at TCP.done (net.js:123:12)
```

## Compatibility

- Node.js 16+
- CommonJS and ES Modules (ESM)
- PM2, Docker, Kubernetes
- No dependencies

## What This Package Does NOT Do

- Does not replace logging libraries
- Does not add log levels (info, warn, error, debug are console method names, not levels)
- Does not modify `console.table` or `console.dir`
- Does not output JSON
- Does not add colors
- Does not provide configuration options

This package exists only to prepend timestamps to console output.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on bug reports, feature requests, and pull requests.

## License

MIT
