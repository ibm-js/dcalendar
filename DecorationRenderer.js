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
		_setItemAttr: function (value) {
			if (value == null) {
				if (this.item && this.item.cssClass) {
					domClass.remove(this, this.item.cssClass);
				}
				this.item = null;
			} else {
				if (this.item != null) {
					if (this.item.cssClass != value.cssClass) {
						if (this.item.cssClass) {
							domClass.remove(this, this.item.cssClass);
						}
					}
					for (var key in value) {
						this.item[key] = value[key];
					}
					if (value.cssClass) {
						domClass.add(this, value.cssClass);
					}
				} else {
					this.item = value;
					if (value.cssClass) {
						domClass.add(this, value.cssClass);
					}
				}
			}
		}
	});
});
