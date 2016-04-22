define([
	"dcl/dcl",
	"delite/register",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"./SimpleColumnView",
	"delite/handlebars!./templates/ColumnView.html",
	"./ColumnViewSecondarySheet",
	"./metrics"
], function (
	dcl,
	register,
	domClass,
	domGeometry,
	domStyle,
	SimpleColumnView,
	template,
	ColumnViewSecondarySheet,
	metrics
) {

	return register("d-calendar-column-view", [SimpleColumnView], {
		// summary:
		//		This class extends SimpleColumnView by adding a secondary
		//		sheet to display long or all day events.
		//		By default a dcalendar/ColumnViewSecondarySheet instance is created.
		//		Set the secondarySheetClass property to define the class to instantiate,
		//		for example to mix the default class with Mouse, Keyboard or Touch plugins.

		template: template,

		baseClass: "d-calendar-column-view",

		// secondarySheetClass: Class
		//		The secondary sheet class, by default dcalendar/ColumnViewSecondarySheet.
		secondarySheetClass: ColumnViewSecondarySheet,

		// secondarySheetProps: Object
		//		Secondary sheet constructor parameters.
		secondarySheetProps: null,

		// headerPadding: Integer
		//		Padding between the header (composed of the secondary sheet and the column header)
		//		and the primary sheet.
		headerPadding: 3,

		_showSecondarySheet: true,

		// List of properties to forward to secondary sheet.
		forwardProperties: [
			// These are the main properties; they control which date range is shown and which events are shown.
			// Whenever the user goes forwards or backwards in the SimpleColumnView, it
			// reruns the query, which in turn resets renderItems[].
			"renderItems", "startDate", "columnCount",

			// These properties will likely never change but they need to at least be passed once.
			"editable", "moveEnabled", "resizeEnabled",
			"createOnGridClick",
			"textDir",
			"horizontalRenderer", "labelRenderer"
		],

		render: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				if (this.secondarySheetPlaceholder) {
					var args = {owner: this};
					this.forwardProperties.forEach(function (prop) {
						if (this[prop] !== null && this[prop] !== undefined) {
							var value = typeof prop === "function" ? this[prop].bind(this) : this[prop];
							args[prop] = value;
						}
					}, this);
					dcl.mix(args, this.secondarySheetProps);
					this.secondarySheet = new this.secondarySheetClass(args);
					this.secondarySheet.placeAt(this.secondarySheetPlaceholder, "replace");
				}
			};
		}),

		destroy: function () {
			if (this.secondarySheet) {
				this.secondarySheet.destroy();
			}
		},

		_setVisibility: register.superCall(function (sup) {
			return function (value) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet._setVisibility(value);
				}
			};
		}),

		resize: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					// secondary sheet is sized by CSS
					this.secondarySheet.resize();
				}
			};
		}),

		refreshRendering: function (props) {
			if (this.secondarySheet) {
				// Forward property changes to second sheet
				this.forwardProperties.forEach(function (prop) {
					if (prop in props && this[prop] !== null && this[prop] !== undefined) {
						var value = typeof prop === "function" ? this[prop].bind(this) : this[prop];
						this.secondarySheet[prop] = value;
					}
				}, this);
				this.secondarySheet.deliver();
			}
		},

		_buildRowHeader: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);

				// The width of the first column in the secondary sheet must have the same width as the row header.
				if (this.secondarySheet) {
					var width = domGeometry.getMarginBox(this.rowHeader).w;
					domGeometry.setMarginBox(this.secondarySheet.rowHeaderTable, {w: width});

					// Hack until MatrixView gets flex sizing.
					this.secondarySheet.grid.style.left = width + "px";
					this.secondarySheet.itemContainer.style.left = width + "px";
				}
			};
		}),

		updateRenderers: register.superCall(function (sup) {
			return function (obj, stateOnly) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.updateRenderers(obj, stateOnly);
				}
			};
		}),

		_defaultItemToRendererKindFunc: function (item) {
			return item.allDay ? null : "vertical"; // String
		},

		// TODO: combine to use pointer events?
		_onGridTouchStart: register.after(function () {
			this._doEndItemEditing(this.secondarySheet, "touch");
		}),

		_onGridMouseDown: register.after(function () {
			this._doEndItemEditing(this.secondarySheet, "mouse");
		}),

		_configureScrollBar: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);

				// Compensate for scrollbar on main grid, to make secondary sheet columns align with main columns
				this.secondarySheet.style[this.effectiveDir == "ltr" ? "marginRight" : "marginLeft"] =
					metrics.getScrollbar().w + "px";
			};
		})
	});
});
