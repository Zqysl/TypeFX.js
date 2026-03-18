import './typefx.css';

type AnimationOptions = {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options?: number | KeyframeAnimationOptions;
};

type TypeFXOptions = {
  speed?: number; // typing speed in milliseconds
  speedRange?: number; // random speed range in milliseconds
  caretWidth?: string; // CSS width of the caret
  caretColor?: string; // CSS color of the caret
  entryAnimation?: AnimationOptions; // Custom entry animation
  deleteAnimation?: AnimationOptions; // Custom delete animation
};

type Direction = -1 | 1;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));



function getTextElement(char: string): HTMLElement {
  const e = document.createElement('span');
  e.textContent = char;
  e.classList.add('typefx-char');
  return e;
}


export default class TypeFX {
  private static readonly instances = new WeakMap<HTMLElement, TypeFX>();

  private el!: HTMLElement;
  private caret!: HTMLElement;

  private options!: TypeFXOptions;

  private selectedList: Set<HTMLElement> = new Set();

  // Internal queue: initially a resolved Promise
  private q: Promise<void> = Promise.resolve();

  private aborted = false;

  constructor(element: HTMLElement, options?: TypeFXOptions) {
    const existingInstance = TypeFX.instances.get(element);
    if (existingInstance) {
      return existingInstance;
    }

    this.el = element;
    TypeFX.instances.set(this.el, this);

    this.el.classList.add("typefx-container")

    this.options = {
      speed: 50,
      speedRange: 50,
      caretWidth: '0.05em',
      caretColor: 'currentColor',
      ...options
    };


    this.caret = document.createElement('span');
    this.caret.classList.add('typefx-caret', 'typefx-caret-blink');
    // Ensure the caret is inside the container
    if (!this.el.contains(this.caret)) {
      this.el.append(this.caret);
    }

    this.caret.style.setProperty('--typefx-caret-width', this.options.caretWidth!);
    this.caret.style.setProperty('--typefx-caret-color', this.options.caretColor!);
  }

  /** Core: attach an async task to the end of the queue and return this for chaining */
  private handleTaskError(error: unknown): void {
    console.error('[TypeFX] Action failed and the queue continued.', error);
  }

  private enqueue(task: () => Promise<void>): this {
    const nextTask = this.q.then(async () => {
      if (this.aborted) return;
      await task();
    });

    this.q = nextTask.catch((error) => {
      this.handleTaskError(error);
    });

    return this;
  }


  private getSpeedDelay(): number {
    const delay = this.options.speed! + Math.floor(Math.random() * this.options.speedRange!) - (this.options.speedRange! / 2);
    return Math.max(0, delay);
  }

  private createContentNode(char: string): HTMLElement {
    return char === '\n' ? document.createElement('br') : getTextElement(char);
  }

  private insertBeforeCaret(node: Node): void {
    this.el.insertBefore(node, this.caret);
  }

  private getCaretSibling(direction: Direction): HTMLElement | null {
    return (direction < 0 ? this.caret.previousElementSibling : this.caret.nextElementSibling) as HTMLElement | null;
  }

  private moveCaretBySibling(node: HTMLElement, direction: Direction): void {
    this.el.insertBefore(this.caret, direction < 0 ? node : node.nextElementSibling);
  }

  private addSelection(node: HTMLElement): void {
    node.classList.add('typefx-selected');
    this.selectedList.add(node);
  }

  private clearSelection(): void {
    for (const el of this.selectedList) {
      if (el.parentNode === this.el) {
        this.el.removeChild(el);
      }
    }
    this.selectedList.clear();
  }

  private async insertText(text: string, instant: boolean): Promise<void> {
    if (instant) {
      const fragment = document.createDocumentFragment();

      for (const ch of Array.from(text)) {
        if (this.aborted) break;
        fragment.append(this.createContentNode(ch));
      }

      this.insertBeforeCaret(fragment);
      return;
    }

    for (const ch of Array.from(text)) {
      if (this.aborted) break;

      const node = this.createContentNode(ch);
      this.insertBeforeCaret(node);

      if (this.options.entryAnimation) {
        const { keyframes, options } = this.options.entryAnimation;
        node.animate(keyframes, options);
      }

      await sleep(this.getSpeedDelay());
    }
  }

  private async deleteBeforeCaret(n: number, instant: boolean): Promise<void> {
    if (this.selectedList.size > 0) {
      this.clearSelection();

      if (!instant) {
        await sleep(this.getSpeedDelay());
      }
    }

    while (n-- > 0) {
      if (this.aborted) break;

      const prev = this.getCaretSibling(-1);
      if (!prev) break;

      if (!instant && this.options.deleteAnimation) {
        this.moveCaretBySibling(prev, -1);
        const { keyframes, options } = this.options.deleteAnimation;
        const animation = prev.animate(keyframes, options);
        animation.finished.then(() => prev.remove());
      } else {
        this.el.removeChild(prev);
      }

      if (!instant) {
        await sleep(this.getSpeedDelay());
      }
    }
  }

  private async traverseCaret(n: number, instant: boolean, select: boolean): Promise<void> {
    const direction: Direction = n < 0 ? -1 : 1;
    let remaining = Math.abs(n);

    while (remaining-- > 0) {
      if (this.aborted) break;

      const sibling = this.getCaretSibling(direction);
      if (!sibling) break;

      this.moveCaretBySibling(sibling, direction);

      if (select) {
        this.addSelection(sibling);
      }

      if (!instant) {
        await sleep(this.getSpeedDelay());
      }
    }
  }

  private async withCaretTask(task: () => Promise<void>): Promise<void> {
    this.caret.classList.remove('typefx-caret-blink');

    try {
      await task();
    } finally {
      this.caret.classList.add('typefx-caret-blink');
    }
  }

  /** Type: insert string character by character before the caret */
  type(text: string): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.insertText(text, false);
    }));
  }

  /** Type: Quick insert string before the caret */
  quickType(text: string): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.insertText(text, true);
    }));
  }

  /** Wait for a period */
  wait(ms: number): this {
    return this.enqueue(async () => { await sleep(ms); });
  }

  /** Delete n characters */
  delete(n = 0): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.deleteBeforeCaret(n, false);
    }));
  }


  /** Quick delete n characters */
  quickDelete(n = 0): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.deleteBeforeCaret(n, true);
    }));
  }

  /** Move caret n characters */
  move(n: number): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.traverseCaret(n, false, false);
    }));
  }

  /** Quick move caret n characters */
  quickMove(n: number): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.traverseCaret(n, true, false);
      await sleep(this.getSpeedDelay());
    }));
  }

  /** Select n characters */
  select(n: number): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      await this.traverseCaret(n, false, true);
    }));
  }


  /** Quick select n characters */
  quickSelect(n: number): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      const initialSibling = this.getCaretSibling(n < 0 ? -1 : 1);
      if (!initialSibling) return;

      await this.traverseCaret(n, true, true);
      await sleep(this.getSpeedDelay());
    }));
  }

  /** Clear content */
  clear(): this {
    return this.delete(Infinity)
  }


  /** Quick clear content */
  quickClear(): this {
    return this.enqueue(() => this.withCaretTask(async () => {
      if (this.selectedList.size > 0) {
        this.clearSelection();
      }

      while (this.caret.previousElementSibling) {
        this.el.removeChild(this.caret.previousElementSibling);
      }
    }));
  }


  /** Set typing speed */
  speed(ms: number): this {
    return this.enqueue(async () => {
      this.options.speed = ms;
    });
  }

  /** Set typing speed range */
  speedRange(ms: number): this {
    return this.enqueue(async () => {
      this.options.speedRange = ms;
    });
  }

  then(func: Function): this {
    return this.enqueue(async () => {
      func()
    });
  }

  /** Cancel all current actions */
  cancel(): this {
    this.aborted = true;
    this.q.then(() => this.aborted = false);
    return this;
  }

  /** Hide caret */
  hideCaret(): this {
    return this.enqueue(async () => {
      this.caret.classList.add('typefx-caret-hidden');
    });
  }

  /** Show caret */
  showCaret(): this {
    return this.enqueue(async () => {
      this.caret.classList.remove('typefx-caret-hidden');
    });
  }



  // then<TResult1 = void, TResult2 = never>(
  //   onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
  //   onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  // ): Promise<TResult1 | TResult2> {
  //   return this.q.then(onfulfilled, onrejected);
  // }
  // catch<TResult = never>(
  //   onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  // ): Promise<void | TResult> {
  //   return this.q.catch(onrejected);
  // }
  // finally(onfinally?: (() => void) | null): Promise<void> {
  //   return this.q.finally(onfinally ?? (() => { }));
  // }


}
