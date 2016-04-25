define([
	"dcl/dcl",
	"dojo/dom-style",
	"dojo/dom-class",
	"delite/Widget"
], function (dcl, domStyle, domClass, Widget) {

	return dcl(Widget, {
		// summary:
		//		Base class of calendar renderers.

		// h: Integer
		//		Height in pixels.
		h: 0,

		// w: Integer
		//		Width in pixels.
		w: 0,

		// item: Object
		//		The layout item displayed by this renderer.
		item: null,

		// owner: dcalendar/ViewBase
		//		The view that contains this renderer.
		//		TODO: get rid of this field?  A renderer shouldn't need to know who owns it.
		owner: null,

		// edited: Boolean
		//		Indicates that the item displayed by this renderer is in editing mode.
		edited: false,

		// focused: Boolean
		//		Indicates that the item displayed by this renderer is focused.
		focused: false,

		// hovered: Boolean
		//		Indicates that the item displayed by this renderer is hovered.
		hovered: false,

		// selected: Boolean
		//		Indicates that the item displayed by this renderer is selected.
		selected: false,

		// storeState: String
		//		Indicates that the item displayed by this renderer is not in the store,
		//		being saved to the store or in the store.  Legal values:
		//
		//		* "stored"
		//		* "unstored"
		//		* "storing"
		storeState: "",

		// moveEnabled: Boolean
		//		Whether the event displayed by this renderer can be moved.
		moveEnabled: true,

		// resizeEnabled: Boolean
		//		Whether the event displayed by this renderer can be resized.
		resizeEnabled: true,

		_orientation: "vertical",
		_displayValue: "block",

		_displayValueMap: {},

		visibilityLimits: {
			resizeStartHandle: 50,
			resizeEndHandle: -1,
			summaryLabel: 15,
			startTimeLabel: 45,
			endTimeLabel: 50
		},

		_setText: function (node, text, allowHTML) {
			// summary:
			//		Set the text to the specified node.
			// node: Node
			//		The parent node.
			// text: String
			//		The text to display.
			// allowHTML: Boolean
			//		Whether text is containing HTML formatting.
			// tags:
			//		protected

			if (this.owner) {
				this.owner._setText(node, text, allowHTML);
			}
		},

		_isElementVisible: function (elt, startHidden, endHidden, size) {
			// summary:
			//		Determine whether the item renderer sub element is visible or not.
			// elt: String
			//		The element node.
			// startHidden: Boolean
			//		Indicates that the start of time interval displayed by this item renderer
			//		is not the start of the displayed event.
			// endHidden: Boolean
			//		Indicates that the end of time interval displayed by this item renderer
			//		is not the end of the displayed event.
			// size: Integer
			//		The size of the item renderer on the time axis.
			// tags:
			//		protected

			var limit = this.visibilityLimits[elt];

			switch (elt) {
			case "moveHandle":
				return this.moveEnabled;
			case "resizeStartHandle":
				if (this.mobile) {
					return this.resizeEnabled && !startHidden && this.edited && (limit == -1 || size > limit);
				} else {
					return this.resizeEnabled && !startHidden && (limit == -1 || size > limit);
				}
				break;
			case "resizeEndHandle":
				if (this.mobile) {
					return this.resizeEnabled && !endHidden && this.edited && (limit == -1 || size > limit);
				} else {
					return this.resizeEnabled && !endHidden && (limit == -1 || size > limit);
				}
				break;
			case "startTimeLabel":
				if (this.mobile) {
					return !startHidden && (!this.edited || this.edited && (limit == -1 || size > limit));
				} else {
					return !startHidden && (limit == -1 || size > limit);
				}
				break;
			case "endTimeLabel":
				return this.edited && !endHidden && (limit == -1 || size > limit);
			case "summaryLabel":
				if (this.mobile) {
					return !this.edited || this.edited && (limit == -1 || size > limit);
				} else {
					return limit == -1 || size > limit;
				}
				break;
			}
		},

		_formatTime: function (rd, d) {
			// summary:
			//		Returns the time formatted string.
			// rd: Object
			//		The render data.
			// d: Date
			//		The time to format.
			// tags:
			//		protected
			if (this.owner) {
				var f = this.owner.formatItemTime;
				if (typeof f === "function") {
					return f(d, rd, this.owner, this.item);
				}
			}
			return rd.dateLocaleModule.format(d, {selector: "time"});
		},

		getDisplayValue: function () {
			return this._displayValue;
		},

		refreshRendering: function (oldVals) {
			// Update classes
			var tn = this.stateNode || this;
			if ("item" in oldVals) {
				this.setClassComponent("itemCssClass", this.item ? this.item.cssClass : "");
			}
			if ("storeState" in oldVals) {
				this.setClassComponent("storeState", this.storeState === "storing" ? "storing" :
					this.storeState === "unstored" ? "unstored" : "", tn);
			}
			if ("selected" in oldVals) {
				domClass.toggle(tn, "selected", this.selected);
			}
			if ("focused" in oldVals) {
				domClass.toggle(tn, "focused", this.focused);
			}
			if ("edited" in oldVals) {
				domClass.toggle(tn, "edited", this.edited);
			}
			if ("hovered" in oldVals) {
				domClass.toggle(tn, "hovered", this.hovered);
			}

			var item = this.item,
				owner = this.owner,
				h = this.h,
				w = this.w,
				size = this._orientation == "vertical" ? h : w;

			if (!item || !h || !w) {
				return;
			}


			var startHidden = owner.dateModule.compare(item.range[0], item.startTime) !== 0;
			var endHidden = owner.dateModule.compare(item.range[1], item.endTime) !== 0;

			var visible;

			if (this.beforeIcon) {
				visible = this._orientation != "horizontal" || this.effectiveDir === "ltr" ? startHidden : endHidden;
				domStyle.set(this.beforeIcon, "display", visible ? this.getDisplayValue("beforeIcon") : "none");
			}

			if (this.afterIcon) {
				visible = this._orientation != "horizontal" || this.effectiveDir === "ltr" ? endHidden : startHidden;
				domStyle.set(this.afterIcon, "display", visible ? this.getDisplayValue("afterIcon") : "none");
			}

			if (this.moveHandle) {
				visible = this._isElementVisible("moveHandle", startHidden, endHidden, size);
				domStyle.set(this.moveHandle, "display", visible ? this.getDisplayValue("moveHandle") : "none");
			}

			if (this.resizeStartHandle) {
				visible = this._isElementVisible("resizeStartHandle", startHidden, endHidden, size);
				domStyle.set(this.resizeStartHandle, "display", visible ? this.getDisplayValue("resizeStartHandle") :
					"none");
			}

			if (this.resizeEndHandle) {
				visible = this._isElementVisible("resizeEndHandle", startHidden, endHidden, size);
				domStyle.set(this.resizeEndHandle, "display", visible ? this.getDisplayValue("resizeEndHandle") :
					"none");
			}

			if (this.startTimeLabel) {
				visible = this._isElementVisible("startTimeLabel", startHidden, endHidden, size);

				domStyle.set(this.startTimeLabel, "display", visible ? this.getDisplayValue("startTimeLabel") : "none");
				if (visible) {
					this._setText(this.startTimeLabel, this._formatTime(owner, item.startTime));
				}
			}

			if (this.endTimeLabel) {
				visible = this._isElementVisible("endTimeLabel", startHidden, endHidden, size);
				domStyle.set(this.endTimeLabel, "display", visible ? this.getDisplayValue("endTimeLabel") : "none");
				if (visible) {
					this._setText(this.endTimeLabel, this._formatTime(owner, item.endTime));
				}
			}

			if (this.summaryLabel) {
				visible = this._isElementVisible("summaryLabel", startHidden, endHidden, size);
				domStyle.set(this.summaryLabel, "display", visible ? this.getDisplayValue("summaryLabel") : "none");
				if (visible) {
					this._setText(this.summaryLabel, item.summary, true);
				}
			}
		}
	});
});
