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

		_setRenderItemsAttr: function (renderItems) {
			this._set("renderItems", renderItems);

			// renderItems can be set due to a result from querying the store, or alternately set
			// directly (in the case when ColumnView sets renderItems in ColumnViewSecondarySheet).
			// In either case, split into this.visibleItems and this.visibleDecorationItems,
			// since that's what the rest of the code wants.
			var data = this.visibleItems = [];
			var decorations = this.visibleDecorationItems = [];
			renderItems.forEach( function (ri) {
				if (ri.type === "decoration") {
					decorations.push(ri);
				} else {
					data.push(ri);
				}
			});
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

		// Override itemRemoved(), itemAdded(), and itemUpdated() to:
		// 1. update this.visibleItems or this.visibleDecorationItems (depending on the type of item removed)
		// 2. Trigger a redraw of everything, or if the change is minimal, then just a redraw of the one renderer.

		itemRemoved: dcl.superCall(function (sup) {
			return function (index, renderItems) {
				var ri = renderItems[index];
				if (this.setSelected && this.isSelected(ri)) {
					this.setSelected(ri, false);
				}
				if (ri.type === "decoration") {
					this._removeItemWithId(this.visibleDecorationItems, ri.id);
					this.notifyCurrentValue("visibleDecorationItems");
				} else {
					this._removeItemWithId(this.visibleItems, ri.id);
					this.notifyCurrentValue("visibleItems");
				}
				sup.apply(this, arguments);
			};
		}),

		itemAdded: dcl.superCall(function (sup) {
			return function (newIndex, newItem, renderItems) {
				if (newItem.type === "decoration") {
					this.visibleDecorationItems.push(newItem);
					this.notifyCurrentValue("visibleDecorationItems");
				} else {
					this.visibleItems.push(newItem);
					this.notifyCurrentValue("visibleItems");
				}

				// If the user created a new event, and it just got added to the store...
				var l, i;
				var tempId = newItem.temporaryId;
				if (tempId) {
					// This item had a temporary id that was changed, so it's more like an update than an add...
					renderItems[i] = this._findRenderItem(tempId, renderItems);

					// clean to temp id state and reset the item with new id to its current state.
					var stateObj = this._getItemStoreStateObj({id: tempId});
					this._cleanItemStoreState(tempId);
					this._setItemStoreState(newItem, stateObj ? stateObj.state : null);
				}

					var s = this._getItemStoreStateObj(newItem);
					if (s && s.state === "storing") {
						// if the item is not at the correct index (creation)
						// we must fix it. Should not occur but ensure integrity.
						if (renderItems && renderItems[newIndex] && renderItems[newIndex].id !== newItem.id) {
							l = renderItems.length;
							for (i = l - 1; i >= 0; i--) {
								if (renderItems[i].id === newItem.id) {
									renderItems.splice(i, 1);
									break;
								}
							}
							renderItems.splice(newIndex, 0, newItem);
						}
					// update with the latest values from the store.
					dcl.mix(s.renderItem, newItem);
				}
				this._setItemStoreState(newItem, "stored");
				sup.apply(this, arguments);
			};
		}),

		itemUpdated: dcl.superCall(function (sup) {
			return function (index, newItem, renderItems) {
				// Deal with the update of an item.  This code assumes the item's type did not change (between
				// "task" and "decoration".
				var oldItem = renderItems[index];
				var cal = this.dateModule;

				// Test if we need to re-layout everything, or just update this one renderer.
				var layoutCanChange = cal.compare(newItem.startTime, oldItem.startTime) !== 0 ||
					cal.compare(newItem.endTime, oldItem.endTime) !== 0;

				// Keep the same object but mix in new property values.
				sup.apply(this, arguments);

				// Re-render everything or just that one renderer, depending on whether start/end time has changed.
				if (layoutCanChange) {
					if (newItem.type === "decoration") {
						this.notifyCurrentValue("visibleDecorationItems");
					} else {
						this.notifyCurrentValue("visibleItems");
					}
				} else {
					this.updateRenderers(oldItem);
				}
			};
		}),
			
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
