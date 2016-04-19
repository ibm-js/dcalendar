define([
	"dcl/dcl",
	"delite/Widget",
	"delite/StoreMap"
], function (dcl, Widget, StoreMap) {

	return dcl([Widget, StoreMap], {
		// summary:
		//		This mixin contains the store management, and is mixed into both CalendarBase and ViewBase.

		// startTimeAttr: String
		//		The attribute of the store item that contains the start time of
		//		the events represented by this item.  Default is "startTime".
		startTimeAttr: "startTime",

		// endTimeAttr: String
		//		The attribute of the store item that contains the end time of
		//		the events represented by this item.  Default is "endTime".
		endTimeAttr: "endTime",

		// summaryAttr: String
		//		The attribute of the store item that contains the summary of
		//		the events represented by this item.  Default is "summary".
		summaryAttr: "summary",

		// allDayAttr: String
		//		The attribute of the store item that contains the all day state of
		//		the events represented by this item.  Default is "allDay".
		allDayAttr: "allDay",

		// subColumnAttr: String
		//		The attribute of the store item that contains the sub column name of
		//		the events represented by this item.  Default is "calendar".
		subColumnAttr: "calendar",

		// cssClassFunc: Function
		//		Optional function that returns a css class name to apply to item renderers
		//		that are displaying the specified item in parameter.
		cssClassFunc: null,

		// decodeDate: Function?
		//		An optional function to transform store date into Date objects.  Default is null.
		decodeDate: null,

		// encodeDate: Function?
		//		An optional function to transform Date objects into store date.  Default is null.
		encodeDate: null,

		itemToRenderItem: dcl.superCall(function (sup) {
			return function (storeItem) {
				// Override to use decodeDate() method.
				var ri = sup.apply(this, arguments);
				ri.startTime = (this.decodeDate || this.newDate)(ri.startTime);
				ri.endTime = (this.decodeDate || this.newDate)(ri.endTime);

				// Also, some of the code depends on renderItem._item pointing back to the original store item.
				ri._item = storeItem;

				return ri;
			};
		}),

		renderItemToItem: dcl.superCall(function (sup) {
			return function () {
				// Override to use encodeDate() method
				var ri = sup.apply(this, arguments);
				if (this.encodeDate) {
					ri.startTime = this.encodeDate(ri.startTime);
					ri.endTime = this.encodeDate(ri.endTime);
				}
				return ri;
			};
		}),

		computeProperties: function (oldVals) {
			if ("renderItems" in oldVals) {
				// renderItems can be set due to a result from querying the store, or alternately set
				// directly (in the case when ColumnView sets renderItems in ColumnViewSecondarySheet).
				// In either case, split into this.visibleItems and this.visibleDecorationItems,
				// since that's what the rest of the code wants.
				var data = this.visibleItems = [];
				var decorations = this.visibleDecorationItems = [];
				if (this.renderItems) {
					this.renderItems.forEach(function (ri) {
						if (ri.type === "decoration") {
							decorations.push(ri);
						} else {
							data.push(ri);
						}
					});
				}
			}
		},

		_removeItemWithId: function (items, id) {
			var l = items.length;
			for (var i = l - 1; i >= 0; i--) {
				if (items[i].id == id) {
					items.splice(i, 1);
					this._cleanItemStoreState(id);
					return true;
				}
			}
		},
			
		_getItemStoreStateObj: function (/*Object*/ item) {
			// tags
			//		private

			var owner = this.owner;
			if (owner) {
				return owner._getItemStoreStateObj(item);
			}

			var store = this.source;
			if (store != null && this._itemStoreState != null) {
				var id = item.id === undefined ? store.getIdentity(item) : item.id;
				return this._itemStoreState[id];
			}
			return null;
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

			var owner = this.owner;
			if (owner) {
				return owner.getItemStoreState(item);
			}

			if (this._itemStoreState == null) {
				return "stored";
			}

			var store = this.source;
			var id = item.id === undefined ? store.getIdentity(item) : item.id;
			var s = this._itemStoreState[id];

			if (store != null && s !== undefined) {
				return s.state;
			}
			return "stored";
		},

		_cleanItemStoreState: function (id) {
			var owner = this.owner;
			if (owner) {
				return owner._cleanItemStoreState(id);
			}

			if (!this._itemStoreState) {
				return;
			}

			var s = this._itemStoreState[id];
			if (s) {
				delete this._itemStoreState[id];
				return true;
			}
			return false;
		},

		_setItemStoreState: function (/*Object*/item, /*String*/state) {
			var owner = this.owner;
			if (owner) {
				owner._setItemStoreState(item, state);
				return;
			}

			if (this._itemStoreState === undefined) {
				this._itemStoreState = {};
			}

			var store = this.source;
			var id = item.id === undefined ? store.getIdentity(item) : item.id;
			var s = this._itemStoreState[id];

			if (state === "stored" || state == null) {
				if (s !== undefined) {
					delete this._itemStoreState[id];
				}
				return;
			}

			if (store) {
				this._itemStoreState[id] = {
					id: id,
					item: item,
					renderItem: this.owner.itemToRenderItem(item, store),
					state: state
				};
			}
		}
	});
});
