define([
	"dcl/dcl",
	"delite/register",
	"dojo/dom-class",
	"delite/Widget"
], function (dcl, register, domClass, Widget) {

	return register("d-calendar-decoration", [HTMLElement, Widget], {
		// summary:
		//		The default item vertical renderer.

		baseClass: "d-calendar-decoration",

		// TODO: replace this method with class={{item.cssClass}} template? (or with null handling,
		// if needed)
		// There's some weird detail though with copying value's properties into this.item.
		item: dcl.prop({
			set: function (value) {
				this.className = (value && value.cssClass) || "";
				this._set("item", value);
			},
			get: function () {
				return this._get("item");
			},
			enumerable: true,
			configurable: true
		})
	});
});
