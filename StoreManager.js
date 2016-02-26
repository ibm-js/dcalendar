define([
	"dcl/dcl",
	"decor/Stateful",
	"decor/Evented",
	"dojo/when"
], function (dcl, Stateful, Evented, when) {

	return dcl([Stateful, Evented], {
		// summary:
		//		This class provides a higher level interface to the dojo/store/Store.
		//		All access to the Store is done through this class.
		//		It emits the following events:
		//
		//		* dataLoaded - the initial list of items is available
		//		* "layoutInvalidated" - the calendar needs to destroy and recreate all the renderers
		//		* renderersInvalidated - the specified item has changed in a minor way; just update the
		//		  corresponding renderer


		// owner: Object
		//	The owner of the store manager: a view or a calendar widget.
		owner: null,

		// store: dojo.store.Store
		//		The store that contains the events to display.
		store: null,

		_ownerItemsProperty: null,

		_getParentStoreManager: function () {
			if (this.owner && this.owner.owner) {
				return this.owner.owner.storeManager;
			}
			return null;
		},

		_initItems: function (items) {
			this.items = items;
			this.emit("dataLoaded", items);
		},

		_computeVisibleItems: function (renderData) {
			// summary:
			//		Computes the data items that are in the displayed interval.
			// renderData: Object
			//		The renderData that contains the start and end time of the displayed interval.
			// tags:
			//		protected

			var startTime = renderData.startTime;
			var endTime = renderData.endTime;
			var res = null;
			var items = this.items;
			if (items) {
				res = items.filter(function (item) {
					return this.owner.isOverlapping(renderData, item.startTime, item.endTime, startTime, endTime);
				}, this);
			}
			return res;
		},

		_updateItems: function (object, previousIndex, newIndex) {
			// as soon as we add an item or remove one layout might change,
			// let's make that the default
			// TODO: what about items in non visible area...
			// tags:
			//		private

			var layoutCanChange = true;
			var oldItem = null;
			var newItem = this.owner.itemToRenderItem(object, this.store);
			// keep a reference on the store data item.
			newItem._item = object;

			// get back the items from the owner that can contain the item created interactively.
			this.items = this.owner[this._ownerItemsProperty];

			// set the item as in the store
			if (previousIndex !== -1) {
				if (newIndex !== previousIndex) {
					// this is a remove or a move
					this.items.splice(previousIndex, 1);
					if (this.owner.setItemSelected && this.owner.isItemSelected(newItem)) {
						this.owner.setItemSelected(newItem, false);
						this.owner.dispatchChange(newItem, this.selectedItem, null, null);
					}
				} else {
					// this is a put, previous and new index identical
					// check what changed
					oldItem = this.items[previousIndex];
					var cal = this.owner.dateModule;
					layoutCanChange = cal.compare(newItem.startTime, oldItem.startTime) !== 0 ||
						cal.compare(newItem.endTime, oldItem.endTime) !== 0;
					// we want to keep the same item object and mixin new values
					// into old object
					dcl.mix(oldItem, newItem);
				}
			} else if (newIndex !== -1) {
				// this is a add
				var l, i;
				var tempId = object.temporaryId;
				if (tempId) {
					// this item had a temporary id that was changed
					l = this.items ? this.items.length : 0;
					for (i = l - 1; i >= 0; i--) {
						if (this.items[i].id === tempId) {
							this.items[i] = newItem;
							break;
						}
					}
					// clean to temp id state and reset the item with new id to its current state.
					var stateObj = this._getItemStoreStateObj({id: tempId});
					this._cleanItemStoreState(tempId);
					this._setItemStoreState(newItem, stateObj ? stateObj.state : null);
				}

				var s = this._getItemStoreStateObj(newItem);
				if (s && s.state === "storing") {
					// if the item is at the correct index (creation)
					// we must fix it. Should not occur but ensure integrity.
					if (this.items && this.items[newIndex] && this.items[newIndex].id !== newItem.id) {
						l = this.items.length;
						for (i = l - 1; i >= 0; i--) {
							if (this.items[i].id === newItem.id) {
								this.items.splice(i, 1);
								break;
							}
						}
						this.items.splice(newIndex, 0, newItem);
					}
					// update with the latest values from the store.
					dcl.mix(s.renderItem, newItem);
				} else {
					this.items.splice(newIndex, 0, newItem);
				}
				this.notifyCurrentValue("items");
			}

			this._setItemStoreState(newItem, "stored");

			if (!this.owner._isEditing) {
				if (layoutCanChange) {
					this.emit("layoutInvalidated");
				} else {
					// just update the item
					this.emit("renderersInvalidated", oldItem);
				}
			}
		},

		_setStoreAttr: function (store) {
			this._set("store", store);

			var owner = this.owner;

			if (this._observeHandler) {
				this._observeHandler.remove();
				this._observeHandler = null;
			}
			if (store) {
				var results = store.query(owner.query, owner.queryOptions);
				if (results.observe) {
					// user asked us to observe the store
					this._observeHandler = results.observe(this._updateItems.bind(this), true);
				}
				results = results.map(function (item) {
					var renderItem = owner.itemToRenderItem(item, store);
					if (renderItem.id == null) {
						console.err("The data item " + item.summary + " must have an unique identifier from the store.getIdentity(). The calendar will NOT work properly.");
					}
					// keep a reference on the store data item.
					renderItem._item = item;
					return renderItem;
				}.bind(this));
				when(results, this._initItems.bind(this));
			} else {
				// we remove the store
				this._initItems([]);
			}
		},

		_getItemStoreStateObj: function (/*Object*/item) {
			// tags
			//		private

			var parentManager = this._getParentStoreManager();
			if (parentManager) {
				return parentManager._getItemStoreStateObj(item);
			}

			var store = this.store;
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

			var parentManager = this._getParentStoreManager();
			if (parentManager) {
				return parentManager.getItemStoreState(item);
			}

			if (this._itemStoreState == null) {
				return "stored";
			}

			var store = this.store;
			var id = item.id === undefined ? store.getIdentity(item) : item.id;
			var s = this._itemStoreState[id];

			if (store != null && s !== undefined) {
				return s.state;
			}
			return "stored";
		},

		_cleanItemStoreState: function (id) {

			var parentManager = this._getParentStoreManager();
			if (parentManager) {
				return parentManager._cleanItemStoreState(id);
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
			// tags
			//		private

			var parentManager = this._getParentStoreManager();
			if (parentManager) {
				parentManager._setItemStoreState(item, state);
				return;
			}

			if (this._itemStoreState === undefined) {
				this._itemStoreState = {};
			}

			var store = this.store;
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
