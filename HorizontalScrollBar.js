define([
	"delite/register",
	"./VerticalScrollBar"
], function (
	register,
	VerticalScrollBar
) {

	/**
	 * Horizontal scrollbar.
	 */
	return register("d-calendar-horizontal-scrollbar", [VerticalScrollBar], {

		baseClass: "d-calendar-h-scroll-bar",

		// direction: String
		//		Direction of the scroll bar. Valid values are "vertical" or "horizontal".
		direction: "horizontal",

		_vertical: false
	});
});
