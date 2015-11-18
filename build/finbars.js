(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.FinBar = require('../index');

},{"../index":2}],2:[function(require,module,exports){
'use strict';

/* eslint-env node, browser */

var cssInjector = require('css-injector');

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
    for (key in handlersToBeBound) {
        bound[key] = handlersToBeBound[key].bind(this);
    }

    /**
     * @name thumb
     * @summary The generated scrollbar thumb element.
     * @desc The thumb element's parent element is always the {@link FinBar#bar|bar} element.
     *
     * This property is typically referenced internally only. The size and position of the thumb element is maintained by `_calcThumb()`.
     * @type {Element}
     * @memberOf FinBar.prototype
     */
    var thumb = document.createElement('div');
    thumb.classList.add('thumb');
    thumb.onclick = bound.shortStop;
    thumb.onmouseover = bound.onmouseover;
    this.thumb = thumb;

    /**
     * @name bar
     * @summary The generated scrollbar element.
     * @desc The caller inserts this element into the DOM (typically into the content container) and then calls its {@link FinBar#resize|resize()} method.
     *
     * Thus the node tree is typically:
     * * A **content container** element, which contains:
     *    * The content element(s)
     *    * This **scrollbar element**, which in turn contains:
     *        * The **thumb element**
     *
     * @type {Element}
     * @memberOf FinBar.prototype
     */
    var bar = document.createElement('div');

    bar.classList.add('finbar-vertical');

    bar.appendChild(thumb);
    if (this.paging) {
        bar.onclick = bound.onclick;
    }
    this.bar = bar;

    options = options || {};

    // presets
    this.orientation = 'vertical';
    this._min = this._index = 0;
    this._max = 100;

    // options
    for (var key in options) {
        if (options.hasOwnProperty(key)) {
            var option = options[key];
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
    }

    cssInjector(cssFinBars, 'finbar-base', options.cssStylesheetReferenceElement);
}

FinBar.prototype = {

    /**
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

        if (this.bar.style.cssText || this.thumb.style.cssText) {
            this.bar.removeAttribute('style');
            this.thumb.removeAttribute('style');
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
            bar.removeAttribute('style');

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
        this._removeEvt('mousedown');
        this._removeEvt('mousemove');
        this._removeEvt('mouseup');

        (this.container || this.bar.parentElement)._removeEvt('wheel', this._bound.onwheel);

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
        this.index += evt[this.deltaProp];
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
        this.thumb.onmouseout = this._bound.onmouseout;
        this._addEvt('mousedown');
    },

    onmouseout: function () {
        this._removeEvt('mousedown');
        this.thumb.onmouseover = this._bound.onmouseover;
        this.thumb.classList.remove('hover');
    },

    onmousedown: function (evt) {
        this._removeEvt('mousedown');
        this.thumb.onmouseover = this.thumb.onmouseout = null;

        var thumbBox = this.thumb.getBoundingClientRect();
        this.pinOffset = evt[this.oh.axis] - thumbBox[this.oh.leading] + this.bar.getBoundingClientRect()[this.oh.leading] + this._thumbMarginLeading;
        document.documentElement.style.cursor = 'default';

        this._addEvt('mousemove');
        this._addEvt('mouseup');

        evt.stopPropagation();
        evt.preventDefault();
    },

    onmousemove: function (evt) {
        var scaled = Math.min(this._thumbMax, Math.max(0, evt[this.oh.axis] - this.pinOffset));
        var idx = scaled / this._thumbMax * (this._max - this._min) + this._min;

        this._setScroll(idx, scaled);

        evt.stopPropagation();
        evt.preventDefault();
    },

    onmouseup: function (evt) {
        this._removeEvt('mousemove');
        this._removeEvt('mouseup');

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
cssFinBars = 'div.finbar-horizontal,div.finbar-vertical{position:absolute;margin:3px}div.finbar-horizontal>.thumb,div.finbar-vertical>.thumb{position:absolute;background-color:#d3d3d3;-webkit-box-shadow:0 0 1px #000;-moz-box-shadow:0 0 1px #000;box-shadow:0 0 1px #000;border-radius:4px;margin:2px;opacity:.4;transition:opacity .5s}div.finbar-horizontal>.thumb.hover,div.finbar-vertical>.thumb.hover{opacity:1;transition:opacity .5s}div.finbar-vertical{top:0;bottom:0;right:0;width:11px}div.finbar-vertical>.thumb{top:0;right:0;width:7px}div.finbar-horizontal{left:0;right:0;bottom:0;height:11px}div.finbar-horizontal>.thumb{left:0;bottom:0;height:7px}';
/* endinject */

function error(msg) {
    throw 'finbars: ' + msg;
}

// Interface
module.exports = FinBar;

},{"css-injector":3}],3:[function(require,module,exports){
'use strict';

/* eslint-env browser */

(function (module) {  // eslint-disable-line no-unused-expressions

    // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

    /**
     * @summary Insert base stylesheet into DOM
     * @desc Creates a new `<style>...</style>` element from the named text string(s) and inserts it.
     * @param {string|string[]} cssRules
     * @param {string} [ID]
     * @param {string|Element|undefined|null} [referenceElement]
     * * `undefined` type (or omitted): injects stylesheet at top of `<head...</head>` element
     * * `null` value: injects stylesheet at bottom of `<head>...</head>` element
     * * `Element` type: injects stylesheet immediately before given element
     */
    function cssInjector(cssRules, ID, referenceElement) {
        if (ID) {
            ID = cssInjector.idPrefix + ID;

            if (document.getElementById(ID)) {
                return; // stylesheet already in DOM
            }
        }

        if (typeof referenceElement === 'string') {
            referenceElement = document.querySelector(referenceElement);
            if (!referenceElement) {
                throw 'Cannot find reference element for CSS injection.';
            }
        } else if (referenceElement && !(referenceElement instanceof Element)) {
            throw 'Given value not a reference element.';
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

        var container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

        if (referenceElement === undefined) {
            referenceElement = container.firstChild;
        }

        container.insertBefore(style, referenceElement);
    }

    cssInjector.idPrefix = 'injected-stylesheet-';

    // Interface
    module.exports = cssInjector;
})(
    typeof module === 'object' && module || (window.cssInjector = {}),
    typeof module === 'object' && module.exports || (window.cssInjector.exports = {})
) || (
    typeof module === 'object' || (window.cssInjector = window.cssInjector.exports)
);

/* About the above IIFE:
 * This file is a "modified node module." It functions as usual in Node.js *and* is also usable directly in the browser.
 * 1. Node.js: The IIFE is superfluous but innocuous.
 * 2. In the browser: The IIFE closure serves to keep internal declarations private.
 * 2.a. In the browser as a global: The logic in the actual parameter expressions + the post-invocation expression
 * will put your API in `window.cssInjector`.
 * 2.b. In the browser as a module: If you predefine a `window.module` object, the results will be in `module.exports`.
 * The bower component `mnm` makes this easy and also provides a global `require()` function for referencing your module
 * from other closures. In either case, this works with both NodeJs-style export mechanisms -- a single API assignment,
 * `module.exports = yourAPI` *or* a series of individual property assignments, `module.exports.property = property`.
 *
 * Before the IIFE runs, the actual parameter expressions are executed:
 * 1. If `module` object defined, we're in NodeJs so assume there is a `module` object with an `exports` object
 * 2. If `module` object undefined, we're in browser so define a `window.cssInjector` object with an `exports` object
 *
 * After the IIFE returns:
 * Because it always returns undefined, the expression after the || will always execute:
 * 1. If `module` object defined, then we're in NodeJs so we're done
 * 2. If `module` object undefined, then we're in browser so redefine`window.cssInjector` as its `exports` object
 */

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9maW5iYXJzL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmluYmFycy9idWlsZC9mYWtlXzk2Y2M4Y2Y1LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2ZpbmJhcnMvaW5kZXguanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvZmluYmFycy9ub2RlX21vZHVsZXMvY3NzLWluamVjdG9yL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy94QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuRmluQmFyID0gcmVxdWlyZSgnLi4vaW5kZXgnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWVudiBub2RlLCBicm93c2VyICovXG5cbnZhciBjc3NJbmplY3RvciA9IHJlcXVpcmUoJ2Nzcy1pbmplY3RvcicpO1xuXG4vKipcbiAqIEBjb25zdHJ1Y3RvciBGaW5CYXJcbiAqIEBzdW1tYXJ5IENyZWF0ZSBhIHNjcm9sbGJhciBvYmplY3QuXG4gKiBAZGVzYyBDcmVhdGluZyBhIHNjcm9sbGJhciBpcyBhIHRocmVlLXN0ZXAgcHJvY2VzczpcbiAqXG4gKiAxLiBJbnN0YW50aWF0ZSB0aGUgc2Nyb2xsYmFyIG9iamVjdCBieSBjYWxsaW5nIHRoaXMgY29uc3RydWN0b3IgZnVuY3Rpb24uIFVwb24gaW5zdGFudGlhdGlvbiwgdGhlIERPTSBlbGVtZW50IGZvciB0aGUgc2Nyb2xsYmFyICh3aXRoIGEgc2luZ2xlIGNoaWxkIGVsZW1lbnQgZm9yIHRoZSBzY3JvbGxiYXIgXCJ0aHVtYlwiKSBpcyBjcmVhdGVkIGJ1dCBpcyBub3QgaW5zZXJ0IGl0IGludG8gdGhlIERPTS5cbiAqIDIuIEFmdGVyIGluc3RhbnRpYXRpb24sIGl0IGlzIHRoZSBjYWxsZXIncyByZXNwb25zaWJpbGl0eSB0byBpbnNlcnQgdGhlIHNjcm9sbGJhciwge0BsaW5rIEZpbkJhciNiYXJ8dGhpcy5iYXJ9LCBpbnRvIHRoZSBET00uXG4gKiAzLiBBZnRlciBpbnNlcnRpb24sIHRoZSBjYWxsZXIgbXVzdCBjYWxsIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfSBhdCBsZWFzdCBvbmNlIHRvIHNpemUgYW5kIHBvc2l0aW9uIHRoZSBzY3JvbGxiYXIgYW5kIGl0cyB0aHVtYi4gQWZ0ZXIgdGhhdCwgYHJlc2l6ZSgpYCBzaG91bGQgYWxzbyBiZSBjYWxsZWQgcmVwZWF0ZWRseSBvbiByZXNpemUgZXZlbnRzIChhcyB0aGUgY29udGVudCBlbGVtZW50IGlzIGJlaW5nIHJlc2l6ZWQpLlxuICpcbiAqIFN1Z2dlc3RlZCBjb25maWd1cmF0aW9uczpcbiAqICogXyoqVW5ib3VuZCoqXzxici8+XG4gKiBUaGUgc2Nyb2xsYmFyIHNlcnZlcyBtZXJlbHkgYXMgYSBzaW1wbGUgcmFuZ2UgKHNsaWRlcikgY29udHJvbC4gT21pdCBib3RoIGBvcHRpb25zLm9uY2hhbmdlYCBhbmQgYG9wdGlvbnMuY29udGVudGAuXG4gKiAqIF8qKkJvdW5kIHRvIHZpcnR1YWwgY29udGVudCBlbGVtZW50KipfPGJyLz5cbiAqIFZpcnR1YWwgY29udGVudCBpcyBwcm9qZWN0ZWQgaW50byB0aGUgZWxlbWVudCB1c2luZyBhIGN1c3RvbSBldmVudCBoYW5kbGVyIHN1cHBsaWVkIGJ5IHRoZSBwcm9ncmFtbWVyIGluIGBvcHRpb25zLm9uY2hhbmdlYC4gQSB0eXBpY2FsIHVzZSBjYXNlIHdvdWxkIGJlIHRvIGhhbmRsZSBzY3JvbGxpbmcgb2YgdGhlIHZpcnR1YWwgY29udGVudC4gT3RoZXIgdXNlIGNhc2VzIGluY2x1ZGUgZGF0YSB0cmFuc2Zvcm1hdGlvbnMsIGdyYXBoaWNzIHRyYW5zZm9ybWF0aW9ucywgX2V0Yy5fXG4gKiAqIF8qKkJvdW5kIHRvIHJlYWwgY29udGVudCoqXzxici8+XG4gKiBTZXQgYG9wdGlvbnMuY29udGVudGAgdG8gdGhlIFwicmVhbFwiIGNvbnRlbnQgZWxlbWVudCBidXQgb21pdCBgb3B0aW9ucy5vbmNoYW5nZWAuIFRoaXMgd2lsbCBjYXVzZSB0aGUgc2Nyb2xsYmFyIHRvIHVzZSB0aGUgYnVpbHQtaW4gZXZlbnQgaGFuZGxlciAoYHRoaXMuc2Nyb2xsUmVhbENvbnRlbnRgKSB3aGljaCBpbXBsZW1lbnRzIHNtb290aCBzY3JvbGxpbmcgb2YgdGhlIGNvbnRlbnQgZWxlbWVudCB3aXRoaW4gdGhlIGNvbnRhaW5lci5cbiAqXG4gKiBAcGFyYW0ge2ZpbmJhck9wdGlvbnN9IFtvcHRpb25zPXt9XSAtIE9wdGlvbnMgb2JqZWN0LiBTZWUgdGhlIHR5cGUgZGVmaW5pdGlvbiBmb3IgbWVtYmVyIGRldGFpbHMuXG4gKi9cbmZ1bmN0aW9uIEZpbkJhcihvcHRpb25zKSB7XG5cbiAgICAvLyBtYWtlIGJvdW5kIHZlcnNpb25zIG9mIGFsbCB0aGUgbW91c2UgZXZlbnQgaGFuZGxlclxuICAgIHZhciBib3VuZCA9IHRoaXMuX2JvdW5kID0ge307XG4gICAgZm9yIChrZXkgaW4gaGFuZGxlcnNUb0JlQm91bmQpIHtcbiAgICAgICAgYm91bmRba2V5XSA9IGhhbmRsZXJzVG9CZUJvdW5kW2tleV0uYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSB0aHVtYlxuICAgICAqIEBzdW1tYXJ5IFRoZSBnZW5lcmF0ZWQgc2Nyb2xsYmFyIHRodW1iIGVsZW1lbnQuXG4gICAgICogQGRlc2MgVGhlIHRodW1iIGVsZW1lbnQncyBwYXJlbnQgZWxlbWVudCBpcyBhbHdheXMgdGhlIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIFRoaXMgcHJvcGVydHkgaXMgdHlwaWNhbGx5IHJlZmVyZW5jZWQgaW50ZXJuYWxseSBvbmx5LiBUaGUgc2l6ZSBhbmQgcG9zaXRpb24gb2YgdGhlIHRodW1iIGVsZW1lbnQgaXMgbWFpbnRhaW5lZCBieSBgX2NhbGNUaHVtYigpYC5cbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHZhciB0aHVtYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRodW1iLmNsYXNzTGlzdC5hZGQoJ3RodW1iJyk7XG4gICAgdGh1bWIub25jbGljayA9IGJvdW5kLnNob3J0U3RvcDtcbiAgICB0aHVtYi5vbm1vdXNlb3ZlciA9IGJvdW5kLm9ubW91c2VvdmVyO1xuICAgIHRoaXMudGh1bWIgPSB0aHVtYjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIGJhclxuICAgICAqIEBzdW1tYXJ5IFRoZSBnZW5lcmF0ZWQgc2Nyb2xsYmFyIGVsZW1lbnQuXG4gICAgICogQGRlc2MgVGhlIGNhbGxlciBpbnNlcnRzIHRoaXMgZWxlbWVudCBpbnRvIHRoZSBET00gKHR5cGljYWxseSBpbnRvIHRoZSBjb250ZW50IGNvbnRhaW5lcikgYW5kIHRoZW4gY2FsbHMgaXRzIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfSBtZXRob2QuXG4gICAgICpcbiAgICAgKiBUaHVzIHRoZSBub2RlIHRyZWUgaXMgdHlwaWNhbGx5OlxuICAgICAqICogQSAqKmNvbnRlbnQgY29udGFpbmVyKiogZWxlbWVudCwgd2hpY2ggY29udGFpbnM6XG4gICAgICogICAgKiBUaGUgY29udGVudCBlbGVtZW50KHMpXG4gICAgICogICAgKiBUaGlzICoqc2Nyb2xsYmFyIGVsZW1lbnQqKiwgd2hpY2ggaW4gdHVybiBjb250YWluczpcbiAgICAgKiAgICAgICAgKiBUaGUgKip0aHVtYiBlbGVtZW50KipcbiAgICAgKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgdmFyIGJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgYmFyLmNsYXNzTGlzdC5hZGQoJ2ZpbmJhci12ZXJ0aWNhbCcpO1xuXG4gICAgYmFyLmFwcGVuZENoaWxkKHRodW1iKTtcbiAgICBpZiAodGhpcy5wYWdpbmcpIHtcbiAgICAgICAgYmFyLm9uY2xpY2sgPSBib3VuZC5vbmNsaWNrO1xuICAgIH1cbiAgICB0aGlzLmJhciA9IGJhcjtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gcHJlc2V0c1xuICAgIHRoaXMub3JpZW50YXRpb24gPSAndmVydGljYWwnO1xuICAgIHRoaXMuX21pbiA9IHRoaXMuX2luZGV4ID0gMDtcbiAgICB0aGlzLl9tYXggPSAxMDA7XG5cbiAgICAvLyBvcHRpb25zXG4gICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ2luZGV4JzpcbiAgICAgICAgICAgICAgICB0aGlzLl9pbmRleCA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAncmFuZ2UnOlxuICAgICAgICAgICAgICAgIHZhbGlkUmFuZ2Uob3B0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9taW4gPSBvcHRpb24ubWluO1xuICAgICAgICAgICAgICAgIHRoaXMuX21heCA9IG9wdGlvbi5tYXg7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IG9wdGlvbi5tYXggLSBvcHRpb24ubWluICsgMTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIGtleS5jaGFyQXQoMCkgIT09ICdfJyAmJlxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgRmluQmFyLnByb3RvdHlwZVtrZXldICE9PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG92ZXJyaWRlIHByb3RvdHlwZSBkZWZhdWx0cyBmb3Igc3RhbmRhcmQgO1xuICAgICAgICAgICAgICAgICAgICAvLyBleHRlbmQgd2l0aCBhZGRpdGlvbmFsIHByb3BlcnRpZXMgKGZvciB1c2UgaW4gb25jaGFuZ2UgZXZlbnQgaGFuZGxlcnMpXG4gICAgICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNzc0luamVjdG9yKGNzc0ZpbkJhcnMsICdmaW5iYXItYmFzZScsIG9wdGlvbnMuY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQpO1xufVxuXG5GaW5CYXIucHJvdG90eXBlID0ge1xuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgVGhlIHNjcm9sbGJhciBvcmllbnRhdGlvbi5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yIHRvIGVpdGhlciBgJ3ZlcnRpY2FsJ2Agb3IgYCdob3Jpem9udGFsJ2AuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogVXNlZnVsIHZhbHVlcyBhcmUgYCd2ZXJ0aWNhbCdgICh0aGUgZGVmYXVsdCkgb3IgYCdob3Jpem9udGFsJ2AuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgcmVzZXRzIGB0aGlzLm9oYCBhbmQgYHRoaXMuZGVsdGFQcm9wYCBhbmQgY2hhbmdlcyB0aGUgY2xhc3MgbmFtZXMgc28gYXMgdG8gcmVwb3NpdGlvbiB0aGUgc2Nyb2xsYmFyIGFzIHBlciB0aGUgQ1NTIHJ1bGVzIGZvciB0aGUgbmV3IG9yaWVudGF0aW9uLlxuICAgICAqIEBkZWZhdWx0ICd2ZXJ0aWNhbCdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgc2V0IG9yaWVudGF0aW9uKG9yaWVudGF0aW9uKSB7XG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gdGhpcy5fb3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX29yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZWFkb25seVxuICAgICAgICAgKiBAbmFtZSBvaFxuICAgICAgICAgKiBAc3VtbWFyeSA8dT5PPC91PnJpZW50YXRpb24gPHU+aDwvdT5hc2ggZm9yIHRoaXMgc2Nyb2xsYmFyLlxuICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGBvcmllbnRhdGlvbmAgc2V0dGVyIHRvIGVpdGhlciB0aGUgdmVydGljYWwgb3IgdGhlIGhvcml6b250YWwgb3JpZW50YXRpb24gaGFzaC4gVGhlIHByb3BlcnR5IHNob3VsZCBhbHdheXMgYmUgc3luY2hyb25pemVkIHdpdGggYG9yaWVudGF0aW9uYDsgZG8gbm90IHVwZGF0ZSBkaXJlY3RseSFcbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZCBpbnRlcm5hbGx5IHRvIGFjY2VzcyBzY3JvbGxiYXJzJyBET00gZWxlbWVudCBwcm9wZXJ0aWVzIGluIGEgZ2VuZXJhbGl6ZWQgd2F5IHdpdGhvdXQgbmVlZGluZyB0byBjb25zdGFudGx5IHF1ZXJ5IHRoZSBzY3JvbGxiYXIgb3JpZW50YXRpb24uIEZvciBleGFtcGxlLCBpbnN0ZWFkIG9mIGV4cGxpY2l0bHkgY29kaW5nIGB0aGlzLmJhci50b3BgIGZvciBhIHZlcnRpY2FsIHNjcm9sbGJhciBhbmQgYHRoaXMuYmFyLmxlZnRgIGZvciBhIGhvcml6b250YWwgc2Nyb2xsYmFyLCBzaW1wbHkgY29kZSBgdGhpcy5iYXJbdGhpcy5vaC5sZWFkaW5nXWAgaW5zdGVhZC4gU2VlIHRoZSB7QGxpbmsgb3JpZW50YXRpb25IYXNoVHlwZX0gZGVmaW5pdGlvbiBmb3IgZGV0YWlscy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZnVsIGV4dGVybmFsbHkgZm9yIGNvZGluZyBnZW5lcmFsaXplZCB7QGxpbmsgZmluYmFyT25DaGFuZ2V9IGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25zIHRoYXQgc2VydmUgYm90aCBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBzY3JvbGxiYXJzLlxuICAgICAgICAgKiBAdHlwZSB7b3JpZW50YXRpb25IYXNoVHlwZX1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub2ggPSBvcmllbnRhdGlvbkhhc2hlc1t0aGlzLl9vcmllbnRhdGlvbl07XG5cbiAgICAgICAgaWYgKCF0aGlzLm9oKSB7XG4gICAgICAgICAgICBlcnJvcignSW52YWxpZCB2YWx1ZSBmb3IgYG9wdGlvbnMuX29yaWVudGF0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIGRlbHRhUHJvcFxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgbmFtZSBvZiB0aGUgYFdoZWVsRXZlbnRgIHByb3BlcnR5IHRoaXMgc2Nyb2xsYmFyIHNob3VsZCBsaXN0ZW4gdG8uXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBVc2VmdWwgdmFsdWVzIGFyZSBgJ2RlbHRhWCdgLCBgJ2RlbHRhWSdgLCBvciBgJ2RlbHRhWidgLiBBIHZhbHVlIG9mIGBudWxsYCBtZWFucyB0byBpZ25vcmUgbW91c2Ugd2hlZWwgZXZlbnRzIGVudGlyZWx5LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGUgbW91c2Ugd2hlZWwgaXMgb25lLWRpbWVuc2lvbmFsIGFuZCBvbmx5IGVtaXRzIGV2ZW50cyB3aXRoIGBkZWx0YVlgIGRhdGEuIFRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgc28gdGhhdCB5b3UgY2FuIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9mIGAnZGVsdGFYJ2Agd2l0aCBhIHZhbHVlIG9mIGAnZGVsdGFZJ2Agb24geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBwcmltYXJpbHkgdG8gYWNjb21tb2RhdGUgY2VydGFpbiBcInBhbm9yYW1pY1wiIGludGVyZmFjZSBkZXNpZ25zIHdoZXJlIHRoZSBtb3VzZSB3aGVlbCBzaG91bGQgY29udHJvbCBob3Jpem9udGFsIHJhdGhlciB0aGFuIHZlcnRpY2FsIHNjcm9sbGluZy4gSnVzdCBnaXZlIGB7IGRlbHRhUHJvcDogJ2RlbHRhWScgfWAgaW4geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBpbnN0YW50aWF0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBDYXZlYXQ6IE5vdGUgdGhhdCBhIDItZmluZ2VyIGRyYWcgb24gYW4gQXBwbGUgdHJhY2twYWQgZW1pdHMgZXZlbnRzIHdpdGggX2JvdGhfIGBkZWx0YVggYCBhbmQgYGRlbHRhWWAgZGF0YSBzbyB5b3UgbWlnaHQgd2FudCB0byBkZWxheSBtYWtpbmcgdGhlIGFib3ZlIGFkanVzdG1lbnQgdW50aWwgeW91IGNhbiBkZXRlcm1pbmUgdGhhdCB5b3UgYXJlIGdldHRpbmcgWSBkYXRhIG9ubHkgd2l0aCBubyBYIGRhdGEgYXQgYWxsICh3aGljaCBpcyBhIHN1cmUgYmV0IHlvdSBvbiBhIG1vdXNlIHdoZWVsIHJhdGhlciB0aGFuIGEgdHJhY2twYWQpLlxuXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsdGFQcm9wID0gdGhpcy5vaC5kZWx0YTtcblxuICAgICAgICB0aGlzLmJhci5jbGFzc05hbWUgPSB0aGlzLmJhci5jbGFzc05hbWUucmVwbGFjZSgvKHZlcnRpY2FsfGhvcml6b250YWwpL2csIG9yaWVudGF0aW9uKTtcblxuICAgICAgICBpZiAodGhpcy5iYXIuc3R5bGUuY3NzVGV4dCB8fCB0aGlzLnRodW1iLnN0eWxlLmNzc1RleHQpIHtcbiAgICAgICAgICAgIHRoaXMuYmFyLnJlbW92ZUF0dHJpYnV0ZSgnc3R5bGUnKTtcbiAgICAgICAgICAgIHRoaXMudGh1bWIucmVtb3ZlQXR0cmlidXRlKCdzdHlsZScpO1xuICAgICAgICAgICAgdGhpcy5yZXNpemUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0IG9yaWVudGF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JpZW50YXRpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IENhbGxiYWNrIGZvciBzY3JvbGwgZXZlbnRzLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IgdmlhIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuIEFmdGVyIGluc3RhbnRpYXRpb24sIGB0aGlzLm9uY2hhbmdlYCBtYXkgYmUgdXBkYXRlZCBkaXJlY3RseS5cbiAgICAgKlxuICAgICAqIFRoaXMgZXZlbnQgaGFuZGxlciBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgaXMgY2hhbmdlZCB0aHJvdWdoIHVzZXIgaW50ZXJhY3Rpb24uIFRoZSB0eXBpY2FsIHVzZSBjYXNlIGlzIHdoZW4gdGhlIGNvbnRlbnQgaXMgc2Nyb2xsZWQuIEl0IGlzIGNhbGxlZCB3aXRoIHRoZSBgRmluQmFyYCBvYmplY3QgYXMgaXRzIGNvbnRleHQgYW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgKGl0cyBpbmRleCwgcm91bmRlZCkgYXMgdGhlIG9ubHkgcGFyYW1ldGVyLlxuICAgICAqXG4gICAgICogU2V0IHRoaXMgcHJvcGVydHkgdG8gYG51bGxgIHRvIHN0b3AgZW1pdHRpbmcgc3VjaCBldmVudHMuXG4gICAgICogQHR5cGUge2Z1bmN0aW9uKG51bWJlcil8bnVsbH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG9uY2hhbmdlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgQWRkIGEgQ1NTIGNsYXNzIG5hbWUgdG8gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdC5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yLiBTZWUgdGhlIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0eSBpbiB0aGUge0BsaW5rIGZpbmJhck9wdGlvbnN9IG9iamVjdC5cbiAgICAgKlxuICAgICAqIFRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3Qgd2lsbCBhbHdheXMgaW5jbHVkZSBgZmluYmFyLXZlcnRpY2FsYCAob3IgYGZpbmJhci1ob3Jpem9udGFsYCBiYXNlZCBvbiB0aGUgY3VycmVudCBvcmllbnRhdGlvbikuIFdoZW5ldmVyIHRoaXMgcHJvcGVydHkgaXMgc2V0IHRvIHNvbWUgdmFsdWUsIGZpcnN0IHRoZSBvbGQgcHJlZml4K29yaWVudGF0aW9uIGlzIHJlbW92ZWQgZnJvbSB0aGUgYmFyIGVsZW1lbnQncyBjbGFzcyBsaXN0OyB0aGVuIHRoZSBuZXcgcHJlZml4K29yaWVudGF0aW9uIGlzIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoaXMgcHJvcGVydHkgY2F1c2VzIF9hbiBhZGRpdGlvbmFsXyBjbGFzcyBuYW1lIHRvIGJlIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoZXJlZm9yZSwgdGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgYWRkIGF0IG1vc3Qgb25lIGFkZGl0aW9uYWwgY2xhc3MgbmFtZSB0byB0aGUgbGlzdC5cbiAgICAgKlxuICAgICAqIFRvIHJlbW92ZSBfY2xhc3NuYW1lLW9yaWVudGF0aW9uXyBmcm9tIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QsIHNldCB0aGlzIHByb3BlcnR5IHRvIGEgZmFsc3kgdmFsdWUsIHN1Y2ggYXMgYG51bGxgLlxuICAgICAqXG4gICAgICogPiBOT1RFOiBZb3Ugb25seSBuZWVkIHRvIHNwZWNpZnkgYW4gYWRkaXRpb25hbCBjbGFzcyBuYW1lIHdoZW4geW91IG5lZWQgdG8gaGF2ZSBtdWxsdGlwbGUgZGlmZmVyZW50IHN0eWxlcyBvZiBzY3JvbGxiYXJzIG9uIHRoZSBzYW1lIHBhZ2UuIElmIHRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQsIHRoZW4geW91IGRvbid0IG5lZWQgdG8gbWFrZSBhIG5ldyBjbGFzczsgeW91IHdvdWxkIGp1c3QgY3JlYXRlIHNvbWUgYWRkaXRpb25hbCBydWxlcyB1c2luZyB0aGUgc2FtZSBzZWxlY3RvcnMgaW4gdGhlIGJ1aWx0LWluIHN0eWxlc2hlZXQgKC4uL2Nzcy9maW5iYXJzLmNzcyk6XG4gICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsYCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbGApIGZvciB0aGUgc2Nyb2xsYmFyXG4gICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsID4gZGl2YCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbCA+IGRpdmApIGZvciB0aGUgXCJ0aHVtYi5cIlxuICAgICAqXG4gICAgICogT2YgY291cnNlLCB5b3VyIHJ1bGVzIHNob3VsZCBjb21lIGFmdGVyIHRoZSBidWlsdC1pbnMuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCBjbGFzc1ByZWZpeChwcmVmaXgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NsYXNzUHJlZml4KSB7XG4gICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuX2NsYXNzUHJlZml4ICsgdGhpcy5vcmllbnRhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jbGFzc1ByZWZpeCA9IHByZWZpeDtcblxuICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QuYWRkKHByZWZpeCArICctJyArIHRoaXMub3JpZW50YXRpb24pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXQgY2xhc3NQcmVmaXgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbGFzc1ByZWZpeDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgaW5jcmVtZW50XG4gICAgICogQHN1bW1hcnkgTnVtYmVyIG9mIHNjcm9sbGJhciBpbmRleCB1bml0cyByZXByZXNlbnRpbmcgYSBwYWdlZnVsLiBVc2VkIGV4Y2x1c2l2ZWx5IGZvciBwYWdpbmcgdXAgYW5kIGRvd24gYW5kIGZvciBzZXR0aW5nIHRodW1iIHNpemUgcmVsYXRpdmUgdG8gY29udGVudCBzaXplLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogQ2FuIGFsc28gYmUgZ2l2ZW4gYXMgYSBwYXJhbWV0ZXIgdG8gdGhlIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZX0gbWV0aG9kLCB3aGljaCBpcyBwZXJ0aW5lbnQgYmVjYXVzZSBjb250ZW50IGFyZWEgc2l6ZSBjaGFuZ2VzIGFmZmVjdCB0aGUgZGVmaW5pdGlvbiBvZiBhIFwicGFnZWZ1bC5cIiBIb3dldmVyLCB5b3Ugb25seSBuZWVkIHRvIGRvIHRoaXMgaWYgdGhpcyB2YWx1ZSBpcyBiZWluZyB1c2VkLiBJdCBub3QgdXNlZCB3aGVuOlxuICAgICAqICogeW91IGRlZmluZSBgcGFnaW5nLnVwYCBhbmQgYHBhZ2luZy5kb3duYFxuICAgICAqICogeW91ciBzY3JvbGxiYXIgaXMgdXNpbmcgYHNjcm9sbFJlYWxDb250ZW50YFxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBpbmNyZW1lbnQ6IDEsXG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBiYXJTdHlsZXNcbiAgICAgKiBAc3VtbWFyeSBTY3JvbGxiYXIgc3R5bGVzIHRvIGJlIGFwcGxpZWQgYnkge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9LlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBhIHZhbHVlIHRvIGJlIGFzc2lnbmVkIHRvIHtAbGluayBGaW5CYXIjc3R5bGVzfHN0eWxlc30gb24gZWFjaCBjYWxsIHRvIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfS4gVGhhdCBpcywgYSBoYXNoIG9mIHZhbHVlcyB0byBiZSBjb3BpZWQgdG8gdGhlIHNjcm9sbGJhciBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IG9uIHJlc2l6ZTsgb3IgYG51bGxgIGZvciBub25lLlxuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3N0eWxlfHN0eWxlfVxuICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN8bnVsbH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGJhclN0eWxlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHN0eWxlXG4gICAgICogQHN1bW1hcnkgQWRkaXRpb25hbCBzY3JvbGxiYXIgc3R5bGVzLlxuICAgICAqIEBkZXNjIFNlZSB0eXBlIGRlZmluaXRpb24gZm9yIG1vcmUgZGV0YWlscy4gVGhlc2Ugc3R5bGVzIGFyZSBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSBzY3JvbGxiYXIncyBgYmFyYCBlbGVtZW50LlxuICAgICAqXG4gICAgICogVmFsdWVzIGFyZSBhZGp1c3RlZCBhcyBmb2xsb3dzIGJlZm9yZSBiZWluZyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50OlxuICAgICAqIDEuIEluY2x1ZGVkIFwicHNldWRvLXByb3BlcnR5XCIgbmFtZXMgZnJvbSB0aGUgc2Nyb2xsYmFyJ3Mgb3JpZW50YXRpb24gaGFzaCwge0BsaW5rIEZpbkJhciNvaHxvaH0sIGFyZSB0cmFuc2xhdGVkIHRvIGFjdHVhbCBwcm9wZXJ0eSBuYW1lcyBiZWZvcmUgYmVpbmcgYXBwbGllZC5cbiAgICAgKiAyLiBXaGVuIHRoZXJlIGFyZSBtYXJnaW5zLCBwZXJjZW50YWdlcyBhcmUgdHJhbnNsYXRlZCB0byBhYnNvbHV0ZSBwaXhlbCB2YWx1ZXMgYmVjYXVzZSBDU1MgaWdub3JlcyBtYXJnaW5zIGluIGl0cyBwZXJjZW50YWdlIGNhbGN1bGF0aW9ucy5cbiAgICAgKiAzLiBJZiB5b3UgZ2l2ZSBhIHZhbHVlIHdpdGhvdXQgYSB1bml0IChhIHJhdyBudW1iZXIpLCBcInB4XCIgdW5pdCBpcyBhcHBlbmRlZC5cbiAgICAgKlxuICAgICAqIEdlbmVyYWwgbm90ZXM6XG4gICAgICogMS4gSXQgaXMgYWx3YXlzIHByZWZlcmFibGUgdG8gc3BlY2lmeSBzdHlsZXMgdmlhIGEgc3R5bGVzaGVldC4gT25seSBzZXQgdGhpcyBwcm9wZXJ0eSB3aGVuIHlvdSBuZWVkIHRvIHNwZWNpZmljYWxseSBvdmVycmlkZSAoYSkgc3R5bGVzaGVldCB2YWx1ZShzKS5cbiAgICAgKiAyLiBDYW4gYmUgc2V0IGRpcmVjdGx5IG9yIHZpYSBjYWxscyB0byB0aGUge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplfSBtZXRob2QuXG4gICAgICogMy4gU2hvdWxkIG9ubHkgYmUgc2V0IGFmdGVyIHRoZSBzY3JvbGxiYXIgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIDQuIEJlZm9yZSBhcHBseWluZyB0aGVzZSBuZXcgdmFsdWVzIHRvIHRoZSBlbGVtZW50LCBfYWxsXyBpbi1saW5lIHN0eWxlIHZhbHVlcyBhcmUgcmVzZXQgKGJ5IHJlbW92aW5nIHRoZSBlbGVtZW50J3MgYHN0eWxlYCBhdHRyaWJ1dGUpLCBleHBvc2luZyBpbmhlcml0ZWQgdmFsdWVzIChmcm9tIHN0eWxlc2hlZXRzKS5cbiAgICAgKiA1LiBFbXB0eSBvYmplY3QgaGFzIG5vIGVmZmVjdC5cbiAgICAgKiA2LiBGYWxzZXkgdmFsdWUgaW4gcGxhY2Ugb2Ygb2JqZWN0IGhhcyBubyBlZmZlY3QuXG4gICAgICpcbiAgICAgKiA+IENBVkVBVDogRG8gbm90IGF0dGVtcHQgdG8gdHJlYXQgdGhlIG9iamVjdCB5b3UgYXNzaWduIHRvIHRoaXMgcHJvcGVydHkgYXMgaWYgaXQgd2VyZSBgdGhpcy5iYXIuc3R5bGVgLiBTcGVjaWZpY2FsbHksIGNoYW5naW5nIHRoaXMgb2JqZWN0IGFmdGVyIGFzc2lnbmluZyBpdCB3aWxsIGhhdmUgbm8gZWZmZWN0IG9uIHRoZSBzY3JvbGxiYXIuIFlvdSBtdXN0IGFzc2lnbiBpdCBhZ2FpbiBpZiB5b3Ugd2FudCBpdCB0byBoYXZlIGFuIGVmZmVjdC5cbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNiYXJTdHlsZXN8YmFyU3R5bGVzfVxuICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBzZXQgc3R5bGUoc3R5bGVzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3R5bGVzID0gZXh0ZW5kKHt9LCBzdHlsZXMsIHRoaXMuX2F1eFN0eWxlcykpO1xuXG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIGJhciA9IHRoaXMuYmFyLFxuICAgICAgICAgICAgICAgIGJhclJlY3QgPSBiYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyID0gdGhpcy5jb250YWluZXIgfHwgYmFyLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgICAgICBvaCA9IHRoaXMub2g7XG5cbiAgICAgICAgICAgIC8vIEJlZm9yZSBhcHBseWluZyBuZXcgc3R5bGVzLCByZXZlcnQgYWxsIHN0eWxlcyB0byB2YWx1ZXMgaW5oZXJpdGVkIGZyb20gc3R5bGVzaGVldHNcbiAgICAgICAgICAgIGJhci5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG5cbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IHN0eWxlc1trZXldO1xuXG4gICAgICAgICAgICAgICAgaWYgKGtleSBpbiBvaCkge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBvaFtrZXldO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHZhbCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbCA9ICh2YWwgfHwgMCkgKyAncHgnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoLyUkLy50ZXN0KHZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBiYXIgc2l6ZSBnaXZlbiBhcyBwZXJjZW50YWdlIG9mIGNvbnRhaW5lciwgaWYgYmFyIGhhcyBtYXJnaW5zLCByZXN0YXRlIHNpemUgaW4gcGl4ZWxzIGxlc3MgbWFyZ2lucy5cbiAgICAgICAgICAgICAgICAgICAgLy8gKElmIGxlZnQgYXMgcGVyY2VudGFnZSwgQ1NTJ3MgY2FsY3VsYXRpb24gd2lsbCBub3QgZXhjbHVkZSBtYXJnaW5zLilcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWVudGVkID0gYXhpc1trZXldLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2lucyA9IGJhclJlY3Rbb3JpZW50ZWQubWFyZ2luTGVhZGluZ10gKyBiYXJSZWN0W29yaWVudGVkLm1hcmdpblRyYWlsaW5nXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hcmdpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHBhcnNlSW50KHZhbCwgMTApIC8gMTAwICogY29udGFpbmVyUmVjdFtvcmllbnRlZC5zaXplXSAtIG1hcmdpbnMgKyAncHgnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYmFyLnN0eWxlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAbmFtZSBwYWdpbmdcbiAgICAgKiBAc3VtbWFyeSBFbmFibGUgcGFnZSB1cC9kbiBjbGlja3MuXG4gICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICpcbiAgICAgKiBJZiB0cnV0aHksIGxpc3RlbiBmb3IgY2xpY2tzIGluIHBhZ2UtdXAgYW5kIHBhZ2UtZG93biByZWdpb25zIG9mIHNjcm9sbGJhci5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCwgY2FsbCBgLnBhZ2luZy51cCgpYCBvbiBwYWdlLXVwIGNsaWNrcyBhbmQgYC5wYWdpbmcuZG93bigpYCB3aWxsIGJlIGNhbGxlZCBvbiBwYWdlLWRvd24gY2xpY2tzLlxuICAgICAqXG4gICAgICogQ2hhbmdpbmcgdGhlIHRydXRoaW5lc3Mgb2YgdGhpcyB2YWx1ZSBhZnRlciBpbnN0YW50aWF0aW9uIGN1cnJlbnRseSBoYXMgbm8gZWZmZWN0LlxuICAgICAqIEB0eXBlIHtib29sZWFufG9iamVjdH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHBhZ2luZzogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHJhbmdlXG4gICAgICogQHN1bW1hcnkgU2V0dGVyIGZvciB0aGUgbWluaW11bSBhbmQgbWF4aW11bSBzY3JvbGwgdmFsdWVzLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFRoZXNlIHZhbHVlcyBhcmUgdGhlIGxpbWl0cyBmb3Ige0BsaW5rIEZvb0JhciNpbmRleHxpbmRleH0uXG4gICAgICpcbiAgICAgKiBUaGUgc2V0dGVyIGFjY2VwdHMgYW4gb2JqZWN0IHdpdGggZXhhY3RseSB0d28gbnVtZXJpYyBwcm9wZXJ0aWVzOiBgLm1pbmAgd2hpY2ggbXVzdCBiZSBsZXNzIHRoYW4gYC5tYXhgLiBUaGUgdmFsdWVzIGFyZSBleHRyYWN0ZWQgYW5kIHRoZSBvYmplY3QgaXMgZGlzY2FyZGVkLlxuICAgICAqXG4gICAgICogVGhlIGdldHRlciByZXR1cm5zIGEgbmV3IG9iamVjdCB3aXRoIGAubWluYCBhbmQgJy5tYXhgLlxuICAgICAqXG4gICAgICogQHR5cGUge3JhbmdlVHlwZX1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCByYW5nZShyYW5nZSkge1xuICAgICAgICB2YWxpZFJhbmdlKHJhbmdlKTtcbiAgICAgICAgdGhpcy5fbWluID0gcmFuZ2UubWluO1xuICAgICAgICB0aGlzLl9tYXggPSByYW5nZS5tYXg7XG4gICAgICAgIHRoaXMuY29udGVudFNpemUgPSByYW5nZS5tYXggLSByYW5nZS5taW4gKyAxO1xuICAgICAgICB0aGlzLmluZGV4ID0gdGhpcy5pbmRleDsgLy8gcmUtY2xhbXBcbiAgICB9LFxuICAgIGdldCByYW5nZSgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1pbjogdGhpcy5fbWluLFxuICAgICAgICAgICAgbWF4OiB0aGlzLl9tYXhcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgSW5kZXggdmFsdWUgb2YgdGhlIHNjcm9sbGJhci5cbiAgICAgKiBAZGVzYyBUaGlzIGlzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc2Nyb2xsIHRodW1iLlxuICAgICAqXG4gICAgICogU2V0dGluZyB0aGlzIHZhbHVlIGNsYW1wcyBpdCB0byB7QGxpbmsgRmluQmFyI21pbnxtaW59Li57QGxpbmsgRmluQmFyI21heHxtYXh9LCBzY3JvbGwgdGhlIGNvbnRlbnQsIGFuZCBtb3ZlcyB0aHVtYi5cbiAgICAgKlxuICAgICAqIEdldHRpbmcgdGhpcyB2YWx1ZSByZXR1cm5zIHRoZSBjdXJyZW50IGluZGV4LiBUaGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSBpbiB0aGUgcmFuZ2UgYG1pbmAuLmBtYXhgLiBJdCBpcyBpbnRlbnRpb25hbGx5IG5vdCByb3VuZGVkLlxuICAgICAqXG4gICAgICogVXNlIHRoaXMgdmFsdWUgYXMgYW4gYWx0ZXJuYXRpdmUgdG8gKG9yIGluIGFkZGl0aW9uIHRvKSB1c2luZyB0aGUge0BsaW5rIEZpbkJhciNvbmNoYW5nZXxvbmNoYW5nZX0gY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjX3NldFNjcm9sbHxfc2V0U2Nyb2xsfVxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBzZXQgaW5kZXgoaWR4KSB7XG4gICAgICAgIGlkeCA9IE1hdGgubWluKHRoaXMuX21heCwgTWF0aC5tYXgodGhpcy5fbWluLCBpZHgpKTsgLy8gY2xhbXAgaXRcbiAgICAgICAgdGhpcy5fc2V0U2Nyb2xsKGlkeCk7XG4gICAgICAgIC8vIHRoaXMuX3NldFRodW1iU2l6ZSgpO1xuICAgIH0sXG4gICAgZ2V0IGluZGV4KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN1bW1hcnkgTW92ZSB0aGUgdGh1bWIuXG4gICAgICogQGRlc2MgQWxzbyBkaXNwbGF5cyB0aGUgaW5kZXggdmFsdWUgaW4gdGhlIHRlc3QgcGFuZWwgYW5kIGludm9rZXMgdGhlIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSBpZHggLSBUaGUgbmV3IHNjcm9sbCBpbmRleCwgYSB2YWx1ZSBpbiB0aGUgcmFuZ2UgYG1pbmAuLmBtYXhgLlxuICAgICAqIEBwYXJhbSBbc2NhbGVkPWYoaWR4KV0gLSBUaGUgbmV3IHRodW1iIHBvc2l0aW9uIGluIHBpeGVscyBhbmQgc2NhbGVkIHJlbGF0aXZlIHRvIHRoZSBjb250YWluaW5nIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudCwgaS5lLiwgYSBwcm9wb3J0aW9uYWwgbnVtYmVyIGluIHRoZSByYW5nZSBgMGAuLmB0aHVtYk1heGAuIFdoZW4gb21pdHRlZCwgYSBmdW5jdGlvbiBvZiBgaWR4YCBpcyB1c2VkLlxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgX3NldFNjcm9sbDogZnVuY3Rpb24gKGlkeCwgc2NhbGVkKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaWR4O1xuXG4gICAgICAgIC8vIERpc3BsYXkgdGhlIGluZGV4IHZhbHVlIGluIHRoZSB0ZXN0IHBhbmVsXG4gICAgICAgIGlmICh0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtLmluZGV4IGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgdGhpcy50ZXN0UGFuZWxJdGVtLmluZGV4LmlubmVySFRNTCA9IE1hdGgucm91bmQoaWR4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uY2hhbmdlKSB7XG4gICAgICAgICAgICB0aGlzLm9uY2hhbmdlLmNhbGwodGhpcywgTWF0aC5yb3VuZChpZHgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIHRodW1iXG4gICAgICAgIGlmIChzY2FsZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2NhbGVkID0gKGlkeCAtIHRoaXMuX21pbikgLyAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSAqIHRoaXMuX3RodW1iTWF4O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGh1bWIuc3R5bGVbdGhpcy5vaC5sZWFkaW5nXSA9IHNjYWxlZCArICdweCc7XG4gICAgfSxcblxuICAgIHNjcm9sbFJlYWxDb250ZW50OiBmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgIHZhciBjb250YWluZXJSZWN0ID0gdGhpcy5jb250ZW50LnBhcmVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICBzaXplUHJvcCA9IHRoaXMub2guc2l6ZSxcbiAgICAgICAgICAgIG1heFNjcm9sbCA9IE1hdGgubWF4KDAsIHRoaXMuY29udGVudFtzaXplUHJvcF0gLSBjb250YWluZXJSZWN0W3NpemVQcm9wXSksXG4gICAgICAgICAgICAvL3Njcm9sbCA9IE1hdGgubWluKGlkeCwgbWF4U2Nyb2xsKTtcbiAgICAgICAgICAgIHNjcm9sbCA9IChpZHggLSB0aGlzLl9taW4pIC8gKHRoaXMuX21heCAtIHRoaXMuX21pbikgKiBtYXhTY3JvbGw7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ3Njcm9sbDogJyArIHNjcm9sbCk7XG4gICAgICAgIHRoaXMuY29udGVudC5zdHlsZVt0aGlzLm9oLmxlYWRpbmddID0gLXNjcm9sbCArICdweCc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFJlY2FsY3VsYXRlIHRodW1iIHBvc2l0aW9uLlxuICAgICAqXG4gICAgICogQGRlc2MgVGhpcyBtZXRob2QgcmVjYWxjdWxhdGVzIHRoZSB0aHVtYiBzaXplIGFuZCBwb3NpdGlvbi4gQ2FsbCBpdCBvbmNlIGFmdGVyIGluc2VydGluZyB5b3VyIHNjcm9sbGJhciBpbnRvIHRoZSBET00sIGFuZCByZXBlYXRlZGx5IHdoaWxlIHJlc2l6aW5nIHRoZSBzY3JvbGxiYXIgKHdoaWNoIHR5cGljYWxseSBoYXBwZW5zIHdoZW4gdGhlIHNjcm9sbGJhcidzIHBhcmVudCBpcyByZXNpemVkIGJ5IHVzZXIuXG4gICAgICpcbiAgICAgKiA+IFRoaXMgZnVuY3Rpb24gc2hpZnRzIGFyZ3MgaWYgZmlyc3QgYXJnIG9taXR0ZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2luY3JlbWVudD10aGlzLmluY3JlbWVudF0gLSBSZXNldHMge0BsaW5rIEZvb0JhciNpbmNyZW1lbnR8aW5jcmVtZW50fSAoc2VlKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZmluYmFyU3R5bGVzfSBbYmFyU3R5bGVzPXRoaXMuYmFyU3R5bGVzXSAtIChTZWUgdHlwZSBkZWZpbml0aW9uIGZvciBkZXRhaWxzLikgU2Nyb2xsYmFyIHN0eWxlcyB0byBiZSBhcHBsaWVkIHRvIHRoZSBiYXIgZWxlbWVudC5cbiAgICAgKlxuICAgICAqIE9ubHkgc3BlY2lmeSBhIGBiYXJTdHlsZXNgIG9iamVjdCB3aGVuIHlvdSBuZWVkIHRvIG92ZXJyaWRlIHN0eWxlc2hlZXQgdmFsdWVzLiBJZiBwcm92aWRlZCwgYmVjb21lcyB0aGUgbmV3IGRlZmF1bHQgKGB0aGlzLmJhclN0eWxlc2ApLCBmb3IgdXNlIGFzIGEgZGVmYXVsdCBvbiBzdWJzZXF1ZW50IGNhbGxzLlxuICAgICAqXG4gICAgICogSXQgaXMgZ2VuZXJhbGx5IHRoZSBjYXNlIHRoYXQgdGhlIHNjcm9sbGJhcidzIG5ldyBwb3NpdGlvbiBpcyBzdWZmaWNpZW50bHkgZGVzY3JpYmVkIGJ5IHRoZSBjdXJyZW50IHN0eWxlcy4gVGhlcmVmb3JlLCBpdCBpcyB1bnVzdWFsIHRvIG5lZWQgdG8gcHJvdmlkZSBhIGBiYXJTdHlsZXNgIG9iamVjdCBvbiBldmVyeSBjYWxsIHRvIGByZXNpemVgLlxuICAgICAqXG4gICAgICogQHJldHVybnMge0ZpbkJhcn0gU2VsZiBmb3IgY2hhaW5pbmcuXG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICByZXNpemU6IGZ1bmN0aW9uIChpbmNyZW1lbnQsIGJhclN0eWxlcykge1xuICAgICAgICB2YXIgYmFyID0gdGhpcy5iYXI7XG5cbiAgICAgICAgaWYgKCFiYXIucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub3QgaW4gRE9NIHlldCBzbyBub3RoaW5nIHRvIGRvXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5jb250YWluZXIgfHwgYmFyLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICBjb250YWluZXJSZWN0ID0gY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIC8vIHNoaWZ0IGFyZ3MgaWYgaWYgMXN0IGFyZyBvbWl0dGVkXG4gICAgICAgIGlmICh0eXBlb2YgaW5jcmVtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgYmFyU3R5bGVzID0gaW5jcmVtZW50O1xuICAgICAgICAgICAgaW5jcmVtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHlsZSA9IHRoaXMuYmFyU3R5bGVzID0gYmFyU3R5bGVzIHx8IHRoaXMuYmFyU3R5bGVzO1xuXG4gICAgICAgIC8vIEJvdW5kIHRvIHJlYWwgY29udGVudDogQ29udGVudCB3YXMgZ2l2ZW4gYnV0IG5vIG9uY2hhbmdlIGhhbmRsZXIuXG4gICAgICAgIC8vIFNldCB1cCAub25jaGFuZ2UsIC5jb250YWluZXJTaXplLCBhbmQgLmluY3JlbWVudC5cbiAgICAgICAgLy8gTm90ZSB0aGlzIG9ubHkgbWFrZXMgc2Vuc2UgaWYgeW91ciBpbmRleCB1bml0IGlzIHBpeGVscy5cbiAgICAgICAgaWYgKHRoaXMuY29udGVudCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLm9uY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9IHRoaXMuc2Nyb2xsUmVhbENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IHRoaXMuY29udGVudFt0aGlzLm9oLnNpemVdO1xuICAgICAgICAgICAgICAgIHRoaXMuX21pbiA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWF4ID0gdGhpcy5jb250ZW50U2l6ZSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub25jaGFuZ2UgPT09IHRoaXMuc2Nyb2xsUmVhbENvbnRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyU2l6ZSA9IGNvbnRhaW5lclJlY3RbdGhpcy5vaC5zaXplXTtcbiAgICAgICAgICAgIHRoaXMuaW5jcmVtZW50ID0gdGhpcy5jb250YWluZXJTaXplIC8gKHRoaXMuY29udGVudFNpemUgLSB0aGlzLmNvbnRhaW5lclNpemUpICogKHRoaXMuX21heCAtIHRoaXMuX21pbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lclNpemUgPSAxO1xuICAgICAgICAgICAgdGhpcy5pbmNyZW1lbnQgPSBpbmNyZW1lbnQgfHwgdGhpcy5pbmNyZW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmluZGV4O1xuICAgICAgICB0aGlzLnRlc3RQYW5lbEl0ZW0gPSB0aGlzLnRlc3RQYW5lbEl0ZW0gfHwgdGhpcy5fYWRkVGVzdFBhbmVsSXRlbSgpO1xuICAgICAgICB0aGlzLl9zZXRUaHVtYlNpemUoKTtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuXG4gICAgICAgIGlmICh0aGlzLmRlbHRhUHJvcCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3doZWVsJywgdGhpcy5fYm91bmQub253aGVlbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgU2hvcnRlbiB0cmFpbGluZyBlbmQgb2Ygc2Nyb2xsYmFyIGJ5IHRoaWNrbmVzcyBvZiBzb21lIG90aGVyIHNjcm9sbGJhci5cbiAgICAgKiBAZGVzYyBJbiB0aGUgXCJjbGFzc2ljYWxcIiBzY2VuYXJpbyB3aGVyZSB2ZXJ0aWNhbCBzY3JvbGwgYmFyIGlzIG9uIHRoZSByaWdodCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxiYXIgaXMgb24gdGhlIGJvdHRvbSwgeW91IHdhbnQgdG8gc2hvcnRlbiB0aGUgXCJ0cmFpbGluZyBlbmRcIiAoYm90dG9tIGFuZCByaWdodCBlbmRzLCByZXNwZWN0aXZlbHkpIG9mIGF0IGxlYXN0IG9uZSBvZiB0aGVtIHNvIHRoZXkgZG9uJ3Qgb3ZlcmxheS5cbiAgICAgKlxuICAgICAqIFRoaXMgY29udmVuaWVuY2UgZnVuY3Rpb24gaXMgYW4gcHJvZ3JhbW1hdGljIGFsdGVybmF0aXZlIHRvIGhhcmRjb2RpbmcgdGhlIGNvcnJlY3Qgc3R5bGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSBpbiB5b3VyIHN0eWxlc2hlZXQ7IG9yIHNldHRpbmcgdGhlIGNvcnJlY3Qgc3R5bGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSBpbiB0aGUge0BsaW5rIEZpbkJhciNiYXJTdHlsZXN8YmFyU3R5bGVzfSBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjZm9yZXNob3J0ZW5CeXxmb3Jlc2hvcnRlbkJ5fS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmluQmFyfG51bGx9IG90aGVyRmluQmFyIC0gT3RoZXIgc2Nyb2xsYmFyIHRvIGF2b2lkIGJ5IHNob3J0ZW5pbmcgdGhpcyBvbmU7IGBudWxsYCByZW1vdmVzIHRoZSB0cmFpbGluZyBzcGFjZVxuICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIHNob3J0ZW5CeTogZnVuY3Rpb24gKG90aGVyRmluQmFyKSB7IHJldHVybiB0aGlzLnNob3J0ZW5FbmRCeSgndHJhaWxpbmcnLCBvdGhlckZpbkJhcik7IH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBTaG9ydGVuIGxlYWRpbmcgZW5kIG9mIHNjcm9sbGJhciBieSB0aGlja25lc3Mgb2Ygc29tZSBvdGhlciBzY3JvbGxiYXIuXG4gICAgICogQGRlc2MgU3VwcG9ydHMgbm9uLWNsYXNzaWNhbCBzY3JvbGxiYXIgc2NlbmFyaW9zIHdoZXJlIHZlcnRpY2FsIHNjcm9sbCBiYXIgbWF5IGJlIG9uIGxlZnQgYW5kIGhvcml6b250YWwgc2Nyb2xsYmFyIG1heSBiZSBvbiB0b3AsIGluIHdoaWNoIGNhc2UgeW91IHdhbnQgdG8gc2hvcnRlbiB0aGUgXCJsZWFkaW5nIGVuZFwiIHJhdGhlciB0aGFuIHRoZSB0cmFpbGluZyBlbmQuXG4gICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3Nob3J0ZW5CeXxzaG9ydGVuQnl9LlxuICAgICAqIEBwYXJhbSB7RmluQmFyfG51bGx9IG90aGVyRmluQmFyIC0gT3RoZXIgc2Nyb2xsYmFyIHRvIGF2b2lkIGJ5IHNob3J0ZW5pbmcgdGhpcyBvbmU7IGBudWxsYCByZW1vdmVzIHRoZSB0cmFpbGluZyBzcGFjZVxuICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIGZvcmVzaG9ydGVuQnk6IGZ1bmN0aW9uIChvdGhlckZpbkJhcikgeyByZXR1cm4gdGhpcy5zaG9ydGVuRW5kQnkoJ2xlYWRpbmcnLCBvdGhlckZpbkJhcik7IH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBHZW5lcmFsaXplZCBzaG9ydGVuaW5nIGZ1bmN0aW9uLlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNzaG9ydGVuQnl8c2hvcnRlbkJ5fS5cbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjZm9yZXNob3J0ZW5CeXxmb3Jlc2hvcnRlbkJ5fS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gd2hpY2hFbmQgLSBhIENTUyBzdHlsZSBwcm9wZXJ0eSBuYW1lIG9yIGFuIG9yaWVudGF0aW9uIGhhc2ggbmFtZSB0aGF0IHRyYW5zbGF0ZXMgdG8gYSBDU1Mgc3R5bGUgcHJvcGVydHkgbmFtZS5cbiAgICAgKiBAcGFyYW0ge0ZpbkJhcnxudWxsfSBvdGhlckZpbkJhciAtIE90aGVyIHNjcm9sbGJhciB0byBhdm9pZCBieSBzaG9ydGVuaW5nIHRoaXMgb25lOyBgbnVsbGAgcmVtb3ZlcyB0aGUgdHJhaWxpbmcgc3BhY2VcbiAgICAgKiBAcmV0dXJucyB7RmluQmFyfSBGb3IgY2hhaW5pbmdcbiAgICAgKi9cbiAgICBzaG9ydGVuRW5kQnk6IGZ1bmN0aW9uICh3aGljaEVuZCwgb3RoZXJGaW5CYXIpIHtcbiAgICAgICAgaWYgKCFvdGhlckZpbkJhcikge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2F1eFN0eWxlcztcbiAgICAgICAgfSBlbHNlIGlmIChvdGhlckZpbkJhciBpbnN0YW5jZW9mIEZpbkJhciAmJiBvdGhlckZpbkJhci5vcmllbnRhdGlvbiAhPT0gdGhpcy5vcmllbnRhdGlvbikge1xuICAgICAgICAgICAgdmFyIG90aGVyU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvdGhlckZpbkJhci5iYXIpLFxuICAgICAgICAgICAgICAgIG9vaCA9IG9yaWVudGF0aW9uSGFzaGVzW290aGVyRmluQmFyLm9yaWVudGF0aW9uXTtcbiAgICAgICAgICAgIHRoaXMuX2F1eFN0eWxlcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5fYXV4U3R5bGVzW3doaWNoRW5kXSA9IG90aGVyU3R5bGVbb29oLnRoaWNrbmVzc107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmluZ1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdW1tYXJ5IFNldHMgdGhlIHByb3BvcnRpb25hbCB0aHVtYiBzaXplIGFuZCBoaWRlcyB0aHVtYiB3aGVuIDEwMCUuXG4gICAgICogQGRlc2MgVGhlIHRodW1iIHNpemUgaGFzIGFuIGFic29sdXRlIG1pbmltdW0gb2YgMjAgKHBpeGVscykuXG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBfc2V0VGh1bWJTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvaCA9IHRoaXMub2gsXG4gICAgICAgICAgICB0aHVtYkNvbXAgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLnRodW1iKSxcbiAgICAgICAgICAgIHRodW1iTWFyZ2luTGVhZGluZyA9IHBhcnNlSW50KHRodW1iQ29tcFtvaC5tYXJnaW5MZWFkaW5nXSksXG4gICAgICAgICAgICB0aHVtYk1hcmdpblRyYWlsaW5nID0gcGFyc2VJbnQodGh1bWJDb21wW29oLm1hcmdpblRyYWlsaW5nXSksXG4gICAgICAgICAgICB0aHVtYk1hcmdpbnMgPSB0aHVtYk1hcmdpbkxlYWRpbmcgKyB0aHVtYk1hcmdpblRyYWlsaW5nLFxuICAgICAgICAgICAgYmFyU2l6ZSA9IHRoaXMuYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW29oLnNpemVdLFxuICAgICAgICAgICAgdGh1bWJTaXplID0gTWF0aC5tYXgoMjAsIGJhclNpemUgKiB0aGlzLmNvbnRhaW5lclNpemUgLyB0aGlzLmNvbnRlbnRTaXplKTtcblxuICAgICAgICBpZiAodGhpcy5jb250YWluZXJTaXplIDwgdGhpcy5jb250ZW50U2l6ZSkge1xuICAgICAgICAgICAgdGhpcy5iYXIuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHRoaXMudGh1bWIuc3R5bGVbb2guc2l6ZV0gPSB0aHVtYlNpemUgKyAncHgnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5iYXIuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBuYW1lIF90aHVtYk1heFxuICAgICAgICAgKiBAc3VtbWFyeSBNYXhpbXVtIG9mZnNldCBvZiB0aHVtYidzIGxlYWRpbmcgZWRnZS5cbiAgICAgICAgICogQGRlc2MgVGhpcyBpcyB0aGUgcGl4ZWwgb2Zmc2V0IHdpdGhpbiB0aGUgc2Nyb2xsYmFyIG9mIHRoZSB0aHVtYiB3aGVuIGl0IGlzIGF0IGl0cyBtYXhpbXVtIHBvc2l0aW9uIGF0IHRoZSBleHRyZW1lIGVuZCBvZiBpdHMgcmFuZ2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgdmFsdWUgdGFrZXMgaW50byBhY2NvdW50IHRoZSBuZXdseSBjYWxjdWxhdGVkIHNpemUgb2YgdGhlIHRodW1iIGVsZW1lbnQgKGluY2x1ZGluZyBpdHMgbWFyZ2lucykgYW5kIHRoZSBpbm5lciBzaXplIG9mIHRoZSBzY3JvbGxiYXIgKHRoZSB0aHVtYidzIGNvbnRhaW5pbmcgZWxlbWVudCwgaW5jbHVkaW5nIF9pdHNfIG1hcmdpbnMpLlxuICAgICAgICAgKlxuICAgICAgICAgKiBOT1RFOiBTY3JvbGxiYXIgcGFkZGluZyBpcyBub3QgdGFrZW4gaW50byBhY2NvdW50IGFuZCBhc3N1bWVkIHRvIGJlIDAgaW4gdGhlIGN1cnJlbnQgaW1wbGVtZW50YXRpb24gYW5kIGlzIGFzc3VtZWQgdG8gYmUgYDBgOyB1c2UgdGh1bWIgbWFyZ2lucyBpbiBwbGFjZSBvZiBzY3JvbGxiYXIgcGFkZGluZy5cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3RodW1iTWF4ID0gYmFyU2l6ZSAtIHRodW1iU2l6ZSAtIHRodW1iTWFyZ2lucztcblxuICAgICAgICB0aGlzLl90aHVtYk1hcmdpbkxlYWRpbmcgPSB0aHVtYk1hcmdpbkxlYWRpbmc7IC8vIHVzZWQgaW4gbW91c2Vkb3duXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFJlbW92ZSB0aGUgc2Nyb2xsYmFyLlxuICAgICAqIEBkZXNjIFVuaG9va3MgYWxsIHRoZSBldmVudCBoYW5kbGVycyBhbmQgdGhlbiByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlIERPTS4gQWx3YXlzIGNhbGwgdGhpcyBtZXRob2QgcHJpb3IgdG8gZGlzcG9zaW5nIG9mIHRoZSBzY3JvbGxiYXIgb2JqZWN0LlxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vkb3duJyk7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgICh0aGlzLmNvbnRhaW5lciB8fCB0aGlzLmJhci5wYXJlbnRFbGVtZW50KS5fcmVtb3ZlRXZ0KCd3aGVlbCcsIHRoaXMuX2JvdW5kLm9ud2hlZWwpO1xuXG4gICAgICAgIHRoaXMuYmFyLm9uY2xpY2sgPVxuICAgICAgICAgICAgdGhpcy50aHVtYi5vbmNsaWNrID1cbiAgICAgICAgICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdmVyID1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aHVtYi50cmFuc2l0aW9uZW5kID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGh1bWIub25tb3VzZW91dCA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5iYXIucmVtb3ZlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uIF9hZGRUZXN0UGFuZWxJdGVtXG4gICAgICogQHN1bW1hcnkgQXBwZW5kIGEgdGVzdCBwYW5lbCBlbGVtZW50LlxuICAgICAqIEBkZXNjIElmIHRoZXJlIGlzIGEgdGVzdCBwYW5lbCBpbiB0aGUgRE9NICh0eXBpY2FsbHkgYW4gYDxvbD4uLi48L29sPmAgZWxlbWVudCkgd2l0aCBjbGFzcyBuYW1lcyBvZiBib3RoIGB0aGlzLmNsYXNzUHJlZml4YCBhbmQgYCd0ZXN0LXBhbmVsJ2AgKG9yLCBiYXJyaW5nIHRoYXQsIGFueSBlbGVtZW50IHdpdGggY2xhc3MgbmFtZSBgJ3Rlc3QtcGFuZWwnYCksIGFuIGA8bGk+Li4uPC9saT5gIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkIGFuZCBhcHBlbmRlZCB0byBpdC4gVGhpcyBuZXcgZWxlbWVudCB3aWxsIGNvbnRhaW4gYSBzcGFuIGZvciBlYWNoIGNsYXNzIG5hbWUgZ2l2ZW4uXG4gICAgICpcbiAgICAgKiBZb3Ugc2hvdWxkIGRlZmluZSBhIENTUyBzZWxlY3RvciBgLmxpc3RlbmluZ2AgZm9yIHRoZXNlIHNwYW5zLiBUaGlzIGNsYXNzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIHNwYW5zIHRvIGFsdGVyIHRoZWlyIGFwcGVhcmFuY2Ugd2hlbiBhIGxpc3RlbmVyIGlzIGFkZGVkIHdpdGggdGhhdCBjbGFzcyBuYW1lIChwcmVmaXhlZCB3aXRoICdvbicpLlxuICAgICAqXG4gICAgICogKFRoaXMgaXMgYW4gaW50ZXJuYWwgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgb25jZSBieSB0aGUgY29uc3RydWN0b3Igb24gZXZlcnkgaW5zdGFudGlhdGlvbi4pXG4gICAgICogQHJldHVybnMge0VsZW1lbnR8dW5kZWZpbmVkfSBUaGUgYXBwZW5kZWQgYDxsaT4uLi48L2xpPmAgZWxlbWVudCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBpcyBubyB0ZXN0IHBhbmVsLlxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgX2FkZFRlc3RQYW5lbEl0ZW06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRlc3RQYW5lbEl0ZW0sXG4gICAgICAgICAgICB0ZXN0UGFuZWxFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLl9jbGFzc1ByZWZpeCArICcudGVzdC1wYW5lbCcpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50ZXN0LXBhbmVsJyk7XG5cbiAgICAgICAgaWYgKHRlc3RQYW5lbEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzID0gWyAnbW91c2Vkb3duJywgJ21vdXNlbW92ZScsICdtb3VzZXVwJywgJ2luZGV4JyBdLFxuICAgICAgICAgICAgICAgIGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXG4gICAgICAgICAgICB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHBhcnROYW1lKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5pbm5lckhUTUwgKz0gJzxzcGFuIGNsYXNzPVwiJyArIHBhcnROYW1lICsgJ1wiPicgKyBwYXJ0TmFtZS5yZXBsYWNlKCdtb3VzZScsICcnKSArICc8L3NwYW4+JztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0ZXN0UGFuZWxFbGVtZW50LmFwcGVuZENoaWxkKGl0ZW0pO1xuXG4gICAgICAgICAgICB0ZXN0UGFuZWxJdGVtID0ge307XG4gICAgICAgICAgICB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHBhcnROYW1lKSB7XG4gICAgICAgICAgICAgICAgdGVzdFBhbmVsSXRlbVtwYXJ0TmFtZV0gPSBpdGVtLmdldEVsZW1lbnRzQnlDbGFzc05hbWUocGFydE5hbWUpWzBdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGVzdFBhbmVsSXRlbTtcbiAgICB9LFxuXG4gICAgX2FkZEV2dDogZnVuY3Rpb24gKGV2dE5hbWUpIHtcbiAgICAgICAgdmFyIHNweSA9IHRoaXMudGVzdFBhbmVsSXRlbSAmJiB0aGlzLnRlc3RQYW5lbEl0ZW1bZXZ0TmFtZV07XG4gICAgICAgIGlmIChzcHkpIHsgc3B5LmNsYXNzTGlzdC5hZGQoJ2xpc3RlbmluZycpOyB9XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIHRoaXMuX2JvdW5kWydvbicgKyBldnROYW1lXSk7XG4gICAgfSxcblxuICAgIF9yZW1vdmVFdnQ6IGZ1bmN0aW9uIChldnROYW1lKSB7XG4gICAgICAgIHZhciBzcHkgPSB0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtW2V2dE5hbWVdO1xuICAgICAgICBpZiAoc3B5KSB7IHNweS5jbGFzc0xpc3QucmVtb3ZlKCdsaXN0ZW5pbmcnKTsgfVxuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihldnROYW1lLCB0aGlzLl9ib3VuZFsnb24nICsgZXZ0TmFtZV0pO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmopIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgb2JqbiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaWYgKG9iam4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmpuKSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSBvYmpuW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gdmFsaWRSYW5nZShyYW5nZSkge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocmFuZ2UpLFxuICAgICAgICB2YWxpZCA9ICBrZXlzLmxlbmd0aCA9PT0gMiAmJlxuICAgICAgICAgICAgdHlwZW9mIHJhbmdlLm1pbiA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgIHR5cGVvZiByYW5nZS5tYXggPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICByYW5nZS5taW4gPD0gcmFuZ2UubWF4O1xuXG4gICAgaWYgKCF2YWxpZCkge1xuICAgICAgICBlcnJvcignSW52YWxpZCAucmFuZ2Ugb2JqZWN0LicpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgaGFuZGxlcnNUb0JlQm91bmRcbiAqIEB0eXBlIHtvYmplY3R9XG4gKiBAZGVzYyBUaGUgZnVuY3Rpb25zIGRlZmluZWQgaW4gdGhpcyBvYmplY3QgYXJlIGFsbCBET00gZXZlbnQgaGFuZGxlcnMgdGhhdCBhcmUgYm91bmQgYnkgdGhlIEZpbkJhciBjb25zdHJ1Y3RvciB0byBlYWNoIG5ldyBpbnN0YW5jZS4gSW4gb3RoZXIgd29yZHMsIHRoZSBgdGhpc2AgdmFsdWUgb2YgdGhlc2UgaGFuZGxlcnMsIG9uY2UgYm91bmQsIHJlZmVyIHRvIHRoZSBGaW5CYXIgb2JqZWN0IGFuZCBub3QgdG8gdGhlIGV2ZW50IGVtaXR0ZXIuIFwiRG8gbm90IGNvbnN1bWUgcmF3LlwiXG4gKi9cbnZhciBoYW5kbGVyc1RvQmVCb3VuZCA9IHtcbiAgICBzaG9ydFN0b3A6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0sXG5cbiAgICBvbndoZWVsOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHRoaXMuaW5kZXggKz0gZXZ0W3RoaXMuZGVsdGFQcm9wXTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuXG4gICAgb25jbGljazogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB2YXIgdGh1bWJCb3ggPSB0aGlzLnRodW1iLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICAgICAgZ29pbmdVcCA9IGV2dFt0aGlzLm9oLmNvb3JkaW5hdGVdIDwgdGh1bWJCb3hbdGhpcy5vaC5sZWFkaW5nXTtcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMucGFnaW5nID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IHRoaXMucGFnaW5nW2dvaW5nVXAgPyAndXAnIDogJ2Rvd24nXShNYXRoLnJvdW5kKHRoaXMuaW5kZXgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gZ29pbmdVcCA/IC10aGlzLmluY3JlbWVudCA6IHRoaXMuaW5jcmVtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWFrZSB0aGUgdGh1bWIgZ2xvdyBtb21lbnRhcmlseVxuICAgICAgICB0aGlzLnRodW1iLmNsYXNzTGlzdC5hZGQoJ2hvdmVyJyk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy50aHVtYi5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24gd2FpdEZvckl0KCkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgd2FpdEZvckl0KTtcbiAgICAgICAgICAgIHNlbGYuX2JvdW5kLm9ubW91c2V1cChldnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSxcblxuICAgIG9ubW91c2VvdmVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudGh1bWIuY2xhc3NMaXN0LmFkZCgnaG92ZXInKTtcbiAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3V0ID0gdGhpcy5fYm91bmQub25tb3VzZW91dDtcbiAgICAgICAgdGhpcy5fYWRkRXZ0KCdtb3VzZWRvd24nKTtcbiAgICB9LFxuXG4gICAgb25tb3VzZW91dDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlZG93bicpO1xuICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdmVyID0gdGhpcy5fYm91bmQub25tb3VzZW92ZXI7XG4gICAgICAgIHRoaXMudGh1bWIuY2xhc3NMaXN0LnJlbW92ZSgnaG92ZXInKTtcbiAgICB9LFxuXG4gICAgb25tb3VzZWRvd246IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZWRvd24nKTtcbiAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3ZlciA9IHRoaXMudGh1bWIub25tb3VzZW91dCA9IG51bGw7XG5cbiAgICAgICAgdmFyIHRodW1iQm94ID0gdGhpcy50aHVtYi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5waW5PZmZzZXQgPSBldnRbdGhpcy5vaC5heGlzXSAtIHRodW1iQm94W3RoaXMub2gubGVhZGluZ10gKyB0aGlzLmJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVt0aGlzLm9oLmxlYWRpbmddICsgdGhpcy5fdGh1bWJNYXJnaW5MZWFkaW5nO1xuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuXG4gICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIG9ubW91c2Vtb3ZlOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHZhciBzY2FsZWQgPSBNYXRoLm1pbih0aGlzLl90aHVtYk1heCwgTWF0aC5tYXgoMCwgZXZ0W3RoaXMub2guYXhpc10gLSB0aGlzLnBpbk9mZnNldCkpO1xuICAgICAgICB2YXIgaWR4ID0gc2NhbGVkIC8gdGhpcy5fdGh1bWJNYXggKiAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSArIHRoaXMuX21pbjtcblxuICAgICAgICB0aGlzLl9zZXRTY3JvbGwoaWR4LCBzY2FsZWQpO1xuXG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIG9ubW91c2V1cDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlbW92ZScpO1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNldXAnKTtcblxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2F1dG8nO1xuXG4gICAgICAgIHZhciB0aHVtYkJveCA9IHRoaXMudGh1bWIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHRodW1iQm94LmxlZnQgPD0gZXZ0LmNsaWVudFggJiYgZXZ0LmNsaWVudFggPD0gdGh1bWJCb3gucmlnaHQgJiZcbiAgICAgICAgICAgIHRodW1iQm94LnRvcCA8PSBldnQuY2xpZW50WSAmJiBldnQuY2xpZW50WSA8PSB0aHVtYkJveC5ib3R0b21cbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aGlzLl9ib3VuZC5vbm1vdXNlb3ZlcihldnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fYm91bmQub25tb3VzZW91dChldnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG59O1xuXG52YXIgb3JpZW50YXRpb25IYXNoZXMgPSB7XG4gICAgdmVydGljYWw6IHtcbiAgICAgICAgY29vcmRpbmF0ZTogICAgICdjbGllbnRZJyxcbiAgICAgICAgYXhpczogICAgICAgICAgICdwYWdlWScsXG4gICAgICAgIHNpemU6ICAgICAgICAgICAnaGVpZ2h0JyxcbiAgICAgICAgb3V0c2lkZTogICAgICAgICdyaWdodCcsXG4gICAgICAgIGluc2lkZTogICAgICAgICAnbGVmdCcsXG4gICAgICAgIGxlYWRpbmc6ICAgICAgICAndG9wJyxcbiAgICAgICAgdHJhaWxpbmc6ICAgICAgICdib3R0b20nLFxuICAgICAgICBtYXJnaW5MZWFkaW5nOiAgJ21hcmdpblRvcCcsXG4gICAgICAgIG1hcmdpblRyYWlsaW5nOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgdGhpY2tuZXNzOiAgICAgICd3aWR0aCcsXG4gICAgICAgIGRlbHRhOiAgICAgICAgICAnZGVsdGFZJ1xuICAgIH0sXG4gICAgaG9yaXpvbnRhbDoge1xuICAgICAgICBjb29yZGluYXRlOiAgICAgJ2NsaWVudFgnLFxuICAgICAgICBheGlzOiAgICAgICAgICAgJ3BhZ2VYJyxcbiAgICAgICAgc2l6ZTogICAgICAgICAgICd3aWR0aCcsXG4gICAgICAgIG91dHNpZGU6ICAgICAgICAnYm90dG9tJyxcbiAgICAgICAgaW5zaWRlOiAgICAgICAgICd0b3AnLFxuICAgICAgICBsZWFkaW5nOiAgICAgICAgJ2xlZnQnLFxuICAgICAgICB0cmFpbGluZzogICAgICAgJ3JpZ2h0JyxcbiAgICAgICAgbWFyZ2luTGVhZGluZzogICdtYXJnaW5MZWZ0JyxcbiAgICAgICAgbWFyZ2luVHJhaWxpbmc6ICdtYXJnaW5SaWdodCcsXG4gICAgICAgIHRoaWNrbmVzczogICAgICAnaGVpZ2h0JyxcbiAgICAgICAgZGVsdGE6ICAgICAgICAgICdkZWx0YVgnXG4gICAgfVxufTtcblxudmFyIGF4aXMgPSB7XG4gICAgdG9wOiAgICAndmVydGljYWwnLFxuICAgIGJvdHRvbTogJ3ZlcnRpY2FsJyxcbiAgICBoZWlnaHQ6ICd2ZXJ0aWNhbCcsXG4gICAgbGVmdDogICAnaG9yaXpvbnRhbCcsXG4gICAgcmlnaHQ6ICAnaG9yaXpvbnRhbCcsXG4gICAgd2lkdGg6ICAnaG9yaXpvbnRhbCdcbn07XG5cbnZhciBjc3NGaW5CYXJzOyAvLyBkZWZpbml0aW9uIGluc2VydGVkIGJ5IGd1bHBmaWxlIGJldHdlZW4gZm9sbG93aW5nIGNvbW1lbnRzXG4vKiBpbmplY3Q6Y3NzICovXG5jc3NGaW5CYXJzID0gJ2Rpdi5maW5iYXItaG9yaXpvbnRhbCxkaXYuZmluYmFyLXZlcnRpY2Fse3Bvc2l0aW9uOmFic29sdXRlO21hcmdpbjozcHh9ZGl2LmZpbmJhci1ob3Jpem9udGFsPi50aHVtYixkaXYuZmluYmFyLXZlcnRpY2FsPi50aHVtYntwb3NpdGlvbjphYnNvbHV0ZTtiYWNrZ3JvdW5kLWNvbG9yOiNkM2QzZDM7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxcHggIzAwMDstbW96LWJveC1zaGFkb3c6MCAwIDFweCAjMDAwO2JveC1zaGFkb3c6MCAwIDFweCAjMDAwO2JvcmRlci1yYWRpdXM6NHB4O21hcmdpbjoycHg7b3BhY2l0eTouNDt0cmFuc2l0aW9uOm9wYWNpdHkgLjVzfWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWIuaG92ZXIsZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWIuaG92ZXJ7b3BhY2l0eToxO3RyYW5zaXRpb246b3BhY2l0eSAuNXN9ZGl2LmZpbmJhci12ZXJ0aWNhbHt0b3A6MDtib3R0b206MDtyaWdodDowO3dpZHRoOjExcHh9ZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWJ7dG9wOjA7cmlnaHQ6MDt3aWR0aDo3cHh9ZGl2LmZpbmJhci1ob3Jpem9udGFse2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO2hlaWdodDoxMXB4fWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWJ7bGVmdDowO2JvdHRvbTowO2hlaWdodDo3cHh9Jztcbi8qIGVuZGluamVjdCAqL1xuXG5mdW5jdGlvbiBlcnJvcihtc2cpIHtcbiAgICB0aHJvdyAnZmluYmFyczogJyArIG1zZztcbn1cblxuLy8gSW50ZXJmYWNlXG5tb2R1bGUuZXhwb3J0cyA9IEZpbkJhcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbihmdW5jdGlvbiAobW9kdWxlKSB7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC1leHByZXNzaW9uc1xuXG4gICAgLy8gVGhpcyBjbG9zdXJlIHN1cHBvcnRzIE5vZGVKUy1sZXNzIGNsaWVudCBzaWRlIGluY2x1ZGVzIHdpdGggPHNjcmlwdD4gdGFncy4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvbW5tLlxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgSW5zZXJ0IGJhc2Ugc3R5bGVzaGVldCBpbnRvIERPTVxuICAgICAqIEBkZXNjIENyZWF0ZXMgYSBuZXcgYDxzdHlsZT4uLi48L3N0eWxlPmAgZWxlbWVudCBmcm9tIHRoZSBuYW1lZCB0ZXh0IHN0cmluZyhzKSBhbmQgaW5zZXJ0cyBpdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gY3NzUnVsZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW0lEXVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfEVsZW1lbnR8dW5kZWZpbmVkfG51bGx9IFtyZWZlcmVuY2VFbGVtZW50XVxuICAgICAqICogYHVuZGVmaW5lZGAgdHlwZSAob3Igb21pdHRlZCk6IGluamVjdHMgc3R5bGVzaGVldCBhdCB0b3Agb2YgYDxoZWFkLi4uPC9oZWFkPmAgZWxlbWVudFxuICAgICAqICogYG51bGxgIHZhbHVlOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgYm90dG9tIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gICAgICogKiBgRWxlbWVudGAgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3NzSW5qZWN0b3IoY3NzUnVsZXMsIElELCByZWZlcmVuY2VFbGVtZW50KSB7XG4gICAgICAgIGlmIChJRCkge1xuICAgICAgICAgICAgSUQgPSBjc3NJbmplY3Rvci5pZFByZWZpeCArIElEO1xuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoSUQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBzdHlsZXNoZWV0IGFscmVhZHkgaW4gRE9NXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHJlZmVyZW5jZUVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihyZWZlcmVuY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmICghcmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHRocm93ICdDYW5ub3QgZmluZCByZWZlcmVuY2UgZWxlbWVudCBmb3IgQ1NTIGluamVjdGlvbi4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZUVsZW1lbnQgJiYgIShyZWZlcmVuY2VFbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgICAgICAgIHRocm93ICdHaXZlbiB2YWx1ZSBub3QgYSByZWZlcmVuY2UgZWxlbWVudC4nO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICAgIGlmIChJRCkge1xuICAgICAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3NzUnVsZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgY3NzUnVsZXMgPSBjc3NSdWxlcy5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgICBjc3NSdWxlcyA9ICdcXG4nICsgY3NzUnVsZXMgKyAnXFxuJztcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzc1J1bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzUnVsZXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICAgICAgaWYgKHJlZmVyZW5jZUVsZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShzdHlsZSwgcmVmZXJlbmNlRWxlbWVudCk7XG4gICAgfVxuXG4gICAgY3NzSW5qZWN0b3IuaWRQcmVmaXggPSAnaW5qZWN0ZWQtc3R5bGVzaGVldC0nO1xuXG4gICAgLy8gSW50ZXJmYWNlXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3Rvcjtcbn0pKFxuICAgIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSB8fCAod2luZG93LmNzc0luamVjdG9yID0ge30pLFxuICAgIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzIHx8ICh3aW5kb3cuY3NzSW5qZWN0b3IuZXhwb3J0cyA9IHt9KVxuKSB8fCAoXG4gICAgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgfHwgKHdpbmRvdy5jc3NJbmplY3RvciA9IHdpbmRvdy5jc3NJbmplY3Rvci5leHBvcnRzKVxuKTtcblxuLyogQWJvdXQgdGhlIGFib3ZlIElJRkU6XG4gKiBUaGlzIGZpbGUgaXMgYSBcIm1vZGlmaWVkIG5vZGUgbW9kdWxlLlwiIEl0IGZ1bmN0aW9ucyBhcyB1c3VhbCBpbiBOb2RlLmpzICphbmQqIGlzIGFsc28gdXNhYmxlIGRpcmVjdGx5IGluIHRoZSBicm93c2VyLlxuICogMS4gTm9kZS5qczogVGhlIElJRkUgaXMgc3VwZXJmbHVvdXMgYnV0IGlubm9jdW91cy5cbiAqIDIuIEluIHRoZSBicm93c2VyOiBUaGUgSUlGRSBjbG9zdXJlIHNlcnZlcyB0byBrZWVwIGludGVybmFsIGRlY2xhcmF0aW9ucyBwcml2YXRlLlxuICogMi5hLiBJbiB0aGUgYnJvd3NlciBhcyBhIGdsb2JhbDogVGhlIGxvZ2ljIGluIHRoZSBhY3R1YWwgcGFyYW1ldGVyIGV4cHJlc3Npb25zICsgdGhlIHBvc3QtaW52b2NhdGlvbiBleHByZXNzaW9uXG4gKiB3aWxsIHB1dCB5b3VyIEFQSSBpbiBgd2luZG93LmNzc0luamVjdG9yYC5cbiAqIDIuYi4gSW4gdGhlIGJyb3dzZXIgYXMgYSBtb2R1bGU6IElmIHlvdSBwcmVkZWZpbmUgYSBgd2luZG93Lm1vZHVsZWAgb2JqZWN0LCB0aGUgcmVzdWx0cyB3aWxsIGJlIGluIGBtb2R1bGUuZXhwb3J0c2AuXG4gKiBUaGUgYm93ZXIgY29tcG9uZW50IGBtbm1gIG1ha2VzIHRoaXMgZWFzeSBhbmQgYWxzbyBwcm92aWRlcyBhIGdsb2JhbCBgcmVxdWlyZSgpYCBmdW5jdGlvbiBmb3IgcmVmZXJlbmNpbmcgeW91ciBtb2R1bGVcbiAqIGZyb20gb3RoZXIgY2xvc3VyZXMuIEluIGVpdGhlciBjYXNlLCB0aGlzIHdvcmtzIHdpdGggYm90aCBOb2RlSnMtc3R5bGUgZXhwb3J0IG1lY2hhbmlzbXMgLS0gYSBzaW5nbGUgQVBJIGFzc2lnbm1lbnQsXG4gKiBgbW9kdWxlLmV4cG9ydHMgPSB5b3VyQVBJYCAqb3IqIGEgc2VyaWVzIG9mIGluZGl2aWR1YWwgcHJvcGVydHkgYXNzaWdubWVudHMsIGBtb2R1bGUuZXhwb3J0cy5wcm9wZXJ0eSA9IHByb3BlcnR5YC5cbiAqXG4gKiBCZWZvcmUgdGhlIElJRkUgcnVucywgdGhlIGFjdHVhbCBwYXJhbWV0ZXIgZXhwcmVzc2lvbnMgYXJlIGV4ZWN1dGVkOlxuICogMS4gSWYgYG1vZHVsZWAgb2JqZWN0IGRlZmluZWQsIHdlJ3JlIGluIE5vZGVKcyBzbyBhc3N1bWUgdGhlcmUgaXMgYSBgbW9kdWxlYCBvYmplY3Qgd2l0aCBhbiBgZXhwb3J0c2Agb2JqZWN0XG4gKiAyLiBJZiBgbW9kdWxlYCBvYmplY3QgdW5kZWZpbmVkLCB3ZSdyZSBpbiBicm93c2VyIHNvIGRlZmluZSBhIGB3aW5kb3cuY3NzSW5qZWN0b3JgIG9iamVjdCB3aXRoIGFuIGBleHBvcnRzYCBvYmplY3RcbiAqXG4gKiBBZnRlciB0aGUgSUlGRSByZXR1cm5zOlxuICogQmVjYXVzZSBpdCBhbHdheXMgcmV0dXJucyB1bmRlZmluZWQsIHRoZSBleHByZXNzaW9uIGFmdGVyIHRoZSB8fCB3aWxsIGFsd2F5cyBleGVjdXRlOlxuICogMS4gSWYgYG1vZHVsZWAgb2JqZWN0IGRlZmluZWQsIHRoZW4gd2UncmUgaW4gTm9kZUpzIHNvIHdlJ3JlIGRvbmVcbiAqIDIuIElmIGBtb2R1bGVgIG9iamVjdCB1bmRlZmluZWQsIHRoZW4gd2UncmUgaW4gYnJvd3NlciBzbyByZWRlZmluZWB3aW5kb3cuY3NzSW5qZWN0b3JgIGFzIGl0cyBgZXhwb3J0c2Agb2JqZWN0XG4gKi9cbiJdfQ==
