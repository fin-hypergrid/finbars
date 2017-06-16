'use strict';

/* eslint-env node, browser */

/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule UserAgent_DEPRECATED
 */

/**
 *  Provides entirely client-side User Agent and OS detection. You should prefer
 *  the non-deprecated UserAgent module when possible, which exposes our
 *  authoritative server-side PHP-based detection to the client.
 *
 *  Usage is straightforward:
 *
 *    if (UserAgent_DEPRECATED.ie()) {
 *      //  IE
 *    }
 *
 *  You can also do version checks:
 *
 *    if (UserAgent_DEPRECATED.ie() >= 7) {
 *      //  IE7 or better
 *    }
 *
 *  The browser functions will return NaN if the browser does not match, so
 *  you can also do version compares the other way:
 *
 *    if (UserAgent_DEPRECATED.ie() < 7) {
 *      //  IE6 or worse
 *    }
 *
 *  Note that the version is a float and may include a minor version number,
 *  so you should always use range operators to perform comparisons, not
 *  strict equality.
 *
 *  **Note:** You should **strongly** prefer capability detection to browser
 *  version detection where it's reasonable:
 *
 *    http://www.quirksmode.org/js/support.html
 *
 *  Further, we have a large number of mature wrapper functions and classes
 *  which abstract away many browser irregularities. Check the documentation,
 *  grep for things, or ask on javascript@lists.facebook.com before writing yet
 *  another copy of "event || window.event".
 *
 */

var _populated = false;

// Browsers
var _ie, _firefox, _opera, _webkit, _chrome;

// Actual IE browser for compatibility mode
var _ie_real_version;

// Platforms
var _osx, _windows, _linux, _android;

// Architectures
var _win64;

// Devices
var _iphone, _ipad, _native;

var _mobile;

function _populate() {
    if (_populated) {
        return;
    }

    _populated = true;

    // To work around buggy JS libraries that can't handle multi-digit
    // version numbers, Opera 10's user agent string claims it's Opera
    // 9, then later includes a Version/X.Y field:
    //
    // Opera/9.80 (foo) Presto/2.2.15 Version/10.10
    var uas = navigator.userAgent;
    var agent = /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))|(?:Trident\/\d+\.\d+.*rv:(\d+\.\d+))/.exec(uas);
    var os    = /(Mac OS X)|(Windows)|(Linux)/.exec(uas);

    _iphone = /\b(iPhone|iP[ao]d)/.exec(uas);
    _ipad = /\b(iP[ao]d)/.exec(uas);
    _android = /Android/i.exec(uas);
    _native = /FBAN\/\w+;/i.exec(uas);
    _mobile = /Mobile/i.exec(uas);

    // Note that the IE team blog would have you believe you should be checking
    // for 'Win64; x64'.  But MSDN then reveals that you can actually be coming
    // from either x64 or ia64;  so ultimately, you should just check for Win64
    // as in indicator of whether you're in 64-bit IE.  32-bit IE on 64-bit
    // Windows will send 'WOW64' instead.
    _win64 = !!(/Win64/.exec(uas));

    if (agent) {
        _ie = agent[1] ? parseFloat(agent[1]) : (
            agent[5] ? parseFloat(agent[5]) : NaN);
        // IE compatibility mode
        if (_ie && document && document.documentMode) {
            _ie = document.documentMode;
        }
        // grab the "true" ie version from the trident token if available
        var trident = /(?:Trident\/(\d+.\d+))/.exec(uas);
        _ie_real_version = trident ? parseFloat(trident[1]) + 4 : _ie;

        _firefox = agent[2] ? parseFloat(agent[2]) : NaN;
        _opera   = agent[3] ? parseFloat(agent[3]) : NaN;
        _webkit  = agent[4] ? parseFloat(agent[4]) : NaN;
        if (_webkit) {
            // We do not add the regexp to the above test, because it will always
            // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
            // the userAgent string.
            agent = /(?:Chrome\/(\d+\.\d+))/.exec(uas);
            _chrome = agent && agent[1] ? parseFloat(agent[1]) : NaN;
        } else {
            _chrome = NaN;
        }
    } else {
        _ie = _firefox = _opera = _chrome = _webkit = NaN;
    }

    if (os) {
        if (os[1]) {
            // Detect OS X version.  If no version number matches, set _osx to true.
            // Version examples:  10, 10_6_1, 10.7
            // Parses version number as a float, taking only first two sets of
            // digits.  If only one set of digits is found, returns just the major
            // version number.
            var ver = /(?:Mac OS X (\d+(?:[._]\d+)?))/.exec(uas);

            _osx = ver ? parseFloat(ver[1].replace('_', '.')) : true;
        } else {
            _osx = false;
        }
        _windows = !!os[2];
        _linux   = !!os[3];
    } else {
        _osx = _windows = _linux = false;
    }
}

var UserAgent_DEPRECATED = {

    /**
     *  Check if the UA is Internet Explorer.
     *
     *
     *  @return float|NaN Version number (if match) or NaN.
     */
    ie: function() {
        return _populate() || _ie;
    },

    /**
     * Check if we're in Internet Explorer compatibility mode.
     *
     * @return bool true if in compatibility mode, false if
     * not compatibility mode or not ie
     */
    ieCompatibilityMode: function() {
        return _populate() || (_ie_real_version > _ie);
    },


    /**
     * Whether the browser is 64-bit IE.  Really, this is kind of weak sauce;  we
     * only need this because Skype can't handle 64-bit IE yet.  We need to remove
     * this when we don't need it -- tracked by #601957.
     */
    ie64: function() {
        return UserAgent_DEPRECATED.ie() && _win64;
    },

    /**
     *  Check if the UA is Firefox.
     *
     *
     *  @return float|NaN Version number (if match) or NaN.
     */
    firefox: function() {
        return _populate() || _firefox;
    },


    /**
     *  Check if the UA is Opera.
     *
     *
     *  @return float|NaN Version number (if match) or NaN.
     */
    opera: function() {
        return _populate() || _opera;
    },


    /**
     *  Check if the UA is WebKit.
     *
     *
     *  @return float|NaN Version number (if match) or NaN.
     */
    webkit: function() {
        return _populate() || _webkit;
    },

    /**
     *  For Push
     *  WILL BE REMOVED VERY SOON. Use UserAgent_DEPRECATED.webkit
     */
    safari: function() {
        return UserAgent_DEPRECATED.webkit();
    },

    /**
     *  Check if the UA is a Chrome browser.
     *
     *
     *  @return float|NaN Version number (if match) or NaN.
     */
    chrome : function() {
        return _populate() || _chrome;
    },


    /**
     *  Check if the user is running Windows.
     *
     *  @return bool `true' if the user's OS is Windows.
     */
    windows: function() {
        return _populate() || _windows;
    },


    /**
     *  Check if the user is running Mac OS X.
     *
     *  @return float|bool   Returns a float if a version number is detected,
     *                       otherwise true/false.
     */
    osx: function() {
        return _populate() || _osx;
    },

    /**
     * Check if the user is running Linux.
     *
     * @return bool `true' if the user's OS is some flavor of Linux.
     */
    linux: function() {
        return _populate() || _linux;
    },

    /**
     * Check if the user is running on an iPhone or iPod platform.
     *
     * @return bool `true' if the user is running some flavor of the
     *    iPhone OS.
     */
    iphone: function() {
        return _populate() || _iphone;
    },

    mobile: function() {
        return _populate() || (_iphone || _ipad || _android || _mobile);
    },

    nativeApp: function() {
        // webviews inside of the native apps
        return _populate() || _native;
    },

    android: function() {
        return _populate() || _android;
    },

    ipad: function() {
        return _populate() || _ipad;
    }
};

/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ExecutionEnvironment
 */

/*jslint evil: true */

var canUseDOM = !!(
    typeof window !== 'undefined' &&
    window.document &&
    window.document.createElement
);

/**
 * Simple, lightweight module assisting with the detection and context of
 * Worker. Helps avoid circular dependencies and allows code to reason about
 * whether or not they are in a Worker, even if they never include the main
 * `ReactWorker` dependency.
 */
var ExecutionEnvironment = {

    canUseDOM: canUseDOM,

    canUseWorkers: typeof Worker !== 'undefined',

    canUseEventListeners:
    canUseDOM && !!(window.addEventListener || window.attachEvent),

    canUseViewport: canUseDOM && !!window.screen,

    isInWorker: !canUseDOM // For now, this is true - might change in the future.

};


/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule isEventSupported
 */


// var ExecutionEnvironment = require('ExecutionEnvironment');

var useHasFeature;
if (ExecutionEnvironment.canUseDOM) {
    useHasFeature =
        document.implementation &&
        document.implementation.hasFeature &&
        // always returns true in newer browsers as per the standard.
        // @see http://dom.spec.whatwg.org/#dom-domimplementation-hasfeature
        document.implementation.hasFeature('', '') !== true;
}


/**
 * Checks if an event is supported in the current execution environment.
 *
 * NOTE: This will not work correctly for non-generic events such as `change`,
 * `reset`, `load`, `error`, and `select`.
 *
 * Borrows from Modernizr.
 *
 * @param {string} eventNameSuffix Event name, e.g. "click".
 * @param {?boolean} capture Check if the capture phase is supported.
 * @return {boolean} True if the event is supported.
 * @internal
 * @license Modernizr 3.0.0pre (Custom Build) | MIT
 */
function isEventSupported(eventNameSuffix, capture) {
    if (!ExecutionEnvironment.canUseDOM ||
        capture && !('addEventListener' in document)) {
        return false;
    }

    var eventName = 'on' + eventNameSuffix;
    var isSupported = eventName in document;

    if (!isSupported) {
        var element = document.createElement('div');
        element.setAttribute(eventName, 'return;');
        isSupported = typeof element[eventName] === 'function';
    }

    if (!isSupported && useHasFeature && eventNameSuffix === 'wheel') {
        // This is the only way to test support for the `wheel` event in IE9+.
        isSupported = document.implementation.hasFeature('Events.wheel', '3.0');
    }

    return isSupported;
}


/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule normalizeWheel
 * @typechecks
 */

// var UserAgent_DEPRECATED = require('UserAgent_DEPRECATED');

// var isEventSupported = require('isEventSupported');


// Reasonable defaults
var PIXEL_STEP  = 10;
var LINE_HEIGHT = 40;
var PAGE_HEIGHT = 800;

/**
 * Mouse wheel (and 2-finger trackpad) support on the web sucks.  It is
 * complicated, thus this doc is long and (hopefully) detailed enough to answer
 * your questions.
 *
 * If you need to react to the mouse wheel in a predictable way, this code is
 * like your bestest friend. * hugs *
 *
 * As of today, there are 4 DOM event types you can listen to:
 *
 *   'wheel'                -- Chrome(31+), FF(17+), IE(9+)
 *   'mousewheel'           -- Chrome, IE(6+), Opera, Safari
 *   'MozMousePixelScroll'  -- FF(3.5 only!) (2010-2013) -- don't bother!
 *   'DOMMouseScroll'       -- FF(0.9.7+) since 2003
 *
 * So what to do?  The is the best:
 *
 *   normalizeWheel.getEventType();
 *
 * In your event callback, use this code to get sane interpretation of the
 * deltas.  This code will return an object with properties:
 *
 *   spinX   -- normalized spin speed (use for zoom) - x plane
 *   spinY   -- " - y plane
 *   pixelX  -- normalized distance (to pixels) - x plane
 *   pixelY  -- " - y plane
 *
 * Wheel values are provided by the browser assuming you are using the wheel to
 * scroll a web page by a number of lines or pixels (or pages).  Values can vary
 * significantly on different platforms and browsers, forgetting that you can
 * scroll at different speeds.  Some devices (like trackpads) emit more events
 * at smaller increments with fine granularity, and some emit massive jumps with
 * linear speed or acceleration.
 *
 * This code does its best to normalize the deltas for you:
 *
 *   - spin is trying to normalize how far the wheel was spun (or trackpad
 *     dragged).  This is super useful for zoom support where you want to
 *     throw away the chunky scroll steps on the PC and make those equal to
 *     the slow and smooth tiny steps on the Mac. Key data: This code tries to
 *     resolve a single slow step on a wheel to 1.
 *
 *   - pixel is normalizing the desired scroll delta in pixel units.  You'll
 *     get the crazy differences between browsers, but at least it'll be in
 *     pixels!
 *
 *   - positive value indicates scrolling DOWN/RIGHT, negative UP/LEFT.  This
 *     should translate to positive value zooming IN, negative zooming OUT.
 *     This matches the newer 'wheel' event.
 *
 * Why are there spinX, spinY (or pixels)?
 *
 *   - spinX is a 2-finger side drag on the trackpad, and a shift + wheel turn
 *     with a mouse.  It results in side-scrolling in the browser by default.
 *
 *   - spinY is what you expect -- it's the classic axis of a mouse wheel.
 *
 *   - I dropped spinZ/pixelZ.  It is supported by the DOM 3 'wheel' event and
 *     probably is by browsers in conjunction with fancy 3D controllers .. but
 *     you know.
 *
 * Implementation info:
 *
 * Examples of 'wheel' event if you scroll slowly (down) by one step with an
 * average mouse:
 *
 *   OS X + Chrome  (mouse)     -    4   pixel delta  (wheelDelta -120)
 *   OS X + Safari  (mouse)     -  N/A   pixel delta  (wheelDelta  -12)
 *   OS X + Firefox (mouse)     -    0.1 line  delta  (wheelDelta  N/A)
 *   Win8 + Chrome  (mouse)     -  100   pixel delta  (wheelDelta -120)
 *   Win8 + Firefox (mouse)     -    3   line  delta  (wheelDelta -120)
 *
 * On the trackpad:
 *
 *   OS X + Chrome  (trackpad)  -    2   pixel delta  (wheelDelta   -6)
 *   OS X + Firefox (trackpad)  -    1   pixel delta  (wheelDelta  N/A)
 *
 * On other/older browsers.. it's more complicated as there can be multiple and
 * also missing delta values.
 *
 * The 'wheel' event is more standard:
 *
 * http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
 *
 * The basics is that it includes a unit, deltaMode (pixels, lines, pages), and
 * deltaX, deltaY and deltaZ.  Some browsers provide other values to maintain
 * backward compatibility with older events.  Those other values help us
 * better normalize spin speed.  Example of what the browsers provide:
 *
 *                          | event.wheelDelta | event.detail
 *        ------------------+------------------+--------------
 *          Safari v5/OS X  |       -120       |       0
 *          Safari v5/Win7  |       -120       |       0
 *         Chrome v17/OS X  |       -120       |       0
 *         Chrome v17/Win7  |       -120       |       0
 *                IE9/Win7  |       -120       |   undefined
 *         Firefox v4/OS X  |     undefined    |       1
 *         Firefox v4/Win7  |     undefined    |       3
 *
 */
function normalizeWheel(/*object*/ event) /*object*/ {
    var sX = 0, sY = 0,       // spinX, spinY
        pX = 0, pY = 0;       // pixelX, pixelY

    // Legacy
    if ('detail'      in event) { sY = event.detail; }
    if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
    if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
    if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }

    // side scrolling on FF with DOMMouseScroll
    if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
        sX = sY;
        sY = 0;
    }

    pX = sX * PIXEL_STEP;
    pY = sY * PIXEL_STEP;

    if ('deltaY' in event) { pY = event.deltaY; }
    if ('deltaX' in event) { pX = event.deltaX; }

    if ((pX || pY) && event.deltaMode) {
        if (event.deltaMode == 1) {          // delta in LINE units
            pX *= LINE_HEIGHT;
            pY *= LINE_HEIGHT;
        } else {                             // delta in PAGE units
            pX *= PAGE_HEIGHT;
            pY *= PAGE_HEIGHT;
        }
    }

    // Fall-back if spin cannot be determined
    if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
    if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

    return { spinX  : sX,
        spinY  : sY,
        pixelX : pX,
        pixelY : pY };
}


/**
 * The best combination if you prefer spinX + spinY normalization.  It favors
 * the older DOMMouseScroll for Firefox, as FF does not include wheelDelta with
 * 'wheel' event, making spin speed determination impossible.
 */
normalizeWheel.getEventType = function() /*string*/ {
    return (UserAgent_DEPRECATED.firefox())
        ? 'DOMMouseScroll'
        : (isEventSupported('wheel'))
            ? 'wheel'
            : 'mousewheel';
};



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
    var thumb = this.thumb = document.createElement('div');
    thumb.classList.add('thumb');
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
    bar.onmousedown = this._bound.onmousedown;
    if (this.paging) { bar.onclick = bound.onclick; }
    bar.appendChild(thumb);

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
        this.bar.onmousedown = null;
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
        var wheelData = normalizeWheel(evt);
        this.index += wheelData.spinY;
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
        this.thumb.classList.remove('hover');
    },

    onmousedown: function (evt) {
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
/* endinject */

function error(msg) {
    throw 'finbars: ' + msg;
}

// Interface
module.exports = FinBar;
