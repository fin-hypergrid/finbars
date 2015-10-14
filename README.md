# FooBars
Styleable scrollbars

Try the [demo](https://openfin.github.io/list-dragon/demo.html).

\[See the note [Regarding submodules](https://github.com/openfin/rectangular#regarding-submodules) for important information on cloning this repo or re-purposing its build template.\]

## API documentation

Detailed API docs can be found [here](http://openfin.github.io/foobars/FooBar.html).

## Introduction

What you do with these scrollbars is completely up to you. They are essentially "range" controls. The scrolling effect is implemented purely in the callback (which you supply). Therefore, they can be used for any purpose, such as to perform "virtual scrolling" (see below).

The example (`src/index.html`) shows three scrolling `<div>…</div>` elements:

##### System scrollbars (no foobars)
The first `<div>...</div>` doesn't use foobars at all. It is scrolled by the browser using normal operating system scrollbars. These can be made to appear with the following CSS "overflow" style settings:

```css
overflow-x: scroll
overflow-y: scroll
```

Or "automatically" only when content would overflow the box:

```css
overflow-x: auto
overflow-y: auto
```

##### DIY scrolling with foobars
The second `<div>...</div>` uses foobars instead of system scrollbars. The foobars need to be instantiated, appended to the content element, and rendered using the `resize()` method. Each callback invocation shifts the content by resetting its position (`left` and `top`) styles. In this case the "overflow" styles must be set as follows:

```css
overflow-x: hidden
overflow-y: hidden
```

##### Virtual scrolling with foobars

The third `<div>...</div>` uses foobars to "scroll" virtual content. This means that instead of shifting the content around in response to each callback invocation, the content is regenerated instead in such a way that it appears to be moving in response the scrollbars.

If you generated content is not precise enough to stay within the bounds of the content element, set the "overflow" styles to "hidden" as above. Otherwise you can leave them set to their defaults ("visible").

## Foobar styling

You can style your scrollbars with CSS. You can either redefine the existing selectors for `div.foobar-vertical` and `div.foobar-horizontal` in `src/css/foobars.css` **OR** you can add your own selectors with a name of your choosing (in place of "foobar") and give that name to the constructor when instantiating your scrollbar object. This second method allows you to have multiple scrollbar styles on a single page.

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

## What kind of module is this?

This is a modified Node module; its contents are inside a closure. Although this is an extra and unnecessary closure from Node's point of view, setting up the file this way also allows it to be included directly from the client HTML with a `<script>` tag, as follows:

```html
<script>
    var module = { exports: {} };
</script>

<script src="js/foobars.js"></script>

<script>
    var FooBar = module.exports;
    module.exports = {};
</script>

<script src="js/another-such-file.js"></script>

<script>
    var AnotherSuchFile = module.exports;
    delete window.module;
</script>
```

Alternatively, you can use [mnm.js (bower component)](https://github.com/joneit/mnm) which does something similar but allows your modules to reference each other with a provided `require()` function. This is a lightweight alternative to using browserify (although there is not file concatenation involved).
