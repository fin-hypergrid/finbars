/**
 * Created by jonathan on 9/16/15.
 */

'use strict';

/* eslint-env browser */

window.module = {
    exports: {},
    modules: {},
    nodeify: function (moduleName) {
        window.module.modules[moduleName] = window.module.exports;
        window.module.exports = {};
    }
};

window.require = function (moduleName) {
    return window.module.modules[moduleName];
};
