define([
	"delite/register",
	"./_RendererMixin",
	"delite/handlebars!./templates/MobileVerticalRenderer.html"
], function (register, _RendererMixin, template) {

	return register("d-calendar-mobile-vertical", [HTMLElement, _RendererMixin], {
		// summary:
		//		The mobile specific item vertical renderer.

		template: template,
		mobile: true,

		visibilityLimits: {
			resizeStartHandle: 75,
			resizeEndHandle: -1,
			summaryLabel: 55,
			startTimeLabel: 75,
			endTimeLabel: 20
		},

		_isElementVisible: register.superCall(function (sup) {
			return function (elt, startHidden, endHidden, size) {
				var d;

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
		})
	});
});
