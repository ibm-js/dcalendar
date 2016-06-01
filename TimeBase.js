define([
	"dcl/dcl",
	"dojo/date",
	"dojo/date/locale",
	"dojo/cldr/supplemental",
	"dojo/date/stamp"
], function (
	dcl,
	ddate,
	locale,
	cldr,
	stamp
) {
	/**
	 * Mixin with time methods.
	 */
	return dcl(null, {
		_calendar: "gregorian",

		/**
		 * Object with same API as native Date class.
		 */
		dateClassObj: Date,

		/**
		 * Object with same API as dojo/date.
		 */
		dateModule: ddate,

		/**
		 * Object with same API as dojo/date/locale.
		 */
		dateLocaleModule: locale,

		// firstDayOfWeek: Integer
		//		0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday.
		firstDayOfWeek: cldr.getFirstDayOfWeek(),

		newDate: function (obj) {
			// summary:
			//		Creates a new Date object.
			// obj: Object
			//		This object can have several values:
			//		- the time in milliseconds since gregorian epoch.
			//		- a Date instance
			// returns: Date

			var d;

			if (typeof obj == "number") {
				return new this.dateClassObj(obj);
			} else if (obj.getTime) {
				return new this.dateClassObj(obj.getTime());
			} else if (obj.toGregorian) {
				d = obj.toGregorian();
				if (this.dateClassObj !== Date) {
					d = new this.dateClassObj(d.getTime());
				}
				return d;
			} else if (typeof obj == "string") {
				d = stamp.fromISOString(obj);
				if (d === null) {
					throw new Error("Cannot parse date string (" + obj + "), specify a \"decodeDate\" function that " +
						"translates this string into a Date object"); // cannot build date
				} else if (this.dateClassObj !== Date) { // from Date to this.dateClassObj
					d = new this.dateClassObj(d.getTime());
				}
				return d;
			}
		},

		isWeekEnd: function (date) {
			// summary:
			//		Determines whether the specified date is a week-end.
			//		This method is using dojo.date.locale.isWeekend() method as
			//		dojox.date.XXXX calendars are not supporting this method.
			// date: Date
			//		The date to test.

			return locale.isWeekend(date);
		},

		getWeekNumberLabel: function (date) {
			// summary:
			//		Returns the week number string from dojo.date.locale.format() method as
			//		dojox.date.XXXX calendar are not supporting the "w" pattern.
			// date: Date
			//		The date to format.

			if (date.toGregorian) {
				date = date.toGregorian();
			}
			return locale.format(date, {
				selector: "date",
				datePattern: "w"
			});
		},

		addAndFloor: function (date, unit, steps) {
			// date must be floored!!
			// unit >= day
			var d = this.dateModule.add(date, unit, steps);
			if (d.getHours() == 23) {
				d = this.dateModule.add(d, "hour", 2); // go to 1am
			} else {
				d = this.floorToDay(d, true);
			}
			return d;
		},

		floorToDay: function (date, reuse) {
			// summary:
			//		Floors the specified date to the start of day.
			// date: Date
			//		The date to floor.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date

			if (!reuse) {
				date = this.newDate(date);
			}

			date.setHours(0, 0, 0, 0);

			return date;
		},

		floorToWeek: function (date) {
			// summary:
			//		Floors the specified date to the beginning of week.
			// date: Date
			//		Date to floor.

			var fd = this.firstDayOfWeek;
			var day = date.getDay();
			if (day == fd) {
				return date;
			}
			return this.floorToDay(
				this.dateModule.add(date, "day", day > fd ? -day + fd : -day + fd - 7),
				true, this.dateClassObj);
		},

		floorToMonth: function (date, reuse) {
			// summary:
			//		Floors the specified date to the start of the date's month.
			// date: Date
			//		The date to floor.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date

			if (!reuse) {
				date = this.newDate(date);
			}

			date.setDate(1);
			date.setHours(0, 0, 0, 0);

			return date;
		},

		floorDate: function (date, unit, steps, reuse) {
			// summary:
			//		floors the date to the unit.
			// date: Date
			//		The date/time to floor.
			// unit: String
			//		The unit. Valid values are "minute", "hour", "day".
			// steps: Integer
			//		For "day" only 1 is valid.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date

			var d = this.floorToDay(date, reuse, this.dateClassObj);

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
		},

		isToday: function (date) {
			// summary:
			//		Returns whether the specified date is in the current day.
			// date: Date
			//		The date to test.
			// returns: Boolean

			var today = new this.dateClassObj();
			return date.getFullYear() == today.getFullYear() &&
				date.getMonth() == today.getMonth() &&
				date.getDate() == today.getDate();
		},

		isStartOfDay: function (date) {
			// summary:
			//		Tests if the specified date represents the starts of day.
			// date: Date
			//		The date to test.
			// returns: Boolean

			return this.dateModule.compare(this.floorToDay(date, false, this.dateClassObj), date) === 0;
		},

		isOverlapping: function (start1, end1, start2, end2, includeLimits) {
			// summary:
			//		Computes if the first time range defined by the start1 and end1 parameters
			//		is overlapping the second time range defined by the start2 and end2 parameters.
			// start1: Date
			//		The start time of the first time range.
			// end1: Date
			//		The end time of the first time range.
			// start2: Date
			//		The start time of the second time range.
			// end2: Date
			//		The end time of the second time range.
			// includeLimits: Boolean
			//		Whether include the end time or not.
			// returns: Boolean

			if (start1 == null || start2 == null || end1 == null || end2 == null) {
				return false;
			}

			var cal = this.dateModule;

			if (includeLimits) {
				if (cal.compare(start1, end2) == 1 || cal.compare(start2, end1) == 1) {
					return false;
				}
			} else if (cal.compare(start1, end2) != -1 || cal.compare(start2, end1) != -1) {
				return false;
			}

			return true;
		},

		isSameDay: function (date1, date2) {
			// summary:
			//		Tests if the specified dates are in the same day.
			// date1: Date
			//		The first date.
			// date2: Date
			//		The second date.
			// returns: Boolean

			if (date1 == null || date2 == null) {
				return false;
			}

			return date1.getFullYear() == date2.getFullYear() &&
				date1.getMonth() == date2.getMonth() &&
				date1.getDate() == date2.getDate();
		}
	});
});
