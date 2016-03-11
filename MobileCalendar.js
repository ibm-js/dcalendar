define([
	"delite/register",
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
], function (register, CalendarBase, ColumnView, ColumnViewSecondarySheet, VerticalRenderer,
		  MatrixView, HorizontalRenderer, LabelRenderer, ExpandRenderer, Touch, template) {


	var SecondarySheetClass = register("d-calendar-second-sheet-mobile", [ColumnViewSecondarySheet, Touch], {
	});

	var ColumnViewClass = register("d-calendar-column-view-mobile", [ColumnView, Touch], {
		secondarySheetClass: SecondarySheetClass,
		verticalRenderer: VerticalRenderer,
		horizontalRenderer: HorizontalRenderer,
		expandRenderer: ExpandRenderer
	});

	var MatrixViewClass = register("d-calendar-matrix-view-mobile", [MatrixView, Touch], {
		horizontalRenderer: HorizontalRenderer,
		labelRenderer: LabelRenderer,
		expandRenderer: ExpandRenderer
	});

	return register("d-calendar-mobile", [HTMLElement, CalendarBase], {
		// summary:
		//		This class defines a calendar widget that display events in time
		//		designed to be used in mobile environment.

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
