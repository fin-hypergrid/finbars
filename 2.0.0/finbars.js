(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* eslint-env browser */

/** @namespace cssInjector */

/**
 * @summary Insert base stylesheet into DOM
 *
 * @desc Creates a new `<style>...</style>` element from the named text string(s) and inserts it but only if it does not already exist in the specified container as per `referenceElement`.
 *
 * > Caveat: If stylesheet is for use in a shadow DOM, you must specify a local `referenceElement`.
 *
 * @returns A reference to the newly created `<style>...</style>` element.
 *
 * @param {string|string[]} cssRules
 * @param {string} [ID]
 * @param {undefined|null|Element|string} [referenceElement] - Container for insertion. Overloads:
 * * `undefined` type (or omitted): injects stylesheet at top of `<head>...</head>` element
 * * `null` value: injects stylesheet at bottom of `<head>...</head>` element
 * * `Element` type: injects stylesheet immediately before given element, wherever it is found.
 * * `string` type: injects stylesheet immediately before given first element found that matches the given css selector.
 *
 * @memberOf cssInjector
 */
function cssInjector(cssRules, ID, referenceElement) {
    if (typeof referenceElement === 'string') {
        referenceElement = document.querySelector(referenceElement);
        if (!referenceElement) {
            throw 'Cannot find reference element for CSS injection.';
        }
    } else if (referenceElement && !(referenceElement instanceof Element)) {
        throw 'Given value not a reference element.';
    }

    var container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

    if (ID) {
        ID = cssInjector.idPrefix + ID;

        if (container.querySelector('#' + ID)) {
            return; // stylesheet already in DOM
        }
    }

    var style = document.createElement('style');
    style.type = 'text/css';
    if (ID) {
        style.id = ID;
    }
    if (cssRules instanceof Array) {
        cssRules = cssRules.join('\n');
    }
    cssRules = '\n' + cssRules + '\n';
    if (style.styleSheet) {
        style.styleSheet.cssText = cssRules;
    } else {
        style.appendChild(document.createTextNode(cssRules));
    }

    if (referenceElement === undefined) {
        referenceElement = container.firstChild;
    }

    container.insertBefore(style, referenceElement);

    return style;
}

/**
 * @summary Optional prefix for `<style>` tag IDs.
 * @desc Defaults to `'injected-stylesheet-'`.
 * @type {string}
 * @memberOf cssInjector
 */
cssInjector.idPrefix = 'injected-stylesheet-';

// Interface
module.exports = cssInjector;

},{}],2:[function(require,module,exports){
/* eslint-env browser */

'use strict';

if (!window.FinBar) {
    window.FinBar = require('./');
}

},{"./":3}],3:[function(require,module,exports){
'use strict';

/* eslint-env node, browser */

var cssInjector = require('css-injector');

// Following is the sole style requirement for bar and thumb elements.
// Maintained in code so not dependent being in stylesheet.
var BAR_STYLE = 'position: absolute;';
var THUMB_STYLE = 'position: absolute;';

/**
 * @constructor FinBar
 * @summary Create a scrollbar object.
 * @desc Creating a scrollbar is a three-step process:
 *
 * 1. Instantiate the scrollbar object by calling this constructor function. Upon instantiation, the DOM element for the scrollbar (with a single child element for the scrollbar "thumb") is created but is not insert it into the DOM.
 * 2. After instantiation, it is the caller's responsibility to insert the scrollbar, {@link FinBar#bar|this.bar}, into the DOM.
 * 3. After insertion, the caller must call {@link FinBar#resize|resize()} at least once to size and position the scrollbar and its thumb. After that, `resize()` should also be called repeatedly on resize events (as the content element is being resized).
 *
 * Suggested configurations:
 * * _**Unbound**_<br/>
 * The scrollbar serves merely as a simple range (slider) control. Omit both `options.onchange` and `options.content`.
 * * _**Bound to virtual content element**_<br/>
 * Virtual content is projected into the element using a custom event handler supplied by the programmer in `options.onchange`. A typical use case would be to handle scrolling of the virtual content. Other use cases include data transformations, graphics transformations, _etc._
 * * _**Bound to real content**_<br/>
 * Set `options.content` to the "real" content element but omit `options.onchange`. This will cause the scrollbar to use the built-in event handler (`this.scrollRealContent`) which implements smooth scrolling of the content element within the container.
 *
 * @param {finbarOptions} [options={}] - Options object. See the type definition for member details.
 */
function FinBar(options) {

    // make bound versions of all the mouse event handler
    var bound = this._bound = {};
    Object.keys(handlersToBeBound).forEach(function (key) {
        bound[key] = handlersToBeBound[key].bind(this);
    }, this);

    /**
     * @name thumb
     * @summary The generated scrollbar thumb element.
     * @desc The thumb element's parent element is always the {@link FinBar#bar|bar} element.
     *
     * This property is typically referenced internally only. The size and position of the thumb element is maintained by `_calcThumb()`.
     * @type {Element}
     * @memberOf FinBar.prototype
     */
    var thumb = this.thumb = document.createElement('div');
    thumb.classList.add('thumb');
    thumb.setAttribute('style', THUMB_STYLE);
    thumb.onclick = bound.shortStop;
    thumb.onmouseover = bound.onmouseover;
    thumb.onmouseout = this._bound.onmouseout;

    /**
     * @name bar
     * @summary The generated scrollbar element.
     * @desc The caller inserts this element into the DOM (typically into the content container) and then calls its {@link FinBar#resize|resize()} method.
     *
     * Thus the node tree is typically:
     * * A **content container** element, which contains:
     *   * The content element(s)
     *   * This **scrollbar element**, which in turn contains:
     *     * The **thumb element**
     *
     * @type {Element}
     * @memberOf FinBar.prototype
     */
    var bar = this.bar = document.createElement('div');
     bar.classList.add('finbar-vertical');
    bar.setAttribute('style', BAR_STYLE);
    bar.onmousedown = this._bound.onmousedown;
    if (this.paging) { bar.onclick = bound.onclick; }
    bar.appendChild(thumb);

    options = options || {};

    // presets
    this.orientation = 'vertical';
    this._min = this._index = 0;
    this._max = 100;

    /**
     * Wheel metric normalization, applied equally to all three axes.
     *
     * This value is overridden with a platform- and browser-specific wheel factor when available in {@link FinBar.normals}.
     *
     * To suppress, delete `FinBar.normals` before instantiation or override this instance variable (with `1.0`) after instantiation.
     * @type {number}
     * @memberOf FinBar.prototype
     */
    this.normal = getNormal() || 1.0;

    // options
    Object.keys(options).forEach(function (key) {
        var option = options[key];
        if (option !== undefined) {
            switch (key) {

                case 'index':
                    this._index = option;
                    break;

                case 'range':
                    validRange(option);
                    this._min = option.min;
                    this._max = option.max;
                    this.contentSize = option.max - option.min + 1;
                    break;

                default:
                    if (
                        key.charAt(0) !== '_' &&
                        typeof FinBar.prototype[key] !== 'function'
                    ) {
                        // override prototype defaults for standard ;
                        // extend with additional properties (for use in onchange event handlers)
                        this[key] = option;
                    }
                    break;

            }
        }
    }, this);

    cssInjector(cssFinBars, 'finbar-base', options.cssStylesheetReferenceElement);
}

FinBar.prototype = {

    constructor: FinBar,    /**
     * @summary The scrollbar orientation.
     * @desc Set by the constructor to either `'vertical'` or `'horizontal'`. See the similarly named property in the {@link finbarOptions} object.
     *
     * Useful values are `'vertical'` (the default) or `'horizontal'`.
     *
     * Setting this property resets `this.oh` and `this.deltaProp` and changes the class names so as to reposition the scrollbar as per the CSS rules for the new orientation.
     * @default 'vertical'
     * @type {string}
     * @memberOf FinBar.prototype
     */
    set orientation(orientation) {
        if (orientation === this._orientation) {
            return;
        }

        this._orientation = orientation;

        /**
         * @readonly
         * @name oh
         * @summary <u>O</u>rientation <u>h</u>ash for this scrollbar.
         * @desc Set by the `orientation` setter to either the vertical or the horizontal orientation hash. The property should always be synchronized with `orientation`; do not update directly!
         *
         * This object is used internally to access scrollbars' DOM element properties in a generalized way without needing to constantly query the scrollbar orientation. For example, instead of explicitly coding `this.bar.top` for a vertical scrollbar and `this.bar.left` for a horizontal scrollbar, simply code `this.bar[this.oh.leading]` instead. See the {@link orientationHashType} definition for details.
         *
         * This object is useful externally for coding generalized {@link finbarOnChange} event handler functions that serve both horizontal and vertical scrollbars.
         * @type {orientationHashType}
         * @memberOf FinBar.prototype
         */
        this.oh = orientationHashes[this._orientation];

        if (!this.oh) {
            error('Invalid value for `options._orientation.');
        }

        /**
         * @name deltaProp
         * @summary The name of the `WheelEvent` property this scrollbar should listen to.
         * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
         *
         * Useful values are `'deltaX'`, `'deltaY'`, or `'deltaZ'`. A value of `null` means to ignore mouse wheel events entirely.
         *
         * The mouse wheel is one-dimensional and only emits events with `deltaY` data. This property is provided so that you can override the default of `'deltaX'` with a value of `'deltaY'` on your horizontal scrollbar primarily to accommodate certain "panoramic" interface designs where the mouse wheel should control horizontal rather than vertical scrolling. Just give `{ deltaProp: 'deltaY' }` in your horizontal scrollbar instantiation.
         *
         * Caveat: Note that a 2-finger drag on an Apple trackpad emits events with _both_ `deltaX ` and `deltaY` data so you might want to delay making the above adjustment until you can determine that you are getting Y data only with no X data at all (which is a sure bet you on a mouse wheel rather than a trackpad).

         * @type {object|null}
         * @memberOf FinBar.prototype
         */
        this.deltaProp = this.oh.delta;

        this.bar.className = this.bar.className.replace(/(vertical|horizontal)/g, orientation);

        if (this.bar.style.cssText !== BAR_STYLE || this.thumb.style.cssText !== THUMB_STYLE) {
            this.bar.setAttribute('style', BAR_STYLE);
            this.thumb.setAttribute('style', THUMB_STYLE);
            this.resize();
        }
    },
    get orientation() {
        return this._orientation;
    },

    /**
     * @summary Callback for scroll events.
     * @desc Set by the constructor via the similarly named property in the {@link finbarOptions} object. After instantiation, `this.onchange` may be updated directly.
     *
     * This event handler is called whenever the value of the scrollbar is changed through user interaction. The typical use case is when the content is scrolled. It is called with the `FinBar` object as its context and the current value of the scrollbar (its index, rounded) as the only parameter.
     *
     * Set this property to `null` to stop emitting such events.
     * @type {function(number)|null}
     * @memberOf FinBar.prototype
     */
    onchange: null,

    /**
     * @summary Add a CSS class name to the bar element's class list.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * The bar element's class list will always include `finbar-vertical` (or `finbar-horizontal` based on the current orientation). Whenever this property is set to some value, first the old prefix+orientation is removed from the bar element's class list; then the new prefix+orientation is added to the bar element's class list. This property causes _an additional_ class name to be added to the bar element's class list. Therefore, this property will only add at most one additional class name to the list.
     *
     * To remove _classname-orientation_ from the bar element's class list, set this property to a falsy value, such as `null`.
     *
     * > NOTE: You only need to specify an additional class name when you need to have mulltiple different styles of scrollbars on the same page. If this is not a requirement, then you don't need to make a new class; you would just create some additional rules using the same selectors in the built-in stylesheet (../css/finbars.css):
     * *`div.finbar-vertical` (or `div.finbar-horizontal`) for the scrollbar
     * *`div.finbar-vertical > div` (or `div.finbar-horizontal > div`) for the "thumb."
     *
     * Of course, your rules should come after the built-ins.
     * @type {string}
     * @memberOf FinBar.prototype
     */
    set classPrefix(prefix) {
        if (this._classPrefix) {
            this.bar.classList.remove(this._classPrefix + this.orientation);
        }

        this._classPrefix = prefix;

        if (prefix) {
            this.bar.classList.add(prefix + '-' + this.orientation);
        }
    },
    get classPrefix() {
        return this._classPrefix;
    },

    /**
     * @name increment
     * @summary Number of scrollbar index units representing a pageful. Used exclusively for paging up and down and for setting thumb size relative to content size.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * Can also be given as a parameter to the {@link FinBar#resize|resize} method, which is pertinent because content area size changes affect the definition of a "pageful." However, you only need to do this if this value is being used. It not used when:
     * * you define `paging.up` and `paging.down`
     * * your scrollbar is using `scrollRealContent`
     * @type {number}
     * @memberOf FinBar.prototype
     */
    increment: 1,

    /**
     * Default value of multiplier for `WheelEvent#deltaX` (horizontal scrolling delta).
     * @default
     * @memberOf FinBar.prototype
     */
    deltaXFactor: 1,

    /**
     * Default value of multiplier for `WheelEvent#deltaY` (vertical scrolling delta).
     * @default
     * @memberOf FinBar.prototype
     */
    deltaYFactor: 1,

    /**
     * Default value of multiplier for `WheelEvent#deltaZ` (delpth scrolling delta).
     * @default
     * @memberOf FinBar.prototype
     */
    deltaZFactor: 1,

    /**
     * @name barStyles
     * @summary Scrollbar styles to be applied by {@link FinBar#resize|resize()}.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * This is a value to be assigned to {@link FinBar#styles|styles} on each call to {@link FinBar#resize|resize()}. That is, a hash of values to be copied to the scrollbar element's style object on resize; or `null` for none.
     *
     * @see {@link FinBar#style|style}
     * @type {finbarStyles|null}
     * @memberOf FinBar.prototype
     */
    barStyles: null,

    /**
     * @name style
     * @summary Additional scrollbar styles.
     * @desc See type definition for more details. These styles are applied directly to the scrollbar's `bar` element.
     *
     * Values are adjusted as follows before being applied to the element:
     * 1. Included "pseudo-property" names from the scrollbar's orientation hash, {@link FinBar#oh|oh}, are translated to actual property names before being applied.
     * 2. When there are margins, percentages are translated to absolute pixel values because CSS ignores margins in its percentage calculations.
     * 3. If you give a value without a unit (a raw number), "px" unit is appended.
     *
     * General notes:
     * 1. It is always preferable to specify styles via a stylesheet. Only set this property when you need to specifically override (a) stylesheet value(s).
     * 2. Can be set directly or via calls to the {@link FinBar#resize|resize} method.
     * 3. Should only be set after the scrollbar has been inserted into the DOM.
     * 4. Before applying these new values to the element, _all_ in-line style values are reset (by removing the element's `style` attribute), exposing inherited values (from stylesheets).
     * 5. Empty object has no effect.
     * 6. Falsey value in place of object has no effect.
     *
     * > CAVEAT: Do not attempt to treat the object you assign to this property as if it were `this.bar.style`. Specifically, changing this object after assigning it will have no effect on the scrollbar. You must assign it again if you want it to have an effect.
     *
     * @see {@link FinBar#barStyles|barStyles}
     * @type {finbarStyles}
     * @memberOf FinBar.prototype
     */
    set style(styles) {
        var keys = Object.keys(styles = extend({}, styles, this._auxStyles));

        if (keys.length) {
            var bar = this.bar,
                barRect = bar.getBoundingClientRect(),
                container = this.container || bar.parentElement,
                containerRect = container.getBoundingClientRect(),
                oh = this.oh;

            // Before applying new styles, revert all styles to values inherited from stylesheets
            bar.setAttribute('style', BAR_STYLE);

            keys.forEach(function (key) {
                var val = styles[key];

                if (key in oh) {
                    key = oh[key];
                }

                if (!isNaN(Number(val))) {
                    val = (val || 0) + 'px';
                } else if (/%$/.test(val)) {
                    // When bar size given as percentage of container, if bar has margins, restate size in pixels less margins.
                    // (If left as percentage, CSS's calculation will not exclude margins.)
                    var oriented = axis[key],
                        margins = barRect[oriented.marginLeading] + barRect[oriented.marginTrailing];
                    if (margins) {
                        val = parseInt(val, 10) / 100 * containerRect[oriented.size] - margins + 'px';
                    }
                }

                bar.style[key] = val;
            });
        }
    },

    /**
     * @readonly
     * @name paging
     * @summary Enable page up/dn clicks.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * If truthy, listen for clicks in page-up and page-down regions of scrollbar.
     *
     * If an object, call `.paging.up()` on page-up clicks and `.paging.down()` will be called on page-down clicks.
     *
     * Changing the truthiness of this value after instantiation currently has no effect.
     * @type {boolean|object}
     * @memberOf FinBar.prototype
     */
    paging: true,

    /**
     * @name range
     * @summary Setter for the minimum and maximum scroll values.
     * @desc Set by the constructor. These values are the limits for {@link FooBar#index|index}.
     *
     * The setter accepts an object with exactly two numeric properties: `.min` which must be less than `.max`. The values are extracted and the object is discarded.
     *
     * The getter returns a new object with `.min` and '.max`.
     *
     * @type {rangeType}
     * @memberOf FinBar.prototype
     */
    set range(range) {
        validRange(range);
        this._min = range.min;
        this._max = range.max;
        this.contentSize = range.max - range.min + 1;
        this.index = this.index; // re-clamp
    },
    get range() {
        return {
            min: this._min,
            max: this._max
        };
    },

    /**
     * @summary Index value of the scrollbar.
     * @desc This is the position of the scroll thumb.
     *
     * Setting this value clamps it to {@link FinBar#min|min}..{@link FinBar#max|max}, scroll the content, and moves thumb.
     *
     * Getting this value returns the current index. The returned value will be in the range `min`..`max`. It is intentionally not rounded.
     *
     * Use this value as an alternative to (or in addition to) using the {@link FinBar#onchange|onchange} callback function.
     *
     * @see {@link FinBar#_setScroll|_setScroll}
     * @type {number}
     * @memberOf FinBar.prototype
     */
    set index(idx) {
        idx = Math.min(this._max, Math.max(this._min, idx)); // clamp it
        this._setScroll(idx);
        // this._setThumbSize();
    },
    get index() {
        return this._index;
    },

    /**
     * @private
     * @summary Move the thumb.
     * @desc Also displays the index value in the test panel and invokes the callback.
     * @param idx - The new scroll index, a value in the range `min`..`max`.
     * @param [scaled=f(idx)] - The new thumb position in pixels and scaled relative to the containing {@link FinBar#bar|bar} element, i.e., a proportional number in the range `0`..`thumbMax`. When omitted, a function of `idx` is used.
     * @memberOf FinBar.prototype
     */
    _setScroll: function (idx, scaled) {
        this._index = idx;

        // Display the index value in the test panel
        if (this.testPanelItem && this.testPanelItem.index instanceof Element) {
            this.testPanelItem.index.innerHTML = Math.round(idx);
        }

        // Call the callback
        if (this.onchange) {
            this.onchange.call(this, Math.round(idx));
        }

        // Move the thumb
        if (scaled === undefined) {
            scaled = (idx - this._min) / (this._max - this._min) * this._thumbMax;
        }
        this.thumb.style[this.oh.leading] = scaled + 'px';
    },

    scrollRealContent: function (idx) {
        var containerRect = this.content.parentElement.getBoundingClientRect(),
            sizeProp = this.oh.size,
            maxScroll = Math.max(0, this.content[sizeProp] - containerRect[sizeProp]),
            //scroll = Math.min(idx, maxScroll);
            scroll = (idx - this._min) / (this._max - this._min) * maxScroll;
        //console.log('scroll: ' + scroll);
        this.content.style[this.oh.leading] = -scroll + 'px';
    },

    /**
     * @summary Recalculate thumb position.
     *
     * @desc This method recalculates the thumb size and position. Call it once after inserting your scrollbar into the DOM, and repeatedly while resizing the scrollbar (which typically happens when the scrollbar's parent is resized by user.
     *
     * > This function shifts args if first arg omitted.
     *
     * @param {number} [increment=this.increment] - Resets {@link FooBar#increment|increment} (see).
     *
     * @param {finbarStyles} [barStyles=this.barStyles] - (See type definition for details.) Scrollbar styles to be applied to the bar element.
     *
     * Only specify a `barStyles` object when you need to override stylesheet values. If provided, becomes the new default (`this.barStyles`), for use as a default on subsequent calls.
     *
     * It is generally the case that the scrollbar's new position is sufficiently described by the current styles. Therefore, it is unusual to need to provide a `barStyles` object on every call to `resize`.
     *
     * @returns {FinBar} Self for chaining.
     * @memberOf FinBar.prototype
     */
    resize: function (increment, barStyles) {
        var bar = this.bar;

        if (!bar.parentNode) {
            return; // not in DOM yet so nothing to do
        }

        var container = this.container || bar.parentElement,
            containerRect = container.getBoundingClientRect();

        // shift args if if 1st arg omitted
        if (typeof increment === 'object') {
            barStyles = increment;
            increment = undefined;
        }

        this.style = this.barStyles = barStyles || this.barStyles;

        // Bound to real content: Content was given but no onchange handler.
        // Set up .onchange, .containerSize, and .increment.
        // Note this only makes sense if your index unit is pixels.
        if (this.content) {
            if (!this.onchange) {
                this.onchange = this.scrollRealContent;
                this.contentSize = this.content[this.oh.size];
                this._min = 0;
                this._max = this.contentSize - 1;
            }
        }
        if (this.onchange === this.scrollRealContent) {
            this.containerSize = containerRect[this.oh.size];
            this.increment = this.containerSize / (this.contentSize - this.containerSize) * (this._max - this._min);
        } else {
            this.containerSize = 1;
            this.increment = increment || this.increment;
        }

        var index = this.index;
        this.testPanelItem = this.testPanelItem || this._addTestPanelItem();
        this._setThumbSize();
        this.index = index;

        if (this.deltaProp !== null) {
            container.addEventListener('wheel', this._bound.onwheel);
        }

        return this;
    },

    /**
     * @summary Shorten trailing end of scrollbar by thickness of some other scrollbar.
     * @desc In the "classical" scenario where vertical scroll bar is on the right and horizontal scrollbar is on the bottom, you want to shorten the "trailing end" (bottom and right ends, respectively) of at least one of them so they don't overlay.
     *
     * This convenience function is an programmatic alternative to hardcoding the correct style with the correct value in your stylesheet; or setting the correct style with the correct value in the {@link FinBar#barStyles|barStyles} object.
     *
     * @see {@link FinBar#foreshortenBy|foreshortenBy}.
     *
     * @param {FinBar|null} otherFinBar - Other scrollbar to avoid by shortening this one; `null` removes the trailing space
     * @returns {FinBar} For chaining
     */
    shortenBy: function (otherFinBar) { return this.shortenEndBy('trailing', otherFinBar); },

    /**
     * @summary Shorten leading end of scrollbar by thickness of some other scrollbar.
     * @desc Supports non-classical scrollbar scenarios where vertical scroll bar may be on left and horizontal scrollbar may be on top, in which case you want to shorten the "leading end" rather than the trailing end.
     * @see {@link FinBar#shortenBy|shortenBy}.
     * @param {FinBar|null} otherFinBar - Other scrollbar to avoid by shortening this one; `null` removes the trailing space
     * @returns {FinBar} For chaining
     */
    foreshortenBy: function (otherFinBar) { return this.shortenEndBy('leading', otherFinBar); },

    /**
     * @summary Generalized shortening function.
     * @see {@link FinBar#shortenBy|shortenBy}.
     * @see {@link FinBar#foreshortenBy|foreshortenBy}.
     * @param {string} whichEnd - a CSS style property name or an orientation hash name that translates to a CSS style property name.
     * @param {FinBar|null} otherFinBar - Other scrollbar to avoid by shortening this one; `null` removes the trailing space
     * @returns {FinBar} For chaining
     */
    shortenEndBy: function (whichEnd, otherFinBar) {
        if (!otherFinBar) {
            delete this._auxStyles;
        } else if (otherFinBar instanceof FinBar && otherFinBar.orientation !== this.orientation) {
            var otherStyle = window.getComputedStyle(otherFinBar.bar),
                ooh = orientationHashes[otherFinBar.orientation];
            this._auxStyles = {};
            this._auxStyles[whichEnd] = otherStyle[ooh.thickness];
        }
        return this; // for chaining
    },

    /**
     * @private
     * @summary Sets the proportional thumb size and hides thumb when 100%.
     * @desc The thumb size has an absolute minimum of 20 (pixels).
     * @memberOf FinBar.prototype
     */
    _setThumbSize: function () {
        var oh = this.oh,
            thumbComp = window.getComputedStyle(this.thumb),
            thumbMarginLeading = parseInt(thumbComp[oh.marginLeading]),
            thumbMarginTrailing = parseInt(thumbComp[oh.marginTrailing]),
            thumbMargins = thumbMarginLeading + thumbMarginTrailing,
            barSize = this.bar.getBoundingClientRect()[oh.size],
            thumbSize = Math.max(20, barSize * this.containerSize / this.contentSize);

        if (this.containerSize < this.contentSize) {
            this.bar.style.visibility = 'visible';
            this.thumb.style[oh.size] = thumbSize + 'px';
        } else {
            this.bar.style.visibility = 'hidden';
        }

        /**
         * @private
         * @name _thumbMax
         * @summary Maximum offset of thumb's leading edge.
         * @desc This is the pixel offset within the scrollbar of the thumb when it is at its maximum position at the extreme end of its range.
         *
         * This value takes into account the newly calculated size of the thumb element (including its margins) and the inner size of the scrollbar (the thumb's containing element, including _its_ margins).
         *
         * NOTE: Scrollbar padding is not taken into account and assumed to be 0 in the current implementation and is assumed to be `0`; use thumb margins in place of scrollbar padding.
         * @type {number}
         * @memberOf FinBar.prototype
         */
        this._thumbMax = barSize - thumbSize - thumbMargins;

        this._thumbMarginLeading = thumbMarginLeading; // used in mousedown
    },

    /**
     * @summary Remove the scrollbar.
     * @desc Unhooks all the event handlers and then removes the element from the DOM. Always call this method prior to disposing of the scrollbar object.
     * @memberOf FinBar.prototype
     */
    remove: function () {
        this.bar.onmousedown = null;
        this._removeEvt('mousemove');
        this._removeEvt('mouseup');

        (this.container || this.bar.parentElement)._removeEvt('wheel');

        this.bar.onclick =
            this.thumb.onclick =
                this.thumb.onmouseover =
                    this.thumb.transitionend =
                        this.thumb.onmouseout = null;

        this.bar.remove();
    },

    /**
     * @private
     * @function _addTestPanelItem
     * @summary Append a test panel element.
     * @desc If there is a test panel in the DOM (typically an `<ol>...</ol>` element) with class names of both `this.classPrefix` and `'test-panel'` (or, barring that, any element with class name `'test-panel'`), an `<li>...</li>` element will be created and appended to it. This new element will contain a span for each class name given.
     *
     * You should define a CSS selector `.listening` for these spans. This class will be added to the spans to alter their appearance when a listener is added with that class name (prefixed with 'on').
     *
     * (This is an internal function that is called once by the constructor on every instantiation.)
     * @returns {Element|undefined} The appended `<li>...</li>` element or `undefined` if there is no test panel.
     * @memberOf FinBar.prototype
     */
    _addTestPanelItem: function () {
        var testPanelItem,
            testPanelElement = document.querySelector('.' + this._classPrefix + '.test-panel') || document.querySelector('.test-panel');

        if (testPanelElement) {
            var testPanelItemPartNames = [ 'mousedown', 'mousemove', 'mouseup', 'index' ],
                item = document.createElement('li');

            testPanelItemPartNames.forEach(function (partName) {
                item.innerHTML += '<span class="' + partName + '">' + partName.replace('mouse', '') + '</span>';
            });

            testPanelElement.appendChild(item);

            testPanelItem = {};
            testPanelItemPartNames.forEach(function (partName) {
                testPanelItem[partName] = item.getElementsByClassName(partName)[0];
            });
        }

        return testPanelItem;
    },

    _addEvt: function (evtName) {
        var spy = this.testPanelItem && this.testPanelItem[evtName];
        if (spy) { spy.classList.add('listening'); }
        window.addEventListener(evtName, this._bound['on' + evtName]);
    },

    _removeEvt: function (evtName) {
        var spy = this.testPanelItem && this.testPanelItem[evtName];
        if (spy) { spy.classList.remove('listening'); }
        window.removeEventListener(evtName, this._bound['on' + evtName]);
    }
};

function extend(obj) {
    for (var i = 1; i < arguments.length; ++i) {
        var objn = arguments[i];
        if (objn) {
            for (var key in objn) {
                obj[key] = objn[key];
            }
        }
    }
    return obj;
}

function validRange(range) {
    var keys = Object.keys(range),
        valid =  keys.length === 2 &&
            typeof range.min === 'number' &&
            typeof range.max === 'number' &&
            range.min <= range.max;

    if (!valid) {
        error('Invalid .range object.');
    }
}

/**
 * @private
 * @name handlersToBeBound
 * @type {object}
 * @desc The functions defined in this object are all DOM event handlers that are bound by the FinBar constructor to each new instance. In other words, the `this` value of these handlers, once bound, refer to the FinBar object and not to the event emitter. "Do not consume raw."
 */
var handlersToBeBound = {
    shortStop: function (evt) {
        evt.stopPropagation();
    },

    onwheel: function (evt) {
        this.index += evt[this.deltaProp] * this[this.deltaProp + 'Factor'] * this.normal;
        evt.stopPropagation();
        evt.preventDefault();
    },

    onclick: function (evt) {
        var thumbBox = this.thumb.getBoundingClientRect(),
            goingUp = evt[this.oh.coordinate] < thumbBox[this.oh.leading];

        if (typeof this.paging === 'object') {
            this.index = this.paging[goingUp ? 'up' : 'down'](Math.round(this.index));
        } else {
            this.index += goingUp ? -this.increment : this.increment;
        }

        // make the thumb glow momentarily
        this.thumb.classList.add('hover');
        var self = this;
        this.thumb.addEventListener('transitionend', function waitForIt() {
            this.removeEventListener('transitionend', waitForIt);
            self._bound.onmouseup(evt);
        });

        evt.stopPropagation();
    },

    onmouseover: function () {
        this.thumb.classList.add('hover');
    },

    onmouseout: function () {
        if (!this.dragging) {
            this.thumb.classList.remove('hover');
        }
    },

    onmousedown: function (evt) {
        var thumbBox = this.thumb.getBoundingClientRect();
        this.pinOffset = evt[this.oh.axis] - thumbBox[this.oh.leading] + this.bar.getBoundingClientRect()[this.oh.leading] + this._thumbMarginLeading;
        document.documentElement.style.cursor = 'default';

        this.dragging = true;

        this._addEvt('mousemove');
        this._addEvt('mouseup');

        evt.stopPropagation();
        evt.preventDefault();
    },

    onmousemove: function (evt) {
        if (!(evt.buttons & 1)) {
            // mouse button may have been released without `onmouseup` triggering (see
            window.dispatchEvent(new MouseEvent('mouseup', evt));
            return;
        }

        var scaled = Math.min(this._thumbMax, Math.max(0, evt[this.oh.axis] - this.pinOffset));
        var idx = scaled / this._thumbMax * (this._max - this._min) + this._min;

        this._setScroll(idx, scaled);

        evt.stopPropagation();
        evt.preventDefault();
    },

    onmouseup: function (evt) {
        this._removeEvt('mousemove');
        this._removeEvt('mouseup');

        this.dragging = false;

        document.documentElement.style.cursor = 'auto';

        var thumbBox = this.thumb.getBoundingClientRect();
        if (
            thumbBox.left <= evt.clientX && evt.clientX <= thumbBox.right &&
            thumbBox.top <= evt.clientY && evt.clientY <= thumbBox.bottom
        ) {
            this._bound.onmouseover(evt);
        } else {
            this._bound.onmouseout(evt);
        }

        evt.stopPropagation();
        evt.preventDefault();
    }
};

/**
 * Table of wheel normals to webkit.
 *
 * This object is a dictionary of platform dictionaries, keyed by:
 * * `mac` — macOS
 * * `win` — Window
 *
 * Each platform dictionary is keyed by:
 * * `webkit` — Chrome, Opera, Safari
 * * `moz` — Firefox
 * * `ms` — IE 11 _(Windows only)_
 * * `edge` — Edge _(Windows only)_
 *
 * @todo add `linux` platform
 * @type {object}
 */
FinBar.normals = {
    mac: {
        webkit: 1.0,
        moz: 35
    },
    win: {
        webkit: 2.6,
        moz: 85,
        ms: 2.9,
        edge: 2
    }
};

function getNormal() {
    if (FinBar.normals) {
        var nav = window.navigator, ua = nav.userAgent;
        var platform = nav.platform.substr(0, 3).toLowerCase();
        var browser = /Edge/.test(ua) ? 'edge' :
            /Opera|OPR|Chrome|Safari/.test(ua) ? 'webkit' :
                /Firefox/.test(ua) ? 'moz' :
                    document.documentMode ? 'ms' : // internet explorer
                        undefined;
        var platformDictionary = FinBar.normals[platform] || {};
        return platformDictionary[browser];
    }
}

var orientationHashes = {
    vertical: {
        coordinate:     'clientY',
        axis:           'pageY',
        size:           'height',
        outside:        'right',
        inside:         'left',
        leading:        'top',
        trailing:       'bottom',
        marginLeading:  'marginTop',
        marginTrailing: 'marginBottom',
        thickness:      'width',
        delta:          'deltaY'
    },
    horizontal: {
        coordinate:     'clientX',
        axis:           'pageX',
        size:           'width',
        outside:        'bottom',
        inside:         'top',
        leading:        'left',
        trailing:       'right',
        marginLeading:  'marginLeft',
        marginTrailing: 'marginRight',
        thickness:      'height',
        delta:          'deltaX'
    }
};

var axis = {
    top:    'vertical',
    bottom: 'vertical',
    height: 'vertical',
    left:   'horizontal',
    right:  'horizontal',
    width:  'horizontal'
};

var cssFinBars; // definition inserted by gulpfile between following comments
/* inject:css */
cssFinBars = 'div.finbar-horizontal,div.finbar-vertical{margin:3px}div.finbar-horizontal>.thumb,div.finbar-vertical>.thumb{background-color:#d3d3d3;-webkit-box-shadow:0 0 1px #000;-moz-box-shadow:0 0 1px #000;box-shadow:0 0 1px #000;border-radius:4px;margin:2px;opacity:.4;transition:opacity .5s}div.finbar-horizontal>.thumb.hover,div.finbar-vertical>.thumb.hover{opacity:1;transition:opacity .5s}div.finbar-vertical{top:0;bottom:0;right:0;width:11px}div.finbar-vertical>.thumb{top:0;right:0;width:7px}div.finbar-horizontal{left:0;right:0;bottom:0;height:11px}div.finbar-horizontal>.thumb{left:0;bottom:0;height:7px}';
/* endinject */

function error(msg) {
    throw 'finbars: ' + msg;
}

// Interface
module.exports = FinBar;

},{"css-injector":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25laXQvcmVwb3MvZmluYmFycy9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvbmVpdC9yZXBvcy9maW5iYXJzL25vZGVfbW9kdWxlcy9jc3MtaW5qZWN0b3IvaW5kZXguanMiLCIvVXNlcnMvam9uZWl0L3JlcG9zL2ZpbmJhcnMvc3JjL2Zha2VfNGE5OGFmZWUuanMiLCIvVXNlcnMvam9uZWl0L3JlcG9zL2ZpbmJhcnMvc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG4vKiogQG5hbWVzcGFjZSBjc3NJbmplY3RvciAqL1xuXG4vKipcbiAqIEBzdW1tYXJ5IEluc2VydCBiYXNlIHN0eWxlc2hlZXQgaW50byBET01cbiAqXG4gKiBAZGVzYyBDcmVhdGVzIGEgbmV3IGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQgZnJvbSB0aGUgbmFtZWQgdGV4dCBzdHJpbmcocykgYW5kIGluc2VydHMgaXQgYnV0IG9ubHkgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdCBpbiB0aGUgc3BlY2lmaWVkIGNvbnRhaW5lciBhcyBwZXIgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqID4gQ2F2ZWF0OiBJZiBzdHlsZXNoZWV0IGlzIGZvciB1c2UgaW4gYSBzaGFkb3cgRE9NLCB5b3UgbXVzdCBzcGVjaWZ5IGEgbG9jYWwgYHJlZmVyZW5jZUVsZW1lbnRgLlxuICpcbiAqIEByZXR1cm5zIEEgcmVmZXJlbmNlIHRvIHRoZSBuZXdseSBjcmVhdGVkIGA8c3R5bGU+Li4uPC9zdHlsZT5gIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IGNzc1J1bGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gW0lEXVxuICogQHBhcmFtIHt1bmRlZmluZWR8bnVsbHxFbGVtZW50fHN0cmluZ30gW3JlZmVyZW5jZUVsZW1lbnRdIC0gQ29udGFpbmVyIGZvciBpbnNlcnRpb24uIE92ZXJsb2FkczpcbiAqICogYHVuZGVmaW5lZGAgdHlwZSAob3Igb21pdHRlZCk6IGluamVjdHMgc3R5bGVzaGVldCBhdCB0b3Agb2YgYDxoZWFkPi4uLjwvaGVhZD5gIGVsZW1lbnRcbiAqICogYG51bGxgIHZhbHVlOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgYm90dG9tIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBFbGVtZW50YCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGVsZW1lbnQsIHdoZXJldmVyIGl0IGlzIGZvdW5kLlxuICogKiBgc3RyaW5nYCB0eXBlOiBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGZpcnN0IGVsZW1lbnQgZm91bmQgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBjc3Mgc2VsZWN0b3IuXG4gKlxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmZ1bmN0aW9uIGNzc0luamVjdG9yKGNzc1J1bGVzLCBJRCwgcmVmZXJlbmNlRWxlbWVudCkge1xuICAgIGlmICh0eXBlb2YgcmVmZXJlbmNlRWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVmZXJlbmNlRWxlbWVudCk7XG4gICAgICAgIGlmICghcmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICAgICAgdGhyb3cgJ0Nhbm5vdCBmaW5kIHJlZmVyZW5jZSBlbGVtZW50IGZvciBDU1MgaW5qZWN0aW9uLic7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZUVsZW1lbnQgJiYgIShyZWZlcmVuY2VFbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgICAgdGhyb3cgJ0dpdmVuIHZhbHVlIG5vdCBhIHJlZmVyZW5jZSBlbGVtZW50Lic7XG4gICAgfVxuXG4gICAgdmFyIGNvbnRhaW5lciA9IHJlZmVyZW5jZUVsZW1lbnQgJiYgcmVmZXJlbmNlRWxlbWVudC5wYXJlbnROb2RlIHx8IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcblxuICAgIGlmIChJRCkge1xuICAgICAgICBJRCA9IGNzc0luamVjdG9yLmlkUHJlZml4ICsgSUQ7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcjJyArIElEKSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBzdHlsZXNoZWV0IGFscmVhZHkgaW4gRE9NXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgIGlmIChJRCkge1xuICAgICAgICBzdHlsZS5pZCA9IElEO1xuICAgIH1cbiAgICBpZiAoY3NzUnVsZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjc3NSdWxlcyA9IGNzc1J1bGVzLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICBjc3NSdWxlcyA9ICdcXG4nICsgY3NzUnVsZXMgKyAnXFxuJztcbiAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3NSdWxlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3NSdWxlcykpO1xuICAgIH1cblxuICAgIGlmIChyZWZlcmVuY2VFbGVtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgIH1cblxuICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoc3R5bGUsIHJlZmVyZW5jZUVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIHN0eWxlO1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IE9wdGlvbmFsIHByZWZpeCBmb3IgYDxzdHlsZT5gIHRhZyBJRHMuXG4gKiBAZGVzYyBEZWZhdWx0cyB0byBgJ2luamVjdGVkLXN0eWxlc2hlZXQtJ2AuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQG1lbWJlck9mIGNzc0luamVjdG9yXG4gKi9cbmNzc0luamVjdG9yLmlkUHJlZml4ID0gJ2luamVjdGVkLXN0eWxlc2hlZXQtJztcblxuLy8gSW50ZXJmYWNlXG5tb2R1bGUuZXhwb3J0cyA9IGNzc0luamVjdG9yO1xuIiwiLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbid1c2Ugc3RyaWN0JztcblxuaWYgKCF3aW5kb3cuRmluQmFyKSB7XG4gICAgd2luZG93LkZpbkJhciA9IHJlcXVpcmUoJy4vJyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludC1lbnYgbm9kZSwgYnJvd3NlciAqL1xuXG52YXIgY3NzSW5qZWN0b3IgPSByZXF1aXJlKCdjc3MtaW5qZWN0b3InKTtcblxuLy8gRm9sbG93aW5nIGlzIHRoZSBzb2xlIHN0eWxlIHJlcXVpcmVtZW50IGZvciBiYXIgYW5kIHRodW1iIGVsZW1lbnRzLlxuLy8gTWFpbnRhaW5lZCBpbiBjb2RlIHNvIG5vdCBkZXBlbmRlbnQgYmVpbmcgaW4gc3R5bGVzaGVldC5cbnZhciBCQVJfU1RZTEUgPSAncG9zaXRpb246IGFic29sdXRlOyc7XG52YXIgVEhVTUJfU1RZTEUgPSAncG9zaXRpb246IGFic29sdXRlOyc7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yIEZpbkJhclxuICogQHN1bW1hcnkgQ3JlYXRlIGEgc2Nyb2xsYmFyIG9iamVjdC5cbiAqIEBkZXNjIENyZWF0aW5nIGEgc2Nyb2xsYmFyIGlzIGEgdGhyZWUtc3RlcCBwcm9jZXNzOlxuICpcbiAqIDEuIEluc3RhbnRpYXRlIHRoZSBzY3JvbGxiYXIgb2JqZWN0IGJ5IGNhbGxpbmcgdGhpcyBjb25zdHJ1Y3RvciBmdW5jdGlvbi4gVXBvbiBpbnN0YW50aWF0aW9uLCB0aGUgRE9NIGVsZW1lbnQgZm9yIHRoZSBzY3JvbGxiYXIgKHdpdGggYSBzaW5nbGUgY2hpbGQgZWxlbWVudCBmb3IgdGhlIHNjcm9sbGJhciBcInRodW1iXCIpIGlzIGNyZWF0ZWQgYnV0IGlzIG5vdCBpbnNlcnQgaXQgaW50byB0aGUgRE9NLlxuICogMi4gQWZ0ZXIgaW5zdGFudGlhdGlvbiwgaXQgaXMgdGhlIGNhbGxlcidzIHJlc3BvbnNpYmlsaXR5IHRvIGluc2VydCB0aGUgc2Nyb2xsYmFyLCB7QGxpbmsgRmluQmFyI2Jhcnx0aGlzLmJhcn0sIGludG8gdGhlIERPTS5cbiAqIDMuIEFmdGVyIGluc2VydGlvbiwgdGhlIGNhbGxlciBtdXN0IGNhbGwge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9IGF0IGxlYXN0IG9uY2UgdG8gc2l6ZSBhbmQgcG9zaXRpb24gdGhlIHNjcm9sbGJhciBhbmQgaXRzIHRodW1iLiBBZnRlciB0aGF0LCBgcmVzaXplKClgIHNob3VsZCBhbHNvIGJlIGNhbGxlZCByZXBlYXRlZGx5IG9uIHJlc2l6ZSBldmVudHMgKGFzIHRoZSBjb250ZW50IGVsZW1lbnQgaXMgYmVpbmcgcmVzaXplZCkuXG4gKlxuICogU3VnZ2VzdGVkIGNvbmZpZ3VyYXRpb25zOlxuICogKiBfKipVbmJvdW5kKipfPGJyLz5cbiAqIFRoZSBzY3JvbGxiYXIgc2VydmVzIG1lcmVseSBhcyBhIHNpbXBsZSByYW5nZSAoc2xpZGVyKSBjb250cm9sLiBPbWl0IGJvdGggYG9wdGlvbnMub25jaGFuZ2VgIGFuZCBgb3B0aW9ucy5jb250ZW50YC5cbiAqICogXyoqQm91bmQgdG8gdmlydHVhbCBjb250ZW50IGVsZW1lbnQqKl88YnIvPlxuICogVmlydHVhbCBjb250ZW50IGlzIHByb2plY3RlZCBpbnRvIHRoZSBlbGVtZW50IHVzaW5nIGEgY3VzdG9tIGV2ZW50IGhhbmRsZXIgc3VwcGxpZWQgYnkgdGhlIHByb2dyYW1tZXIgaW4gYG9wdGlvbnMub25jaGFuZ2VgLiBBIHR5cGljYWwgdXNlIGNhc2Ugd291bGQgYmUgdG8gaGFuZGxlIHNjcm9sbGluZyBvZiB0aGUgdmlydHVhbCBjb250ZW50LiBPdGhlciB1c2UgY2FzZXMgaW5jbHVkZSBkYXRhIHRyYW5zZm9ybWF0aW9ucywgZ3JhcGhpY3MgdHJhbnNmb3JtYXRpb25zLCBfZXRjLl9cbiAqICogXyoqQm91bmQgdG8gcmVhbCBjb250ZW50KipfPGJyLz5cbiAqIFNldCBgb3B0aW9ucy5jb250ZW50YCB0byB0aGUgXCJyZWFsXCIgY29udGVudCBlbGVtZW50IGJ1dCBvbWl0IGBvcHRpb25zLm9uY2hhbmdlYC4gVGhpcyB3aWxsIGNhdXNlIHRoZSBzY3JvbGxiYXIgdG8gdXNlIHRoZSBidWlsdC1pbiBldmVudCBoYW5kbGVyIChgdGhpcy5zY3JvbGxSZWFsQ29udGVudGApIHdoaWNoIGltcGxlbWVudHMgc21vb3RoIHNjcm9sbGluZyBvZiB0aGUgY29udGVudCBlbGVtZW50IHdpdGhpbiB0aGUgY29udGFpbmVyLlxuICpcbiAqIEBwYXJhbSB7ZmluYmFyT3B0aW9uc30gW29wdGlvbnM9e31dIC0gT3B0aW9ucyBvYmplY3QuIFNlZSB0aGUgdHlwZSBkZWZpbml0aW9uIGZvciBtZW1iZXIgZGV0YWlscy5cbiAqL1xuZnVuY3Rpb24gRmluQmFyKG9wdGlvbnMpIHtcblxuICAgIC8vIG1ha2UgYm91bmQgdmVyc2lvbnMgb2YgYWxsIHRoZSBtb3VzZSBldmVudCBoYW5kbGVyXG4gICAgdmFyIGJvdW5kID0gdGhpcy5fYm91bmQgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhoYW5kbGVyc1RvQmVCb3VuZCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGJvdW5kW2tleV0gPSBoYW5kbGVyc1RvQmVCb3VuZFtrZXldLmJpbmQodGhpcyk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSB0aHVtYlxuICAgICAqIEBzdW1tYXJ5IFRoZSBnZW5lcmF0ZWQgc2Nyb2xsYmFyIHRodW1iIGVsZW1lbnQuXG4gICAgICogQGRlc2MgVGhlIHRodW1iIGVsZW1lbnQncyBwYXJlbnQgZWxlbWVudCBpcyBhbHdheXMgdGhlIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIFRoaXMgcHJvcGVydHkgaXMgdHlwaWNhbGx5IHJlZmVyZW5jZWQgaW50ZXJuYWxseSBvbmx5LiBUaGUgc2l6ZSBhbmQgcG9zaXRpb24gb2YgdGhlIHRodW1iIGVsZW1lbnQgaXMgbWFpbnRhaW5lZCBieSBgX2NhbGNUaHVtYigpYC5cbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHZhciB0aHVtYiA9IHRoaXMudGh1bWIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aHVtYi5jbGFzc0xpc3QuYWRkKCd0aHVtYicpO1xuICAgIHRodW1iLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBUSFVNQl9TVFlMRSk7XG4gICAgdGh1bWIub25jbGljayA9IGJvdW5kLnNob3J0U3RvcDtcbiAgICB0aHVtYi5vbm1vdXNlb3ZlciA9IGJvdW5kLm9ubW91c2VvdmVyO1xuICAgIHRodW1iLm9ubW91c2VvdXQgPSB0aGlzLl9ib3VuZC5vbm1vdXNlb3V0O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgYmFyXG4gICAgICogQHN1bW1hcnkgVGhlIGdlbmVyYXRlZCBzY3JvbGxiYXIgZWxlbWVudC5cbiAgICAgKiBAZGVzYyBUaGUgY2FsbGVyIGluc2VydHMgdGhpcyBlbGVtZW50IGludG8gdGhlIERPTSAodHlwaWNhbGx5IGludG8gdGhlIGNvbnRlbnQgY29udGFpbmVyKSBhbmQgdGhlbiBjYWxscyBpdHMge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9IG1ldGhvZC5cbiAgICAgKlxuICAgICAqIFRodXMgdGhlIG5vZGUgdHJlZSBpcyB0eXBpY2FsbHk6XG4gICAgICogKiBBICoqY29udGVudCBjb250YWluZXIqKiBlbGVtZW50LCB3aGljaCBjb250YWluczpcbiAgICAgKiAgICogVGhlIGNvbnRlbnQgZWxlbWVudChzKVxuICAgICAqICAgKiBUaGlzICoqc2Nyb2xsYmFyIGVsZW1lbnQqKiwgd2hpY2ggaW4gdHVybiBjb250YWluczpcbiAgICAgKiAgICAgKiBUaGUgKip0aHVtYiBlbGVtZW50KipcbiAgICAgKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgdmFyIGJhciA9IHRoaXMuYmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgIGJhci5jbGFzc0xpc3QuYWRkKCdmaW5iYXItdmVydGljYWwnKTtcbiAgICBiYXIuc2V0QXR0cmlidXRlKCdzdHlsZScsIEJBUl9TVFlMRSk7XG4gICAgYmFyLm9ubW91c2Vkb3duID0gdGhpcy5fYm91bmQub25tb3VzZWRvd247XG4gICAgaWYgKHRoaXMucGFnaW5nKSB7IGJhci5vbmNsaWNrID0gYm91bmQub25jbGljazsgfVxuICAgIGJhci5hcHBlbmRDaGlsZCh0aHVtYik7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIC8vIHByZXNldHNcbiAgICB0aGlzLm9yaWVudGF0aW9uID0gJ3ZlcnRpY2FsJztcbiAgICB0aGlzLl9taW4gPSB0aGlzLl9pbmRleCA9IDA7XG4gICAgdGhpcy5fbWF4ID0gMTAwO1xuXG4gICAgLyoqXG4gICAgICogV2hlZWwgbWV0cmljIG5vcm1hbGl6YXRpb24sIGFwcGxpZWQgZXF1YWxseSB0byBhbGwgdGhyZWUgYXhlcy5cbiAgICAgKlxuICAgICAqIFRoaXMgdmFsdWUgaXMgb3ZlcnJpZGRlbiB3aXRoIGEgcGxhdGZvcm0tIGFuZCBicm93c2VyLXNwZWNpZmljIHdoZWVsIGZhY3RvciB3aGVuIGF2YWlsYWJsZSBpbiB7QGxpbmsgRmluQmFyLm5vcm1hbHN9LlxuICAgICAqXG4gICAgICogVG8gc3VwcHJlc3MsIGRlbGV0ZSBgRmluQmFyLm5vcm1hbHNgIGJlZm9yZSBpbnN0YW50aWF0aW9uIG9yIG92ZXJyaWRlIHRoaXMgaW5zdGFuY2UgdmFyaWFibGUgKHdpdGggYDEuMGApIGFmdGVyIGluc3RhbnRpYXRpb24uXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHRoaXMubm9ybWFsID0gZ2V0Tm9ybWFsKCkgfHwgMS4wO1xuXG4gICAgLy8gb3B0aW9uc1xuICAgIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgb3B0aW9uID0gb3B0aW9uc1trZXldO1xuICAgICAgICBpZiAob3B0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdpbmRleCc6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3JhbmdlJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRSYW5nZShvcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9taW4gPSBvcHRpb24ubWluO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXggPSBvcHRpb24ubWF4O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRTaXplID0gb3B0aW9uLm1heCAtIG9wdGlvbi5taW4gKyAxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleS5jaGFyQXQoMCkgIT09ICdfJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIEZpbkJhci5wcm90b3R5cGVba2V5XSAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG92ZXJyaWRlIHByb3RvdHlwZSBkZWZhdWx0cyBmb3Igc3RhbmRhcmQgO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXh0ZW5kIHdpdGggYWRkaXRpb25hbCBwcm9wZXJ0aWVzIChmb3IgdXNlIGluIG9uY2hhbmdlIGV2ZW50IGhhbmRsZXJzKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXldID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIGNzc0luamVjdG9yKGNzc0ZpbkJhcnMsICdmaW5iYXItYmFzZScsIG9wdGlvbnMuY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQpO1xufVxuXG5GaW5CYXIucHJvdG90eXBlID0ge1xuXG4gICAgY29uc3RydWN0b3I6IEZpbkJhciwgICAgLyoqXG4gICAgICogQHN1bW1hcnkgVGhlIHNjcm9sbGJhciBvcmllbnRhdGlvbi5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yIHRvIGVpdGhlciBgJ3ZlcnRpY2FsJ2Agb3IgYCdob3Jpem9udGFsJ2AuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogVXNlZnVsIHZhbHVlcyBhcmUgYCd2ZXJ0aWNhbCdgICh0aGUgZGVmYXVsdCkgb3IgYCdob3Jpem9udGFsJ2AuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgcmVzZXRzIGB0aGlzLm9oYCBhbmQgYHRoaXMuZGVsdGFQcm9wYCBhbmQgY2hhbmdlcyB0aGUgY2xhc3MgbmFtZXMgc28gYXMgdG8gcmVwb3NpdGlvbiB0aGUgc2Nyb2xsYmFyIGFzIHBlciB0aGUgQ1NTIHJ1bGVzIGZvciB0aGUgbmV3IG9yaWVudGF0aW9uLlxuICAgICAqIEBkZWZhdWx0ICd2ZXJ0aWNhbCdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgc2V0IG9yaWVudGF0aW9uKG9yaWVudGF0aW9uKSB7XG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gdGhpcy5fb3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX29yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZWFkb25seVxuICAgICAgICAgKiBAbmFtZSBvaFxuICAgICAgICAgKiBAc3VtbWFyeSA8dT5PPC91PnJpZW50YXRpb24gPHU+aDwvdT5hc2ggZm9yIHRoaXMgc2Nyb2xsYmFyLlxuICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGBvcmllbnRhdGlvbmAgc2V0dGVyIHRvIGVpdGhlciB0aGUgdmVydGljYWwgb3IgdGhlIGhvcml6b250YWwgb3JpZW50YXRpb24gaGFzaC4gVGhlIHByb3BlcnR5IHNob3VsZCBhbHdheXMgYmUgc3luY2hyb25pemVkIHdpdGggYG9yaWVudGF0aW9uYDsgZG8gbm90IHVwZGF0ZSBkaXJlY3RseSFcbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZCBpbnRlcm5hbGx5IHRvIGFjY2VzcyBzY3JvbGxiYXJzJyBET00gZWxlbWVudCBwcm9wZXJ0aWVzIGluIGEgZ2VuZXJhbGl6ZWQgd2F5IHdpdGhvdXQgbmVlZGluZyB0byBjb25zdGFudGx5IHF1ZXJ5IHRoZSBzY3JvbGxiYXIgb3JpZW50YXRpb24uIEZvciBleGFtcGxlLCBpbnN0ZWFkIG9mIGV4cGxpY2l0bHkgY29kaW5nIGB0aGlzLmJhci50b3BgIGZvciBhIHZlcnRpY2FsIHNjcm9sbGJhciBhbmQgYHRoaXMuYmFyLmxlZnRgIGZvciBhIGhvcml6b250YWwgc2Nyb2xsYmFyLCBzaW1wbHkgY29kZSBgdGhpcy5iYXJbdGhpcy5vaC5sZWFkaW5nXWAgaW5zdGVhZC4gU2VlIHRoZSB7QGxpbmsgb3JpZW50YXRpb25IYXNoVHlwZX0gZGVmaW5pdGlvbiBmb3IgZGV0YWlscy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZnVsIGV4dGVybmFsbHkgZm9yIGNvZGluZyBnZW5lcmFsaXplZCB7QGxpbmsgZmluYmFyT25DaGFuZ2V9IGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25zIHRoYXQgc2VydmUgYm90aCBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBzY3JvbGxiYXJzLlxuICAgICAgICAgKiBAdHlwZSB7b3JpZW50YXRpb25IYXNoVHlwZX1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub2ggPSBvcmllbnRhdGlvbkhhc2hlc1t0aGlzLl9vcmllbnRhdGlvbl07XG5cbiAgICAgICAgaWYgKCF0aGlzLm9oKSB7XG4gICAgICAgICAgICBlcnJvcignSW52YWxpZCB2YWx1ZSBmb3IgYG9wdGlvbnMuX29yaWVudGF0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIGRlbHRhUHJvcFxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgbmFtZSBvZiB0aGUgYFdoZWVsRXZlbnRgIHByb3BlcnR5IHRoaXMgc2Nyb2xsYmFyIHNob3VsZCBsaXN0ZW4gdG8uXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBVc2VmdWwgdmFsdWVzIGFyZSBgJ2RlbHRhWCdgLCBgJ2RlbHRhWSdgLCBvciBgJ2RlbHRhWidgLiBBIHZhbHVlIG9mIGBudWxsYCBtZWFucyB0byBpZ25vcmUgbW91c2Ugd2hlZWwgZXZlbnRzIGVudGlyZWx5LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGUgbW91c2Ugd2hlZWwgaXMgb25lLWRpbWVuc2lvbmFsIGFuZCBvbmx5IGVtaXRzIGV2ZW50cyB3aXRoIGBkZWx0YVlgIGRhdGEuIFRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgc28gdGhhdCB5b3UgY2FuIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9mIGAnZGVsdGFYJ2Agd2l0aCBhIHZhbHVlIG9mIGAnZGVsdGFZJ2Agb24geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBwcmltYXJpbHkgdG8gYWNjb21tb2RhdGUgY2VydGFpbiBcInBhbm9yYW1pY1wiIGludGVyZmFjZSBkZXNpZ25zIHdoZXJlIHRoZSBtb3VzZSB3aGVlbCBzaG91bGQgY29udHJvbCBob3Jpem9udGFsIHJhdGhlciB0aGFuIHZlcnRpY2FsIHNjcm9sbGluZy4gSnVzdCBnaXZlIGB7IGRlbHRhUHJvcDogJ2RlbHRhWScgfWAgaW4geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBpbnN0YW50aWF0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBDYXZlYXQ6IE5vdGUgdGhhdCBhIDItZmluZ2VyIGRyYWcgb24gYW4gQXBwbGUgdHJhY2twYWQgZW1pdHMgZXZlbnRzIHdpdGggX2JvdGhfIGBkZWx0YVggYCBhbmQgYGRlbHRhWWAgZGF0YSBzbyB5b3UgbWlnaHQgd2FudCB0byBkZWxheSBtYWtpbmcgdGhlIGFib3ZlIGFkanVzdG1lbnQgdW50aWwgeW91IGNhbiBkZXRlcm1pbmUgdGhhdCB5b3UgYXJlIGdldHRpbmcgWSBkYXRhIG9ubHkgd2l0aCBubyBYIGRhdGEgYXQgYWxsICh3aGljaCBpcyBhIHN1cmUgYmV0IHlvdSBvbiBhIG1vdXNlIHdoZWVsIHJhdGhlciB0aGFuIGEgdHJhY2twYWQpLlxuXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsdGFQcm9wID0gdGhpcy5vaC5kZWx0YTtcblxuICAgICAgICB0aGlzLmJhci5jbGFzc05hbWUgPSB0aGlzLmJhci5jbGFzc05hbWUucmVwbGFjZSgvKHZlcnRpY2FsfGhvcml6b250YWwpL2csIG9yaWVudGF0aW9uKTtcblxuICAgICAgICBpZiAodGhpcy5iYXIuc3R5bGUuY3NzVGV4dCAhPT0gQkFSX1NUWUxFIHx8IHRoaXMudGh1bWIuc3R5bGUuY3NzVGV4dCAhPT0gVEhVTUJfU1RZTEUpIHtcbiAgICAgICAgICAgIHRoaXMuYmFyLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBCQVJfU1RZTEUpO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgVEhVTUJfU1RZTEUpO1xuICAgICAgICAgICAgdGhpcy5yZXNpemUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0IG9yaWVudGF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JpZW50YXRpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IENhbGxiYWNrIGZvciBzY3JvbGwgZXZlbnRzLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IgdmlhIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuIEFmdGVyIGluc3RhbnRpYXRpb24sIGB0aGlzLm9uY2hhbmdlYCBtYXkgYmUgdXBkYXRlZCBkaXJlY3RseS5cbiAgICAgKlxuICAgICAqIFRoaXMgZXZlbnQgaGFuZGxlciBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgaXMgY2hhbmdlZCB0aHJvdWdoIHVzZXIgaW50ZXJhY3Rpb24uIFRoZSB0eXBpY2FsIHVzZSBjYXNlIGlzIHdoZW4gdGhlIGNvbnRlbnQgaXMgc2Nyb2xsZWQuIEl0IGlzIGNhbGxlZCB3aXRoIHRoZSBgRmluQmFyYCBvYmplY3QgYXMgaXRzIGNvbnRleHQgYW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgKGl0cyBpbmRleCwgcm91bmRlZCkgYXMgdGhlIG9ubHkgcGFyYW1ldGVyLlxuICAgICAqXG4gICAgICogU2V0IHRoaXMgcHJvcGVydHkgdG8gYG51bGxgIHRvIHN0b3AgZW1pdHRpbmcgc3VjaCBldmVudHMuXG4gICAgICogQHR5cGUge2Z1bmN0aW9uKG51bWJlcil8bnVsbH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG9uY2hhbmdlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgQWRkIGEgQ1NTIGNsYXNzIG5hbWUgdG8gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdC5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yLiBTZWUgdGhlIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0eSBpbiB0aGUge0BsaW5rIGZpbmJhck9wdGlvbnN9IG9iamVjdC5cbiAgICAgKlxuICAgICAqIFRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3Qgd2lsbCBhbHdheXMgaW5jbHVkZSBgZmluYmFyLXZlcnRpY2FsYCAob3IgYGZpbmJhci1ob3Jpem9udGFsYCBiYXNlZCBvbiB0aGUgY3VycmVudCBvcmllbnRhdGlvbikuIFdoZW5ldmVyIHRoaXMgcHJvcGVydHkgaXMgc2V0IHRvIHNvbWUgdmFsdWUsIGZpcnN0IHRoZSBvbGQgcHJlZml4K29yaWVudGF0aW9uIGlzIHJlbW92ZWQgZnJvbSB0aGUgYmFyIGVsZW1lbnQncyBjbGFzcyBsaXN0OyB0aGVuIHRoZSBuZXcgcHJlZml4K29yaWVudGF0aW9uIGlzIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoaXMgcHJvcGVydHkgY2F1c2VzIF9hbiBhZGRpdGlvbmFsXyBjbGFzcyBuYW1lIHRvIGJlIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoZXJlZm9yZSwgdGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgYWRkIGF0IG1vc3Qgb25lIGFkZGl0aW9uYWwgY2xhc3MgbmFtZSB0byB0aGUgbGlzdC5cbiAgICAgKlxuICAgICAqIFRvIHJlbW92ZSBfY2xhc3NuYW1lLW9yaWVudGF0aW9uXyBmcm9tIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QsIHNldCB0aGlzIHByb3BlcnR5IHRvIGEgZmFsc3kgdmFsdWUsIHN1Y2ggYXMgYG51bGxgLlxuICAgICAqXG4gICAgICogPiBOT1RFOiBZb3Ugb25seSBuZWVkIHRvIHNwZWNpZnkgYW4gYWRkaXRpb25hbCBjbGFzcyBuYW1lIHdoZW4geW91IG5lZWQgdG8gaGF2ZSBtdWxsdGlwbGUgZGlmZmVyZW50IHN0eWxlcyBvZiBzY3JvbGxiYXJzIG9uIHRoZSBzYW1lIHBhZ2UuIElmIHRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQsIHRoZW4geW91IGRvbid0IG5lZWQgdG8gbWFrZSBhIG5ldyBjbGFzczsgeW91IHdvdWxkIGp1c3QgY3JlYXRlIHNvbWUgYWRkaXRpb25hbCBydWxlcyB1c2luZyB0aGUgc2FtZSBzZWxlY3RvcnMgaW4gdGhlIGJ1aWx0LWluIHN0eWxlc2hlZXQgKC4uL2Nzcy9maW5iYXJzLmNzcyk6XG4gICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsYCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbGApIGZvciB0aGUgc2Nyb2xsYmFyXG4gICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsID4gZGl2YCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbCA+IGRpdmApIGZvciB0aGUgXCJ0aHVtYi5cIlxuICAgICAqXG4gICAgICogT2YgY291cnNlLCB5b3VyIHJ1bGVzIHNob3VsZCBjb21lIGFmdGVyIHRoZSBidWlsdC1pbnMuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCBjbGFzc1ByZWZpeChwcmVmaXgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NsYXNzUHJlZml4KSB7XG4gICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuX2NsYXNzUHJlZml4ICsgdGhpcy5vcmllbnRhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jbGFzc1ByZWZpeCA9IHByZWZpeDtcblxuICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QuYWRkKHByZWZpeCArICctJyArIHRoaXMub3JpZW50YXRpb24pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXQgY2xhc3NQcmVmaXgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbGFzc1ByZWZpeDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgaW5jcmVtZW50XG4gICAgICogQHN1bW1hcnkgTnVtYmVyIG9mIHNjcm9sbGJhciBpbmRleCB1bml0cyByZXByZXNlbnRpbmcgYSBwYWdlZnVsLiBVc2VkIGV4Y2x1c2l2ZWx5IGZvciBwYWdpbmcgdXAgYW5kIGRvd24gYW5kIGZvciBzZXR0aW5nIHRodW1iIHNpemUgcmVsYXRpdmUgdG8gY29udGVudCBzaXplLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogQ2FuIGFsc28gYmUgZ2l2ZW4gYXMgYSBwYXJhbWV0ZXIgdG8gdGhlIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZX0gbWV0aG9kLCB3aGljaCBpcyBwZXJ0aW5lbnQgYmVjYXVzZSBjb250ZW50IGFyZWEgc2l6ZSBjaGFuZ2VzIGFmZmVjdCB0aGUgZGVmaW5pdGlvbiBvZiBhIFwicGFnZWZ1bC5cIiBIb3dldmVyLCB5b3Ugb25seSBuZWVkIHRvIGRvIHRoaXMgaWYgdGhpcyB2YWx1ZSBpcyBiZWluZyB1c2VkLiBJdCBub3QgdXNlZCB3aGVuOlxuICAgICAqICogeW91IGRlZmluZSBgcGFnaW5nLnVwYCBhbmQgYHBhZ2luZy5kb3duYFxuICAgICAqICogeW91ciBzY3JvbGxiYXIgaXMgdXNpbmcgYHNjcm9sbFJlYWxDb250ZW50YFxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBpbmNyZW1lbnQ6IDEsXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IHZhbHVlIG9mIG11bHRpcGxpZXIgZm9yIGBXaGVlbEV2ZW50I2RlbHRhWGAgKGhvcml6b250YWwgc2Nyb2xsaW5nIGRlbHRhKS5cbiAgICAgKiBAZGVmYXVsdFxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgZGVsdGFYRmFjdG9yOiAxLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCB2YWx1ZSBvZiBtdWx0aXBsaWVyIGZvciBgV2hlZWxFdmVudCNkZWx0YVlgICh2ZXJ0aWNhbCBzY3JvbGxpbmcgZGVsdGEpLlxuICAgICAqIEBkZWZhdWx0XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBkZWx0YVlGYWN0b3I6IDEsXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IHZhbHVlIG9mIG11bHRpcGxpZXIgZm9yIGBXaGVlbEV2ZW50I2RlbHRhWmAgKGRlbHB0aCBzY3JvbGxpbmcgZGVsdGEpLlxuICAgICAqIEBkZWZhdWx0XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBkZWx0YVpGYWN0b3I6IDEsXG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBiYXJTdHlsZXNcbiAgICAgKiBAc3VtbWFyeSBTY3JvbGxiYXIgc3R5bGVzIHRvIGJlIGFwcGxpZWQgYnkge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9LlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBhIHZhbHVlIHRvIGJlIGFzc2lnbmVkIHRvIHtAbGluayBGaW5CYXIjc3R5bGVzfHN0eWxlc30gb24gZWFjaCBjYWxsIHRvIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfS4gVGhhdCBpcywgYSBoYXNoIG9mIHZhbHVlcyB0byBiZSBjb3BpZWQgdG8gdGhlIHNjcm9sbGJhciBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IG9uIHJlc2l6ZTsgb3IgYG51bGxgIGZvciBub25lLlxuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3N0eWxlfHN0eWxlfVxuICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN8bnVsbH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGJhclN0eWxlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHN0eWxlXG4gICAgICogQHN1bW1hcnkgQWRkaXRpb25hbCBzY3JvbGxiYXIgc3R5bGVzLlxuICAgICAqIEBkZXNjIFNlZSB0eXBlIGRlZmluaXRpb24gZm9yIG1vcmUgZGV0YWlscy4gVGhlc2Ugc3R5bGVzIGFyZSBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSBzY3JvbGxiYXIncyBgYmFyYCBlbGVtZW50LlxuICAgICAqXG4gICAgICogVmFsdWVzIGFyZSBhZGp1c3RlZCBhcyBmb2xsb3dzIGJlZm9yZSBiZWluZyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50OlxuICAgICAqIDEuIEluY2x1ZGVkIFwicHNldWRvLXByb3BlcnR5XCIgbmFtZXMgZnJvbSB0aGUgc2Nyb2xsYmFyJ3Mgb3JpZW50YXRpb24gaGFzaCwge0BsaW5rIEZpbkJhciNvaHxvaH0sIGFyZSB0cmFuc2xhdGVkIHRvIGFjdHVhbCBwcm9wZXJ0eSBuYW1lcyBiZWZvcmUgYmVpbmcgYXBwbGllZC5cbiAgICAgKiAyLiBXaGVuIHRoZXJlIGFyZSBtYXJnaW5zLCBwZXJjZW50YWdlcyBhcmUgdHJhbnNsYXRlZCB0byBhYnNvbHV0ZSBwaXhlbCB2YWx1ZXMgYmVjYXVzZSBDU1MgaWdub3JlcyBtYXJnaW5zIGluIGl0cyBwZXJjZW50YWdlIGNhbGN1bGF0aW9ucy5cbiAgICAgKiAzLiBJZiB5b3UgZ2l2ZSBhIHZhbHVlIHdpdGhvdXQgYSB1bml0IChhIHJhdyBudW1iZXIpLCBcInB4XCIgdW5pdCBpcyBhcHBlbmRlZC5cbiAgICAgKlxuICAgICAqIEdlbmVyYWwgbm90ZXM6XG4gICAgICogMS4gSXQgaXMgYWx3YXlzIHByZWZlcmFibGUgdG8gc3BlY2lmeSBzdHlsZXMgdmlhIGEgc3R5bGVzaGVldC4gT25seSBzZXQgdGhpcyBwcm9wZXJ0eSB3aGVuIHlvdSBuZWVkIHRvIHNwZWNpZmljYWxseSBvdmVycmlkZSAoYSkgc3R5bGVzaGVldCB2YWx1ZShzKS5cbiAgICAgKiAyLiBDYW4gYmUgc2V0IGRpcmVjdGx5IG9yIHZpYSBjYWxscyB0byB0aGUge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplfSBtZXRob2QuXG4gICAgICogMy4gU2hvdWxkIG9ubHkgYmUgc2V0IGFmdGVyIHRoZSBzY3JvbGxiYXIgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIDQuIEJlZm9yZSBhcHBseWluZyB0aGVzZSBuZXcgdmFsdWVzIHRvIHRoZSBlbGVtZW50LCBfYWxsXyBpbi1saW5lIHN0eWxlIHZhbHVlcyBhcmUgcmVzZXQgKGJ5IHJlbW92aW5nIHRoZSBlbGVtZW50J3MgYHN0eWxlYCBhdHRyaWJ1dGUpLCBleHBvc2luZyBpbmhlcml0ZWQgdmFsdWVzIChmcm9tIHN0eWxlc2hlZXRzKS5cbiAgICAgKiA1LiBFbXB0eSBvYmplY3QgaGFzIG5vIGVmZmVjdC5cbiAgICAgKiA2LiBGYWxzZXkgdmFsdWUgaW4gcGxhY2Ugb2Ygb2JqZWN0IGhhcyBubyBlZmZlY3QuXG4gICAgICpcbiAgICAgKiA+IENBVkVBVDogRG8gbm90IGF0dGVtcHQgdG8gdHJlYXQgdGhlIG9iamVjdCB5b3UgYXNzaWduIHRvIHRoaXMgcHJvcGVydHkgYXMgaWYgaXQgd2VyZSBgdGhpcy5iYXIuc3R5bGVgLiBTcGVjaWZpY2FsbHksIGNoYW5naW5nIHRoaXMgb2JqZWN0IGFmdGVyIGFzc2lnbmluZyBpdCB3aWxsIGhhdmUgbm8gZWZmZWN0IG9uIHRoZSBzY3JvbGxiYXIuIFlvdSBtdXN0IGFzc2lnbiBpdCBhZ2FpbiBpZiB5b3Ugd2FudCBpdCB0byBoYXZlIGFuIGVmZmVjdC5cbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNiYXJTdHlsZXN8YmFyU3R5bGVzfVxuICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBzZXQgc3R5bGUoc3R5bGVzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3R5bGVzID0gZXh0ZW5kKHt9LCBzdHlsZXMsIHRoaXMuX2F1eFN0eWxlcykpO1xuXG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIGJhciA9IHRoaXMuYmFyLFxuICAgICAgICAgICAgICAgIGJhclJlY3QgPSBiYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyID0gdGhpcy5jb250YWluZXIgfHwgYmFyLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgICAgICBvaCA9IHRoaXMub2g7XG5cbiAgICAgICAgICAgIC8vIEJlZm9yZSBhcHBseWluZyBuZXcgc3R5bGVzLCByZXZlcnQgYWxsIHN0eWxlcyB0byB2YWx1ZXMgaW5oZXJpdGVkIGZyb20gc3R5bGVzaGVldHNcbiAgICAgICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgQkFSX1NUWUxFKTtcblxuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gc3R5bGVzW2tleV07XG5cbiAgICAgICAgICAgICAgICBpZiAoa2V5IGluIG9oKSB7XG4gICAgICAgICAgICAgICAgICAgIGtleSA9IG9oW2tleV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihOdW1iZXIodmFsKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gKHZhbCB8fCAwKSArICdweCc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgvJSQvLnRlc3QodmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIGJhciBzaXplIGdpdmVuIGFzIHBlcmNlbnRhZ2Ugb2YgY29udGFpbmVyLCBpZiBiYXIgaGFzIG1hcmdpbnMsIHJlc3RhdGUgc2l6ZSBpbiBwaXhlbHMgbGVzcyBtYXJnaW5zLlxuICAgICAgICAgICAgICAgICAgICAvLyAoSWYgbGVmdCBhcyBwZXJjZW50YWdlLCBDU1MncyBjYWxjdWxhdGlvbiB3aWxsIG5vdCBleGNsdWRlIG1hcmdpbnMuKVxuICAgICAgICAgICAgICAgICAgICB2YXIgb3JpZW50ZWQgPSBheGlzW2tleV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5zID0gYmFyUmVjdFtvcmllbnRlZC5tYXJnaW5MZWFkaW5nXSArIGJhclJlY3Rbb3JpZW50ZWQubWFyZ2luVHJhaWxpbmddO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWFyZ2lucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gcGFyc2VJbnQodmFsLCAxMCkgLyAxMDAgKiBjb250YWluZXJSZWN0W29yaWVudGVkLnNpemVdIC0gbWFyZ2lucyArICdweCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBiYXIuc3R5bGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEByZWFkb25seVxuICAgICAqIEBuYW1lIHBhZ2luZ1xuICAgICAqIEBzdW1tYXJ5IEVuYWJsZSBwYWdlIHVwL2RuIGNsaWNrcy5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yLiBTZWUgdGhlIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0eSBpbiB0aGUge0BsaW5rIGZpbmJhck9wdGlvbnN9IG9iamVjdC5cbiAgICAgKlxuICAgICAqIElmIHRydXRoeSwgbGlzdGVuIGZvciBjbGlja3MgaW4gcGFnZS11cCBhbmQgcGFnZS1kb3duIHJlZ2lvbnMgb2Ygc2Nyb2xsYmFyLlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0LCBjYWxsIGAucGFnaW5nLnVwKClgIG9uIHBhZ2UtdXAgY2xpY2tzIGFuZCBgLnBhZ2luZy5kb3duKClgIHdpbGwgYmUgY2FsbGVkIG9uIHBhZ2UtZG93biBjbGlja3MuXG4gICAgICpcbiAgICAgKiBDaGFuZ2luZyB0aGUgdHJ1dGhpbmVzcyBvZiB0aGlzIHZhbHVlIGFmdGVyIGluc3RhbnRpYXRpb24gY3VycmVudGx5IGhhcyBubyBlZmZlY3QuXG4gICAgICogQHR5cGUge2Jvb2xlYW58b2JqZWN0fVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgcGFnaW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgcmFuZ2VcbiAgICAgKiBAc3VtbWFyeSBTZXR0ZXIgZm9yIHRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIHNjcm9sbCB2YWx1ZXMuXG4gICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gVGhlc2UgdmFsdWVzIGFyZSB0aGUgbGltaXRzIGZvciB7QGxpbmsgRm9vQmFyI2luZGV4fGluZGV4fS5cbiAgICAgKlxuICAgICAqIFRoZSBzZXR0ZXIgYWNjZXB0cyBhbiBvYmplY3Qgd2l0aCBleGFjdGx5IHR3byBudW1lcmljIHByb3BlcnRpZXM6IGAubWluYCB3aGljaCBtdXN0IGJlIGxlc3MgdGhhbiBgLm1heGAuIFRoZSB2YWx1ZXMgYXJlIGV4dHJhY3RlZCBhbmQgdGhlIG9iamVjdCBpcyBkaXNjYXJkZWQuXG4gICAgICpcbiAgICAgKiBUaGUgZ2V0dGVyIHJldHVybnMgYSBuZXcgb2JqZWN0IHdpdGggYC5taW5gIGFuZCAnLm1heGAuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7cmFuZ2VUeXBlfVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgc2V0IHJhbmdlKHJhbmdlKSB7XG4gICAgICAgIHZhbGlkUmFuZ2UocmFuZ2UpO1xuICAgICAgICB0aGlzLl9taW4gPSByYW5nZS5taW47XG4gICAgICAgIHRoaXMuX21heCA9IHJhbmdlLm1heDtcbiAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IHJhbmdlLm1heCAtIHJhbmdlLm1pbiArIDE7XG4gICAgICAgIHRoaXMuaW5kZXggPSB0aGlzLmluZGV4OyAvLyByZS1jbGFtcFxuICAgIH0sXG4gICAgZ2V0IHJhbmdlKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbWluOiB0aGlzLl9taW4sXG4gICAgICAgICAgICBtYXg6IHRoaXMuX21heFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBJbmRleCB2YWx1ZSBvZiB0aGUgc2Nyb2xsYmFyLlxuICAgICAqIEBkZXNjIFRoaXMgaXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzY3JvbGwgdGh1bWIuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgdmFsdWUgY2xhbXBzIGl0IHRvIHtAbGluayBGaW5CYXIjbWlufG1pbn0uLntAbGluayBGaW5CYXIjbWF4fG1heH0sIHNjcm9sbCB0aGUgY29udGVudCwgYW5kIG1vdmVzIHRodW1iLlxuICAgICAqXG4gICAgICogR2V0dGluZyB0aGlzIHZhbHVlIHJldHVybnMgdGhlIGN1cnJlbnQgaW5kZXguIFRoZSByZXR1cm5lZCB2YWx1ZSB3aWxsIGJlIGluIHRoZSByYW5nZSBgbWluYC4uYG1heGAuIEl0IGlzIGludGVudGlvbmFsbHkgbm90IHJvdW5kZWQuXG4gICAgICpcbiAgICAgKiBVc2UgdGhpcyB2YWx1ZSBhcyBhbiBhbHRlcm5hdGl2ZSB0byAob3IgaW4gYWRkaXRpb24gdG8pIHVzaW5nIHRoZSB7QGxpbmsgRmluQmFyI29uY2hhbmdlfG9uY2hhbmdlfSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNfc2V0U2Nyb2xsfF9zZXRTY3JvbGx9XG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCBpbmRleChpZHgpIHtcbiAgICAgICAgaWR4ID0gTWF0aC5taW4odGhpcy5fbWF4LCBNYXRoLm1heCh0aGlzLl9taW4sIGlkeCkpOyAvLyBjbGFtcCBpdFxuICAgICAgICB0aGlzLl9zZXRTY3JvbGwoaWR4KTtcbiAgICAgICAgLy8gdGhpcy5fc2V0VGh1bWJTaXplKCk7XG4gICAgfSxcbiAgICBnZXQgaW5kZXgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3VtbWFyeSBNb3ZlIHRoZSB0aHVtYi5cbiAgICAgKiBAZGVzYyBBbHNvIGRpc3BsYXlzIHRoZSBpbmRleCB2YWx1ZSBpbiB0aGUgdGVzdCBwYW5lbCBhbmQgaW52b2tlcyB0aGUgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIGlkeCAtIFRoZSBuZXcgc2Nyb2xsIGluZGV4LCBhIHZhbHVlIGluIHRoZSByYW5nZSBgbWluYC4uYG1heGAuXG4gICAgICogQHBhcmFtIFtzY2FsZWQ9ZihpZHgpXSAtIFRoZSBuZXcgdGh1bWIgcG9zaXRpb24gaW4gcGl4ZWxzIGFuZCBzY2FsZWQgcmVsYXRpdmUgdG8gdGhlIGNvbnRhaW5pbmcge0BsaW5rIEZpbkJhciNiYXJ8YmFyfSBlbGVtZW50LCBpLmUuLCBhIHByb3BvcnRpb25hbCBudW1iZXIgaW4gdGhlIHJhbmdlIGAwYC4uYHRodW1iTWF4YC4gV2hlbiBvbWl0dGVkLCBhIGZ1bmN0aW9uIG9mIGBpZHhgIGlzIHVzZWQuXG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBfc2V0U2Nyb2xsOiBmdW5jdGlvbiAoaWR4LCBzY2FsZWQpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpZHg7XG5cbiAgICAgICAgLy8gRGlzcGxheSB0aGUgaW5kZXggdmFsdWUgaW4gdGhlIHRlc3QgcGFuZWxcbiAgICAgICAgaWYgKHRoaXMudGVzdFBhbmVsSXRlbSAmJiB0aGlzLnRlc3RQYW5lbEl0ZW0uaW5kZXggaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnRlc3RQYW5lbEl0ZW0uaW5kZXguaW5uZXJIVE1MID0gTWF0aC5yb3VuZChpZHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgY2FsbGJhY2tcbiAgICAgICAgaWYgKHRoaXMub25jaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMub25jaGFuZ2UuY2FsbCh0aGlzLCBNYXRoLnJvdW5kKGlkeCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTW92ZSB0aGUgdGh1bWJcbiAgICAgICAgaWYgKHNjYWxlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzY2FsZWQgPSAoaWR4IC0gdGhpcy5fbWluKSAvICh0aGlzLl9tYXggLSB0aGlzLl9taW4pICogdGhpcy5fdGh1bWJNYXg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50aHVtYi5zdHlsZVt0aGlzLm9oLmxlYWRpbmddID0gc2NhbGVkICsgJ3B4JztcbiAgICB9LFxuXG4gICAgc2Nyb2xsUmVhbENvbnRlbnQ6IGZ1bmN0aW9uIChpZHgpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lclJlY3QgPSB0aGlzLmNvbnRlbnQucGFyZW50RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgIHNpemVQcm9wID0gdGhpcy5vaC5zaXplLFxuICAgICAgICAgICAgbWF4U2Nyb2xsID0gTWF0aC5tYXgoMCwgdGhpcy5jb250ZW50W3NpemVQcm9wXSAtIGNvbnRhaW5lclJlY3Rbc2l6ZVByb3BdKSxcbiAgICAgICAgICAgIC8vc2Nyb2xsID0gTWF0aC5taW4oaWR4LCBtYXhTY3JvbGwpO1xuICAgICAgICAgICAgc2Nyb2xsID0gKGlkeCAtIHRoaXMuX21pbikgLyAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSAqIG1heFNjcm9sbDtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnc2Nyb2xsOiAnICsgc2Nyb2xsKTtcbiAgICAgICAgdGhpcy5jb250ZW50LnN0eWxlW3RoaXMub2gubGVhZGluZ10gPSAtc2Nyb2xsICsgJ3B4JztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgUmVjYWxjdWxhdGUgdGh1bWIgcG9zaXRpb24uXG4gICAgICpcbiAgICAgKiBAZGVzYyBUaGlzIG1ldGhvZCByZWNhbGN1bGF0ZXMgdGhlIHRodW1iIHNpemUgYW5kIHBvc2l0aW9uLiBDYWxsIGl0IG9uY2UgYWZ0ZXIgaW5zZXJ0aW5nIHlvdXIgc2Nyb2xsYmFyIGludG8gdGhlIERPTSwgYW5kIHJlcGVhdGVkbHkgd2hpbGUgcmVzaXppbmcgdGhlIHNjcm9sbGJhciAod2hpY2ggdHlwaWNhbGx5IGhhcHBlbnMgd2hlbiB0aGUgc2Nyb2xsYmFyJ3MgcGFyZW50IGlzIHJlc2l6ZWQgYnkgdXNlci5cbiAgICAgKlxuICAgICAqID4gVGhpcyBmdW5jdGlvbiBzaGlmdHMgYXJncyBpZiBmaXJzdCBhcmcgb21pdHRlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbaW5jcmVtZW50PXRoaXMuaW5jcmVtZW50XSAtIFJlc2V0cyB7QGxpbmsgRm9vQmFyI2luY3JlbWVudHxpbmNyZW1lbnR9IChzZWUpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmaW5iYXJTdHlsZXN9IFtiYXJTdHlsZXM9dGhpcy5iYXJTdHlsZXNdIC0gKFNlZSB0eXBlIGRlZmluaXRpb24gZm9yIGRldGFpbHMuKSBTY3JvbGxiYXIgc3R5bGVzIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGJhciBlbGVtZW50LlxuICAgICAqXG4gICAgICogT25seSBzcGVjaWZ5IGEgYGJhclN0eWxlc2Agb2JqZWN0IHdoZW4geW91IG5lZWQgdG8gb3ZlcnJpZGUgc3R5bGVzaGVldCB2YWx1ZXMuIElmIHByb3ZpZGVkLCBiZWNvbWVzIHRoZSBuZXcgZGVmYXVsdCAoYHRoaXMuYmFyU3R5bGVzYCksIGZvciB1c2UgYXMgYSBkZWZhdWx0IG9uIHN1YnNlcXVlbnQgY2FsbHMuXG4gICAgICpcbiAgICAgKiBJdCBpcyBnZW5lcmFsbHkgdGhlIGNhc2UgdGhhdCB0aGUgc2Nyb2xsYmFyJ3MgbmV3IHBvc2l0aW9uIGlzIHN1ZmZpY2llbnRseSBkZXNjcmliZWQgYnkgdGhlIGN1cnJlbnQgc3R5bGVzLiBUaGVyZWZvcmUsIGl0IGlzIHVudXN1YWwgdG8gbmVlZCB0byBwcm92aWRlIGEgYGJhclN0eWxlc2Agb2JqZWN0IG9uIGV2ZXJ5IGNhbGwgdG8gYHJlc2l6ZWAuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7RmluQmFyfSBTZWxmIGZvciBjaGFpbmluZy5cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHJlc2l6ZTogZnVuY3Rpb24gKGluY3JlbWVudCwgYmFyU3R5bGVzKSB7XG4gICAgICAgIHZhciBiYXIgPSB0aGlzLmJhcjtcblxuICAgICAgICBpZiAoIWJhci5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vdCBpbiBET00geWV0IHNvIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lciB8fCBiYXIucGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgIGNvbnRhaW5lclJlY3QgPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgLy8gc2hpZnQgYXJncyBpZiBpZiAxc3QgYXJnIG9taXR0ZWRcbiAgICAgICAgaWYgKHR5cGVvZiBpbmNyZW1lbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBiYXJTdHlsZXMgPSBpbmNyZW1lbnQ7XG4gICAgICAgICAgICBpbmNyZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN0eWxlID0gdGhpcy5iYXJTdHlsZXMgPSBiYXJTdHlsZXMgfHwgdGhpcy5iYXJTdHlsZXM7XG5cbiAgICAgICAgLy8gQm91bmQgdG8gcmVhbCBjb250ZW50OiBDb250ZW50IHdhcyBnaXZlbiBidXQgbm8gb25jaGFuZ2UgaGFuZGxlci5cbiAgICAgICAgLy8gU2V0IHVwIC5vbmNoYW5nZSwgLmNvbnRhaW5lclNpemUsIGFuZCAuaW5jcmVtZW50LlxuICAgICAgICAvLyBOb3RlIHRoaXMgb25seSBtYWtlcyBzZW5zZSBpZiB5b3VyIGluZGV4IHVuaXQgaXMgcGl4ZWxzLlxuICAgICAgICBpZiAodGhpcy5jb250ZW50KSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMub25jaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uY2hhbmdlID0gdGhpcy5zY3JvbGxSZWFsQ29udGVudDtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRTaXplID0gdGhpcy5jb250ZW50W3RoaXMub2guc2l6ZV07XG4gICAgICAgICAgICAgICAgdGhpcy5fbWluID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXggPSB0aGlzLmNvbnRlbnRTaXplIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5vbmNoYW5nZSA9PT0gdGhpcy5zY3JvbGxSZWFsQ29udGVudCkge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXJTaXplID0gY29udGFpbmVyUmVjdFt0aGlzLm9oLnNpemVdO1xuICAgICAgICAgICAgdGhpcy5pbmNyZW1lbnQgPSB0aGlzLmNvbnRhaW5lclNpemUgLyAodGhpcy5jb250ZW50U2l6ZSAtIHRoaXMuY29udGFpbmVyU2l6ZSkgKiAodGhpcy5fbWF4IC0gdGhpcy5fbWluKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyU2l6ZSA9IDE7XG4gICAgICAgICAgICB0aGlzLmluY3JlbWVudCA9IGluY3JlbWVudCB8fCB0aGlzLmluY3JlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuaW5kZXg7XG4gICAgICAgIHRoaXMudGVzdFBhbmVsSXRlbSA9IHRoaXMudGVzdFBhbmVsSXRlbSB8fCB0aGlzLl9hZGRUZXN0UGFuZWxJdGVtKCk7XG4gICAgICAgIHRoaXMuX3NldFRodW1iU2l6ZSgpO1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgaWYgKHRoaXMuZGVsdGFQcm9wICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignd2hlZWwnLCB0aGlzLl9ib3VuZC5vbndoZWVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBTaG9ydGVuIHRyYWlsaW5nIGVuZCBvZiBzY3JvbGxiYXIgYnkgdGhpY2tuZXNzIG9mIHNvbWUgb3RoZXIgc2Nyb2xsYmFyLlxuICAgICAqIEBkZXNjIEluIHRoZSBcImNsYXNzaWNhbFwiIHNjZW5hcmlvIHdoZXJlIHZlcnRpY2FsIHNjcm9sbCBiYXIgaXMgb24gdGhlIHJpZ2h0IGFuZCBob3Jpem9udGFsIHNjcm9sbGJhciBpcyBvbiB0aGUgYm90dG9tLCB5b3Ugd2FudCB0byBzaG9ydGVuIHRoZSBcInRyYWlsaW5nIGVuZFwiIChib3R0b20gYW5kIHJpZ2h0IGVuZHMsIHJlc3BlY3RpdmVseSkgb2YgYXQgbGVhc3Qgb25lIG9mIHRoZW0gc28gdGhleSBkb24ndCBvdmVybGF5LlxuICAgICAqXG4gICAgICogVGhpcyBjb252ZW5pZW5jZSBmdW5jdGlvbiBpcyBhbiBwcm9ncmFtbWF0aWMgYWx0ZXJuYXRpdmUgdG8gaGFyZGNvZGluZyB0aGUgY29ycmVjdCBzdHlsZSB3aXRoIHRoZSBjb3JyZWN0IHZhbHVlIGluIHlvdXIgc3R5bGVzaGVldDsgb3Igc2V0dGluZyB0aGUgY29ycmVjdCBzdHlsZSB3aXRoIHRoZSBjb3JyZWN0IHZhbHVlIGluIHRoZSB7QGxpbmsgRmluQmFyI2JhclN0eWxlc3xiYXJTdHlsZXN9IG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNmb3Jlc2hvcnRlbkJ5fGZvcmVzaG9ydGVuQnl9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtGaW5CYXJ8bnVsbH0gb3RoZXJGaW5CYXIgLSBPdGhlciBzY3JvbGxiYXIgdG8gYXZvaWQgYnkgc2hvcnRlbmluZyB0aGlzIG9uZTsgYG51bGxgIHJlbW92ZXMgdGhlIHRyYWlsaW5nIHNwYWNlXG4gICAgICogQHJldHVybnMge0ZpbkJhcn0gRm9yIGNoYWluaW5nXG4gICAgICovXG4gICAgc2hvcnRlbkJ5OiBmdW5jdGlvbiAob3RoZXJGaW5CYXIpIHsgcmV0dXJuIHRoaXMuc2hvcnRlbkVuZEJ5KCd0cmFpbGluZycsIG90aGVyRmluQmFyKTsgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFNob3J0ZW4gbGVhZGluZyBlbmQgb2Ygc2Nyb2xsYmFyIGJ5IHRoaWNrbmVzcyBvZiBzb21lIG90aGVyIHNjcm9sbGJhci5cbiAgICAgKiBAZGVzYyBTdXBwb3J0cyBub24tY2xhc3NpY2FsIHNjcm9sbGJhciBzY2VuYXJpb3Mgd2hlcmUgdmVydGljYWwgc2Nyb2xsIGJhciBtYXkgYmUgb24gbGVmdCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxiYXIgbWF5IGJlIG9uIHRvcCwgaW4gd2hpY2ggY2FzZSB5b3Ugd2FudCB0byBzaG9ydGVuIHRoZSBcImxlYWRpbmcgZW5kXCIgcmF0aGVyIHRoYW4gdGhlIHRyYWlsaW5nIGVuZC5cbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjc2hvcnRlbkJ5fHNob3J0ZW5CeX0uXG4gICAgICogQHBhcmFtIHtGaW5CYXJ8bnVsbH0gb3RoZXJGaW5CYXIgLSBPdGhlciBzY3JvbGxiYXIgdG8gYXZvaWQgYnkgc2hvcnRlbmluZyB0aGlzIG9uZTsgYG51bGxgIHJlbW92ZXMgdGhlIHRyYWlsaW5nIHNwYWNlXG4gICAgICogQHJldHVybnMge0ZpbkJhcn0gRm9yIGNoYWluaW5nXG4gICAgICovXG4gICAgZm9yZXNob3J0ZW5CeTogZnVuY3Rpb24gKG90aGVyRmluQmFyKSB7IHJldHVybiB0aGlzLnNob3J0ZW5FbmRCeSgnbGVhZGluZycsIG90aGVyRmluQmFyKTsgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IEdlbmVyYWxpemVkIHNob3J0ZW5pbmcgZnVuY3Rpb24uXG4gICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3Nob3J0ZW5CeXxzaG9ydGVuQnl9LlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNmb3Jlc2hvcnRlbkJ5fGZvcmVzaG9ydGVuQnl9LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB3aGljaEVuZCAtIGEgQ1NTIHN0eWxlIHByb3BlcnR5IG5hbWUgb3IgYW4gb3JpZW50YXRpb24gaGFzaCBuYW1lIHRoYXQgdHJhbnNsYXRlcyB0byBhIENTUyBzdHlsZSBwcm9wZXJ0eSBuYW1lLlxuICAgICAqIEBwYXJhbSB7RmluQmFyfG51bGx9IG90aGVyRmluQmFyIC0gT3RoZXIgc2Nyb2xsYmFyIHRvIGF2b2lkIGJ5IHNob3J0ZW5pbmcgdGhpcyBvbmU7IGBudWxsYCByZW1vdmVzIHRoZSB0cmFpbGluZyBzcGFjZVxuICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIHNob3J0ZW5FbmRCeTogZnVuY3Rpb24gKHdoaWNoRW5kLCBvdGhlckZpbkJhcikge1xuICAgICAgICBpZiAoIW90aGVyRmluQmFyKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYXV4U3R5bGVzO1xuICAgICAgICB9IGVsc2UgaWYgKG90aGVyRmluQmFyIGluc3RhbmNlb2YgRmluQmFyICYmIG90aGVyRmluQmFyLm9yaWVudGF0aW9uICE9PSB0aGlzLm9yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICB2YXIgb3RoZXJTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG90aGVyRmluQmFyLmJhciksXG4gICAgICAgICAgICAgICAgb29oID0gb3JpZW50YXRpb25IYXNoZXNbb3RoZXJGaW5CYXIub3JpZW50YXRpb25dO1xuICAgICAgICAgICAgdGhpcy5fYXV4U3R5bGVzID0ge307XG4gICAgICAgICAgICB0aGlzLl9hdXhTdHlsZXNbd2hpY2hFbmRdID0gb3RoZXJTdHlsZVtvb2gudGhpY2tuZXNzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpczsgLy8gZm9yIGNoYWluaW5nXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN1bW1hcnkgU2V0cyB0aGUgcHJvcG9ydGlvbmFsIHRodW1iIHNpemUgYW5kIGhpZGVzIHRodW1iIHdoZW4gMTAwJS5cbiAgICAgKiBAZGVzYyBUaGUgdGh1bWIgc2l6ZSBoYXMgYW4gYWJzb2x1dGUgbWluaW11bSBvZiAyMCAocGl4ZWxzKS5cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIF9zZXRUaHVtYlNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9oID0gdGhpcy5vaCxcbiAgICAgICAgICAgIHRodW1iQ29tcCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMudGh1bWIpLFxuICAgICAgICAgICAgdGh1bWJNYXJnaW5MZWFkaW5nID0gcGFyc2VJbnQodGh1bWJDb21wW29oLm1hcmdpbkxlYWRpbmddKSxcbiAgICAgICAgICAgIHRodW1iTWFyZ2luVHJhaWxpbmcgPSBwYXJzZUludCh0aHVtYkNvbXBbb2gubWFyZ2luVHJhaWxpbmddKSxcbiAgICAgICAgICAgIHRodW1iTWFyZ2lucyA9IHRodW1iTWFyZ2luTGVhZGluZyArIHRodW1iTWFyZ2luVHJhaWxpbmcsXG4gICAgICAgICAgICBiYXJTaXplID0gdGhpcy5iYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbb2guc2l6ZV0sXG4gICAgICAgICAgICB0aHVtYlNpemUgPSBNYXRoLm1heCgyMCwgYmFyU2l6ZSAqIHRoaXMuY29udGFpbmVyU2l6ZSAvIHRoaXMuY29udGVudFNpemUpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5lclNpemUgPCB0aGlzLmNvbnRlbnRTaXplKSB7XG4gICAgICAgICAgICB0aGlzLmJhci5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5zdHlsZVtvaC5zaXplXSA9IHRodW1iU2l6ZSArICdweCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmJhci5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQG5hbWUgX3RodW1iTWF4XG4gICAgICAgICAqIEBzdW1tYXJ5IE1heGltdW0gb2Zmc2V0IG9mIHRodW1iJ3MgbGVhZGluZyBlZGdlLlxuICAgICAgICAgKiBAZGVzYyBUaGlzIGlzIHRoZSBwaXhlbCBvZmZzZXQgd2l0aGluIHRoZSBzY3JvbGxiYXIgb2YgdGhlIHRodW1iIHdoZW4gaXQgaXMgYXQgaXRzIG1heGltdW0gcG9zaXRpb24gYXQgdGhlIGV4dHJlbWUgZW5kIG9mIGl0cyByYW5nZS5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyB2YWx1ZSB0YWtlcyBpbnRvIGFjY291bnQgdGhlIG5ld2x5IGNhbGN1bGF0ZWQgc2l6ZSBvZiB0aGUgdGh1bWIgZWxlbWVudCAoaW5jbHVkaW5nIGl0cyBtYXJnaW5zKSBhbmQgdGhlIGlubmVyIHNpemUgb2YgdGhlIHNjcm9sbGJhciAodGhlIHRodW1iJ3MgY29udGFpbmluZyBlbGVtZW50LCBpbmNsdWRpbmcgX2l0c18gbWFyZ2lucykuXG4gICAgICAgICAqXG4gICAgICAgICAqIE5PVEU6IFNjcm9sbGJhciBwYWRkaW5nIGlzIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgYW5kIGFzc3VtZWQgdG8gYmUgMCBpbiB0aGUgY3VycmVudCBpbXBsZW1lbnRhdGlvbiBhbmQgaXMgYXNzdW1lZCB0byBiZSBgMGA7IHVzZSB0aHVtYiBtYXJnaW5zIGluIHBsYWNlIG9mIHNjcm9sbGJhciBwYWRkaW5nLlxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fdGh1bWJNYXggPSBiYXJTaXplIC0gdGh1bWJTaXplIC0gdGh1bWJNYXJnaW5zO1xuXG4gICAgICAgIHRoaXMuX3RodW1iTWFyZ2luTGVhZGluZyA9IHRodW1iTWFyZ2luTGVhZGluZzsgLy8gdXNlZCBpbiBtb3VzZWRvd25cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgUmVtb3ZlIHRoZSBzY3JvbGxiYXIuXG4gICAgICogQGRlc2MgVW5ob29rcyBhbGwgdGhlIGV2ZW50IGhhbmRsZXJzIGFuZCB0aGVuIHJlbW92ZXMgdGhlIGVsZW1lbnQgZnJvbSB0aGUgRE9NLiBBbHdheXMgY2FsbCB0aGlzIG1ldGhvZCBwcmlvciB0byBkaXNwb3Npbmcgb2YgdGhlIHNjcm9sbGJhciBvYmplY3QuXG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5iYXIub25tb3VzZWRvd24gPSBudWxsO1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlbW92ZScpO1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNldXAnKTtcblxuICAgICAgICAodGhpcy5jb250YWluZXIgfHwgdGhpcy5iYXIucGFyZW50RWxlbWVudCkuX3JlbW92ZUV2dCgnd2hlZWwnKTtcblxuICAgICAgICB0aGlzLmJhci5vbmNsaWNrID1cbiAgICAgICAgICAgIHRoaXMudGh1bWIub25jbGljayA9XG4gICAgICAgICAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3ZlciA9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGh1bWIudHJhbnNpdGlvbmVuZCA9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdXQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuYmFyLnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBmdW5jdGlvbiBfYWRkVGVzdFBhbmVsSXRlbVxuICAgICAqIEBzdW1tYXJ5IEFwcGVuZCBhIHRlc3QgcGFuZWwgZWxlbWVudC5cbiAgICAgKiBAZGVzYyBJZiB0aGVyZSBpcyBhIHRlc3QgcGFuZWwgaW4gdGhlIERPTSAodHlwaWNhbGx5IGFuIGA8b2w+Li4uPC9vbD5gIGVsZW1lbnQpIHdpdGggY2xhc3MgbmFtZXMgb2YgYm90aCBgdGhpcy5jbGFzc1ByZWZpeGAgYW5kIGAndGVzdC1wYW5lbCdgIChvciwgYmFycmluZyB0aGF0LCBhbnkgZWxlbWVudCB3aXRoIGNsYXNzIG5hbWUgYCd0ZXN0LXBhbmVsJ2ApLCBhbiBgPGxpPi4uLjwvbGk+YCBlbGVtZW50IHdpbGwgYmUgY3JlYXRlZCBhbmQgYXBwZW5kZWQgdG8gaXQuIFRoaXMgbmV3IGVsZW1lbnQgd2lsbCBjb250YWluIGEgc3BhbiBmb3IgZWFjaCBjbGFzcyBuYW1lIGdpdmVuLlxuICAgICAqXG4gICAgICogWW91IHNob3VsZCBkZWZpbmUgYSBDU1Mgc2VsZWN0b3IgYC5saXN0ZW5pbmdgIGZvciB0aGVzZSBzcGFucy4gVGhpcyBjbGFzcyB3aWxsIGJlIGFkZGVkIHRvIHRoZSBzcGFucyB0byBhbHRlciB0aGVpciBhcHBlYXJhbmNlIHdoZW4gYSBsaXN0ZW5lciBpcyBhZGRlZCB3aXRoIHRoYXQgY2xhc3MgbmFtZSAocHJlZml4ZWQgd2l0aCAnb24nKS5cbiAgICAgKlxuICAgICAqIChUaGlzIGlzIGFuIGludGVybmFsIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIG9uY2UgYnkgdGhlIGNvbnN0cnVjdG9yIG9uIGV2ZXJ5IGluc3RhbnRpYXRpb24uKVxuICAgICAqIEByZXR1cm5zIHtFbGVtZW50fHVuZGVmaW5lZH0gVGhlIGFwcGVuZGVkIGA8bGk+Li4uPC9saT5gIGVsZW1lbnQgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgaXMgbm8gdGVzdCBwYW5lbC5cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIF9hZGRUZXN0UGFuZWxJdGVtOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0ZXN0UGFuZWxJdGVtLFxuICAgICAgICAgICAgdGVzdFBhbmVsRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy4nICsgdGhpcy5fY2xhc3NQcmVmaXggKyAnLnRlc3QtcGFuZWwnKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGVzdC1wYW5lbCcpO1xuXG4gICAgICAgIGlmICh0ZXN0UGFuZWxFbGVtZW50KSB7XG4gICAgICAgICAgICB2YXIgdGVzdFBhbmVsSXRlbVBhcnROYW1lcyA9IFsgJ21vdXNlZG93bicsICdtb3VzZW1vdmUnLCAnbW91c2V1cCcsICdpbmRleCcgXSxcbiAgICAgICAgICAgICAgICBpdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblxuICAgICAgICAgICAgdGVzdFBhbmVsSXRlbVBhcnROYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJ0TmFtZSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uaW5uZXJIVE1MICs9ICc8c3BhbiBjbGFzcz1cIicgKyBwYXJ0TmFtZSArICdcIj4nICsgcGFydE5hbWUucmVwbGFjZSgnbW91c2UnLCAnJykgKyAnPC9zcGFuPic7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGVzdFBhbmVsRWxlbWVudC5hcHBlbmRDaGlsZChpdGVtKTtcblxuICAgICAgICAgICAgdGVzdFBhbmVsSXRlbSA9IHt9O1xuICAgICAgICAgICAgdGVzdFBhbmVsSXRlbVBhcnROYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJ0TmFtZSkge1xuICAgICAgICAgICAgICAgIHRlc3RQYW5lbEl0ZW1bcGFydE5hbWVdID0gaXRlbS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKHBhcnROYW1lKVswXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRlc3RQYW5lbEl0ZW07XG4gICAgfSxcblxuICAgIF9hZGRFdnQ6IGZ1bmN0aW9uIChldnROYW1lKSB7XG4gICAgICAgIHZhciBzcHkgPSB0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtW2V2dE5hbWVdO1xuICAgICAgICBpZiAoc3B5KSB7IHNweS5jbGFzc0xpc3QuYWRkKCdsaXN0ZW5pbmcnKTsgfVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihldnROYW1lLCB0aGlzLl9ib3VuZFsnb24nICsgZXZ0TmFtZV0pO1xuICAgIH0sXG5cbiAgICBfcmVtb3ZlRXZ0OiBmdW5jdGlvbiAoZXZ0TmFtZSkge1xuICAgICAgICB2YXIgc3B5ID0gdGhpcy50ZXN0UGFuZWxJdGVtICYmIHRoaXMudGVzdFBhbmVsSXRlbVtldnROYW1lXTtcbiAgICAgICAgaWYgKHNweSkgeyBzcHkuY2xhc3NMaXN0LnJlbW92ZSgnbGlzdGVuaW5nJyk7IH1cbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgdGhpcy5fYm91bmRbJ29uJyArIGV2dE5hbWVdKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIG9iam4gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGlmIChvYmpuKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2Jqbikge1xuICAgICAgICAgICAgICAgIG9ialtrZXldID0gb2JqbltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIHZhbGlkUmFuZ2UocmFuZ2UpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJhbmdlKSxcbiAgICAgICAgdmFsaWQgPSAga2V5cy5sZW5ndGggPT09IDIgJiZcbiAgICAgICAgICAgIHR5cGVvZiByYW5nZS5taW4gPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICB0eXBlb2YgcmFuZ2UubWF4ID09PSAnbnVtYmVyJyAmJlxuICAgICAgICAgICAgcmFuZ2UubWluIDw9IHJhbmdlLm1heDtcblxuICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgZXJyb3IoJ0ludmFsaWQgLnJhbmdlIG9iamVjdC4nKTtcbiAgICB9XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGhhbmRsZXJzVG9CZUJvdW5kXG4gKiBAdHlwZSB7b2JqZWN0fVxuICogQGRlc2MgVGhlIGZ1bmN0aW9ucyBkZWZpbmVkIGluIHRoaXMgb2JqZWN0IGFyZSBhbGwgRE9NIGV2ZW50IGhhbmRsZXJzIHRoYXQgYXJlIGJvdW5kIGJ5IHRoZSBGaW5CYXIgY29uc3RydWN0b3IgdG8gZWFjaCBuZXcgaW5zdGFuY2UuIEluIG90aGVyIHdvcmRzLCB0aGUgYHRoaXNgIHZhbHVlIG9mIHRoZXNlIGhhbmRsZXJzLCBvbmNlIGJvdW5kLCByZWZlciB0byB0aGUgRmluQmFyIG9iamVjdCBhbmQgbm90IHRvIHRoZSBldmVudCBlbWl0dGVyLiBcIkRvIG5vdCBjb25zdW1lIHJhdy5cIlxuICovXG52YXIgaGFuZGxlcnNUb0JlQm91bmQgPSB7XG4gICAgc2hvcnRTdG9wOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9LFxuXG4gICAgb253aGVlbDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB0aGlzLmluZGV4ICs9IGV2dFt0aGlzLmRlbHRhUHJvcF0gKiB0aGlzW3RoaXMuZGVsdGFQcm9wICsgJ0ZhY3RvciddICogdGhpcy5ub3JtYWw7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgdmFyIHRodW1iQm94ID0gdGhpcy50aHVtYi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgIGdvaW5nVXAgPSBldnRbdGhpcy5vaC5jb29yZGluYXRlXSA8IHRodW1iQm94W3RoaXMub2gubGVhZGluZ107XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnBhZ2luZyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggPSB0aGlzLnBhZ2luZ1tnb2luZ1VwID8gJ3VwJyA6ICdkb3duJ10oTWF0aC5yb3VuZCh0aGlzLmluZGV4KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmluZGV4ICs9IGdvaW5nVXAgPyAtdGhpcy5pbmNyZW1lbnQgOiB0aGlzLmluY3JlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1ha2UgdGhlIHRodW1iIGdsb3cgbW9tZW50YXJpbHlcbiAgICAgICAgdGhpcy50aHVtYi5jbGFzc0xpc3QuYWRkKCdob3ZlcicpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMudGh1bWIuYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIGZ1bmN0aW9uIHdhaXRGb3JJdCgpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIHdhaXRGb3JJdCk7XG4gICAgICAgICAgICBzZWxmLl9ib3VuZC5vbm1vdXNldXAoZXZ0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0sXG5cbiAgICBvbm1vdXNlb3ZlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnRodW1iLmNsYXNzTGlzdC5hZGQoJ2hvdmVyJyk7XG4gICAgfSxcblxuICAgIG9ubW91c2VvdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRyYWdnaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnRodW1iLmNsYXNzTGlzdC5yZW1vdmUoJ2hvdmVyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb25tb3VzZWRvd246IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgdmFyIHRodW1iQm94ID0gdGhpcy50aHVtYi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5waW5PZmZzZXQgPSBldnRbdGhpcy5vaC5heGlzXSAtIHRodW1iQm94W3RoaXMub2gubGVhZGluZ10gKyB0aGlzLmJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVt0aGlzLm9oLmxlYWRpbmddICsgdGhpcy5fdGh1bWJNYXJnaW5MZWFkaW5nO1xuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIG9ubW91c2Vtb3ZlOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIGlmICghKGV2dC5idXR0b25zICYgMSkpIHtcbiAgICAgICAgICAgIC8vIG1vdXNlIGJ1dHRvbiBtYXkgaGF2ZSBiZWVuIHJlbGVhc2VkIHdpdGhvdXQgYG9ubW91c2V1cGAgdHJpZ2dlcmluZyAoc2VlXG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudCgnbW91c2V1cCcsIGV2dCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNjYWxlZCA9IE1hdGgubWluKHRoaXMuX3RodW1iTWF4LCBNYXRoLm1heCgwLCBldnRbdGhpcy5vaC5heGlzXSAtIHRoaXMucGluT2Zmc2V0KSk7XG4gICAgICAgIHZhciBpZHggPSBzY2FsZWQgLyB0aGlzLl90aHVtYk1heCAqICh0aGlzLl9tYXggLSB0aGlzLl9taW4pICsgdGhpcy5fbWluO1xuXG4gICAgICAgIHRoaXMuX3NldFNjcm9sbChpZHgsIHNjYWxlZCk7XG5cbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuXG4gICAgb25tb3VzZXVwOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcblxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2F1dG8nO1xuXG4gICAgICAgIHZhciB0aHVtYkJveCA9IHRoaXMudGh1bWIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHRodW1iQm94LmxlZnQgPD0gZXZ0LmNsaWVudFggJiYgZXZ0LmNsaWVudFggPD0gdGh1bWJCb3gucmlnaHQgJiZcbiAgICAgICAgICAgIHRodW1iQm94LnRvcCA8PSBldnQuY2xpZW50WSAmJiBldnQuY2xpZW50WSA8PSB0aHVtYkJveC5ib3R0b21cbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aGlzLl9ib3VuZC5vbm1vdXNlb3ZlcihldnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fYm91bmQub25tb3VzZW91dChldnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFRhYmxlIG9mIHdoZWVsIG5vcm1hbHMgdG8gd2Via2l0LlxuICpcbiAqIFRoaXMgb2JqZWN0IGlzIGEgZGljdGlvbmFyeSBvZiBwbGF0Zm9ybSBkaWN0aW9uYXJpZXMsIGtleWVkIGJ5OlxuICogKiBgbWFjYCDigJQgbWFjT1NcbiAqICogYHdpbmAg4oCUIFdpbmRvd1xuICpcbiAqIEVhY2ggcGxhdGZvcm0gZGljdGlvbmFyeSBpcyBrZXllZCBieTpcbiAqICogYHdlYmtpdGAg4oCUIENocm9tZSwgT3BlcmEsIFNhZmFyaVxuICogKiBgbW96YCDigJQgRmlyZWZveFxuICogKiBgbXNgIOKAlCBJRSAxMSBfKFdpbmRvd3Mgb25seSlfXG4gKiAqIGBlZGdlYCDigJQgRWRnZSBfKFdpbmRvd3Mgb25seSlfXG4gKlxuICogQHRvZG8gYWRkIGBsaW51eGAgcGxhdGZvcm1cbiAqIEB0eXBlIHtvYmplY3R9XG4gKi9cbkZpbkJhci5ub3JtYWxzID0ge1xuICAgIG1hYzoge1xuICAgICAgICB3ZWJraXQ6IDEuMCxcbiAgICAgICAgbW96OiAzNVxuICAgIH0sXG4gICAgd2luOiB7XG4gICAgICAgIHdlYmtpdDogMi42LFxuICAgICAgICBtb3o6IDg1LFxuICAgICAgICBtczogMi45LFxuICAgICAgICBlZGdlOiAyXG4gICAgfVxufTtcblxuZnVuY3Rpb24gZ2V0Tm9ybWFsKCkge1xuICAgIGlmIChGaW5CYXIubm9ybWFscykge1xuICAgICAgICB2YXIgbmF2ID0gd2luZG93Lm5hdmlnYXRvciwgdWEgPSBuYXYudXNlckFnZW50O1xuICAgICAgICB2YXIgcGxhdGZvcm0gPSBuYXYucGxhdGZvcm0uc3Vic3RyKDAsIDMpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHZhciBicm93c2VyID0gL0VkZ2UvLnRlc3QodWEpID8gJ2VkZ2UnIDpcbiAgICAgICAgICAgIC9PcGVyYXxPUFJ8Q2hyb21lfFNhZmFyaS8udGVzdCh1YSkgPyAnd2Via2l0JyA6XG4gICAgICAgICAgICAgICAgL0ZpcmVmb3gvLnRlc3QodWEpID8gJ21veicgOlxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5kb2N1bWVudE1vZGUgPyAnbXMnIDogLy8gaW50ZXJuZXQgZXhwbG9yZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICAgICAgdmFyIHBsYXRmb3JtRGljdGlvbmFyeSA9IEZpbkJhci5ub3JtYWxzW3BsYXRmb3JtXSB8fCB7fTtcbiAgICAgICAgcmV0dXJuIHBsYXRmb3JtRGljdGlvbmFyeVticm93c2VyXTtcbiAgICB9XG59XG5cbnZhciBvcmllbnRhdGlvbkhhc2hlcyA9IHtcbiAgICB2ZXJ0aWNhbDoge1xuICAgICAgICBjb29yZGluYXRlOiAgICAgJ2NsaWVudFknLFxuICAgICAgICBheGlzOiAgICAgICAgICAgJ3BhZ2VZJyxcbiAgICAgICAgc2l6ZTogICAgICAgICAgICdoZWlnaHQnLFxuICAgICAgICBvdXRzaWRlOiAgICAgICAgJ3JpZ2h0JyxcbiAgICAgICAgaW5zaWRlOiAgICAgICAgICdsZWZ0JyxcbiAgICAgICAgbGVhZGluZzogICAgICAgICd0b3AnLFxuICAgICAgICB0cmFpbGluZzogICAgICAgJ2JvdHRvbScsXG4gICAgICAgIG1hcmdpbkxlYWRpbmc6ICAnbWFyZ2luVG9wJyxcbiAgICAgICAgbWFyZ2luVHJhaWxpbmc6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICB0aGlja25lc3M6ICAgICAgJ3dpZHRoJyxcbiAgICAgICAgZGVsdGE6ICAgICAgICAgICdkZWx0YVknXG4gICAgfSxcbiAgICBob3Jpem9udGFsOiB7XG4gICAgICAgIGNvb3JkaW5hdGU6ICAgICAnY2xpZW50WCcsXG4gICAgICAgIGF4aXM6ICAgICAgICAgICAncGFnZVgnLFxuICAgICAgICBzaXplOiAgICAgICAgICAgJ3dpZHRoJyxcbiAgICAgICAgb3V0c2lkZTogICAgICAgICdib3R0b20nLFxuICAgICAgICBpbnNpZGU6ICAgICAgICAgJ3RvcCcsXG4gICAgICAgIGxlYWRpbmc6ICAgICAgICAnbGVmdCcsXG4gICAgICAgIHRyYWlsaW5nOiAgICAgICAncmlnaHQnLFxuICAgICAgICBtYXJnaW5MZWFkaW5nOiAgJ21hcmdpbkxlZnQnLFxuICAgICAgICBtYXJnaW5UcmFpbGluZzogJ21hcmdpblJpZ2h0JyxcbiAgICAgICAgdGhpY2tuZXNzOiAgICAgICdoZWlnaHQnLFxuICAgICAgICBkZWx0YTogICAgICAgICAgJ2RlbHRhWCdcbiAgICB9XG59O1xuXG52YXIgYXhpcyA9IHtcbiAgICB0b3A6ICAgICd2ZXJ0aWNhbCcsXG4gICAgYm90dG9tOiAndmVydGljYWwnLFxuICAgIGhlaWdodDogJ3ZlcnRpY2FsJyxcbiAgICBsZWZ0OiAgICdob3Jpem9udGFsJyxcbiAgICByaWdodDogICdob3Jpem9udGFsJyxcbiAgICB3aWR0aDogICdob3Jpem9udGFsJ1xufTtcblxudmFyIGNzc0ZpbkJhcnM7IC8vIGRlZmluaXRpb24gaW5zZXJ0ZWQgYnkgZ3VscGZpbGUgYmV0d2VlbiBmb2xsb3dpbmcgY29tbWVudHNcbi8qIGluamVjdDpjc3MgKi9cbmNzc0ZpbkJhcnMgPSAnZGl2LmZpbmJhci1ob3Jpem9udGFsLGRpdi5maW5iYXItdmVydGljYWx7bWFyZ2luOjNweH1kaXYuZmluYmFyLWhvcml6b250YWw+LnRodW1iLGRpdi5maW5iYXItdmVydGljYWw+LnRodW1ie2JhY2tncm91bmQtY29sb3I6I2QzZDNkMzstd2Via2l0LWJveC1zaGFkb3c6MCAwIDFweCAjMDAwOy1tb3otYm94LXNoYWRvdzowIDAgMXB4ICMwMDA7Ym94LXNoYWRvdzowIDAgMXB4ICMwMDA7Ym9yZGVyLXJhZGl1czo0cHg7bWFyZ2luOjJweDtvcGFjaXR5Oi40O3RyYW5zaXRpb246b3BhY2l0eSAuNXN9ZGl2LmZpbmJhci1ob3Jpem9udGFsPi50aHVtYi5ob3ZlcixkaXYuZmluYmFyLXZlcnRpY2FsPi50aHVtYi5ob3ZlcntvcGFjaXR5OjE7dHJhbnNpdGlvbjpvcGFjaXR5IC41c31kaXYuZmluYmFyLXZlcnRpY2Fse3RvcDowO2JvdHRvbTowO3JpZ2h0OjA7d2lkdGg6MTFweH1kaXYuZmluYmFyLXZlcnRpY2FsPi50aHVtYnt0b3A6MDtyaWdodDowO3dpZHRoOjdweH1kaXYuZmluYmFyLWhvcml6b250YWx7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7aGVpZ2h0OjExcHh9ZGl2LmZpbmJhci1ob3Jpem9udGFsPi50aHVtYntsZWZ0OjA7Ym90dG9tOjA7aGVpZ2h0OjdweH0nO1xuLyogZW5kaW5qZWN0ICovXG5cbmZ1bmN0aW9uIGVycm9yKG1zZykge1xuICAgIHRocm93ICdmaW5iYXJzOiAnICsgbXNnO1xufVxuXG4vLyBJbnRlcmZhY2Vcbm1vZHVsZS5leHBvcnRzID0gRmluQmFyO1xuIl19
