define([
	"dcl/dcl",
	"delite/register",
	"dcalendar/Calendar",
	"dcalendar/MonthColumnView",
	"dcalendar/VerticalRenderer",
	"dcalendar/Mouse",
	"dcalendar/Keyboard",
	"delite/handlebars!./CalendarMonthColumn.html"
], function (
	dcl,
	register,
	Calendar,
	MonthColumnView,
	VerticalRenderer,
	Mouse,
	Keyboard,
	template
) {
	return register("my-extended-calendar", Calendar, {

		// summary:
		//		A Calendar subclass that embeds a month column view.

		template: template,

		verticalRenderer: VerticalRenderer,

		_computeCurrentView: dcl.superCall(function (sup) {
			return function () {
				// show the month column view if the duration is greater than 31x2 days
				if (this._duration > 62) {
					if (!this.monthColumnView) {
						this.monthColumnView = register("my-month-column-view", [MonthColumnView, Keyboard, Mouse])({
							verticalRenderer: VerticalRenderer
						});

						this.monthColumnView.on("column-header-click", function (e) {
							this.dateInterval = "month";
							this.dateIntervalSteps = 1;
							this.date = e.date;
						}.bind(this));

						this.appendChild(this.monthColumnView);
					}
					return this.monthColumnView;
				} else {
					return sup.apply(this, arguments);
				}
			};
		}),

		_configureView: dcl.superCall(function (sup) {
			return function () {
				var view = this.currentView,
					timeInterval = this._timeInterval;

				// show only from January to June or from July to December
				if (view.viewKind == "monthColumns") {
					view.startDate = timeInterval[0].set({
						month: timeInterval[0].month < 7 ? 1 : 7
					});
					view.columnCount = 6;
				} else {
					sup.apply(this, arguments);
				}
			};
		}),

		sixMonthButtonClick: function () {
			this.dateIntervalSteps = 6;
			this.dateInterval = "month";
		},

		matrixViewRowHeaderClick: function (e) {
			this.dateInterval = "week";
			this.dateIntervalSteps = 1;
			this.date = e.date;
		}
	});
});
