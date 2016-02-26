define([
	"dojo/_base/array",
	"delite/register",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/fx",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/date",
	"dojo/date/locale",
	"dojo/query",
	"./SimpleColumnView",
	"delite/handlebars!./templates/ColumnView.html",
	"./ColumnViewSecondarySheet"
], function (
	arr,
	register,
	event,
	lang,
	has,
	fx,
	dom,
	domClass,
	domStyle,
	domGeometry,
	domConstruct,
	on,
	date,
	locale,
	query,
	SimpleColumnView,
	template,
	ColumnViewSecondarySheet
) {

	return register("d-calendar-column-view", [SimpleColumnView], {

		// summary:
		//		This class defines a simple column view that also uses a secondary
		//		sheet to display long or all day events.
		//		By default an dojox.calendar.ColumnViewSecondarySheet instance is created.
		//		Set the secondarySheetClass property to define the class to instantiate,
		//		for example to mix the default class with Mouse, Keyboard or Touch plugins.

		template: template,

		baseClass: "dojoxCalendarColumnView",

		// secondarySheetClass: Class
		//		The secondary sheet class, by default dojox.calendar.ColumnViewSecondarySheet.
		secondarySheetClass: ColumnViewSecondarySheet,

		// secondarySheetProps: Object
		//		Secondary sheet constructor parameters.
		secondarySheetProps: null,

		// headerPadding: Integer
		//		Padding between the header (composed of the secondary sheet and the column header)
		//		and the primary sheet.
		headerPadding: 3,

		_showSecondarySheet: true,

		render: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					var args = lang.mixin({owner: this}, this.secondarySheetProps);
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
			return function (changedSize) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					// secondary sheet is sized by CSS
					this.secondarySheet.resize();
				}
			};
		}),

		invalidateLayout: function () {
			// tags:
			//		private

			this._layoutRenderers(this.renderData);
			if (this.secondarySheet) {
				this.secondarySheet._layoutRenderers(this.secondarySheet.renderData);
			}
		},

		onRowHeaderClick: function () {
			// summary:
			//		Event dispatched when the row header cell of the secondary sheet is clicked.
			// tags:
			//		callback
		},

		_setSubColumnsAttr: function (value) {
			var old = this.subColumns;
			if (old != value) {
				this._secondaryHeightInvalidated = true;
			}
			this._set("subColumns", value);
		},

		refreshRendering: function (recursive) {
			if (this._secondaryHeightInvalidated) {
				this._secondaryHeightInvalidated = false;
				var h = domGeometry.getMarginBox(this.secondarySheet).h;
				this.resizeSecondarySheet(h);
			}
			if (recursive && this.secondarySheet) {
				this.secondarySheet.refreshRendering(true);
			}
		},

		resizeSecondarySheet: function (height) {
			// summary:
			//		Resizes the secondary sheet header and relayout the other sub components
			//		according this new height.
			//		Warning: this method is only available for the default template and default CSS.
			// height: Integer
			//		The new height in pixels.

			if (this.secondarySheet) {
				var headerH = domGeometry.getMarginBox(this.header).h;
				domStyle.set(this.secondarySheet, "height", height + "px");
				this.secondarySheet._resizeHandler(null, true);
				var top = (height + headerH + this.headerPadding);
				if (this.subHeader && this.subColumns) {
					domStyle.set(this.subHeader, "top", top + "px");
					top += domGeometry.getMarginBox(this.subHeader).h;
				}
				domStyle.set(this.scrollContainer, "top", top + "px");
				if (this.vScrollBar) {
					domStyle.set(this.vScrollBar, "top", top + "px");
				}
			}
		},

		updateRenderers: register.superCall(function (sup) {
			return function (obj, stateOnly) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.updateRenderers(obj, stateOnly);
				}
			};
		}),

		_setItemsAttr: register.superCall(function (sup) {
			return function (value) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.items = value;
				}
			};
		}),

		_setDecorationItemsAttr: register.superCall(function (sup) {
			return function (value) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.decorationItems = value;
				}
			};
		}),

		_setStartDateAttr: register.superCall(function (sup) {
			return function (value) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.startDate = value;
				}
			};
		}),

		_setColumnCountAttr: register.superCall(function (sup) {
			return function (value) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.columnCount = value;
				}
			};
		}),

		_setHorizontalRendererAttr: function (value) {
			if (this.secondarySheet) {
				this.secondarySheet.horizontalRenderer = value;
			}
		},

		_getHorizontalRendererAttr: function () {
			if (this.secondarySheet) {
				return this.secondarySheet.horizontalRenderer;
			}
			return null;
		},

		_setHorizontalDecorationRendererAttr: register.superCall(function (sup) {
			return function (value) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet.horizontalDecorationRenderer = value;
				}
			};
		}),

		_getHorizontalDecorationRendererAttr: function () {
			if (this.secondarySheet) {
				return this.secondarySheet.horizontalDecorationRenderer;
			}
			return null;
		},

		_setExpandRendererAttr: function (value) {
			if (this.secondarySheet) {
				this.secondarySheet.expandRenderer = value;
			}
		},

		_getExpandRendererAttr: function () {
			if (this.secondarySheet) {
				return this.secondarySheet.expandRenderer;
			}
			return null;
		},

		_setTextDirAttr: function (value) {
			this.secondarySheet.textDir = value;
			this._set("textDir", value);
		},

		_defaultItemToRendererKindFunc: function (item) {
			return item.allDay ? null : "vertical"; // String
		},

		getSecondarySheet: function () {
			// summary:
			//		Returns the secondary sheet
			// returns: dojox/calendar/MatrixView
			return this.secondarySheet;
		},

		// TODO: combine to use pointer events?
		_onGridTouchStart: register.after(function (e) {
			this._doEndItemEditing(this.secondarySheet, "touch");
		}),

		_onGridMouseDown: register.after(function (e) {
			this._doEndItemEditing(this.secondarySheet, "mouse");
		}),

		_configureScrollBar: register.superCall(function (sup) {
			return function (renderData) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					var atRight = (this.effectiveDir === "ltr" || this.scrollBarRTLPosition == "right");
					domStyle.set(this.secondarySheet, atRight ? "right" : "left", renderData.scrollbarWidth + "px");
					domStyle.set(this.secondarySheet, atRight ? "left" : "right", "0");

					arr.forEach(this.secondarySheet._hScrollNodes, function (elt) {
						domClass[renderData.hScrollBarEnabled ? "add" : "remove"](elt.parentNode,
							"dojoxCalendarHorizontalScroll");
					}, this);
				}
			};
		}),

		_configureHScrollDomNodes: register.superCall(function (sup) {
			return function (styleWidth) {
				sup.apply(this, arguments);
				if (this.secondarySheet && this.secondarySheet._configureHScrollDomNodes) {
					this.secondarySheet._configureHScrollDomNodes(styleWidth);
				}
			};
		}),

		_setHScrollPosition: register.superCall(function (sup) {
			return function (pos) {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					this.secondarySheet._setHScrollPosition(pos);
				}
			};
		}),

		_refreshItemsRendering: register.superCall(function (sup) {
			return function () {
				sup.apply(this, arguments);
				if (this.secondarySheet) {
					var rd = this.secondarySheet.renderData;
					this.secondarySheet._computeVisibleItems(rd);
					this.secondarySheet._layoutRenderers(rd);
				}
			};
		}),

		_layoutRenderers: register.superCall(function (sup) {
			return function (renderData) {
				if (!this.secondarySheet._domReady) {
					this.secondarySheet._domReady = true;
					this.secondarySheet._layoutRenderers(this.secondarySheet.renderData);
				}
				sup.apply(this, arguments);
			};
		}),

		_layoutDecorationRenderers: register.superCall(function (sup) {
			return function (renderData) {
				if (!this.secondarySheet._decDomReady) {
					this.secondarySheet._decDomReady = true;
					this.secondarySheet._layoutDecorationRenderers(this.secondarySheet.renderData);
				}
				sup.apply(this, arguments);
			};
		})
	});
});
