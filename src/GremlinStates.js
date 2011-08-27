Gremlin.messages = {
	kPEAnimStopped : 0,
	kPEHitFromLeft : 1,
	kPlayerEntered : 2,
	kVillagerEntered : 3,
	kWakeUpCall : 4,
	kGremHighJump : 5,
	kGremNewWalkTarget : 6,
	kSuccessfulBlock : 7,
	kIncomingBallRoll : 8,
	kTossLow : 9,
	kPETossed : 10
};

// ----------------------------------------------------------------------------

/**
 * Gremlin idle state.
 */
function GremIdleState() {
	BaseState.apply(this, arguments);

	this.timeInState = 0;
	this.minIdleTime = 0;
	this.isHiding = false;
	this.timeToLootCheck = 0;
	this.attackDelay = 0;

	this.gremAttackDelay = 0.6;
}

GremIdleState.prototype = new BaseState();
GremIdleState.prototype.constructor = GremIdleState;

GremIdleState.prototype.enter = function(msg, fromState) {
	if (this.host.type == Gremlin.types.kGremGuard)
		this.host.setAndPlay(this.host.idle, true);
	else
		this.host.setAndPlay(this.host.idle, false);

	this.host.movement.SetDesiredVelocityVert(0);
	this.timeInState = 0;
	this.minIdleTime = 0;
	this.isHiding = false;
	this.timeToLootCheck = 0;
	if (this.host.type == Gremlin.types.kGremThief)
		if (this.host.droppedBombSecsAgo > 0)
			this.hideWhileBlasting();
		else
			this.stealLoot();
	this.attackDelay = this.gremAttackDelay;
};

GremIdleState.prototype.update = function(dt) {
	if (this.isHiding && this.host.droppedBombSecsAgo > 4) {
		this.setVisible();
		this.setHittable(true);
		this.timeToLootCheck = 0;
	}

	if (this.host.movement.IsOnFloor())
		this.host.movement.SetDesiredVelocityVert(0);
	this.timeInState += dt;

	this.timeToLootCheck -= dt;

	if (this.host.combatAwarenessTarget != null)
		this.attackDelay -= dt;
	else
		this.attackDelay = this.gremAttackDelay;
};

GremIdleState.prototype.leave = function() {
	this.host.setVisible();
	this.host.setHittable(true);
};

GremIdleState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped && (this.minIdleTime > this.timeInState || this.isHiding))
		this.host.setAndPlay(this.host.idle, false);
	else if (this.host.type == Gremlin.types.kGremGuard && message == Gremlin.messages.kPlayerEntered)
		this.fsm.setState(Gremlin.states.kStateLaugh);
	else if (this.host.type == Gremlin.types.kGremThief && message == Gremlin.messages.kPEAnimStopped) {
		this.host.setNewWalkTarget(false, true);
		this.fsm.setState(Gremlin.states.kStateWalk);
	} else if (this.host.type != Gremlin.types.kGremGuard && message == Gremlin.messages.kPEAnimStopped)
		this.fsm.setState(Gremlin.states.kStateWalk);
	else if (this.host.type == Gremlin.types.kGremWarrior && message == Gremlin.messages.kIncomingBallRoll)
		this.fsm.setState(Gremlin.states.kStateBlock);
	else if (this.host.type == Gremlin.types.kGremWarrior && message == Gremlin.messages.kPlayerEntered)
		this.fsm.setState(Gremlin.states.kStatePursue);
	else if (this.host.type == Gremlin.types.kGremStandard && message == Gremlin.messages.kVillagerEntered)
		this.fsm.setState(Gremlin.states.kStatePursue);
};

GremIdleState.prototype.transition = function() {
	if (this.timeToLootCheck <= 0 && this.host.type == Gremlin.types.kGremThief) {
		this.timeToLootCheck = randomRange(0.25, 0.5);
		var pickup = this.host.getLootInAwareness();
		if (pickup) {
			this.host.setWalkTarget(pickup);
			this.fsm.setState(Gremlin.states.kStateWalk);
			return true;
		}
	}

	var condition = ( this.host.type == Gremlin.types.kGremStandard ||
			this.host.type == Gremlin.types.kGremGuard ||
			this.host.type == Gremlin.types.kGremScout ||
			this.host.type == Gremlin.types.kGremWarrior ) &&
			this.host.combatAwarenessTarget != null && this.attackDelay <= 0;

	return this.fsm.tryChangeState(condition, Gremlin.states.kStateSwing)
			|| this.fsm.tryChangeState(this.host.isInPursuit(), Gremlin.states.kStatePursue);
};

GremIdleState.prototype.stealLoot = function() {
	var pickedUpLoot;

	do{
		pickedUpLoot = false;
		var pickup = this.host.getLootInAwareness();
		if (pickup !== null && pickup.getPos().subNew(this.host.getPos()).MagnitudeSquared() < 50 * 50) {
			this.host.setHittable(false);
			this.host.fadeOutIn(0.5);
			var t = pickup.getType();
			this.host.pushExtraLoot(t);
			pickup.enable(false);
			this.isHiding = true;
			pickedUpLoot = true;
		}
	} while (pickedUpLoot)
};

GremIdleState.prototype.hideWhileBlasting = function() {
	this.host.setHittable(false);
	this.host.fadeOutIn(0.5);
	this.isHiding = true;
};

// ----------------------------------------------------------------------------

/**
 * Gremlin swinging weapon state.
 */
function GremSwingState() {
	BaseState.apply(this, arguments);

	this.isWalking = false;
}

GremSwingState.prototype = new BaseState();
GremSwingState.prototype.constructor = GremSwingState;

GremSwingState.prototype.enter = function(msg, fromState) {
	var right = this.host.combatAwarenessTarget ?
			(this.host.combatAwarenessTarget.getPos().x - this.host.getPos().x > 0) : false;
	if (this.host.isFacingRight() ^ right)
		this.host.turn();
	if (right)
		this.host.setAndPlay(this.host.swingARight, false);
	else
		this.host.setAndPlay(this.host.swingALeft, false);
	this.host.movement.SetDesiredVelocity(new Vec2(0, 0));
	app.audio.playFX(randomBool() ? this.host.swingASound : this.host.swingBSound);
};

GremSwingState.prototype.update = function(dt) {
	if (this.host.movement.IsOnFloor())
		this.host.movement.SetDesiredVelocityHoriz(0);
};

GremSwingState.prototype.leave = function() {
	this.host.stopAttack();
};

GremSwingState.prototype.message = function(message) {

};

GremSwingState.prototype.transition = function() {
	if (this.host.animation.isStopped()) {
		if (this.host.combatAwarenessTarget == null)
			this.fsm.setState(Gremlin.states.kStateLaugh);
		else {
			if (this.host.type == Gremlin.types.kGremScout)
				this.fsm.setState(Gremlin.states.kStateWalk);
			else if (this.host.type == Gremlin.types.kGremBouncer)
				this.fsm.setState(Gremlin.states.kStateJump);
			else if (this.host.type == Gremlin.types.kGremStandard) {
				if (this.host.combatAwarenessTarget instanceof PlayerCharacter)
					this.host.combatAwarenessTarget = null;
				if (this.host.isInPursuit())
					this.fsm.setState(Gremlin.states.kStatePursue);
				else
					this.fsm.setState(Gremlin.states.kStateWalk);
			} else
				this.fsm.setState(Gremlin.states.kStateSwing);
		}
		return true;
	}
	return false;
};

// ----------------------------------------------------------------------------

/**
 * Gremlin walking state.
 */
function GremWalkState() {
	BaseState.apply(this, arguments);

	this.walkOffset = 0;
	this.leaderUpdate = 0;
	this.timeToBounce = 0;

	this.speedMultiplier = 0;

	this.minTimeToAttack = 0;

	this.timeToLootCheck = 0;
}

GremWalkState.prototype = new BaseState();
GremWalkState.prototype.constructor = GremWalkState;

GremWalkState.prototype.enter = function(msg, fromState) {
	this.speedMultiplier = (this.host.type == Gremlin.types.kGremThief ||
			this.host.type == Gremlin.types.kGremWarrior ||
			this.host.type == Gremlin.types.kGremBouncer) ? 1.5 : 1;
	this.turnToTarget(true);
	this.walkOffset = randomRange(20, 50);
	this.leaderUpdate = randomRange(0.2, 0.5);
	this.timeToBounce = randomRange(0.5, 1);
	this.minTimeToAttack = fromState == Gremlin.states.kStateSwing ? 1 : 0;
	this.timeToLootCheck = randomRange(0.25, 0.5);
};

GremWalkState.prototype.update = function(dt) {
	this.timeToBounce -= dt;
	this.leaderUpdate -= dt;
	this.minTimeToAttack -= dt;
	if (this.leaderUpdate <= 0 && this.host.type == Gremlin.types.kGremBouncer && this.host.hasLeader()) {
		this.leaderUpdate = randomRange(0.3, 0.7);
		this.host.walkTarget = (new Vec2((!this.host.leader.isFacingRight() ?
				this.walkOffset : -this.walkOffset), 0)).add(this.host.leader.getPos());
		this.turnToTarget();
	}

	var speed = 65.6 * this.speedMultiplier;
	if (this.host.isFacingRight())
		this.host.movement.SetDesiredVelocityHoriz(speed);
	else
		this.host.movement.SetDesiredVelocityHoriz(-speed);

	this.timeToLootCheck -= dt;
};

GremWalkState.prototype.leave = function() {

};

GremWalkState.prototype.message = function(message) {
	if (message == Gremlin.messages.kGremNewWalkTarget)
		this.fsm.setState(Gremlin.states.kStateWalk);

	if (this.host.type == Gremlin.types.kGremWarrior && message == Gremlin.messages.kIncomingBallRoll)
		this.fsm.setState(Gremlin.states.kStateBlock);
	else if (this.host.type == Gremlin.types.kGremWarrior && message == Gremlin.messages.kPlayerEntered)
		this.fsm.setState(Gremlin.states.kStatePursue);
	else if (this.host.type == Gremlin.types.kGremStandard && message == Gremlin.messages.kVillagerEntered)
		this.fsm.setState(Gremlin.states.kStatePursue);
};

GremWalkState.prototype.transition = function() {
	var left = !this.host.isFacingRight();
	if (this.timeToLootCheck <= 0 && this.host.type == Gremlin.types.kGremThief) {
		this.timeToLootCheck = randomRange(0.25, 0.5);
		var pickup = this.host.getLootInAwareness();
		if (pickup) {
			this.host.setWalkTarget(pickup);
			this.turnToTarget();
		}
		return true;
	} else if ((this.host.type == Gremlin.types.kGremStandard || this.host.type == Gremlin.types.kGremScout ||
			this.host.type == Gremlin.types.kGremBouncer) && this.host.combatAwarenessTarget &&
			this.minTimeToAttack <= 0) {
		this.fsm.setState(Gremlin.states.kStateSwing);
		return true;
	} else if (this.host.isInPursuit()) {
		this.fsm.setState(Gremlin.states.kStatePursue);
		return true;
	} else if (this.host.type == Gremlin.types.kGremBouncer && this.host.atWalkTarget()) {
		this.host.setNewWalkTarget(false, true);
		this.fsm.setState(this.host.getDefaultState());
		return true;
	} else if (this.host.atWalkTarget()) {
		this.host.setNewWalkTarget();
		this.fsm.setState(this.host.getDefaultState());
		return true;
	} else if (this.host.movement.IsHittingWall(left) || this.host.movement.IsFacingWall(left)) {
		if (this.host.movement.CanJump(left, 100)) {
			this.fsm.setState(Gremlin.states.kStateJump);
			return true;
		} else if (this.host.movement.CanJump(left, 200)) {
			this.fsm.setState(Gremlin.states.kStateJump, Gremlin.messages.kGremHighJump);
			return true;
		} else {
			// An extra random jump clause for bouncers to try and get them out of a pickle.
			if (this.host.type == Gremlin.types.kGremBouncer && this.host.movement.timeStatic > 1) {
				if (randomBool())
					this.host.turn();
				this.fsm.setState(Gremlin.states.kStateJump, randomBool() ? Gremlin.messages.kGremHighJump : -1);
			} else {
				this.host.setNewWalkTarget(true);
				this.fsm.setState(this.host.getDefaultState());
			}
			return true;
		}
	} else if (this.host.movement.IsFacingEdge(left)) {
		if (this.host.movement.CanDrop(left, 200))
			return false;
		else {
			this.host.setNewWalkTarget(true);
			this.fsm.setState(this.host.getDefaultState());
			return true;
		}
	} else if (this.host.type == Gremlin.types.kGremBouncer && this.timeToBounce < 0 && this.host.movement.IsOnFloor()) {
		this.fsm.setState(Gremlin.states.kStateJump, randomBool() ? Gremlin.messages.kGremHighJump : -1);
		return true;
	}
	return false;
};

GremWalkState.prototype.turnToTarget = function(doPlay) {
	if (doPlay === undefined) doPlay = false;
	if (Math.abs(this.host.walkTarget.x - this.host.getPos().x) > 20) {
		var right = this.host.walkTarget.x - this.host.getPos().x > 0;
		if (this.host.isFacingRight() ? !right : right) {
			this.host.turn();
			doPlay = true;
		}
	}

	if (doPlay) {
		if (this.host.isFacingRight())
			this.host.setAndPlay(this.host.walkRight, true, 0, 1, this.speedMultiplier);
		else
			this.host.setAndPlay(this.host.walkLeft, true, 0, 1, this.speedMultiplier);
	}
};


// ----------------------------------------------------------------------------

/**
 * Gremlin laugh state.
 */
function GremLaughState() {
	BaseState.apply(this, arguments);
}

GremLaughState.prototype = new BaseState();
GremLaughState.prototype.constructor = GremLaughState;

GremLaughState.prototype.enter = function(msg, fromState) {
	var right = this.host.awarenessTarget ? (this.host.awarenessTarget.getPos().x - this.host.getPos().x > 0) : false;
	if (right)
		this.host.setAndPlay(this.host.laughRight, false);
	else
		this.host.setAndPlay(this.host.laughLeft, false);
	this.host.movement.SetDesiredVelocity(new Vec2(0, 0));
	app.game.currentStage.triggerSystem.addVolume(this.host.laughTrigger);
	if (randomBool())
		app.audio.playFX(this.host.laughSound);
	else
		app.audio.playFX(this.host.laughAltSound);
};

GremLaughState.prototype.update = function(dt) {
	if (this.host.movement.IsOnFloor())
		this.host.movement.SetDesiredVelocityHoriz(0);
};

GremLaughState.prototype.leave = function() {
	app.game.currentStage.triggerSystem.removeVolume(this.host.laughTrigger);
};

GremLaughState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped) {
		if (this.host.combatAwarenessTarget != null)
			this.fsm.setState(Gremlin.states.kStateSwing);
		else
			this.fsm.setState(this.host.getDefaultState());
	}
};

// ----------------------------------------------------------------------------

/**
 * Gremlin jump state.
 */
function GremJumpState() {
	BaseState.apply(this, arguments);
}

GremJumpState.prototype = new BaseState();
GremJumpState.prototype.constructor = GremJumpState;

GremJumpState.prototype.enter = function(msg, fromState) {
	var jumpVel = -325;
	if (msg == Gremlin.messages.kGremHighJump)
		jumpVel = -450;
	this.host.movement.SetDesiredVelocityVert(jumpVel);
	if (this.host.isFacingRight())
		this.host.setAndPlay(this.host.jumpRightAnim, false);
	else
		this.host.setAndPlay(this.host.jumpLeftAnim, false);
	app.audio.playFX(this.host.jumpSound);
};

GremJumpState.prototype.update = function(dt) {
	if (this.host.isFacingRight())
		this.host.movement.SetDesiredVelocityHoriz(50);
	else
		this.host.movement.SetDesiredVelocityHoriz(-50);
};

GremJumpState.prototype.leave = function() {
};

GremJumpState.prototype.message = function(message) {

};

GremJumpState.prototype.transition = function(message) {
	return this.fsm.tryChangeState(this.host.movement.IsOnFloor() &&
			this.host.movement.GetDesiredVelocity().y > 0, this.host.getDefaultState()) ||
			this.fsm.tryChangeState(this.host.movement.velocity.y > 0, Gremlin.states.kStateFall);
};

// ----------------------------------------------------------------------------

/**
 * Gremlin fall state.
 */
function GremFallState() {
	BaseState.apply(this, arguments);
}

GremFallState.prototype = new BaseState();
GremFallState.prototype.constructor = GremFallState;

GremFallState.prototype.enter = function(msg, fromState) {
	if (this.host.isFacingRight())
		this.host.setAndPlay(this.host.fallRightAnim, false);
	else
		this.host.setAndPlay(this.host.fallLeftAnim, false);
};

GremFallState.prototype.update = function(dt) {
	if (this.host.isFacingRight())
		this.host.movement.SetDesiredVelocityHoriz(50);
	else
		this.host.movement.SetDesiredVelocityHoriz(-50);
};

GremFallState.prototype.leave = function() {
};

GremFallState.prototype.message = function(message) {

};

GremFallState.prototype.transition = function(message) {
	return this.fsm.tryChangeState(this.host.movement.IsOnFloor(), this.host.getDefaultState());
};

// ----------------------------------------------------------------------------

/**
 * Gremlin damaged state.
 */
function GremDamagedState() {
	BaseState.apply(this, arguments);

	this.stopped = false;
}

GremDamagedState.prototype = new BaseState();
GremDamagedState.prototype.constructor = GremDamagedState;

GremDamagedState.prototype.enter = function(msg, fromState) {
	this.stopped = false;
	if (this.host.isFacingRight())
		this.host.setAndPlay(this.host.hitRight, false);
	else
		this.host.setAndPlay(this.host.hitLeft, false);
	if (this.host.type != Gremlin.types.kGremGuard) {
		if (msg == Gremlin.messages.kPEHitFromLeft)
			this.host.movement.SetDesiredVelocity(new Vec2(150, -150));
		else
			this.host.movement.SetDesiredVelocity(new Vec2(-150, -150));
	}
	app.audio.playFX(randomBool() ? this.host.hurtASound : this.host.hurtBSound);
};

GremDamagedState.prototype.update = function(dt) {
	if (this.host.type == Gremlin.types.kGremGuard) {
		if (this.host.movement.IsOnFloor())
			this.host.movement.SetDesiredVelocityHoriz(0);
	}
};

GremDamagedState.prototype.leave = function() {
};

GremDamagedState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped)
		this.stopped = true;
};

GremDamagedState.prototype.transition = function(message) {
	return this.fsm.tryChangeState(this.stopped && this.host.movement.IsOnFloor(),
			this.host.type == Gremlin.types.kGremWarrior ? Gremlin.states.kStateBlock : this.host.getDefaultState());
};

// ----------------------------------------------------------------------------

/**
 * Gremlin stunned state.
 */
function GremStunnedState() {
	BaseState.apply(this, arguments);

	this.timeInState = 0;
}

GremStunnedState.prototype = new BaseState();
GremStunnedState.prototype.constructor = GremStunnedState;

GremStunnedState.prototype.enter = function(msg, fromState) {
	if (fromState === Gremlin.states.kStateTossed) {
		this.host.setAndPlay(this.host.tweetyBirdAnim);
	}
	else {
		this.host.setAndPlay(this.host.stunnedAnim);
	}

	this.host.movement.SetDesiredVelocity(new Vec2(0, 0));

	this.timeInState = 0;
};

GremStunnedState.prototype.update = function(dt) {
	if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}

	this.timeInState += dt;
};

GremStunnedState.prototype.leave = function() {
};

GremStunnedState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped) {
		this.host.setAndPlay(this.host.tweetyBirdAnim);
	}
};

GremStunnedState.prototype.transition = function(message) {
	return this.fsm.tryChangeState(this.timeInState > 3, Gremlin.states.kStateAwaken);
};

// ----------------------------------------------------------------------------

/**
 * Gremlin awakening state.
 */
function GremAwakenState() {
	BaseState.apply(this, arguments);

}

GremAwakenState.prototype = new BaseState();
GremAwakenState.prototype.constructor = GremAwakenState;

GremAwakenState.prototype.enter = function(msg, fromState) {
	this.host.setAndPlay(this.host.awakenAnim, false);
	this.host.movement.SetDesiredVelocity(new Vec2(0, 0));
};

GremAwakenState.prototype.update = function(dt) {
	if (this.host.movement.IsOnFloor()) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	}
};

GremAwakenState.prototype.leave = function() {
};

GremAwakenState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped) {
		this.fsm.setState(this.host.getDefaultState());
	}
};

// ----------------------------------------------------------------------------

/**
 * Gremlin knocked out state.
 */
function GremKnockedOutState() {
	BaseState.apply(this, arguments);

	this.stopped = false;
}

GremKnockedOutState.prototype = new BaseState();
GremKnockedOutState.prototype.constructor = GremKnockedOutState;

GremKnockedOutState.prototype.enter = function(msg, fromState) {
	if (this.host.bubblePopTrigger) {
		app.game.currentStage.triggerSystem.removeVolume(this.host.bubblePopTrigger, true);
		this.host.bubblePopTrigger = null;
	}
	this.host.setAndPlay(this.host.defeated, true);
	if (msg == Gremlin.messages.kPETossed)
		this.host.movement.SetDesiredVelocityVert(-500);
	else if (msg == Gremlin.messages.kPEHitFromLeft)
		this.host.movement.SetDesiredVelocity(new Vec2(150, -150));
	else
		this.host.movement.SetDesiredVelocity(new Vec2(-150, -150));
	this.host.movement.PushGravity(9.82 * 50);
	this.host.movement.ClearSpheres();
	app.audio.playFX(this.host.deathSound);
	this.host.angleVel = randomRange(-3 * Math.PI, 3 * Math.PI);
	this.host.setDisableWhenOffScreen(true);
};

GremKnockedOutState.prototype.update = function(dt) {

};

GremKnockedOutState.prototype.leave = function() {
};

GremKnockedOutState.prototype.message = function(message) {

};

GremKnockedOutState.prototype.transition = function(message) {
	return false;
};

// ----------------------------------------------------------------------------

/**
 * Gremlin burnt state.
 */
function GremBurntState() {
	BaseState.apply(this, arguments);
}

GremBurntState.prototype = new BaseState();
GremBurntState.prototype.constructor = GremBurntState;

GremBurntState.prototype.enter = function(msg, fromState) {
	this.host.setAndPlay(this.host.burnt, false);
	this.host.movement.SetDesiredVelocity(new Vec2(0, 0));
	app.audio.playFX(this.host.burnSound);
	this.host.triggerSystem.removeObject(this.host);
	this.host.setDisableWhenOffScreen(true);
};

GremBurntState.prototype.update = function(dt) {
	if (this.host.movement.IsOnFloor())
		this.host.movement.SetDesiredVelocityHoriz(0);
};

GremBurntState.prototype.leave = function() {
};

GremBurntState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped) {
		this.host.movement.ClearSpheres();
		this.host.enable(false);
	}
};

GremBurntState.prototype.transition = function(message) {
	return false;
};

// ----------------------------------------------------------------------------

/**
 * Gremlin basket spawn state.
 */
function GremBasketSpawnState() {
	BaseState.apply(this, arguments);
	this.animStopped = false;
}

GremBasketSpawnState.prototype = new BaseState();
GremBasketSpawnState.prototype.constructor = GremBasketSpawnState;

GremBasketSpawnState.prototype.enter = function(msg, fromState) {
	var spawnRight = randomBool();
	if (spawnRight ^ this.host.isFacingRight())
		this.host.turn();

	this.animStopped = false;

	var vel = new Vec2(randomRange(100, 200), randomRange(-400, -300));
	if (!spawnRight)
		vel.x = -vel.x;

	this.host.setAndPlay(this.host.spawnAnim, false);
	this.host.movement.SetDesiredVelocity(vel);
	app.audio.playFX(this.host.spawnSound);
};

GremBasketSpawnState.prototype.update = function(dt) {

};

GremBasketSpawnState.prototype.leave = function() {
};

GremBasketSpawnState.prototype.message = function(message) {
	if (message == Gremlin.messages.kPEAnimStopped) {
		this.animStopped = true;
	}
};

GremBasketSpawnState.prototype.transition = function(message) {
	return this.fsm.tryChangeState(this.animStopped && this.host.movement.IsOnFloor(), this.host.getDefaultState());
};

// ----------------------------------------------------------------------------

/**
 * Gremlin pursue state.
 */
function GremPursueState() {
	BaseState.apply(this, arguments);
	this.shootTimer = 0;
	this.hasLOS = false;
	this.timeToSwing = 0;
	this.timeToUnbunch = 0;
	this.waitingForUnreachableTarget = false;
}

GremPursueState.prototype = new BaseState();
GremPursueState.prototype.constructor = GremPursueState;

GremPursueState.prototype.enter = function(msg, fromState) {
	if (this.host.awarenessTarget)
		this.host.inPursuit = this.host.awarenessTarget;
	this.turnToTarget(true);
	this.shootTimer = 0;
	this.hasLOS = false;
	if (fromState == Gremlin.states.kStateSwing && this.host.type == Gremlin.types.kGremStandard)
		this.timeToSwing = 0.25;
	else
		this.timeToSwing = 0;
	this.timeToUnbunch = 0;
	this.waitingForUnreachableTarget = false;
};

GremPursueState.prototype.update = function(dt) {
	if (this.waitingForUnreachableTarget) {
		this.host.movement.SetDesiredVelocityHoriz(0);
	} else {
		this.timeToUnbunch -= dt;
		this.timeToSwing -= dt;
		this.turnToTarget();
		var kSpeed = 65.6 * 1.5;
		if (this.host.isFacingRight())
			this.host.movement.SetDesiredVelocityHoriz(kSpeed);
		else
			this.host.movement.SetDesiredVelocityHoriz(-kSpeed);

		if (this.host.type == Gremlin.types.kGremWarrior) {
			this.shootTimer += dt;
			if (this.shootTimer >= 2) {
				if (this.host.hasClearLineOfSight())
					this.hasLOS = true;
				else
					this.shootTimer -= 0.5;
			}
		}
	}
};

GremPursueState.prototype.leave = function() {
};

GremPursueState.prototype.turnToTarget = function(doPlay) {
	if (Math.abs(this.host.inPursuit.getPos().x - this.host.getPos().x) < 10 && Math.abs(this.host.inPursuit.getPos().y - this.host.getPos().y) > 50) {
		this.waitingForUnreachableTarget = true;
		this.host.setAndPlay(this.host.idle, false);
		return;
	}
	if (this.waitingForUnreachableTarget) {
		doPlay = true;
		this.waitingForUnreachableTarget = false;
	}

	var right = this.host.inPursuit.getPos().x - this.host.getPos().x > 0;
	if (right ^ this.host.isFacingRight()) {
		this.host.turn();
		doPlay = true;
	}

	if (doPlay) {
		if (this.host.isFacingRight())
			this.host.setAndPlay(this.host.walkRight, true, 0, 1, 1.5);
		else
			this.host.setAndPlay(this.host.walkLeft, true, 0, 1, 1.5);
	}
};

GremPursueState.prototype.message = function(message) {
	if (this.host.type == Gremlin.types.kGremWarrior && message == Gremlin.messages.kIncomingBallRoll)
		this.fsm.setState(Gremlin.states.kStateBlock);
	else if (this.waitingForUnreachableTarget && message == Gremlin.messages.kPEAnimStopped)
		this.turnToTarget();
};

GremPursueState.prototype.transition = function(message) {
	if (this.timeToUnbunch <= 0 && this.host.type == Gremlin.types.kGremStandard) {
		if (this.host.isBunchedUp()) {
			this.host.unbunchTimer = 3;
			this.host.setNewWalkTarget(true, true);
			this.fsm.setState(Gremlin.states.kStateWalk);
			return true;
		}
		this.timeToUnbunch = 2;
	}

	var left = !this.host.isFacingRight();
	if (this.host.combatAwarenessTarget && this.timeToSwing <= 0) {
		this.fsm.setState(Gremlin.states.kStateSwing);
		return true;
	/*todo:} else if (this.hasLOS) {
		this.fsm.setState(Gremlin.states.kStateThrow);
		return true;*/
	} else if (this.host.movement.IsHittingWall(left) || this.host.movement.IsFacingWall(left)) {
		if (this.host.movement.CanJump(left, 100)) {
			this.fsm.setState(Gremlin.states.kStateJump);
			return true;
		} else if (this.host.movement.CanJump(left, 200)) {
			this.fsm.setState(Gremlin.states.kStateJump, Gremlin.messages.kGremHighJump);
			return true;
		} else {
			this.host.inPursuit = null;
			this.fsm.setState(Gremlin.states.kStateLaugh);
		}
	} else if (this.host.movement.IsFacingEdge(left)) {
		if (this.host.movement.CanDrop(left, 200))
			return false;
		else {
			this.host.inPursuit = null;
			this.fsm.setState(Gremlin.states.kStateLaugh);
		}
	}
	return false;
};
