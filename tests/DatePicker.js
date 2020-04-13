define([
	"dojo/_base/declare",
	"dijit/Calendar"
], function (
	declare,
	Calendar
) {
	return declare("demo.DatePicker", Calendar, {
		minDate: null,
		maxDate: null,

		getClassForDate: function (date) {
			if (this.minDate && this.maxDate) {
				if (date >= this.minDate && date <= this.maxDate) {
					return "Highlighted";
				}
			}
			return null;
		}
	});
});
