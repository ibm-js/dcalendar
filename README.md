# Dcalendar

Project state: experimental

Credits:

* Damien Garbarino
* Christophe Jolif
* Bill Keese

## Project description

Calendar widget for ibm-js framework

## Porting notes

This was ported from dojo-calendar.

Changes include:

* Use delite rather than dijit framework.
* Load tests via requireJS.
* Remove support for old IE (still supports IE11 and Edge).
* Custom elements (<d-calendar> etc.) emit events rather than providing callbacks.
  A callback like onGridDoubleClick() was converted to an event grid-double-click.

Things *not* changed during port:

* Still uses dojodoc format rather than JSDoc.
* Still uses DOH for test framework.
* Still has some dependencies on dojo core; doesn't use jQuery.
* Doesn't fully conform to ibm-js JSHint standards.
* Documentation not updated.

Tests:

* Automated tests probably don't work.
* Not all the manual test files load.  I'm mainly testing with calendar.html.

## Documentation

Old documentation is in https://dojotoolkit.org/reference-guide/dojox/calendar.html
