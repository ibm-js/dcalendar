define([
	"dcl/dcl",
	"delite/register",
	"dojo/dom-class",
	"dojo/dom-style",
	"delite/Widget",
	"delite/handlebars!./templates/ExpandRenderer.html"
], function (
	dcl,
	register,
	domClass,
	domStyle,
	Widget,
	template
) {

	return register("d-calendar-expander", [HTMLElement, Widget], {
		// summary:
		//		The default renderer display in MatrixView cells where some item renderers
		//		cannot be displayed because of size constraints.

		template: template,

		baseClass: "d-calendar-expand",

		// focused: Boolean
		//		Indicates that the renderer is focused.
		focused: dcl.prop({
			set: function (value) {
				this._setState("focused", value, "focused");
			},
			get: function () {
				return this._get("focused") || false;
			},
			enumerable: true,
			configurable: true
		}),

		// up: Boolean
		//		Indicates that the mouse cursor is over renderer.
		up: dcl.prop({
			set: function (value) {
				this._setState("up", value, "up");
			},
			get: function () {
				return this._get("up") || false;
			},
			enumerable: true,
			configurable: true
		}),

		// down: Boolean
		//		Indicates that the renderer is pressed.
		down: dcl.prop({
			set: function (value) {
				this._setState("down", value, "down");
			},
			get: function () {
				return this._get("down") || false;
			},
			enumerable: true,
			configurable: true
		}),

		// date: Date
		//		The date displayed by the cell where this renderer is used.
		date: null,

		// items: Object[]
		//		List of items that are not displayed in the cell because of the size constraints.
		items: null,

		// rowIndex: Integer
		//		Row index where this renderer is used.
		rowIndex: -1,

		// columnIndex: Integer
		//		Column index where this renderer is used.
		columnIndex: -1,

		// TODO: replace most of the code below with template

		expanded: dcl.prop({
			set: function (value) {
				domStyle.set(this.expand, "display", value ? "none" : "inline-block");
				domStyle.set(this.collapse, "display", value ? "inline-block" : "none");
				this._set("expanded", value);
			},
			get: function () {
				return this._get("expanded");
			},
			enumerable: true,
			configurable: true
		}),

		_setState: function (prop, value, cssClass) {
			if (this[prop] != value) {
				var tn = this.stateNode || this;
				domClass.toggle(tn, cssClass, value);
				this._set(prop, value);
			}
		},

		// TODO: use event delegation; setup listeners on MatrixView
		_onClick: function (e) {
			// TODO: we should just emit an event; shouldn't need to know about our owner
			if (this.owner && this.owner.expandRendererClickHandler) {
				this.owner.expandRendererClickHandler(e, this);
			}
		},

		_onMouseDown: function (e) {
			// tags:
			//		private

			e.stopPropagation();
			this.down = true;
		},

		_onMouseUp: function () {
			// tags:
			//		private

			this.down = false;
		},

		_onMouseOver: function (e) {
			// tags:
			//		private

			if (!this.up) {
				var buttonDown = e.button == 1;
				this.up = !buttonDown;
				this.down = buttonDown;
			}
		},

		_onMouseOut: function (e) {
			// tags:
			//		private

			var node = e.relatedTarget;
			while (node != e.currentTarget && node != this.ownerDocument.body && node != null) {
				node = node.parentNode;
			}
			if (node == e.currentTarget) {
				return;
			}
			this.up = false;
			this.down = false;
		}
	});
});
