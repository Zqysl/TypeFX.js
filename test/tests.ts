import type TypeFXClass from '../src/typefx';

type Replay = () => void;
type Testcase = (element: HTMLParagraphElement) => void;
type TypeFXConstructor = typeof TypeFXClass;

declare global {
  var TypeFX: TypeFXConstructor | undefined;
}

function getRequiredElement<T extends Element>(
  id: string,
  guard: (element: Element) => element is T,
): T {
  const element = document.getElementById(id);

  if (!element || !guard(element)) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

function isTemplateElement(element: Element): element is HTMLTemplateElement {
  return element instanceof HTMLTemplateElement;
}

function isDivElement(element: Element): element is HTMLDivElement {
  return element instanceof HTMLDivElement;
}

function isButtonElement(element: Element): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

function isParagraphElement(element: Element): element is HTMLParagraphElement {
  return element instanceof HTMLParagraphElement;
}

function getTypeFX(): TypeFXConstructor {
  if (!globalThis.TypeFX) {
    throw new Error('TypeFX bundle not found. Run "pnpm test" so the library is built before the test page opens.');
  }

  return globalThis.TypeFX;
}

function getRequiredChild<T extends Element>(
  root: ParentNode,
  selector: string,
  guard: (element: Element) => element is T,
): T {
  const element = root.querySelector(selector);

  if (!element || !guard(element)) {
    throw new Error(`Missing required child: ${selector}`);
  }

  return element;
}

const TypeFX = getTypeFX();
const template = getRequiredElement('testcase-template', isTemplateElement);
const container = getRequiredElement('test-container', isDivElement);
const replayAllButton = getRequiredElement('replay-all-btn', isButtonElement);
const replays: Replay[] = [];

function createTestcase(name: string, testcase: Testcase): void {
  const fragment = template.content.cloneNode(true);

  if (!(fragment instanceof DocumentFragment)) {
    throw new Error('Failed to clone testcase template.');
  }

  const caseTitle = getRequiredChild(fragment, '.case-title', isDivElement);
  const replayButton = getRequiredChild(fragment, '.replay-btn', isButtonElement);
  let typefxContainer = getRequiredChild(fragment, '.content', isParagraphElement);

  caseTitle.innerText = `${replays.length + 1}. ${name}`;

  const replay = () => {
    const nextContainer = document.createElement('p');
    nextContainer.className = 'content';
    typefxContainer.replaceWith(nextContainer);
    typefxContainer = nextContainer;
    testcase(typefxContainer);
  };

  replayButton.addEventListener('click', replay);
  replays.push(replay);

  testcase(typefxContainer);
  container.appendChild(fragment);
}

replayAllButton.addEventListener('click', () => {
  replays.forEach((replay) => replay());
});

createTestcase('Type', (element) => {
  new TypeFX(element)
    .type('Lorem ipsum dolor sit amet');
});

createTestcase('Quick Type', (element) => {
  new TypeFX(element)
    .wait(1000)
    .quickType('Lorem ipsum dolor sit amet')
    .wait(1000)
    .type('\n')
    .quickType('Lorem ipsum dolor sit amet')
    .wait(1000)
    .type('\n')
    .quickType('Lorem ipsum dolor sit amet');
});

createTestcase('Move and over move', (element) => {
  new TypeFX(element)
    .type('1234567890')
    .move(10)
    .wait(300)
    .move(-2)
    .wait(1000)
    .move(-20)
    .wait(300)
    .move(2);
});

createTestcase('Delete', (element) => {
  new TypeFX(element)
    .type('Lorem ipsum dolor sit amet')
    .delete(10);
});

createTestcase('quickDelete', (element) => {
  new TypeFX(element)
    .type('Lorem ipsum dolor sit amet')
    .quickDelete(10);
});

createTestcase('Clear and quick clear', (element) => {
  new TypeFX(element)
    .type('Lorem ipsum dolor sit amet')
    .clear()
    .type('Lorem ipsum dolor sit amet')
    .quickClear()
    .type('done.');
});

createTestcase('Delete and over delete', (element) => {
  new TypeFX(element)
    .type('1234567890')
    .speed(200)
    .wait(300)
    .delete(3)
    .wait(500)
    .delete(20)
    .speed(50)
    .type('done.');
});

createTestcase('Cancel after 600ms', (element) => {
  const instance = new TypeFX(element)
    .type('12345678901234567890123456789012345678901234567890');

  setTimeout(() => {
    instance.cancel();
  }, 600);
});

createTestcase('Custom loop', (element) => {
  const instance = new TypeFX(element)
    .type('Wait ');

  const loopA = () => {
    instance
      .speed(500)
      .type('.....')
      .speed(50)
      .delete(5)
      .then(loopA);
  };

  loopA();
});

createTestcase('Custom loop with interrupt', (element) => {
  const instance = new TypeFX(element)
    .type('Wait ');

  const loopA = () => {
    instance
      .speed(500)
      .type('.....')
      .speed(50)
      .delete(5)
      .then(loopA);
  };

  loopA();

  setTimeout(() => {
    instance
      .cancel()
      .speed(50)
      .wait(50)
      .type(' Done.');
  }, 5000);
});

createTestcase('Caret width with monospace font', (element) => {
  element.style.fontFamily = 'monospace';
  element.style.letterSpacing = '0.1em';

  new TypeFX(element, { caretWidth: '1ch' })
    .type('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    .select(-20)
    .delete();
});

createTestcase('Caret color', (element) => {
  new TypeFX(element, { caretWidth: '1ch', caretColor: 'red' })
    .type('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    .select(-20)
    .delete();
});

createTestcase('Hide Caret', (element) => {
  new TypeFX(element)
    .type('Lorem ipsum dolor sit amet')
    .hideCaret()
    .type(', consectetur adipiscing elit.');
});

createTestcase('Empty', (element) => {
  new TypeFX(element);
});

createTestcase('New Line', (element) => {
  new TypeFX(element)
    .type('Line1: aaaaa')
    .type('\n')
    .type('Line2: bbbbb')
    .type('\n')
    .type('Line3: ccccc');
});

createTestcase('New Line 2', (element) => {
  new TypeFX(element)
    .type('Line1: aaaaa\nLine2: bbbbb\nLine3: ccccc');
});

createTestcase('Re-define instance', (element) => {
  const instance = new TypeFX(element)
    .type('instance aaaaaaaaaaa ');

  const instance2 = new TypeFX(element)
    .type('instance bbbbbbbbbbb');

  instance
    .type('\nAB Equal: ')
    .type((instance === instance2).toString());
});

createTestcase('Custom Entry Animation', (element) => {
  new TypeFX(element, {
    entryAnimation: {
      keyframes: [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      options: {
        duration: 300,
        easing: 'ease-out',
      },
    },
  })
    .type('This text enters with a custom animation.');
});

createTestcase('Custom Delete Animation', (element) => {
  new TypeFX(element, {
    deleteAnimation: {
      keyframes: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.5)' },
      ],
      options: {
        duration: 300,
        easing: 'ease-in',
      },
    },
  })
    .type('This text will be deleted with a custom animation.')
    .wait(1000)
    .delete(10);
});
