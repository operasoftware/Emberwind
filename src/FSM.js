/**
 * A Finite State Machine.
 *
 * @param {Object} host
 * @param {Array} states a list where even positions are identifiers with a
 *			value that is position / 2 and odd positions are state classes.
 * @param {Function} [onStateChange] a callback function that will be called when
 *			the state changes.
 */
function FSM(host, states, onStateChange) {
	if (host === undefined) return;
	this.host = host;
	this.onStateChange = onStateChange;

	this.stateArray = [];

	for (var i = 0; i < states.length; i += 2) {
		//assert(states[i] == i / 2 && typeof (states[i + 1]) == "function", "State " + i / 2
		//		+ " did not initialize correctly.");
		if(states[i+1] instanceof SimpleState)
			this.stateArray[states[i]] = states[i+1];
		else
			this.stateArray[states[i]] = new states[i + 1](host, this, states[i]);
	}

	this.currentState = fsmStates.kNoState;

	this.numSuspended = 0;
	this.suspendedArray = [];
	this.numPreloaded = 0;
	this.preloadedArray = [];
	this.numStates = this.stateArray.length;
}

FSM.prototype = {};
FSM.prototype.constructor = FSM;

var fsmStates = {
	kNoState : -1,
	kNextState : -2
};

FSM.prototype.enter = function(startState, message) {
	assert(this.currentState == this.kNoState, "FSM is already started when enter was called.");
	this.setState(startState, message);
};

FSM.prototype.leave = function() {
	this.setState(this.kNoState);
};

FSM.prototype.update = function(dt) {
	for (var i = 0; i < this.numSuspended; i++) {
		this.stateArray[this.suspendedArray[i]].suspended(dt);
	}

	if (this.currentState != fsmStates.kNoState) {
		this.stateArray[this.currentState].update(dt);
		if (this.currentState != fsmStates.kNoState) {
			this.stateArray[this.currentState].transition();
		}
	}
};

FSM.prototype.message = function(msg) {
	if (this.currentState != fsmStates.kNoState) {
		this.stateArray[this.currentState].message(msg);
	}
};

FSM.prototype.messageSuspended = function(msg) {
	for (var i = 0; i < this.numSuspended; i++) {
		this.stateArray[this.suspendedArray[i]].message(msg);
	}
};

FSM.prototype.tryChangeState = function(condition, toState, msg, reEnter, suspendedCurrent) {
	if (reEnter === undefined) reEnter = true;
	if (suspendedCurrent === undefined) suspendedCurrent = false;
	if (toState == fsmStates.kNextState) toState = this.currentState + 1;

	if (condition && (toState != this.currentState || reEnter)) {
		this.setState(toState, msg, suspendedCurrent);
		return true;
	}
	return false;
};

FSM.prototype.setState = function(state, msg, suspendCurrent) {
	if (state == fsmStates.kNextState) state = this.currentState + 1;
	assert(state >= fsmStates.kNoState && state < this.numStates, "Trying to set invalid state " + state + ".");
	assert(state == fsmStates.kNoState || this.stateArray[state].stateId == state,
			"Trying to set already active state.");

	if (state == fsmStates.kNoState) {
		for (; this.numSuspended > 0; this.numSuspended--) {
			this.stateArray[this.suspendedArray[this.numSuspended - 1]].leave();
			this.stateArray[this.suspendedArray[this.numSuspended - 1]].isSuspended = false;
		}
		for (; this.numPreloaded > 0; this.numPreloaded--) {
			this.stateArray[this.preloadedArray[this.numPreloaded - 1]].cancelPreload();
		}
	} else {
		if (suspendCurrent) {
			this.stateArray[this.currentState].suspend();
			this.stateArray[this.currentState].isSuspended = true;
			this.suspendedArray[this.numSuspended++] = this.currentState;
		} else {
			if (this.currentState != fsmStates.kNoState) {
				this.stateArray[this.currentState].leave();
			}
			if (!this.stateArray[state].isSuspended) {
				for (; this.numSuspended > 0; this.numSuspended--) {
					this.stateArray[this.suspendedArray[this.numSuspended - 1]].leave();
					this.stateArray[this.suspendedArray[this.numSuspended - 1]].isSuspended = false;
				}
			}
		}
	}

	for (var p = 0; p < this.numPreloaded; ++p) {
		if (this.preloadedArray[p] != state) {
			this.stateArray[this.preloadedArray[p]].cancelPreload();
		}
	}
	this.numPreloaded = 0;

	if (this.onStateChange !== undefined) {
		this.onStateChange(this.currentState, state, msg);
	}

	var lastState = this.currentState;
	this.currentState = state;

	if (this.currentState != fsmStates.kNoState) {
		if (this.stateArray[this.currentState].isSuspended) {
			assert(this.currentState == this.suspendedArray[this.numSuspended - 1],
					"Not resuming the most recently suspended state!");
			this.stateArray[this.currentState].resume(msg, lastState);
			this.stateArray[this.currentState].isSuspended = false;
			--this.numSuspended;
		} else {
			this.stateArray[this.currentState].enter(msg, lastState);
		}
	}
};

FSM.prototype.getCurrentState = function() {
	if (this.currentState == fsmStates.kNoState) return null;
	return this.stateArray[this.currentState];
};

FSM.prototype.preload = function(state) {
	this.preloadedArray[this.numPreloaded++] = state;
};

FSM.prototype.isSuspended = function(state) {
	return this.stateArray[state].isSuspended;
};

// ---------------------------------------------------------------------------

/**
 * FSM for the application states.
 */
function AppFSM() {
	FSM.apply(this, arguments);
}

AppFSM.prototype = new FSM();
AppFSM.prototype.constructor = AppFSM;

AppFSM.prototype.draw = function(render) {
	for (var i = 0; i < this.numSuspended; i++) {
		this.stateArray[this.suspendedArray[i]].draw(render);
	}
	var s = this.getCurrentState();
	if (s) s.draw(render);
};

AppFSM.prototype.onMouse = function(x, y, left, leftPressed) {
	var s = this.getCurrentState();
	if (s) s.onMouse(x, y, left, leftPressed);
};

AppFSM.prototype.onTutorialTip = function(tip) {
	var s = this.getCurrentState();
	if (s) s.onTutorialTip(tip);
};

// ----------------------------------------------------------------------------

/**
 * The base of all states.
 */
function BaseState(host, fsm, id) {
	if(host == undefined) return;
	this.host = host;
	this.fsm = fsm;
	this.stateId = id;
	this.isSuspended = false;
}

BaseState.prototype = {};
BaseState.prototype.constructor = BaseState;

BaseState.prototype.enter = function(message, fromState) {
	throw "Not specified in this state!";
};

BaseState.prototype.leave = function() {
	// throw "Not specified in this state!";
};

BaseState.prototype.update = function(dt) {
	throw "Not specified in this state!";
};

BaseState.prototype.suspended = function(dt) {
	// throw "Not specified in this state!";
};

BaseState.prototype.message = function(msg) {
	//throw "Not specified in this state!";
};

BaseState.prototype.suspend = function() {
	// throw "Not specified in this state!";
};

BaseState.prototype.resume = function(msg, fromState) {
	//throw "Not specified in this state!";
};

BaseState.prototype.preload = function() {
	throw "Not specified in this state!";
};

BaseState.prototype.cancelPreload = function() {
	throw "Not specified in this state!";
};

BaseState.prototype.transition = function() {
	return false;
};

// ----------------------------------------------------------------------------

function SimpleState(id, enterFN, leaveFN, updateFN) {
	this.stateId = id;
	var emptyFN = function() {
	};
	this.isSuspended = false;

	this.enter = enterFN != null ? enterFN : emptyFN;
	this.leave = leaveFN != null ? leaveFN : emptyFN;
	this.update = updateFN != null ? updateFN : emptyFN;
}

SimpleState.prototype = new BaseState();
SimpleState.prototype.constructor = SimpleState;

// ----------------------------------------------------------------------------

/**
 * A interface for the states in the application.
 */
function AppState() {
	this.isSuspended = false;
	this.dimTimeLeft = 0;
}

AppState.prototype = new BaseState();

AppState.prototype.constructor = AppState;

AppState.prototype.update = function(dt) {
	this.dimTimeLeft -= dt;
	if (this.dimTimeLeft < 0) this.dimTimeLeft = 0;
};

AppState.prototype.draw = function(render) {
	if (this.dimTimeLeft > 0) {
		var color = new Pixel32(0, 0, 0, Math.min(255, 765 * this.dimTimeLeft));
		render.drawQuad(null, color);
	}
};

AppState.prototype.suspended = function(dt) {
	this.dimTimeLeft = 0.25;
};

AppState.prototype.onMouse = function(x, y, left, leftPressed) {
	throw "Not implemented yet.";
};

AppState.prototype.onTutorialTip = function(tip) {
	throw "Not implemented yet.";
};

// ----------------------------------------------------------------------------
