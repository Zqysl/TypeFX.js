# TypeFX.js

A modern typewriter effect library in plain JavaScript: type, erase, select – almost anything you’d do on a keyboard.


![](example.gif)




## Installation

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/typefxjs/dist/typefx.umd.min.js"></script>
```


### NPM

```shell
npm install typefxjs
```
```js
import TypeFX from "typefxjs"; 
```



## Usage

```html
<p id="content"></p>
```
```js
const element = document.querySelector('#content')

new TypeFX(element)
    .type("Type something with typefx.js!").wait(300)
    .move(-10).wait(400)
    .select(10).wait(500)
    .delete()
```
Or define with options:
```js
new TypeFX(element, {...})
    ...
```
See [API](#API) and [Options](#options)







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
const typeInstence = new TypeFX(document.querySelector('#content'), {
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





## Options

The `TypeFX` constructor accepts an `options` object to control typing speed, randomness, and caret style.

```ts
new TypeFX(element, options?)
```

For example:
```js
new TypeFX(element, {
    speed: 100,
    speedRange: 0,
    caretWidth: "1ch",
)
```


| Param | | Description |
| --- | --- | --- |
| **speed** | ``number`` (default `50`) | Base typing pause in milliseconds per character. |
| **speedRange** | ``number`` (default `50`) | Random speed range to simulate natural typing, set to 0 for linear typing|
| **caretWidth** | ``string`` (default `"0.05em"`) | Width of the caret, should be a valid CSS length. |



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
