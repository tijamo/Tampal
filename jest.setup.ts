import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { serialize, deserialize } from 'node:v8';

expect.extend(toHaveNoViolations);

// jest-environment-jsdom's global doesn't include Node's structuredClone,
// which fake-indexeddb needs to clone stored records (used by offline-queue
// tests). v8's own (de)serialize is a close enough structured-clone stand-in
// for plain data objects.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}
