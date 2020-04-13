define([
	"dcl/dcl",
	"./ViewBase"
], function (dcl, keys, ViewBase) {

	function stopEvent(e) {
		e.stopPropagation();
		e.preventDefault();
	}

	return dcl(ViewBase, {
		// summary:
		//		This mixin is managing the keyboard interactions on a calendar view.

		// TODO: this keeps the focus on the ViewBase widget itself, and just switches an imaginary focus
		// outline over the renderers.  I bet it's not accessible for screen readers.

		// keyboardUpDownUnit: String
		//		Unit used during editing of an event using the keyboard and the up or down keys were pressed.
		//		Valid values are "week", "day", "hours" "minute".
		keyboardUpDownUnit: "minute",

		// keyboardUpDownSteps: Integer
		//		Steps used during editing of an event using the keyboard and the up or down keys were pressed.
		keyboardUpDownSteps: 15,

		// keyboardLeftRightUnit: String
		//		Unit used during editing of an event using the keyboard and the left or right keys were pressed.
		//		Valid values are "week", "day", "hours" "minute".
		keyboardLeftRightUnit: "day",

		// keyboardLeftRightSteps: Integer
		//		Unit used during editing of an event using the keyboard and the left or right keys were pressed.
		keyboardLeftRightSteps: 1,

		// allDayKeyboardUpDownUnit: Integer
		//		Steps used during editing of an all day event using the keyboard and the up or down keys were pressed.
		allDayKeyboardUpDownUnit: "day",

		// allDayKeyboardUpDownSteps: String
		//		Unit used during editing of an all day event using the keyboard and the up or down keys were pressed.
		//		Valid values are "week", "day", "hours" "minute".
		allDayKeyboardUpDownSteps: 7,

		// allDayKeyboardLeftRightUnit: Integer
		//		Steps used during editing of an all day event using the keyboard and the up or down keys were pressed.
		allDayKeyboardLeftRightUnit: "day",

		// allDayKeyboardLeftRightSteps: String
		//		Unit used during editing of an all day event using the keyboard
		//		when the left or right keys were pressed.
		//		Valid values are "week", "day", "hours" "minute".
		allDayKeyboardLeftRightSteps: 1,

		afterInitializeRendering: function () {
			this._viewHandles.push(this.on("keydown", this._onKeyDown.bind(this)));
			this.setAttribute("tabIndex", this.tabIndex);
		},

		// resizeModfier: String
		//		The modifier used to determine if the item is resized instead moved during the editing on an item.
		resizeModifier: "ctrl",

		// maxScrollAnimationDuration: Number
		//		The duration in milliseconds to scroll the entire view.
		//		The scroll speed is constant when scrolling to show an item renderer.
		maxScrollAnimationDuration: 1000,

		///////////////////////////////////////////////////////////////
		//
		// Focus management
		//
		//////////////////////////////////////////////////////////////

		// tabIndex: String
		//		Order fields are traversed when user hits the tab key
		tabIndex: "0",

		// focusedItem: Object
		//		The data item that currently has the focus.
		focusedItem: dcl.prop({
			set: function (value) {
				if (value != this.focusedItem) {
					var old = this.focusedItem;
					this._set("focusedItem", value);
					this.updateRenderers([old, this.focusedItem], true);
					this.emit("focus-change", {
						oldValue: old,
						newValue: value
					});
				}
				if (value != null) {
					if (this.owner != null && this.owner.focusedItem != null) {
						this.owner.focusedItem = null;
					}
					if (this._secondarySheet != null && this._secondarySheet.focusedItem != null) {
						this._secondarySheet.focusedItem = null;
					}
				}
			},
			get: function () {
				return this._get("focusedItem");
			},
			enumerable: true,
			configurable: true
		}),

		_isItemFocused: function (item) {
			return this.focusedItem != null && this.focusedItem.id == item.id;
		},


		// showFocus: Boolean
		//		Show or hide the focus graphic feedback on item renderers.
		showFocus: false,

		_focusNextItem: function (dir) {
			// summary:
			//		Moves the focus to the next item in the specified direction.
			//		If there is no current child focused, the first (dir == 1) or last (dir == -1) is focused.
			// dir: Integer
			//		The direction of the next child to focus.
			//
			//		- 1: Move focus to the next item in the list.
			//		- -1: Move focus to the previous item in the list.

			if (!this.visibleItems || this.visibleItems.length === 0) {
				return null;
			}

			var index = -1;
			var list = this.visibleItems;
			var max = list.length - 1;
			var focusedItem = this.focusedItem;

			// find current index.
			if (focusedItem == null) {
				index = dir > 0 ? 0 : max;
			} else {
				list.some(function (item, i) {
					var found = item.id == focusedItem.id;
					if (found) {
						index = i;
					}
					return found;
				}.bind(this));
				index = this._focusNextItemImpl(dir, index, max);
			}

			// find the first item with renderers.
			var reachedOnce = false;
			var old = -1;

			while (old != index && (!reachedOnce || index !== 0)) {
				if (!reachedOnce && index === 0) {
					reachedOnce = true;
				}

				var item = list[index];

				if (this.rendererManager.itemToRenderer[item.id] != null) {
					// found item
					this.focusedItem = item;
					return;
				}
				old = index;
				index = this._focusNextItemImpl(dir, index, max);
			}
		},

		_focusNextItemImpl: function (dir, index, max) {
			// tags:
			//		private

			if (index === -1) { // not found should not occur
				index = dir > 0 ? 0 : max;
			} else {
				if (index === 0 && dir == -1 || index === max && dir === 1) {
					return index;
				}
				index = dir > 0 ? ++index : --index;
			}
			return index;
		},

		///////////////////////////////////////////////////////////
		//
		// Keyboard
		//
		//////////////////////////////////////////////////////////

		_handlePrevNextKeyCode: function (e, dir) {
			// tags:
			//		private

			if (this.effectiveDir === "rtl") {
				dir = dir == 1 ? -1 : 1;
			}
			this.showFocus = true;
			this._focusNextItem(dir);

			var focusedItem = this.focusedItem;

			if (!e.ctrlKey && focusedItem) {
				this.selectedItem = focusedItem;
			}

			if (focusedItem) {
				this.ensureVisibility(focusedItem.startTime, focusedItem.endTime, "both", undefined,
					this.maxScrollAnimationDuration);
			}
		},

		_checkDir: function (dir, value) {
			return this.effectiveDir === "ltr" && dir == value ||
				this.effectiveDir === "rtl" && dir == (value == "left" ? "right" : "left");
		},

		_keyboardItemEditing: function (e, dir) {
			// tags:
			//		private

			stopEvent(e);

			var p = this._edProps;

			var unit, steps;

			if (p.editedItem.allDay || this.roundToDay || p.rendererKind == "label") {
				unit = dir == "up" || dir == "down" ? this.allDayKeyboardUpDownUnit : this.allDayKeyboardLeftRightUnit;
				steps = dir == "up" || dir == "down" ? this.allDayKeyboardUpDownSteps :
					this.allDayKeyboardLeftRightSteps;
			} else {
				unit = dir == "up" || dir == "down" ? this.keyboardUpDownUnit : this.keyboardLeftRightUnit;
				steps = dir == "up" || dir == "down" ? this.keyboardUpDownSteps : this.keyboardLeftRightSteps;
			}

			if (dir == "up" || this._checkDir(dir, "left")) {
				steps = -steps;
			}

			var increment = {};
			increment[unit] = steps;

			var editKind = e[this.resizeModifier + "Key"] ? "resizeEnd" : "move";

			var d = editKind == "resizeEnd" ? p.editedItem.endTime : p.editedItem.startTime;

			var newTime = d;
			var subColumn = p.editedItem.subColumn;

			if (editKind == "move" && this.subColumns && this.subColumns.length > 1) {
				var idx = this.getSubColumnIndex(subColumn);
				var updateTime = true;
				if (idx != -1) {
					if (this._checkDir(dir, "left")) {
						if (idx === 0) {
							subColumn = this.subColumns[this.subColumns.length - 1];
						} else {
							updateTime = false;
							subColumn = this.subColumns[idx - 1];
						}
					} else if (this._checkDir(dir, "right")) {
						if (idx == this.subColumns.length - 1) {
							subColumn = this.subColumns[0];
						} else {
							updateTime = false;
							subColumn = this.subColumns[idx + 1];
						}
					}
					if (updateTime) {
						newTime = d.plus(increment);
					}
				}
			} else {
				newTime = d.plus(increment);
			}

			this._startItemEditingGesture([d], editKind, "keyboard", e);
			this._moveOrResizeItemGesture([newTime], "keyboard", e, subColumn);
			this._endItemEditingGesture(editKind, "keyboard", e, false);

			if (editKind == "move") {
				if (newTime < d) {
					this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "start");
				} else {
					this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "end");
				}
			} else { // resize end only
				this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "end");
			}
		},

		_onKeyDown: function (e) {
			var focusedItem = this.focusedItem;

			switch (e.key) {
			case "Esc":
				if (this._isEditing) {
					if (this._editingGesture) {
						this._endItemEditingGesture("keyboard", e, true);
					}

					this._endItemEditing("keyboard", true);

					this._edProps = null;
				}
				break;

			case "Spacebar":
				stopEvent(e); // prevent browser shortcut

				if (focusedItem != null) {
					this.setSelected(focusedItem, e.ctrlKey ? !this.isSelected(focusedItem) : true);
				}
				break;

			case "Enter":
				stopEvent(e); // prevent browser shortcut

				if (focusedItem != null) {
					if (this._isEditing) {
						this._endItemEditing("keyboard", false);
					} else {
						var renderers = this.rendererManager.itemToRenderer[focusedItem.id];

						if (renderers && renderers.length > 0 &&
							this.isItemEditable(focusedItem, renderers[0].kind)) {

							this._edProps = {
								renderer: renderers[0],
								rendererKind: renderers[0].kind,
								tempEditedItem: focusedItem,
								liveLayout: this.liveLayout
							};

							this.selectedItem = focusedItem;

							this._startItemEditing(focusedItem, "keyboard");
						}
					}
				}
				break;

			case "ArrowLeft":
				stopEvent(e); // prevent browser shortcut

				if (this._isEditing) {
					this._keyboardItemEditing(e, "left");
				} else {
					this._handlePrevNextKeyCode(e, -1);
				}
				break;

			case "ArrowRight":
				stopEvent(e); // prevent browser shortcut

				if (this._isEditing) {
					this._keyboardItemEditing(e, "right");
				} else {
					this._handlePrevNextKeyCode(e, 1);
				}
				break;

			case "ArrowUp":
				if (this._isEditing) {
					this._keyboardItemEditing(e, "up");
				} else if (this.scrollable) {
					this.scrollView(-1);
				}
				break;

			case "ArrowDown":
				if (this._isEditing) {
					this._keyboardItemEditing(e, "down");
				} else if (this.scrollable) {
					this.scrollView(1);
				}
				break;
			}
		}
	});
});
