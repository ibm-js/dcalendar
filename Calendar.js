define([
	"delite/register",
	"./CalendarBase",
	"./ColumnView",
	"./ColumnViewSecondarySheet",
	"./VerticalRenderer",
	"./DecorationRenderer",
	"./MatrixView",
	"./HorizontalRenderer",
	"./LabelRenderer",
	"./ExpandRenderer",
	"./Keyboard",
	"./Mouse",
	"delite/handlebars!./templates/Calendar.html"
], function (
	register,
	CalendarBase,
	ColumnView,
	ColumnViewSecondarySheet,
	VerticalRenderer,
	DecorationRenderer,
	MatrixView,
	HorizontalRenderer,
	LabelRenderer,
	ExpandRenderer,
	Keyboard,
	Mouse,
	template
) {

	return register("d-calendar", [HTMLElement, CalendarBase], {

		// summary:
		//		This class defines a calendar widget that display events in time.

		template: template,

		_createDefaultViews: function () {
			// summary:
			//		Creates the default views:
			//		- A dojox.calendar.ColumnView instance used to display one day to seven days time intervals,
			//		- A dojox.calendar.MatrixView instance used to display the other time intervals.
			//		The views are mixed with Mouse and Keyboard to allow editing items using mouse and keyboard.

			var secondarySheetClass = register("d-calendar-column-view-secondary-km",
				[ColumnViewSecondarySheet, Keyboard, Mouse], {});

			var colView = register("d-calendar-column-view-km", [ColumnView, Keyboard, Mouse], {
				secondarySheetClass: secondarySheetClass,
				verticalRenderer: VerticalRenderer,
				horizontalRenderer: HorizontalRenderer,
				expandRenderer: ExpandRenderer,
				horizontalDecorationRenderer: DecorationRenderer,
				verticalDecorationRenderer: DecorationRenderer
			})(this.columnViewProps);

			var matrixView = register("d-calendar-matrix-view-km", [MatrixView, Keyboard, Mouse], {
				horizontalRenderer: HorizontalRenderer,
				horizontalDecorationRenderer: DecorationRenderer,
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
			//		- the matrixViewRowHeaderClick method on the row-header-click event of the matrix view.
			//		- the columnViewColumnHeaderClick method on the column-header-click event of the column view.
			this.matrixView.on("row-header-click", this.matrixViewRowHeaderClick.bind(this));
			this.columnView.on("column-header-click", this.columnViewColumnHeaderClick.bind(this));
		}
	});
});
