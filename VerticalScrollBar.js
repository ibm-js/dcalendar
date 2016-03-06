define([
	"delite/register",
	"dojo/_base/event",
	"dojo/dom-style",
	"decor/sniff",
	"delite/Widget",
	"./metrics",
	"delite/handlebars!./templates/Scrollbar.html"
], function (
	register,
	event,
	domStyle,
	has,
	Widget,
	metrics,
	template
) {

	/**
	 * Vertical scrollbar and also superclass for horizontal scrollbar.
	 */
	return register("d-calendar-vertical-scrollbar", [HTMLElement, Widget], {

		baseClass: "dojoxCalendarVScrollBar",

		template: template,

		// value: Number
		//		The value of the scroll bar in pixel offset.
		value: 0,

		// minimum: Number
		//		The minimum value of the scroll bar.
		minimum: 0,

		// maximum: Number
		//		The maximum value of the scroll bar.
		maximum: 100,

		// direction: String
		//		Direction of the scroll bar. Valid values are "vertical" or "horizontal".
		direction: "vertical",

		_vertical: true,

		_scrollHandle: null,

		containerSize: 0,

		postRender: function () {
			this.on("scroll", function () {
				this._set("value", this._getScroll.bind(this));
			});
		},

		_getScroll: function () {
			if (this._vertical) {
				return this.scrollTop;
			}

			if (this.effectiveDir === "rtl") {
				if (has("webkit")) {
					if (this._scW === undefined) {
						this._scW = metrics.getScrollbar().w;
					}
					return this.maximum - this.scrollLeft - this.containerSize + this._scW;
				}
				if (has("mozilla")) {
					return -this.scrollLeft;
				}
				// ie>7 and others...
			}
			return this.scrollLeft;
		},

		computeProperties: function (oldVals) {
			if ("direction" in oldVals) {
				this._vertical = (this.direction === "vertical");
			}
			if ("value" in oldVals || "maximum" in oldVals || "minimum" in oldVals) {
				if (this.maximum < this.minimum) {
					this.maximum = this.minimum;	// avoid infinite loop on bad settings
				}
				this.value = Math.min(this.maximum, this.value);
				this.value = Math.max(this.minimum, this.value);
			}
		},

		refreshRendering: function (oldVals) {
			if ("value" in oldVals) {
				// TODO: given all the code in _getScroll() (for horizontal scroll), this seems too simple to work.
				this[this._vertical ? "scrollTop" : "scrollLeft"] = this.value;
			}
		}
	});
});
