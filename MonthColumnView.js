define([
	"dcl/dcl",
	"./ViewBase",
	"delite/handlebars!./templates/MonthColumnView.html",
	"delite/register",
	"delite/Scrollable",
	"requirejs-dplugins/has",
	"dojo/_base/fx",
	"dojo/_base/html",
	"delite/on",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/mouse",
	"dojo/i18n",
	"./metrics",
	"requirejs-dplugins/css!./css/MonthColumnView.css",
	"requirejs-dplugins/css!./css/MonthColumnView_rtl.css"
], function (
	dcl,
	ViewBase,
	template,
	register,
	Scrollable,
	has,
	fx,
	html,
	on,
	dom,
	domClass,
	domStyle,
	domGeometry,
	domConstruct,
	mouse,
	i18n,
	metrics
) {

	/*=====
	 var __ColumnClickEventArgs = {
		 // summary:
		 //		A column click event.
		 // index: Integer
		 //		The column index.
		 // date: Date
		 //		The date displayed by the column.
		 // triggerEvent: Event
		 //		The origin event.
	 };
	 =====*/

	return register("d-calendar-month-column", [HTMLElement, ViewBase, Scrollable], {

		// summary:
		//		The month column view is a calendar view used to display a month per column
		//		where each cell of the column is a day.

		baseClass: "d-calendar-month-column-view",

		template: template,

		// viewKind: String
		//		Type of the view. Used by the calendar widget to determine how to configure the view.
		//		This view kind is "columns".
		viewKind: "monthColumns",

		// startDate: Date
		//		The start date of the time interval displayed.
		//		If not set at initialization time, will be set to current day.
		startDate: null,

		// columnCount: Integer
		//		The number of column to display (from the startDate).
		columnCount: 6,

		// daySize: Integer
		//		The desired size in pixels of an hour on the screen.
		//		Note that the effective size may be different as the time slot size must be an integer.
		daySize: 30,

		// showCellLabel: Boolean
		//		Whether display or not the grid cells label (usually the day of month).
		showCellLabel: true,

		// showHiddenItems: Boolean
		//		Whether show or not the hidden items.
		//		By default the events that are shorter than a day are not displayed using vertical renderers by this
		//		widget.  But the grid cells that contains one or several hidden items display a decoration.
		showHiddenItems: true,

		// verticalRenderer: Class
		//		The class use to create vertical renderers.
		verticalRenderer: dcl.prop({
			set: function (value) {
				this._destroyRenderersByKind("vertical");		// clear cache
				this._set("verticalRenderer", value);
			},
			get: function () {
				return this._get("verticalRenderer");
			}
		}),

		// verticalDecorationRenderer: Class
		//		The class use to create vertical decoration renderers.
		verticalDecorationRenderer: null,

		// percentOverlap: Integer
		//		The percentage of the renderer width used to superimpose one item renderer on another
		//		when two events are overlapping.
		percentOverlap: 0,

		// horizontalGap: Integer
		//		The number of pixels between two item renderers.
		horizontalGap: 4,

		// columnHeaderFormatLength: String
		//		Length of the column labels. Valid values are "wide" or "abbr".
		columnHeaderFormatLength: null,

		// gridCellDatePattern: String
		//		Custom date/time pattern for cell labels to override default one coming from the CLDR.
		//		See dojo/date/locale documentation for format string.
		gridCellDatePattern: null,

		// roundToDay: [private] Boolean
		roundToDay: true,

		// _layoutUnit: String
		//		Unit of layout: each column is displaying a month.
		_layoutUnit: "month",

		constructor: function () {
			// Apparently these are in here rather than in the prototype so they
			// override the values in Keyboard.js regardless of inheritance order.
			this.keyboardUpDownUnit = "day";
			this.keyboardUpDownSteps = 1;
			this.keyboardLeftRightUnit = "month";
			this.keyboardLeftRightSteps = 1;
			this.allDayKeyboardUpDownUnit = "day";
			this.allDayKeyboardUpDownSteps = 1;
			this.allDayKeyboardLeftRightUnit = "month";
			this.allDayKeyboardLeftRightSteps = 1;
		},

		computeProperties: function (oldVals) {
			var d;

			if (this.columnCount < 1 || isNaN(this.columnCount)) {
				this.columnCount = 1;
			}

			if (this.daySize < 5 || isNaN(this.daySize)) {
				this.daySize = 5;
			}

			if (!this.startDate || "startDate" in oldVals) {
				d = this.floorToMonth(this.startDate || new this.dateClassObj());
				if (!this.startDate || d.getTime() !== this.startDate.getTime()) {
					this.startDate = d;
				}
			}

			if ("startDate" in oldVals || "columnCount" in oldVals || "source" in oldVals) {
				this.dates = [];

				d = this.startDate;
				var currentMonth = d.getMonth();
				var maxDayCount = 0;

				for (var col = 0; col < this.columnCount; col++) {
					var dates = [];
					this.dates.push(dates);

					while (d.getMonth() == currentMonth) {
						dates.push(d);
						d = this.addAndFloor(d, "day", 1);
					}

					currentMonth = d.getMonth();

					if (maxDayCount < dates.length) {
						maxDayCount = dates.length;
					}
				}

				this.maxDayCount = maxDayCount;
				this.startTime = new this.dateClassObj(this.dates[0][0]);
				this.endTime = new this.dateClassObj(dates[dates.length - 1]);
				this.endTime = this.dateModule.add(this.endTime, "day", 1);

				if (this.source) {
					this.query = new this.source.Filter().lte("startTime", this.endTime).gte("endTime", this.startTime);
				}
			}
		},

		__fixEvt: function (e) {
			e.sheet = "primary";
			e.source = this;
			return e;
		},

		//////////////////////////////////////////
		//
		// Formatting functions
		//
		//////////////////////////////////////////

		_formatColumnHeaderLabel: function (/*Date*/ d) {
			// summary:
			//		Computes the column header label for the specified date.
			// d: Date
			//		The date to format
			// tags:
			//		protected

			var len = "wide";

			if (this.columnHeaderFormatLength) {
				len = this.columnHeaderFormatLength;
			}

			var months = this.dateLocaleModule.getNames("months", len, "standAlone");

			return months[d.getMonth()];
		},

		_formatGridCellLabel: function (d /*=====, row, col =====*/) {
			// summary:
			//		Computes the column header label for the specified date.
			//		By default a formatter is used, optionally the <code>gridCellDatePattern</code>
			//		property can be used to set a custom date pattern to the formatter.
			// d: Date
			//		The date to format.
			// row: Integer
			//		The row that displays the current date.
			// col: Integer
			//		The column that displays the current date.
			// tags:
			//		protected

			var format, rb;

			if (d == null) {
				return "";
			}

			if (this.gridCellPattern) {
				return this.dateLocaleModule.format(d, {
					selector: "date",
					datePattern: this.gridCellDatePattern
				});
			} else {
				rb = i18n.getLocalization("dojo.cldr", this._calendar);
				format = rb["dateFormatItem-d"];

				var days = this.dateLocaleModule.getNames("days", "abbr", "standAlone");

				return days[d.getDay()].substring(0, 1) + " " + this.dateLocaleModule.format(d, {
					selector: "date",
					datePattern: format
				});
			}
		},

		//////////////////////////////////////////
		//
		// Time of day management
		//
		//////////////////////////////////////////

		// scrollPosition: Integer
		//		The scroll position of the view.
		scrollPosition: dcl.prop({
			set: function (value) {
				this._setScrollPosition(value.date, value.duration, value.easing);
			},

			get: function () {
				return {date: (this.scrollableNode.scrollTop / this.daySize) + 1};
			}
		}),

		_setScrollPosition: function (date, duration) {
			if (date < 1) {
				date = 1;
			} else if (date > 31) {
				date = 31;
			}

			var position = (date - 1) * this.daySize;

			this.scrollTo({y: position}, duration);
		},

		ensureVisibility: function (start, end, visibilityTarget, margin, duration) {
			// summary:
			//		Scrolls the view if the [start, end] time range is not visible or only partially visible.
			// start: Date
			//		Start time of the range of interest.
			// end: Date
			//		End time of the range of interest.
			// margin: Integer
			//		Margin in minutes around the time range.
			// visibilityTarget: String
			//		The end(s) of the time range to make visible.
			//		Valid values are: "start", "end", "both".
			// duration: Number
			//		Optional, the maximum duration of the scroll animation.

			margin = margin === undefined ? 1 : margin;

			if (this.scrollable && this.autoScroll) {
				var s = start.getDate() - margin; // -1 because day of months starts at 1 and not 0
				if (this.isStartOfDay(end)) {
					end = this._waDojoxAddIssue(end, "day", -1);
				}
				var e = end.getDate() + margin;

				var viewStart = this.scrollPosition.date;
				var r = domGeometry.getContentBox(this.scrollableNode);
				var viewEnd = (this.scrollPosition.date + (r.h / this.daySize));

				var visible = false;
				var target = null;

				switch (visibilityTarget) {
				case "start":
					visible = s >= viewStart && s <= viewEnd;
					target = s;
					break;
				case "end":
					visible = e >= viewStart && e <= viewEnd;
					target = e - (viewEnd - viewStart);
					break;
				case "both":
					visible = s >= viewStart && e <= viewEnd;
					target = s;
					break;
				}

				if (!visible) {
					this._setScrollPosition(target, duration);
				}
			}
		},

		scrollView: function (dir) {
			// summary:
			//		Scrolls the view to the specified direction of one time slot duration.
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			//
			var pos = this.scrollPosition.date + dir;
			this._setScrollPosition(pos);
		},

		//////////////////////////////////////////
		//
		// HTML structure management
		//
		//////////////////////////////////////////

		_createRendering: function () {
			// tags:
			//		private

			this.scrollbarWidth = metrics.getScrollbar().w + 1;
			this.sheetHeight = this.daySize * this.maxDayCount;

			domStyle.set(this.sheetContainer, "height", this.sheetHeight + "px");

			// TODO: only call these methods when necessary
			this._configureScrollBar();
			this._buildColumnHeader();
			this._buildGrid();
			this._buildItemContainer();
		},

		_configureScrollBar: function () {
			// Compensate for scrollbar on main grid, to make column headers align.
			this.columnHeader.style[this.effectiveDir == "ltr" ? "marginRight" : "marginLeft"] =
				metrics.getScrollbar().w + "px";
		},

		_columnHeaderClick: function (e) {
			e.stopPropagation();
			var index = e.currentTarget.index;
			this.emit("column-header-click", {
				index: index,
				date: this.dates[index][0],
				triggerEvent: e
			});
		},

		_buildColumnHeader: function () {
			// summary:
			//		Creates incrementally the HTML structure of the column header and configures its content.
			// tags:
			//		private

			var table = this.columnHeaderTable;
			if (!table) {
				return;
			}
			var tr = table.rows[0] || table.insertRow();

			// Adjust number of cells to equal this.columnCount.
			var i;
			for (i = tr.children.length; i < this.columnCount; i++) {
				var td = tr.insertCell();
				on(td, "click", this._columnHeaderClick.bind(this));
			}
			for (i = tr.children.length; i > this.columnCount; i--) {
				tr.removeChild(tr.lastChild);
			}

			// fill & configure
			Array.prototype.forEach.call(tr.children, function (td, i) {
				td.className = "";
				td.index = i;
				var d = this.dates[i][0];
				this._setText(td, this._formatColumnHeaderLabel(d));
				this.styleColumnHeaderCell(td, d);
			}, this);
		},

		styleColumnHeaderCell: function (/*===== node, date =====*/) {
			// summary:
			//		Styles the CSS classes to the node that displays a column header cell.
			//		By default this method is does nothing and is designed to be overridden.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// tags:
			//		protected
		},

		_buildGrid: function () {
			// summary:
			//		Creates incrementally the HTML structure of the grid and configures its content.
			// tags:
			//		private

			var table = this.gridTable;
			if (!table) {
				return;
			}
			domStyle.set(table, "height", this.sheetHeight + "px");

			// Adjust number of rows to equal this.maxDayCount.
			var i;
			for (i = table.rows.length; i < this.maxDayCount; i++) {
				table.insertRow();
			}
			for (i = table.rows.length; i > this.maxDayCount; i--) {
				table.deleteRow(-1);
			}

			// Set the CSS classes
			Array.prototype.forEach.call(table.rows, function (tr, row) {
				tr.className = "";

				// Adjust number of cells to equal this.columnCount.
				for (i = tr.children.length; i < this.columnCount; i++) {
					var td = tr.insertCell();
					domConstruct.create("span", null, td);
				}
				for (i = tr.children.length; i > this.columnCount; i--) {
					tr.removeChild(tr.lastChild);
				}

				Array.prototype.forEach.call(tr.children, function (td, col) {
					td.className = "";

					var d = null;
					if (row < this.dates[col].length) {
						d = this.dates[col][row];
					}

					var span = td.firstChild;
					this._setText(span, this.showCellLabel ? this._formatGridCellLabel(d, row, col) : null);

					this.styleGridCell(td, d, col, row);
				}, this);
			}, this);
		},

		styleGridCell: function (node, date /*===== , col, row =====*/) {
			// summary:
			//		Styles the CSS classes to the node that displays a column.
			//		By default this method is setting the following CSS classes:
			//		- "d-calendar-today" class name if the date displayed is the current date,
			//		- "d-calendar-weekend" if the date represents a weekend,
			//		- the CSS class corresponding of the displayed day of week ("Sun", "Mon" and so on),
			// node: Node
			//		The DOM node that displays the cell in the grid.
			// date: Date
			//		The date displayed by this cell.
			// col: Integer
			//		The column index of this cell.
			// row: Integer
			//		The row index of this cell.
			// tags:
			//		protected

			if (date == null) {
				return;
			}
			domClass.add(node, this._cssDays[date.getDay()]);
			if (this.isToday(date)) {
				domClass.add(node, "d-calendar-today");
			} else if (this.isWeekEnd(date)) {
				domClass.add(node, "d-calendar-weekend");
			}
		},

		_buildItemContainer: function () {
			// summary:
			//		Creates the HTML structure of the item container and configures its content.
			// tags:
			//		private

			var table = this.itemContainerTable;
			if (!table) {
				return;
			}

			domStyle.set(table, "height", this.sheetHeight + "px");

			var tr = table.rows[0] || table.insertRow();

			// Adjust number of cells to equal this.columnCount.
			var i;
			for (i = tr.children.length; i < this.columnCount; i++) {
				var td = tr.insertCell();
				domConstruct.create("div", {"className": "d-calendar-container-column"}, td);
			}
			for (i = tr.children.length; i > this.columnCount; i--) {
				tr.removeChild(tr.lastChild);
			}

			this.cells = Array.prototype.map.call(tr.children, function (td) {
				var div = td.firstChild;
				domStyle.set(div, {
					"height": this.sheetHeight + "px"
				});
				return div;
			}, this);
		},

		///////////////////////////////////////////////////////////////
		//
		// Layout
		//
		///////////////////////////////////////////////////////////////

		_overlapLayoutPass2: function (lanes) {
			// summary:
			//		Second pass of the overlap layout (optional). Compute the extent of each layout item.
			// lanes:
			//		The array of lanes.
			// tags:
			//		private

			var i, j, lane, layoutItem;

			// last lane, no extent possible
			lane = lanes[lanes.length - 1];

			for (j = 0; j < lane.length; j++) {
				lane[j].extent = 1;
			}

			for (i = 0; i < lanes.length - 1; i++) {
				lane = lanes[i];

				for (j = 0; j < lane.length; j++) {
					layoutItem = lane[j];

					// if item was already overlapping another one there is no extent possible.
					if (layoutItem.extent == -1) {
						layoutItem.extent = 1;
						var space = 0;

						var stop = false;

						for (var k = i + 1; k < lanes.length && !stop; k++) {
							var ccol = lanes[k];
							for (var l = 0; l < ccol.length && !stop; l++) {
								var layoutItem2 = ccol[l];

								if (layoutItem.start < layoutItem2.end && layoutItem2.start < layoutItem.end) {
									stop = true;
								}
							}
							if (!stop) {
								//no hit in the entire lane
								space++;
							}
						}
						layoutItem.extent += space;
					}
				}
			}
		},

		_defaultItemToRendererKindFunc: function (item) {
			// tags:
			//		private

			if (item.allDay) {
				return "vertical";
			}
			var dur = Math.abs(this.dateModule.difference(item.startTime, item.endTime, "minute"));
			return dur >= 1440 ? "vertical" : null;
		},

		_layoutRenderers: dcl.superCall(function (sup) {
			return function () {
				this.hiddenEvents = {};
				sup.apply(this, arguments);
			};
		}),

		_layoutInterval: function (/*Integer*/index, /*Date*/start, /*Date*/end,
								   /*Object[]*/items, /*String*/itemsType) {
			// tags:
			//		private

			var verticalItems = [];
			var hiddenItems = [];
			this.colW = this.itemContainer.offsetWidth / this.columnCount;

			if (itemsType === "dataItems") {
				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					if (this._itemToRendererKind(item) == "vertical") {
						verticalItems.push(item);
					} else if (this.showHiddenItems) {
						hiddenItems.push(item);
					}
				}

				if (verticalItems.length > 0) {
					this._layoutVerticalItems(index, start, end, verticalItems, itemsType);
				}
				if (hiddenItems.length > 0) {
					this._layoutBgItems(index, start, end, hiddenItems);
				}
			} else { // itemsType === "decorationItems"
				this._layoutVerticalItems(index, start, end, items, itemsType);
			}
		},

		_dateToYCoordinate: function (d, start) {
			// tags:
			//		private

			var pos = 0;
			if (start || d.getHours() !== 0 || d.getMinutes() !== 0) {
				pos = (d.getDate() - 1) * this.daySize;
			} else {
				var d2 = this._waDojoxAddIssue(d, "day", -1);
				pos = this.daySize + ((d2.getDate() - 1) * this.daySize);
			}
			pos += (d.getHours() * 60 + d.getMinutes()) * this.daySize / 1440;

			return pos;
		},

		_layoutVerticalItems: function (/*Integer*/index, /*Date*/startTime, /*Date*/endTime,
										/*Object[]*/items, /*String*/itemsType) {
			// tags:
			//		private

			if (this.verticalRenderer == null) {
				return;
			}

			var cell = this.cells[index];
			var layoutItems = [];

			// step 1 compute projected position and size
			for (var i = 0; i < items.length; i++) {

				var item = items[i];
				var overlap = this.computeRangeOverlap(item.startTime, item.endTime, startTime, endTime);

				var top = this._dateToYCoordinate(overlap[0], true);
				var bottom = this._dateToYCoordinate(overlap[1], false);

				if (bottom > top) {
					var litem = Object.create(item);
					litem.start = top;
					litem.end = bottom;
					litem.range = overlap;
					litem.item = item;
					layoutItems.push(litem);
				}
			}


			// step 2: compute overlapping layout
			var numLanes = itemsType === "dataItems" ? this.computeOverlapping(layoutItems,
				this._overlapLayoutPass2).numLanes : 1;

			var hOverlap = this.percentOverlap / 100;

			// step 3: create renderers and apply layout
			for (i = 0; i < layoutItems.length; i++) {

				item = layoutItems[i];
				var lane = item.lane;
				var extent = item.extent;

				var ir = null;

				if (itemsType === "dataItems") {
					var w;
					var posX;

					if (hOverlap === 0) {
						//no overlap and a padding between each event
						w = numLanes == 1 ? this.colW : ((this.colW - (numLanes - 1) * this.horizontalGap)
							/ numLanes);
						posX = lane * (w + this.horizontalGap);
						w = extent == 1 ? w : w * extent + (extent - 1) * this.horizontalGap;
						w = 100 * w / this.colW;
						posX = 100 * posX / this.colW;
					} else {
						// an overlap
						w = numLanes == 1 ? 100 : (100 / (numLanes - (numLanes - 1) * hOverlap));
						posX = lane * (w - hOverlap * w);
						w = extent == 1 ? w : w * (extent - (extent - 1) * hOverlap);
					}

					ir = this._createRenderer(item, "vertical", this.verticalRenderer, "d-calendar-vertical");

					domStyle.set(ir.container, {
						"top": item.start + "px",
						"left": posX + "%",
						"width": w + "%",
						"height": (item.end - item.start + 1) + "px"
					});

					var edited = this.isItemBeingEdited(item);
					var selected = this.isSelected(item);
					var hovered = this.isItemHovered(item);
					var focused = this.isItemFocused(item);

					var renderer = ir.renderer;

					renderer.hovered = hovered;
					renderer.selected = selected;
					renderer.edited = edited;
					renderer.focused = (this.showFocus ? focused : false);

					renderer.storeState = this.getItemStoreState(item);

					renderer.moveEnabled = (this.isItemMoveEnabled(item._item, "vertical"));
					renderer.resizeEnabled = (this.isItemResizeEnabled(item._item, "vertical"));

					this.applyRendererZIndex(item, ir, hovered, selected, edited, focused);

					renderer.w = w;
					renderer.h = item.end - item.start + 1;

					renderer.deliver();
				} else { //itemsType === "decorationItems"
					ir = this.decorationRendererManager.createRenderer(item, "vertical",
						this.verticalDecorationRenderer, "d-calendar-decoration");

					domStyle.set(ir.container, {
						"top": item.start + "px",
						"left": "0",
						"width": "100%",
						"height": (item.end - item.start + 1) + "px"
					});
				}

				domConstruct.place(ir.container, cell);
				domStyle.set(ir.container, "display", "block");
			}
		},

		_getCellAt: function (rowIndex, columnIndex, rtl) {
			// tags:
			//		private

			// TODO: why is the default value of the rtl flag true?
			if ((rtl === undefined || rtl) && this.effectiveDir === "rtl") {
				columnIndex = this.columnCount - 1 - columnIndex;
			}
			return this.gridTable.childNodes[0].childNodes[rowIndex].childNodes[columnIndex];
		},

		refreshRendering: dcl.before(function () {
			// make sure to clear hidden object state
			Array.prototype.forEach.call(this.gridTable.querySelectorAll("td.d-calendar-hidden-events"),
					function (td) {
				domClass.remove(td, "d-calendar-hidden-events");
			});
		}),

		_layoutBgItems: function (/*Integer*/col, /*Date*/startTime, /*Date*/endTime,
								  /*Object[]*/items) {
			// tags:
			//		private

			var bgItems = {};
			for (var i = 0; i < items.length; i++) {

				var item = items[i];
				var overlap = this.computeRangeOverlap(item.startTime, item.endTime, startTime, endTime);
				var start = overlap[0].getDate() - 1;
				// handle use case where end time is first day of next month.
				var end;
				if (this.isStartOfDay(overlap[1])) {
					end = this._waDojoxAddIssue(overlap[1], "day", -1);
					end = end.getDate() - 1;
				} else {
					end = overlap[1].getDate() - 1;
				}

				for (var d = start; d <= end; d++) {
					bgItems[d] = true;
				}
			}

			for (var row in bgItems) {
				if (bgItems[row]) {
					var node = this._getCellAt(row, col, false);
					domClass.add(node, "d-calendar-hidden-events");
				}
			}
		},

		_sortItemsFunction: function (a, b) {
			// tags:
			//		private

			var res = this.dateModule.compare(a.startTime, b.startTime);
			if (res === 0) {
				res = -1 * this.dateModule.compare(a.endTime, b.endTime);
			}
			return this.effectiveDir === "ltr" ? res : -res;
		},

		///////////////////////////////////////////////////////////////
		//
		// View to time projection
		//
		///////////////////////////////////////////////////////////////

		getTime: function (e, x, y, touchIndex) {
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

			if (e != null) {
				var refPos = domGeometry.position(this.itemContainer, true);

				if (e.touches) {
					touchIndex = touchIndex === undefined ? 0 : touchIndex;

					x = e.touches[touchIndex].pageX - refPos.x;
					y = e.touches[touchIndex].pageY - refPos.y;
				} else {
					x = e.pageX - refPos.x;
					y = e.pageY - refPos.y;
				}
			}

			var r = domGeometry.getContentBox(this.itemContainer);

			if (this.effectiveDir === "rtl") {
				x = r.w - x;
			}

			if (x < 0) {
				x = 0;
			} else if (x > r.w) {
				x = r.w - 1;
			}

			if (y < 0) {
				y = 0;
			} else if (y > r.h) {
				y = r.h - 1;
			}

			var col = Math.floor(x / (r.w / this.columnCount));
			var row = Math.floor(y / (r.h / this.maxDayCount));

			var date = null;
			if (col < this.dates.length &&
				row < this.dates[col].length) {
				date = this.newDate(this.dates[col][row]);
			}

			return date;
		},

		///////////////////////////////////////////////////////////////
		//
		// Events
		//
		///////////////////////////////////////////////////////////////

		_onGridMouseUp: dcl.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);

				if (this._gridMouseDown) {
					this._gridMouseDown = false;

					this.emit("grid-click", {
						date: this.getTime(e),
						triggerEvent: e
					});
				}
			};
		}),

		_onGridTouchStart: dcl.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);

				var g = this._gridProps;

				g.moved = false;
				g.start = e.touches[0].screenY;
				g.scrollTop = this.scrollableNode.scrollTop;
			};
		}),

		_onGridTouchMove: dcl.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);

				if (e.touches.length > 1 && !this._isEditing) {
					e.stopPropagation();
					return;
				}

				if (this._gridProps && !this._isEditing) {

					var touch = {x: e.touches[0].screenX, y: e.touches[0].screenY};

					var p = this._edProps;

					if (!p || p &&
						(Math.abs(touch.x - p.start.x) > 25 ||
						Math.abs(touch.y - p.start.y) > 25)) {

						this._gridProps.moved = true;
						var d = e.touches[0].screenY - this._gridProps.start;
						var value = this._gridProps.scrollTop - d;
						var max = this.itemContainer.offsetHeight - this.scrollableNode.offsetHeight;
						if (value < 0) {
							this._gridProps.start = e.touches[0].screenY;
							this.scrollTo({y: 0});
							this._gridProps.scrollTop = 0;
						} else if (value > max) {
							this._gridProps.start = e.touches[0].screenY;
							this.scrollTo({y: max});
							this._gridProps.scrollTop = max;
						} else {
							this.scrollTo({y: value});
						}
					}
				}
			};
		}),

		_onGridTouchEnd: dcl.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);

				var g = this._gridProps;

				if (g) {
					if (!this._isEditing) {
						if (!g.moved) {

							// touched on grid and on touch start editing was ongoing.
							if (!g.fromItem && !g.editingOnStart) {
								this.selectFromEvent(e, null, null, true);
							}

							if (!g.fromItem) {
								if (this._pendingDoubleTap && this._pendingDoubleTap.grid) {
									this.emit("grid-double-click", {
										date: this.getTime(this._gridProps.event),
										triggerEvent: this._gridProps.event
									});

									clearTimeout(this._pendingDoubleTap.timer);

									delete this._pendingDoubleTap;
								} else {
									this.emit("grid-click", {
										date: this.getTime(this._gridProps.event),
										triggerEvent: this._gridProps.event
									});

									this._pendingDoubleTap = {
										grid: true,
										timer: this.defer(function () {
											delete this._pendingDoubleTap;
										}, this.doubleTapDelay)
									};
								}
							}
						}
					}

					this._gridProps = null;
				}
			};
		}),

		////////////////////////////////////////////
		//
		// Editing
		//
		///////////////////////////////////////////

		snapUnit: "day",
		snapSteps: 1,
		minDurationUnit: "day",
		minDurationSteps: 1,
		liveLayout: false,
		stayInView: true,
		allowStartEndSwap: true,
		allowResizeLessThan24H: false
	});
});
