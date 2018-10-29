'use strict';

function InitFinbarsWithRealContent(container, content) {
    var horzBar = new FinBar({
        orientation: 'horizontal',
        classPrefix: 'real',
        //barStyles: barStyles,
        content: content
    });

    var vertBar = new FinBar({
        orientation: 'vertical',
        classPrefix: 'real',
        //barStyles: barStyles,
        content: content
    });

    container.appendChild(horzBar.bar);
    container.appendChild(vertBar.bar);

    resize();

    function resize() {
        horzBar.shortenBy(vertBar).resize();
        vertBar.shortenBy(horzBar).resize();
    }

    return resize;
}

function InitFinbarsWithVirtualContent(container, contents) {
    var barStyles = { trailing: 11 };

    var horzBar = new FinBar({
        onchange: renderVirtualContent,
        range: { min: 1001, max: 99999 },
        increment: 8,
        orientation: 'horizontal',
        classPrefix: 'virtual',
        barStyles: barStyles,
        content: contents[0]
    });

    var vertBar = new FinBar({
        onchange: renderVirtualContent,
        range: { min: 1001, max: 99999 },
        increment: 8,
        orientation: 'vertical',
        classPrefix: 'virtual',
        barStyles: barStyles,
        content: contents[1]
    });

    container.appendChild(horzBar.bar);
    container.appendChild(vertBar.bar);

    horzBar.resize();
    vertBar.resize();

    function renderVirtualContent(idx) {
        var s = '';
        idx = Math.min(idx, this.range.max - 7);
        for (var limit = idx + 10; idx < limit; ++idx) {
            s += Math.round(idx) + '<br>';
        }
        this.content.innerHTML = s;
    }
}
