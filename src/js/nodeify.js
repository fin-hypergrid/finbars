/**
 * Created by jonathan on 9/16/15.
 */

module = {
    exports: {},
    modules: {},
    nodeify: function (moduleName) {
        module.modules[moduleName] = module.exports;
        module.exports = {};
    }
};

require = function (moduleName) {
    return module.modules[moduleName];
};
