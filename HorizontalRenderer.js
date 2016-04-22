define([
	"delite/register",
	"dojo/dom-style",
	"./RenderBase",
	"delite/handlebars!./templates/HorizontalRenderer.html"
], function (
	register,
	domStyle,
	_RendererMixin,
	template
) {

	return register("d-calendar-horizontal", [HTMLElement, _RendererMixin], {

		// summary:
		//		The default item horizontal renderer, used by MatrixView.

		template: template,

		_orientation: "horizontal",

		visibilityLimits: {
			resizeStartHandle: 50,
			resizeEndHandle: -1,
			summaryLabel: 15,
			startTimeLabel: 32,
			endTimeLabel: 30
		},

		_displayValueMap: {
			"beforeIcon": "inline",
			"afterIcon": "inline"
		},

		_displayValue: "inline",

		// arrowPadding: Integer
		//		The padding size in pixels to apply to the label container on left and/or right side,
		//		to show the arrows correctly.
		arrowPadding: 12,

		_isElementVisible: register.superCall(function (sup) {
			return function (elt, startHidden, endHidden) {
				var d;
				var ltr = (this.effectiveDir === "ltr");

				if (elt == "startTimeLabel") {
					if (this.labelContainer && (ltr && endHidden || !ltr && startHidden)) {
						domStyle.set(this.labelContainer, "marginRight", this.arrowPadding + "px");
					} else {
						domStyle.set(this.labelContainer, "marginRight", 0);
					}
					if (this.labelContainer && (!ltr && endHidden || ltr && startHidden)) {
						domStyle.set(this.labelContainer, "marginLeft", this.arrowPadding + "px");
					} else {
						domStyle.set(this.labelContainer, "marginLeft", 0);
					}
				}

				switch (elt) {
				case "startTimeLabel":
					d = this.item.startTime;
					if (this.item.allDay || this.owner.isStartOfDay(d)) {
						return false;
					}
					break;
				case "endTimeLabel":
					d = this.item.endTime;
					if (this.item.allDay || this.owner.isStartOfDay(d)) {
						return false;
					}
					break;
				}

				return sup.apply(this, arguments);
			};
		}),

		getDisplayValue: function (part) {
			var res = this._displayValueMap[part];
			if (res) {
				return res;
			}
			return this._displayValue;
		}
	});
});
