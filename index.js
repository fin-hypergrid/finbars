'use strict';

/* eslint-env node, browser */

(function (module) {  // eslint-disable-line no-unused-expressions

    // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

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
                case 'cssStylesheetReferenceElement':
                    cssInjector(option);
                    break;

                case 'index':
                    this._index = option;
                    break;

                case 'range':
                    validRange(option);
                    this._min = option.min;
                    this._max = option.max;
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
            this.oh = orientations[this._orientation];

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
         * @summary Number of scrollbar index units representing a pageful. Used for paging up and down and for setting thumb size relative to content size.
         * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object. Note however that this property is set automatically (by the {@link FinBar#resize|resize} method) when binding to real content.
         *
         * May be updated by calls to the {@link FinBar#resize|resize} method.
         * @type {number}
         * @memberOf FinBar.prototype
         */
        increment: 1,

        /**
         * @name barStyles
         * @summary Scrollbar styles to be applied by {@link FinBar#resize|resize()}.
         * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
         *
         *  Scrollbar styles to be applied to the scrollbar element upon calls to {@link FinBar#resize|resize()}. It is always preferable to specify styles via a stylesheet. Only specify a `barStyles` object when you need to specifically override (a) stylesheet value(s).
         *
         * See type definition for details.
         *
         * May be updated through calls to the {@link FinBar#resize|resize} method.
         * @type {finbarStyles}
         * @memberOf FinBar.prototype
         */
        barStyles: {},

        /**
         * @readonly
         * @name paging
         * @summary Enable page up/dn clicks.
         * @desc Listen for clicks in page-up and page-down regions of scrollbar.
         *
         * The string 'auto' uses the current pixel size of the content area (the dimension reflecting your scrollbar's orientation). Note however that this only makes sense when your index unit is pixels.
         *
         * Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
         *
         * Read only; changing this value after instantiation will have no effect.
         * @type {boolean}
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
            this._calcThumb();
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
                scaled = (idx - this._min) / (this._max - this._min) * this._thumbMax;
            }
            this.thumb.style[this.oh.leading] = scaled + 'px';
        },

        scrollRealContent: function (idx) {
            var containerRect = this.content.parentElement.getBoundingClientRect(),
                sizeProp = this.oh.size,
                maxScroll = Math.max(0, this.content[sizeProp] - containerRect[sizeProp]),
                scroll = (idx - this._min) / (this._max - this._min) * maxScroll;

            this.content.style[this.oh.leading] = -scroll + 'px';
        },

        /**
         * @summary Recalculate thumb position.
         *
         * @desc This method recalculates the thumb size and position. Call it once after inserting your scrollbar into the DOM, and repeatedly while resizing the scrollbar (which typically happens when the scrollbar's parent is resized by user, as when user drags window's lower right corner resize handle).
         *
         * @param {number|string} [increment=this.increment] - Number of index units per pageful. Used for page-up and page-down; and also to size the thumb.
         *
         * > The thumb size has an absolute minimum of 20 (pixels).
         *
         * @param {finbarStyles} [barStyles=this.barStyles] - (See type definition for details.) Scrollbar styles to be applied to the bar element. Note that before applying these new values, _all_ the scrollbar's style values are reset, exposing inherited values.
         *
         * Only specify a `barStyles` object when you need to override stylesheet values. If provided, becomes the new default (`this.barStyles`), for use as a default on subsequent calls.
         *
         * It is generally the case that the scrollbar's new position is sufficiently described by the current styles. Therefore it is unusual to need to provide a `barStyles` object on every call to `resize`.
         *
         * Properties of this object are adjusted as follows before they are applied:
         * 1. Included pseudo-property names (from {@link FinBar#prop|this.oh}) are translated to actual property names before being applied.
         * 2. Percentages are recalculated as pixel units when there are margins because CSS does not exclude margins from the calculation and normally does not give you what you wanted.
         * 3. The "px" unit is appended to raw numbers.
         *
         * @returns {FinBar} Self for chaining.
         * @memberOf FinBar.prototype
         */
        resize: function (increment, barStyles) {
            var bar = this.bar,
                container = this.container || bar.parentElement;

            if (!bar.parentNode) {
                return; // not in DOM yet so nothing to do
            }

            var containerRect = container.getBoundingClientRect(),
                barRect = bar.getBoundingClientRect();

            // promote 2nd param if 1st omitted
            if (typeof increment === 'object') {
                barStyles = increment;
                increment = undefined;
            }

            // Bound to real content: Content was given but no onchange handler.
            // Set up .onchange, .increment, .min, and .max.
            // Note this only makes sense if your index unit is pixels.
            if (this.content && !this.onchange && this.onchange !== this.scrollRealContent) {
                this.onchange = this.scrollRealContent;
                increment = containerRect[this.oh.size];
                this._min = this._index = 0;
                this._max = this.content[this.oh.size] - increment - 1;
            }

            increment = this.increment = increment || this.increment;
            barStyles = this.barStyles = barStyles || this.barStyles;

            // revert all styles to values inherited from stylesheets by removing style attrribute;
            // then apply styles in `barStyles`
            bar.removeAttribute('style');

            for (var key in barStyles) {
                if (barStyles.hasOwnProperty(key)) {
                    var val = barStyles[key];

                    if (key in this.oh) {
                        key = this.oh[key];
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

        _calcThumb: function () {
            var prop = this.oh;
            var thumbComp = window.getComputedStyle(this.thumb);
            var thumbMarginLeading = parseInt(thumbComp[prop.marginLeading]);
            var thumbMarginTrailing = parseInt(thumbComp[prop.marginTrailing]);
            var thumbMargins = thumbMarginLeading + thumbMarginTrailing;
            var barBox = this.bar.getBoundingClientRect();
            var barSize = barBox[prop.size];

            // adjust size of thumb to `increment` as fraction of index range
            var range = this._max - this._min + this.increment; // adding in `increment` puts last item on bottom of last page rather than top
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
             * @memberOf FinBar
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

    function validRange(range) {
        var keys = Object.keys(range),
            valid =  keys.length === 2 &&
                typeof range.min === 'number' &&
                typeof range.max === 'number' &&
                range.min < range.max;

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
            var thumbBox = this.thumb.getBoundingClientRect();
            this.index += evt[this.oh.coordinate] < thumbBox[this.oh.leading] ? -this.increment : this.increment;
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

    var orientations = {
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

    /**
     * @summary Insert base stylesheet into DOM
     * @private
     * @param {Element} [referenceElement]
     * if `undefined` (or omitted) or `null`, injects stylesheet at top or bottom of <head>, respectively, but only once;
     * otherwise, injects stylesheet immediately before given element
     */
    function cssInjector(referenceElement) {
        var container, style, ID = 'finbars-base-styles';

        if (
            !cssInjector.text || // no stylesheet data
            document.getElementById(ID) // stylesheet already in DOM
        ) {
            return;
        }

        if (typeof referenceElement === 'string') {
            referenceElement = document.querySelector(referenceElement);
            if (referenceElement) {
                referenceElement = referenceElement[0];
            } else {
                error('Cannot find reference element for CSS injection.');
            }
        }

        if (!(referenceElement instanceof Element)) {
            referenceElement = undefined;
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
    cssInjector.text = 'div.finbar-horizontal,div.finbar-vertical{position:absolute;margin:3px}div.finbar-horizontal>.thumb,div.finbar-vertical>.thumb{position:absolute;background-color:#d3d3d3;-webkit-box-shadow:0 0 1px #000;-moz-box-shadow:0 0 1px #000;box-shadow:0 0 1px #000;border-radius:4px;margin:2px;opacity:.4;transition:opacity .5s}div.finbar-horizontal>.thumb.hover,div.finbar-vertical>.thumb.hover{opacity:1;transition:opacity .5s}div.finbar-vertical{top:0;bottom:0;right:0;width:11px}div.finbar-vertical>.thumb{top:0;right:0;width:7px}div.finbar-horizontal{left:0;right:0;bottom:0;height:11px}div.finbar-horizontal>.thumb{left:0;bottom:0;height:7px}';
    /* endinject */

    function error(msg) {
        throw 'finbars: ' + msg;
    }

    // Interface
    module.exports = FinBar;
})(
    typeof module === 'object' && module || (window.FinBar = {}),
    typeof module === 'object' && module.exports || (window.FinBar.exports = {})
) || (
    typeof module === 'object' || (window.FinBar = window.FinBar.exports)
);

/* About the above IIFE:
 * This file is a "modified node module." It functions as usual in Node.js *and* is also usable directly in the browser.
 * 1. Node.js: The IIFE is superfluous but innocuous.
 * 2. In the browser: The IIFE closure serves to keep internal declarations private.
 * 2.a. In the browser as a global: The logic in the actual parameter expressions + the post-invocation expression
 * will put your API in `window.FinBar`.
 * 2.b. In the browser as a module: If you predefine a `window.module` object, the results will be in `module.exports`.
 * The bower component `mnm` makes this easy and also provides a global `require()` function for referencing your module
 * from other closures. In either case, this works with both NodeJs-style export mechanisms -- a single API assignment,
 * `module.exports = yourAPI` *or* a series of individual property assignments, `module.exports.property = property`.
 *
 * Before the IIFE runs, the actual parameter expressions are executed:
 * 1. If `window` object undefined, we're in NodeJs so assume there is a `module` object with an `exports` property
 * 2. If `window` object defined, we're in browser
 * 2.a. If `module` object predefined, use it
 * 2.b. If `module` object undefined, create a `FinBar` object
 *
 * After the IIFE returns:
 * Because it always returns undefined, the expression after the || will execute:
 * 1. If `window` object undefined, then we're in NodeJs so we're done
 * 2. If `window` object defined, then we're in browser
 * 2.a. If `module` object predefined, we're done; results are in `moudule.exports`
 * 2.b. If `module` object undefined, redefine`FinBar` to be the `FinBar.exports` object
 */
