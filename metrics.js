define(["requirejs-domready/domReady!"], function () {
	// This is the getScroll() method from dojox/html/metrics.js

	var n = document.createElement("div");
		n.style.cssText = "top:0;left:0;width:100px;height:100px;overflow:scroll;position:absolute;visibility:hidden;";
		document.body.appendChild(n);

	var scroll = {
		w: n.offsetWidth - n.clientWidth,
		h: n.offsetHeight - n.clientHeight
	};
	//document.body.removeChild(n);

	return {
		getScrollbar: function () { return scroll; }
	};
});