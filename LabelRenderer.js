define([
	"dcl/dcl",
	"delite/register",
	"./RendererBase",
	"delite/handlebars!./templates/LabelRenderer.html"
], function (
	dcl,
	register,
	_RendererMixin,
	template
) {

	return register("d-calendar-label", [HTMLElement, _RendererMixin], {
		// summary:
		//		The default item label renderer.

		template: template,

		_orientation: "horizontal",

		resizeEnabled: false,

		visibilityLimits: {
			resizeStartHandle: 50,
			resizeEndHandle: -1,
			summaryLabel: 15,
			startTimeLabel: 45,
			endTimeLabel: 30
		},

		_isElementVisible: dcl.superCall(function (sup) {
			return function (elt) {
				switch (elt) {
				case "startTimeLabel":
					// hide hour part of all day events on subsequent days
					if (this.item.allDay && +this.item.range[0] !== +this.item.startTime) {
						return false;
					}
					break;
				}

				return sup.apply(this, arguments);
			};
		}),

		_displayValue: "inline"
	});
});
