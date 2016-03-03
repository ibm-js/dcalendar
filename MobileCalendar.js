define([
	"delite/register",
	"dojo/_base/lang",
	"./CalendarBase",
	"./ColumnView",
	"./ColumnViewSecondarySheet",
	"./MobileVerticalRenderer",
	"./MatrixView",
	"./MobileHorizontalRenderer",
	"./LabelRenderer",
	"./ExpandRenderer",
	"./Touch",
	"delite/handlebars!./templates/MobileCalendar.html"
], function (register, lang, CalendarBase, ColumnView, ColumnViewSecondarySheet, VerticalRenderer,
		  MatrixView, HorizontalRenderer, LabelRenderer, ExpandRenderer, Touch, template) {

	return register("d-calendar-mobile", [HTMLElement, CalendarBase], {

		// summary:
		//		This class defines a calendar widget that display events in time
		//		designed to be used in mobile environment.

		template: template,

		_createDefaultViews: function () {
			// summary:
			//		Creates the default views:
			//		- A dojox.calendar.ColumnView instance used to display one day to seven days time intervals,
			//		- A dojox.calendar.MatrixView instance used to display the other time intervals.
			//		The views are mixed with Mouse and Keyboard to allow editing items using mouse and keyboard.

			var secondarySheetClass = register("d-calendar-second-sheet-mobile", [ColumnViewSecondarySheet, Touch], {
			});

			var colView = register("d-calendar-column-view-mobile", [ColumnView, Touch], {
				secondarySheetClass: secondarySheetClass,
				verticalRenderer: VerticalRenderer,
				horizontalRenderer: HorizontalRenderer,
				expandRenderer: ExpandRenderer
			})(this.columnViewProps);

			var matrixView = register("d-calendar-matrix-view-mobile", [MatrixView, Touch], {
				horizontalRenderer: HorizontalRenderer,
				labelRenderer: LabelRenderer,
				expandRenderer: ExpandRenderer
			})(this.matrixViewProps);

			this.columnView = colView;
			this.matrixView = matrixView;

			var views = [colView, matrixView];

			this.installDefaultViewsActions(views);

			return views;
		},

		installDefaultViewsActions: function () {
			// summary:
			//		Installs the default actions on newly created default views.
			//		By default this action is registering:
			//		- the matrixViewRowHeaderClick method	on the rowHeaderClick event of the matrix view.
			//		- the columnViewColumnHeaderClick method	on the columnHeaderClick event of the column view.
			this.matrixView.on("rowHeaderClick", lang.hitch(this, this.matrixViewRowHeaderClick));
			this.columnView.on("columnHeaderClick", lang.hitch(this, this.columnViewColumnHeaderClick));
		}
	});
});
