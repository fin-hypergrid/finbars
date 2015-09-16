'use strict';

/* eslint-env node, browser */

/** @typedef {object} positionObjectType
 *
 * @desc Only enough of the following style properties for accurate placement need to be specified. These will of course override any styles already defined by stylesheets.
 *
 * Caveat: Percentage values can be used however be aware that this will be a percentage of the scrollbar's box size which is its content including padding, but excluding margins. Therefore, if your scrollbar has non-zero margins, the resulting scrollbar will be bigger than the container's content area, which is not what you want. In this case you must give an explict size in pixels.
 *
 * @property {number} [left]
 * @property {number} [top]
 * @property {number} [right]
 * @property {number} [bottom]
 * @property {number} [width]
 * @property {number} [height]
 */

/** @typedef {function} foobarCallbackType
 *
 * @desc A callback function to be invoked whenever the scroll index changes, as follows:
 *
 * * **Explicit scrolling** caused by calls to the following FooBar methods:
 *   * Called by the {@link FooBar|set} method
 *   * Called by the {@link FooBar|resize} method
 *
 * * **Implicit scrolling** due to the following user interactions:
 *   * Called repeatedly as user drags the scrollbar thumb
 *   * Called repeatedly as user spins the mouse wheel while mouse pointer is positioned inside of the {@link FooBar|container} element
 *   * Called once per mouse click in the page-up region above the thumb
 *   * Called once per mouse click in the page-down region below the thumb
 *
 * @this The calling context (the `this` value) is the FooBar object returned by the constructor. See the members section of the {@link FooBar} page.
 * @param {number} value - The scrollbar index, always a value between {@link FooBar|min} and {@link FooBar|max}.
 */

/** @typedef {object} foobarOptionsType
 *
 * @desc As an "options" object, all properties herein are optional. Omitted properties take on the default values shown. All options including any additional ("custom") options are available to the `onchange` callback function in the `this.options` object.
 *
 * @property {number} [orientation='vertical'] - Flavor of scrollbar to create. Useful values are `'vertical'` (the default) or `'horizontal'`.
 *
 * @property {foobarCallbackType} [onchange] - Callback function for scrolling. (See type definition for details and calling signature).
 *
 * @property {string} [cssClassPrefix='foobar'] - A string used to form the name of the CSS class referenced by the new scrollbar element. The class name will be the concatenation of:
 * #. This string
 * #. A hyphen character
 * #. The value of the `orientation` option
 *
 * For example, `foobar-vertical` and `foobar-horizontal`.
 *
 * There should be defined CSS selectors using these names, as per the example in `src/css/foobars.css`.
 *
 * @property {string} [deltaProp='deltaY'] - The name of the wheel event object property containing the relevant wheel delta data. Useful values are `'deltaX'`, `'deltaY'`, or `'deltaZ'`. The default value shown, `'deltaY'`, is for vertical scrollbars; it becomes `'deltaX'` for horizontal scrollbars. You can give an explicit value here to override the default.
 */

(function (module, exports) { // Closure supports Node-less client side includes with <script> tag.

    /**
     * @constructor FooBar
     * @summary Create a scrollbar object.
     * @desc In addition to creating this object, also creates the scrollbar `<div>...</div>` element ({@link FooBar|bar}) with its single thumb child element ({@link FooBar|thumb}).
     *
     * @param {number} min - The minimum index value of the new scrollbar.
     * @param {number} max - The maximum index value of the new scrollbar.
     * @param {foobarOptionsType} [options={}] - Options object. See the type definition for details.
     */
    function FooBar(min, max, options) {
        /**
         * @name options
         * @type {foobarOptionsType}
         * @memberOf FooBar.prototype
         */
        this.options = options = options || {};

        if (!options.orientation) {
            options.orientation = 'vertical';
        } else if (!/^vertical|horizontal$/.test(options.orientation)) {
            throw 'Invalid value for orientation option.';
        }

        this.op = orientationProps[options.orientation];

        if (!options.deltaProp) {
            options.deltaProp = this.op.delta;
        } else if (!/^delta[XYZ]$/.test(options.deltaProp)) {
            throw 'Invalid value for deltaProp option.';
        }

        this._bound = {};
        for (var key in handlersToBeBound) {
            this._bound[key] = handlersToBeBound[key].bind(this);
        }

        /**
         * @abstract
         * @readonly
         * @name min
         * @summary The minimum scroll value.
         * @desc This value is defined by the constructor. This is the lowest value acceptable to `this.set()` and returnable by `this.get()`.
         *
         * As implemented, this value should not be modified after instantiation. This could be remedied by making a setter that calls _calcThumb to reposition the thumb.
         * @type {number}
         * @memberOf FooBar.prototype
         */
        this.min = min;

        /**
         * @abstract
         * @readonly
         * @name max
         * @summary The maximum scroll value.
         * @desc This value is defined by the constructor. This is the highest value acceptable to `this.set()` and returnable by `this.get()`.
         *
         * As implemented, this value should not be modified after instantiation. This could be remedied by making a setter that calls _calcThumb to reposition the thumb.
         * @type {number}
         * @memberOf FooBar.prototype
         */
        this.max = max;

        /**
         * @abstract
         * @name thumb
         * @summary The generated scrollbar thumb element.
         * @desc This property is typically not referenced externally.
         * @type {Element}
         * @memberOf FooBar.prototype
         */
        this.thumb = document.createElement('div');
        this.thumb.classList.add('thumb');
        this.thumb.style.position = 'absolute';
        this.thumb.onclick = this._bound.shortStop;
        this.thumb.onmouseover = this._bound.onmouseover;
        this.thumb.onmouseout = this._bound.onmouseout;

        /**
         * @abstract
         * @name bar
         * @summary The generated scrollbar element.
         * @desc The caller must insert `this.bar` element into the DOM and then call `this.resize()` on it.
         * @type {Element}
         * @memberOf FooBar.prototype
         */
        this.bar = document.createElement('div');
        this.bar.classList.add((options.cssClassPrefix || 'foobar') + '-' + options.orientation);
        this.bar.style.position = 'absolute';
        this.bar.appendChild(this.thumb);
        this.bar.onclick = this._bound.onclick;

        if (options.container && options.position) {
            options.container.appendChild(this.bar);
            this.resize();
        }
    }

    FooBar.prototype = {

        /**
         * @summary Set the value of the scrollbar.
         * @desc This method calculates the position of the scroll thumb from the given `index`, which is clamped to `[min..max]`. If the `onchange` callback is defined then it is called, typically to adjust the viewport or whatever.
         * @param {number} index
         * @returns {FooBar} Self for chaining.
         * @memberOf FooBar.prototype
         */
        set index (idx) {
            idx = Math.min(this.max, Math.max(this.min, idx)); // clamp it
            var scaled = (idx - this.min) / (this.max - this.min) * this.thumbMax;
            this._setScroll(idx, scaled);
            this._calcThumb();
            return this;
        },

        /**
         * @summary Get the current value of the scrollbar.
         * @desc Return values will be in the range `[min..max]`.
         * This method calculates the current index from the thumb position.
         * Call this as an alternative to (or in addition to) using the `onchange` callback.
         * @returns {number} The current scrollbar index. Intentionally not rounded.
         * @memberOf FooBar.prototype
         */
        get index () {
            var scaled = (this.thumbBox[this.op.leadingEdge] - this.offset) / this.thumbMax;
            var idx = scaled * (this.max - this.min) + this.min;
            return idx;
        },

        /*
         * @private
         * @param idx
         * @param scaled
         * @memberOf FooBar.prototype
         */
        _setScroll: function (idx, scaled) {
            idx =  Math.round(idx);

            if (this.testPanelItem && 'val' in this.testPanelItem) {
                this.testPanelItem.val.innerHTML = idx;
            }

            if (this.options.onchange) {
                this.options.onchange.call(this, idx);
            }

            this.thumb.style[this.op.leadingEdge] = scaled + 'px';
        },

        /**
         * @summary Recalculate thumb position.
         * @desc Call this method once after inserting your scrollbar into the DOM. Note that the constructor will do this for you if you supply a `container` element in the options object.
         *
         * In addition, you must call this method again each time the parent element is resized.
         *
         * @param {positionObjectType} [position=this.options.position] - Object with one or more of the properties in `foorbarOptionsType'.
         *
         * If omitted and `this.options.position` also undefined, defaults shall be as documented for `foobarOptionsType.position`.
         *
         * @returns {FooBar} Self for chaining.
         * @memberOf FooBar.prototype
         */
        resize: function (contentSize, position) {
            var bar = this.bar,
                barBox = this.bar.parentElement.getBoundingClientRect(),
                barSize = [this.op.size],
                container = bar.parentElement;

            if (typeof contentSize === 'object') {
                position = contentSize;
                contentSize = undefined;
            }

            if (contentSize) {
                this.options.contentSize = contentSize;
            }

            if (!bar.parentElement) {
                throw 'FooBar.resize() called before DOM insertion.';
            }

            position = position || this.options.position;

            if (!position) {
                position = this.options.position = {};
                position[this.op.leadingEdge] = position[this.op.trailingEdge] = 0;
            }

            positionProps.forEach(function (key) {
                if (key in position) {
                    var val = position[key], n = Number(val);
                    if (!isNaN(Number(val))) {
                        val += 'px';
                    } else if (key == this.op.size && /%$/.test(val)) {
                        // when bar size given as percentage and the bar has margins,convert to pixels.
                        // We do this because CSS does not consider margins when working percentages.
                        var style = window.getComputedStyle(bar),
                            margins = parseInt(style[this.op.marginTrailing]) + parseInt(style[this.op.marginTrailing]);
                        if (margins) {
                            val = parseInt(val, 10) / 100 * (barSize + margins) + 'px';
                        }
                    }
                    bar.style[key] = val;
                }
            });

            var oldIndex = this.thumbBox ? this.index : 0;

            this.testPanelItem = addTestPanelItem(
                container.parentElement.getElementsByClassName('foobar-test-panel')[0] ||
                document.getElementsByClassName('foobar-test-panel')[0]
            );

            this._calcThumb();
            this.index = oldIndex;

            container.addEventListener('wheel', this._bound.onwheel);

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

            if (this.options.container) {
                this.options.container._removeEvt('wheel', this._bound.onwheel);
            }

            this.bar.onclick =
            this.thumb.onclick =
            this.thumb.onmouseover =
            this.thumb.onmouseout = null;
        },

        _calcThumb: function () {
            var op = this.op;
            var thumbComp = window.getComputedStyle(this.thumb);
            var thumbMarginLeading = parseInt(thumbComp[op.marginLeading]);
            var thumbMarginTrailing = parseInt(thumbComp[op.marginTrailing]);
            var thumbMargins = thumbMarginLeading + thumbMarginTrailing;
            var barBox = this.bar.getBoundingClientRect();
            var barSize = barBox[op.size];
            var thumbSize = 20; // Math.round(barSize / this.options.pixelsPerUnit / (this.max + this.pageSize - this.min + 1) * barSize);
            this.thumb.style[op.size] = Math.max(20, thumbSize) + 'px';
            this.thumbBox = this.thumb.getBoundingClientRect();
            this.thumbMax = barSize - this.thumbBox[op.size] - thumbMargins;
            this.offset = barBox[op.leadingEdge] + thumbMarginLeading;
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

    // The following DOM event handlers to be bound to a FooBar instance as context.
    // In other words, once they're bound, the `this` in these handlers shall refer
    // to the FooBar object and not to the event emitter. "Do not consume raw."

    var handlersToBeBound = {
        shortStop: function (evt) {
            evt.stopPropagation();
        },

        onwheel: function (evt) {
            this.index += evt[this.options.deltaProp];
            evt.stopPropagation();
            evt.preventDefault();
        },

        onclick: function (evt) {
            var goingUp = evt.y < this.thumbBox.top;

            if (this.testPanelItem.val) {
                this.testPanelItem.val.innerHTML = goingUp ? 'PgUp' : 'PgDn';
            }

            this.index = this.index + (goingUp ? -1 : 1);
        },

        onmouseover: function () {
            this.thumb.classList.add('hover');
            this._addEvt('mousedown');
        },

        onmouseout: function () {
            this._removeEvt('mousedown');
            this.thumb.classList.remove('hover');
        },

        onmousedown: function (evt) {
            this.thumb.onmouseout = null;
            this._removeEvt('mousedown');

            this.pinOffset = evt[this.op.axis] - this.thumbBox[this.op.leadingEdge] + this.offset;
            document.documentElement.style.cursor = 'default';

            this._addEvt('mousemove');
            this._addEvt('mouseup');

            evt.stopPropagation();
            evt.preventDefault();
        },

        onmousemove: function (evt) {
            var scaled = Math.min(this.thumbMax, Math.max(0, evt[this.op.axis] - this.pinOffset));
            var idx = scaled / this.thumbMax * (this.max - this.min) + this.min;

            this._setScroll(idx, scaled);

            evt.stopPropagation();
            evt.preventDefault();
        },

        onmouseup: function (evt) {
            this._removeEvt('mousemove');
            this._removeEvt('mouseup');
            document.documentElement.style.cursor = 'auto';

            this.thumbBox = this.thumb.getBoundingClientRect(); // thumb may have moved!
            if (
                this.thumbBox.left <= evt.x && evt.x <= this.thumbBox.right &&
                this.thumbBox.top <= evt.y && evt.y <= this.thumbBox.bottom
            ) {
                evt.stopPropagation();
            } else {
                this._bound.onmouseout(evt);
            }

            this.thumb.onmouseout = this._bound.onmouseout;

            evt.preventDefault();
        }
    };

    /**
     * @private
     * @function addTestPanelItem
     * @summary Append a test panel element.
     * @desc If there is a test panel in the DOM (typically an `<ol>...</ol>` element) with an ID of `foobar-test-panel`, an `<li>...</li>` element will be created and appended to it. This new element will contain a span for each class name given.
     *
     * You should define a CSS selector `.listening` for these spans. This class will be added to the spans to alter their appearance when a listener is added with that class name (prefixed with 'on').
     *
     * (This is an internal function that is called once by the constructor on every instantiation.)
     * @param {...string} className - A class names for each of your spans.
     * @returns {Element|undefined} The appended `<li>...</li>` element or `undefined` if there is no test panel.
     */
    function addTestPanelItem(testPanelElement) {
        var element;

        if (testPanelElement) {
            var item = document.createElement('li');
            var testPanelItemPartNames = [ 'mousedown', 'mousemove', 'mouseup', 'val' ];

            testPanelItemPartNames.forEach(function (partName) {
                item.innerHTML += '<span class="' + partName + '">' + partName.replace('mouse', '') + '</span>';
            });

            testPanelElement.appendChild(item);

            element = {};
            testPanelItemPartNames.forEach(function (partName) {
                element[partName] = item.getElementsByClassName(partName)[0];
            });
        }

        return element;
    }

    var positionProps = [ 'top', 'left', 'right', 'bottom', 'width', 'height' ];

    var orientationProps = {
        vertical: {
            axis: 'pageY',
            leadingEdge: 'top',
            trailingEdge: 'bottom',
            side: 'right',
            size: 'height',
            marginLeading: 'marginTop',
            marginTrailing: 'marginBottom',
            delta: 'deltaY'
        },
        horizontal: {
            axis: 'pageX',
            leadingEdge: 'left',
            trailingEdge: 'right',
            side: 'bottom',
            size: 'width',
            marginLeading: 'marginLeft',
            marginTrailing: 'marginRight',
            delta: 'deltaX'
        }
    };

    // Interface
    module.exports = FooBar;

})(module, module.exports);

