type TypeFXOptions = {
  speed?: number; // typing speed in milliseconds
  speedRange?: number; // random speed range in milliseconds
  caretWidth?: string; // CSS width of the caret
};




const TYPEFX_STYLE_ID = 'typefx-style';


function getCaretStyle(width = '0.05em'): string {
  return `
    .typefx-caret{
      position: absolute;
      display: inline-block;
      overflow: visible;
      width: 0px;
    }
    .typefx-caret::after {
      width: 0px;
      border-left: ${width} solid currentColor;
      
      overflow: visible;
      content: "";
      position: relative;
    }
    .typefx-caret.typefx-caret-blink {
      animation: typefx-caret-blink 0.9s steps(1, end) infinite;
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
  private el: HTMLElement;
  private caret: HTMLElement;

  private options: TypeFXOptions;


  // Internal queue: initially a resolved Promise
  private q: Promise<void> = Promise.resolve();

  private aborted = false;

  constructor(element: HTMLElement, options?: TypeFXOptions) {
    this.el = element;

    this.options = {
      speed: 50,
      speedRange: 50,
      caretWidth: '0.05em',
      ...options
    };


    this.caret = document.createElement('span');
    this.caret.classList.add('typefx-caret', 'typefx-caret-blink');
    // Ensure the caret is inside the container
    if (!this.el.contains(this.caret)) {
      this.el.append(this.caret);
    }


    injectStyle(getCaretStyle(this.options.caretWidth));
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
        const node = getTextElement(ch);
        this.el.insertBefore(node, this.caret);
        await sleep(this.getSpeedDelay());
      }
      this.caret.classList.add('typefx-caret-blink');
    });
  }

  /** Wait for a period */
  wait(ms: number): this {
    return this.enqueue(async () => { await sleep(ms); });
  }

  /** Delete n characters */
  delete(n = 1): this {
    return this.enqueue(async () => {
      this.caret.classList.remove('typefx-caret-blink');
      while (n-- > 0) {
        if (this.aborted) break;
        // Find the last node before the caret
        const prev = this.caret.previousSibling as ChildNode | null;
        if (!prev) break;
        this.el.removeChild(prev);
        await sleep(this.getSpeedDelay());
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
          const prev = this.caret.previousSibling as ChildNode | null;
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
          // Find the last node before the caret
          const next = this.caret.nextSibling as ChildNode | null;
          if (!next) break;
          this.el.insertBefore(this.caret, next.nextSibling);
          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
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
          const prev = this.caret.previousSibling as ChildNode as Element | null;
          if (!prev) break;
          this.el.insertBefore(this.caret, prev);
          prev.classList.add("typefx-selected")
          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
      });
    } else {
      return this.enqueue(async () => {
        this.caret.classList.remove('typefx-caret-blink');
        while (n-- > 0) {
          if (this.aborted) break;
          // Find the last node before the caret
          const next = this.caret.nextSibling as ChildNode as Element | null;
          if (!next) break;
          this.el.insertBefore(this.caret, next.nextSibling);
          next.classList.add("typefx-selected")
          await sleep(this.getSpeedDelay());
        }
        this.caret.classList.add('typefx-caret-blink');
      });
    }


  }

  /** Clear content */
  clear(): this {
    return this.enqueue(async () => {
      // Keep the caret, only remove preceding nodes
      while (this.caret.previousSibling) {
        this.el.removeChild(this.caret.previousSibling);
      }
    });
  }


  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.q.then(onfulfilled, onrejected);
  }
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<void | TResult> {
    return this.q.catch(onrejected);
  }
  finally(onfinally?: (() => void) | null): Promise<void> {
    return this.q.finally(onfinally ?? (() => { }));
  }

  /** Cancel subsequent actions */
  cancel(): void {
    this.aborted = true;
  }
}