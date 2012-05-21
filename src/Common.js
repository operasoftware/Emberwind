/*
 * Common.js module contains exception classes and utility methods
 */

/**
 * Clamps the given value based on given parameters
 *
 * @param {number} min Minimum value
 * @param {number} val Value to be clamped
 * @param {number} max Maximum value
 * @returns {number}
 */
function Clamp(min, val, max) {
  return Math.min(max, Math.max(min, val));
}


function lerp(from, to, t) {
	return from + t * (to - from);
}

// ---------------------------------------------------------------------------


function Size2(w, h){
	this.w = w;
	this.h = h;
}

// Point2  -------------------------------------------------------------------

/**
 * Represents a point in a two dimensional space. Arithmetic is performed in place.
 *
 * @param {number} x The x coordinate
 * @param {number} y The y coordinate
 * @constructor
 */
function Point2(x, y) {
    this.x = x;
    this.y = y;
}

Point2.prototype.MagnitudeSquared = function () {
    return this.x * this.x + this.y * this.y;
};

Point2.prototype.Magnitude = function () {
    return Math.sqrt(this.MagnitudeSquared());
};

Point2.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

Point2.prototype.addNew = function (v) {
    return new Point2(this.x + v.x, this.y + v.y);
};

Point2.prototype.sub = function (v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

Point2.prototype.subNew = function (v) {
    return new Point2(this.x - v.x, this.y - v.y);
};

Point2.prototype.mul = function (f) {
    this.x *= f;
    this.y *= f;
    return this;
};

Point2.prototype.mulNew = function (f) {
    return new Point2(this.x * f, this.y * f);
};

Point2.prototype.div = function (f) {
    this.x /= f;
    this.y /= f;
    return this;
};

Point2.prototype.eq = function (v) {
    return this.x === v.x && this.y === v.y;
};

Point2.prototype.neq = function (v) {
    return this.x !== v.x || this.y !== v.y;
};

Point2.prototype.copy = function () {
    return new Point2(this.x, this.y);
};

// ---------------------------------------------------------------------------


// Vec2 ----------------------------------------------------------------------

/**
 * Two dimensional vector class with accompanying functions for manipulating
 * points. Extends the Point2 class
 *
 * @param {number} x The x value
 * @param {number} y The y value
 * @constructor
 * @auguments Point2
 */
function Vec2() {
    Point2.apply(this, arguments);
}

Vec2.prototype = new Point2();

Vec2.prototype.Dot = function (arg) {
    return this.x * arg.x + this.y * arg.y;
};

Vec2.prototype.Cross = function (arg) {
    return this.x * arg.y - this.y * arg.x;
};

Vec2.prototype.Normalize = function () {
    var inv = 1 / Math.sqrt(this.x * this.x + this.y * this.y);
    this.x *= inv;
    this.y *= inv;

    return this;
};

Vec2.prototype.copy = function () {
    return new Vec2(this.x, this.y);
};


/*
function Vec2.XAxis() {
    return new Vec2(1, 0);
}

function Vec2.YAxis() {
    return new Vec2(0, 1);
}

function Vec2.Zero() {
    return nev Vec2(0, 0);
}
*/

// ---------------------------------------------------------------------------


/**
 * Randomizes a number in the specifed range.
 *
 * @param {number} l lower limit of the range.
 * @param {number} h higher limit of the range.
 * @returns {number}
 */
function randomRange(l, h){
	return l + Math.random() * (h-l);
}

/**
 * Randomizes a boolean.
 *
 * @returns {Boolean}
 */
function randomBool(){
    return Math.random() >= 0.5;
}

/**
 * Copies all properties from the source to the destination.
 * 
 * @param {Object} source the source.
 * @param {Object} destination the destination.
 */
function copy(source, destination) {
	for ( var k in source) {
		if (source.hasOwnProperty(k)) destination[k] = source[k];
	}
}

/**
 * Creates a callback function with the correct "this".
 * 
 * @param {Function} callback the callback function to be called.
 * @param {Object} that the wanted "this".
 * @returns {Function} a proper callback function.
 */
function createCallback(callback, that) {
	return function() {
		callback.apply(that, arguments);
	};
}

/**
 * Creates a callback function with the correct "this".
 * Takes additiional arguments that will be added to the beginning of the
 * argument list that will be sent to the callback.
 * 
 * @param {Function} callback the callback function to be called.
 * @param {Object} that the wanted "this".
 * @returns {Function} a proper callback function.
 */
function createCallbackWithArgs(callback, that) {
    var arg = arguments;
    delete arg[0];
    delete arg[1];
    return function() {
        callback.apply(that, arg.concat(arguments));
    };
}

/*
 * RuntimeException class
 */

RuntimeException.prototype = new Error();
RuntimeException.prototype.constructor = RuntimeException;

/**
 * Base exception class
 * 
 * @param message is an optional error description
 * @returns {Exception}
 */
function RuntimeException(message) {
	this.assign(message);
}

/**
 * creates message property and assign value to it. In case of a missing text,
 * empty string is assigned.
 * 
 * @param message is an optional error text
 */
RuntimeException.prototype.assign = function(message) {
	if (message === undefined) {
		this.message = "";
	} else {
		this.message = message;
	}
};

/*
 * AssertionError class
 */

AssertionError.prototype = new RuntimeException();
AssertionError.prototype.constructor = AssertionError;

/**
 * AssertionError stands for an assertion failure
 * 
 * @param message is an optional message
 * @returns {AssertionError}
 */
function AssertionError(message) {
	this.assign(message);
}

/**
 * asserts on a condition
 * 
 * @param condition is a boolean value
 * @param message is an optional error description
 */
function assert(condition, message) {
	if (!condition) {
		throw new AssertionError(message);
	}
}

/*
 * Exception class
 */

Exception.prototype = new RuntimeException();
Exception.prototype.constructor = Exception;

/**
 * Exception stands for a recoverable exception
 * 
 * @param message is an optional message
 * @returns {Exception}
 */
function Exception(message) {
	this.assign(message);
}
