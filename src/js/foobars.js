'use strict';

/* eslint-env node, browser */

/** @typedef {object} foobarStyles
 *
 * @property {number} [left]
 * @property {number} [top]
 * @property {number} [right]
 * @property {number} [bottom]
 * @property {number} [width]
 * @property {number} [height]
 *
 * @summary Styles to be applied to scrollbar on resize.
 *
 * @desc Only enough of the above style properties need to be specified sufficient to place the scrollbar in its container. Specifically:
 *
 * * For horizontal scrollbars, some combination of `left` + either `width` or `right`.
 * * For vertical scrollbars, some combination of `top` + either `height` or `bottom`.
 *
 * Values for some or all of these may come from your stylesheets, in which case they may be omitted here. You are advised to keep in mind that CSS always measures values for `right` and `bottom` _backwards_ from their respective container edges. (That is, positive values measure towards the left and top, respectively.)
 *
 * Style property names found in the generalized style dictionary are translated for you to those found above (as a function of scrollbar orientation).
 *
 * Regarding style values, the following to transformations are performed for your convenience:
 *
 * 1. If style value is a number, "px" is appended.
 * 2. If style value is a percentage _and_ has margins, it is converted to the pixel percentage of the scrollbar's parent element, minus its margins, with "px" appended.
 */

/** @typedef {function} foobarOnChange
 *
 * @summary A callback function to be invoked whenever the scroll index changes.
 *
 * @desc You specify a callback function in the `onchange` property of the `options` object parameter to the {@link FooBar|FooBar constructor}.
 *
 * The function you supply is invoked to handle the following events:
 *
 * * Invoked once by calling the {@link FooBar#index|index} setter
 * * Invoked once by calling the {@link FooBar#resize|resize()} method
 * * Invoked repeatedly as user drags the scrollbar thumb
 * * Invoked repeatedly as user spins the mouse wheel (but only when mouse pointer is positioned inside the {@link FooBar#container|container} element)
 * * Invoked once when user clicks mouse in the page-up region (in the scrollbar above the thumb)
 * * Invoked once when user clicks mouse in the page-down region (in the scrollbar below the thumb)
 *
 * The handler's calling context is the {@link FooBar} object. Note that this includes:
 *
 *  * All the documented properties for the `FooBar` object
 *  * All the standard `options` properties, which were either copied from your `options` object or set to a default value when missing therefrom
 *  * Any miscellaneous "custom" properties you may have included in the `options` object
 *
 * And of course your handler will have access to all other objects in it's definition scope.
 *
 * @param {number} index - The scrollbar index, always a value in the range {@link FooBar#min|min}..{@link FooBar#max|max}. (Same as `this.index`.)
 */

/** @typedef {object} foobarOptions
 *
 * @desc As an "options" object, all properties herein are optional. Omitted properties take on the default values shown; if no default value is shown, the option (and its functionality) are undefined. All options, including any miscellaneous ("custom") options, become properties of `this`, the instantiated FooBar object. As such, they are all available to the {@link foobarOnChange|onchange} callback function, which is called with `this` as its context.
 *
 * @property {number} [orientation='vertical'] - Flavor of scrollbar to create. Useful values are `'vertical'` (the default) or `'horizontal'`.
 *
 * @property {foobarOnChange|Element} [onchange] - Callback function for scrolling. (See type definition for details and calling signature).
 *
 * After instantiation, `this.onchange` can be updated directly.
 *
 * @property {number} [increment=1] - Number of index units per pageful. Used for page-up and page-down; and also to size the thumb (which however has an absolute minimum size of 20 pixels).
 *
 * @property {boolean} [paging=true] - Listen for clicks in page-up and page-down regions of scrollbar.
 *
 * The string 'auto' uses the current pixel size of the content area (the dimension reflecting your scrollbar's orientation). Note however that this only makes sense when your index unit is pixels.
 *
 * @property {Element} [container=bar.parentElement] - The content area element (the element that contains the content that appears to scroll).
 *
 * @param {Element} [cssStylesheetReferenceElement] - If omitted, the stylesheet will be inserted as first child of `<head>...</head>` element. If `null` will be inserted as last child of `<head>...</head>` element. If defined, will be inserted before the given reference element. In all cases, will not be inserted if already found in dom.
 *
 * @property {foobarStyles} [barStyles] - (See type definition for details.) Scrollbar styles to be applied upon calls to {@link FooBar#resize|resize()}. Note that before applying these new values, all the scrollbar's style values are reset, exposing inherited values. Only specify a `barStyles` object when you need to override stylesheet values.
 *
 * @property {string|null} [deltaProp='deltaY'] - The name of the wheel event object property containing the relevant wheel delta data. Useful values are `'deltaX'`, `'deltaY'`, or `'deltaZ'`.
 *
 * NOTE: The default value shown, `'deltaY'`, is for vertical scrollbars; the default for horizontal scrollbars is actually `'deltaX'`.
 *
 * For example, because the mouse wheel only emits events with `deltaY` data, if you want the mouse wheel to cause horizontal scrolling, give `{ deltaProp: 'deltaY' }` in your horizontal scrollbar instantiation.
 *
 * This option is provided so that you can override the default primarily to accommodate certain "panoramic" interface designs where the mouse wheel should control horizontal rather than vertical scrolling.
 *
 * If you specify `null`, mouse wheel events will be ignored.
 *
 * @property {string} [classPrefix='foobar'] - A string used to form the name of the CSS class referenced by the new scrollbar element. The class name will be the concatenation of:
 * 1. This string
 * 2. A hyphen character
 * 3. The value of the `orientation` option
 *
 * For example, `foobar-vertical` and `foobar-horizontal`.
 *
 * There should be defined CSS selectors using these names, as per the example in `src/css/foobars.css`.
 */

(function (module) {  // eslint-disable-line no-unused-expressions

    // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

    /**
     * @constructor FooBar
     * @summary Create a scrollbar object.
     * @desc Creating a scrollbar is a three-step process:
     *
     * 1. Instantiate the scrollbar object by calling this constructor function. Upon instantiation, the DOM element for the scrollbar (with a single child element for the scrollbar "thumb") is created but is not insert it into the DOM.
     * 2. After instantiation, it is the caller's responsibility to insert the scrollbar, {@link FooBar#bar|this.bar}, into the DOM.
     * 3. After insertion, the caller must call {@link FooBar#resize|resize()} to size and position the scrollbar and its thumb.
     *
     * Suggested configurations:
     * * **Unbound** &mdash; the scrollbar serves merely as a simple range (slider) control. Omit both `options.onchange` and `options.content`.
     * * **Bound to a content element using a custom event handler** supplied by the programmer in `options.onchange` typically to handle scrolling. `options.content` will be available to the handler (as `this.content`). Custom event handlers are not limited to implementing scrolling. They could control anything, _e.g.,_ data transformations, graphics transformations, _etc._ See {@link foobarOnChange} for more details.
     * * **Bound to a content element using the built-in event handler** for smooth scrolling of "real" content. Omit `options.onchange` and supply your content element in `options.content`. When the API sees this configuration, it makes the following settings for you:
     *   * `this.min` = 1
     *   * `this.max` = the content size - the container size
     *   * `this.increment` = the container size
     *   * `this.onchange` = the built-in `this.scrollRealContent` handler
     *
     * @param {foobarOptions} [options={}] - Options object. See the type definition for member details.
     */
    function FooBar(options) {

        options = options || {};

        this.orientation = options.orientation || 'vertical';
        this.prop        = generalizedStyleDictionaries[this.orientation];
        this.onchange    = options.onchange    || null;
        this.classPrefix = options.classPrefix || 'foobar';
        this.deltaProp   = options.deltaProp === null ? null : (options.deltaProp || this.prop.delta);
        this.increment   = options.increment   || 1;
        this.barStyles   = options.barStyles   || {};
        this.paging      = options.paging      || options.paging === undefined;

        /**
         * @readonly
         * @name min
         * @summary The minimum scroll value.
         * @desc This value is defined by the constructor. This is the lowest value acceptable to `this.index` (the setter) and returnable by `this.index` (the getter).
         *
         * As implemented, this value should not be modified after instantiation. This could be remedied by making a setter that calls _calcThumb to reposition the thumb.
         * @type {number}
         * @memberOf FooBar
         */
        this.min = this._index = options.min || 1;


        /**
         * @readonly
         * @name max
         * @summary The maximum scroll value.
         * @desc This value is defined by the constructor. This is the highest value acceptable to `this.index` (the setter) and returnable by `this.index` (the getter).
         *
         * As implemented, this value should not be modified after instantiation. This could be remedied by making a setter that calls _calcThumb to reposition the thumb.
         * @type {number}
         * @memberOf FooBar
         */
        this.max = options.max || 100;


        // check some option values
        if (!this.prop) {
            throw 'Invalid value for `options.orientation`.';
        }

        if (!/^delta[XYZ]$/.test(this.deltaProp)) {
            throw 'Invalid value for `options.deltaProp`.';
        }

        // copy any any additional option props for use in onchange event handlers
        for (var option in options) {
            if (options.hasOwnProperty(option) && !(option in this)) {
                this[option] = options[option];
            }
        }

        // make bound versions of all the mouse event handler
        this._bound = {};
        for (var key in handlersToBeBound) {
            this._bound[key] = handlersToBeBound[key].bind(this);
        }

        /**
         * @name thumb
         * @summary The generated scrollbar thumb element.
         * @desc The thumb element's parent element is always the {@link FooBar#bar|bar} element.
         *
         * This property is typically referenced internally only. The size and position of the thumb element is maintained by `_calcThumb()`.
         * @type {Element}
         * @memberOf FooBar
         */
        this.thumb = document.createElement('div');
        this.thumb.classList.add('thumb');
        this.thumb.onclick = this._bound.shortStop;
        this.thumb.onmouseover = this._bound.onmouseover;

        /**
         * @name bar
         * @summary The generated scrollbar element.
         * @desc The caller inserts this element into the DOM (typically into the content container) and then calls its {@link FooBar#resize|resize()} method.
         *
         * Thus the node tree is typically:
         * * A **content container** element, which contains:
         *    * The content element(s)
         *    * This **scrollbar element**, which in turn contains:
         *        * The **thumb element**
         *
         * @type {Element}
         * @memberOf FooBar
         */
        this.bar = document.createElement('div');
        this.bar.classList.add('foobar-' + this.orientation);
        if (this.classPrefix !== 'foobar') {
            this.bar.classList.add(this.classPrefix + '-' + this.orientation);
        }
        this.bar.classList.add('foobar-' + this.orientation);
        this.bar.appendChild(this.thumb);
        if (this.paging) {
            this.bar.onclick = this._bound.onclick;
        }

        cssInjector(this.cssStylesheetReferenceElement);
    }

    FooBar.prototype = {

        /**
         * @summary L-value to set a new index value for the scrollbar.
         * @desc This _setter_ calculates the position of the scroll thumb from the given `idx`, which is clamped to {@link FooBar#min|min}..{@link FooBar#max|max}. It then calls {@link FooBar#_setScroll|_setScroll()} to effect the change.
         *
         * @see {@link FooBar#_setScroll|_setScroll}
         * @type {number}
         * @memberOf FooBar.prototype
         */
        set index(idx) {
            idx = Math.min(this.max, Math.max(this.min, idx)); // clamp it
            this._setScroll(idx);
            this._calcThumb();
        },

        /**
         * @summary The current index value of the scrollbar.
         * @desc This _getter_ calculates the current index from the thumb position. The returned value will be in the range `min`..`max`. It is intentionally not rounded.
         *
         * Use this the getter value as an alternative to (or in addition to) using the {@link foobarOnChange|onchange} callback function.
         * @readonly
         * @type {number}
         * @memberOf FooBar.prototype
         */
        get index() {
            return this._index;
        },

        /**
         * @summary Move the thumb.
         * @desc Also displays the index value in the test panel and invokes the callback.
         * @param idx - The new scroll index, a value in the range `min`..`max`.
         * @param [scaled=f(idx)] - The new thumb position in pixels and scaled relative to the containing {@link FooBar#bar|bar} element, i.e., a proportional number in the range `0`..`thumbMax`. When omitted, a function of `idx` is used.
         * @memberOf FooBar.prototype
         */
        _setScroll: function (idx, scaled) {
            idx = this._index = Math.round(idx);

            // Display the index value in the test panel
            if (this.testPanelItem && this.testPanelItem.index instanceof Element) {
                this.testPanelItem.index.innerHTML = idx;
            }

            // Call the callback
            if (this.onchange) {
                this.onchange.call(this, idx);
            }

            // Move the thumb
            if (scaled === undefined) {
                scaled = (idx - this.min) / (this.max - this.min) * this._thumbMax;
            }
            this.thumb.style[this.prop.leading] = scaled + 'px';
        },

        scrollRealContent: function (idx) {
            var containerRect = this.content.parentElement.getBoundingClientRect(),
                sizeProp = this.prop.size,
                maxScroll = Math.max(0, this.content[sizeProp] - containerRect[sizeProp]),
                scroll = (idx - this.min) / (this.max - this.min) * maxScroll;

            this.content.style[this.prop.leading] = -scroll + 'px';
        },

        /**
         * @summary Recalculate thumb position.
         *
         * @desc This method recalculates the thumb size and position. Call it once after inserting your scrollbar into the DOM, and repeatedly while resizing the scrollbar (which typically happens when the scrollbar's parent is resized by user, as when user drags window's lower right corner resize handle).
         *
         * @param {number|string} [increment=this.increment] - Number of index units per pageful. Used for page-up and page-down; and also to size the thumb.
         *
         * @param {foobarStyles} [barStyles=this.barStyles] - (See type definition for details.) Scrollbar styles to be applied upon calls to {@link FooBar#resize|resize()}. Note that before applying these new values, all the scrollbar's style values are reset, exposing inherited values. Only specify a `barStyles` object when you need to override stylesheet values. If provided, becomes the new default (`this.barStyles`), for use as a default on subsequent calls. It is generally the case that the scrollbar's new position is sufficiently described by the current styles. Therefore it is unusual to need to provide a `barStyles` object on every call to `resize`.
         *
         * @returns {FooBar} Self for chaining.
         * @memberOf FooBar.prototype
         */
        resize: function (increment, barStyles) {
            var bar = this.bar,
                container = this.container || bar.parentElement;

            if (!container) {
                throw 'FooBar.resize() called before DOM insertion.';
            }

            var containerRect = container.getBoundingClientRect(),
                barRect = bar.getBoundingClientRect();

            // promote 2nd param if 1st omitted
            if (typeof increment === 'object') {
                barStyles = increment;
                increment = undefined;
            }

            // an increment of "auto" means to use the content area dimension.
            // note this only makes sense if your index unit is pixels.
            if (!this.onchange && this.content) {
                this.onchange = this.scrollRealContent;
                increment = containerRect[this.prop.size];
                this.min = 1;
                this.max = this.content[this.prop.size] - increment;
            }

            increment = this.increment = increment || this.increment;
            barStyles = this.barStyles = barStyles || this.barStyles;

            // revert all styles to values inherited from stylesheets; then apply styles in `barStyles`
            bar.removeAttribute('style');

            for (var key in barStyles) {
                if (barStyles.hasOwnProperty(key)) {
                    var val = barStyles[key];

                    if (key in this.prop) {
                        key = this.prop[key];
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
                }
            }

            var index = this.index;
            this.testPanelItem = this.testPanelItem || this._addTestPanelItem();
            this._calcThumb();
            this.index = index;

            if (this.deltaProp !== null) {
                container.addEventListener('wheel', this._bound.onwheel);
            }

            return this;
        },

        /**
         * @summary Unhooks all the event handlers.
         * @desc Always call this method prior to disposing of the scrollbar object.
         * @memberOf FooBar.prototype
         */
        close: function () {
            this._removeEvt('mousedown');
            this._removeEvt('mousemove');
            this._removeEvt('mouseup');

            (this.container || this.bar.parentElement)._removeEvt('wheel', this._bound.onwheel);

            this.bar.onclick =
            this.thumb.onclick =
            this.thumb.onmouseover =
            this.thumb.transitionend =
            this.thumb.onmouseout = null;
        },

        /**
         * @private
         * @function _addTestPanelItem
         * @summary Append a test panel element.
         * @desc If there is a test panel in the DOM (typically an `<ol>...</ol>` element) with class name of `classPrefix + '-test-panel'`, an `<li>...</li>` element will be created and appended to it. This new element will contain a span for each class name given.
         *
         * You should define a CSS selector `.listening` for these spans. This class will be added to the spans to alter their appearance when a listener is added with that class name (prefixed with 'on').
         *
         * (This is an internal function that is called once by the constructor on every instantiation.)
         * @returns {Element|undefined} The appended `<li>...</li>` element or `undefined` if there is no test panel.
         * @memberOf FooBar.prototype
         */
        _addTestPanelItem: function () {
            var testPanelItem,
                testPanelElements = document.getElementsByClassName(this.classPrefix + ' test-panel');

            if (!testPanelElements.length) {
                testPanelElements = document.getElementsByClassName('test-panel');
            }

            if (testPanelElements.length) {
                var testPanelItemPartNames = [ 'mousedown', 'mousemove', 'mouseup', 'index' ],
                    item = document.createElement('li');

                testPanelItemPartNames.forEach(function (partName) {
                    item.innerHTML += '<span class="' + partName + '">' + partName.replace('mouse', '') + '</span>';
                });

                testPanelElements[0].appendChild(item);

                testPanelItem = {};
                testPanelItemPartNames.forEach(function (partName) {
                    testPanelItem[partName] = item.getElementsByClassName(partName)[0];
                });
            }

            return testPanelItem;
        },

        _calcThumb: function () {
            var prop = this.prop;
            var thumbComp = window.getComputedStyle(this.thumb);
            var thumbMarginLeading = parseInt(thumbComp[prop.marginLeading]);
            var thumbMarginTrailing = parseInt(thumbComp[prop.marginTrailing]);
            var thumbMargins = thumbMarginLeading + thumbMarginTrailing;
            var barBox = this.bar.getBoundingClientRect();
            var barSize = barBox[prop.size];

            // adjust size of thumb to `increment` as fraction of index range
            var range = this.max - this.min + this.increment; // adding in `increment` puts last item on bottom of last page rather than top
            var normalizedThumbSize = this.increment / range;
            var thumbSize = Math.max(20, Math.round(normalizedThumbSize * barSize));
            this.thumb.style[prop.size] = thumbSize + 'px';

            /**
             * @private
             * @name _thumbMax
             * @summary Maximum offset of thumb's leading edge.
             * @desc This is the pixel offset within the scrollbar of the thumb when it is at its maximum position at the extreme end of its range.
             *
             * This value takes into account the newly calculated size of the thumb element (including its margins) and the inner size of the scrollbar (the thumb's containing element, including _its_ margins).
             *
             * NOTE: Scrollbar padding is not taken into account in the current implementation and is assumed to be `0`; use thumb margins in place of scrollbar padding.
             * @type {number}
             * @memberOf FooBar
             */
            this._thumbMax = barSize - thumbSize - thumbMargins;

            this._thumbMarginLeading = thumbMarginLeading;
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

    /**
     * @private
     * @name handlersToBeBound
     * @type {object}
     * @desc The functions defined in this object are all DOM event handlers that are bound by the FooBar constructor to each new instance. In other words, the `this` value of these handlers, once bound, refer to the FooBar object and not to the event emitter. "Do not consume raw."
     *
     * Sequence of events:
     *
     * ** FOLLOWING UNFINISHED **
     *
     * The sequence begins on instantiation when the constructor attaches event handlers for **onmouseover**, **onmouseout**, and **onclick**.
     *
     * * **onmouseover** Mouse pointer positioned over the thumb. Starts listening for for either **onmouseout** or **onmousedown**:
     *
     *  * **onmouseout** Mouse was moved off the thumb before clicking. Stops listening for *mousedown* event. Sequence cancelled.
     *
     *  * **onmousedown** Mouse was clicked while pointer was still positioned over the thumb. The exact position of the click is noted. Unhooks *mouseout* handler. Stops listening for *mousedown* event. Starts listening for *mousemove* and *mouseup*:
     *
     *      * **onmousemove** This event repeats while mouse is moved. Thumb position updated (moved) based on current mouse position relative to where it was when first clicked during *mousedown*. (This is a mouse drag, really.)
     *
     *      * **mouseup**
     *
     * 1. **onmouseover** detects if the mouse is hovering over the thumb. If so:
     *  1. Adds the `hover` class.  (The reason this is not down with a CSS :hover pseudo-class is that we want it to stay latched until mouseup rather than mouseout.)
     *  2. Adds an event listener for **mousedown**.
     * 2. **mouseout** (before **onmousdown** happens) cancels the squence, basically undoing **onmouseover**:
     *  1. Removes the `hover` class.
     *  2. Cancels the **mousedown** listener.
     * 3. **onmousedown**:
     *  1. Removes itself (this listener).
     *  2. Adds listeners for **onmousemove** and **onmouseup**.
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
            var thumbBox = this.thumb.getBoundingClientRect();
            this.index += evt[this.prop.coordinate] < thumbBox[this.prop.leading] ? -this.increment : this.increment;
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
            this.pinOffset = evt[this.prop.axis] - thumbBox[this.prop.leading] + this.bar.getBoundingClientRect()[this.prop.leading] + this._thumbMarginLeading;
            document.documentElement.style.cursor = 'default';

            this._addEvt('mousemove');
            this._addEvt('mouseup');

            evt.stopPropagation();
            evt.preventDefault();
        },

        onmousemove: function (evt) {
            var scaled = Math.min(this._thumbMax, Math.max(0, evt[this.prop.axis] - this.pinOffset));
            var idx = scaled / this._thumbMax * (this.max - this.min) + this.min;

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

    var generalizedStyleDictionaries = {
        vertical: {
            coordinate:     'y',
            axis:           'pageY',
            size:           'height',
            outside:        'bottom',
            inside:         'left',
            leading:        'top',
            trailing:       'bottom',
            marginLeading:  'marginTop',
            marginTrailing: 'marginBottom',
            thickness:      'width',
            delta:          'deltaY'
        },
        horizontal: {
            coordinate:     'x',
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

    /**
     * @summary Insert base stylesheet into DOM
     * @private
     * @param {Element} [referenceElement]
     * if `undefined` (or omitted) or `null`, injects stylesheet at top or bottom of <head>, respectively, but only once;
     * otherwise, injects stylesheet immediately before given element
     */
    function cssInjector(referenceElement) {
        var container, style, ID = 'foobars-base-styles';

        if (!cssInjector.text || document.getElementById(ID)) {
            return;
        }

        style = document.createElement('style');
        style.type = 'text/css';
        style.id = ID;
        if (style.styleSheet) {
            style.styleSheet.cssText = cssInjector.text;
        } else {
            style.appendChild(document.createTextNode(cssInjector.text));
        }

        container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

        if (referenceElement === undefined) {
            referenceElement = container.firstChild;
        }

        container.insertBefore(style, referenceElement);
    }
    /* inject:css */
    /* endinject */

    // Interface
    module.exports = FooBar;

})(
    typeof window === 'undefined' ? module : window.module || (window.FooBar = {}),
    typeof window === 'undefined' ? module.exports : window.module && window.module.exports || (window.FooBar.exports = {})
) || (
    typeof window === 'undefined' || window.module || (window.FooBar = window.FooBar.exports)
);

/* About the above IIFE:
 * This file is a "modified node module." It functions as usual in Node.js *and* is also usable directly in the browser.
 * 1. Node.js: The IIFE is superfluous but innocuous.
 * 2. In the browser: The IIFE closure serves to keep internal declarations private.
 * 2.a. In the browser as a global: The logic in the actual parameter expressions + the post-invocation expression
 * will put your API in `window.FooBar`.
 * 2.b. In the browser as a module: If you predefine a `window.module` object, the results will be in `module.exports`.
 * The bower component `mnm` makes this easy and also provides a global `require()` function for referencing your module
 * from other closures. In either case, this works with both NodeJs-style export mechanisms -- a single API assignment,
 * `module.exports = yourAPI` *or* a series of individual property assignments, `module.exports.property = property`.
 *
 * Before the IIFE runs, the actual parameter expressions are executed:
 * 1. If `window` object undefined, we're in NodeJs so assume there is a `module` object with an `exports` property
 * 2. If `window` object defined, we're in browser
 * 2.a. If `module` object predefined, use it
 * 2.b. If `module` object undefined, create a `FooBar` object
 *
 * After the IIFE returns:
 * Because it always returns undefined, the expression after the || will execute:
 * 1. If `window` object undefined, then we're in NodeJs so we're done
 * 2. If `window` object defined, then we're in browser
 * 2.a. If `module` object predefined, we're done; results are in `moudule.exports`
 * 2.b. If `module` object undefined, redefine`FooBar` to be the `FooBar.exports` object
 */
