'use strict';

/* global describe, it, beforeEach */

require('should'); // extends Object with `should`
var Spy = require('mojo-spy');

var FooBar = require('../src/js/foobars.js');

function nullfunc() {}

global.Element = function() {};
global.Element.prototype = {
    classList: {
        add: nullfunc
    },
    appendChild: nullfunc
};
global.document = {
    createElement: function() {
        return new Element();
    },
    getElementById: function() {
        return null;
    }
};

describe('require() returns an object that', function() {
    it('is a function that', function() {
        (typeof FooBar).should.equal('function');
    });
    describe('when used as a constructor, returns an API that', function() {
        var spy, foobar;
        beforeEach(function() {
            foobar = new FooBar(33, 55);
        });
        it('is a Foobar', function() {
            (foobar instanceof FooBar).should.be.true();
        });
        it('has a member `min` === 1st constructor param', function() {
            foobar.min.should.equal(33);
        });
        it('has a member `max` === 2nd constructor param', function() {
            foobar.max.should.equal(55);
        });
        it('has a member `bar` of type Element', function() {
            (foobar.bar instanceof Element).should.be.true();
        });
        it('has a member `thumb` of type Element', function() {
            (foobar.thumb instanceof Element).should.be.true();
        });
        describe('has a member `set`', function() {
            it('is a function that', function() {
                (typeof foobar.set).should.equal('function');
            });
        });
        describe('has a member `get`', function() {
            it('is a function that', function() {
                (typeof foobar.get).should.equal('function');
            });
        });
        describe('has a member `resize`', function() {
            it('is a function that', function() {
                (typeof foobar.resize).should.equal('function');
            });
        });
        describe('has a member `close`', function() {
            it('is a function that', function() {
                (typeof foobar.close).should.equal('function');
            });
        });
    });
});
