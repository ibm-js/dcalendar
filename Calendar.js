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
	"delite/handlebars!./templates/Calendar.html",
	"delite/theme!./themes/{{theme}}/Calendar.css"
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

	var SecondarySheetClass = register("d-calendar-column-view-secondary-km",
		[ColumnViewSecondarySheet, Keyboard, Mouse], {});

	var ColumnViewClass = register("d-calendar-column-view-km", [ColumnView, Keyboard, Mouse], {
		secondarySheetClass: SecondarySheetClass,
		verticalRenderer: VerticalRenderer,
		horizontalRenderer: HorizontalRenderer,
		expandRenderer: ExpandRenderer,
		horizontalDecorationRenderer: DecorationRenderer,
		verticalDecorationRenderer: DecorationRenderer
	});

	var MatrixViewClass = register("d-calendar-matrix-view-km", [MatrixView, Keyboard, Mouse], {
		horizontalRenderer: HorizontalRenderer,
		horizontalDecorationRenderer: DecorationRenderer,
		labelRenderer: LabelRenderer,
		expandRenderer: ExpandRenderer
	});

	return register("d-calendar", [HTMLElement, CalendarBase], {
		// summary:
		//		This class defines a calendar widget that display events in time.

		template: template,

		_computeCurrentView: function () {
			// summary:
			//		If the time range is lasting less than seven days
			//		returns the column view or the matrix view otherwise.
			// tags:
			//		protected

			if (this._duration <= 7) {
				if (!this.columnView) {
					this.columnView = new ColumnViewClass(this.columnViewProps);
					this.columnView.on("column-header-click", this.columnViewColumnHeaderClick.bind(this));
					this.appendChild(this.columnView);
				}
				return this.columnView;
			} else {
				if (!this.matrixView) {
					this.matrixView = new MatrixViewClass(this.matrixViewProps);
					this.matrixView.on("row-header-click", this.matrixViewRowHeaderClick.bind(this));
					this.appendChild(this.matrixView);
				}
				return this.matrixView;
			}
		}
	});
});
