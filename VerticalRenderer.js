define([
	"dcl/dcl",
	"delite/register",
	"./RendererBase",
	"delite/handlebars!./templates/VerticalRenderer.html"
], function (
	dcl,
	register,
	_RendererMixin,
	template
) {
	return register("d-calendar-vertical", [HTMLElement, _RendererMixin], {

		// summary:
		//		The default item vertical renderer, used by SimpleColumnView etc.

		template: template,

		_isElementVisible: dcl.superCall(function (sup) {
			return function (elt) {
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
