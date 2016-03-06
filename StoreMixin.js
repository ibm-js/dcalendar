define([
	"dcl/dcl",
	"decor/Stateful"
], function (dcl, Stateful) {

	return dcl(Stateful, {
		// summary:
		//		This mixin contains the store management, and is mixed into both CalendarBase and ViewBase.

		// store: dojo.store.Store
		//		The store that contains the events to display.
		store: null,

		// query: Object
		//		A query that can be passed to when querying the store.
		query: {},

		// queryOptions: dojo/store/api/Store.QueryOptions?
		//		Options to be applied when querying the store.
		queryOptions: null,

		// startTimeAttr: String
		//		The attribute of the store item that contains the start time of
		//		the events represented by this item.	Default is "startTime".
		startTimeAttr: "startTime",

		// endTimeAttr: String
		//		The attribute of the store item that contains the end time of
		//		the events represented by this item.	Default is "endTime".
		endTimeAttr: "endTime",

		// summaryAttr: String
		//		The attribute of the store item that contains the summary of
		//		the events represented by this item.	Default is "summary".
		summaryAttr: "summary",

		// allDayAttr: String
		//		The attribute of the store item that contains the all day state of
		//		the events represented by this item.	Default is "allDay".
		allDayAttr: "allDay",

		// subColumnAttr: String
		//		The attribute of the store item that contains the sub column name of
		//		the events represented by this item.	Default is "calendar".
		subColumnAttr: "calendar",

		// cssClassFunc: Function
		//		Optional function that returns a css class name to apply to item renderers
		//		that are displaying the specified item in parameter.
		cssClassFunc: null,

		// decodeDate: Function?
		//		An optional function to transform store date into Date objects.	Default is null.
		decodeDate: null,

		// encodeDate: Function?
		//		An optional function to transform Date objects into store date.	Default is null.
		encodeDate: null,

		////////////////////////////////////////////////////////
		//
		// Computed properties, not to be set directly
		//
		////////////////////////////////////////////////////////

		// items: Object[]
		//		List of events to put on the calendar.  This is set by querying the store, rather
		//		than by being set directly.   And, it contains "render items", from itemToRenderItem(),
		//		not the direct items in the store.
		items: null,

		itemToRenderItem: function (item, store) {
			// summary:
			//		Creates the render item based on the dojo.store item. It must be of the form:
			//	|	{
			//  |		id: Object,
			//	|		startTime: Date,
			//	|		endTime: Date,
			//	|		summary: String
			//	|	}
			//		By default it is building an object using the store id, the summaryAttr,
			//		startTimeAttr and endTimeAttr properties as well as decodeDate property if not null.
			//		Other fields or way to query fields can be used if needed.
			// item: Object
			//		The store item.
			// store: dojo.store.api.Store
			//		The store.
			// returns: Object

			return {
				id: store.getIdentity(item),
				summary: item[this.summaryAttr],
				startTime: (this.decodeDate && this.decodeDate(item[this.startTimeAttr])) ||
					this.newDate(item[this.startTimeAttr], this.dateClassObj),
				endTime: (this.decodeDate && this.decodeDate(item[this.endTimeAttr])) ||
					this.newDate(item[this.endTimeAttr], this.dateClassObj),
				allDay: item[this.allDayAttr] != null ? item[this.allDayAttr] : false,
				subColumn: item[this.subColumnAttr],
				cssClass: this.cssClassFunc ? this.cssClassFunc(item) : null
			};
		},

		renderItemToItem: function (/*Object*/ renderItem, /*dojo.store.api.Store*/ store) {
			// summary:
			//		Create a store item based on the render item. It must be of the form:
			//	|	{
			//	|		id: Object
			//	|		startTime: Date,
			//	|		endTime: Date,
			//	|		summary: String
			//	|	}
			//		By default it is building an object using the summaryAttr, startTimeAttr and endTimeAttr
			//		properties and encodeDate property if not null.
			//		If the encodeDate property is null a Date object will be set in the start and end time.
			//		When using a JsonRest store, for example, it is recommended to transfer dates using the ISO format
			//		(see dojo.date.stamp).
			//		In that case, provide a custom function to the encodeDate property that is using the date ISO
			//		encoding provided by Dojo.
			// renderItem: Object
			//		The render item.
			// store: dojo.store.api.Store
			//		The store.
			// returns: Object

			var item = {};
			item[store.idProperty] = renderItem.id;
			item[this.summaryAttr] = renderItem.summary;
			item[this.startTimeAttr] = (this.encodeDate && this.encodeDate(renderItem.startTime)) ||
				renderItem.startTime;
			item[this.endTimeAttr] = (this.encodeDate && this.encodeDate(renderItem.endTime)) ||
				renderItem.endTime;
			if (renderItem.subColumn) {
				item[this.subColumnAttr] = renderItem.subColumn;
			}

			if (this.getItemStoreState(renderItem) === "unstored") {
				return item;
			} else {
				dcl.mix(renderItem._item, item);
				return renderItem._item;
			}
		},

		_initItems: function (items) {
			// tags:
			//		private
			this.items = items;
			return items;
		}
	});
});
