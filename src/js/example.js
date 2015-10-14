'use strict';

(function (module, exports) { // Closure supports Node-less client side includes with <script> tag.

    var FooBar = require('foobars');
    var barStyles = { trailing: 11 };

    exports.InitFoobarsWithRealContent = function (container, content) {
        var horzBar = new FooBar({
            orientation: 'horizontal',
            classPrefix: 'real',
            barStyles: barStyles,
            content: content
        });

        var vertBar = new FooBar({
            orientation: 'vertical',
            classPrefix: 'real',
            barStyles: barStyles,
            content: content
        });

        container.appendChild(horzBar.bar);
        container.appendChild(vertBar.bar);

        resize();

        function resize() {
            horzBar.resize();
            vertBar.resize();
        }

        return resize;
    };

    exports.InitFoobarsWithVirtualContent = function (container, contents) {
        var horzBar = new FooBar({
            min: 1001,
            max: 99999,
            increment: 8,
            orientation: 'horizontal',
            classPrefix: 'virtual',
            barStyles: barStyles,
            onchange: renderVirtualContent,
            content: contents[0]
        });

        var vertBar = new FooBar({
            min: 1001,
            max: 99999,
            increment: 8,
            orientation: 'vertical',
            classPrefix: 'virtual',
            barStyles: barStyles,
            onchange: renderVirtualContent,
            content: contents[1]
        });

        container.appendChild(horzBar.bar);
        container.appendChild(vertBar.bar);

        horzBar.resize();
        vertBar.resize();

        function renderVirtualContent(idx) {
            var s = '';
            idx = Math.min(idx, this.max - 7);
            for (var limit = idx + 10; idx < limit; ++idx) {
                s += idx + '<br>';
            }
            this.content.innerHTML = s;
        }
    };

})(module, module.exports);
