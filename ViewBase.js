define([
	"dcl/dcl",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/_base/html",
	"decor/sniff",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/date",
	"dojo/date/locale",
	"dojo/when",
	"delite/Widget",
	"delite/Selection",
	"./time",
	"./StoreMixin",
	"./StoreManager",
	"./RendererManager"
], function (
	dcl,
	lang,
	event,
	html,
	has,
	dom,
	domStyle,
	domClass,
	domConstruct,
	domGeometry,
	date,
	locale,
	when,
	Widget,
	Selection,
	timeUtil,
	StoreMixin,
	StoreManager,
	RendererManager
) {

	/*=====
	 var __GridClickEventArgs = {
		 // summary:
		 //		The event dispatched when the grid is clicked or double-clicked.
		 // date: Date
		 //		The start of the previously displayed time interval, if any.
		 // triggerEvent: Event
		 //		The event at the origin of this event.
	 };
	 =====*/

	/*=====
	 var __ItemMouseEventArgs = {
		 // summary:
		 //		The event dispatched when an item is clicked, double-clicked or context-clicked.
		 // item: Object
		 //		The item clicked.
		 // renderer: dcalendar/_RendererMixin
		 //		The item renderer clicked.
		 // triggerEvent: Event
		 //		The event at the origin of this event.
	 };
	 =====*/

	/*=====
	 var __itemEditingEventArgs = {
		 // summary:
		 //		An item editing event.
		 // item: Object
		 //		The render item that is being edited. Set/get the startTime and/or endTime properties
		 //		to customize editing behavior.
		 // storeItem: Object
		 //		The real data from the store. DO NOT change properties, but you may use properties of this item
		 //		in the editing behavior logic.
		 // editKind: String
		 //		Kind of edit: "resizeBoth", "resizeStart", "resizeEnd" or "move".
		 // dates: Date[]
		 //		The computed date/time of the during the event editing. One entry per edited date (touch use case).
		 // startTime: Date?
		 //		The start time of data item.
		 // endTime: Date?
		 //		The end time of data item.
		 // sheet: String
		 //		For views with several sheets (columns view for example), the sheet when the event occurred.
		 // source: dcalendar/ViewBase
		 //		The view where the event occurred.
		 // eventSource: String
		 //		The device that triggered the event. This property can take the following values:
		 //
		 //		- "mouse",
		 //		- "keyboard",
		 //		- "touch"
		 // triggerEvent: Event
		 //		The event at the origin of this event.
	 };
	 =====*/

	/*=====
	 var __rendererLifecycleEventArgs = {
		 // summary:
		 //		An renderer lifecycle event.
		 // renderer: Object
		 //		The renderer.
		 // source: dcalendar/ViewBase
		 //		The view where the event occurred.
		 // item:Object?
		 //		The item that will be displayed by the renderer for the
		 //		"renderer-created" and "renderer-reused" events.
	 };
	 =====*/

	// Specific CSS prefix for non standard CSS properties. Ex: -moz-border-radius.
	// Used just to set transformY(), transformX().  IE10+ supports non-prefixed versions.
	var cssPrefix = has("webkit") ? "-webkit-" : has("mozilla") ?  "-moz-" : "";


	return dcl([Widget, StoreMixin, Selection], {

		// summary:
		//		Base class of the views (ColumnView, MatrixView, etc.).

		// datePackage: String
		//		JavaScript namespace to find Calendar routines.
		//		Uses Gregorian Calendar routines at dojo.date by default.
		datePackage: date,

		// viewKind: String
		//		Kind of the view. Used by the calendar widget to determine how to configure the view.
		viewKind: null,

		// _layoutStep: [protected] Integer
		//		The number of units displayed by a visual layout unit (i.e. a column or a row)
		_layoutStep: 1,

		// _layoutStep: [protected] Integer
		//		The unit displayed by a visual layout unit (i.e. a column or a row)
		_layoutUnit: "day",

		// resizeCursor: String
		//		CSS value to apply to the cursor while resizing an item renderer.
		resizeCursor: "n-resize",

		// formatItemTimeFunc: Function
		//		Optional function to format the time of day of the item renderers.
		//		The function takes the date, the render data object,
		//		the view and the data item as arguments and returns a String.
		formatItemTimeFunc: null,

		_cssDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],

		// The listeners added by the view itself.
		_viewHandles: null,

		// doubleTapDelay: Integer
		//		The maximum time amount in milliseconds between to touchstart events that trigger a double-tap event.
		doubleTapDelay: 300,

		////////////////////////////////////////////////////////
		//
		// Computed properties, not to be set directly.
		// Most of these used to be inside renderData.
		//
		////////////////////////////////////////////////////////

		// Range of dates currently displayed by the view
		startTime: null,
		endTime: null,

		dates: null,

		sheetHeight: -1,

		// visibleItems: Object[]
		//		List of events that appear on the calendar given the current time constraints
		//		(determined by startDate, columnCount, rowCount, etc.)
		visibleItems: null,

		// visibleDecorationItems: Object[]
		//		List of decorations that appear on the calendar given the current time constraints
		//		(determined by startDate, columnCount, rowCount, etc.)
		visibleDecorationItems: null,

		_setDatePackageAttr: function (/*String||Object*/ dp) {
			if (dp === null || typeof dp === "string") {
				this._calendar = dp ? dp.substr(dp.lastIndexOf(".") + 1) : "gregorian";
				this.dateModule = dp ? lang.getObject(dp, false) : date;
				this.dateClassObj = this.dateModule.Date || Date;
				this.dateLocaleModule = dp ? lang.getObject(dp + ".locale", false) : locale;
			}
			this._set("datePackage", dp);
		},
		
		createdCallback: function () {
			this._viewHandles = [];

			// Set default date package for now.  If user specifies date package these setting will be overwritten.
			this._setDatePackageAttr(null);

			this.storeManager = new StoreManager({
				owner: this,
				_ownerItemsProperty: "items",
				store: this.store
			});
			this.storeManager.on("layout-invalidated", function () {
				// Trigger call to refreshRendering(), and full relayout of all the items.
				this.items = this.storeManager.items;
			}.bind(this));
			this.storeManager.on("data-loaded", function (items) {
				// Trigger call to refreshRendering(), and full layout of all the items.
				this.items = items;
			}.bind(this));
			// For minor changes to a single renderer, just update the renderer w/out calling this.refreshRendering()
			this.storeManager.on("renderers-invalidated", this.updateRenderers.bind(this));

			this.rendererManager = new RendererManager({owner: this});
			this.rendererManager.on("renderer-created", this.emit.bind(this, "renderer-created"));
			this.rendererManager.on("renderer-reused", this.emit.bind(this, "renderer-reused"));
			this.rendererManager.on("renderer-recycled", this.emit.bind(this, "renderer-recycled"));
			this.rendererManager.on("renderer-destroyed", this.emit.bind(this, "renderer-destroyed"));

			this.decorationStoreManager = new StoreManager({owner: this, _ownerItemsProperty: "decorationItems"});
			this.decorationStoreManager.on("data-loaded", function (items) {
				this.decorationItems = items;
			}.bind(this));
			this.decorationStoreManager.on("layout-invalidated", function () {
				this.decorationItems = this.decorationStoreManager.items;
			}.bind(this));
			this.decorationRendererManager = new RendererManager({owner: this});

			this._setupDayRefresh();
		},

		// Use dcl.after() so that subclass can set this.startTime and this.endTime before we fire off the query
		// and do the filtering of results.
		computeProperties: dcl.after(function (args) {
			var oldVals = args[0];

			if ("store" in oldVals) {
				// Start the new query and then computeProperties() will be invoked again when we get the query results.
				this.storeManager.store = this.store;
				return;
			}

			// If the list of items has changed, or the startTime/endTime has changed,
			// need to recompute which items are visible.
			// But, while editing in no live layout we must not to recompute items (duplicate renderers),
			// so in that case defer until editing has finished.
			// TODO: filtering should actually be done by the store
			if (!this._isEditing) {
				if ("items" in oldVals || "_isEditing" in oldVals || "startTime" in oldVals || "endTime" in oldVals) {
					this.visibleItems = this.storeManager._computeVisibleItems(this.startTime, this.endTime);
				}
				if ("decorationItems" in oldVals || "_isEditing" in oldVals ||
						"startTime" in oldVals || "endTime" in oldVals) {
					this.visibleDecorationItems = this.decorationStoreManager._computeVisibleItems(this.startTime,
						this.endTime);
				}
			}
		}),

		refreshRendering: function (oldVals) {
			// Create the grid/boilerplate initially, and update it whenever we move to a new month etc.
			if ("dates" in oldVals || "attached" in oldVals) {
				this._createRendering();
			}

			// Add the events.
			if ("dates" in oldVals || "visibleItmes" in oldVals || "attached" in oldVals) {
				this._layoutRenderers();
			}
			if ("dates" in oldVals || "visibleDecorationItems" in oldVals || "attached" in oldVals) {
				this._layoutDecorationRenderers();
			}
		},

		destroy: function () {
			this.rendererManager.destroy();
			this.decorationRendererManager.destroy();

			while (this._viewHandles.length > 0) {
				this._viewHandles.pop().remove();
			}
		},

		_setupDayRefresh: function () {
			// Refresh the view when the current day changes.
			var now = this.newDate(new Date());
			var d = timeUtil.floorToDay(now, true, this.dateClassObj);
			d = this.dateModule.add(d, "day", 1);
			// manages DST at 24h
			if (d.getHours() == 23) {
				d = this.dateModule.add(d, "hour", 2); // go to 1am
			} else {
				d = timeUtil.floorToDay(d, true, this.dateClassObj);
			}
			setTimeout(function () {
				if (!this._isEditing) {
					this.notifyCurrentValue("dates");// TODO: what do I put here to make refreshRendering() rerender?
				}
				this._setupDayRefresh();
			}.bind(this), d.getTime() - now.getTime() + 5000);
			// add 5 seconds to be sure to be tomorrow
		},

		resize: function (changeSize) {
			// summary:
			//		Function to call when the view is resized.
			//		If the view is in a Dijit container or in a Dojo mobile container,
			//		it will be automatically called.
			//		On other use cases, this method must called when the window is resized and/or
			//		when the orientation has changed.
			if (changeSize) {
				domGeometry.setMarginBox(this, changeSize);
			}
		},

		// view lifecycle methods
		beforeActivate: function () {
			// summary:
			//		Function invoked just before the view is displayed by the calendar.
			// tags:
			//		protected
		},

		afterActivate: function () {
			// summary:
			//		Function invoked just after the view is displayed by the calendar.
			// tags:
			//		protected
		},

		beforeDeactivate: function () {
			// summary:
			//		Function invoked just before the view is hidden or removed by the calendar.
			// tags:
			//		protected
		},

		afterDeactivate: function () {
			// summary:
			//		Function invoked just after the view is the view is hidden or removed by the calendar.
			// tags:
			//		protected
		},

		_setText: function (node, text, allowHTML) {
			// summary:
			//		Creates a text node under the parent node after having removed children nodes if any.
			// node: Node
			//		The node that will contain the text node.
			// text: String
			//		The text to set to the text node.
			if (text != null) {
				if (!allowHTML && node.hasChildNodes()) {
					// span > textNode
					node.childNodes[0].childNodes[0].nodeValue = text;
				} else {
					while (node.hasChildNodes()) {
						node.removeChild(node.lastChild);
					}

					var tNode = this.ownerDocument.createElement("span");
					if (has("bidi")) {
						this.applyTextDir(tNode, text);
					}

					if (allowHTML) {
						tNode.innerHTML = text;
					} else {
						tNode.appendChild(this.ownerDocument.createTextNode(text));
					}
					node.appendChild(tNode);
				}
			}
		},

		isAscendantHasClass: function (node, ancestor, className) {
			// summary:
			//		Determines if a node has an ascendant node that has the css class specified.
			// node: Node
			//		The DOM node.
			// ancestor: Node
			//		The ancestor node used to limit the search in hierarchy.
			// className: String
			//		The css class name.
			// returns: Boolean

			while (node != ancestor && node != document) {
				if (domClass.contains(node, className)) {
					return true;
				}

				node = node.parentNode;
			}

			return false;
		},

		isWeekEnd: function (date) {
			// summary:
			//		Determines whether the specified date is a week-end.
			//		This method is using dojo.date.locale.isWeekend() method as
			//		dojox.date.XXXX calendars are not supporting this method.
			// date: Date
			//		The date to test.
			return locale.isWeekend(date);
		},

		getWeekNumberLabel: function (date) {
			// summary:
			//		Returns the week number string from dojo.date.locale.format() method as
			//		dojox.date.XXXX calendar are not supporting the "w" pattern.
			// date: Date
			//		The date to format.
			if (date.toGregorian) {
				date = date.toGregorian();
			}
			return locale.format(date, {
				selector: "date",
				datePattern: "w"
			});
		},

		addAndFloor: function (date, unit, steps) {
			// date must be floored!!
			// unit >= day
			var d = this.dateModule.add(date, unit, steps);
			if (d.getHours() == 23) {
				d = this.dateModule.add(d, "hour", 2); // go to 1am
			} else {
				d = timeUtil.floorToDay(d, true, this.dateClassObj);
			}
			return d;
		},

		floorToDay: function (date, reuse) {
			// summary:
			//		Floors the specified date to the start of day.
			// date: Date
			//		The date to floor.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date

			return timeUtil.floorToDay(date, reuse, this.dateClassObj);
		},

		floorToMonth: function (date, reuse) {
			// summary:
			//		Floors the specified date to the start of the date's month.
			// date: Date
			//		The date to floor.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date

			return timeUtil.floorToMonth(date, reuse, this.dateClassObj);
		},


		floorDate: function (date, unit, steps, reuse) {
			// summary:
			//		floors the date to the unit.
			// date: Date
			//		The date/time to floor.
			// unit: String
			//		The unit. Valid values are "minute", "hour", "day".
			// steps: Integer
			//		For "day" only 1 is valid.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date

			return timeUtil.floor(date, unit, steps, reuse, this.dateClassObj);
		},

		isToday: function (date) {
			// summary:
			//		Returns whether the specified date is in the current day.
			// date: Date
			//		The date to test.
			// returns: Boolean

			return timeUtil.isToday(date, this.dateClassObj);
		},

		isStartOfDay: function (d) {
			// summary:
			//		Tests if the specified date represents the starts of day.
			// d:Date
			//		The date to test.
			// returns: Boolean

			return timeUtil.isStartOfDay(d, this.dateClassObj, this.dateModule);
		},

		isOverlapping: function (start1, end1, start2, end2, includeLimits) {
			// summary:
			//		Computes if the first time range defined by the start1 and end1 parameters
			//		is overlapping the second time range defined by the start2 and end2 parameters.
			// start1: Date
			//		The start time of the first time range.
			// end1: Date
			//		The end time of the first time range.
			// start2: Date
			//		The start time of the second time range.
			// end2: Date
			//		The end time of the second time range.
			// includeLimits: Boolean
			//		Whether include the end time or not.
			// returns: Boolean

			return timeUtil.isOverlapping(this.dateModule, start1, end1, start2, end2, includeLimits);
		},

		computeRangeOverlap: function (start1, end1, start2, end2, includeLimits) {
			// summary:
			//		Computes the overlap time range of the time ranges.
			//		Returns a vector of Date with at index 0 the start time and at index 1 the end time.
			// start1: Date
			//		The start time of the first time range.
			// end1: Date
			//		The end time of the first time range.
			// start2: Date
			//		The start time of the second time range.
			// end2: Date
			//		The end time of the second time range.
			// includeLimits: Boolean
			//		Whether include the end time or not.
			// returns: Date[]

			var cal = this.dateModule;

			if (start1 == null || start2 == null || end1 == null || end2 == null) {
				return null;
			}

			var comp1 = cal.compare(start1, end2);
			var comp2 = cal.compare(start2, end1);

			if (includeLimits) {
				if (comp1 === 0 || comp1 === 1 || comp2 === 0 || comp2 === 1) {
					return null;
				}
			} else if (comp1 === 1 || comp2 === 1) {
				return null;
			}

			return [
				this.newDate(cal.compare(start1, start2) > 0 ? start1 : start2),
				this.newDate(cal.compare(end1, end2) > 0 ? end2 : end1)
			];
		},

		isSameDay: function (date1, date2) {
			// summary:
			//		Tests if the specified dates are in the same day.
			// date1: Date
			//		The first date.
			// date2: Date
			//		The second date.
			// returns: Boolean

			if (date1 == null || date2 == null) {
				return false;
			}

			return date1.getFullYear() == date2.getFullYear() &&
				date1.getMonth() == date2.getMonth() &&
				date1.getDate() == date2.getDate();
		},

		computeProjectionOnDate: function (refDate, date, max) {
			// summary:
			//		Computes the time to pixel projection in a day.
			// refDate: Date
			//		The reference date that defines the destination date.
			// date: Date
			//		The date to project.
			// max: Integer
			//		The size in pixels of the representation of a day.
			// tags:
			//		protected
			// returns: Number

			var cal = this.dateModule;
			var minH = this.minHours;
			var maxH = this.maxHours;

			if (max <= 0 || cal.compare(date, refDate) == -1) {
				return 0;
			}

			var gt = function (d) {
				return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
			};

			var referenceDate = this.floorToDay(refDate, false);

			if (date.getDate() != referenceDate.getDate()) {
				if (date.getMonth() == referenceDate.getMonth()) {
					if (date.getDate() < referenceDate.getDate()) {
						return 0;
					} else if (date.getDate() > referenceDate.getDate() && maxH < 24) {
						return max;
					}
				} else {
					if (date.getFullYear() == referenceDate.getFullYear()) {
						if (date.getMonth() < referenceDate.getMonth()) {
							return 0;
						} else if (date.getMonth() > referenceDate.getMonth()) {
							return max;
						}
					} else {
						if (date.getFullYear() < referenceDate.getFullYear()) {
							return 0;
						} else if (date.getFullYear() > referenceDate.getFullYear()) {
							return max;
						}
					}
				}
			}

			var res;
			var ONE_DAY = 86400; // 24h x 60m x 60s

			if (this.isSameDay(refDate, date) || maxH > 24) {
				var d = lang.clone(refDate);
				var minTime = 0;

				if (minH !== null && minH !== 0) {
					d.setHours(minH);
					minTime = gt(d);
				}

				d = lang.clone(refDate);
				d.setHours(maxH);

				var maxTime;
				if (maxH === null || maxH === 24) {
					maxTime = ONE_DAY;
				} else if (maxH > 24) {
					maxTime = ONE_DAY + gt(d);
				} else {
					maxTime = gt(d);
				}

				//precision is the second
				//use this API for daylight time issues.

				var delta = 0;

				if (maxH > 24 && refDate.getDate() != date.getDate()) {
					delta = ONE_DAY + gt(date);
				} else {
					delta = gt(date);
				}

				if (delta < minTime) {
					return 0;
				}
				if (delta > maxTime) {
					return max;
				}

				delta -= minTime;

				res = (max * delta) / (maxTime - minTime);
			} else {
				if (date.getDate() < refDate.getDate() &&
					date.getMonth() == refDate.getMonth()) {
					return 0;
				}

				var d2 = this.floorToDay(date);
				var dp1 = this.dateModule.add(refDate, "day", 1);
				dp1 = this.floorToDay(dp1, false);

				if (cal.compare(d2, refDate) === 1 && cal.compare(d2, dp1) === 0 || cal.compare(d2, dp1) === 1) {
					res = max;
				} else {
					res = 0;
				}
			}

			return res;
		},

		getTime: function (/*===== e, x, y, touchIndex =====*/) {
			// summary:
			//		Returns the time displayed at the specified point by this component.
			// e: Event
			//		Optional mouse event.
			// x: Number
			//		Position along the x-axis with respect to the sheet container used if event is not defined.
			// y: Number
			//		Position along the y-axis with respect to the sheet container (scroll included)
			//		used if event is not defined.
			// touchIndex: Integer
			//		If parameter 'e' is not null and a touch event, the index of the touch to use.
			// returns: Date

			return null;
		},

		getSubColumn: function (/*===== e, x, y, touchIndex =====*/) {
			// summary:
			//		Returns the sub column at the specified point by this component.
			// e: Event
			//		Optional mouse event.
			// x: Number
			//		Position along the x-axis with respect to the sheet container used if event is not defined.
			// y: Number
			//		Position along the y-axis with respect to the sheet container (scroll included)
			//		used if event is not defined.
			// touchIndex: Integer
			//		If parameter 'e' is not null and a touch event, the index of the touch to use.
			// returns: Object

			return null;
		},

		getSubColumnIndex: function (value) {
			// summary:
			//		Returns the sub column index that has the specified value, if any. -1 otherwise.
			// value: String
			//		The sub column index.

			if (this.subColumns) {
				for (var i = 0; i < this.subColumns.length; i++) {
					if (this.subColumns[i] == value) {
						return i;
					}
				}
			}
			return -1;
		},

		newDate: function (obj) {
			// summary:
			//		Creates a new Date object.
			// obj: Object
			//		This object can have several values:
			//
			//		- the time in milliseconds since gregorian epoch.
			//		- a Date instance
			// returns: Date

			return timeUtil.newDate(obj, this.dateClassObj);
		},

		_isItemInView: function (item) {
			// summary:
			//		Computes whether the specified item is entirely in the view or not.
			// item: Object
			//		The item to test
			// returns: Boolean

			var cal = this.dateModule;

			if (cal.compare(item.startTime, this.startTime) == -1) {
				return false;
			}

			return cal.compare(item.endTime, this.endTime) != 1;
		},

		_ensureItemInView: function (item) {
			// summary:
			//		If needed, moves the item to be entirely in view.
			// item: Object
			//		The item to test
			// returns: Boolean
			//		Whether the item has been moved to be in view or not.
			// tags:
			//		protected

			var cal = this.dateModule;

			var duration = Math.abs(cal.difference(item.startTime, item.endTime, "millisecond"));
			var fixed = false;

			if (cal.compare(item.startTime, this.startTime) == -1) {
				item.startTime = this.startTime;
				item.endTime = cal.add(item.startTime, "millisecond", duration);
				fixed = true;
			} else if (cal.compare(item.endTime, this.endTime) === 1) {
				item.endTime = this.endTime;
				item.startTime = cal.add(item.endTime, "millisecond", -duration);
				fixed = true;
			}

			return fixed;
		},

		/////////////////////////////////////////////////////////
		//
		// Scrollable
		//
		/////////////////////////////////////////////////////////

		// scrollable: Boolean
		//		Indicates whether the view can be scrolled or not.
		scrollable: true,

		// autoScroll: Boolean
		//		Indicates whether the view can be scrolled automatically.
		//		Auto scrolling is used when moving focus to a non visible renderer using keyboard
		//		and while editing an item.
		autoScroll: true,

		// scrollMethod: String
		//		Method used to scroll the view, for example the scroll of column view.
		//		Valid value are:
		//
		//		- "auto": let the view decide (default),
		//		- "css": use css 3d transform,
		//		- "dom": use the scrollTop property.
		scrollMethod: "auto",

		_setScrollMethodAttr: function (value) {
			if (this.scrollMethod != value) {
				this.scrollMethod = value;

				// reset
				if (this._domScroll !== undefined) {
					if (this._domScroll) {
						domStyle.set(this.sheetContainer, cssPrefix + "transform", "translateY(0px)");
					} else {
						this.scrollContainer.scrollTop = 0;
					}
				}

				delete this._domScroll;
				var pos = this._getScrollPosition();
				delete this._scrollPos;

				this._setScrollPosition(pos);
			}
		},

		_startAutoScroll: function (step) {
			// summary:
			//		Starts the auto scroll of the view (if it's scrollable). Used only during editing.
			// tags:
			//		protected

			var sp = this._scrollProps;
			if (!sp) {
				sp = this._scrollProps = {};
			}

			sp.scrollStep = step;

			if (!sp.isScrolling) {
				sp.isScrolling = true;
				sp.scrollTimer = setInterval(this._onScrollTimerTick.bind(this), 10);
			}
		},

		_stopAutoScroll: function () {
			// summary:
			//		Stops the auto scroll of the view (if it's scrollable). Used only during editing.
			// tags:
			//		protected

			var sp = this._scrollProps;

			if (sp && sp.isScrolling) {
				clearInterval(sp.scrollTimer);
				sp.scrollTimer = null;
			}
			this._scrollProps = null;
		},

		_onScrollTimerTick: function (/*===== pos =====*/) {
		},

		_scrollPos: 0,
		_hscrollPos: 0,

		//	_hScrollNodes: HTMLElement[]
		//		Array of nodes that will be scrolled horizontally.
		//		Must be set by sub class on render().
		_hScrollNodes: null,

		_setScrollPositionBase: function (pos, vertical) {
			// summary:
			//		Sets the scroll position (if the view is scrollable), using the scroll method defined.
			// tags:
			//		protected

			if (vertical && this._scrollPos == pos ||
				!vertical && this._hScrollPos == pos) {
				return;
			}

			// determine scroll method once.
			if (this._domScroll === undefined) {

				var sm = this.scrollMethod;
				if (sm === "auto") {
					this._domScroll = !has("ios") && !has("android") && !has("webkit");
				} else {
					this._domScroll = sm === "dom";
				}
			}

			var max = 0;
			if (vertical) {
				var containerSize = domGeometry.getMarginBox(this.scrollContainer);
				var sheetSize = domGeometry.getMarginBox(this.sheetContainer);
				max = sheetSize.h - containerSize.h;
			} else {
				var gridSize = domGeometry.getMarginBox(this.grid);
				var gridTableSize = domGeometry.getMarginBox(this.gridTable);
				max = gridTableSize.w - gridSize.w;
			}

			if (pos < 0) {
				pos = 0;
			} else if (pos > max) {
				pos = max;
			}

			if (vertical) {
				this._scrollPos = pos;
			} else {
				this._hScrollPos = pos;
			}

			var rtl = (this.effectiveDir === "rtl");

			if (this._domScroll) {
				if (vertical) {
					this.scrollContainer.scrollTop = pos;
				} else {
					this._hScrollNodes.forEach(function (elt) {
						domStyle.set(elt, "left", ((rtl ? 1 : -1) * pos) + "px");
					});
				}
			} else {
				var cssProp = cssPrefix + "transform";

				if (vertical) {
					domStyle.set(this.sheetContainer, cssProp, "translateY(-" + pos + "px)");
				} else {
					var css = "translateX(" + (rtl ? "" : "-") + pos + "px)";
					this._hScrollNodes.forEach(function (elt) {
						domStyle.set(elt, cssProp, css);
					});
				}
			}
		},

		_setScrollPosition: function (pos) {
			// summary:
			//		Sets the verical scroll position (if the view is scrollable), using the scroll method defined.
			// tags:
			//		protected

			this._setScrollPositionBase(pos, true);
		},

		_getScrollPosition: function () {
			// summary:
			//		Returns the vertical scroll position (if the view is scrollable), using the scroll method defined.
			// tags:
			//		protected

			return this._scrollPos;
		},

		_setHScrollPosition: function (pos) {
			// summary:
			//		Sets the horizontal scroll position (if the view is scrollable), using the scroll method defined.
			// tags:
			//		protected

			this._setScrollPositionBase(pos, false);
		},
		
		_hScrollPos: 0,

		_getHScrollPosition: function () {
			// summary:
			//		Returns the horizontal scroll position (if the view is scrollable),
			//		using the scroll method defined.
			// tags:
			//		protected

			return this._hScrollPos;
		},

		scrollView: function (/*===== dir =====*/) {
			// summary:
			//		If the view is scrollable, scrolls it vertically to the specified direction.
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			// tags:
			//		extension
		},

		
		ensureVisibility: function (/*===== start, end, margin, visibilityTarget, duration =====*/) {
			// summary:
			//		Scrolls the view if the [start, end] time range is not visible or only partially visible.
			// start: Date
			//		Start time of the range of interest.
			// end: Date
			//		End time of the range of interest.
			// margin: int
			//		Margin in minutes around the time range.
			// visibilityTarget: String
			//		The end(s) of the time range to make visible.
			//		Valid values are: "start", "end", "both".
			// duration: Number
			//		Optional, the maximum duration of the scroll animation.
			// tags:
			//		extension
		},

		////////////////////////////////////////////////////////
		//
		// Store & Items
		//
		////////////////////////////////////////////////////////

		// TODO: do the filtering in the store rather than in calendar JS code!
		_computeVisibleItems: function () {
			// summary:
			//		Computes the data items that are in the displayed interval.
			// tags:
			//		protected

			return this.storeManager._computeVisibleItems(this.startTime, this.endTime);
		},

		_getItemStoreStateObj: function (/*Object*/item) {
			// tags
			//		private
			return this.storeManager._getItemStoreStateObj(item);
		},

		getItemStoreState: function (item) {
			//	summary:
			//		Returns the creation state of an item.
			//		This state is changing during the interactive creation of an item.
			//		Valid values are:
			//		- "unstored": The event is being interactively created. It is not in the store yet.
			//		- "storing": The creation gesture has ended, the event is being added to the store.
			//		- "stored": The event is not in the two previous states, and is assumed to be in the store
			//		(not checking because of performance reasons, use store API for testing existence in store).
			// item: Object
			//		The item.
			// returns: String

			return this.storeManager.getItemStoreState(item);
		},

		_cleanItemStoreState: function (id) {
			this.storeManager._cleanItemStoreState(id);
		},

		_setItemStoreState: function (/*Object*/item, /*String*/state) {
			// tags
			//		private
			this.storeManager._setItemStoreState(item, state);
		},

		_refreshDecorationItemsRendering: function () {
			this._computeVisibleItems();
			this._layoutDecorationRenderers();
		},

		invalidateLayout: function () {
			// summary:
			//		Triggers a re-layout of the renderers.
			//		Generally this shouldn't be used; layout happens automatically on property changes.

			this._layoutRenderers();
			this._layoutDecorationRenderers();
		},

		_setDecorationStoreAttr: function (value) {
			this._set("decorationStore", value);
			this.decorationStoreManager.store = value;
		},

		////////////////////////////////////////////////////////
		//
		// Layout
		//
		////////////////////////////////////////////////////////

		computeOverlapping: function (layoutItems, func) {
			// summary:
			//		Computes the overlap layout of a list of items.
			//		A lane and extent properties are added to each layout item.
			// layoutItems: Object[]
			//		List of layout items, each item must have a start and end properties.
			// addedPass: Function
			//		Whether computes the extent of each item renderer on free sibling lanes.
			// returns: Object
			// tags:
			//		protected

			if (layoutItems.length === 0) {
				return {
					numLanes: 0,
					addedPassRes: [1]
				};
			}

			var lanes = [];

			for (var i = 0; i < layoutItems.length; i++) {
				var layoutItem = layoutItems[i];
				this._layoutPass1(layoutItem, lanes);
			}

			var addedPassRes = null;
			if (func) {
				addedPassRes = func.call(this, lanes);
			}

			return {
				numLanes: lanes.length,
				addedPassRes: addedPassRes
			};
		},

		_layoutPass1: function (layoutItem, lanes) {
			// summary:
			//		First pass of the overlap layout. Find a lane where the item can be placed or create a new one.
			// layoutItem: Object
			//		An object that contains a start and end properties at least.
			// lanes:
			//		The array of lanes.
			// tags:
			//		protected

			var stop = true;

			for (var i = 0; i < lanes.length; i++) {
				var lane = lanes[i];
				stop = false;
				for (var j = 0; j < lane.length && !stop; j++) {
					if (lane[j].start < layoutItem.end && layoutItem.start < lane[j].end) {
						// one already placed item is overlapping
						stop = true;
						lane[j].extent = 1;
					}
				}
				if (!stop) {
					//we have found a place
					layoutItem.lane = i;
					layoutItem.extent = -1;
					lane.push(layoutItem);
					return;
				}
			}

			//no place found -> add a lane
			lanes.push([layoutItem]);
			layoutItem.lane = lanes.length - 1;
			layoutItem.extent = -1;
		},


		_layoutInterval: function (/*===== index, start, end, items =====*/) {
			// summary:
			//		For each item in the items list: retrieve a renderer,
			//		compute its location and size and add it to the DOM.
			// index: Integer
			//		The index of the interval.
			// start: Date
			//		The start time of the displayed date interval.
			// end: Date
			//		The end time of the displayed date interval.
			// items: Object[]
			//		The list of the items to represent.
			// tags:
			//		extension
		},

		// layoutPriorityFunction: Function
		//		An optional comparison function use to determine the order the item will be laid out
		//		The function is used to sort an array and must, as any sorting function, take two items
		//		as argument and must return an integer whose sign define order between arguments.
		//		By default, a comparison by start time then end time is used.
		layoutPriorityFunction: null,

		_sortItemsFunction: function (a, b) {
			var res = this.dateModule.compare(a.startTime, b.startTime);
			if (res === 0) {
				res = -1 * this.dateModule.compare(a.endTime, b.endTime);
			}
			return res;
		},

		_layoutRenderers: function () {
			this._layoutRenderersImpl(this.rendererManager, this.visibleItems, "dataItems");
		},

		_layoutDecorationRenderers: function () {
			this._layoutRenderersImpl(this.decorationRendererManager, this.visibleDecorationItems,
				"decorationItems");
		},

		_layoutRenderersImpl: function (rendererManager, items, itemType) {
			// summary:
			//		Renders the data items. This method will call the _layoutInterval() method.
			// tags:
			//		protected

			if (!items) {
				return;
			}

			// recycle renderers first
			rendererManager.recycleItemRenderers();

			var cal = this.dateModule;

			// Date
			var startDate = this.newDate(this.startTime);

			// Date and time
			var startTime = lang.clone(startDate);

			var endDate;

			items = items.concat();

			var itemsTemp = [], events;
			var processing = {};

			var index = 0;

			while (cal.compare(startDate, this.endTime) == -1 && items.length > 0) {

				endDate = this.addAndFloor(startDate, this._layoutUnit, this._layoutStep);

				var endTime = lang.clone(endDate);

				if (this.minHours) {
					startTime.setHours(this.minHours);
				}

				if (this.maxHours !== undefined && this.maxHours != 24) {
					if (this.maxHours < 24) {
						endTime = cal.add(endDate, "day", -1);
					} // else > 24
					endTime = this.floorToDay(endTime, true);
					endTime.setHours(this.maxHours - (this.maxHours < 24 ? 0 : 24));
				}

				// look for events that overlap the current sub interval
				events = items.filter(function (item) {
					var r = this.isOverlapping(item.startTime, item.endTime, startTime, endTime);
					if (r) {
						processing[item.id] = true;
						itemsTemp.push(item);
					} else {
						if (processing[item.id]) {
							delete processing[item.id];
						} else {
							itemsTemp.push(item);
						}
					}
					return r;
				}, this);

				items = itemsTemp;
				itemsTemp = [];

				// if event are in the current sub interval, layout them
				if (events.length > 0) {
					// Sort the item according a sorting function,
					// by default start time then end time comparison are used.
					events.sort(this.layoutPriorityFunction ? this.layoutPriorityFunction.bind(this) :
						this._sortItemsFunction.bind(this));
					this._layoutInterval(index, startTime, endTime, events, itemType);
				}

				startDate = endDate;
				startTime = lang.clone(startDate);

				index++;
			}

			this.emit("renderers-layout-done");
		},

		/////////////////////////////////////////////////////////////////
		//
		//	Renderers management
		//
		////////////////////////////////////////////////////////////////

		_recycleItemRenderers: function (remove) {
			this.rendererManager.recycleItemRenderers(remove);
		},

		getRenderers: function (item) {
			// summary:
			//		Returns the renderers that are currently used to displayed the speficied item.
			//		Returns an array of objects that contains two properties:
			//		- container: The DOM node that contains the renderer.
			//		- renderer: The dojox.calendar._RendererMixin instance.
			//		Do not keep references on the renderers are they are recycled and reused for other items.
			// item: Object
			//		The data or render item.
			// returns: Object[]

			return this.rendererManager.getRenderers(item);
		},

		// itemToRendererKindFunc: Function
		//		An optional function to associate a kind of renderer ("horizontal", "label" or null)
		//		with the specified item.
		//		By default, if an item is lasting more that 24 hours an horizontal item is used,
		//		otherwise a label is used.
		itemToRendererKindFunc: null,

		_itemToRendererKind: function (item) {
			// summary:
			//		Associates a kind of renderer with a data item.
			// item: Object
			//		The data item.
			// returns: String
			// tags:
			//		protected

			if (this.itemToRendererKindFunc) {
				return this.itemToRendererKindFunc(item);
			}

			return this._defaultItemToRendererKindFunc(item); // String
		},

		_defaultItemToRendererKindFunc: function (/*===== item =====*/) {
			// tags:
			//		extension

			return null;
		},

		_createRenderer: function (item, kind, rendererClass, cssClass) {
			// summary:
			//		Creates an item renderer of the specified kind.
			//		A renderer is an object with the "container" and "instance" properties.
			// item: Object
			//		The data item.
			// kind: String
			//		The kind of renderer.
			// rendererClass: Object
			//		The class to instantiate to create the renderer.
			// returns: Object
			// tags:
			//		protected

			return this.rendererManager.createRenderer(item, kind, rendererClass, cssClass);
		},

		_recycleRenderer: function (renderer, remove) {
			// summary:
			//		Recycles the item renderer to be reused in the future.
			// renderer: dcalendar/_RendererMixin
			//		The item renderer to recycle.
			// tags:
			//		protected

			this.rendererManager.recycleRenderer(renderer, remove);
		},

		_destroyRenderer: function (renderer) {
			// summary:
			//		Destroys the item renderer.
			// renderer: dcalendar/_RendererMixin
			//		The item renderer to destroy.
			// tags:
			//		protected

			this.rendererManager.destroyRenderer(renderer);
		},

		_destroyRenderersByKind: function (kind) {
			// tags:
			//		private

			if (!this.renderManager) {
				// Avoid failure from dcl (or delite?) problem where SimpleColumnView#_setVerticalRendererAttr() is
				// called while creating a subclass of SimpleColumnView.
				return;
			}
			this.rendererManager.destroyRenderersByKind(kind);
		},


		_updateEditingCapabilities: function (item, renderer) {
			// summary:
			//		Update the moveEnabled and resizeEnabled properties of a renderer
			//		according to its event current editing state.
			// item: Object
			//		The store data item.
			// renderer: dcalendar/_RendererMixin
			//		The item renderer.
			// tags:
			//		protected

			renderer.moveEnabled = this.isItemMoveEnabled(item, renderer.rendererKind);
			renderer.resizeEnabled = this.isItemResizeEnabled(item, renderer.rendererKind);
			renderer.deliver();
		},

		updateRenderers: function (obj, stateOnly) {
			// summary:
			//		Updates all the renderers that represent the specified item(s).
			// obj: Object
			//		An item or an array of items.
			// stateOnly: Boolean
			//		Whether only the state of the item has changed (selected, edited, edited, focused)
			//		or a more global change has occurred.
			// tags:
			//		protected

			if (obj == null) {
				return;
			}

			var items = lang.isArray(obj) ? obj : [obj];

			for (var i = 0; i < items.length; i++) {
				var item = items[i];

				if (item == null || item.id == null) {
					continue;
				}

				var list = this.rendererManager.itemToRenderer[item.id];

				if (list == null) {
					continue;
				}

				var selected = this.isSelected(item);
				var hovered = this.isItemHovered(item);
				var edited = this.isItemBeingEdited(item);
				var focused = this.showFocus ? this.isItemFocused(item) : false;

				for (var j = 0; j < list.length; j++) {

					var renderer = list[j].renderer;
					renderer.hovered = hovered;
					renderer.selected = selected;
					renderer.edited = edited;
					renderer.focused = focused;
					renderer.storeState = this.getItemStoreState(item);

					this.applyRendererZIndex(item, list[j], hovered, selected, edited, focused);

					if (!stateOnly) {
						renderer.notifyCurrentValue("item"); // force content refresh
						renderer.deliver();
					}
				}
			}
		},

		applyRendererZIndex: function (item, renderer, hovered, selected, edited /*=====, focused =====*/) {
			// summary:
			//		Applies the z-index to the renderer based on the state of the item.
			//		This methods is setting a z-index of 20 is the item is selected or edited
			//		and the current lane value computed by the overlap layout (i.e. the renderers
			//		are stacked according to their lane).
			// item: Object
			//		The render item.
			// renderer: Object
			//		A renderer associated with the render item.
			// hovered: Boolean
			//		Whether the item is hovered or not.
			// selected: Boolean
			//		Whether the item is selected or not.
			// edited: Boolean
			//		Whether the item is being edited not not.
			// focused: Boolean
			//		Whether the item is focused not not.
			// tags:
			//		protected

			domStyle.set(renderer.container,
				{"zIndex": edited || selected ? 20 : item.lane === undefined ? 0 : item.lane});
		},

		getIdentity: function (item) {
			return item.id;
		},

		/////////////////////////////////////////////////////
		//
		// Hovered item
		//
		////////////////////////////////////////////////////

		_setHoveredItem: function (item, renderer) {
			// summary:
			//		Sets the current hovered item.
			// item: Object
			//		The data item.
			// renderer: dcalendar/_RendererMixin
			//		The item renderer.
			// tags:
			//		protected

			if (this.owner) {
				this.owner._setHoveredItem(item, renderer);
				return;
			}

			if (this.hoveredItem && item && this.hoveredItem.id != item.id ||
				item == null || this.hoveredItem == null) {
				var old = this.hoveredItem;
				this.hoveredItem = item;

				this.updateRenderers([old, this.hoveredItem], true);

				if (item && renderer) {
					this._updateEditingCapabilities(item._item ? item._item : item, renderer);
				}
			}
		},

		// hoveredItem: Object
		//		The currently hovered data item.
		hoveredItem: null,

		isItemHovered: function (item) {
			// summary:
			//		Returns whether the specified item is hovered or not.
			// item: Object
			//		The item.
			// returns: Boolean

			if (this._isEditing && this._edProps) {
				return item.id == this._edProps.editedItem.id;
			}
			return this.owner ?
				this.owner.isItemHovered(item) :
			this.hoveredItem != null && this.hoveredItem.id == item.id;
		},

		isItemFocused: function (item) {
			// summary:
			//		Returns whether the specified item is focused or not.
			// item: Object
			//		The item.
			// returns: Boolean

			return this._isItemFocused ? this._isItemFocused(item) : false;
		},

		////////////////////////////////////////////////////////////////////
		//
		// Event creation
		//
		///////////////////////////////////////////////////////////////////

		createItemFunc: null,
		/*=====
		 createItemFunc: function(view, d, e){
		 // summary:
		 //		A user supplied function that creates a new event.
		 // view: ViewBase
		 //		the current view,
		 // d: Date
		 //		the date at the clicked location.
		 // e: MouseEvemt
		 //		the mouse event (can be used to return null for example)
		 // subColumn: Object
		 //		the subcolumn at clicked location (can return null)
		 },
		 =====*/


		// createOnGridClick: Boolean
		//		Indicates whether the user can create new event by clicking and dragging the grid.
		//		A createItem function must be defined on the view or the calendar object.
		createOnGridClick: false,


		////////////////////////////////////////////////////////////////////
		//
		// Event creation
		//
		// TODO: setup listeners for these events from ViewBase.html rather than requiring
		// every template to do it.
		//
		///////////////////////////////////////////////////////////////////

		_gridMouseDown: false,

		_tempIdCount: 0,
		_tempItemsMap: null,

		_onGridMouseDown: function (e) {
			// tags:
			//		private
			this._gridMouseDown = true;

			this.showFocus = false;

			if (this._isEditing) {
				this._endItemEditing("mouse", false);
			}

			this._doEndItemEditing(this.owner, "mouse");

			this.focusedItem = null;
			this.selectFromEvent(e, null, null, true);

			if (this._setTabIndexAttr) {
				this[this._setTabIndexAttr].focus();
			}

			if (this._onRendererHandleMouseDown) {

				var f = this.createItemFunc;

				if (!f) {
					return;
				}

				var newItem = this._createdEvent = f(this, this.getTime(e), e, this.getSubColumn(e));

				var store = this.store;

				if (!newItem || store == null) {
					return;
				}

				// calendar needs an ID to work with
				if (store.getIdentity(newItem) === undefined) {
					var id = "_tempId_" + (this._tempIdCount++);
					newItem[store.idProperty] = id;
					if (this._tempItemsMap == null) {
						this._tempItemsMap = {};
					}
					this._tempItemsMap[id] = true;
				}

				var newRenderItem = this.itemToRenderItem(newItem, store);
				newRenderItem._item = newItem;
				this._setItemStoreState(newItem, "unstored");

				// add the new temporary item to the displayed list and force view refresh
				var items = this.items;

				this.items = (items ? items.concat([newRenderItem]) : [newRenderItem]);
				
				

				this.deliver();	// trigger renderer for new item to be created

				// renderer created in _refreshItemsRenderering()
				var renderers = this.getRenderers(newItem);
				if (renderers && renderers.length > 0) {
					var renderer = renderers[0];
					if (renderer) {
						// trigger editing
						this._onRendererHandleMouseDown(e, renderer.renderer, "resizeEnd");
						this._startItemEditing(newRenderItem, "mouse");
					}
				}
			}
		},

		_onGridMouseUp: function (/*===== e =====*/) {
			// tags:
			//		extension
		},

		_onGridTouchStart: function (e) {
			// tags:
			//		private

			var p = this._edProps;

			this._gridProps = {
				event: e,
				fromItem: this.isAscendantHasClass(e.target, this.eventContainer, "dojoxCalendarEvent")
			};

			if (this._isEditing) {

				if (this._gridProps) {
					this._gridProps.editingOnStart = true;
				}

				lang.mixin(p, this._getTouchesOnRenderers(e, p.editedItem));

				if (p.touchesLen === 0) {

					if (p && p.endEditingTimer) {
						clearTimeout(p.endEditingTimer);
						p.endEditingTimer = null;
					}
					this._endItemEditing("touch", false);
				}
			}

			this._doEndItemEditing("touch");

			event.stop(e);
		},

		_doEndItemEditing: function (eventSource) {
			// tags:
			//		private

			if (this && this._isEditing) {
				var p = this._edProps;
				if (p && p.endEditingTimer) {
					clearTimeout(p.endEditingTimer);
					p.endEditingTimer = null;
				}
				this._endItemEditing(eventSource, false);
			}
		},

		_onGridTouchEnd: function (/*===== e =====*/) {
			// tags:
			//		extension
		},

		_onGridTouchMove: function (/*===== e =====*/) {
			// tags:
			//		extension
		},

		__fixEvt: function (e) {
			// summary:
			//		Extension point for a view to add some event properties to a calendar event.
			// tags:
			//		callback
			return e;
		},

		// Override delite/CustomElement#emit() to mix in properties from __fixEvt()
		emit: dcl.superCall(function (sup) {
			return function (name, eventObj) {
				eventObj = this.__fixEvt(eventObj || {});
				return sup.call(this, name, eventObj);
			};
		}),


		_onGridClick: function (e) {
			this.emit("grid-click", {
				date: this.getTime(e),
				triggerEvent: e
			});
		},

		_onGridDoubleClick: function (e) {
			this.emit("grid-double-click", {
				date: this.getTime(e),
				triggerEvent: e
			});
		},

		//////////////////////////////////////////////////////////
		//
		//	Editing
		//
		//////////////////////////////////////////////////////////

		_getStartEndRenderers: function (item) {
			// summary:
			//		Returns an array that contains the first and last renderers of an item
			//		that are currently displayed. They could be the same renderer if only one renderer is used.
			// item: Object
			//		The render item.
			// returns: Object[]
			// tags:
			//		protected

			var list = this.rendererManager.itemToRenderer[item.id];

			if (!list) {
				return null;
			}

			// trivial and most common use case.
			if (list.length === 1) {
				var node = list[0].renderer;
				return [node, node];
			}

			var resizeStartFound = false;
			var resizeEndFound = false;

			var res = [];

			for (var i = 0; i < list.length; i++) {
				var ir = list[i].renderer;

				if (!resizeStartFound) {
					resizeStartFound = this.dateModule.compare(ir.item.range[0], ir.item.startTime) === 0;
					res[0] = ir;
				}

				if (!resizeEndFound) {
					resizeEndFound = this.dateModule.compare(ir.item.range[1], ir.item.endTime) === 0;
					res[1] = ir;
				}

				if (resizeStartFound && resizeEndFound) {
					break;
				}
			}

			return res;
		},

		// editable: Boolean
		//		A flag that indicates whether or not the user can edit
		//		items in the data provider.
		//		If <code>true</code>, the item renderers in the control are editable.
		//		The user can click on an item renderer, or use the keyboard or touch devices,
		//		to move or resize the associated event.
		editable: true,

		// moveEnabled: Boolean
		//		A flag that indicates whether the user can move items displayed.
		//		If <code>true</code>, the user can move the items.
		moveEnabled: true,

		// resizeEnabled: Boolean
		//		A flag that indicates whether the items can be resized.
		//		If `true`, the control supports resizing of items.
		resizeEnabled: true,

		isItemEditable: function (item, rendererKind) {
			// summary:
			//		Computes whether particular item renderer can be edited or not.
			//		By default it is using the editable property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean
			return this.getItemStoreState(item) != "storing" && this.editable &&
				(this.owner ? this.owner.isItemEditable(item, rendererKind) : true);
		},

		isItemMoveEnabled: function (item, rendererKind) {
			// summary:
			//		Computes whether particular item renderer can be moved.
			//		By default it is using the moveEnabled property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean

			return this.isItemEditable(item, rendererKind) && this.moveEnabled &&
				(this.owner ? this.owner.isItemMoveEnabled(item, rendererKind) : true);
		},

		isItemResizeEnabled: function (item, rendererKind) {
			// summary:
			//		Computes whether particular item renderer can be resized.
			//		By default it is using the resizedEnabled property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean

			return this.isItemEditable(item, rendererKind) && this.resizeEnabled &&
				(this.owner ? this.owner.isItemResizeEnabled(item, rendererKind) : true);
		},

		// _isEditing: Boolean
		//		Whether an item is being edited or not.
		_isEditing: false,

		isItemBeingEdited: function (item) {
			// summary:
			//		Returns whether an item is being edited or not.
			// item: Object
			//		The item to test.
			// returns: Boolean

			return this._isEditing && this._edProps && this._edProps.editedItem &&
				this._edProps.editedItem.id == item.id;
		},

		_setEditingProperties: function (props) {
			// summary:
			//		Registers the editing properties used by the editing functions.
			//		This method should only be called by editing interaction mixins like Mouse, Keyboard and Touch.
			// tags:
			//		protected

			this._edProps = props;
		},

		_startItemEditing: function (item, eventSource) {
			// summary:
			//		Configures the component, renderers to start one (mouse) of several (touch, keyboard) editing
			//		gestures.
			// item: Object
			//		The item that will be edited.
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// tags:
			//		protected

			this._isEditing = true;
			var p = this._edProps;

			p.editedItem = item;
			p.storeItem = item._item;
			p.eventSource = eventSource;

			p.secItem = this._secondarySheet ? this._findRenderItem(item.id, this._secondarySheet.items) :
				null;

			if (!p.liveLayout) {
				p.editSaveStartTime = item.startTime;
				p.editSaveEndTime = item.endTime;

				p.editItemToRenderer = this.rendererManager.itemToRenderer;
				p.editItems = this.items;
				p.editRendererList = this.rendererManager.rendererList;

				this.items = [p.editedItem];
				var id = p.editedItem.id;

				this.rendererManager.itemToRenderer = {};
				this.rendererManager.rendererList = [];
				var list = p.editItemToRenderer[id];

				p.editRendererIndices = [];

				list.forEach(function (ir) {
					if (this.rendererManager.itemToRenderer[id] == null) {
						this.rendererManager.itemToRenderer[id] = [ir];
					} else {
						this.rendererManager.itemToRenderer[id].push(ir);
					}
					this.rendererManager.rendererList.push(ir);
				}, this);

				// remove in old map & list the occurrence used by the edited item
				p.editRendererList = p.editRendererList.filter(function (ir) {
					return ir != null && ir.renderer.item.id != id;
				});
				delete p.editItemToRenderer[id];
			}

			// graphic feedback refresh
			this._layoutRenderers();

			this._onItemEditBegin({
				item: item,
				storeItem: p.storeItem,
				eventSource: eventSource
			});
		},

		_onItemEditBegin: function (e) {
			// tags:
			//		private

			this._editStartTimeSave = this.newDate(e.item.startTime);
			this._editEndTimeSave = this.newDate(e.item.endTime);

			this.emit("item-edit-begin", e);
		},

		_endItemEditing: function (/*String*/eventSource, /*Boolean*/canceled) {
			// summary:
			//		Leaves the item editing mode.
			// item: Object
			//		The item that was edited.
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// tags:
			//		protected

			if (this._editingGesture) {
				// make sure to stop the current gesture if any
				this._endItemEditingGesture(eventSource);
			}

			this._isEditing = false;

			var p = this._edProps;

			if (p.handles) {
				p.handles.forEach(function (handle) {
					handle.remove();
				});
			}

			if (!p.liveLayout) {
				this.items = p.editItems;
				this.rendererManager.rendererList = p.editRendererList.concat(this.rendererManager.rendererList);
				lang.mixin(this.rendererManager.itemToRenderer, p.editItemToRenderer);
			}

			this._onItemEditEnd({
				item: p.editedItem,
				storeItem: p.storeItem,
				eventSource: eventSource,
				completed: !canceled
			});

			this._layoutRenderers();

			this._edProps = null;
		},

		_onItemEditEnd: function (e) {
			// tags:
			//		private

			var synthEvent = this.emit("item-edit-end", e);

			if (!synthEvent.defaultPrevented) {
				var store = this.store;

				// updated store item
				var storeItem = this.renderItemToItem(e.item, store);

				var s = this._getItemStoreStateObj(e.item);

				if (s != null && s.state == "unstored") {

					if (e.completed) {
						// renderItemToItem cannot find the original data item
						// (as it does not exist in the store yet) to mixin with.
						// so we must do it here.
						storeItem = lang.mixin(s.item, storeItem);
						this._setItemStoreState(storeItem, "storing");
						var oldID = store.getIdentity(storeItem);
						var options = null;

						if (this._tempItemsMap && this._tempItemsMap[oldID]) {
							options = {temporaryId: oldID};
							delete this._tempItemsMap[oldID];
							delete storeItem[store.idProperty];
						}

						// add to the store.
						when(store.add(storeItem, options), function (res) {
							var id;
							if (lang.isObject(res)) {
								id = store.getIdentity(res);
							} else {
								id = res;
							}

							if (id != oldID) {
								this._removeRenderItem(oldID);
							}
						}.bind(this));

					} else { // creation canceled
						// cleanup items list

						this._removeRenderItem(s.id);
					}

				} else if (e.completed) {
					// Inject new properties in data store item
					// and apply data changes
					this._setItemStoreState(storeItem, "storing");
					store.put(storeItem);
				} else {
					e.item.startTime = this._editStartTimeSave;
					e.item.endTime = this._editEndTimeSave;
				}
			}
		},

		_removeRenderItem: function (id) {
			var items = this.items;
			var l = items.length;
			for (var i = l - 1; i >= 0; i--) {
				if (items[i].id == id) {
					items.splice(i, 1);
					this.notifyCurrentValue("items"); //force a complete relayout
					break;
				}
			}
			this._cleanItemStoreState(id);
		},

		_startItemEditingGesture: function (dates, editKind, eventSource, e) {
			// summary:
			//		Starts the editing gesture.
			// date: Date[]
			//		The reference dates (at least one).
			// editKind: String
			//		Kind of edit: "resizeBoth", "resizeStart", "resizeEnd" or "move".
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// e: Event
			//		The event at the origin of the editing gesture.
			// tags:
			//		protected

			var p = this._edProps;

			if (!p || p.editedItem == null) {
				return;
			}

			this._editingGesture = true;

			var item = p.editedItem;

			p.editKind = editKind;

			this._onItemEditBeginGesture({
				item: item,
				storeItem: p.storeItem,
				startTime: item.startTime,
				endTime: item.endTime,
				editKind: editKind,
				rendererKind: p.rendererKind,
				triggerEvent: e,
				dates: dates,
				eventSource: eventSource
			});

			p.itemBeginDispatched = true;
		},

		_onItemEditBeginGesture: function (e) {
			// tags:
			//		private

			var p = this._edProps;

			var item = p.editedItem;
			var dates = e.dates;

			p.editingTimeFrom = [];
			p.editingTimeFrom[0] = dates[0];

			p.editingItemRefTime = [];
			p.editingItemRefTime[0] = this.newDate(p.editKind == "resizeEnd" ? item.endTime : item.startTime);

			if (p.editKind == "resizeBoth") {
				p.editingTimeFrom[1] = dates[1];
				p.editingItemRefTime[1] = this.newDate(item.endTime);
			}

			var cal = this.dateModule;

			p.inViewOnce = this._isItemInView(item);

			if (p.rendererKind == "label" || this.roundToDay) {
				p._itemEditBeginSave = this.newDate(item.startTime);
				p._itemEditEndSave = this.newDate(item.endTime);
			}

			p._initDuration = cal.difference(item.startTime, item.endTime, item.allDay ? "day" : "millisecond");

			var synthEvent = this.emit("item-edit-begin-gesture", e);

			if (!synthEvent.defaultPrevented) {
				if (e.eventSource == "mouse") {
					var cursor = e.editKind == "move" ? "move" : this.resizeCursor;
					p.editLayer = domConstruct.create("div", {
						style: "position: absolute; left:0; right:0; bottom:0; top:0; z-index:30; tabIndex:-1; " +
							"background-image:url('" + this._blankGif + "'); cursor: " + cursor,
						onresizestart: function () {
							return false;
						},
						onselectstart: function () {
							return false;
						}
					}, this);
					p.editLayer.focus();
				}
			}
		},

		_waDojoxAddIssue: function (d, unit, steps) {
			// summary:
			//		Workaround an issue of dojox.date.XXXXX.date.add() function
			//		that does not support the subtraction of time correctly (normalization issues).
			// d: Date
			//		Reference date.
			// unit: String
			//		Unit to add.
			// steps: Integer
			//		Number of units to add.
			// tags:
			//		protected

			var cal = this.dateModule;
			if (this._calendar != "gregorian" && steps < 0) {
				var gd = d.toGregorian();
				gd = date.add(gd, unit, steps);
				return new this.dateClassObj(gd);
			} else {
				return cal.add(d, unit, steps);
			}
		},

		_computeItemEditingTimes: function (item, editKind, rendererKind, times /*=====, eventSource =====*/) {
			// tags:
			//		extension

			var cal = this.dateModule;
			var p = this._edProps;
			if (editKind == "move") {
				var diff = cal.difference(p.editingTimeFrom[0], times[0], "millisecond");
				times[0] = this._waDojoxAddIssue(p.editingItemRefTime[0], "millisecond", diff);
			}
			return times;
		},

		_moveOrResizeItemGesture: function (dates, eventSource, e, subColumn) {
			// summary:
			//		Moves or resizes an item.
			// dates: Date[]
			//		The reference dates.
			// editKind: String
			//		Kind of edit: "resizeStart", "resizeEnd", "resizeBoth" or "move".
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// e: Event
			//		The event at the origin of the editing gesture.
			// subColumn: String
			//		The sub column value, if any, or null.
			// tags:
			//		private

			if (!this._isEditing || dates[0] == null) {
				return;
			}

			var p = this._edProps;
			var item = p.editedItem;
			var cal = this.dateModule;
			var editKind = p.editKind;

			var newTimes = [dates[0]];

			if (editKind == "resizeBoth") {
				newTimes[1] = dates[1];
			}

			newTimes = this._computeItemEditingTimes(item, p.editKind, p.rendererKind, newTimes, eventSource);

			var newTime = newTimes[0]; // usual use case

			var moveOrResizeDone = false;

			var oldStart = lang.clone(item.startTime);
			var oldEnd = lang.clone(item.endTime);
			var oldSubColumn = item.subColumn;

			// swap cannot used using keyboard as a gesture is made of one single change (loss of start/end context).
			var allowSwap = p.eventSource == "keyboard" ? false : this.allowStartEndSwap;

			// Update the Calendar with the edited value.
			if (editKind == "move") {
				if (subColumn != null && item.subColumn != subColumn && this.allowSubColumnMove) {
					// TODO abstract change?
					item.subColumn = subColumn;
					// refresh the other properties that depends on this one (especially cssClass)
					var store = this.store;
					var storeItem = this.renderItemToItem(item, store);
					lang.mixin(item, this.itemToRenderItem(storeItem, store));
					moveOrResizeDone = true;
				}
				if (cal.compare(item.startTime, newTime) !== 0) {
					var duration = cal.difference(item.startTime, item.endTime, "millisecond");
					item.startTime = this.newDate(newTime);
					item.endTime = cal.add(item.startTime, "millisecond", duration);
					moveOrResizeDone = true;
				}
			} else if (editKind == "resizeStart") {
				if (cal.compare(item.startTime, newTime) !== 0) {
					if (cal.compare(item.endTime, newTime) !== -1) {
						item.startTime = this.newDate(newTime);
					} else { // swap detected
						if (allowSwap) {
							item.startTime = this.newDate(item.endTime);
							item.endTime = this.newDate(newTime);
							p.editKind = editKind = "resizeEnd";
							if (eventSource == "touch") { // invert touches as well!
								p.resizeEndTouchIndex = p.resizeStartTouchIndex;
								p.resizeStartTouchIndex = -1;
							}
						} else { // block the swap but keep the time of day
							item.startTime = this.newDate(item.endTime);
							item.startTime.setHours(newTime.getHours());
							item.startTime.setMinutes(newTime.getMinutes());
							item.startTime.setSeconds(newTime.getSeconds());
						}
					}
					moveOrResizeDone = true;
				}

			} else if (editKind == "resizeEnd") {

				if (cal.compare(item.endTime, newTime) !== 0) {
					if (cal.compare(item.startTime, newTime) !== 1) {
						item.endTime = this.newDate(newTime);
					} else { // swap detected

						if (allowSwap) {
							item.endTime = this.newDate(item.startTime);
							item.startTime = this.newDate(newTime);
							p.editKind = editKind = "resizeStart";
							if (eventSource == "touch") { // invert touches as well!
								p.resizeStartTouchIndex = p.resizeEndTouchIndex;
								p.resizeEndTouchIndex = -1;
							}
						} else { // block the swap but keep the time of day
							item.endTime = this.newDate(item.startTime);
							item.endTime.setHours(newTime.getHours());
							item.endTime.setMinutes(newTime.getMinutes());
							item.endTime.setSeconds(newTime.getSeconds());
						}
					}

					moveOrResizeDone = true;
				}
			} else if (editKind == "resizeBoth") {

				moveOrResizeDone = true;

				var start = this.newDate(newTime);
				var end = this.newDate(newTimes[1]);

				if (cal.compare(start, end) != -1) { // swap detected
					if (allowSwap) {
						var t = start;
						start = end;
						end = t;
					} else { // as both ends are moved, the simple way is to forbid the move gesture.
						moveOrResizeDone = false;
					}
				}

				if (moveOrResizeDone) {
					item.startTime = start;
					item.endTime = end;
				}

			} else {
				return false;
			}

			if (!moveOrResizeDone) {
				return false;
			}

			var evt = {
				item: item,
				storeItem: p.storeItem,
				startTime: item.startTime,
				endTime: item.endTime,
				editKind: editKind,
				rendererKind: p.rendererKind,
				triggerEvent: e,
				eventSource: eventSource
			};

			// trigger snapping, rounding, minimal duration, boundaries checks etc.
			if (editKind == "move") {
				this._onItemEditMoveGesture(evt);
			} else {
				this._onItemEditResizeGesture(evt);
			}

			// prevent invalid range
			if (cal.compare(item.startTime, item.endTime) === 1) {
				var tmp = item.startTime;
				item.startTime = item.endTime;
				item.endTime = tmp;
			}

			moveOrResizeDone =
				oldSubColumn != item.subColumn ||
				cal.compare(oldStart, item.startTime) !== 0 ||
				cal.compare(oldEnd, item.endTime) !== 0;

			if (!moveOrResizeDone) {
				return false;
			}

			this._layoutRenderers();

			if (p.liveLayout && p.secItem != null) {
				p.secItem.startTime = item.startTime;
				p.secItem.endTime = item.endTime;
				this._secondarySheet._layoutRenderers();
			}

			return true;
		},

		_findRenderItem: function (id, list) {
			// tags:
			//		private

			list = list || this.items;
			for (var i = 0; i < list.length; i++) {
				if (list[i].id == id) {
					return list[i];
				}
			}
			return null;
		},

		_onItemEditMoveGesture: function (e) {
			// tags:
			//		private

			var synthEvent = this.emit("item-edit-move-gesture", e);

			if (!synthEvent.defaultPrevented) {
				var p = e.source._edProps;
				var cal = this.dateModule;
				var newStartTime, newEndTime;

				if (p.rendererKind == "label" || (this.roundToDay && !e.item.allDay)) {
					newStartTime = this.floorToDay(e.item.startTime, false);
					newStartTime.setHours(p._itemEditBeginSave.getHours());
					newStartTime.setMinutes(p._itemEditBeginSave.getMinutes());

					newEndTime = cal.add(newStartTime, "millisecond", p._initDuration);
				} else if (e.item.allDay) {
					newStartTime = this.floorToDay(e.item.startTime, true);
					newEndTime = cal.add(newStartTime, "day", p._initDuration);
				} else {
					newStartTime = this.floorDate(e.item.startTime, this.snapUnit, this.snapSteps);
					newEndTime = cal.add(newStartTime, "millisecond", p._initDuration);
				}

				e.item.startTime = newStartTime;
				e.item.endTime = newEndTime;

				if (!p.inViewOnce) {
					p.inViewOnce = this._isItemInView(e.item);
				}

				// to prevent strange behaviors use constraint in items already fully in view.
				if (p.inViewOnce && this.stayInView) {
					this._ensureItemInView(e.item);
				}
			}
		},

		_DAY_IN_MILLISECONDS: 24 * 60 * 60 * 1000,

		_onItemEditResizeGesture: function (e) {
			// tags:
			//		private

			var synthEvent = this.emit("item-edit-resize-gesture", e);

			if (!synthEvent.defaultPrevented) {
				var p = e.source._edProps;
				var cal = this.dateModule;

				var newStartTime = e.item.startTime;
				var newEndTime = e.item.endTime;

				if (e.editKind == "resizeStart") {
					if (e.item.allDay) {
						newStartTime = this.floorToDay(e.item.startTime, false, this);
					} else if (this.roundToDay) {
						newStartTime = this.floorToDay(e.item.startTime, false);
						newStartTime.setHours(p._itemEditBeginSave.getHours());
						newStartTime.setMinutes(p._itemEditBeginSave.getMinutes());
					} else {
						newStartTime = this.floorDate(e.item.startTime, this.snapUnit, this.snapSteps);
					}
				} else if (e.editKind == "resizeEnd") {
					if (e.item.allDay) {
						if (!this.isStartOfDay(e.item.endTime)) {
							newEndTime = this.floorToDay(e.item.endTime, false, this);
							newEndTime = cal.add(newEndTime, "day", 1);
						}
					} else if (this.roundToDay) {
						newEndTime = this.floorToDay(e.item.endTime, false);
						newEndTime.setHours(p._itemEditEndSave.getHours());
						newEndTime.setMinutes(p._itemEditEndSave.getMinutes());
					} else {
						newEndTime = this.floorDate(e.item.endTime, this.snapUnit, this.snapSteps);

						if (e.eventSource == "mouse") {
							newEndTime = cal.add(newEndTime, this.snapUnit, this.snapSteps);
						}
					}
				} else { // Resize both
					newStartTime = this.floorDate(e.item.startTime, this.snapUnit, this.snapSteps);
					newEndTime = this.floorDate(e.item.endTime, this.snapUnit, this.snapSteps);
					newEndTime = cal.add(newEndTime, this.snapUnit, this.snapSteps);
				}

				e.item.startTime = newStartTime;
				e.item.endTime = newEndTime;

				var minimalDay = e.item.allDay ||
					p._initDuration >= this._DAY_IN_MILLISECONDS && !this.allowResizeLessThan24H;

				this.ensureMinimalDuration(e.item,
					minimalDay ? "day" : this.minDurationUnit,
					minimalDay ? 1 : this.minDurationSteps,
					e.editKind);

				if (!p.inViewOnce) {
					p.inViewOnce = this._isItemInView(e.item);
				}

				// to prevent strange behaviors use constraint in items already fully in view.
				if (p.inViewOnce && this.stayInView) {
					this._ensureItemInView(e.item);
				}
			}
		},

		_endItemEditingGesture: function (/*String*/eventSource, /*Event*/e) {
			// tags:
			//		protected

			if (!this._isEditing) {
				return;
			}

			this._editingGesture = false;

			var p = this._edProps;
			var item = p.editedItem;

			p.itemBeginDispatched = false;

			this._onItemEditEndGesture({
				item: item,
				storeItem: p.storeItem,
				startTime: item.startTime,
				endTime: item.endTime,
				editKind: p.editKind,
				rendererKind: p.rendererKind,
				triggerEvent: e,
				eventSource: eventSource
			});
		},

		_onItemEditEndGesture: function (e) {
			// tags:
			//		private

			var p = this._edProps;

			delete p._itemEditBeginSave;
			delete p._itemEditEndSave;

			var synthEvent = this.emit("item-edit-end-gesture", e);

			if (!synthEvent.defaultPrevented) {
				if (p.editLayer) {
					setTimeout(function () {
						this.focus();
						p.editLayer.parentNode.removeChild(p.editLayer);
						p.editLayer = null;
					}.bind(this), 10);
				}
			}
		},

		ensureMinimalDuration: function (item, unit, steps, editKind) {
			// summary:
			//		During the resize editing gesture, ensures that the item has the specified minimal duration.
			// item: Object
			//		The edited item.
			// unit: String
			//		The unit used to define the minimal duration.
			// steps: Integer
			//		The number of time units.
			// editKind: String
			//		The edit kind: "resizeStart" or "resizeEnd".

			var minTime;
			var cal = this.dateModule;

			if (editKind == "resizeStart") {
				minTime = cal.add(item.endTime, unit, -steps);
				if (cal.compare(item.startTime, minTime) === 1) {
					item.startTime = minTime;
				}
			} else {
				minTime = cal.add(item.startTime, unit, steps);
				if (cal.compare(item.endTime, minTime) == -1) {
					item.endTime = minTime;
				}
			}
		},

		// snapUnit: String
		//		The unit of the snapping to apply during the editing of an event.
		//		"day", "hour" and "minute" are valid values.
		snapUnit: "minute",

		// snapSteps: Integer
		//		The number of units used to compute the snapping of the edited item.
		snapSteps: 15,

		// minDurationUnit: "String"
		//		The unit used to define the minimal duration of the edited item.
		//		"day", "hour" and "minute" are valid values.
		minDurationUnit: "hour",

		// minDurationSteps: Integer
		//		The number of units used to define the minimal duration of the edited item.
		minDurationSteps: 1,

		// liveLayout: Boolean
		//		If true, all the events are laid out during the editing gesture.
		//		If false, only the edited event is laid out.
		liveLayout: false,

		// stayInView: Boolean
		//		Specifies during editing, if the item is already in view,
		//		if the item must stay in the time range defined by the view or not.
		stayInView: true,

		// allowStartEndSwap: Boolean
		//		Specifies if the start and end time of an item can be swapped during an editing gesture.
		//		Note that using the keyboard this property is ignored.
		allowStartEndSwap: true,

		// allowResizeLessThan24H: Boolean
		//		If an event has a duration greater than 24 hours, indicates if using a resize gesture,
		//		it can be resized to last less than 24 hours.
		//		This flag is usually used when two different kind of renderers are used (MatrixView)
		//		to prevent changing the kind of renderer during an editing gesture.
		allowResizeLessThan24H: false,

		// allowSubColumnMove: Boolean
		//		If several sub columns are displayed, indicated if the data item can be reassigned
		//		to another sub column by an editing gesture.
		allowSubColumnMove: true
	});
});
