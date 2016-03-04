define([
	"delite/register",
	"dojo/_base/lang",
	"dojo/on",
	"dcalendar/Calendar",
	"dcalendar/MonthColumnView",
	"dcalendar/VerticalRenderer",
	"dcalendar/Mouse",
	"dcalendar/Keyboard",
	"delite/handlebars!./CalendarMonthColumn.html"
], function (
	register,
	lang,
	on,
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

		_createDefaultViews: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				// create the month column view.
				this.monthColumnView = register("my-month-column-view", [MonthColumnView, Keyboard, Mouse])({
					verticalRenderer: VerticalRenderer
				});

				this.monthColumnView.on("column-header-click", lang.hitch(this, function (e) {
					this.dateInterval = "month";
					this.dateIntervalSteps = 1;
					this.date = e.date;
				}));

				return [this.columnView, this.matrixView, this.monthColumnView];
			};
		}),


		_computeCurrentView: register.superCall(function (sup) {
			return function () {
				// show the month column view if the duration is greater than 31x2 days
				if (this._duration > 62) {
					return this.monthColumnView;
				} else {
					return sup.apply(this, arguments);
				}
			};
		}),

		_configureView: register.superCall(function (sup) {
			return function () {
				var view = this.currentView,
					timeInterval = this._timeInterval;

				// show only from January to June or from July to December
				if (view.viewKind == "monthColumns") {
					var m = timeInterval[0].getMonth();
					var d = this.newDate(timeInterval[0]);
					d.setMonth(m < 6 ? 0 : 6);
					view.startDate = d;
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
