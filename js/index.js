window.onload = function () {
    var container = document.getElementById('real'),
        content = container.getElementsByTagName('img')[0],
        resize = InitFinbarsWithRealContent(container, content);

    (function(container, resize) {
        var contentRect = content.getBoundingClientRect(),
            resizer = container.parentElement.getElementsByClassName('resizer')[0],
            rect = resizer.getBoundingClientRect(),
            style = window.getComputedStyle(resizer);

        container.onresize = function (evt) { console.log(evt); };

        resetResizer();
        function resetResizer() {
            var box = box = container.getBoundingClientRect();
            resizer.style.left = box.right - rect.width + parseInt(style.borderRightWidth) + window.scrollX + 'px';
            resizer.style.top = box.bottom - rect.height + parseInt(style.borderBottomWidth) + window.scrollY + 'px';
        }

        resizer.onmousedown = function onmousedown(evt) {
            var rect = this.getBoundingClientRect(),
                box = container.getBoundingClientRect(),
                pin = {
                    x: window.scrollX + evt.clientX,
                    y: window.scrollY + evt.clientY
                };

            rect = {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            };

            evt.stopPropagation();
            evt.preventDefault();

            this.onmousedown = null;

            window.onmousemove = function (evt) {
                var dx = evt.clientX - pin.x,
                    dy = evt.clientY - pin.y;

                resizer.style.left = rect.left + dx + window.scrollX + 'px';
                resizer.style.top = rect.top + dy + window.scrollY + 'px';

                container.style.width = Math.min(contentRect.width, box.width + dx + window.scrollX) + 'px';
                container.style.height = Math.min(contentRect.height, box.height + dy + window.scrollY) + 'px';

                resize();

                resizer.onmouseup = function () {
                    resizer.onmouseup = window.onmousemove = null;
                    resizer.onmousedown = onmousedown;
                    resetResizer();
                }
            }
        }
    })(container, resize);

    container = document.getElementById('virtual');
    var contents = container.getElementsByClassName('content');
    InitFinbarsWithVirtualContent(container, contents);
};
