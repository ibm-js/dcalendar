define([
	"./ViewBase",
	"./VerticalScrollBar",
	"delite/handlebars!./templates/ColumnView.html",
	"delite/register",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/has",
	"dojo/_base/fx",
	"dojo/_base/html",
	"dojo/on",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/mouse",
	"dojo/query",
	"dojox/html/metrics"
], function (
	ViewBase,
	_ScrollBarBase,
	template,
	register,
	event,
	lang,
	arr,
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
	query,
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

	return register("d-calendar-simple-column", [HTMLElement, ViewBase], {
		// summary:
		//		The simple column view is displaying a day per column. Each cell of a column is a time slot.

		baseClass: "dojoxCalendarColumnView",

		template: template,

		// viewKind: String
		//		Type of the view. Used by the calendar widget to determine how to configure the view.
		//		This view kind is "columns".
		viewKind: "columns",

		// startDate: Date
		//		The start date of the time interval displayed.
		//		If not set at initialization time, will be set to current day.
		startDate: null,

		// columnCount: Integer
		//		The number of column to display (from the startDate).
		columnCount: 7,

		// subcolumns: String[]
		//		Array of sub columns values.
		subColumns: null,

		// minHours: Integer
		//		The minimum hour to be displayed. It must be in the [0,23] interval
		//		and must be lower than the maxHours.
		minHours: 8,

		// maxHours: Integer
		//		The maximum hour to be displayed. It must be in the [1,36] interval
		//		and must be greater than the minHours.
		maxHours: 18,

		// hourSize: Integer
		//		The desired size in pixels of an hour on the screen.
		//		Note that the effective size may be different as the time slot size must be an integer.
		hourSize: 100,

		// timeSlotDuration: Integer
		//		Duration of the time slot in minutes. Must be a divisor of 60.
		timeSlotDuration: 15,

		// rowHeaderGridSlotDuration: Integer
		//		Duration of the time slot in minutes in the row header. Must be a divisor of 60
		//		and a multiple/divisor of timeSlotDuration.
		rowHeaderGridSlotDuration: 60,

		// rowHeaderLabelSlotDuration: Integer
		//		Duration of the time slot in minutes in the row header labels. Must be a divisor of 60
		//		and a multiple/divisor of timeSlotDuration.
		rowHeaderLabelSlotDuration: 60,

		// rowHeaderLabelOffset: Integer
		//		Offset of the row label from the top of the row header cell in pixels.
		rowHeaderLabelOffset: 2,

		// rowHeaderFirstLabelOffset: Integer
		//		Offset of the first row label from the top of the first row header cell in pixels.
		rowHeaderFirstLabelOffset: 2,

		// verticalRenderer: Class
		//		The class use to create vertical renderers.
		verticalRenderer: null,

		// verticalDecorationRenderer: Class
		//		The class use to create decoration renderers.
		verticalDecorationRenderer: null,

		// minColumnWidth: Integer
		//		The minimum column width. If the number of columns and sub columns displayed makes the
		//		width of a column greater than this property, a horizontal scroll bar is displayed.
		//		If value <= 0, this constraint is ignored and the columns are using the available space.
		minColumnWidth: -1,

		// percentOverlap: Integer
		//		The percentage of the renderer width used to superimpose one item renderer on another
		//		when two events are overlapping.
		percentOverlap: 70,

		// horizontalGap: Integer
		//		The number of pixels between two item renderers that are overlapping each other
		//		if the percentOverlap property is 0.
		horizontalGap: 4,

		_showSecondarySheet: false,

		_columnHeaderHandlers: null,

		// Computed properties, mostly formerly in renderData
		hourCount: -1,
		slotSize: -1,

		createdCallback: function () {
			this._columnHeaderHandlers = [];
		},

		destroy: function (preserveDom) {
			this._cleanupColumnHeader();
			if (this.scrollBar) {
				this.scrollBar.destroy(preserveDom);
			}
		},

		_scrollBar_onScroll: function (value) {
			this._setScrollPosition(value);
		},

		_hscrollBar_onScroll: function (value) {
			this._setHScrollPosition(value);
		},

		postRender: function () {
			this._hScrollNodes =
				[this.columnHeaderTable, this.subColumnHeaderTable, this.gridTable, this.itemContainerTable];

			this._viewHandles.push(
				on(this.scrollContainer, mouse.wheel,
					lang.hitch(this, this._mouseWheelScrollHander)));
		},

		_setVerticalRendererAttr: function (value) {
			this._destroyRenderersByKind("vertical");			// clear cache
			this._set("verticalRenderer", value);
		},

		computeProperties: function (oldVals) {
			if (this.startDate == null) {
				this.startDate = this.floorToDay(new this.dateClassObj());
			}

			var v = this.minHours;
			if (v < 0 || v > 23 || isNaN(v)) {
				this.minHours = 0;
			}
			v = this.maxHours;
			if (v < 1 || v > 36 || isNaN(v)) {
				this.minHours = 36;
			}

			if (this.minHours > this.maxHours) {
				var t = this.maxHours;
				this.maxHours = this.minHours;
				this.minHours = t;
			}
			if (this.maxHours - this.minHours < 1) {
				this.minHours = 0;
				this.maxHours = 24;
			}
			if (this.columnCount < 1 || isNaN(this.columnCount)) {
				this.columnCount = 1;
			}

			v = this.percentOverlap;
			if (v < 0 || v > 100 || isNaN(v)) {
				this.percentOverlap = 70;
			}
			if (this.hourSize < 5 || isNaN(this.hourSize)) {
				this.hourSize = 10;
			}
			v = this.timeSlotDuration;
			if (v < 1 || v > 60 || isNaN(v)) {
				this.timeSlotDuration = 15;
			}

			this.hourCount = this.maxHours - this.minHours;
			this.slotSize = Math.ceil(this.hourSize / (60 / this.timeSlotDuration));
			this.hourSize = this.slotSize * (60 / this.timeSlotDuration);
			this.sheetHeight = this.hourSize * this.hourCount;

			if ("startDate" in oldVals || "columnCount" in oldVals) {
				this.dates = [];
				var d = this.floorToDay(this.startDate);
				for (var col = 0; col < this.columnCount; col++) {
					this.dates.push(d);
					d = this.addAndFloor(d, "day", 1);
				}

				this.startTime = new this.dateClassObj(this.dates[0]);
				this.startTime.setHours(this.minHours);
				this.endTime = new this.dateClassObj(this.dates[this.columnCount - 1]);
				this.endTime.setHours(this.maxHours);

				this.subColumnCount = this.subColumns ? this.subColumns.length : 1;
			}
		},

		__fixEvt: function (e) {
			// tags:
			//		private
			e.sheet = "primary";
			e.source = this;
			return e;
		},

		//////////////////////////////////////////
		//
		// Formatting functions
		//
		//////////////////////////////////////////

		// rowHeaderTimePattern: String
		//		Custom date/time pattern for the row header labels to override default one coming from the CLDR.
		//		See dojo/date/locale documentation for format string.
		rowHeaderTimePattern: null,

		_formatRowHeaderLabel: function (/*Date*/d) {
			// summary:
			//		Computes the row header label for the specified time of day.
			//		By default a formatter is used, optionally the <code>rowHeaderTimePattern</code> property
			//		can be used to set a custom time pattern to the formatter.
			// d: Date
			//		The date to format
			// tags:
			//		protected

			return this.dateLocaleModule.format(d, {
				selector: "time",
				timePattern: this.rowHeaderTimePattern
			});
		},

		// columnHeaderDatePattern: String
		//		Custom date/time pattern for column header labels to override default one coming from the CLDR.
		//		See dojo/date/locale documentation for format string.
		columnHeaderDatePattern: null,

		_formatColumnHeaderLabel: function (/*Date*/d) {
			// summary:
			//		Computes the column header label for the specified date.
			//		By default a formatter is used, optionally the <code>columnHeaderDatePattern</code> property
			//		can be used to set a custom date pattern to the formatter.
			// d: Date
			//		The date to format
			// tags:
			//		protected

			return this.dateLocaleModule.format(d, {
				selector: "date",
				datePattern: this.columnHeaderDatePattern,
				formatLength: "medium"
			});
		},

		//////////////////////////////////////////
		//
		// Time of day management
		//
		//////////////////////////////////////////

		// scrollBarRTLPosition: String
		//		Position of the scroll bar in right-to-left display.
		//		Valid values are "left" and "right", default value is "left".
		scrollBarRTLPosition: "left",

		_getStartTimeOfDay: function () {
			// summary:
			//		Returns the visible first time of day.
			// tags:
			//		protected
			// returns: Object

			var v = (this.maxHours - this.minHours) *
				this._getScrollPosition() / this.sheetHeight;

			return {
				hours: this.minHours + Math.floor(v),
				minutes: (v - Math.floor(v)) * 60
			};
		},

		_getEndTimeOfDay: function () {
			// summary:
			//		Returns the visible last time of day.
			// tags:
			//		protected
			// returns: Integer[]

			var v = (this.maxHours - this.minHours) *
				(this._getScrollPosition() + this.scrollContainer.offsetHeight) / this.sheetHeight;

			return {
				hours: this.minHours + Math.floor(v),
				minutes: (v - Math.floor(v)) * 60
			};
		},

		// startTimeOfDay: Object
		//		First time (hour/minute) of day displayed, if reachable.
		//		An object containing "hours" and "minutes" properties.
		startTimeOfDay: 0,

		_setStartTimeOfDayAttr: function (value) {
			this._setStartTimeOfDay(value.hours, value.minutes, value.duration, value.easing);
			this._set("startTimeOfDay", value);

		},

		_getStartTimeOfDayAttr: function () {
			if (this) {
				return this._getStartTimeOfDay();
			} else {
				return this._get("startTimeOfDay");
			}
		},

		_setStartTimeOfDay: function (hour, minutes, maxDuration, easing) {
			// summary:
			//		Scrolls the view to show the specified first time of day.
			// hour: Integer
			//		The hour of the start time of day.
			// minutes: Integer
			//		The minutes part of the start time of day.
			// maxDuration: Integer
			//		The max duration of the scroll animation.
			// tags:
			//		protected

			hour = hour || this.minHours;
			minutes = minutes || 0;
			maxDuration = maxDuration || 0;

			if (minutes < 0) {
				minutes = 0;
			} else if (minutes > 59) {
				minutes = 59;
			}

			if (hour < 0) {
				hour = 0;
			} else if (hour > this.maxHours) {
				hour = this.maxHours;
			}

			var timeInMinutes = hour * 60 + minutes;

			var minH = this.minHours * 60;
			var maxH = this.maxHours * 60;

			if (timeInMinutes < minH) {
				timeInMinutes = minH;
			} else if (timeInMinutes > maxH) {
				timeInMinutes = maxH;
			}

			var pos = (timeInMinutes - minH) * this.sheetHeight / (maxH - minH);
			pos = Math.min(this.sheetHeight - this.scrollContainer.offsetHeight, pos);

			this._scrollToPosition(pos, maxDuration, easing);
		},

		_scrollToPosition: function (position, maxDuration, easing) {
			// summary:
			//		Scrolls the view to show the specified first time of day.
			// position: Integer
			//		The position in pixels.
			// maxDuration: Integer
			//		The max duration of the scroll animation.
			// tags:
			//		protected

			if (maxDuration) {

				if (this._scrollAnimation) {
					this._scrollAnimation.stop();
				}

				var scrollPos = this._getScrollPosition();

				var duration = Math.abs(((position - scrollPos) * maxDuration) / this.sheetHeight);

				this._scrollAnimation = new fx.Animation({
					curve: [scrollPos, position],
					duration: duration,
					easing: easing,
					onAnimate: lang.hitch(this, function (position) {
						this._setScrollImpl(position);
					})
				});

				this._scrollAnimation.play();

			} else {
				this._setScrollImpl(position);
			}
		},

		_setScrollImpl: function (v) {
			this._setScrollPosition(v);
			if (this.scrollBar) {
				this.scrollBar.value = v;
			}
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

			margin = margin === undefined ? this.timeSlotDuration : margin;

			if (this.scrollable && this.autoScroll) {

				var s = start.getHours() * 60 + start.getMinutes() - margin;
				var e = end.getHours() * 60 + end.getMinutes() + margin;

				var vs = this._getStartTimeOfDay();
				var ve = this._getEndTimeOfDay();

				var viewStart = vs.hours * 60 + vs.minutes;
				var viewEnd = ve.hours * 60 + ve.minutes;

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
					this._setStartTimeOfDay(Math.floor(target / 60), target % 60, duration);
				}
			}
		},

		scrollView: function (dir) {
			// summary:
			//		Scrolls the view to the specified direction of one time slot duration.
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			//
			var t = this._getStartTimeOfDay();
			t = t.hours * 60 + t.minutes + (dir * this.timeSlotDuration);
			this._setStartTimeOfDay(Math.floor(t / 60), t % 60);
		},

		scrollViewHorizontal: function (dir) {
			// summary:
			//		Scrolls the view horizontally to the specified direction of one column or sub column (if set).
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			//
			this._setHScrollPosition(this._getHScrollPosition() + (dir * this.minColumnWidth));
			if (this.hScrollBar) {
				this.hScrollBar.value = this._getHScrollPosition();
			}
		},

		_hScrollNodes: null,

		_setHScrollPositionImpl: function (pos, useDom, cssProp) {
			var elts = [this.columnHeaderTable, this.subColumnHeaderTable, this.gridTable, this.itemContainerTable];
			var css = useDom ? null : "translateX(-" + pos + "px)";
			arr.forEach(elts, function (elt) {
				if (useDom) {
					elt.scrollLeft = pos;
					domStyle.set(elt, "left", (-pos) + "px");
				} else {
					domStyle.set(elt, cssProp, css);
				}
			}, this);
		},

		_mouseWheelScrollHander: function (e) {
			// summary:
			//		Mouse wheel handler.
			// tags:
			//		protected
			if (this.hScrollBarEnabled && e.altKey) {
				this.scrollViewHorizontal(e.wheelDelta > 0 ? -1 : 1);
			} else {
				this.scrollView(e.wheelDelta > 0 ? -1 : 1);
			}
			event.stop(e);
		},

		//////////////////////////////////////////
		//
		// HTML structure management
		//
		//////////////////////////////////////////

		_createRendering: function () {
			// tags:
			//		private

			if (!this._rowHeaderWidth) {
				this._rowHeaderWidth = domGeometry.getMarginBox(this.rowHeader).w;
			}

			var sbMetrics = metrics.getScrollbar();
			this.scrollbarWidth = sbMetrics.w + 1;
			this.scrollbarHeight = sbMetrics.h + 1;

			this.hScrollPaneWidth = domGeometry.getMarginBox(this.grid).w;

			this.minSheetWidth = this.minColumnWidth < 0 ? -1 : this.minColumnWidth * this.subColumnCount * this.columnCount;
			this.hScrollBarEnabled = this.minColumnWidth > 0 && this.hScrollPaneWidth < this.minSheetWidth;

			domStyle.set(this.sheetContainer, "height", this.sheetHeight + "px");

			// TODO: only call these methods when necessary
			// padding for the scroll bar.
			this._configureVisibleParts();
			this._configureScrollBar();
			this._buildColumnHeader();
			this._buildSubColumnHeader();
			this._buildRowHeader();
			this._buildGrid();
			this._buildItemContainer();
			this._layoutTimeIndicator();
			this._commitProperties();
		},

		_configureVisibleParts: function () {
			if (this.secondarySheet) {
				domStyle.set(this.secondarySheet, "display", this._showSecondarySheet ? "block" : "none");
			}

			domClass[this.subColumns == null ? "remove" : "add"](this, "subColumns");
			domClass[this._showSecondarySheet ? "add" : "remove"](this, "secondarySheet");
		},

		_commitProperties: function () {
			var v = this.startTimeOfDay;
			if (v !== null) {
				// initial position, no animation
				this._setStartTimeOfDay(v.hours, v.minutes === undefined ? 0 : v.minutes);
			}
		},

		_configureScrollBar: function () {
			// summary:
			//		Sets the scroll bar size and position.
			// tags:
			//		protected

			var atRight = this.effectiveDir === "ltr" || this.scrollBarRTLPosition == "right";
			var rPos = atRight ? "right" : "left";
			var lPos = atRight ? "left" : "right";

			if (this.scrollBar) {
				this.scrollBar.maximum = this.sheetHeight;
				domStyle.set(this.vScrollBar, rPos, 0);
				domStyle.set(this.vScrollBar, atRight ? "left" : "right", "auto");
				domStyle.set(this.vScrollBar, "bottom", this.hScrollBarEnabled ?
					this.scrollbarHeight + "px" : "0");
			}
			domStyle.set(this.scrollContainer, rPos, this.scrollbarWidth + "px");
			domStyle.set(this.scrollContainer, lPos, "0");
			domStyle.set(this.header, rPos, this.scrollbarWidth + "px");
			domStyle.set(this.header, lPos, "0");
			domStyle.set(this.subHeader, rPos, this.scrollbarWidth + "px");
			domStyle.set(this.subHeader, lPos, "0");
			if (this.buttonContainer && this.owner != null && this.owner.currentView == this) {
				domStyle.set(this.buttonContainer, rPos, this.scrollbarWidth + "px");
				domStyle.set(this.buttonContainer, lPos, "0");
			}

			if (this.hScrollBar) {
				arr.forEach(this._hScrollNodes, function (elt) {
					domClass[this.hScrollBarEnabled ? "add" : "remove"](elt.parentNode,
						"dojoxCalendarHorizontalScroll");
				}, this);

				if (!this.hScrollBarEnabled) {
					this._setHScrollPosition(0);
					this.hScrollBar.value = 0;
				}

				domStyle.set(this.hScrollBar, {
					"display": this.hScrollBarEnabled ? "block" : "none",
					"height": this.scrollbarHeight + "px",
					"left": (atRight ? this.rowHeaderWidth : this.scrollbarWidth) + "px",
					"right": (atRight ? this.scrollbarWidth : this.rowHeaderWidth) + "px"
				});

				domStyle.set(this.scrollContainer, "bottom", this.hScrollBarEnabled ?
					(this.scrollbarHeight + 1) + "px" : "0");
				this._configureHScrollDomNodes(this.hScrollBarEnabled ? this.minSheetWidth + "px" : "100%");

				this.hScrollBar.maximum = this.minSheetWidth;
				this.hScrollBar.containerSize = this.hScrollPaneWidth;
			}
		},

		_configureHScrollDomNodes: function (styleWidth) {
			arr.forEach(this._hScrollNodes, function (elt) {
				domStyle.set(elt, "width", styleWidth);
			}, this);
		},

		resize: function (e) {
			this._resizeHandler(e);
		},

		_resizeHandler: function (e, apply) {
			// summary:
			//		Refreshes the scroll bars after a resize of the widget.
			// e: Event
			//		The resize event (optional)
			// apply: Boolean
			//		Whether apply the changes or wait for 100 ms
			// tags:
			//		private

			if (apply) {
				var hScrollPaneWidth = domGeometry.getMarginBox(this.grid).w;

				if (this.hScrollPaneWidth != hScrollPaneWidth) {
					// refresh values
					this.hScrollPaneWidth = hScrollPaneWidth;
					this.minSheetWidth = this.minColumnWidth < 0 ? -1 :
						this.minColumnWidth * this.subColumnCount * this.columnCount;
					this.hScrollBarEnabled = this.minColumnWidth > 0 &&
						domGeometry.getMarginBox(this.grid).w < this.minSheetWidth;
				}

				this._configureScrollBar();
			} else {
				if (this._resizeTimer !== undefined) {
					clearTimeout(this._resizeTimer);
				}
				this._resizeTimer = setTimeout(lang.hitch(this, function () {
					this._resizeHandler(e, true);
				}), 100);
			}
		},

		_columnHeaderClick: function (e) {
			// tags:
			//		private

			event.stop(e);
			var index = query("td", this.columnHeaderTable).indexOf(e.currentTarget);
			this._onColumnHeaderClick({
				index: index,
				date: this.dates[index],
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

			var tbody = table.firstChild;
			if (!tbody) {
				tbody = html.create("tbody", null, table);
			}

			var tr = tbody.firstChild;
			if (!tr) {
				tr = domConstruct.create("tr", null, tbody);
			}

			// Create cells (if needed)
			// TODO: use event delegation
			for (var i = tr.children.length; i < this.columnCount; i++) {
				var td = domConstruct.create("td", null, tr);

				var h = [];
				h.push(on(td, "click", lang.hitch(this, this._columnHeaderClick)));

				if (has("touch-events")) {
					h.push(on(td, "touchstart", function (e) {
						event.stop(e);
						domClass.add(e.currentTarget, "Active");
					}));

					h.push(on(td, "touchend", function (e) {
						event.stop(e);
						domClass.remove(e.currentTarget, "Active");
					}));
				} else {
					h.push(on(td, "mousedown", function (e) {
						event.stop(e);
						domClass.add(e.currentTarget, "Active");
					}));

					h.push(on(td, "mouseup", function (e) {
						event.stop(e);
						domClass.remove(e.currentTarget, "Active");
					}));

					h.push(on(td, "mouseover", function (e) {
						event.stop(e);
						domClass.add(e.currentTarget, "Hover");
					}));

					h.push(on(td, "mouseout", function (e) {
						event.stop(e);
						domClass.remove(e.currentTarget, "Hover");
					}));

				}

				this._columnHeaderHandlers.push(h);
			}

			// Delete excess rows
			for (i = tr.children.length; i > this.columnCount; i--) {
				td = tr.lastChild;
				tr.removeChild(td);
				domConstruct.destroy(td);
				var list = this._columnHeaderHandlers.pop();
				while (list.length > 0) {
					list.pop().remove();
				}
			}

			// fill & configure
			Array.prototype.forEach.call(tr.children, function (td, i) {
				td.className = "";
				var d = this.dates[i];
				this._setText(td, this._formatColumnHeaderLabel(d));
				this.styleColumnHeaderCell(td, d);
			}, this);

			if (this.yearColumnHeaderContent) {
				var d = this.dates[0];
				this._setText(this.yearColumnHeaderContent, this.dateLocaleModule.format(d,
					{selector: "date", datePattern: "yyyy"}));
			}
		},

		_cleanupColumnHeader: function () {
			while (this._columnHeaderHandlers.length > 0) {
				var list = this._columnHeaderHandlers.pop();
				while (list.length > 0) {
					list.pop().remove();
				}
			}
		},

		styleColumnHeaderCell: function (node, date) {
			// summary:
			//		Styles the CSS classes to the node that displays a column header cell.
			//		By default this method is setting:
			//		- "dojoxCalendarToday" class name if the date displayed is the current date,
			//		- "dojoxCalendarWeekend" if the date represents a weekend,
			//		- the CSS class corresponding of the displayed day of week ("Sun", "Mon" and so on).
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// tags:
			//		protected

			domClass.add(node, this._cssDays[date.getDay()]);

			if (this.isToday(date)) {
				domClass.add(node, "dojoxCalendarToday");
			} else if (this.isWeekEnd(date)) {
				domClass.add(node, "dojoxCalendarWeekend");
			}
		},

		_buildSubColumnHeader: function () {
			// summary:
			//		Creates incrementally the HTML structure of the column header and configures its content.
			// tags:
			//		private

			var table = this.subColumnHeaderTable;
			if (!table || this.subColumns == null) {
				return;
			}

			var tbody = table.firstChild;
			if (!tbody) {
				tbody = html.create("tbody", null, table);
			}

			var tr = tbody.firstChild;
			if (!tr) {
				tr = domConstruct.create("tr", null, tbody);
			}

			// create cells (if needed)
			var i, td;
			for (i = tr.children.length; i < this.columnCount; i++) {
				td = domConstruct.create("td", null, tr);
				domConstruct.create("div", {"className": "dojoxCalendarSubHeaderContainer"}, td);
			}

			// delete excess cells (if necessary)
			for (i = tr.children.length; i > this.columnCount; i--) {
				td = tr.lastChild;
				tr.removeChild(td);
				domConstruct.destroy(td);
			}

			// fill & configure
			var subCount = this.subColumnCount;
			Array.prototype.forEach.call(tr.children, function (td, i) {
				td.className = "";

				query(".dojoxCalendarSubHeaderContainer", td).forEach(function (div, i) {
					// Create child <div>'s if necessary.
					for (i = div.children.length; i < subCount; i++) {
						domConstruct.create("div", {
							"className": "dojoxCalendarSubHeaderCell dojoxCalendarSubHeaderLabel"}, div);
					}

					// Remove excess <div>'s
					for (i = div.children.length; i > subCount; i--) {
						div.removeChild(div.lastChild);
					}

					var colW = (100 / subCount) + "%";
					Array.prototype.forEach.call(div.children, function (div, i) {
						div.className = "dojoxCalendarSubHeaderCell dojoxCalendarSubHeaderLabel";
						var col = subCount == 1 ? i : Math.floor(i / subCount);
						var subColIdx = subCount == 1 ? 0 : i - col * subCount;
						domStyle.set(div, {width: colW, left: ((subColIdx * 100) / subCount) + "%"});
						domClass[subColIdx < subCount - 1 && subCount !== 1 ? "add" : "remove"](div, "subColumn");
						domClass.add(div, this.subColumns[subColIdx]);
						this._setText(div, this.subColumnLabelFunc(this.subColumns[subColIdx]));
					}, this);
				}, this);

				var d = this.dates[i];

				this.styleSubColumnHeaderCell(td, d);

			}, this);
		},


		subColumnLabelFunc: function (value) {
			// summary:
			//	Computes the label for a sub column from the subColumns property.
			//	By default, return the value.
			return value;
		},

		styleSubColumnHeaderCell: function (node, date) {
			// summary:
			//		Styles the CSS classes to the node that displays a sub column header cell.
			//		By default this method is not setting anythin:
			// node: Node
			//		The DOM node that displays the column in the grid.
			// subColumnIndex: Integer
			//		The cub column index.
			// tags:
			//		protected
			domClass.add(node, this._cssDays[date.getDay()]);

			if (this.isToday(date)) {
				domClass.add(node, "dojoxCalendarToday");
			} else if (this.isWeekEnd(date)) {
				domClass.add(node, "dojoxCalendarWeekend");
			}
		},

		_addMinutesClasses: function (node, minutes) {
			switch (minutes) {
				case 0:
					domClass.add(node, "hour");
					break;
				case 30:
					domClass.add(node, "halfhour");
					break;
				case 15:
				case 45:
					domClass.add(node, "quarterhour");
					break;
			}
		},

		_buildRowHeader: function () {
			// summary:
			//		Creates incrementally the HTML structure of the row header and configures its content.
			// tags:
			//		private
			
			var rowHeaderTable = this.rowHeaderTable;
			if (!rowHeaderTable) {
				return;
			}

			if (this._rowHeaderLabelContainer == null) {
				this._rowHeaderLabelContainer = domConstruct.create("div", {"class":
					"dojoxCalendarRowHeaderLabelContainer"}, this.rowHeader);
			}
			
			domStyle.set(rowHeaderTable, "height", this.sheetHeight + "px");

			var tbody = rowHeaderTable.firstChild;
			if (!tbody) {
				tbody = domConstruct.create("tbody", null, rowHeaderTable);
			}


			// build new rows (if necessary)
			var nbRows = Math.floor(60 / this.rowHeaderGridSlotDuration) * this.hourCount;
			var i;
			for (i = tbody.children.length; i < nbRows; i++) {
				var tr = domConstruct.create("tr", null, tbody);
				domConstruct.create("td", null, tr);
			}

			// delete excess rows (if necessary)
			for (i = tbody.children.length; i > nbRows; i--) {
				tbody.removeChild(tbody.lastChild);
			}

			// fill labels
			var size = Math.ceil(this.hourSize / (60 / this.rowHeaderGridSlotDuration));
			var d = new Date(2000, 0, 1, 0, 0, 0);

			Array.prototype.forEach.call(tbody.children, function (tr, i) {
				var td = tr.firstChild;
				td.className = "";

				domStyle.set(tr, "height", size + "px");

				var h = this.minHours + (i * this.rowHeaderGridSlotDuration) / 60;
				var m = (i * this.rowHeaderGridSlotDuration) % 60;

				this.styleRowHeaderCell(td, h, m);

				this._addMinutesClasses(td, m);
			}, this);

			var lc = this._rowHeaderLabelContainer;
			var wantedLabels = Math.floor(60 / this.rowHeaderLabelSlotDuration) * this.hourCount;
			for (i = lc.childNodes.length; i < wantedLabels; i++) {
				var span = domConstruct.create("span", null, lc);
				domClass.add(span, "dojoxCalendarRowHeaderLabel");
			}
			for (i = lc.childNodes.length; i > wantedLabels; i--) {
				lc.removeChild(lc.lastChild);
			}

			size = Math.ceil(this.hourSize / (60 / this.rowHeaderLabelSlotDuration));

			query(">span", lc).forEach(function (span, i) {
				d.setHours(0);
				d.setMinutes(this.minHours * 60 + (i * this.rowHeaderLabelSlotDuration));
				this._configureRowHeaderLabel(span, d, i, size * i);
			}, this);
		},

		_configureRowHeaderLabel: function (node, d, index, pos) {
			// summary:
			//		Configures the label of a row header cell.
			// node: DOMNode
			//		The DOM node that is the parent of the label.
			// d:Date
			//		A date object that contains the hours and minutes displayed by this row header cell.
			// index: Integer
			//		The index of this row header cell
			// pos: Integer
			//		The computed position of the row header cell

			this._setText(node, this._formatRowHeaderLabel(d));
			domStyle.set(node, "top",
				(pos + (index === 0 ? this.rowHeaderFirstLabelOffset : this.rowHeaderLabelOffset)) + "px");
			var h = this.minHours + (index * this.rowHeaderLabelSlotDuration) / 60;
			var m = (index * this.rowHeaderLabelSlotDuration) % 60;
			domClass.remove(node, ["hour", "halfhour", "quarterhour"]);
			this._addMinutesClasses(node, m);
			this.styleRowHeaderCell(node, h, m);
		},

		styleRowHeaderCell: function (/*===== node, h, m =====*/) {
			// summary:
			//		Styles the CSS classes to the node that displays a row header cell.
			//		By default this method is doing nothing.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// h: Integer
			//		The time of day displayed by this row header cell.
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

			var tbody = table.firstElementChild;
			if (!tbody) {
				tbody = domConstruct.create("tbody", null, table);
			}



			// Build time slots (if needed)
			var i;
			var nbRows = Math.floor(60 / this.timeSlotDuration) * this.hourCount;
			for (i = tbody.children.length; i < nbRows; i++) {
				domConstruct.create("tr", null, tbody);
			}

			// remove excess time slots (if necessary)
			for (i = tbody.children.length; i > nbRows; i--) {
				tbody.removeChild(tbody.lastChild);
			}

			// Likewise, add or remove <td> for each <tr>.
			Array.prototype.forEach.call(tbody.children, function (tr) {
				for (i = tr.children.length; i < this.columnCount; i++) {
					domConstruct.create("td", null, tr);
				}
				for (i = tr.children.length; i > this.columnCount; i--) {
					tr.removeChild(tr.lastChild);
				}
			}, this);

			// Set the CSS classes
			Array.prototype.forEach.call(tbody.children, function (tr) {
				domStyle.set(tr, "height", this.slotSize + "px");

				// the minutes part of the time of day displayed by the current tr
				var m = (i * this.timeSlotDuration) % 60;
				var h = this.minHours + Math.floor((i * this.timeSlotDuration) / 60);
				Array.prototype.forEach.call(tr.children, function (td, col) {
					td.className = "";
					this.styleGridCell(td, this.dates[col], h, m);
					this._addMinutesClasses(td, m);
				}, this);
			}, this);
		},

		// styleGridCellFunc: Function
		//		Custom function to customize the appearance of a grid cell by installing custom CSS class on the node.
		//		The signature of the function must be the same then the styleGridCell one.
		//		By default the defaultStyleGridCell function is used.
		styleGridCellFunc: null,

		defaultStyleGridCell: function (node, date, hours, minutes) {
			// summary:
			//		Styles the CSS classes to the node that displays a cell.
			//		By default this method is setting:
			//		- "dojoxCalendarToday" class name if the date displayed is the current date,
			//		- "dojoxCalendarWeekend" if the date represents a weekend,
			//		- the CSS class corresponding of the displayed day of week ("Sun", "Mon" and so on),
			//		- the CSS classes corresponfing to the time of day (e.g. "H14" and "M30" for for 2:30pm).
			// node: Node
			//		The DOM node that displays the cell in the grid.
			// date: Date
			//		The date displayed by this cell.
			// hours: Integer
			//		The hours part of time of day displayed by the start of this cell.
			// minutes: Integer
			//		The minutes part of time of day displayed by the start of this cell.
			// tags:
			//		protected

			domClass.add(node, [this._cssDays[date.getDay()], "H" + hours, "M" + minutes]);

			if (this.isToday(date)) {
				return domClass.add(node, "dojoxCalendarToday");
			} else if (this.isWeekEnd(date)) {
				return domClass.add(node, "dojoxCalendarWeekend");
			}
		},

		styleGridCell: function (node, date, hours, minutes) {
			// summary:
			//		Styles the CSS classes to the node that displays a cell.
			//		Delegates to styleGridCellFunc if defined or defaultStyleGridCell otherwise.
			// node: Node
			//		The DOM node that displays the cell in the grid.
			// date: Date
			//		The date displayed by this column
			// tags:
			//		protected

			if (this.styleGridCellFunc) {
				this.styleGridCellFunc(node, date, hours, minutes);
			} else {
				this.defaultStyleGridCell(node, date, hours, minutes);
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
			var tbody = table.firstElementChild;
			if (!tbody) {
				tbody = domConstruct.create("tbody", null, table);
			}
			var tr = tbody.firstElementChild;
			if (!tr) {
				tr = domConstruct.create("tr", null, tbody);
			}


			domStyle.set(table, "height", this.sheetHeight + "px");


			// build new cells (if necessary)
			var i;
			for (i = tr.children.length; i < this.columnCount; i++) {
				var td = domConstruct.create("td", null, tr);
				domConstruct.create("div", {"className": "dojoxCalendarContainerColumn"}, td);
			}

			// remove excess cells (if necessary)
			for (i = tr.children.length; i > this.columnCount; i--) {
				tr.removeChild(tr.lastChild);
			}

			var subCount = this.subColumnCount;
			var bgCols = [], decoCols = [];
			Array.prototype.forEach.call(tr.children, function (td) {
				var div = td.firstChild;
				domStyle.set(div, "height", this.sheetHeight + "px");

				// Create more dojoxCalendarSubContainerColumn (if necessary).
				for (i = div.children.length; i < this.subColumnCount; i++) {
					var subdiv = domConstruct.create("div",
						{"className": "dojoxCalendarSubContainerColumn"}, div);
					domConstruct.create("div",
						{"className": "dojoxCalendarDecorationContainerColumn"}, subdiv);
					domConstruct.create("div",
						{"className": "dojoxCalendarEventContainerColumn"}, subdiv);
				}

				// Remove excess dojoxCalendarSubContainerColumn (if necessary).
				for (i = div.children.length; i > this.subColumnCount; i--) {
					div.removeChild(div.lastChild);
				}

				var colW = (100 / subCount) + "%";
				Array.prototype.forEach.call(div.children, function (div, i) {
					var col = subCount == 1 ? i : Math.floor(i / subCount);
					var subColIdx = subCount == 1 ? 0 : i - col * subCount;
					domStyle.set(div, {width: colW, left: ((subColIdx * 100) / subCount) + "%"});
					domClass[subColIdx < subCount - 1 && subCount !== 1 ? "add" : "remove"](div, "subColumn");

					query(".dojoxCalendarEventContainerColumn", div).forEach(function (eventContainer) {
						bgCols.push(eventContainer);
					}, this);

					query(".dojoxCalendarDecorationContainerColumn", div).forEach(function (decoContainer) {
						decoCols.push(decoContainer);
					}, this);
				}, this);
			}, this);

			this.cells = bgCols;
			this.decorationCells = decoCols;
		},

		// showTimeIndicator: Boolean
		//		Whether show or not an indicator (default a red line) at the current time.
		showTimeIndicator: true,

		// timeIndicatorRefreshInterval: Integer
		//		Maximal interval between two refreshes of time indicator, in milliseconds.
		timeIndicatorRefreshInterval: 60000,

		_setShowTimeIndicatorAttr: function (value) {
			this._set("showTimeIndicator", value);
			this._layoutTimeIndicator();
		},

		_layoutTimeIndicator: function () {
			if (this.showTimeIndicator) {
				var now = new this.dateClassObj();

				var visible = this.isOverlapping(this.startTime, this.endTime, now, now) &&
					now.getHours() >= this.minHours &&
					(now.getHours() * 60 + now.getMinutes() < this.maxHours * 60);

				if (visible) {

					if (!this._timeIndicator) {
						this._timeIndicator = domConstruct.create("div",
							{"className": "dojoxCalendarTimeIndicator"});
					}

					var node = this._timeIndicator;

					for (var column = 0; column < this.columnCount; column++) {
						if (this.isSameDay(now, this.dates[column])) {
							break;
						}
					}

					var top = this.computeProjectionOnDate(this.floorToDay(now), now,
						this.sheetHeight);

					if (top != this.sheetHeight) {
						domStyle.set(node, {top: top + "px", display: "block"});
						var parentNode = this.cells[column * this.subColumnCount].parentNode.parentNode;
						if (parentNode != node.parentNode) {
							if (node.parentNode != null) {
								node.parentNode.removeChild(node);
							}
							parentNode.appendChild(node);
						}

						if (this._timeIndicatorTimer == null) {
							this._timeIndicatorTimer = setInterval(lang.hitch(this, function () {
								this._layoutTimeIndicator(this);
							}), this.timeIndicatorRefreshInterval);
						}
						return;
					}
				}

			}

			// not visible or specifically not shown fallback

			if (this._timeIndicatorTimer) {
				clearInterval(this._timeIndicatorTimer);
				this._timeIndicatorTimer = null;
			}
			if (this._timeIndicator) {
				domStyle.set(this._timeIndicator, "display", "none");
			}

		},

		beforeDeactivate: function () {
			if (this._timeIndicatorTimer) {
				clearInterval(this._timeIndicatorTimer);
				this._timeIndicatorTimer = null;
			}
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

				for (var j = 0; j < lane.length; j++) {
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
			return "vertical"; // String
		},

		_layoutInterval: function (/*Integer*/index, /*Date*/start, /*Date*/end,
								   /*Object[]*/items, /*String*/itemsType) {
			// tags:
			//		private

			var verticalItems = [];

			this.colW = this.itemContainer.offsetWidth / this.columnCount;

			if (itemsType === "dataItems") {
				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					var kind = this._itemToRendererKind(item);
					if (kind === "vertical") {
						verticalItems.push(item);
					}
				}

				this._layoutRendererWithSubColumns("vertical", true, index, start, end, verticalItems,
					itemsType);
			} else { // itemsType === "decorationItems"
				// no different rendererKind for decoration yet
				this._layoutRendererWithSubColumns("decoration", false, index, start, end, items,
					itemsType);
			}
		},

		_layoutRendererWithSubColumns: function (rendererKind, computeOverlap, index, start, end, items,
												 itemsType) {
			if (items.length > 0) {
				if (this.subColumnCount > 1) {
					var subColumnItems = {};
					var subCols = this.subColumns;
					arr.forEach(subCols, function (subCol) {
						subColumnItems[subCol] = [];
					});
					arr.forEach(items, function (item) {
						if (itemsType === "decorationItems") {
							if (item.subColumn) {
								if (subColumnItems[item.subColumn]) {
									subColumnItems[item.subColumn].push(item);
								}
							} else { // for decorations, if no sub column is set, apply to all sub columns
								arr.forEach(subCols, function (subCol) {
									var clonedItem = lang.mixin({}, item);
									clonedItem.subColumn = subCol;
									subColumnItems[subCol].push(clonedItem);
								});
							}
						} else if (item.subColumn && subColumnItems[item.subColumn]) {
							subColumnItems[item.subColumn].push(item);
						}
					});
					var subColIndex = 0;
					arr.forEach(this.subColumns, function (subCol) {
						this._layoutVerticalItems(rendererKind, computeOverlap, index, subColIndex++,
							start, end, subColumnItems[subCol], itemsType);
					}, this);
				} else {
					this._layoutVerticalItems(rendererKind, computeOverlap, index, 0,
						start, end, items, itemsType);
				}
			}
		},

		_getColumn: function (index, subIndex, itemsType) {
			var cols = itemsType === "dataItems" ? this.cells : this.decorationCells;
			return cols[index * this.subColumnCount + subIndex];
		},

		_layoutVerticalItems: function (/*Object*//*String*/ rendererKind, /*boolean*/ computeOverlap,
										/*Integer*/index, /*Integer*/subIndex, /*Date*/startTime, /*Date*/endTime,
										/*Object[]*/items, /*String*/itemsType) {
			// tags:
			//		private

			if (itemsType === "dataItems" && this.verticalRenderer == null ||
				itemsType === "decorationItems" && this.verticalDecorationRenderer == null) {
				return;
			}

			var cell = this._getColumn(index, subIndex, itemsType);

			var layoutItems = [];

			// step 1 compute projected position and size
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var overlap = this.computeRangeOverlap(item.startTime, item.endTime, startTime, endTime);

				var top = this.computeProjectionOnDate(startTime, overlap[0], this.sheetHeight);
				var bottom = this.computeProjectionOnDate(startTime, overlap[1], this.sheetHeight);

				if (bottom > top) {
					var litem = lang.mixin({
						start: top,
						end: bottom,
						range: overlap,
						item: item
					}, item);
					layoutItems.push(litem);
				}
			}

			// step 2: compute overlapping layout
			var numLanes = itemsType === "dataItems" ?
				this.computeOverlapping(layoutItems, this._overlapLayoutPass2).numLanes : 1;

			var hOverlap = this.percentOverlap / 100;

			// step 3: create renderers and apply layout
			for (i = 0; i < layoutItems.length; i++) {
				item = layoutItems[i];
				var w, posX, ir, renderer;

				if (itemsType === "dataItems") {

					var lane = item.lane;
					var extent = item.extent;

					if (hOverlap === 0) {
						//no overlap and a padding between each event
						w = numLanes == 1 ? this.colW :
							((this.colW - (numLanes - 1) * this.horizontalGap) / numLanes);
						posX = lane * (w + this.horizontalGap);
						w = extent == 1 ? w : w * extent + (extent - 1) * this.horizontalGap;
						w = 100 * w / this.colW;
						posX = 100 * posX / this.colW;
					} else {
						// an overlap
						w = numLanes == 1 ? 100 : (100 / (numLanes - (numLanes - 1) * hOverlap));
						posX = lane * (w - hOverlap * w);
						w = extent == 1 ? w : w * ( extent - (extent - 1) * hOverlap);
					}

					ir = this._createRenderer(item, "vertical", this.verticalRenderer, "dojoxCalendarVertical");

					var edited = this.isItemBeingEdited(item);
					var selected = this.isSelected(item);
					var hovered = this.isItemHovered(item);
					var focused = this.isItemFocused(item);

					renderer = ir.renderer;

					renderer.hovered = hovered;
					renderer.selected = selected;
					renderer.edited = edited;
					renderer.focused = (this.showFocus ? focused : false);
					renderer.storeState = this.getItemStoreState(item);

					renderer.moveEnabled = this.isItemMoveEnabled(item._item, "vertical");
					renderer.resizeEnabled = this.isItemResizeEnabled(item._item, "vertical");

					this.applyRendererZIndex(item, ir, hovered, selected, edited, focused);
				} else {
					w = 100;
					posX = 0;
					ir = this.decorationRendererManager.createRenderer(item, "vertical",
						this.verticalDecorationRenderer, "dojoxCalendarDecoration");
					renderer = ir.renderer;
				}

				domStyle.set(ir.container, {
					"top": item.start + "px",
					"left": posX + "%",
					"width": w + "%",
					"height": (item.end - item.start + 1) + "px"
				});

				renderer.w = w;
				renderer.h = item.end - item.start + 1;

				renderer.deliver();

				domConstruct.place(ir.container, cell);
				domStyle.set(ir.container, "display", "block");
			}
		},

		_sortItemsFunction: function (a, b) {
			// tags:
			//		private

			var res = this.dateModule.compare(a.startTime, b.startTime);
			if (res == 0) {
				res = -1 * this.dateModule.compare(a.endTime, b.endTime);
			}
			return this.effectiveDir === "ltr" ? res : -res;
		},

		///////////////////////////////////////////////////////////////
		//
		// View to time projection
		//
		///////////////////////////////////////////////////////////////

		_getNormalizedCoords: function (e, x, y, touchIndex) {
			if (e != null) {
				var refPos = domGeometry.position(this.itemContainer, true);

				if (e.touches) {
					touchIndex = touchIndex == undefined ? 0 : touchIndex;

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

			return {x: x, y: y};
		},

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

			var o = this._getNormalizedCoords(e, x, y, touchIndex);
			var t = this.getTimeOfDay(o.y, this);
			var colW = domGeometry.getMarginBox(this.itemContainer).w / this.columnCount;
			var col = Math.floor(o.x / colW);

			var date = null;
			if (col < this.dates.length) {
				date = this.newDate(this.dates[col]);
				date = this.floorToDay(date, true);
				date.setHours(t.hours);
				date.setMinutes(t.minutes);
			}

			return date;
		},

		getSubColumn: function (e, x, y, touchIndex) {
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

			if (this.subColumns == null || this.subColumns.length == 1) {
				return null;
			}
			var o = this._getNormalizedCoords(e, x, y, touchIndex);
			var colW = domGeometry.getMarginBox(this.itemContainer).w / this.columnCount;
			var col = Math.floor(o.x / colW);
			var idx = Math.floor((o.x - col * colW) / (colW / this.subColumnCount));
			return this.subColumns[idx];
		},

		///////////////////////////////////////////////////////////////
		//
		// Events
		//
		///////////////////////////////////////////////////////////////

		_onGridMouseUp: register.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);

				if (this._gridMouseDown) {
					this._gridMouseDown = false;

					this._onGridClick({
						date: this.getTime(e),
						triggerEvent: e
					});
				}
			};
		}),

		_onGridTouchStart: register.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);


				var g = this._gridProps;

				g.moved = false;
				g.start = e.touches[0].screenY;
				g.scrollTop = this._getScrollPosition();
			};
		}),

		_onGridTouchMove: register.superCall(function (sup) {
			return function (e) {
				sup.apply(this, arguments);

				if (e.touches.length > 1 && !this._isEditing) {
					event.stop(e);
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
						var max = this.itemContainer.offsetHeight - this.scrollContainer.offsetHeight;
						if (value < 0) {
							this._gridProps.start = e.touches[0].screenY;
							this._setScrollImpl(0);
							this._gridProps.scrollTop = 0;
						} else if (value > max) {
							this._gridProps.start = e.touches[0].screenY;
							this._setScrollImpl(max);
							this._gridProps.scrollTop = max;
						} else {
							this._setScrollImpl(value);
						}
					}
				}
			};
		}),

		_onGridTouchEnd: register.superCall(function (sup) {
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

									this._onGridDoubleClick({
										date: this.getTime(this._gridProps.event),
										triggerEvent: this._gridProps.event
									});

									clearTimeout(this._pendingDoubleTap.timer);

									delete this._pendingDoubleTap;

								} else {

									this._onGridClick({
										date: this.getTime(this._gridProps.event),
										triggerEvent: this._gridProps.event
									});

									this._pendingDoubleTap = {
										grid: true,
										timer: setTimeout(lang.hitch(this, function () {
											delete this._pendingDoubleTap;
										}), this.doubleTapDelay)
									};
								}
							}
						}
					}

					this._gridProps = null;
				}
			};
		}),

		_onColumnHeaderClick: function (e) {
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onColumnHeaderClick");
		},


		onColumnHeaderClick: function (e) {
			// summary:
			//		Event dispatched when a column header cell is dispatched.
			// e: __ColumnClickEventArgs
			//		The event has the following properties
			// tags:
			//		callback
		},


		getTimeOfDay: function (pos) {
			// summary:
			//		Return the time of day associated to the specified position.
			// pos: Integer
			//		The position in pixels.

			var minH = this.minHours * 60;
			var maxH = this.maxHours * 60;
			var minutes = minH + (pos * (maxH - minH) / this.sheetHeight);
			return {
				hours: Math.floor(minutes / 60),
				minutes: Math.floor(minutes % 60)
			};
		},

		///////////////////////////////////////////////////////////////
		//
		// View limits
		//
		///////////////////////////////////////////////////////////////

		_isItemInView: register.superCall(function (sup) {
			return function (item) {

				// subclassed to add some tests

				var res = sup.apply(this, arguments);

				if (res) {

					// test if time range is overlapping [maxHours, next day min hours]
					var len = this.dateModule.difference(item.startTime, item.endTime, "millisecond");
					var vLen = (24 - this.maxHours + this.minHours) * 3600000; // 60 * 60 * 1000, num milliseconds in 1 minute

					if (len > vLen) { // longer events are always visible
						return true;
					}

					var sMin = item.startTime.getHours() * 60 + item.startTime.getMinutes();
					var eMin = item.endTime.getHours() * 60 + item.endTime.getMinutes();
					var sV = this.minHours * 60;
					var eV = this.maxHours * 60;

					if (sMin > 0 && sMin < sV || sMin > eV && sMin <= 1440) {
						return false;
					}

					if (eMin > 0 && eMin < sV || eMin > eV && eMin <= 1440) {
						return false;
					}
				}
				return res;
			};
		}),

		_ensureItemInView: register.superCall(function (sup) {
			return function (item) {
				var fixed;

				var startTime = item.startTime;
				var endTime = item.endTime;

				// test if time range is overlapping [maxHours, next day min hours]
				var cal = this.dateModule;

				var len = Math.abs(cal.difference(item.startTime, item.endTime, "millisecond"));
				var vLen = (24 - this.maxHours + this.minHours) * 3600000;

				if (len > vLen) { // longer events are always visible
					return false;
				}

				var sMin = startTime.getHours() * 60 + startTime.getMinutes();
				var eMin = endTime.getHours() * 60 + endTime.getMinutes();
				var sV = this.minHours * 60;
				var eV = this.maxHours * 60;

				if (sMin > 0 && sMin < sV) {
					this.floorToDay(item.startTime, true);
					item.startTime.setHours(this.minHours);
					item.endTime = cal.add(item.startTime, "millisecond", len);
					fixed = true;
				} else if (sMin > eV && sMin <= 1440) {
					// go on next visible time
					this.floorToDay(item.startTime, true);
					item.startTime = cal.add(item.startTime, "day", 1);
					// if we are going out of the view, the super() will fix it
					item.startTime.setHours(this.minHours);
					item.endTime = cal.add(item.startTime, "millisecond", len);
					fixed = true;
				}

				if (eMin > 0 && eMin < sV) {
					// go on previous day
					this.floorToDay(item.endTime, true);
					item.endTime = cal.add(item.endTime, "day", -1);
					item.endTime.setHours(this.maxHours);
					item.startTime = cal.add(item.endTime, "millisecond", -len);
					fixed = true;
				} else if (eMin > eV && eMin <= 1440) {
					this.floorToDay(item.endTime, true);
					item.endTime.setHours(this.maxHours);
					item.startTime = cal.add(item.endTime, "millisecond", -len);
					fixed = true;
				}

				fixed = fixed || sup.apply(this, arguments);

				return fixed;
			};
		}),

		_onScrollTimer_tick: function () {
			// tags:
			//		private

			this._scrollToPosition(this._getScrollPosition() + this._scrollProps.scrollStep);
		},

		////////////////////////////////////////////
		//
		// Editing
		//
		///////////////////////////////////////////

		snapUnit: "minute",
		snapSteps: 15,
		minDurationUnit: "minute",
		minDurationSteps: 15,
		liveLayout: false,
		stayInView: true,
		allowStartEndSwap: true,
		allowResizeLessThan24H: true
	});
});
