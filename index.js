'use strict';

/**
 * timelog-console
 * 
 * Safely prepends human-readable timestamps to selected console methods.
 * Designed for production use in PM2, Docker, and Kubernetes environments.
 * 
 * Auto-initializes on require. Idempotent.
 */

// Month names for timestamp formatting (avoids repeated array creation)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Methods to patch - standard inline timestamp
const METHODS_TO_PATCH = ['log', 'info', 'warn', 'error', 'debug'];

// Methods that need timestamp on separate line AND must temporarily
// restore original methods (because they internally use console.log)
const METHODS_ISOLATED = ['table', 'time', 'timeEnd', 'timeLog'];

// Store original methods to prevent double-wrapping and allow safe patching
// Using a WeakMap would be cleaner but console is a global singleton,
// so a simple object suffices and avoids overhead
const originalMethods = {};

// Flag to track initialization state - prevents double-patching
let initialized = false;

/**
 * Formats the current date/time as [DD-MMM-YYYY HH:mm:ss]
 * 
 * Uses local time. No external dependencies.
 * Minimal allocations: one Date object, one string concatenation.
 * 
 * @returns {string} Formatted timestamp string
 */
function formatTimestamp() {
  const now = new Date();
  
  const day = now.getDate();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // Zero-pad day, hours, minutes, seconds
  // Using string concatenation with ternary is faster than padStart for this case
  return '[' +
    (day < 10 ? '0' : '') + day + '-' +
    month + '-' +
    year + ' ' +
    (hours < 10 ? '0' : '') + hours + ':' +
    (minutes < 10 ? '0' : '') + minutes + ':' +
    (seconds < 10 ? '0' : '') + seconds +
    ']';
}

/**
 * Creates a wrapped console method that prepends a timestamp.
 * 
 * Preserves:
 * - All arguments (multiple args, objects, Errors)
 * - Argument order (timestamp is prepended)
 * - Stack traces (no manual stringification)
 * - Multi-line output (native console handles formatting)
 * 
 * @param {Function} originalMethod - The original console method
 * @returns {Function} Wrapped method with timestamp prepending
 */
function createTimestampedMethod(originalMethod) {
  // Return a function that prepends timestamp and calls original
  // Using function() instead of arrow to preserve any potential 'this' binding
  return function timestampedConsoleMethod() {
    // Prepend timestamp to arguments
    // Using Array.prototype methods on arguments for compatibility
    const args = [formatTimestamp()];
    
    // Push all original arguments - preserves objects, Errors, etc.
    for (let i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    
    // Call original method with console context
    // Using apply ensures proper 'this' binding and argument spreading
    return originalMethod.apply(console, args);
  };
}

/**
 * Creates a wrapped console method that prints timestamp on its own line
 * and temporarily restores original console methods during execution.
 * 
 * Used for methods like console.table and console.timeEnd that internally
 * use console.log - we must unpatch during their execution to prevent
 * double timestamps or format string issues.
 * 
 * @param {Function} originalMethod - The original console method
 * @param {string} methodName - Name of the method (for time methods that have no output)
 * @returns {Function} Wrapped method with isolated execution
 */
function createIsolatedTimestampedMethod(originalMethod, methodName) {
  return function isolatedTimestampedConsoleMethod() {
    // console.time() just starts a timer - no output, no timestamp needed
    if (methodName === 'time') {
      return originalMethod.apply(console, arguments);
    }
    
    // Print timestamp on its own line first
    process.stdout.write(formatTimestamp() + '\n');
    
    // Temporarily restore original methods to prevent double-timestamping
    const patchedMethods = {};
    for (let i = 0; i < METHODS_TO_PATCH.length; i++) {
      const name = METHODS_TO_PATCH[i];
      if (originalMethods[name]) {
        patchedMethods[name] = console[name];
        console[name] = originalMethods[name];
      }
    }
    
    let result;
    try {
      // Call original method with all arguments unchanged
      result = originalMethod.apply(console, arguments);
    } finally {
      // Restore patched methods
      for (let i = 0; i < METHODS_TO_PATCH.length; i++) {
        const name = METHODS_TO_PATCH[i];
        if (patchedMethods[name]) {
          console[name] = patchedMethods[name];
        }
      }
    }
    
    return result;
  };
}

/**
 * Initializes console timestamp patching.
 * 
 * IDEMPOTENT: Safe to call multiple times.
 * DEFENSIVE: Fails silently if console or methods are unavailable.
 * TARGETED: Patches log, info, warn, error, debug, table.
 * 
 * @returns {void}
 */
function init() {
  // Idempotent check - prevent double-patching
  if (initialized) {
    return;
  }
  
  // Defensive check - ensure console exists
  // This should always be true in Node.js, but defensive coding for edge cases
  if (typeof console === 'undefined' || console === null) {
    return;
  }
  
  // Patch each targeted method with inline timestamp
  for (let i = 0; i < METHODS_TO_PATCH.length; i++) {
    const methodName = METHODS_TO_PATCH[i];
    
    try {
      const originalMethod = console[methodName];
      
      // Skip if method doesn't exist or isn't a function
      // Defensive against unusual console implementations
      if (typeof originalMethod !== 'function') {
        continue;
      }
      
      // Store original method for reference (not currently used for restoration,
      // but useful for debugging and potential future use)
      originalMethods[methodName] = originalMethod;
      
      console[methodName] = createTimestampedMethod(originalMethod);
      
    } catch (e) {
    }
  }
  
  // Patch methods that need isolated execution (they internally use console.log)
  for (let i = 0; i < METHODS_ISOLATED.length; i++) {
    const methodName = METHODS_ISOLATED[i];
    
    try {
      const originalMethod = console[methodName];
      
      if (typeof originalMethod !== 'function') {
        continue;
      }
      
      originalMethods[methodName] = originalMethod;
      console[methodName] = createIsolatedTimestampedMethod(originalMethod, methodName);
      
    } catch (e) {
    }
  }
  
  initialized = true;
}

// AUTO-INIT ON REQUIRE
// This is the primary usage pattern: require('timelog-console');
// The patch is applied immediately when the module is loaded.
init();

// Export init function for explicit usage pattern
// Allows: const init = require('timelog-console'); init();
module.exports = init;
