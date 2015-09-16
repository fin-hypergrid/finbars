'use strict';

(function (module, exports) { // Closure supports Node-less client side includes with <script> tag.

    var FooBar = require('foobars');

    exports.InitFoobarsWithRealContent = function (container, content) {
        var horzBar = new FooBar(1, content.width, {
            orientation: 'horizontal',
            position: {left: 0, bottom: 0, right: 11},
            onchange: positionImage
        });

        var vertBar = new FooBar(1, content.height, {
            orientation: 'vertical',
            position: {right: 0, top: 0, bottom: 0},
            onchange: positionImage
        });

        container.appendChild(horzBar.bar);
        container.appendChild(vertBar.bar);

        horzBar.resize();
        vertBar.resize();

        function positionImage(val) {
            val = (val - this.min) / (this.max - this.min)
                * (content[this.op.size] - container.getBoundingClientRect()[this.op.size]);
            content.style[this.options.orientation === 'vertical' ? 'top' : 'left'] = -val + 'px';
        }
    };

    exports.InitFoobarsWithVirtualContent = function (container, contents) {
        var horzBar = new FooBar(1001, 99999, {
            orientation: 'horizontal',
            position: {left: 0, bottom: 0, right: 11},
            onchange: renderVirtualContent,
            content: contents[0]
        });

        var vertBar = new FooBar(1001, 99999, {
            orientation: 'vertical',
            position: {right: 0, top: 0, bottom: 0},
            onchange: renderVirtualContent,
            content: contents[1]
        });

        container.appendChild(horzBar.bar);
        container.appendChild(vertBar.bar);

        horzBar.resize();
        vertBar.resize();

        function renderVirtualContent(val) {
            var s = '';
            val = Math.min(val, this.max - 7);
            for (var limit = val + 10; val < limit; ++val) {
                s += val + '<br>';
            }
            this.options.content.innerHTML = s;
        }
    };

})(module, module.exports);
