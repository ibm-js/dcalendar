define([
	"dcl/dcl",
	"./ViewBase",
	"delite/handlebars!./templates/ColumnView.html",
	"delite/register",
	"delite/Scrollable",
	"dojo/_base/event",
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
	"./metrics",
	"delite/theme!./themes/{{theme}}/ColumnView.css",
	"delite/theme!./themes/{{theme}}/ColumnView_rtl.css"
], function (
	dcl,
	ViewBase,
	template,
	register,
	Scrollable,
	event,
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

	return register("d-calendar-simple-column", [HTMLElement, ViewBase, Scrollable], {
		// summary:
		//		The simple column view is displaying a day per column. Each cell of a column is a time slot.

		baseClass: "d-calendar-column-view",

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

		// verticalRenderer: Class
		//		The class use to create vertical renderers.
		verticalRenderer: null,

		// verticalDecorationRenderer: Class
		//		The class use to create decoration renderers.
		verticalDecorationRenderer: null,

		// percentOverlap: Integer
		//		The percentage of the renderer width used to superimpose one item renderer on another
		//		when two events are overlapping.
		percentOverlap: 70,

		// horizontalGap: Integer
		//		The number of pixels between two item renderers that are overlapping each other
		//		if the percentOverlap property is 0.
		horizontalGap: 4,

		_showSecondarySheet: false,

		// Computed properties, mostly formerly in renderData
		hourCount: -1,
		slotSize: -1,

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

			if ("startDate" in oldVals || "columnCount" in oldVals || "source" in oldVals) {
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

				if (this.source) {
					this.query = new this.source.Filter().lte("startTime", this.endTime).gte("endTime", this.startTime);
				}

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

		_getFirstVisibleTimeOfDay: function () {
			// summary:
			//		Returns the first visible time of day.
			// tags:
			//		protected
			// returns: Object

			var v = (this.maxHours - this.minHours) *
				this.getCurrentScroll().y / this.sheetHeight;

			return {
				hours: this.minHours + Math.floor(v),
				minutes: (v - Math.floor(v)) * 60
			};
		},

		_getLastVisibleTimeOfDay: function () {
			// summary:
			//		Returns the last visible time of day.
			// tags:
			//		protected
			// returns: Integer[]

			var v = (this.maxHours - this.minHours) *
				(this.scrollableNode.scrollTop + this.scrollableNode.offsetHeight) / this.sheetHeight;

			return {
				hours: this.minHours + Math.floor(v),
				minutes: (v - Math.floor(v)) * 60
			};
		},

		// startTimeOfDay: Object
		//		First time (hour/minute) of day displayed.
		//		An object containing "hours" and "minutes" properties.
		startTimeOfDay: 0,

		refreshRendering: function (oldVals) {
			if ("startTimeOfDay" in oldVals) {
				var value = this.startTimeOfDay;
				this._setStartTimeOfDay(value.hours, value.minutes, value.duration, value.easing);
			}
		},

		_setStartTimeOfDay: function (hour, minutes, duration) {
			// summary:
			//		Scrolls the view to show the specified first time of day.
			// hour: Integer
			//		The hour of the start time of day.
			// minutes: Integer
			//		The minutes part of the start time of day.
			// duration: Integer
			//		The max duration of the scroll animation.
			// tags:
			//		protected

			hour = hour || this.minHours;
			minutes = minutes || 0;
			duration = duration || 0;

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
			pos = Math.min(this.sheetHeight - this.scrollableNode.offsetHeight, pos);

			this.scrollTo({y: pos}, duration);
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

				var vs = this._getFirstVisibleTimeOfDay();
				var ve = this._getLastVisibleTimeOfDay();

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
			var t = this._getFirstVisibleTimeOfDay();
			t = t.hours * 60 + t.minutes + (dir * this.timeSlotDuration);
			this._setStartTimeOfDay(Math.floor(t / 60), t % 60);
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

			domStyle.set(this.sheetContainer, "height", this.sheetHeight + "px");

			// TODO: only call these methods when necessary
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

			domClass.toggle(this, "sub-columns", this.subColumns);
			domClass.toggle(this, "secondary-sheet", this._showSecondarySheet);
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
			//		Do scrollbar related adjustments.
			// tags:
			//		protected

			// Compensate for scrollbar on main grid, so that column headers align with main grid columns
			this.header.style[this.effectiveDir == "ltr" ? "marginRight" : "marginLeft"] =
				metrics.getScrollbar().w + "px";
		},

		resize: function () {
		},

		_columnHeaderClick: function (e) {
			e.stopPropagation();
			var index = e.currentTarget.index;
			this.emit("column-header-click", {
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

			var row = this.columnHeader;
			if (!row) {
				return;
			}

			// Adjust number of cells to equal this.columnCount.
			for (var i = row.childNodes.length; i < this.columnCount; i++) {
				var div = this.ownerDocument.createElement("div");
				row.appendChild(div);
				on(div, "click", this._columnHeaderClick.bind(this));
			}
			for (i = row.childNodes.length; i > this.columnCount; i--) {
				row.removeChild(row.lastChild);
			}

			// fill & configure
			Array.prototype.forEach.call(row.children, function (td, i) {
				td.className = "";
				td.index = i;
				var d = this.dates[i];
				this._setText(td, this._formatColumnHeaderLabel(d));
				this.styleColumnHeaderCell(td, d);
			}, this);

			if (this.yearColumnHeader) {
				var d = this.dates[0];
				this.yearColumnHeader.textContent = this.dateLocaleModule.format(d,
					{selector: "date", datePattern: "yyyy"});
			}
		},

		styleColumnHeaderCell: function (node, date) {
			// summary:
			//		Styles the CSS classes to the node that displays a column header cell.
			//		By default this method is setting:
			//		- "d-calendar-today" class name if the date displayed is the current date,
			//		- "d-calendar-weekend" if the date represents a weekend,
			//		- the CSS class corresponding of the displayed day of week ("Sun", "Mon" and so on).
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// tags:
			//		protected

			domClass.add(node, this._cssDays[date.getDay()]);

			if (this.isToday(date)) {
				domClass.add(node, "d-calendar-today");
			} else if (this.isWeekEnd(date)) {
				domClass.add(node, "d-calendar-weekend");
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

			var tr = table.rows[0] || table.insertRow();

			// Adjust number of cells to equal this.columnCount.
			var i;
			for (i = tr.children.length; i < this.columnCount; i++) {
				var td = tr.insertCell();
				domConstruct.create("div", {"className": "d-calendar-sub-header-container"}, td);
			}
			for (i = tr.children.length; i > this.columnCount; i--) {
				tr.removeChild(tr.lastChild);
			}

			// fill & configure
			var subCount = this.subColumnCount;
			Array.prototype.forEach.call(tr.children, function (td, i) {
				td.className = "";
				var div = td.firstChild;

				// Adjust the number of child <div>'s to match subCount.
				for (i = div.children.length; i < subCount; i++) {
					domConstruct.create("div", {
						"className": "d-calendar-sub-header-cell d-calendar-sub-header-label"
					}, div);
				}
				for (i = div.children.length; i > subCount; i--) {
					div.removeChild(div.lastChild);
				}

				var colW = (100 / subCount) + "%";
				Array.prototype.forEach.call(div.children, function (div, i) {
					div.className = "d-calendar-sub-header-cell d-calendar-sub-header-label";
					var col = subCount == 1 ? i : Math.floor(i / subCount);
					var subColIdx = subCount == 1 ? 0 : i - col * subCount;
					domStyle.set(div, {width: colW, left: ((subColIdx * 100) / subCount) + "%"});
					domClass.toggle(div, "subColumn", subColIdx < subCount - 1 && subCount !== 1);
					domClass.add(div, this.subColumns[subColIdx]);
					this._setText(div, this.subColumnLabel(this.subColumns[subColIdx]));
				}, this);

				var d = this.dates[i];
				this.styleSubColumnHeaderCell(td, d);
			}, this);
		},


		subColumnLabel: function (value) {
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
				domClass.add(node, "d-calendar-today");
			} else if (this.isWeekEnd(date)) {
				domClass.add(node, "d-calendar-weekend");
			}
		},

		_addMinutesClasses: function (node, minutes) {
			switch (minutes) {
			case 0:
				domClass.add(node, "hour");
				break;
			case 30:
				domClass.add(node, "half-hour");
				break;
			case 15:
			case 45:
				domClass.add(node, "quarter-hour");
				break;
			}
		},

		_buildRowHeader: function () {
			// summary:
			//		Creates incrementally the HTML structure of the row header and configures its content.
			// tags:
			//		private
			
			var parent = this.rowHeader;

			// Adjust number of rows to match nbRows.
			var nbRows = Math.floor(60 / this.rowHeaderGridSlotDuration) * this.hourCount;
			var i;
			for (i = parent.childNodes.length; i < nbRows; i++) {
				var div = this.ownerDocument.createElement("div");
				parent.appendChild(div);
			}
			for (i = parent.childNodes.length; i > nbRows; i--) {
				parent.removeChild(parent.lasElementChild);
			}

			// fill labels
			var size = Math.ceil(this.hourSize / (60 / this.rowHeaderGridSlotDuration));
			var d = new Date(2000, 0, 1, 0, 0, 0);

			Array.prototype.forEach.call(parent.childNodes, function (child, i) {
				child.className = "d-calendar-row-header-label";

				var h = this.minHours + (i * this.rowHeaderGridSlotDuration) / 60;
				var m = (i * this.rowHeaderGridSlotDuration) % 60;

				this.styleRowHeaderCell(child, h, m);

				this._addMinutesClasses(child, m);
			}, this);

			size = Math.ceil(this.hourSize / (60 / this.rowHeaderLabelSlotDuration));

			Array.prototype.forEach.call(parent.childNodes, function (div, i) {
				d.setHours(0);
				d.setMinutes(this.minHours * 60 + (i * this.rowHeaderLabelSlotDuration));
				this._configureRowHeaderLabel(div, d, i, size * i);
			}, this);

			// The year label in upper left must have the same width as the row header.
			domGeometry.setMarginBox(this.yearColumnHeader, {w: domGeometry.getMarginBox(this.rowHeader).w});
		},

		_configureRowHeaderLabel: function (node, d, index /*=====, pos =====*/) {
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

			node.textContent = this._formatRowHeaderLabel(d);
			var h = this.minHours + (index * this.rowHeaderLabelSlotDuration) / 60;
			var m = (index * this.rowHeaderLabelSlotDuration) % 60;
			domClass.remove(node, ["hour", "half-hour", "quarter-hour"]);
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


			// Adjust the number of time slots to match nbRows.
			var i;
			var nbRows = Math.floor(60 / this.timeSlotDuration) * this.hourCount;
			for (i = table.rows.length; i < nbRows; i++) {
				table.insertRow();
			}
			for (i = table.rows.length; i > nbRows; i--) {
				table.removeRow(i - 1);
			}

			// Likewise, add or remove <td> for each <tr>.
			Array.prototype.forEach.call(table.rows, function (tr) {
				for (i = tr.children.length; i < this.columnCount; i++) {
					tr.insertCell();
				}
				for (i = tr.children.length; i > this.columnCount; i--) {
					tr.removeChild(tr.lastChild);
				}
			}, this);

			// Set the CSS classes
			Array.prototype.forEach.call(table.rows, function (tr, idx) {
				domStyle.set(tr, "height", this.slotSize + "px");

				// the minutes part of the time of day displayed by the current tr
				var m = (idx * this.timeSlotDuration) % 60;
				var h = this.minHours + Math.floor((idx * this.timeSlotDuration) / 60);
				Array.prototype.forEach.call(tr.children, function (td, col) {
					td.className = "";
					this.styleGridCell(td, this.dates[col], h, m);
					this._addMinutesClasses(td, m);
				}, this);
			}, this);
		},

		styleGridCell: function (node, date, hours, minutes) {
			// summary:
			//		Styles the CSS classes to the node that displays a cell.
			//		By default this method is setting:
			//		- "d-calendar-today" class name if the date displayed is the current date,
			//		- "d-calendar-weekend" if the date represents a weekend,
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
				return domClass.add(node, "d-calendar-today");
			} else if (this.isWeekEnd(date)) {
				return domClass.add(node, "d-calendar-weekend");
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

			var tr = table.rows[0] || table.insertRow();


			domStyle.set(table, "height", this.sheetHeight + "px");


			// Adjust number of cells to equal this.columnCount.
			var i;
			for (i = tr.children.length; i < this.columnCount; i++) {
				var td = tr.insertCell();
				domConstruct.create("div", {"className": "d-calendar-container-column"}, td);
			}
			for (i = tr.children.length; i > this.columnCount; i--) {
				tr.removeChild(tr.lastChild);
			}

			var subCount = this.subColumnCount;
			Array.prototype.forEach.call(tr.children, function (td) {
				var div = td.firstChild;
				domStyle.set(div, "height", this.sheetHeight + "px");

				// Adjust the number of div.d-calendar-sub-container-column to equal subCount.
				for (i = div.children.length; i < subCount; i++) {
					var subdiv = domConstruct.create("div",
						{"className": "d-calendar-sub-container-column"}, div);
					domConstruct.create("div",
						{"className": "d-calendar-decoration-container-column"}, subdiv);
					domConstruct.create("div",
						{"className": "d-calendar-event-container-column"}, subdiv);
				}
				for (i = div.children.length; i > subCount; i--) {
					div.removeChild(div.lastChild);
				}

				var colW = (100 / subCount) + "%";
				Array.prototype.forEach.call(div.children, function (div, i) {
					var col = subCount == 1 ? i : Math.floor(i / subCount);
					var subColIdx = subCount == 1 ? 0 : i - col * subCount;
					domStyle.set(div, {width: colW, left: ((subColIdx * 100) / subCount) + "%"});
					domClass.toggle(div, "sub-column", subColIdx < subCount - 1 && subCount !== 1);
				}, this);
			}, this);

			this.cells = tr.querySelectorAll(".d-calendar-event-container-column");
			this.decorationCells = tr.querySelectorAll(".d-calendar-decoration-container-column");
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
							{"className": "d-calendar-time-indicator"});
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
							this._timeIndicatorTimer = setInterval(this._layoutTimeIndicator.bind(this),
								this.timeIndicatorRefreshInterval);
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

		_defaultItemToRendererKindFunc: function (/*===== item =====*/) {
			// tags:
			//		extension

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
					subCols.forEach(function (subCol) {
						subColumnItems[subCol] = [];
					});
					items.forEach(function (item) {
						if (itemsType === "decorationItems") {
							if (item.subColumn) {
								if (subColumnItems[item.subColumn]) {
									subColumnItems[item.subColumn].push(item);
								}
							} else { // for decorations, if no sub column is set, apply to all sub columns
								subCols.forEach(function (subCol) {
									var clonedItem = {};
									dcl.mix(clonedItem, item);
									clonedItem.subColumn = subCol;
									subColumnItems[subCol].push(clonedItem);
								});
							}
						} else if (item.subColumn && subColumnItems[item.subColumn]) {
							subColumnItems[item.subColumn].push(item);
						}
					});
					var subColIndex = 0;
					this.subColumns.forEach(function (subCol) {
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
					var litem = {
						start: top,
						end: bottom,
						range: overlap,
						item: item
					};
					dcl.mix(litem, item);
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
						w = extent == 1 ? w : w * (extent - (extent - 1) * hOverlap);
					}

					ir = this._createRenderer(item, "vertical", this.verticalRenderer, "d-calendar-vertical");

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
						this.verticalDecorationRenderer, "d-calendar-decoration");
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

		_getNormalizedCoords: function (e, x, y, touchIndex) {
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

					this.emit("grid-click", {
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
										timer: setTimeout(function () {
											delete this._pendingDoubleTap;
										}.bind(this), this.doubleTapDelay)
									};
								}
							}
						}
					}

					this._gridProps = null;
				}
			};
		}),

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
					var vLen = (24 - this.maxHours + this.minHours) * 3600000; // 60 * 60 * 1000, num ms in 1 minute

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
