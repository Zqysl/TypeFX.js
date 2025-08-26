# TypeFX.js

A modern typewriter effect in plain JavaScript: type, erase, select – almost anything you’d do on a keyboard.


![](example.gif)


## Installation

### NPM

```shell
npm install typefxjs
```



## ESM Usage


```js
import TypeFX from "typefxjs";

new TypeFX(document.querySelector('#content'))
    .type("Type something with typefx.js!")
```



## Vue3 Usage

```html
<template>
  <p ref="content"></p>
</template>

<script setup>
import { onMounted, useTemplateRef } from 'vue'
import TypeFX from 'typefxjs'

const contentEl = useTemplateRef('content')

onMounted(() => {
    new TypeFX(contentEl.value)
        .type("Type something with typefx.js!")
})
</script>
```



## Chainable

All TypeFX.js APIs are chainable and non-blocking, while each action in the chain is executed in sequence.

```js
let typeInstence = new TypeFX(document.querySelector('#content'), {
    speed: 100,
})
```

This:

```js
typeInstence
    .type("Type something, ").wait(300)
    .type("then type something else").wait(100)
```

Equal to:

```js
typeInstence.type("Type something, ").wait(300)
typeInstence.type("then type something else").wait(100)
```

## API



| Name | Params | Description |
| --- | --- | --- |
| **.type** | ``text: string`` String to type | Types characters one by one. |
| **.wait** | ``ms: number`` Time in milliseconds | Wait for a given duration. |
| **.delete** | ``n?: number`` Number of characters (default `0`) | Deletes `n` characters (and selected characters).|
| **.move** | ``n: number`` Number of characters to move (positive = right, negative = left) | Moves the caret by `n` characters. |
| **.quickMove** | ``n: number`` Number of characters to move (positive = right, negative = left) | Instantly moves the caret by `n` characters. |
| **.select** | ``n: number`` Number of characters to select (positive = forward, negative = backward) | Selects `n` characters by caret. |
| **.quickSelect** | ``n: number`` Number of characters to select (positive = forward, negative = backward) | Instantly selects `n` characters by caret. |
| **.clear** | - | Clears all text. |
