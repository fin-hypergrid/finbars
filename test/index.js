'use strict';

/* global describe, it, beforeEach */

require('should'); // extends Object with `should`
var Spy = require('mojo-spy');

var FinBar = require('../src/finbars.js');

function nullfunc() {}

global.Element = function() {};
global.Element.prototype = {
    classList: {
        add: nullfunc
    },
    className: '',
    style: {},
    appendChild: nullfunc,
    insertBefore: nullfunc,
    get firstChild() { return this[Object.keys(this)[0]]; },
    querySelector: function(selector) {
        return Object.keys(this).find(function(key) {
            return /^#/.test(selector) && this.id === selector.substr(1);
        }) || new Element;
    },
    getBoundingClientRect: function() {
        return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 10,
            height: 10
        }
    },
    setAttribute: function() {}
};
global.document = {
    createElement: function() {
        return new Element();
    },
    createTextNode: function() {
        return undefined;
    },
    getElementById: function() {
        return null;
    },
    getElementsByTagName: function() {
        return [new Element];
    }
};
global.window = {
    getComputedStyle: function () {
        return {
            marginTop: 0,
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
        };
    },
    navigator: { platform: '', userAgent: '' }
};

describe('require() returns an object that', function() {
    it('is a function that', function() {
        (typeof FinBar).should.equal('function');
    });
    describe('when used as a constructor, returns an API that', function() {
        var spy, options, finbar;
        beforeEach(function() {
            options = {
                min: 33,
                max: 55
            };
            finbar = new FinBar(options);
        });
        it('is a FinBar object', function() {
            (finbar instanceof FinBar).should.be.true();
        });
        it('has a member `min`', function() {
            finbar.min.should.equal(options.min);
        });
        it('has a member `max`', function() {
            finbar.max.should.equal(options.max);
        });
        it('has a member `bar` of type Element', function() {
            (finbar.bar instanceof Element).should.be.true();
        });
        it('has a member `thumb` of type Element', function() {
            (finbar.thumb instanceof Element).should.be.true();
        });
        describe('has a member `index`', function() {
            it('is a getter', function() {
                (typeof Object.getOwnPropertyDescriptor(FinBar.prototype, 'index').get).should.equal('function');
            });
        });
        describe('has a member `index`', function() {
            it('is a setter', function() {
                (typeof Object.getOwnPropertyDescriptor(FinBar.prototype , 'index').set).should.equal('function');
            });
        });
        describe('has a member `resize`', function() {
            it('is a function', function() {
                (typeof finbar.resize).should.equal('function');
            });
        });
        describe('has a member `remove`', function() {
            it('is a function', function() {
                (typeof finbar.remove).should.equal('function');
            });
        });
    });
});
