import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createContainer,
  findCaret,
  flushMicrotasks,
  installFakeDom,
  loadTypeFX,
  serializeContent,
  waitForQueue,
} from './support/fake-dom.mjs';

async function createContext(options = {}) {
  const document = installFakeDom();
  const TypeFX = await loadTypeFX();
  const container = createContainer(document);
  const instance = new TypeFX(container, {
    speed: 0,
    speedRange: 0,
    ...options,
  });

  return {
    document,
    TypeFX,
    container,
    instance,
  };
}

test('types sequential content including new lines', async () => {
  const { container, instance } = await createContext();

  await waitForQueue(
    instance
      .quickType('Line 1')
      .type('\n')
      .quickType('Line 2')
  );

  assert.equal(serializeContent(container), 'Line 1\nLine 2');
});

test('supports move, select, and delete editing flows', async () => {
  const { container, instance } = await createContext();

  await waitForQueue(
    instance
      .quickType('abcdef')
      .quickMove(-3)
      .select(2)
      .delete()
  );

  assert.equal(serializeContent(container), 'abcf');
});

test('quickClear removes only content before the caret', async () => {
  const { container, instance } = await createContext();

  await waitForQueue(
    instance
      .quickType('abc')
      .quickMove(-1)
      .quickClear()
      .quickType('Z')
  );

  assert.equal(serializeContent(container), 'Zc');
});

test('toggles caret visibility classes correctly', async () => {
  const { container, instance } = await createContext();

  await waitForQueue(
    instance
      .quickType('visible')
      .hideCaret()
      .showCaret()
  );

  const caret = findCaret(container);
  assert.ok(caret, 'expected caret node to exist');
  assert.equal(caret.classList.contains('typefx-caret-hidden'), false);
  assert.equal(caret.classList.contains('typefx-caret-blink'), true);
});

test('reuses the same instance for the same element', async () => {
  const document = installFakeDom();
  const TypeFX = await loadTypeFX();
  const container = createContainer(document);

  const first = new TypeFX(container, { speed: 10 });
  const second = new TypeFX(container, { speed: 999 });

  assert.equal(first, second);
  assert.equal(
    container.childNodes.filter((node) => node === findCaret(container)).length,
    1
  );
});

test('keeps the queue alive after a task throws', async () => {
  const { container, instance } = await createContext();
  const loggedErrors = [];
  const originalConsoleError = console.error;

  console.error = (...args) => {
    loggedErrors.push(args);
  };

  try {
    await waitForQueue(
      instance
        .then(() => {
          throw new Error('boom');
        })
        .quickType('ok')
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(serializeContent(container), 'ok');
  assert.equal(loggedErrors.length, 1);
});

test('never schedules negative typing delays', async () => {
  const { instance } = await createContext({
    speed: 0,
    speedRange: 200,
  });

  const delays = [];
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback, ms = 0, ...args) => {
    delays.push(Number(ms));
    return originalSetTimeout(callback, ms, ...args);
  };

  try {
    await waitForQueue(instance.type('abc'));
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.ok(delays.length >= 3, 'expected at least one timer per typed character');
  assert.ok(delays.every((ms) => ms >= 0));
});

test('triggers entry and delete animations when configured', async () => {
  const { document, container, instance } = await createContext({
    entryAnimation: {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { duration: 50 },
    },
    deleteAnimation: {
      keyframes: [{ opacity: 1 }, { opacity: 0 }],
      options: { duration: 50 },
    },
  });

  await waitForQueue(
    instance
      .type('ab')
      .delete(1)
  );
  await flushMicrotasks();

  assert.equal(serializeContent(container), 'a');
  assert.equal(document.animations.length, 3);
});

test('cancel interrupts the current queue and still allows follow-up actions', async () => {
  const { container, instance } = await createContext({
    speed: 10,
    speedRange: 0,
  });

  const longText = '12345678901234567890';
  instance.type(longText);

  await new Promise((resolve) => {
    setTimeout(() => {
      instance
        .cancel()
        .quickType(' done')
        .then(resolve);
    }, 25);
  });

  const result = serializeContent(container);
  assert.ok(result.endsWith(' done'));
  assert.ok(result.length < longText.length + ' done'.length);
});
