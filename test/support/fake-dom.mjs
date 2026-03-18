class FakeClassList {
  constructor() {
    this.tokens = new Set();
  }

  add(...tokens) {
    for (const token of tokens) {
      this.tokens.add(token);
    }
  }

  remove(...tokens) {
    for (const token of tokens) {
      this.tokens.delete(token);
    }
  }

  contains(token) {
    return this.tokens.has(token);
  }
}

class FakeStyle {
  constructor() {
    this.properties = new Map();
  }

  setProperty(name, value) {
    this.properties.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.properties.get(name) ?? '';
  }
}

class FakeNode {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  append(...nodes) {
    for (const node of nodes) {
      this.appendChild(typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node);
    }
  }

  appendChild(node) {
    return this.insertBefore(node, null);
  }

  insertBefore(node, referenceNode) {
    if (node instanceof FakeDocumentFragment) {
      for (const child of [...node.childNodes]) {
        this.insertBefore(child, referenceNode);
      }
      return node;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    const index = referenceNode ? this.childNodes.indexOf(referenceNode) : -1;
    if (referenceNode && index === -1) {
      throw new Error('Reference node was not found.');
    }

    node.parentNode = this;

    if (index === -1) {
      this.childNodes.push(node);
    } else {
      this.childNodes.splice(index, 0, node);
    }

    return node;
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index === -1) {
      throw new Error('Child node was not found.');
    }

    this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }

  replaceChildren(...nodes) {
    for (const child of [...this.childNodes]) {
      this.removeChild(child);
    }

    if (nodes.length > 0) {
      this.append(...nodes);
    }
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  contains(node) {
    if (node === this) {
      return true;
    }

    return this.childNodes.some((child) => child.contains(node));
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    const text = String(value);
    this.replaceChildren();

    if (text) {
      this.appendChild(this.ownerDocument.createTextNode(text));
    }
  }
}

class FakeTextNode extends FakeNode {
  constructor(text, ownerDocument) {
    super(ownerDocument);
    this.value = String(text);
  }

  contains(node) {
    return node === this;
  }

  get textContent() {
    return this.value;
  }

  set textContent(value) {
    this.value = String(value);
  }
}

class FakeElement extends FakeNode {
  constructor(tagName, ownerDocument) {
    super(ownerDocument);
    this.tagName = tagName.toUpperCase();
    this.classList = new FakeClassList();
    this.style = new FakeStyle();
  }

  get previousElementSibling() {
    if (!this.parentNode) {
      return null;
    }

    const siblings = this.parentNode.childNodes.filter((node) => node instanceof FakeElement);
    const index = siblings.indexOf(this);
    return index > 0 ? siblings[index - 1] : null;
  }

  get nextElementSibling() {
    if (!this.parentNode) {
      return null;
    }

    const siblings = this.parentNode.childNodes.filter((node) => node instanceof FakeElement);
    const index = siblings.indexOf(this);
    return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  }

  animate(keyframes, options) {
    const animation = { target: this, keyframes, options };
    this.ownerDocument.animations.push(animation);

    return {
      finished: Promise.resolve(animation),
    };
  }
}

class FakeDocumentFragment extends FakeNode {}

class FakeDocument {
  constructor() {
    this.animations = [];
    this.head = new FakeElement('head', this);
    this.body = new FakeElement('body', this);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text) {
    return new FakeTextNode(text, this);
  }

  createDocumentFragment() {
    return new FakeDocumentFragment(this);
  }

  getElementsByTagName(tagName) {
    const target = tagName.toUpperCase();
    const matches = [];

    const visit = (node) => {
      if (node instanceof FakeElement && node.tagName === target) {
        matches.push(node);
      }

      for (const child of node.childNodes) {
        visit(child);
      }
    };

    visit(this.head);
    visit(this.body);
    return matches;
  }
}

let typefxModulePromise;

export function installFakeDom() {
  const document = new FakeDocument();

  globalThis.document = document;
  globalThis.window = globalThis;
  globalThis.window.document = document;
  globalThis.HTMLElement = FakeElement;
  globalThis.Node = FakeNode;
  globalThis.DocumentFragment = FakeDocumentFragment;

  return document;
}

export async function loadTypeFX() {
  if (!typefxModulePromise) {
    typefxModulePromise = import(new URL('../../dist/typefx.js', import.meta.url));
  }

  return (await typefxModulePromise).default;
}

export function createContainer(document) {
  const container = document.createElement('p');
  document.body.appendChild(container);
  return container;
}

export function waitForQueue(instance) {
  return new Promise((resolve) => {
    instance.then(resolve);
  });
}

export async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

export function findCaret(container) {
  return container.childNodes.find(
    (node) => node instanceof FakeElement && node.classList.contains('typefx-caret')
  ) ?? null;
}

export function serializeContent(node) {
  if (node instanceof FakeTextNode) {
    return node.textContent;
  }

  if (!(node instanceof FakeElement)) {
    return node.childNodes.map((child) => serializeContent(child)).join('');
  }

  if (node.classList.contains('typefx-caret')) {
    return '';
  }

  if (node.tagName === 'BR') {
    return '\n';
  }

  return node.childNodes.map((child) => serializeContent(child)).join('');
}
