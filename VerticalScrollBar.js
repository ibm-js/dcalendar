define([
	"delite/register",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom-style",
	"decor/sniff",
	"delite/Widget",
	"dojox/html/metrics",
	"delite/handlebars!./templates/Scrollbar.html"
], function (
	register,
	event,
	lang,
	on,
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
				this.value = this._getDomScrollerValue();
				this.onChange(this.value);
				this.onScroll(this.value);
			}.bind(this));
		},

		_getDomScrollerValue: function () {
			if (this._vertical) {
				return this.scrollTop;
			}

			var rtl = (this.effectiveDir === "rtl");
			if (rtl) {
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

		_setDomScrollerValue: function (value) {
			this[this._vertical ? "scrollTop" : "scrollLeft"] = value;
		},

		_setValueAttr: function (value) {
			value = Math.min(this.maximum, value);
			value = Math.max(this.minimum, value);
			if (this.value != value) {
				this.value = value;
				this.onChange(value);
				this._setDomScrollerValue(value);
			}
		},

		onChange: function (value) {
			// summary:
			//		 An extension point invoked when the value has changed.
			// value: Integer
			//		The position of the scroll bar in pixels.
			// tags:
			//		callback
		},

		onScroll: function (value) {
			// summary:
			//		 An extension point invoked when the user scrolls with the mouse.
			// value: Integer
			//		The position of the scroll bar in pixels.
			// tags:
			//		callback
		},

		_setMinimumAttr: function (value) {
			value = Math.min(value, this.maximum);
			this._set("minimum", value);
		},

		_setMaximumAttr: function (value) {
			value = Math.max(value, this.minimum);
			this._set("maximum", value);
			domStyle.set(this.content, this._vertical ? "height" : "width", value + "px");
		},

		_setDirectionAttr: function (value) {
			this._vertical = (value === "vertical");
			this._set("direction", value);
		}
	});
});
