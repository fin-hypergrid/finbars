'use strict';

/* eslint-env node, browser */

(function (module/*, exports*/) { // closure for when there's no Node.js (in which case define window.module)

    /**
     * @constructor FooBar
     * @summary Create a scrollbar object.
     * @desc In addition to creating this object, also creates the scrollbar `<div>...</div>` element with its single thumb child element.
     *
     * It is the responsibility of the caller to insert the scrollbar element into the DOM.
     *
     * The `callback` function, if supplied, will be called repeatedly during implicit movement (by user interaction); or once per explicit movement (by calling `this.set()`).
     * @param {number} min - The minimum index value of the new scrollbar.
     * @param {number} max - The maximum index value of the new scrollbar.
     * @param {function} [callback] - Function to be called during thumb movement.
     * @param {number} [orientation='vertical'] - What kind of scrollbar to create.
     */
    function FooBar(min, max, callback, orientation) {
        this.callback = callback;

        this.testPanel = appendTestPanelItem('mousedown', 'mousemove', 'mouseup', 'val');

        this._op = orientationProperties[orientation = orientation || 'vertical'];
        this.bound = {};
        for (var key in handlers) {
            this.bound[key] = handlers[key].bind(this);
        }

        /**
         * @abstract
         * @name min
         * @summary The minimum scroll value.
         * @desc This value is defined by the constructor.
         * This is the lowest value acceptable to `this.set()` and returnable by `this.get()`.
         * @type {number}
         * @memberOf FooBar.prototype
         */
        this.min = min;

        /**
         * @abstract
         * @name max
         * @summary The maximum scroll value.
         * @desc This value is defined by the constructor.
         * This is the highest value acceptable to `this.set()` and returnable by `this.get()`.
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
        this.thumb.onclick = this.bound.shortStop;
        this.thumb.onmouseover = this.bound.onmouseover;
        this.thumb.onmouseout = this.bound.onmouseout;

        /**
         * @abstract
         * @name bar
         * @summary The generated scrollbar element.
         * @desc The caller must insert `this.bar` element into the DOM and then call `this.resize()` on it.
         * @type {Element}
         * @memberOf FooBar.prototype
         */
        this.bar = document.createElement('div');
        this.bar.classList.add('foobar-' + orientation);
        this.bar.appendChild(this.thumb);
        this.bar.onclick = this.bound.onclick;
    }

    FooBar.prototype = {

        /**
         * @summary Set the value of the scrollbar.
         * @desc This method calculates the position of the scroll thumb from the given `index`, which is clamped to `[min..max]`.
         * If defined, `callback` is then called, typically to adjust the viewport or whatever.
         * @param {number} index
         * @returns {FooBar} Self for chaining.
         * @memberOf FooBar.prototype
         */
        set: function (index) {
            index = Math.min(this.max, Math.max(this.min, Math.round(index))); // clamp it
            var scaled = Math.round((index - this.min) / (this.max - this.min) * this.maxThumb);
            this._setScroll(index, scaled);
            this._calcThumb();
            return this;
        },

        /**
         * @summary Get the current value of the scrollbar.
         * @desc Return values will be in the range `[min..max]`.
         * This method calculates the current index from the thumb position.
         * Call this as an alternative to (or in addition to) setting the `callback`.
         * @returns {number} The current scrollbar index.
         * @memberOf FooBar.prototype
         */
        get: function () {
            var scaled = (this.thumbBox[this._op.side] - this.offset) / this.maxThumb;
            var index = Math.round(scaled * (this.max - this.min)) + this.min;
            return index;
        },

        /*
         * @private
         * @param index
         * @param scaled
         * @memberOf FooBar.prototype
         */
        _setScroll: function (index, scaled) {
            if (this.testPanel.val) {
                this.testPanel.val.innerHTML = index;
            }

            if (this.callback) {
                this.callback.call(this, index);
            }

            this.thumb.style[this._op.side] = scaled + 'px';
        },

        /**
         * @summary Recalculate thumb position.
         * @desc Call this method once after appending `yourFooBar.bar` to the DOM.
         * Call again each time the parent element is resized.
         * @param {object} [rect] - Object with one or more of the keys in `positionProperties'. If omitted, bar will be positioned along right edge of parent element for "vertical" bars and bottom edge of parent element for "horizontal" bars.
         * @param {Element} [container] - Element from which to emit mousewheel events. Typically the parent element mentioned above though not necessarilly.
         * @returns {FooBar} Self for chaining.
         * @memberOf FooBar.prototype
         */
        resize: function (rect, container) {
            var bar = this.bar;

            if (!rect) {
                rect = {};
                rect[this._op.edge] = rect[this._op.side] = 0;
                rect[this._op.size] = '100%';
            }

            if (!bar.parentElement) {
                throw 'FooBar.resize() called before DOM insertion.';
            }

            positionProperties.forEach(function (key) {
                if (key in rect) {
                    var val = rect[key];
                    if (/^\d+$/.test(val)) { val += 'px'; }
                    bar.style[key] = val;
                }
            });

            this._calcThumb();

            if (container !== this.container) {
                if (this.container) {
                    this.container.removeEventListener('wheel', this.bound.onwheel);
                }

                this.container = container;

                if (this.container) {
                    this.container.addEventListener('wheel', this.bound.onwheel);
                }
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

            if (this.container) {
                this.container._removeEvt('wheel', this.bound.onwheel);
            }

            this.bar.onclick =
            this.thumb.onclick =
            this.thumb.onmouseover =
            this.thumb.onmouseout = null;
        },

        _calcThumb: function () {
            var keys = this._op;
            var thumbComp = window.getComputedStyle(this.thumb);
            var marginTrailing = parseInt(thumbComp[keys.marginTrailing]);
            var marginLeading = parseInt(thumbComp[keys.marginLeading]);
            var barBox = this.bar.getBoundingClientRect();
            var barSize = barBox[keys.size];
            var thumbSize = Math.round(barSize / (this.max - this.min + 1));
            this.thumb.style[keys.size] = Math.max(20, thumbSize) + 'px';
            this.thumbBox = this.thumb.getBoundingClientRect();
            this.maxThumb = barBox[keys.size] - this.thumbBox[keys.size] - marginLeading - marginTrailing;
            this.offset = barBox[keys.side] + marginLeading;
        },

        _addEvt: function (evtName) {
            var spy = this.testPanel && this.testPanel[evtName];
            if (spy) { spy.classList.add('listening'); }
            window.addEventListener(evtName, this.bound['on' + evtName]);
        },

        _removeEvt: function (evtName) {
            var spy = this.testPanel && this.testPanel[evtName];
            if (spy) { spy.classList.remove('listening'); }
            window.removeEventListener(evtName, this.bound['on' + evtName]);
        }
    };

    // DOM event handlers - do not use raw; these need to be bound to a FooBar instance

    var handlers = {
        shortStop: function (evt) {
            evt.stopPropagation();
        },

        onwheel: function (evt) {
            this.set(this.get() + evt[this._op.delta] / 5);
            evt.stopPropagation();
            evt.preventDefault();
        },

        onclick: function (evt) {
            var goingUp = evt.y < this.thumbBox.top;

            if (this.testPanel.val) {
                this.testPanel.val.innerHTML = goingUp ? 'PgUp' : 'PgDn';
            }

            this.set(this.get() + (goingUp ? -1 : 1));
        },

        onmouseover: function (evt) {
            this.thumb.classList.add('hover');
            this._addEvt('mousedown');
            evt.stopPropagation();
        },

        onmouseout: function (evt) {
            this._removeEvt('mousedown');
            this.thumb.classList.remove('hover');
            evt.stopPropagation();
        },

        onmousedown: function (evt) {
            this.thumb.onmouseout = null;
            this._removeEvt('mousedown');

            this.pinOffset = evt[this._op.axis] - this.thumbBox[this._op.side] + this.offset;
            document.documentElement.style.cursor = 'default';

            this._addEvt('mousemove');
            this._addEvt('mouseup');

            evt.stopPropagation();
            evt.preventDefault();
        },

        onmousemove: function (evt) {
            var scaled = Math.min(this.maxThumb, Math.max(0, evt[this._op.axis] - this.pinOffset));
            var index = Math.round(scaled / this.maxThumb * (this.max - this.min)) + this.min;

            this._setScroll(index, scaled);

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
                this.bound.onmouseout(evt);
            }

            this.thumb.onmouseout = this.bound.onmouseout;

            evt.preventDefault();
        }
    };

    /**
     * @private
     * @function appendTestPanelItem
     * @summary Append a test panel element.
     * @desc If there is a test panel in the DOM (typically an `<ol>...</ol>` element) with an ID of `foobar-test-panel`, an `<li>...</li>` element will be created and appended to it. This new element will contain a span for each class name given.
     *
     * You should define a CSS selector `.listening` for these spans. This class will be added to the spans to alter their appearance when a listener is added with that class name (prefixed with 'on').
     *
     * (This is an internal function that is called once by the constructor on every instantiation.)
     * @param {...string} className - Class names for spans.
     * @returns {Element|undefined} The appended `<li>...</li>` element or `undefined` if there is no test panel.
     */
    function appendTestPanelItem() {
        var list = document.getElementById('foobar-test-panel');
        if (list) {
            var classNames = Array.prototype.slice.call(arguments);

            var item = document.createElement('li');
            classNames.forEach(function (prop) {
                item.innerHTML += '<span class="' + prop + '">' + prop.replace('mouse', '') + '</span>';
            });
            list.appendChild(item);

            var element = {};
            classNames.forEach(function (prop) {
                element[prop] = item.getElementsByClassName(prop)[0];
            });
        }
        return element;
    }

    var positionProperties = [ 'top', 'left', 'right', 'bottom', 'width', 'height' ];

    var orientationProperties = {
        vertical: {
            axis: 'pageY',
            side: 'top',
            edge: 'right',
            size: 'height',
            marginLeading: 'marginTop',
            marginTrailing: 'marginBottom',
            delta: 'deltaY'
        },
        horizontal: {
            axis: 'pageX',
            side: 'left',
            edge: 'bottom',
            size: 'width',
            marginLeading: 'marginLeft',
            marginTrailing: 'marginRight',
            delta: 'deltaX'
        }
    };

    // Interface
    module.exports = FooBar;


})(module, module.exports);
