define([
	"dcl/dcl",
	"delite/register",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"./MatrixView",
	"delite/handlebars!./templates/ColumnViewSecondarySheet.html"
], function (
	dcl,
	register,
	domGeometry,
	domStyle,
	MatrixView,
	template
) {

	return register("d-calendar-column-view-secondary-sheet", [MatrixView], {
		// summary:
		//		This class defines a matrix view designed to be embedded in a column view,
		//		usually to display long or all day events on one row.

		template: template,

		baseClass: "d-calendar-matrix-view d-calendar-column-view-secondary-sheet",

		rowCount: 1,

		cellPaddingTop: 4,

		_defaultHeight: -1,

		layoutDuringResize: true,

		_defaultItemToRendererKindFunc: function (item) {
			// tags:
			//		private
			return item.allDay ? "horizontal" : null;
		},

		_formatGridCellLabel: function () {
			return null;
		},

		_formatRowHeaderLabel: function () {
			return null;
		},


		// events redispatch
		__fixEvt: function (e) {
			e.sheet = "secondary";
			e.source = this;
			return e;
		},

		_layoutExpandRenderers: dcl.superCall(function (sup) {
			return function () {
				if (!this.expandRenderer || this._expandedRowCol == -1) {
					return;
				}
				var h = domGeometry.getMarginBox(this).h;
				if (this._defaultHeight == -1 ||  // not set
					this._defaultHeight === 0) {  // initialized at 0, must be reset
					this._defaultHeight = h;
				}

				if (this._defaultHeight != h && h >= this._getExpandedHeight() ||
					this._expandedRowCol !== undefined && this._expandedRowCol !== -1) {
					var col = this._expandedRowCol;
					if (col >= this.columnCount) {
						col = 0;
					}
					this._layoutExpandRendererImpl(0, col, null, true);
				} else {
					sup.apply(this, arguments);
				}
			};
		}),

		expandRendererClickHandler: function (e, renderer) {
			// summary:
			//		Default action when an expand renderer is clicked.
			//		This method will expand the secondary sheet to show all the events.
			// e: Event
			//		The mouse event.
			// renderer: Object
			//		The renderer that was clicked.
			// tags:
			//		callback

			e.stopPropagation();

			var h = domGeometry.getMarginBox(this).h;
			var expandedH = this._getExpandedHeight();
			if (this._defaultHeight == h || h < expandedH) {
				this._expandedRowCol = renderer.columnIndex;
			} else {
				delete this._expandedRowCol;
			}
		},


		_getExpandedHeight: function () {
			// tags:
			//		private

			return (this.naturalRowsHeight && this.naturalRowsHeight.length > 0 ? this.naturalRowsHeight[0] : 0) +
				this.expandRendererHeight + this.verticalGap + this.verticalGap;
		},

		refreshRendering: function () {
			// make sure to show the expand/collapse renderer if no item is displayed but the row was expanded.
			if (!this.visibleItems || this.visibleItems.length === 0) {
				this._layoutExpandRenderers(0, false, null);
			}
		}
	});
});
