type TypeFXOptions = {
  speed?: number; // typing speed in milliseconds
  speedRange?: number; // random speed range in milliseconds
  caretWidth?: string; // CSS width of the caret
  caretColor?: string; // CSS color of the caret
};



const TYPEFX_STYLE_ID = 'typefx-style';


function getCaretStyle(): string {
  return `
    .typefx-container::after {
      content: "\\200B";
      visibility: hidden;
      user-select: none;
      pointer-events: none;
    }
    .typefx-caret{
      position: absolute;
      display: inline-block;
      overflow: visible;
      width: 0px;
    }
    .typefx-caret::after {
      width: 0px;
      border-left: var(--typefx-caret-width) solid var(--typefx-caret-color);
      
      overflow: visible;
      content: "";
      position: relative;
    }
    .typefx-caret.typefx-caret-blink {
      animation: typefx-caret-blink 0.9s steps(1, end) infinite;
    }
    .typefx-caret.typefx-caret-hidden {
      display: none;
    }
    .typefx-selected {
      background-color: #00000044;
    }
    @keyframes typefx-caret-blink { 0%, 49% {opacity: 1;} 50%, 100% { opacity: 0; } }
`
}



function injectStyle(cssText: string) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(TYPEFX_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TYPEFX_STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}





const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));



function getTextElement(char: string): HTMLElement {
  const e = document.createElement('span');
  e.textContent = char;
  return e;
}


export default class TypeFX {
  private el!: HTMLElement;
  private caret!: HTMLElement;

  private options!: TypeFXOptions;

  private selectedList: Set<HTMLElement> = new Set();

  // Internal queue: initially a resolved Promise
  private q: Promise<void> = Promise.resolve();

  private aborted = false;

  constructor(element: HTMLElement, options?: TypeFXOptions) {
    if ((element as any).typefx) {
      return (element as any).typefx
    }

    this.el = element;
    (this.el as any).typefx = this;

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

    injectStyle(getCaretStyle());
  }

  /** Core: attach an async task to the end of the queue and return this for chaining */
  private enqueue(task: () => Promise<void>): this {
    this.q = this.q.then(() => (this.aborted ? Promise.resolve() : task()));
    return this;
  }


  private getSpeedDelay(): number {
    return this.options.speed! + Math.floor(Math.random() * this.options.speedRange!) - (this.options.speedRange! / 2);
  }

  /** Type: insert string character by character before the caret */
  type(text: string): this {
    return this.enqueue(async () => {
      this.caret.classList.remove('typefx-caret-blink');
      for (const ch of Array.from(text)) {
        if (this.aborted) break;

        let node: HTMLElement;
        if (ch === '\n') {
          node = document.createElement('br');
        } else {
          node = getTextElement(ch);
        }

        this.el.insertBefore(node, this.caret);
        await sleep(this.getSpeedDelay());
      }
      this.caret.classList.add('typefx-caret-blink');
    });
  }

  /** Type: Quick insert string before the caret */
  quickType(text: string): this {
    return this.enqueue(async () => {
      this.caret.classList.remove('typefx-caret-blink');
      for (const ch of Array.from(text)) {
        if (this.aborted) break;

        let node: HTMLElement;
        if (ch === '\n') {
          node = document.createElement('br');
        } else {
          node = getTextElement(ch);
        }

        this.el.insertBefore(node, this.caret);
      }
      this.caret.classList.add('typefx-caret-blink');
    });
  }

  /** Wait for a period */
  wait(ms: number): this {
    return this.enqueue(async () => { await sleep(ms); });
  }

  /** Delete n characters */
  delete(n = 0): this {
    return this.enqueue(async () => {
      this.caret.classList.remove('typefx-caret-blink');


      // If there is a selection, delete the selection first
      if (this.selectedList.size > 0) {
        for (const el of this.selectedList) {
          this.el.removeChild(el);
        }
        this.selectedList.clear();
        await sleep(this.getSpeedDelay());
      }


      while (n-- > 0) {
        if (this.aborted) break;
        // Find the last node before the caret
        const prev = this.caret.previousElementSibling as ChildNode | null;
        if (!prev) break;
        this.el.removeChild(prev);
        await sleep(this.getSpeedDelay());
      }
      this.caret.classList.add('typefx-caret-blink');
    });
  }


  /** Quick delete n characters */
  quickDelete(n = 0): this {
    return this.enqueue(async () => {
      this.caret.classList.remove('typefx-caret-blink');


      // If there is a selection, delete the selection first
      if (this.selectedList.size > 0) {
        for (const el of this.selectedList) {
          this.el.removeChild(el);
        }
        this.selectedList.clear();
      }


      while (n-- > 0) {
        if (this.aborted) break;
        // Find the last node before the caret
        const prev = this.caret.previousElementSibling as ChildNode | null;
        if (!prev) break;
        this.el.removeChild(prev);
      }
      this.caret.classList.add('typefx-caret-blink');
    });
  }

  /** Move caret n characters */
  move(n: number): this {
    if (n < 0) {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        while (n++ < 0) {
          if (this.aborted) break;
          // Find the last node before the caret
          const prev = this.caret.previousElementSibling as ChildNode as HTMLElement | null;
          if (!prev) break;
          this.el.insertBefore(this.caret, prev);
          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
      });
    } else {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        while (n-- > 0) {
          if (this.aborted) break;

          const next = this.caret.nextElementSibling as ChildNode as HTMLElement | null;
          console.log("next", next)
          if (!next) break;
          this.el.insertBefore(this.caret, next.nextElementSibling);
          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
      });
    }

  }

  /** Quick move caret n characters */
  quickMove(n: number): this {
    if (n < 0) {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');

        let prev: HTMLElement | null = this.caret;
        let last: HTMLElement | null = prev;

        while (n++ < 0) {
          last = prev;
          prev = prev.previousElementSibling as ChildNode as HTMLElement | null;
          if (!prev) break;
        }

        this.el.insertBefore(this.caret, last);

        this.caret.classList.add('typefx-caret-blink');

        await sleep(this.getSpeedDelay());
      });
    } else {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');

        let next: HTMLElement | null = this.caret;
        let last: HTMLElement | null = next;

        while (n-- > 0) {
          last = next;
          next = next.nextElementSibling as ChildNode as HTMLElement | null;
          if (!next) break;
        }

        this.el.insertBefore(this.caret, last.nextElementSibling);

        this.caret.classList.add('typefx-caret-blink');


        await sleep(this.getSpeedDelay());
      });
    }

  }

  /** Select n characters */
  select(n: number): this {
    if (n < 0) {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        while (n++ < 0) {
          if (this.aborted) break;
          // Find the last node before the caret
          const prev = this.caret.previousElementSibling as ChildNode as HTMLElement | null;
          if (!prev) break;
          this.el.insertBefore(this.caret, prev);

          prev.classList.add("typefx-selected")
          this.selectedList.add(prev);

          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
      });
    } else {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        while (n-- > 0) {
          if (this.aborted) break;

          const next = this.caret.nextElementSibling as ChildNode as HTMLElement | null;
          if (!next) break;
          this.el.insertBefore(this.caret, next.nextElementSibling);

          next.classList.add("typefx-selected")
          this.selectedList.add(next);

          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
      });
    }


  }


  /** Quick select n characters */
  quickSelect(n: number): this {
    if (n < 0) {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        let charEl: HTMLElement | null = this.caret.previousElementSibling as ChildNode as HTMLElement | null;
        if (!charEl) return;

        while (n++ < 0) {
          if (this.aborted) break;


          charEl.classList.add("typefx-selected")
          this.selectedList.add(charEl);

          // Find the last node before the caret
          charEl = charEl.previousElementSibling as ChildNode as HTMLElement | null;
          if (!charEl) break;

        }

        this.el.insertBefore(this.caret, charEl);
        await sleep(this.getSpeedDelay());

        this.caret.classList.add('typefx-caret-blink');
      });
    } else {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        let charEl: HTMLElement | null = this.caret.nextElementSibling as ChildNode as HTMLElement | null;
        if (!charEl) return;

        while (n-- > 0) {
          if (this.aborted) break;

          charEl.classList.add("typefx-selected")
          this.selectedList.add(charEl);

          charEl = charEl.nextElementSibling as ChildNode as HTMLElement | null;
          if (!charEl) break;

        }

        this.el.insertBefore(this.caret, charEl);
        await sleep(this.getSpeedDelay());

        this.caret.classList.add('typefx-caret-blink');
      });
    }

  }

  /** Clear content */
  clear(): this {
    return this.delete(Infinity)
  }


  /** Quick clear content */
  quickClear(): this {
    return this.quickDelete(Infinity)
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