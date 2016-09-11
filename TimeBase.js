define([
	"dcl/dcl",
	"deliteful/TimeBase"
], function (
	dcl,
	TimeBase
) {
	/**
	 * Mixin with time methods.
	 * Extension of deliteful/TimeBase to add `floorDate()` method.
	 */
	return dcl(TimeBase, {
		floorDate: function (date, unit, steps) {
			// summary:
			//		floors the date to the unit.
			// date: Date
			//		The date/time to floor.
			// unit: String
			//		The unit.  Valid values are "minute", "hour", "day", "week".
			// steps: Integer
			//		For "day" or "week" only 1 is valid.
			// returns: Date

			var d = this.floorToDay(date);

			switch (unit) {
			case "week":
				return this.floorToWeek(d);
			case "minute":
				d.setHours(date.getHours());
				d.setMinutes(Math.floor(date.getMinutes() / steps) * steps);
				break;
			case "hour":
				d.setHours(Math.floor(date.getHours() / steps) * steps);
				break;
			}

			return d;
		}
	});
});
