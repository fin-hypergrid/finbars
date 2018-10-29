# FinBars
Styleable scrollbars for real or virtual content

Try the [demo](https://fin-hypergrid.github.io/finbars/demo.html).

\[See the note [Regarding submodules](https://github.com/fin-hypergrid/rectangular#regarding-submodules) for important information on cloning this repo or re-purposing its build template.\]

## API documentation

Detailed API docs can be found [here](http://fin-hypergrid.github.io/finbars/FinBar.html).

## Import

Use one or the other:

### CommonJS npm module
For consumption by bundler on build machine.

_From Bash prompt:_
```bash
npm install --save-prod finbars
```
_From within a code module:_
```javascript
const FinBar = require('finbars');
```

### Runtime import
As an alternative to using the npm module, the client may request a versioned build file that sets the global `window.FinBar`:
```html
<script src="https://unpkg.com/finbars@1.6/umd/finbars.js"></script>
<script src="https://unpkg.com/finbars@1.6/umd/finbars.min.js"></script>
```
Any [SEMVER](//semver.org) string can be used. `1.6` in the above means load the latest of the 1.6.* range. See the [npm semver calculator](//semver.npmjs.com) and npm’s [semantic versioning](https://docs.npmjs.com/misc/semver) page.

## Synopsis

The following sets up a vertical scrollbar to scroll "real" content with the default handler, `vertbar.scrollRealContent`, which is wired up for you automatically when you give `content` option but no `onchange` option).
```javascript
var container = document.getElementsByTagName('div')[0],
    content = container.firstChild,
    vertBar = new FinBar({ orientation: 'vertical', content: content });

container.appendChild(vertBar.bar);

vertbar.resize();

window.onresize = function() { vertbar.resize(); };

```
Mark up:
```html
<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden;">
    <img src="something-taller-than-document.png" />
</div>
```
For this example, we use CSS to dynamically stick the `container` size to the document so that it is resized as the window is resized.

To set up a horizontal scrollbar as well, just do everything twice.

## Introduction

What you do with these scrollbars is completely up to you. They are essentially "range" controls. The scrolling effect is implemented purely in the callback (which you supply). Therefore, they can be used for any purpose, such as to perform "virtual scrolling" (see below).

The example (`src/index.html`) shows three scrolling `<div>…</div>` elements:

##### System scrollbars (no finbars)
The first `<div>...</div>` doesn't use finbars at all. It is scrolled by the browser using normal operating system scrollbars. These can be made to appear with the following CSS "overflow" style settings:

```css
overflow-x: scroll
overflow-y: scroll
```

Or "automatically" only when content would overflow the box:

```css
overflow-x: auto
overflow-y: auto
```

##### DIY scrolling with finbars
The second `<div>...</div>` uses finbars instead of system scrollbars. The finbars need to be instantiated, appended to the content element, and rendered using the `resize()` method. Each callback invocation shifts the content by resetting its position (`left` and `top`) styles. In this case the "overflow" styles must be set as follows:

```css
overflow-x: hidden
overflow-y: hidden
```

##### Virtual scrolling with finbars

The third `<div>...</div>` uses finbars to "scroll" virtual content. This means that instead of shifting the content around in response to each callback invocation, the content is regenerated instead in such a way that it appears to be moving in response the scrollbars.

If you generated content is not precise enough to stay within the bounds of the content element, set the "overflow" styles to "hidden" as above. Otherwise you can leave them set to their defaults ("visible").

## Finbar styling

You can style your scrollbars with CSS. You can either redefine the existing selectors for `div.finbar-vertical` and `div.finbar-horizontal` in `src/css/finbars.css` **OR** you can add your own selectors with a name of your choosing (in place of "finbar") and give that name to the constructor when instantiating your scrollbar object. This second method allows you to have multiple scrollbar styles on a single page.

Your styles should specify the size, color, and opacity of the scrollbar and its thumb.

NOTE: The only CSS style that is required is `position: absolute` which is set by the constructor, overriding any value from your stylesheets. You can also specify the initial position of the thumb (typically at `top: 0` for vertical scrollbars and `left: 0` for horizontal scrollbars).

CAUTION: Be sure your existing CSS selectors do not resolve to the scrollbar's element, which consists of a `<div>...</div>` with a single nested `<div>...</div>` for the thumb.

## Testing

The unit test included currently (test/index.js) is rudimentary and needs to be expanded.

An HTML file is included as an example. I user-tested this example file on:

* Mac OS Yosemite (10.10.5)
    * Chrome (45.0.2454.85)
    * Safari (8.0.8)
    * Firefox (40.0.3)
* Windows 7 (SP1)
    * Chrome (45.0.2454.85 m)
    * Firefox (40.0.3)
    * IE 11 (11.0.9600.17914, emulation mode = Edge)
    * IE 10 (IE 11, emulation mode = 10)

## Version History
* `1.6.2` (10/8/2018)
   * Keep .hover class on thumb throughout drag.
* `1.6.1` (10/8/2018)
   * Capture off-grid mouseup during scrollbar thumb drag.
* `1.6.0` (5/24/2018)
   * Add `deltaXFactor`, `deltaYFactor`, and `deltaZFactor` properties to fine tune wheel metrics.
