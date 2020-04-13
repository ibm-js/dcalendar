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
			// date: DateTime
			//		The date/time to floor.
			// unit: String
			//		The unit.  Valid values are "minute", "hour", "day", "week".
			// steps: Integer
			//		For "day" or "week" only 1 is valid.
			// returns: DateTime

			var d = date.startOf("day");

			switch (unit) {
			case "week":
				return this.floorToWeek(d);
			case "minute":
				d = d.set({
					hour: date.hour,
					minute: Math.floor(date.minute / steps) * steps
				});
				break;
			case "hour":
				d = d.set({
					hour: Math.floor(date.hour / steps) * steps
				});
				break;
			}

			return d;
		}
	});
});
