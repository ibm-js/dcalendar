define([
	"dcl/dcl",
	"dojo/dom-geometry",
	"delite/on",
	"./ViewBase"
], function (
	dcl,
	domGeometry,
	on,
	ViewBase
) {

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

	return dcl(ViewBase, {

		// summary:
		//		This plugin is managing the mouse interactions on item renderers displayed by a calendar view.

		// triggerExtent: Number
		//		The distance in pixels along the vertical or horizontal axis to cover with the
		//		mouse button down before triggering the editing gesture.
		triggerExtent: 3,

		createdCallback: function () {
			this.on("renderer-created", function (irEvent) {
				var renderer = irEvent.renderer.renderer;

				this.own(renderer.on("click", function (e) {
					e.stopPropagation();
					this.emit("item-click", {
						triggerEvent: e,
						renderer: renderer,
						item: renderer.item._item
					});
				}.bind(this)));

				this.own(renderer.on("dblclick", function (e) {
					e.stopPropagation();
					this.emit("item-double-click", {
						triggerEvent: e,
						renderer: renderer,
						item: renderer.item._item
					});
				}.bind(this)));

				this.own(renderer.on("contextmenu", function (e) {
					this.emit("item-context-menu", {
						triggerEvent: e,
						renderer: renderer,
						item: renderer.item._item
					});
				}.bind(this)));

				if (renderer.resizeStartHandle) {
					this.own(on(renderer.resizeStartHandle, "mousedown", function (e) {
						this._onRendererHandleMouseDown(e, renderer, "resizeStart");
					}.bind(this)));
				}

				if (renderer.moveHandle) {
					this.own(on(renderer.moveHandle, "mousedown", function (e) {
						this._onRendererHandleMouseDown(e, renderer, "move");
					}.bind(this)));

				}

				if (renderer.resizeEndHandle) {
					this.own(on(renderer.resizeEndHandle, "mousedown", function (e) {
						this._onRendererHandleMouseDown(e, renderer, "resizeEnd");
					}.bind(this)));
				}

				this.own(renderer.on("mousedown", function (e) {
					this._rendererMouseDownHandler(e, renderer);
				}.bind(this)));


				this.own(on(irEvent.renderer.container, "mouseenter", function (e) {
					if (!renderer.item) {
						return;
					}

					if (!this._editingGesture) {
						this._setHoveredItem(renderer.item.item, renderer);
						this.emit("item-roll-over", {
							item: renderer.item._item,
							renderer: renderer,
							triggerEvent: e
						});

					}
				}.bind(this)));

				this.own(on(renderer, "mouseleave", function (e) {
					if (!renderer.item) {
						return;
					}
					if (!this._editingGesture) {
						this._setHoveredItem(null);

						this.emit("item-roll-out", {
							item: renderer.item._item,
							renderer: renderer,
							triggerEvent: e
						});
					}
				}.bind(this)));
			}.bind(this));
		},

		_rendererMouseDownHandler: function (e, renderer) {
			// summary:
			//		Callback if the user clicked on the item renderer but not on a handle.
			//		Manages item selection.
			// tags:
			//		private

			e.stopPropagation();

			var item = renderer.item._item;

			this.selectFromEvent(e, item, renderer, true);

			if (this._setTabIndexAttr) {
				this[this._setTabIndexAttr].focus();
			}
		},

		_onRendererHandleMouseDown: function (e, renderer, editKind) {
			// summary:
			//		Callback if the user clicked on a handle of an item renderer.
			//		Manages item selection and editing gesture. If editing is not allowed,
			//		resize handles are not displayed and so this callback will never be called.
			//		In that case selected is managed by the _rendererMouseDownHandler function.
			// tags:
			//		private

			e.stopPropagation();

			this.showFocus = false;

			// save item here as calling endItemEditing may call a relayout and changes the item.
			var ritem = renderer.item;
			var item = ritem.item;

			if (!this.isItemBeingEdited(item)) {

				if (this._isEditing) {
					this._endItemEditing("mouse", false);
				}

				this.selectFromEvent(e, renderer.item._item, renderer, true);

				if (this._setTabIndexAttr) {
					this[this._setTabIndexAttr].focus();
				}

				this._edProps = {
					editKind: editKind,
					editedItem: item,
					rendererKind: renderer.rendererKind,
					tempEditedItem: item,
					liveLayout: this.liveLayout
				};

				this.focusedItem = this._edProps.editedItem;
			}

			var handles = [];
			handles.push(on(this.ownerDocument, "mouseup", this._editingMouseUpHandler.bind(this)));
			handles.push(on(this.ownerDocument, "mousemove", this._editingMouseMoveHandler.bind(this)));

			var p = this._edProps;
			p.handles = handles;
			p.eventSource = "mouse";
			p.editKind = editKind;

			this._startPoint = {x: e.screenX, y: e.screenY};
		},

		_editingMouseMoveHandler: function (e) {
			// tags:
			//		private

			var p = this._edProps;

			if (this._editingGesture) {

				if (!this._autoScroll(e.pageX, e.pageY, true)) {
					this._moveOrResizeItemGesture([this.getTime(e)], "mouse", e, this.getSubColumn(e));
				}

			} else if (Math.abs(this._startPoint.x - e.screenX) >= this.triggerExtent ||
				Math.abs(this._startPoint.y - e.screenY) >= this.triggerExtent) {	// moved enough to trigger editing

				if (!this._isEditing) {
					this._startItemEditing(p.editedItem, "mouse");
				}

				p = this._edProps;

				this._startItemEditingGesture([this.getTime(e)], p.editKind, "mouse", e);
			}
		},

		_editingMouseUpHandler: function (e) {
			// tags:
			//		private

			var p = this._edProps;

			this._stopAutoScroll();

			if (this._isEditing) {

				if (this._editingGesture) { // a gesture is ongoing.
					this._endItemEditingGesture("mouse", e);
				}

				this._endItemEditing("mouse", false);

			} else { // handlers were not removed by endItemEditing
				p.handles.forEach(function (handle) {
					handle.remove();
				});
			}
		},

		_autoScroll: function (globalX, globalY, isVertical) {
			// summary:
			//		Starts or stops the auto scroll according to the mouse cursor position during an item editing.
			// gx: Integer
			//		The position of the mouse cursor along the x-axis.
			// gy: Integer
			//		The position of the mouse cursor along the y-axis.
			// tags:
			//		extension

			if (!this.scrollable || !this.autoScroll) {
				return false;
			}

			var scrollerPos = domGeometry.position(this.scrollContainer, true);

			var p = isVertical ? globalY - scrollerPos.y : globalX - scrollerPos.x;
			var max = isVertical ? scrollerPos.h : scrollerPos.w;

			if (p < 0 || p > max) {

				var step = Math.floor((p < 0 ? p : p - max) / 2) / 3;

				this._startAutoScroll(step);

				return true;

			} else {

				this._stopAutoScroll();
			}
			return false;
		}
	});
});
