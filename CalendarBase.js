define([
	"dcl/dcl",
	"dojo/_base/lang",
	"dojo/cldr/supplemental",
	"dojo/date",
	"dojo/date/locale",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"delite/Widget",
	"./StoreMixin",
	"./time",
	"dojo/i18n!./nls/buttons"
], function (
	dcl,
	lang,
	cldr,
	date,
	locale,
	domClass,
	domStyle,
	domConstruct,
	domGeometry,
	Widget,
	StoreMixin,
	timeUtil,
	_nls
) {
	/*=====
	var __HeaderClickEventArgs = {
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

	/*=====
	var __TimeIntervalChangeArgs = {
		// summary:
		//		An time interval change event, dispatched when the calendar displayed time range has changed.
		// oldStartTime: Date
		//		The start of the previously displayed time interval, if any.
		// startTime: Date
		//		The new start of the displayed time interval.
		// oldEndTime: Date
		//		The end of the previously displayed time interval, if any.
		// endTime: Date
		//		The new end of the displayed time interval.
	};
	=====*/

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
		//		The render item that is being edited. Set/get the startTime and/or endTime properties to customize
		//		editing behavior.
		// storeItem: Object
		//		The real data from the store. DO NOT change properties, but you may use properties of this item in the
		//		editing behavior logic.
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
		//		A renderer lifecycle event.
		// renderer: Object
		//		The renderer.
		// source: dcalendar/ViewBase
		//		The view where the event occurred.
		// item:Object?
		//		The item that will be displayed by the renderer for the "rendererCreated" and "rendererReused" events.
	};
	=====*/

	/*=====
	var __ExpandRendererClickEventArgs = {
		// summary:
		//		A expand renderer click event.
		// columnIndex: Integer
		//		The column index of the cell.
		// rowIndex: Integer
		//		The row index of the cell.
		// date: Date
		//		The date displayed by the cell.
		// triggerEvent: Event
		//		The origin event.
	};
	=====*/

	return dcl([Widget, StoreMixin], {

		// summary:
		//		This class defines a generic calendar widget that manages several views to display event in time.

		baseClass: "dojoxCalendar",

		// datePackage: Object
		//		JavaScript namespace to find Calendar routines.
		//		Uses Gregorian Calendar routines at dojo.date by default.
		datePackage: date,

		// startDate: Date
		//		The start date of the displayed time interval.
		startDate: null,

		// endDate: Date
		//		The end date of the displayed time interval (included).
		endDate: null,

		// date: Date
		//		The reference date used to determine along with the <code>dateInterval</code>
		//		and <code>dateIntervalSteps</code> properties the time interval to display.
		date: null,

		// minDate: Date
		//		The minimum date.
		//		If date property is set, the displayed time interval the most in the past
		//		will the time interval containing this date.
		//		If startDate property is set, this mininum value of startDate.
		minDate: null,

		// maxDate: Date
		//		The maximum date.
		//		If date is set, the displayed time interval the most in the future
		//		will the time interval containing this date.
		//		If endDate property is set, this mininum value of endDate.
		maxDate: null,

		// dateInterval:String
		//		The date interval used to compute along with the <code>date</code> and
		//		<code>dateIntervalSteps</code> the time interval to display.
		//		Valid values are "day", "week" (default value) and "month".
		dateInterval: "week",

		// dateIntervalSteps:Integer
		//		The number of date intervals used to compute along with the <code>date</code> and
		//		<code>dateInterval</code> the time interval to display.
		//		Default value is 1.
		dateIntervalSteps: 1,

		// viewContainer: HTMLElement
		//		The DOM node that will contains the views.
		viewContainer: null,

		// firstDayOfWeek: Integer
		//		(Optional) The first day of week override. By default the first day of week is determined
		//		for the current locale (extracted from the CLDR).
		//		Special value -1 (default value), means use locale dependent value.
		firstDayOfWeek: -1,

		// formatItemTimeFunc: Function?
		//		Optional function to format the time of day of the item renderers.
		//		The function takes the date, the render data object, the view and
		//		the data item as arguments and returns a String.
		formatItemTimeFunc: null,

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
		//		If <code>true</code>, the control supports resizing of items.
		resizeEnabled: true,

		// columnView: dcalendar/ColumnView
		//		The column view is displaying one day to seven days time intervals.
		columnView: null,

		// matrixView: dcalendar/MatrixView
		//		The column view is displaying time intervals that lasts more than seven days.
		matrixView: null,

		// columnViewProps: Object
		//		Map of property/value passed to the constructor of the column view.
		columnViewProps: null,

		// matrixViewProps: Object
		//		Map of property/value passed to the constructor of the matrix view.
		matrixViewProps: null,

		// createOnGridClick: Boolean
		//		Indicates whether the user can create new event by clicking and dragging the grid.
		//		A createItem function must be defined on the view or the calendar object.
		createOnGridClick: false,

		// createItemFunc: Function
		//		A user supplied function that creates a new event.
		//		This function is used when createOnGridClick is set to true
		//		and the user is clicking and dragging on the grid.
		//		This view takes two parameters:
		//
		//		- view: the current view,
		//		- d: the date at the clicked location.
		createItemFunc: null,

		// List of the properties in the calendar that should be reflected to the views,
		// not including properties to set time range.  Those are handled in _configureView().
		forwardProperties: [
			"store", "query", "queryOptions", "startTimeAttr", "endTimeAttr", "summaryAttr", "allDayAttr",
			"subColumnAttr", "decodeDate", "encodeDate", "itemToRenderItem", "renderItemToItem",
			"datePackage",
			"endDate", "date", "minDate", "maxDate", "dateInterval", "dateIntervalSteps",
			"firstDayOfWeek",
			"formatItemTimeFunc",
			"editable", "moveEnabled", "resizeEnabled",
			"createOnGridClick", "createItemFunc",
			"textDir", "decorationStore",
			"getIdentity"
		],

		// currentView: dcalendar/ViewBase
		//		The current view displayed by the Calendar object.
		//		The currentViewChange event can be used to react on a view change.
		currentView: null,

		_calendar: "gregorian",

		// Make nls strings available to template
		_nls: _nls,

		createdCallback: function (/*Object*/args) {
			this._set("views", []);

			args = args || {};
			this._calendar = args.datePackage ? args.datePackage.substr(args.datePackage.lastIndexOf(".") + 1) :
				this._calendar;
			this.dateModule = args.datePackage ? lang.getObject(args.datePackage, false) : date;
			this.dateClassObj = this.dateModule.Date || Date;
			this.dateLocaleModule = args.datePackage ? lang.getObject(args.datePackage + ".locale", false) : locale;
		},

		postRender: function () {
			if (this.views == null || this.views.length === 0) {
				this.views = this._createDefaultViews();
			}

			// TODO: two-way selection delegation?  But it's selecting renderers, not items themselves...
			// TODO: map view.editing upward
		},

		resize: function (changeSize) {
			if (changeSize) {
				domGeometry.setMarginBox(this, changeSize);
			}
			if (this.currentView) {
				// must not pass the size, children are sized depending on the parent by CSS.
				this.currentView.resize();
			}
		},

		computeProperties: function (props) {
			var cal = this.dateModule;
			var startDate = this.startDate;
			var endDate = this.endDate;
			var date = this.date;

			if (this.firstDayOfWeek < -1 || this.firstDayOfWeek > 6) {
				this.firstDayOfWeek = 0;
			}

			var minDate = this.minDate;
			var maxDate = this.maxDate;

			if (minDate && maxDate) {
				if (cal.compare(minDate, maxDate) > 0) {
					var t = minDate;
					this.minDate = maxDate;
					this.maxDate = t;
				}
			}

			if (date == null && (startDate != null || endDate != null)) {
				if (startDate == null) {
					this.startDate = startDate = new this.dateClassObj();
				}

				if (endDate == null) {
					this.endDate = endDate = new this.dateClassObj();
				}

				if (cal.compare(startDate, endDate) > 0) {
					this.endDate = endDate = cal.add(startDate, "day", 1);
				}
			} else {
				if (this.date == null) {
					this.date = new this.dateClassObj();
				}

				var dint = this.dateInterval;
				if (dint != "day" && dint != "week" && dint != "month") {
					this.dateInterval = "day";
				}

				var dis = this.dateIntervalSteps;
				if (lang.isString(dis)) {
					this.dateIntervalSteps = dis = parseInt(dis);
				}
				if (dis <= 0) {
					this.dateIntervalSteps = 1;
				}
			}

			if ("startDate" in props || "endDate" in props || "date" in props ||
				"dateInterval" in props) {

				var timeInterval = this.computeTimeInterval();

				if (this._timeInterval == null ||
					cal.compare(this._timeInterval[0], timeInterval[0]) !== 0 ||
					cal.compare(this._timeInterval[1], timeInterval[1]) !== 0) {

					this._timeInterval = timeInterval;

					if ("date" in props) {
						this._lastValidDate = this.date;
					} else if ("startDate" in props || "endDate" in props) {
						this._lastValidStartDate = this.startDate;
						this._lastValidEndDate = this.endDate;
					}

					this.onTimeIntervalChange({
						oldStartTime: this._timeInterval == null ? null : this._timeInterval[0],
						oldEndTime: this._timeInterval == null ? null : this._timeInterval[1],
						startTime: timeInterval[0],
						endTime: timeInterval[1]
					});
				} else {
					if ("date" in props) {
						if (this.lastValidDate != null) {
							this.date = this.lastValidDate;
						}
					} else if ("startDate" in props || "endDate" in props) {
						this.startDate = this._lastValidStartDate;
						this.endDate = this._lastValidEndDate;
					}
					return;		// I guess this triggers the method to run again
				}

				this._timeInterval = timeInterval;

				this._duration =
					this.dateModule.difference(this._timeInterval[0], this._timeInterval[1], "day");

				this.currentView = this._computeCurrentView();
			}
		},

		refreshRendering: function (props) {
			if (this.currentView) {
				// Reflect any property changes to the current view.  Or, if we just switched the current view,
				// then reflect all properties to the new view
				this.forwardProperties.forEach(function (prop) {
					if ("currentView" in props || (prop in props && this[prop] !== null && this[prop] !== undefined)) {
						var value = typeof prop === "function" ? this[prop].bind(this) : this[prop];
						this.currentView[prop] = value;
					}
				}, this);

				// Set time range for current view
				this._configureView();

				this.emit("view-configuration-change");
			}

			if ("currentView" in props && props.currentView !== this.currentView) {
				// View changed...
				var oldView = props.currentView,
					newView = this.currentView;

				if (oldView) {
					oldView.beforeDeactivate();
				}
				newView.beforeActivate();

				this._showView(oldView, newView);

				if (oldView) {
					oldView.afterDeactivate();
				}
				newView.afterActivate();
			}
		},

		_timeInterval: null,

		computeTimeInterval: function () {
			var d = this.date;
			var minDate = this.minDate;
			var maxDate = this.maxDate;
			var cal = this.dateModule;

			if (d == null) {
				var startDate = this.startDate;
				var endDate = cal.add(this.endDate, "day", 1);

				if (minDate != null || maxDate != null) {
					var dur = this.dateModule.difference(startDate, endDate, "day");
					if (cal.compare(minDate, startDate) > 0) {
						startDate = minDate;
						endDate = cal.add(startDate, "day", dur);
					}
					if (cal.compare(maxDate, endDate) < 0) {
						endDate = maxDate;
						startDate = cal.add(endDate, "day", -dur);
					}
					if (cal.compare(minDate, startDate) > 0) {
						startDate = minDate;
						endDate = maxDate;
					}
				}
				return [this.floorToDay(startDate), this.floorToDay(endDate)];
			} else {
				var interval = this._computeTimeIntervalImpl(d);

				if (minDate != null) {
					var minInterval = this._computeTimeIntervalImpl(minDate);
					if (cal.compare(minInterval[0], interval[0]) > 0) {
						interval = minInterval;
					}
				}

				if (maxDate != null) {
					var maxInterval = this._computeTimeIntervalImpl(maxDate);
					if (cal.compare(maxInterval[1], interval[1]) < 0) {
						interval = maxInterval;
					}
				}

				return interval;
			}
		},

		_computeTimeIntervalImpl: function (d) {
			// summary:
			//		Computes the displayed time interval according to the date, dateInterval and
			//		dateIntervalSteps if date is not null or startDate and endDate properties otherwise.
			// tags:
			//		protected

			var cal = this.dateModule;

			var s = this.floorToDay(d);
			var di = this.dateInterval;
			var dis = this.dateIntervalSteps;
			var e;

			switch (di) {
				case "day":
					e = cal.add(s, "day", dis);
					break;
				case "week":
					s = this.floorToWeek(s);
					e = cal.add(s, "week", dis);
					break;
				case "month":
					s.setDate(1);
					e = cal.add(s, "month", dis);
					break;
				default:
					e = cal.add(s, "day", 1);
			}
			return [s, e];
		},

		onTimeIntervalChange: function (e) {
			// summary:
			//		Event dispatched when the displayed time interval has changed.
			// e: __TimeIntervalChangeArgs
			//		The time interval change event.
			// tags:
			//		callback
		},

		/////////////////////////////////////////////////////
		//
		// View Management
		// TODO: Replace this all with ViewStack
		//
		/////////////////////////////////////////////////////

		// views: dcalendar/ViewBase[]
		//		The views displayed by the widget.
		//		To add/remove only one view, prefer, respectively, the addView() or removeView() methods.
		views: null,

		_setViewsAttr: function (views) {
			this._get("views").forEach(this._onViewRemoved, this);
			
			if (!views) {
				views = [];
			}

			views.forEach(this._onViewAdded, this);
			
			this._set("views", views.concat());
		},

		_createDefaultViews: function () {
			// summary:
			//		Creates the default views.
			//		This method does nothing and is designed to be overridden.
			// tags:
			//		protected
		},

		addView: function (view, index) {
			// summary:
			//		Add a view to the calendar's view list.
			// view: dcalendar/ViewBase
			//		The view to add to the calendar.
			// index: Integer
			//		Optional, the index where to insert the view in current view list.
			// tags:
			//		protected

			if (index <= 0 || index > this.views.length) {
				index = this.views.length;
			}
			this.views.splice(index, view);
			this._onViewAdded(view);
		},

		removeView: function (view, index) {
			// summary:
			//		Removes a view from the calendar's view list.
			// view: dcalendar/ViewBase
			//		The view to remove from the calendar.
			// tags:
			//		protected

			if (index < 0 || index >= this.views.length) {
				return;
			}

			this._onViewRemoved(this.views[index]);
			this.views.splice(index, 1);
		},

		_onViewAdded: function (view) {
			view.owner = this;
			view.buttonContainer = this.buttonContainer;
			view._calendar = this._calendar;
			view.datePackage = this.datePackage;
			view.dateModule = this.dateModule;
			view.dateClassObj = this.dateClassObj;
			view.dateLocaleModule = this.dateLocaleModule;
			domStyle.set(view, "display", "none");
			domClass.add(view, "view");
			domConstruct.place(view, this.viewContainer);
			this.onViewAdded(view);
		},

		onViewAdded: function (view) {
			// summary:
			//		Event dispatched when a view is added from the calendar.
			// view: dcalendar/ViewBase
			//		The view that has been added to the calendar.
			// tags:
			//		callback
		},

		_onViewRemoved: function (view) {
			view.owner = null;
			view.buttonContainer = null;
			domClass.remove(view, "view");
			this.viewContainer.removeChild(view);
			this.onViewRemoved(view);
		},

		onViewRemoved: function (/* view */) {
			// summary:
			//		Event dispatched when a view is removed from the calendar.
			// view: dcalendar/ViewBase
			//		The view that has been removed from the calendar.
			// tags:
			//		callback
		},

		onCurrentViewChange: function (e) {
			// summary:
			//		Event dispatched when the current view has changed.
			// e: Event
			//		Object that contains the oldView and newView properties.
			// tags:
			//		callback
		},

		_configureView: function () {
			// summary:
			//		Configures the current view to show the current time interval.
			//		This method is computing and setting the following properties:
			//		- "startDate", "columnCount" for a column view,
			//		- "startDate", "columnCount", "rowCount", "refStartTime" and "refEndTime" for a matrix view.
			//		This method can be extended to configure other properties like layout properties for example.
			// tags:
			//		protected

			var cal = this.dateModule,
				view = this.currentView,
				timeInterval = this._timeInterval,
				duration = this._duration;

			if (view.viewKind == "columns") {
				view.startDate = timeInterval[0];
				view.columnCount = duration;
			} else if (view.viewKind == "matrix") {
				if (duration > 7) { // show only full weeks.
					var s = this.floorToWeek(timeInterval[0]);
					var e = this.floorToWeek(timeInterval[1]);
					if (cal.compare(e, timeInterval[1]) !== 0) {
						e = this.dateModule.add(e, "week", 1);
					}
					duration = this.dateModule.difference(s, e, "day");	// TODO: ???
					view.startDate = s;
					view.columnCount = 7;
					view.rowCount = Math.ceil(duration / 7);
					view.refStartTime = timeInterval[0];
					view.refEndTime = timeInterval[1];
				} else {
					view.startDate = timeInterval[0];
					view.columnCount = duration;
					view.rowCount = 1;
					view.refStartTime = null;
					view.refEndTime = null;
				}
			}
		},

		_computeCurrentView: function () {
			// summary:
			//		If the time range is lasting less than seven days
			//		returns the column view or the matrix view otherwise.
			// tags:
			//		protected

			return this._duration <= 7 ? this.columnView : this.matrixView;
		},

		matrixViewRowHeaderClick: function (e) {
			// summary:
			//		Function called when the cell of a row header of the matrix view is clicked.
			//		The implementation is doing the following actions:
			//		- If another row is already expanded, collapse it and then expand the clicked row.
			//		- If the clicked row is already expadned, collapse it.
			//		- If no row is expanded, expand the click row.
			// e: Object
			//		The row header click event.
			// tags:
			//		protected

			var expIndex = this.matrixView.getExpandedRowIndex();
			if (expIndex == e.index) {
				this.matrixView.collapseRow();
			} else if (expIndex == -1) {
				this.matrixView.expandRow(e.index);
			} else {
				var h = this.matrixView.on("expandAnimationEnd", lang.hitch(this, function () {
					h.remove();
					this.matrixView.expandRow(e.index);
				}));
				this.matrixView.collapseRow();
			}
		},

		columnViewColumnHeaderClick: function (e) {
			// summary:
			//		Function called when the cell of a column header of the column view is clicked.
			//		Show the time range defined by the clicked date.
			// e: Object
			//		The column header click event.
			// tags:
			//		protected

			var cal = this.dateModule;
			if (cal.compare(e.date, this._timeInterval[0]) == 0 && this.dateInterval == "day"
					&& this.dateIntervalSteps == 1) {
				this.dateInterval = "week";
			} else {
				this.date = e.date;
				this.dateInterval = "day";
				this.dateIntervalSteps = 1;
			}
		},

		// viewFadeDuration: Integer
		//		The duration in milliseconds of the fade animation when the current view is changing.
		viewChangeDuration: 0,

		_showView: function (oldView, newView) {
			// summary:
			//		Displays the current view.
			// oldView: dcalendar/ViewBase
			//		The previously displayed view or null.
			// newView: dcalendar/ViewBase
			//		The view to display.
			// tags:
			//		protected

			if (oldView != null) {
				domStyle.set(oldView, "display", "none");
			}
			if (newView != null) {
				domStyle.set(newView, "display", "block");
				newView.resize();
				domStyle.set(newView, "opacity", "1");
			}
		},


		/////////////////////////////////////////////////////
		//
		// Time utilities
		//
		////////////////////////////////////////////////////

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

		floorToWeek: function (d) {
			// summary:
			//		Floors the specified date to the beginning of week.
			// date: Date
			//		Date to floor.
			return timeUtil.floorToWeek(d, this.dateClassObj, this.dateModule, this.firstDayOfWeek, this.locale);
		},

		newDate: function (obj) {
			// summary:
			//		Creates a new Date object.
			// obj: Object
			//		This object can have several values:
			//		- the time in milliseconds since gregorian epoch.
			//		- a Date instance
			// returns: Date
			return timeUtil.newDate(obj, this.dateClassObj);
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
			return timeUtil.floor(date, unit, steps, reuse, this.classFuncObj);
		},

		nextRange: function () {
			this._navigate(1);
		},

		previousRange: function () {
			this._navigate(-1);
		},

		_navigate: function (dir) {
			// tags:
			//		private

			var d = this.date;
			var cal = this.dateModule;

			if (d == null) {
				var s = this.startDate;
				var e = this.endDate;
				var dur = cal.difference(s, e, "day");
				if (dir == 1) {
					e = cal.add(e, "day", 1);
					this.startDate = e;
					this.endDate = cal.add(e, "day", dur);
				} else {
					s = cal.add(s, "day", -1);
					this.startDate = cal.add(s, "day", -dur);
					this.endDate = s;
				}
			} else {
				var di = this.dateInterval;
				var dis = this.dateIntervalSteps;
				this.date = cal.add(d, di, dir * dis);
			}
		},

		goToday: function () {
			// summary:
			//		Changes the displayed time interval to show the current day.
			//		Sets the date property to the current day, the dateInterval property to "day" and
			//		the "dateIntervalSteps" to 1.
			this.date = this.floorToDay(new this.dateClassObj(), true);
			this.dateInterval = "day";
			this.dateIntervalSteps = 1;
		},

		////////////////////////////////////////////////////
		//
		// Buttons
		//
		////////////////////////////////////////////////////

		todayButtonClick: function () {
			// summary:
			//		The action triggered when the today button is clicked.
			//		By default, calls the goToday() method.

			this.goToday();
		},

		dayButtonClick: function () {
			// summary:
			//		The action triggerred when the day button is clicked.
			//		By default, sets the dateInterval property to "day" and
			//		the "dateIntervalSteps" to 1.

			if (this.date == null) {
				this.date = this.floorToDay(new this.dateClassObj(), true);
			}
			this.dateInterval = "day";
			this.dateIntervalSteps = 1;
		},

		weekButtonClick: function () {
			// summary:
			//		The action triggered when the week button is clicked.
			//		By default, sets the dateInterval property to "week" and
			//		the "dateIntervalSteps" to 1.

			this.dateInterval = "week";
			this.dateIntervalSteps = 1;
		},

		fourDaysButtonClick: function () {
			// summary:
			//		The action triggerred when the 4 days button is clicked.
			//		By default, sets the dateInterval property to "day" and
			//		the "dateIntervalSteps" to 4.

			this.dateInterval = "day";
			this.dateIntervalSteps = 4;
		},

		monthButtonClick: function () {
			// summary:
			//		The action triggered when the month button is clicked.
			//		By default, sets the dateInterval property to "month" and
			//		the "dateIntervalSteps" to 1.

			this.dateInterval = "month";
			this.dateIntervalSteps = 1;
		},

		/////////////////////////////////////////////////////
		//
		// States item
		//
		////////////////////////////////////////////////////

		updateRenderers: function (obj, stateOnly) {
			if (this.currentView) {
				this.currentView.updateRenderers(obj, stateOnly);
			}
		},

		getIdentity: function (item) {
			return item ? item.id : null;
		},

		_setHoveredItem: function (item, renderer) {
			if (this.hoveredItem && item && this.hoveredItem.id != item.id ||
				item == null || this.hoveredItem == null) {
				var old = this.hoveredItem;
				this.hoveredItem = item;

				this.updateRenderers([old, this.hoveredItem], true);

				if (item && renderer) {
					this.currentView._updateEditingCapabilities(item._item ? item._item : item, renderer);
				}
			}
		},

		// hoveredItem: Object
		//		Current render item which is under the mouse cursor.
		hoveredItem: null,

		isItemHovered: function (item) {
			// summary:
			//		Returns whether the specified item is hovered or not.
			// item: Object
			//		The item.
			// returns: Boolean
			return this.hoveredItem != null && this.hoveredItem.id == item.id;
		},

		////////////////////////////////////////////////////////////////////////
		//
		// Editing
		//
		////////////////////////////////////////////////////////////////////////

		isItemEditable: function (item, rendererKind) {
			// summary:
			//		Computes whether particular item renderer can be edited.
			//		By default it is using the editable property value.
			// item: Object
			//		The data item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean

			return this.editable;
		},

		isItemMoveEnabled: function (item, rendererKind) {
			// summary:
			//		Computes whether particular item renderer can be moved.
			//		By default it is using the moveEnabled property value.
			// item: Object
			//		The data item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean

			return this.isItemEditable(item, rendererKind) && this.moveEnabled;
		},

		isItemResizeEnabled: function (item, rendererKind) {
			// summary:
			//		Computes whether particular item renderer can be resized.
			//		By default it is using the resizedEnabled property value.
			// item: Object
			//		The data item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean

			return this.isItemEditable(item, rendererKind) && this.resizeEnabled;
		},


		////////////////////////////////////////////////////////////////////////
		//
		// Widget events
		//
		////////////////////////////////////////////////////////////////////////

		onGridClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when the grid has been clicked.
			// e: __GridClickEventArgs
			//		The event dispatched when the grid is clicked.
			// tags:
			//		callback
		},

		onGridDoubleClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when the grid has been double-clicked.
			// e: __GridClickEventArgs
			//		The event dispatched when the grid is double-clicked.
			// tags:
			//		callback
		},

		onItemClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when an item renderer has been clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is clicked.
			// tags:
			//		callback
		},

		onItemDoubleClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when an item renderer has been double-clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is double-clicked.
			// tags:
			//		callback
		},

		onItemContextMenu: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when an item renderer has been context-clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is context-clicked.
			// tags:
			//		callback
		},

		onItemEditBegin: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when the item is entering the editing mode.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},

		onItemEditEnd: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when the item is leaving the editing mode.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},

		onItemEditBeginGesture: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when an editing gesture is beginning.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},

		onItemEditMoveGesture: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched during a move editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},

		onItemEditResizeGesture: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched during a resize editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},

		onItemEditEndGesture: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched at the end of an editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},

		onItemRollOver: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when the mouse cursor in going over an item renderer.
			// e: __ItemMouseEventArgs
			//		The event dispatched when the mouse cursor enters in the item renderer.
			// tags:
			//		callback
		},

		onItemRollOut: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when the mouse cursor in leaving an item renderer.
			// e: __ItemMouseEventArgs
			//		The event dispatched when the mouse cursor enters in the item renderer.
			// tags:
			//		callback
		},

		onColumnHeaderClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when a column header cell is dispatched.
			// e: __HeaderClickEventArgs
			//		Header click event.
			// tags:
			//		callback
		},

		onRowHeaderClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when a row header cell is clicked.
			// e: __HeaderClickEventArgs
			//		Header click event.
			// tags:
			//		callback
		},

		onExpandRendererClick: function (/*===== e ===== */) {
			// summary:
			//		Event dispatched when an expand renderer is clicked.
			// e: __ExpandRendererClickEventArgs
			//		Expand renderer click event.
			// tags:
			//		callback
		}
	});
});
