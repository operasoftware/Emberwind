var PCStates = {
	kStateIdle            : 0,
	kStateWalk            : 1,
	kStateJump            : 2,
	kStateFall            : 3,
	kStateSwing           : 4,
	kStateKnockedOut      : 5,
	kStateClimb           : 6,
	kStateDamaged         : 7,
	kStateHide            : 8,
	kStateUnhide          : 9,
	kStateBarrelRollStart : 10,
	kStateBarrelRoll      : 11,
	kStateBarrelRollEnd   : 12,
	kStatePickupBrownie   : 13,
	kStateSnuffExplode    : 14,
	kStateSprint          : 15,
	kStateStartShuffle    : 16,
	kStateShuffle         : 17,
	kStateEndShuffle      : 18,
	kStateTurnShuffle     : 19,
	kStateJumpAttack      : 20,
	kStateWhirlwind       : 21,
	kStateBarrelDropStart : 22,
	kStateBarrelDrop      : 23,
	kStateBarrelDropEnd   : 24,
	kStateCaneFlurry      : 25,
	kStateDialogueEvent   : 26,
	kStateDrown           : 27,
	kStateChargeUp        : 28,
	kStateSlide           : 29,

	kMaxStates            : 30
};

var PCMessages = {
	kTransitionedFromSprint : 0,
	kAnimStopped : 1,
	kAnimationEvent: 2,
	kAlreadyHidden : 3,
	kAttackBlocked : 4,
	kCorpseSmacked : 5,
	kBlasted : 6
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter Idle state class
 *
 * @constructor
 */
function IdleState() {
	this.fromSprint = false;
	this.btnHasBeenReleased = false;
	this.timeBtnPressed = 0;

	BaseState.apply(this, arguments);
}

IdleState.prototype.enter = function (msg, fromState) {
	this.fromSprint = msg === PCMessages.kTransitionedFromSprint;

	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.idleRight);
	}
	else {
		this.host.setAndPlay(this.host.idleLeft);
	}

	if (this.fromState === PCStates.kStateWalk || fromState === PCStates.kStateSprint || fromState === PCStates.kStateFall) {
		this.host.movement.SetDesiredVelocity(new Vec2(0, 0));
	}
	else {
		this.host.movement.SetDesiredVelocityVert(0);
	}
	this.timeBtnPressed = 0;
	this.btnHasBeenReleased = !GameInput.instance.held(Buttons.attack);
};

/**
 * Shadow primitive leave function
 */
IdleState.prototype.leave = function () {
};

IdleState.prototype.update = function (dt) {
	// Reduce velocity if on floor
	if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}

	if (GameInput.instance.held(Buttons.attack)) {
		this.timeBtnPressed += dt;
	}
	else {
		this.btnHasBeenReleased = true;
		this.timeBtnPressed = 0;
	}
};

/**
 * Shadow primitive leave function
 */
IdleState.prototype.message = function () {
};

IdleState.prototype.transition = function () {
	var input = GameInput.instance, host = this.host;
	return this.fsm.tryChangeState(!this.host.movement.IsOnFloor(), PCStates.kStateFall) ||
	       this.fsm.tryChangeState(this.fromSprint && (this.host.facingRight && input.held(Buttons.right) || !this.host.facingRight && input.held(Buttons.left)), PCStates.kStateSprint) ||
	       this.fsm.tryChangeState((input.doubleTapped(Buttons.left) || input.doubleTapped(Buttons.right)), PCStates.kStateSprint) ||
	       this.fsm.tryChangeState(input.held(Buttons.left) ^ input.held(Buttons.right), PCStates.kStateWalk) ||
	       this.fsm.tryChangeState(input.held(Buttons.up) && host.isNearLadder() && 
	               !host.movement.IsNearFloor(40, host.movement.CollisionMode.kDiscardNormal), PCStates.kStateClimb) ||
		   this.fsm.tryChangeState(input.held(Buttons.jump), PCStates.kStateJump) ||
		   this.fsm.tryChangeState(input.held(Buttons.down) && host.isNearLadder() &&
		           !host.movement.IsNearFloor(40, host.movement.CollisionMode.kDiscardOneSided), PCStates.kStateClimb) ||
		   this.fsm.tryChangeState(input.held(Buttons.down), PCStates.kStateHide) ||
		   this.fsm.tryChangeState(input.held(Buttons.attack) && this.btnHasBeenReleased, PCStates.kStateSwing);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter Walking state class
 *
 * @constructor
 * @auguments BaseState
 */
function WalkState() {
	this.timeInAir = 0;
	this.timeInState = 0;
	this.btnHasBeenReleased = true;
	this.noAutoSprint = false;

	BaseState.apply(this, arguments);
}

WalkState.prototype = new BaseState();
WalkState.prototype.constructor = WalkState;

WalkState.prototype.enter = function (msg, fromState) {
	this.timeInAir = 0;
	this.timeInState = 0;
	this.btnHasBeenReleased = !GameInput.instance.held(Buttons.attack);

	var input = GameInput.instance;
	if ((this.host.facingRight && input.held(Buttons.left)) || 
	    (!this.host.facingRight && input.held(Buttons.right)))
	{
		this.host.facingRight = !this.host.facingRight;
	}

	// TODO
	this.StartWalkAnim();
	// check parameters
};

WalkState.prototype.leave = function () {
};

WalkState.prototype.update = function (dt) {
	this.timeInState += dt;

	if (this.host.movement.IsOnFloor()) {
		this.timeInAir = 0;
	}
	else {
		this.timeInAir += dt;
	}

	var input = GameInput.instance;
	if (input.held(Buttons.left) ^ input.held(Buttons.right)) {
		if ((this.host.facingRight && input.held(Buttons.left)) || (!this.host.facingRight && input.held(Buttons.right))) {
			this.host.facingRight = !this.host.facingRight;
		}
	}

	// Calculate any speed boost that should be applied if we're getting close to auto dash
	var speedBoost = 0;
	// TODO Game parameters
	
	if (this.host.facingRight) {
		this.host.movement.SetDesiredVelocityTan(150 + speedBoost); // TODO game param instead of 150
	}
	else {
		this.host.movement.SetDesiredVelocityTan(-150 - speedBoost); // TODO game param instead of 150
	}

	if (input.held(Buttons.attack)) {
		this.btnHasBeenReleased = true;
	}
};

WalkState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(!this.host.movement.IsOnFloor() && !this.host.movement.IsNearFloor(20) && this.timeInAir > 0.25, PCStates.kStateFall) ||
	       this.fsm.tryChangeState((input.doubleTapped(Buttons.left) || input.doubleTapped(Buttons.right)) || !this.noAutoSprint && this.timeInState > 1.2, PCStates.kStateSprint) || // TODO Game parameters
	       this.fsm.tryChangeState(!(input.held(Buttons.left) ^ input.held(Buttons.right)), PCStates.kStateIdle) ||
		   this.fsm.tryChangeState(input.held(Buttons.jump), PCStates.kStateJump) ||
		   this.fsm.tryChangeState(input.held(Buttons.attack) && this.btnHasBeenReleased, PCStates.kStateSwing);

};

WalkState.prototype.StartWalkAnim = function () {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.walkRight);
	}
	else {
		this.host.setAndPlay(this.host.walkLeft);
	}

};

// ---------------------------------------------------------------------------

function JumpState() {
	this.cameFromSprint = false;
	this.hforce = 0;
	this.goingUp = true;
	this.btnHasBeenReleased = false;
	this.timeInState = 0;

	BaseState.apply(this, arguments);
}

JumpState.prototype.enter = function (msg, fromState) {
	app.audio.playFX(this.host.jumpSound);

	if (msg === PCMessages.kTransitionedFromSprint){
		this.host.movement.SetDesiredVelocityVert(-559); // TODO game parameters
		this.cameFromSprint = true;
	}
	else {
		this.host.movement.SetDesiredVelocityVert(-430); // TODO game parameters
		this.cameFromSprint = false;
	}

	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.jumpRight, false);
	}
	else {
		this.host.setAndPlay(this.host.jumpLeft, false);
	}
	
	this.hForce = 0;
	this.goingUp = true;
	this.btnHasBeenReleased = !GameInput.instance.held(Buttons.attack);
	this.timeInState = 0;
};

JumpState.prototype.leave = function () {
};

JumpState.prototype.update = function (dt) {
	this.timeInState += dt;
	var input = GameInput.instance;
	if (input.held(Buttons.left) ^ input.held(Buttons.right)) {
		if (this.host.facingRight && input.held(Buttons.left)) {
			this.host.facingRight = false;
			this.host.setAndPlay(this.host.jumpLeft, false);
		}
		if (!this.host.facingRight && input.held(Buttons.right)) {
			this.host.facingRight = true;
			this.host.setAndPlay(this.host.jumpRight, false);
		}

		if (input.held(Buttons.right)) {
			this.hForce = 220; // TODO game parameters
		}
		else if (input.held(Buttons.left)) {
			this.hForce = -220; // TODO game parameters
		}
	}

	this.host.movement.SetDesiredVelocityHoriz(this.hForce);
	this.hForce *= 0.9; // TODO game parameters;

	if (this.goingUp && !input.held(Buttons.jump) && this.timeInState > 0.25) {
		this.goingUp = false;
		this.host.movement.SetDesiredVelocityVert(0);
	}

	if (!input.held(Buttons.attack)) {
		this.btnHasBeenReleased = true;
	}
};

JumpState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(this.host.movement.IsOnFloor() && this.host.movement.desiredVel.y > 0, PCStates.kStateIdle, this.cameFromSprint ? PCMessages.kTransitionedFromSprint : -1) ||
	       this.fsm.tryChangeState(input.held(Buttons.attack) && this.btnHasBeenReleased, PCStates.kStateJumpAttack) ||
	       this.fsm.tryChangeState(this.host.movement.velocity.y > 0, PCStates.kStateFall, this.cameFromSprint ? PCMessages.kTransitionedFromSprint : -1);

};

JumpState.prototype.message = function () {
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter jumping attack state state
 *
 * @constructor
 * @auguments BaseState
 */
function JumpAttackState() {
	this.hForce = 0;
	this.animStopped = false;

	BaseState.apply(this, arguments);
}

JumpAttackState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.jumpAttackRight, false);
		this.host.animation.setSpeed(1.4);
		this.host.playEffectAnim(this.host.jumpAttackEffectRight[this.host.power], false);
	}
	else {
		this.host.setAndPlay(this.host.jumpAttackLeft, false);
		this.host.animation.setSpeed(1.4);
		this.host.playEffectAnim(this.host.jumpAttackEffectLeft[this.host.power], false);
	}

	this.hForce = 0;
	this.animStopped = false;
};

JumpAttackState.prototype.leave = function () {
	this.host.endAttack();
};

JumpAttackState.prototype.message = function (msg) {
	if (msg === PCMessages.kAnimStopped) { this.animStopped = true; }
};

JumpAttackState.prototype.update = function (dt) {
	var input = GameInput.instance;
	if (input.held(Buttons.right)) { this.hForce = 220; }
	else if (input.held(Buttons.left)) { this.hForce = -220; }

	this.host.movement.SetDesiredVelocityHoriz(this.hForce);
	this.hForce *= 0.9;
};

JumpAttackState.prototype.transition = function () {
	return this.fsm.tryChangeState(this.animStopped, PCStates.kStateFall);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter Walking state class
 *
 * @constructor
 * @auguments BaseState
 */
function FallState() {
	this.cameFromSprint = false;
	this.btnHasBeenReleased = false;
	this.hForce = 0;

	BaseState.apply(this, arguments);
}

FallState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.fallRight, false);
	}
	else {
		this.host.setAndPlay(this.host.fallLeft, false);
	}

	this.cameFromSprint = msg === PCMessages.kTransitionedFromSprint;
	this.hForce = 0;

	this.btnHasBeenReleased = !GameInput.instance.held(Buttons.attack);
};

FallState.prototype.leave = function () {
	if (this.host.movement.IsOnFloor()) {
		app.audio.playFX(this.host.landSound);
	}
};

FallState.prototype.update = function (dt) {
	this.hForce *= 0.9;
	var input = GameInput.instance;
	if (input.held(Buttons.left) ^ input.held(Buttons.right)) {
		if (this.host.facingRight && input.held(Buttons.left)) {
			this.host.facingRight = false;
			this.host.setAndPlay(this.host.fallLeft, false);
		}
		if (!this.host.facingRight && input.held(Buttons.right)) {
			this.host.facingRight = true;
			this.host.setAndPlay(this.host.fallRight, false);
		}

		if (input.held(Buttons.right)) {
			this.hForce = 120; // TODO game parameters
		}
		else if (input.held(Buttons.left)) {
			this.hForce = -120; // TODO game parameters
		}
	}

	this.host.movement.SetDesiredVelocityHoriz(this.hForce);

	if (!input.held(Buttons.attack)) {
		this.btnHasBeenReleased = true;
	}

};

FallState.prototype.message = function () {
};

FallState.prototype.transition = function () {
    var host = this.host, input = GameInput.instance;
	return this.fsm.tryChangeState(host.movement.IsOnFloor(), PCStates.kStateIdle, this.cameFromSprint ? PCMessages.kTransitionedFromSprint : -1) ||
	       this.fsm.tryChangeState(input.held(Buttons.attack) && this.btnHasBeenReleased, PCStates.kStateJumpAttack) ||
	       this.fsm.tryChangeState(this.host.isNearLadder() && input.held(Buttons.up) &&
	            !host.movement.IsNearFloor(40, this.host.movement.CollisionMode.kDiscardNormal), PCStates.kStateClimb);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter Climbing state
 *
 * @constructor
 * @auguments BaseState
 */
function ClimbState() {
	this.up = false;
	this.down = false;

	BaseState.apply(this, arguments);
}

ClimbState.prototype.enter = function (msg, fromState) {
	this.host.setAndPlay(this.host.climb, true);
	this.host.animation.gotoTime(0.3);
	this.host.movement.PushGravity(0);
	this.up = true;
	this.host.movement.collisionMode = this.host.movement.CollisionMode.kDiscardOneSided;
	this.host.movement.SetDesiredVelocityHoriz(0);
	this.host.snapToLadder();
};

ClimbState.prototype.leave = function () {
	this.host.movement.PopGravity();
	this.host.movement.collisionMode = this.host.movement.CollisionMode.kNormal;
};

ClimbState.prototype.update = function (dt) {
	var input = GameInput.instance;
	if (this.up && !input.held(Buttons.up)) {
		this.up = false;
		this.host.animation.stop();
	}
	else if (this.down && !input.held(Buttons.down)) {
		this.down = false;
		this.host.animation.stop();
	}
	else if (!this.up && input.held(Buttons.up)) {
		this.up = true;
		this.host.animation.setSpeed(1);
		this.host.animation.play();
	}
	else if (!this.down && input.held(Buttons.down)) {
		this.down = true;
		this.host.animation.setSpeed(-1);
		this.host.animation.play();
	}

	var upDownSpeed = 130;

	if (input.held(Buttons.up)) {
		this.host.animation.setSpeed(upDownSpeed / 65);
		this.host.movement.SetDesiredVelocityVert(-upDownSpeed);
	}
	else if (input.held(Buttons.down)) {
		this.host.animation.setSpeed(-upDownSpeed / 65);
		this.host.movement.SetDesiredVelocityVert(upDownSpeed);
	}
	else {
		this.host.movement.SetDesiredVelocityVert(0);
	}
};

ClimbState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(!this.host.isNearLadder(), PCStates.kStateFall) ||
	       this.fsm.tryChangeState((input.held(Buttons.left) || input.held(Buttons.right)) && !(input.held(Buttons.up) || input.held(Buttons.down)), PCStates.kStateFall) ||
		   this.fsm.tryChangeState(input.held(Buttons.down) && this.host.movement.IsNearFloor(40, this.host.movement.CollisionMode.kDiscardOneSided), PCStates.kStateIdle) ||
		   this.fsm.tryChangeState(input.held(Buttons.up) && this.host.movement.IsNearFloor(40, this.host.movement.CollisionMode.kDiscardNormal), PCStates.kStateIdle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter Sprinting state
 *
 * @constructor
 * @auguments BaseState
 */
function SprintState() {
	this.timeInState = 0;
	this.timeInAir   = 0;
	this.soundInstance = -1;


	BaseState.apply(this, arguments);
}

SprintState.prototype.playSprintAnim = function () {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.sprintRight);
	}
	else {
		this.host.setAndPlay(this.host.sprintLeft);
	}
};

SprintState.prototype.enter = function (msg, fromState) {
	var audio = app.audio;
	var input = GameInput.instance;
	if ((input.doubleTapped(Buttons.left) || input.doubleTapped(Buttons.right)) && (fromState == PCStates.kStateWalk || fromState == PCStates.kStateIdle)) {
		audio.playFX(this.host.forceSound);
		if (this.host.facingRight) {
			this.host.playEffectAnim(this.host.forceDashRight);
		}
		else {
			this.host.playEffectAnim(this.host.forceDashLeft);
		}
	}

	this.soundInstance = audio.playFX(this.host.runSound, true);

	this.playSprintAnim();

	this.timeInState = 0;
	this.timeInAir = 0;
};

SprintState.prototype.leave = function () {
	app.audio.stopSound(this.soundInstance);
};

SprintState.prototype.update = function (dt) {
	var input = GameInput.instance;
	if (input.held(Buttons.left) ^ input.held(Buttons.right)) {
		if ((this.host.facingRight && input.held(Buttons.left)) || (!this.host.facingRight && input.held(Buttons.right))) {
			this.host.facingRight = !this.host.facingRight;
			this.playSprintAnim();
		}
	}

	if (this.host.facingRight) {
		this.host.movement.SetDesiredVelocityTan(300); // TODO Game parameters
	}
	else {
		this.host.movement.SetDesiredVelocityTan(-300); // TODO Game parameters
	}

	this.timeInState += dt;
	this.timeInAir = this.host.movement.IsOnFloor() ? 0 : this.timeInAir + dt;

};

SprintState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(!this.host.movement.IsOnFloor() && !this.host.movement.IsNearFloor(40) && this.timeInAir > 0.25, PCStates.kStateFall, PCMessages.kTransitionedFromSprint) ||
	       this.fsm.tryChangeState(this.host.facingRight && !input.held(Buttons.right) || !this.host.facingRight && !input.held(Buttons.left), PCStates.kStateIdle) ||
		   this.fsm.tryChangeState(input.held(Buttons.jump), PCStates.kStateJump, PCMessages.kTransitionedFromSprint) ||
		   this.fsm.tryChangeState(input.held(Buttons.attack), PCStates.kStateBarrelRollStart);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter hiding state
 *
 * @constructor
 * @auguments BaseState
 */
function HideState() {
	this.endPos = 0.55;

	this.isAttacking = false;
	this.attackTime = 0;
	this.blasted = false;
	this.soundInstance = -1;

	BaseState.apply(this, arguments);
}

HideState.prototype.enter = function (msg, fromState) {
	this.blasted = false;
	this.isAttacking = false;
	this.attackTime = 0;

	var startPos = msg ? (msg === PCMessages.kAlreadyHidden ? this.endPos : 0) : 0;
	
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.hideRight, false, startPos, this.endPos);
	}
	else {
		this.host.setAndPlay(this.host.hideLeft, false, startPos, this.endPos);
	}

	this.host.setInvunerable(true);

	app.audio.playFX(this.host.hideSound);
	this.host.animation.setSpeed(1.5);
};

HideState.prototype.leave = function () {
	if (this.isAttacking) {
		app.audio.stopSound(this.soundInstance);
	}
};

HideState.prototype.message = function (msg) {
	if (msg === PCMessages.kBlasted) {
		this.blasted = true;
	}
};

HideState.prototype.update = function (dt) {
	if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}

	// TODO if rocket jump
};

HideState.prototype.transition = function () {
	var input = GameInput.instance;

var shuffle = (input.held(Buttons.left) || input.held(Buttons.right))
              && ((this.host.facingRight && (input.held(Buttons.left)))
              || (!this.host.facingRight && (input.held(Buttons.right)))
              || (!this.host.movement.IsFacingEdge(!this.host.facingRight) && !this.host.movement.IsFacingWall(!this.host.facingRight)));

	// todo: rocket jump

  return this.fsm.tryChangeState(input.held(Buttons.up), PCStates.kStateUnhide)
      || this.fsm.tryChangeState(shuffle, PCStates.kStateStartShuffle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter unhide state
 *
 * @constructor
 * @auguments BaseState
 */
function UnhideState() {
	this.animStopped = false;
	this.blasted = false;

	BaseState.apply(this, arguments);
}

UnhideState.prototype.enter = function (msg, fromState) {

	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.hideRight, false, 0.55);
	}
	else {
		this.host.setAndPlay(this.host.hideLeft, false, 0.55);
	}

	this.animStopped = false;
	app.audio.playFX(this.host.unhideSound);
	this.host.animation.setSpeed(1.75);

	this.blasted = false;
};

UnhideState.prototype.leave = function () {
	this.host.setInvunerable(false);
};

UnhideState.prototype.message = function (msg) {
	if (msg) {
		if (msg === PCMessages.kAnimStopped) {
			this.animStopped = true;
		}
		else if (msg === PCMessages.kBlasted) {
			this.blasted = true;
		}
	}
};

UnhideState.prototype.update = function (dt) {
	if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}
};

UnhideState.prototype.transition = function () {
	// TODO more state changes
	return this.fsm.tryChangeState(this.animStopped, PCStates.kStateIdle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter Knocked out state
 *
 * @constructor
 * @auguments BaseState
 */
function KnockedOutState() {
	BaseState.apply(this, arguments);
}

KnockedOutState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.knockedOutRight, false);
	}
	else {
		this.host.setAndPlay(this.host.knockedOutLeft, false);
	}
	app.audio.playFX(this.host.deathSound);

};

KnockedOutState.prototype.leave = function () {
};

KnockedOutState.prototype.message = function (msg) {
	if (msg === PCMessages.kCorpseSmacked) {
		if (this.host.facingRight) {
			this.host.setAndPlay(this.host.knockedOutRight, false, 17/20);
		}
		else {
			this.host.setAndPlay(this.host.knockedOutLeft, false, 17/20);
		}
		app.audio.playFX(this.host.deathSound);
	}
};

KnockedOutState.prototype.update = function (dt) {
	if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}
};

KnockedOutState.prototype.transition = function () {
	return false;
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter damaged state
 *
 * @constructor
 * @auguments BaseState
 */
function DamagedState() {

	BaseState.apply(this, arguments);
}

DamagedState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.damagedRight, false);
	}
	else {
		this.host.setAndPlay(this.host.damagedLeft, false);
	}
};

DamagedState.prototype.leave = function () {
};

DamagedState.prototype.message = function (msg) {
};

DamagedState.prototype.update = function (dt) {
};

DamagedState.prototype.transition = function () {
	return this.fsm.tryChangeState(!this.host.animation.playing, PCStates.kStateIdle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter basic attack state
 *
 * @constructor
 * @auguments BaseState
 */
function SwingState() {
	this.isWalking = false;
	this.attackPressed = false;
	this.swingCount = 0;
	this.animStopped = false;
	this.btnPressedLast = false;
	this.hammer = false;

	BaseState.apply(this, arguments);
}

SwingState.prototype.startAnim = function () {
	this.animStopped = false;
	this.hammer = false;
	if (this.host.facingRight) {
		if (this.isWalking) {
			this.hammer = true;
			this.host.setAndPlay(this.host.swingBRight, false);
			this.host.playEffectAnim(this.host.hammerAttackEffectRight[this.host.power], false);
		}
		else {
			this.host.setAndPlay(this.host.swingARight, false);
			this.host.playEffectAnim(this.host.hammerAttackEffectRight[this.host.power], false);
		}
	}
	else {
		if (this.isWalking) {
			this.hammer = true;
			this.host.setAndPlay(this.host.swingBLeft, false);
			this.host.playEffectAnim(this.host.hammerAttackEffectLeft[this.host.power], false);
		}
		else {
			this.host.setAndPlay(this.host.swingALeft, false);
			this.host.playEffectAnim(this.host.hammerAttackEffectLeft[this.host.power], false);
		}
	}

	this.host.animation.setSpeed(this.swingCount > 0 ? 1.5 : 1);
};

SwingState.prototype.enter = function (msg, fromState) {
	this.swingCount = 0;
	this.animStopped = false;
	this.attackPressed = false;
	this.btnPressedLast = GameInput.instance.held(Buttons.attack);
	this.isWalking = fromState == PCStates.kStateWalk;
	this.startAnim();
};

SwingState.prototype.leave = function () {
	this.host.endAttack();
};

SwingState.prototype.message = function (msg) {
	if (msg === PCMessages.kAnimStopped) {
		this.animStopped = true;
	}
};

SwingState.prototype.update = function (dt) {
	var input = GameInput.instance;
	if (!this.btnPressedLast && input.held(Buttons.attack)) {
		this.attackPressed = true;
		this.btnPressedLast = true;
	}
	else if (!input.held(Buttons.attack)) {
		this.btnPressedLast = false;
	}

	if (this.animStopped && this.attackPressed && !this.hammer) {
		this.swingCount++;
		this.attackPressed = false;
		this.startAnim();
	}

	if (this.isWalking) {
		if (this.host.facingRight) {
			this.host.movement.SetDesiredVelocityHoriz(120 * 0.5);
		}
		else {
			this.host.movement.SetDesiredVelocityHoriz(-120 * 0.5);
		}
	}
	else if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}

	if (this.host.stepIn > 0) {
		this.host.movement.SetDesiredVelocityHoriz(this.host.facingRight ? 75 : -75);
	}
};

SwingState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(!this.hammer && (input.held(Buttons.left) && input.held(Buttons.right)), PCStates.kStateWalk) ||
	       this.fsm.tryChangeState(this.animStopped && (!this.attackPressed || this.hammer), PCStates.kStateIdle);
};

// ---------------------------------------------------------------------------

function DialogueEventState() {
	BaseState.apply(this, arguments);

	this.timeInState = 0;
}

DialogueEventState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.idleRight);
	}	else {
		this.host.setAndPlay(this.host.idleLeft);
	}
	this.host.movement.SetDesiredVelocityVert(0);
	this.host.setInvulnerable(false);
	this.host.endAttack();
	this.timeInState = 0;
};

DialogueEventState.prototype.leave = function () {
};

DialogueEventState.prototype.message = function (msg) {
};

DialogueEventState.prototype.update = function (dt) {
	if (this.host.movement.IsOnFloor())
		this.host.movement.SetDesiredVelocityHoriz(0);

	this.timeInState += dt;
};

DialogueEventState.prototype.transition = function () {
	return this.fsm.tryChangeState(this.timeInState > 0.1, PCStates.kStateIdle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter barrellroll start state
 *
 * @constructor
 * @auguments BaseState
 */
function BarrelRollStartState() {
	BaseState.apply(this, arguments);

	this.animStopped = false;
}

BarrelRollStartState.prototype.enter = function (msg, fromState) {

	this.host.startAttack(PCAttackType.kBarrelRollAttack);
	this.host.movement.PushGravity(9.82 * 100);
	this.host.movement.SetDesiredVelocityVert(-500);
	if (this.host.facingRight)
		this.host.setAndPlay(this.host.barrelRollRight, false, 0, 21 / 61);
	else
		this.host.setAndPlay(this.host.barrelRollLeft, false, 0, 21 / 61);

	app.audio.playFX(this.host.barrelRollInitSound);

	this.animStopped = false;
};

BarrelRollStartState.prototype.leave = function () {
	this.host.endAttack();
	this.host.movement.PopGravity();
};

BarrelRollStartState.prototype.message = function (message) {
	if (message == PCMessages.kAnimStopped)
		this.animStopped = true;
};

BarrelRollStartState.prototype.update = function (dt) {
	if (this.host.facingRight)
		this.host.movement.SetDesiredVelocityHoriz(PlayerCharacter.kBarrelRollSpeed);
	else
		this.host.movement.SetDesiredVelocityHoriz(-PlayerCharacter.kBarrelRollSpeed);
};

BarrelRollStartState.prototype.transition = function () {
	return this.fsm.tryChangeState(this.animStopped, PCStates.kStateBarrelRoll);
};

// ---------------------------------------------------------------------------


/**
 * PlayerCharacter barrel roll state
 *
 * @constructor
 * @auguments BaseState
 */

function BarrelRollState() {
	BaseState.apply(this, arguments);

	this.startedAsRightRoll = false;

	this.onGround = false;
	this.soundInstance = 0;
}

BarrelRollState.prototype.enter = function (msg, fromState) {
	this.host.movement.PushGravity(9.82 * 100);
	this.host.startAttack(PCAttackType.kBarrelRollAttack);
	this.startedAsRightRoll = this.host.facingRight;
	this.playRollAnim();
	this.onGround = this.host.movement.IsOnFloor();
	if (this.onGround)
		this.soundInstance = app.audio.playFX(this.host.barrelRollSound, true);
};

BarrelRollState.prototype.playRollAnim = function() {
	if (this.host.facingRight)
		this.host.setAndPlay(this.host.barrelRollRight, true, 21 / 61, 40 / 61);
	else
		this.host.setAndPlay(this.host.barrelRollLeft, true, 21 / 61, 40 / 61);
};

BarrelRollState.prototype.leave = function () {
	this.host.movement.PopGravity();
	this.host.endAttack();
	if (this.onGround)
		app.audio.stopSound(this.soundInstance);
};

BarrelRollState.prototype.message = function (message) {
	if (message == PCMessages.kAttackBlocked)
		this.bounce();
};

BarrelRollState.prototype.bounce = function() {
	this.host.facingRight = !this.host.facingRight;
	this.host.movement.SetDesiredVelocityVert(-150);
	this.playRollAnim();
};

BarrelRollState.prototype.update = function (dt) {
	if (this.host.movement.IsHittingWall(!this.host.facingRight)) {
		app.audio.playFX(this.host.barrelRollBounceSound);
		this.bounce();
	}

	if (this.host.facingRight)
		this.host.movement.SetDesiredVelocityHoriz(PlayerCharacter.kBarrelRollSpeed);
	else
		this.host.movement.SetDesiredVelocityHoriz(-PlayerCharacter.kBarrelRollSpeed);

	var currOnGround = this.host.movement.IsOnFloor();
	if (currOnGround ^ this.onGround) {
		this.onGround = currOnGround;
		if (this.onGround)
			this.soundInstance = app.audio.playFX(this.host.barrelRollSound, true);
		else
			app.audio.stopSound(this.soundInstance);
	}
};

BarrelRollState.prototype.transition = function () {
	var upHeld = GameInput.instance.held(Buttons.up);
	var downHeld = GameInput.instance.held(Buttons.down);
	var leftHeld = GameInput.instance.held(Buttons.left);
	var rightHeld = GameInput.instance.held(Buttons.right);

	return  this.fsm.tryChangeState(upHeld, PCStates.kStateJump) ||
			this.fsm.tryChangeState(this.startedAsRightRoll && !rightHeld || !this.startedAsRightRoll && !leftHeld || downHeld, PCStates.kStateBarrelRollEnd);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter barrel roll end state
 *
 * @constructor
 * @auguments BaseState
 */

function BarrelRollEndState() {
	BaseState.apply(this, arguments);

	this.animStopped = false;
}

BarrelRollEndState.prototype.enter = function (msg, fromState) {
	this.host.startAttack(PCAttackType.kBarrelRollAttack);
	this.host.movement.PushGravity(9.82 * 100);
	if (this.host.facingRight)
		this.host.setAndPlay(this.host.barrelRollRight, false, 41 / 61);
	else
		this.host.setAndPlay(this.host.barrelRollLeft, false, 40 / 61);

	this.animStopped = false;
};

BarrelRollEndState.prototype.leave = function () {
	this.host.endAttack();
	this.host.movement.PopGravity();
};

BarrelRollEndState.prototype.message = function (message) {
	if (message == PCMessages.kAnimStopped)
		this.animStopped = true;
};

BarrelRollEndState.prototype.update = function (dt) {
	if (this.host.facingRight)
		this.host.movement.SetDesiredVelocityHoriz(PlayerCharacter.kBarrelRollSpeed);
	else
		this.host.movement.SetDesiredVelocityHoriz(-PlayerCharacter.kBarrelRollSpeed);
};

BarrelRollEndState.prototype.transition = function () {
	return this.fsm.tryChangeState(this.animStopped, PCStates.kStateIdle, false);
};


// ---------------------------------------------------------------------------

/**
 * PlayerCharacter shuffle state
 *
 * @constructor
 * @auguments BaseState
 */

function ShuffleState() {
	BaseState.apply(this, arguments);

 this.blasted = false;
}

ShuffleState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight)
    this.host.setAndPlay(this.host.shuffleRight);
  else
    this.host.setAndPlay(this.host.shuffleLeft);
  this.host.setInvulnerable(true);

  this.blasted = false;
};

ShuffleState.prototype.leave = function () {
};

ShuffleState.prototype.message = function (message) {
	 if (message == PCMessages.kBlasted)
    this.blasted = true;
};

ShuffleState.prototype.update = function (dt) {
	 if (this.host.facingRight)
    this.host.movement.SetDesiredVelocityHoriz(70);
  else
    this.host.movement.SetDesiredVelocityHoriz(-70);
};

ShuffleState.prototype.transition = function () {
	var input = GameInput.instance;
	var endShuf =  !(input.held(Buttons.left) || input.held(Buttons.right))
                  || this.host.movement.IsFacingEdge(!this.host.facingRight)
                  || this.host.movement.IsFacingWall(!this.host.facingRight);

  return  this.fsm.tryChangeState(this.blasted, PCStates.kStateSnuffExplode)
          || this.fsm.tryChangeState(this.host.facingRight && (input.held(Buttons.left)), PCStates.kStateTurnShuffle)
          || this.fsm.tryChangeState(!this.host.facingRight && (input.held(Buttons.right)), PCStates.kStateTurnShuffle)
          || this.fsm.tryChangeState(endShuf, PCStates.kStateEndShuffle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter start shuffle state
 *
 * @constructor
 * @auguments BaseState
 */

function StartShuffleState() {
	BaseState.apply(this, arguments);

 this.animStopped = false;
 this.blasted = false;
}

StartShuffleState.prototype.enter = function (msg, fromState) {
	 if (this.host.facingRight)
    this.host.setAndPlay(this.host.endShuffleRight, false, 1);
  else
    this.host.setAndPlay(this.host.endShuffleLeft, false, 1);
  this.host.animation.setSpeed(-1);

  this.host.setInvulnerable(true);

  this.animStopped = false;
  this.blasted = false;
};

StartShuffleState.prototype.leave = function () {
};

StartShuffleState.prototype.message = function (message) {
	 if (message == PCMessages.kAnimStopped)
    this.animStopped = true;
  else if (message == PCMessages.kBlasted)
    this.blasted = true;
};

StartShuffleState.prototype.update = function (dt) {
	 if (this.host.movement.IsOnFloor())
    this.host.movement.SetDesiredVelocityHoriz(0);
};

StartShuffleState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(this.blasted, PCStates.kStateSnuffExplode)
      || this.fsm.tryChangeState(this.animStopped && !(input.held(Buttons.left) || input.held(Buttons.right)), PCStates.kStateEndShuffle)
      || this.fsm.tryChangeState(this.animStopped, PCStates.kStateShuffle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter turn shuffle state
 *
 * @constructor
 * @auguments BaseState
 */

function TurnShuffleState() {
	BaseState.apply(this, arguments);

 this.animStopped = false;
 this.blasted = false;
}

TurnShuffleState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight)
    this.host.setAndPlay(this.host.shuffleTurnRight, false);
  else
    this.host.setAndPlay(this.host.shuffleTurnLeft, false);
  this.host.facingRight = !this.host.facingRight;
  this.host.setInvulnerable(true);

  this.animStopped = false;
  this.blasted = false;
};

TurnShuffleState.prototype.leave = function () {
};

TurnShuffleState.prototype.message = function (message) {
	 if (message == PCMessages.kAnimStopped)
    this.animStopped = true;
  else if (message == PCMessages.kBlasted)
   this.blasted = true;
};

TurnShuffleState.prototype.update = function (dt) {
	 if (this.host.movement.IsOnFloor())
    this.host.movement.SetDesiredVelocityHoriz(0);
};

TurnShuffleState.prototype.transition = function () {
	var input = GameInput.instance;
	return this.fsm.tryChangeState(this.blasted, PCStates.kStateSnuffExplode)
      || this.fsm.tryChangeState(this.animStopped && !(input.held(Buttons.left) || input.held(Buttons.right)), PCStates.kStateEndShuffle)
      || this.fsm.tryChangeState(this.animStopped, PCStates.kStateShuffle);
};

// ---------------------------------------------------------------------------

/**
 * PlayerCharacter end shuffle state
 *
 * @constructor
 * @auguments BaseState
 */

function EndShuffleState() {
	BaseState.apply(this, arguments);

 this.animStopped = false;
 this.blasted = false;
}

EndShuffleState.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight)
    this.host.setAndPlay(this.host.endShuffleRight, false);
  else
    this.host.setAndPlay(this.host.endShuffleLeft, false);
  this.host.setInvulnerable(true);

  this.animStopped = false;
  this.blasted = false;
};

EndShuffleState.prototype.leave = function () {
};

EndShuffleState.prototype.message = function (message) {
	 if (message == PCMessages.kAnimStopped)
    this.animStopped = true;
  else if (message == PCMessages.kBlasted)
    this.blasted = true;
};

EndShuffleState.prototype.update = function (dt) {
	 if (this.host.movement.IsOnFloor())
    this.host.movement.SetDesiredVelocityHoriz(0);
};

EndShuffleState.prototype.transition = function () {
	return this.fsm.tryChangeState(this.blasted, PCStates.kStateSnuffExplode)
      || this.fsm.tryChangeState(this.animStopped, PCStates.kStateHide, PCMessages.kAlreadyHidden);
};

// ---------------------------------------------------------------------------



/**
 * PlayerCharacter  state
 *
 * @constructor
 * @auguments BaseState
 */
/*
function TEMPLATE() {

	BaseState.apply(this, arguments);
}

TEMPLATE.prototype.enter = function (msg, fromState) {
	if (this.host.facingRight) {
		this.host.setAndPlay(this.host.);
	}
	else {
		this.host.setAndPlay(this.host.);
	}

};

TEMPLATE.prototype.leave = function () {
};

TEMPLATE.prototype.message = function (message) {
};

TEMPLATE.prototype.update = function (dt) {
};

TEMPLATE.prototype.transition = function () {
	return this.fsm.tryChangeState(PCStates.);
};

*/

// ---------------------------------------------------------------------------

