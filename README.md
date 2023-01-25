# 7TV Emote Adder

- Open https://7tv.app/emotes in your web browser (you need to be logged in)
- Paste the contents of [main.browser.js](./dist/main.browser.js) to into your
  browser's console
- In your browser's console, run:

```js
window.emote_adder("emote_set_id", "your_channel_name");
```

Example:

```js
window.emote_adder("63839c929f22c390", "Forsen");
```
