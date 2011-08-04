

/**
 * Gremlin object.
 */
function Gremlin() {
	HittableGameObject.call(this, true);

	this.droppedBombSecsAgo = -1;
	this.followers = [];
	this.leader = null;
	this.type = Gremlin.types.kGremStandard;
	this.animCallback = null;
	this.extraLoot = null;

	this.awarenessTarget = null;
	this.combatAwarenessTarget = null;

	this.leftWaypoint = 0;
	this.rightWaypoint = 0;
	this.walkTarget = new Vec2(0, 0);
	this.facingRight = true;
	this.drawAngle = 0;
	this.angleVel = 0;
	this.unbunchTimer = 0;
	this.movement = new MovementComponent();
	this.inPursuit = null;
	this.projectile = null;
	this.spawnType = null;

	this.states = [
		Gremlin.states.kStateIdle, GremIdleState,
		Gremlin.states.kStateWalk, GremWalkState,
		Gremlin.states.kStateSwing, GremSwingState,
		Gremlin.states.kStateKnockedOut, GremKnockedOutState,
		Gremlin.states.kStateDamaged, GremDamagedState,
		Gremlin.states.kStateBurnt, GremBurntState,
		Gremlin.states.kStateStunned, GremStunnedState,
		//Gremlin.states.kStateSleeping, GremSleepingState,
		Gremlin.states.kStateBasketSpawn, GremBasketSpawnState,
		Gremlin.states.kStateAwaken, GremAwakenState,
		Gremlin.states.kStateLaugh, GremLaughState,
		Gremlin.states.kStateJump, GremJumpState,
		Gremlin.states.kStateFall, GremFallState
		//Gremlin.states.kStateBlock, GremBlockState,
		//Gremlin.states.kStateUnblock, GremUnblockState,
		//Gremlin.states.kStateThrow, GremThrowState,
		//Gremlin.states.kStatePursue, GremPursueState,
		//Gremlin.states.kStateTossed, GremTossedState,
		//Gremlin.states.kStateBubbled, GremBubbledState
	];

	this.fsm = new FSM(this, this.states);

	// Animations
	this.animation = null;
	this.effectAnim = null;
	this.walkLeft = null;
	this.walkRight = null;
	this.hitLeft = null;
	this.hitRight = null;
	this.idle = null;
	this.swingALeft = null;
	this.swingARight = null;
	this.defeated = null;
	this.burnt = null;
	this.sleeping = null;
	this.spawnAnim = null;
	this.stunnedAnim = null;
	this.laughLeft = null;
	this.laughRight = null;
	this.awakenAnim = null;
	this.tweetyBirdAnim = null;
	this.jumpLeftAnim = null;
	this.jumpRightAnim = null;
	this.fallLeftAnim = null;
	this.fallRightAnim = null;
	this.blockLeftAnim = null;
	this.blockRightAnim = null;
	this.bubbleAnim = null;
	this.bubblePopAnim = null;

	// Audio triggers
	this.attackTrigger = null;
	this.awarenessTrigger = null;
	this.combatAwarenessTrigger = null;
	this.laughTrigger = null;
	this.bubblePopTrigger = null;

	// Sounds
	this.hurtASound = null;
	this.hurtBSound = null;
	this.deathSound = null;
	this.stunSound = null;
	this.burnSound = null;
	this.spawnSound = null;
	this.swingASound = null;
	this.swingBSound = null;
	this.sleepSound = null;
	this.laughSound = null;
	this.laughAltSound = null;
	this.jumpSound = null;
	this.shieldBlockSound = null;
	this.bubblePopSound = null;

	this.displayAlpha = 1;
	this.fadeoutFactor = 0;

	this.triggerSystem = app.game.currentStage.triggerSystem;

	this.animCallback = createCallback(this.onAnimationEvent, this);

	this.disableWhenOffScreen = true;
}

Gremlin.prototype = new HittableGameObject();
Gremlin.prototype.constructor = Gremlin;

Gremlin.states = {
	kStateIdle : 0,
	kStateWalk : 1,
	kStateSwing : 2,
	kStateKnockedOut : 3,
	kStateDamaged : 4,
	kStateBurnt : 5,
	kStateStunned : 6,
	kStateSleeping : 7,
	kStateBasketSpawn : 8,
	kStateAwaken : 9,
	kStateLaugh : 10,
	kStateJump : 11,
	kStateFall : 12,
	kStateBlock : 13,
	kStateUnblock : 14,
	kStateThrow : 15,
	kStatePursue : 16,
	kStateTossed : 17,
	kStateBubbled : 18
};

Gremlin.types = {
	kGremStandard : 0,
	kGremScout : 1,
	kGremBouncer : 2,
	kGremGuard : 3,
	kGremWarrior : 4,
	kGremThief : 5
};

Gremlin.prototype.getCollision = function() {
	var c = [];
	c.push(new Circle(new Vec2(0, -20), 20));
	return c;
};

/**
 * @param {Object} res is a game object from the resource file.
 */
Gremlin.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);
	this.type = res.subtype;

	if (res.subhandles.length > 0) {
		this.leftWaypoint = Math.floor(this.getStartPos().x + res.subhandles[0]);
		this.rightWaypoint = Math.floor(this.getStartPos().x + res.subhandles[0]);
	} else {
		this.leftWaypoint = Math.floor(this.getStartPos().x);
		this.rightWaypoint = Math.floor(this.getStartPos().x);
	}

	for (var i = 0; i < res.subhandles.length; i++) {
		this.leftWaypoint = Math.floor(Math.min(this.leftWaypoint, this.getStartPos().x + res.subhandles[i]));
		this.rightWaypoint = Math.floor(Math.max(this.rightWaypoint, this.getStartPos().x + res.subhandles[i]));
	}
};

/**
 * Initializes the Gremlin.
 */
Gremlin.prototype.init = function(reinit) {
	var circles = this.getCollision();

	this.movement.Init(9.82 * 50, this, circles, app.game.provider);

	HittableGameObject.prototype.init.call(this, reinit);

	switch(this.type) {
		case Gremlin.types.kGremStandard:
			this.spawnType = DropTableType.kDTSoupGrem;
			break;
		case Gremlin.types.kGremScout:
			this.spawnType = DropTableType.kDTScoutGrem;
			break;
		case Gremlin.types.kGremBouncer:
			this.spawnType = DropTableType.kDTBouncerGrem;
			break;
		case Gremlin.types.kGremGuard:
			this.spawnType = DropTableType.kDTGuardGrem;
			break;
		case Gremlin.types.kGremWarrior:
			this.spawnType = DropTableType.kDTWarriorGrem;
			break;
		case Gremlin.types.kGremThief:
			this.spawnType = DropTableType.kDTThiefGrem;
			break;
		case Gremlin.types.kGremMaxType:
			break;
	}


	var numHits = this.getGrade() + 1;
	this.setMaxHitPoints(numHits);
	this.setHitPoints(numHits);

	var rDep = ResourceDepot.instance;
	switch (this.type) {
		case Gremlin.types.kGremGuard:
			this.idle = rDep.getAnimation("GremGuardIdle");
			this.swingARight = rDep.getAnimation("GremGuardSwingRight");
			this.swingALeft = new AnimationHandle(this.swingARight);
			this.swingALeft.mirror();
			this.laughRight = rDep.getAnimation("GremGuardLaughRight");
			this.laughLeft = new AnimationHandle(this.laughRight);
			this.laughLeft.mirror();
			this.sleeping = rDep.getAnimation("GremGuardSleep");
			this.stunnedAnim = rDep.getAnimation("GremGuardStunned");
			this.awakenAnim = rDep.getAnimation("GremGuardAwaken");
			this.burnt = rDep.getAnimation("GremGuardBurnt");
			this.hitRight = rDep.getAnimation("GremGuardHitRight");
			this.hitLeft = new AnimationHandle(this.hitRight);
			this.hitLeft.mirror();
			this.defeated = rDep.getAnimation("GremGuardDefeated");
			this.walkRight = rDep.getAnimation("GremGuardWalkRight");
			this.walkLeft = new AnimationHandle(this.walkRight);
			this.walkLeft.mirror();
			this.spawnAnim = rDep.getAnimation("GremGuardSpawn");
			this.tweetyBirdAnim = rDep.getAnimation("GremGuardTweetyBird");
			break;
		case Gremlin.types.kGremScout:
			this.walkRight = rDep.getAnimation("GremScoutWalkRight");
			this.walkLeft = new AnimationHandle(this.walkRight);
			this.walkLeft.mirror();
			this.stunnedAnim = rDep.getAnimation("GremScoutStunned");
			this.burnt = rDep.getAnimation("GremScoutBurnt");
			this.spawnAnim = rDep.getAnimation("GremScoutSpawn");
			this.defeated = rDep.getAnimation("GremScoutDefeated");
			this.sleeping = rDep.getAnimation("GremScoutSleep");
			this.hitRight = rDep.getAnimation("GremScoutHitRight");
			this.hitLeft = new AnimationHandle(this.hitRight);
			this.hitLeft.mirror();
			this.idle = rDep.getAnimation("GremScoutIdle");
			this.tweetyBirdAnim = rDep.getAnimation("GremScoutTweetyBird");
			this.awakenAnim = rDep.getAnimation("GremScoutAwaken");
			this.jumpRightAnim = rDep.getAnimation("GremScoutJumpRight");
			this.jumpLeftAnim = new AnimationHandle(this.jumpRightAnim);
			this.jumpLeftAnim.mirror();
			this.fallRightAnim = rDep.getAnimation("GremScoutFallRight");
			this.fallLeftAnim = new AnimationHandle(this.fallRightAnim);
			this.fallLeftAnim.mirror();
			this.swingARight = rDep.getAnimation("GremScoutSwingRight");
			this.swingALeft = new AnimationHandle(this.swingARight);
			this.swingALeft.mirror();
			this.laughRight = rDep.getAnimation("GremScoutLaughRight");
			this.laughLeft = new AnimationHandle(this.laughRight);
			this.laughLeft.mirror();
			break;
		case Gremlin.types.kGremThief:
			this.walkRight = rDep.getAnimation("GremThiefWalkRight");
			this.walkLeft = new AnimationHandle(this.walkRight);
			this.walkLeft.mirror();
			this.stunnedAnim = rDep.getAnimation("GremThiefStunned");
			this.burnt = rDep.getAnimation("GremThiefBurnt");
			this.spawnAnim = rDep.getAnimation("GremThiefSpawn");
			this.defeated = rDep.getAnimation("GremThiefDefeated");
			this.sleeping = rDep.getAnimation("GremThiefSleep");
			this.hitRight = rDep.getAnimation("GremThiefHitRight");
			this.hitLeft = new AnimationHandle(this.hitRight);
			this.hitLeft.mirror();
			this.idle = rDep.getAnimation("GremThiefIdle");
			this.tweetyBirdAnim = rDep.getAnimation("GremThiefTweetyBird");
			this.awakenAnim = rDep.getAnimation("GremThiefAwaken");
			this.jumpRightAnim = rDep.getAnimation("GremThiefJumpRight");
			this.jumpLeftAnim = new AnimationHandle(this.jumpRightAnim);
			this.jumpLeftAnim.mirror();
			this.fallRightAnim = rDep.getAnimation("GremThiefFallRight");
			this.fallLeftAnim = new AnimationHandle(this.fallRightAnim);
			this.fallLeftAnim.mirror();
			this.laughRight = rDep.getAnimation("GremThiefLaughRight");
			this.laughLeft = new AnimationHandle(this.laughRight);
			this.laughLeft.mirror();
			break;
		case Gremlin.types.kGremWarrior:
			this.walkRight = rDep.getAnimation("GremWarriorWalkRight");
			this.walkLeft = new AnimationHandle(this.walkRight);
			this.walkLeft.mirror();
			this.stunnedAnim = rDep.getAnimation("GremWarriorStunned");
			this.burnt = rDep.getAnimation("GremWarriorBurnt");
			this.spawnAnim = rDep.getAnimation("GremWarriorSpawn");
			this.defeated = rDep.getAnimation("GremWarriorDefeated");
			this.sleeping = rDep.getAnimation("GremWarriorSleep");
			this.hitRight = rDep.getAnimation("GremWarriorHitRight");
			this.hitLeft = new AnimationHandle(this.hitRight);
			this.hitLeft.mirror();
			this.idle = rDep.getAnimation("GremWarriorIdle");
			this.tweetyBirdAnim = rDep.getAnimation("GremWarriorTweetyBird");
			this.awakenAnim = rDep.getAnimation("GremWarriorAwaken");
			this.blockRightAnim = rDep.getAnimation("GremWarriorBlockRight");
			this.blockLeftAnim = new AnimationHandle(this.blockRightAnim);
			this.blockLeftAnim.mirror();
			this.swingARight = rDep.getAnimation("GremWarriorSwingRight");
			this.swingALeft = new AnimationHandle(this.swingARight);
			this.swingALeft.mirror();
			this.laughRight = rDep.getAnimation("GremWarriorLaughRight");
			this.laughLeft = new AnimationHandle(this.laughRight);
			this.laughLeft.mirror();
			this.jumpRightAnim = rDep.getAnimation("GremWarriorJumpRight");
			this.jumpLeftAnim = new AnimationHandle(this.jumpRightAnim);
			this.jumpLeftAnim.mirror();
			this.fallRightAnim = rDep.getAnimation("GremWarriorFallRight");
			this.fallLeftAnim = new AnimationHandle(this.fallRightAnim);
			this.fallLeftAnim.mirror();
			break;
		case Gremlin.types.kGremBouncer:
			this.walkRight = rDep.getAnimation("GremBouncerWalkRight");
			this.walkLeft = new AnimationHandle(this.walkRight);
			this.walkLeft.mirror();
			this.stunnedAnim = rDep.getAnimation("GremBouncerStunned");
			this.burnt = rDep.getAnimation("GremBouncerBurnt");
			this.spawnAnim = rDep.getAnimation("GremBouncerSpawn");
			this.defeated = rDep.getAnimation("GremBouncerDefeated");
			this.sleeping = rDep.getAnimation("GremBouncerSleep");
			this.hitRight = rDep.getAnimation("GremBouncerHitRight");
			this.hitLeft = new AnimationHandle(this.hitRight);
			this.hitLeft.mirror();
			this.idle = rDep.getAnimation("GremStandardIdle");
			this.tweetyBirdAnim = rDep.getAnimation("GremBouncerTweetyBird");
			this.awakenAnim = rDep.getAnimation("GremBouncerAwaken");
			this.jumpRightAnim = rDep.getAnimation("GremBouncerJumpRight");
			this.jumpLeftAnim = new AnimationHandle(this.jumpRightAnim);
			this.jumpLeftAnim.mirror();
			this.fallRightAnim = rDep.getAnimation("GremBouncerFallRight");
			this.fallLeftAnim = new AnimationHandle(this.fallRightAnim);
			this.fallLeftAnim.mirror();
			this.swingARight = rDep.getAnimation("GremBouncerSwingRight");
			this.swingALeft = new AnimationHandle(this.swingARight);
			this.swingALeft.mirror();
			this.laughRight = rDep.getAnimation("GremBouncerLaughRight");
			this.laughLeft = new AnimationHandle(this.laughRight);
			this.laughLeft.mirror();
			break;
		case Gremlin.types.kGremStandard:
			this.walkRight = rDep.getAnimation("GremStandardWalkRight");
			this.walkLeft = new AnimationHandle(this.walkRight);
			this.walkLeft.mirror();
			this.stunnedAnim = rDep.getAnimation("GremStandardStunned");
			this.burnt = rDep.getAnimation("GremStandardBurnt");
			this.spawnAnim = rDep.getAnimation("GremStandardSpawn");
			this.defeated = rDep.getAnimation("GremStandardDefeated");
			this.sleeping = rDep.getAnimation("GremStandardSleep");
			this.hitRight = rDep.getAnimation("GremStandardHitRight");
			this.hitLeft = new AnimationHandle(this.hitRight);
			this.hitLeft.mirror();
			this.idle = rDep.getAnimation("GremStandardIdle");
			this.tweetyBirdAnim = rDep.getAnimation("GremStandardTweetyBird");
			this.awakenAnim = rDep.getAnimation("GremStandardAwaken");
			this.jumpRightAnim = rDep.getAnimation("GremStandardJumpRight");
			this.jumpLeftAnim = new AnimationHandle(this.jumpRightAnim);
			this.jumpLeftAnim.mirror();
			this.fallRightAnim = rDep.getAnimation("GremStandardFallRight");
			this.fallLeftAnim = new AnimationHandle(this.fallRightAnim);
			this.fallLeftAnim.mirror();
			this.swingARight = rDep.getAnimation("GremStandardSwingRight");
			this.swingALeft = new AnimationHandle(this.swingARight);
			this.swingALeft.mirror();
			this.laughRight = rDep.getAnimation("GremStandardLaughRight");
			this.laughLeft = new AnimationHandle(this.laughRight);
			this.laughLeft.mirror();
			break;
	}

	this.bubbleAnim = rDep.getAnimation("bubble_idle");
	this.bubblePopAnim = rDep.getAnimation("bubble_pop");

	this.drawAngle = 0;
	this.angleVel = 0;

	this.awarenessRect = new Rectf(-200, -200, 200, 200);
	this.combatAwarenessRect = new Rectf(-60, -70, 60, 0);

	if (this.type == Gremlin.states.kGremWarrior) {
		this.awarenessRect = new Rectf(-300, -200, 300, 200);
		this.combatAwarenessRect = new Rectf(-40, -70, 40, 0);
	}

	// Add triggers
	this.attackTrigger = new TriggerVolume("GremAttack", new Rectf(0, -30, 50, -20), this, null, "pattack");
	this.awarenessTrigger = new TriggerVolume("awareness", this.awarenessRect, this,
			createCallback(this.onAwareness, this), "enter", "exit");
	this.combatAwarenessTrigger = new TriggerVolume("comabt_awareness", this.combatAwarenessRect, this,
			createCallback(this.onCombatAwareness, this), "enter", "exit");
	this.laughTrigger = new TriggerVolume("laugh_area", new Rectf(-300, -200, 300, 200), this, null, "laugh");

	if (this.enabled) {
		this.triggerSystem.addVolume(this.awarenessTrigger);
		this.triggerSystem.addVolume(this.combatAwarenessTrigger);

		var triggerObj = new TriggerObject(this, createCallback(this.onTrigger, this), this.getHittableRect());
		this.triggerSystem.addObject(triggerObj);
	}

	this.hurtASound = rDep.getSFX("grem_hurt_a");
	this.hurtBSound = rDep.getSFX("grem_hurt_b");
	this.deathSound = rDep.getSFX("grem_death");
	this.stunSound = rDep.getSFX("grem_stun");
	this.burnSound = rDep.getSFX("grem_burnt");
	this.spawnSound = rDep.getSFX("grem_spawn");
	this.swingASound = rDep.getSFX("grem_attack_a");
	this.swingBSound = rDep.getSFX("grem_attack_b");
	this.shieldBlockSound = rDep.getSFX("metal_hit");
	this.sleepSound = rDep.getSFX("grem_sleep");
	this.laughSound = rDep.getSFX("grem_laugh");
	this.laughAltSound = rDep.getSFX("grem_laugh_alt");
	this.jumpSound = rDep.getSFX("grem_jump");
	this.bubblePopSound = rDep.getSFX("bubba_pop");

	this.unbunchTimer = 0;
	this.droppedBombSecsAgo = -1;

	if (this.type == Gremlin.types.kGremBouncer)
		this.pickLeader();

	this.setNewWalkTarget();

	if (randomBool())
		this.makeOffHand();

	this.fsm.setState(this.getDefaultState());
};

/**
 * Deinitializes the Gremlin.
 */
Gremlin.prototype.deinit = function() {
	if (this.attackTrigger) {
		this.triggerSystem.removeVolume(this.attackTrigger, true);
		this.attackTrigger = null;
	}
	if (this.awarenessTrigger) {
		this.triggerSystem.removeVolume(this.awarenessTrigger, true);
		this.awarenessTrigger = null;
	}
	if (this.combatAwarenessTrigger) {
		this.triggerSystem.removeVolume(this.combatAwarenessTrigger, true);
		this.combatAwarenessTrigger = null;
	}
	if (this.laughTrigger) {
		this.triggerSystem.removeVolume(this.laughTrigger, true);
		this.laughTrigger = null;
	}
	if (this.bubblePopTrigger) {
		this.triggerSystem.removeVolume(this.bubblePopTrigger, true);
		this.bubblePopTrigger = null;
	}

	this.triggerSystem.removeObject(this);
};

Gremlin.prototype.onDisable = function() {
	this.triggerSystem.removeVolume(this.attackTrigger);
	this.triggerSystem.removeVolume(this.awarenessTrigger);
	this.triggerSystem.removeVolume(this.combatAwarenessTrigger);
	this.triggerSystem.removeVolume(this.laughTrigger);
	this.triggerSystem.removeVolume(this.bubblePopTrigger);
	this.triggerSystem.removeObject(this);
	this.setLeader(null);
	this.disbandFollowers();
};

Gremlin.prototype.onEnable = function() {
	this.triggerSystem.addVolume(this.awarenessTrigger);
	this.triggerSystem.addVolume(this.combatAwarenessTrigger);

	var triggerObj = new TriggerObject(this, createCallback(this.onTrigger, this), this.getHittableRect());
	this.triggerSystem.addObject(triggerObj);
};

Gremlin.prototype.update = function(dt) {
	if (this.droppedBombSecsAgo >= 0)
		this.droppedBombSecsAgo += dt;
	this.unbunchTimer -= dt;
	this.displayAlpha = Math.max(0, this.displayAlpha - this.fadeoutFactor * dt);
	this.fsm.update(dt);
	HittableGameObject.prototype.update.call(this, dt);
	this.movement.Update(dt);
	this.animation.update(dt);
	if (this.effectAnim != null)
		this.effectAnim.update(dt);

	this.drawAngle += this.angleVel * dt;

	if (this.type == Gremlin.types.kGremWarrior)
		if (this.incomingBallRoll())
			this.fsm.message(Gremlin.messages.kIncomingBallRoll);

	if (this.isAlive() && !this.isInRect(app.game.currentStage.gamePlayLayerExtent))
		this.kill();
};

Gremlin.prototype.fadeOutIn = function(seconds) {
	this.fadeoutFactor = 1 / seconds;
};

Gremlin.prototype.setVisible = function() {
	this.displayAlpha = 1;
	this.fadeoutFactor = 0;
};

/**
 * Gets the position of the Gremlin.
 *
 * @returns {Vec2}
 */
Gremlin.prototype.getPos = function() {
	return this.movement.position;
};

/**
 * Sets the position of the Gremlin.
 *
 * @param {Vec2} pos Position.
 * @param {Boolean} dropToGround
 */
Gremlin.prototype.setPos = function(pos, dropToGround) {
	if (dropToGround === undefined) dropToGround = true;

	this.movement.SetPosition(pos);
	if (dropToGround)
		this.movement.DropToGround();
	this.updateInWaterFlag();
};

/**
 * Draw the Gremlin.
 *
 * @param {Render} render
 * @param {Number} x Camera x position.
 * @param {Number} y Camera y position.
 */
Gremlin.prototype.draw = function(render, x, y) {
	if (this.isInScreen() && this.visible) {
		var p = this.getPos();
		if (this.animation != null)
			this.animation.draw(render, p.x + x, p.y + y, this.drawAngle, this.displayAlpha);
		if (this.effectAnim != null)
			this.effectAnim.draw(render, p.x, p.y);

		HittableGameObject.prototype.draw.call(this, render, p.x + x, p.y + y);
	}
};

/**
 * When a trigger have been trigged a Gremlin should act on it.
 *
 * @param {String} param
 * @param {TriggerVolume} volume
 * @param {TriggerObject} object
 */
Gremlin.prototype.onTrigger = function(param, volume, object) {
	if (this.isHiding()) return;

	var fromLeft = (volume.getParent() ? volume.getParent().getPos().x : volume.getCenter().x) < this.getPos().x;

	var playerType = 0; // todo : L506
	var hitByPlayer = volume.getParent() && volume.getParent().getType() == playerType;

	var game = app.game;
	if (param == "damage" || param == "damage_pwr") {
		game.setCurrentFoe(this);
		if (this.fsm.currentState == Gremlin.states.kStateBlock && this.isFacingRight() != fromLeft) {
			this.fsm.message(Gremlin.messages.kSuccessfulBlock);
			this.block(fromLeft);
			Audio.instance.playFX(this.shieldBlockSound);
			if (volume.getParent())
				volume.getParent().wasDeflected();
		} else {
			if (hitByPlayer)
				game.addChainHit();
			var critHit = randomRange(0, 99) < 5;
			this.hit(param == "damage" ? 1 : game.getCurrentPower() + 1, fromLeft, false, false, critHit);
		}
	} else if (param == "stun" || param == "stun_pwr") {
		game.setCurrentFoe(this);
		if (this.fsm.currentState == Gremlin.states.kStateBlock && !(this.isFacingRight() ? fromLeft : !fromLeft)) {
			this.fsm.message(Gremlin.messages.kSuccessfulBlock);
			this.block(fromLeft);
			app.audio.playFX(this.shieldBlockSound);
			if (volume.getParent())
				volume.getParent().wasDeflected();
		} else {
			if (hitByPlayer)
				app.game.addChainHit();
			this.stun(param == "stun" ? 1 : app.game.getCurrentPower() + 1, fromLeft);
		}
	} else if (this.isAlive()) {
		if (param == "safe_zone_enter")
			this.burn(true);
		else if (param == "laugh")
			this.fsm.message(Gremlin.messages.kWakeUpCall);
		else if (param == "kill")
			this.kill();
		else if (param == "smash" && !this.isInvunerable())
			this.kill();
		else if (param == "nap" && !this.isInvunerable())
			this.nap(fromLeft);
	}
};

Gremlin.prototype.setDamagedState = function(fromLeft, hitsTaken) {
	if (this.fsm.currentState == Gremlin.states.kStateBubbled)
		this.kill();
	else {
		this.fsm.setState(Gremlin.states.kStateDamaged, fromLeft ? Gremlin.messages.kPEHitFromLeft : -1);
		if (this.type != Gremlin.types.kGremThief)
			this.spawnPickups(hitsTaken);
		else {
			return;
			// todo: make gameobjectfactory
			var projectile = GameObjectFactory.CreateObject("pickupprojectile", kPickupGoldenAcorn);
			projectile.setType(kPickupGoldenAcorn);
			projectile.setCustomType(PickupProjectile.types.kBomb, true);
			projectile.init(false);
			projectile.setPos(this.getPos() + new Vec2(0, -40));
			projectile.bounce(new Vec2(fromLeft ? -100 : 100, -100));
			app.game.addGameObject(projectile);
			this.droppedBombSecsAgo = 0;
		}
	}
};

Gremlin.prototype.setKnockedOutState = function(fromLeft, hitsTaken, tossed) {
	app.game.getTallyInfo().gremlins++
	this.fsm.setState(Gremlin.states.kStateKnockedOut, tossed ? Gremlin.messages.kPETossed :
			(fromLeft ? Gremlin.messages.kPEHitFromLeft : -1));
	if (this.type == Gremlin.types.kGremThief)
		this.spawnPickups(1, true);
	else
		this.spawnPickups(hitsTaken, true);
};

Gremlin.prototype.setCorpseSmackedState = function(fromLeft) {
	if (fromLeft)
		this.movement.SetDesiredVelocity(new Vec2(150, -150));
	else
		this.movement.SetDesiredVelocity(new Vec2(-150, -150));
	app.audio.playFX(this.deathSound);
	this.angleVel = randomRange(-3 * Math.PI, 3 * Math.PI);
};

Gremlin.prototype.setStunnedState = function(fromLeft, hitsTaken) {
	if (this.fsm.currentState == Gremlin.states.kStateBubbled)
		this.kill();
	else {
		this.fsm.setState(Gremlin.states.kStateStunned);
		if (this.type != Gremlin.types.kGremThief)
			this.spawnPickups(hitsTaken);
	}
};

Gremlin.prototype.setBurntState = function(fromLeft, hitsTaken) {
	if (this.fsm.currentState == Gremlin.states.kStateBubbled)
		this.kill();
	else {
		app.game.getTallyInfo().gremlins++;
		this.fsm.setState(Gremlin.states.kStateBurnt);
		if (this.type == Gremlin.types.kGremThief)
			this.spawnPickups(1, true);
		else
			this.spawnPickups(hitsTaken, true);
	}
};

Gremlin.prototype.setNapState = function(fromLeft) {
	if (this.fsm.currentState == Gremlin.states.kStateBubbled)
		this.kill();
	else
		this.fsm.setState(Gremlin.states.kStateSleeping);
};

Gremlin.prototype.setTossedState = function(fromLeft, low) {
	if (this.fsm.currentState == Gremlin.states.kStateBubbled)
		this.kill();
	else
		this.fsm.setState(Gremlin.states.kStateTossed, low ? Gremlin.messages.kTossLow : -1);
};

Gremlin.prototype.setBubbledState = function(fromLeft) {
	if (this.bubblePopTrigger != null) {
		this.bubblePopTrigger = new TriggerVolume("bubble_pop", new Rectf(-35, -70, 35, 0), this,
				creteCallback(this.onPopBubble, this), "pop");
		this.triggerSystem.addVolume(this.bubblePopTrigger);
	}
	this.fsm.setState(Gremlin.states.kStateBubbled);
};

Gremlin.prototype.onPopBubble = function(param, volume, object) {
	if (object.particle instanceof PlayerCharacter)
		this.kill();
};

/**
 * @returns {Boolean}
 */
Gremlin.prototype.isFacingRight = function() {
	return this.facingRight;
};

/**
 * Sets an animation and starts playing it.
 *
 * @param {AnimationHandle} h
 * @param {Boolean} loop
 * @param {Number} start
 * @param {Number} end
 * @param {Number} speed
 */
Gremlin.prototype.setAndPlay = function(h, loop, start, end, speed) {
	if (loop === undefined) loop = true;
	if (start === undefined) start = 0;
	if (end === undefined) end = 1;
	if (speed === undefined) speed = 1;

	this.animation = h;
	this.animation.setRange(start, end);
	this.animation.rewind(); // todo: temporary solution
	this.animation.play(loop);
	this.animation.setCallback(this.animCallback);
	this.animation.setSpeed(speed);
};

Gremlin.prototype.atLeftWaypoint = function() {
	return (!this.isFacingRight() && this.movement.position.x <= this.leftWaypoint);
};

Gremlin.prototype.atRightWaypoint = function() {
	return (this.isFacingRight() && this.movement.position.x >= this.rightWaypoint);
};

Gremlin.prototype.atWalkTarget = function() {
	return Math.abs(this.getPos().x - this.walkTarget.x) < 2.5;
};

Gremlin.prototype.turn = function() {
	this.facingRight = !this.facingRight;
};

/**
 * @returns {Boolean}
 */
Gremlin.prototype.hasTurned = function() {
	return !this.facingRight;
};


/**
 * @param {String} param
 * @param {AnimationHandle} anim
 * @param {}
		*/
Gremlin.prototype.onAnimationEvent = function(param, anim) {
	if (param == "stopped")
		this.fsm.message(Gremlin.messages.kPEAnimStopped);
	else if (param == "start_attack")
		this.startAttack();
	else if (param == "stop_attack")
		this.stopAttack();
};

Gremlin.prototype.bounce = function() {
	this.fsm.setState(Gremlin.states.kStateBasketSpawn);
};

Gremlin.prototype.getDefaultState = function() {
	switch (this.type) {
		case Gremlin.types.kGremStandard:
			return Gremlin.states.kStateIdle;
			break;
		case Gremlin.types.kGremScout:
			return Gremlin.states.kStateIdle;
			break;
		case Gremlin.types.kGremBouncer:
			return Gremlin.states.kStateWalk;
			break;
		case Gremlin.types.kGremGuard:
			return Gremlin.states.kStateIdle;
			break;
		case Gremlin.types.kGremWarrior:
			return Gremlin.states.kStateIdle;
			break;
		case Gremlin.types.kGremThief:
			return Gremlin.states.kStateIdle;
			break;
	}
	return Gremlin.states.kStateIdle;
};

Gremlin.prototype.onAwareness = function(param, volume, object) {
	if (param == "enter") {
		if (object.particle instanceof Villager) {
			this.awarenessTarget = object.particle;
			this.fsm.message(Gremlin.messages.kVillagerEntered);
		} else if (this.type != Gremlin.types.kGremStandard && object.particle instanceof PlayerCharacter) {
			this.awarenessTarget = object.particle;
			this.fsm.message(Gremlin.messages.kPlayerEntered);
		} else if (this.type == Gremlin.types.kGremBouncer && !this.hasLeader()) {
			var grem = object.particle;
			if (grem && grem.type == Gremlin.types.kGremBouncer && grem.isLeader()) {
				this.disbandFollowers();
				this.setLeader(grem);
			}
		}
	} else if (param == "exit") {
		if (object.particle == this.awarenessTarget)
			this.awarenessTarget = null;
	}
};

Gremlin.prototype.onCombatAwareness = function(param, volume, object) {
	if (param == "enter") {
		if (object.particle instanceof Villager || object.particle instanceof PlayerCharacter) {
			this.combatAwarenessTarget = object.particle;
		}
	} else if (param == "exit") {
		if (object.particle == this.combatAwarenessTarget)
			this.combatAwarenessTarget = null;
	}
};

Gremlin.prototype.startAttack = function() {
	this.triggerSystem.addVolume(this.attackTrigger);
};

Gremlin.prototype.stopAttack = function() {
	this.triggerSystem.flushVolume(this.attackTrigger);
	this.triggerSystem.removeVolume(this.attackTrigger);
};

/**
 * @param {Boolean} abandonCurrent
 * @param {Boolean} randomWalk
 */
Gremlin.prototype.setNewWalkTarget = function(abandonCurrent, randomWalk) {
	if (abandonCurrent === undefined) abandonCurrent = false;
	if (randomWalk === undefined) randomWalk = false;

	if (this.hasLeader())
		this.setWalkTarget(this.leader);
	else {
		this.walkTarget.y = this.getPos().y;
		if (randomWalk) {
			var leftL = Math.max(this.getPos().x - 150, this.leftWaypoint);
			var leftH = Math.max(this.getPos().x - 50, this.leftWaypoint);
			var rightL = Math.min(this.getPos().x + 50, this.rightWaypoint);
			var rightH = Math.min(this.getPos().x + 150, this.rightWaypoint);
			this.walkTarget.x = randomBool() ? randomRange(leftL, leftH) : randomRange(rightL, rightH);
		} else {
			if (abandonCurrent) {
				if (this.isFacingRight())
					this.walkTarget.x = this.leftWaypoint;
				else
					this.walkTarget.x = this.rightWaypoint;
			} else {
				if (Math.abs(this.getPos().x - this.rightWaypoint) < 5)
					this.walkTarget.x = this.leftWaypoint;
				else if (Math.abs(this.getPos().x - this.leftWaypoint) < 5)
					this.walkTarget.x = this.rightWaypoint;
				else if (Math.abs(this.getPos().x - this.leftWaypoint) > Math.abs(this.getPos().x - this.rightWaypoint))
					this.walkTarget.x = this.leftWaypoint;
				else
					this.walkTarget.x = this.rightWaypoint;
			}
		}
	}
};

/**
 * @param {GameObject} obj
 */
Gremlin.prototype.setWalkTarget = function(obj) {
	this.walkTarget = new Vec2(obj.getPos());
};

/**
 * @returns {Rectf}
 */
Gremlin.prototype.getObjectExtent = function() {
	return new Rectf(-30, -60, 30, 0);
};

/**
 * @returns {Rectf}
 */
Gremlin.prototype.getHittableRect = function() {
	return new Rectf(-20, -60, 20, 0);
};

Gremlin.prototype.isHiding = function() {
	return this.fadeoutFactor != 0;
};

Gremlin.prototype.hasLeader = function() {
	return this.leader != null && this.leader != this;
};

Gremlin.prototype.isLeader = function() {
	return this.leader == this;
};

Gremlin.prototype.makeOffHand = function() {
	this.idle.mirror();
	this.defeated.mirror();
	this.burnt.mirror();
	this.sleeping.mirror();
	this.spawnAnim.mirror();
	this.stunnedAnim.mirror();
	this.awakenAnim.mirror();
	this.tweetyBirdAnim.mirror();

	var t;
	if (this.walkLeft != null) {
		t = this.walkLeft;
		this.walkLeft = this.walkRight;
		this.walkRight = t;
		this.walkLeft.mirror();
		this.walkRight.mirror();
	}
	if (this.hitLeft != null) {
		t = this.hitLeft;
		this.hitLeft = this.hitRight;
		this.hitRight = t;
		this.hitLeft.mirror();
		this.hitRight.mirror();
	}
	if (this.swingALeft != null) {
		t = this.swingALeft;
		this.swingALeft = this.swingARight;
		this.swingARight = t;
		this.swingALeft.mirror();
		this.swingARight.mirror();
	}
	if (this.laughLeft != null) {
		t = this.laughLeft;
		this.laughLeft = this.laughRight;
		this.laughRight = t;
		this.laughLeft.mirror();
		this.laughRight.mirror();
	}
	if (this.jumpLeftAnim != null) {
		t = this.jumpLeftAnim;
		this.jumpLeftAnim = this.jumpRightAnim;
		this.jumpRightAnim = t;
		this.jumpLeftAnim.mirror();
		this.jumpRightAnim.mirror();
	}
	if (this.fallLeftAnim != null) {
		t = this.fallLeftAnim;
		this.fallLeftAnim = this.fallRightAnim;
		this.fallRightAnim = t;
		this.fallLeftAnim.mirror();
		this.fallRightAnim.mirror();
	}
	if (this.blockLeftAnim != null) {
		t = this.blockLeftAnim;
		this.blockLeftAnim = this.blockRightAnim;
		this.blockRightAnim = t;
		this.blockLeftAnim.mirror();
		this.blockRightAnim.mirror();
	}
};

/**
 * @param {HittableGameObject} p
 */
Gremlin.prototype.inPursuit = function(p) {
	this.inPursuit = p;
};

/**
 * @returns {Boolean}
 */
Gremlin.prototype.isInPursuit = function() {
	return this.inPursuit != null && this.unbunchTimer <= 0;
};

Gremlin.prototype.pickLeader = function() {
	if (!this.awarenessTrigger)
		return;

	var r = this.awarenessTrigger.getWorldSpaceRect();

	var gremlins = [];
	// todo: gremlins = app.game.currentStage.getGameObjectsByType("gremlin");

	var g = null;
	var bestDist = 0xfffffff;
	for (var i = 0; i < gremlins.length; i++) {
		var grem = gremlins[i];
		if (grem.isLeader()) {
			var mag = grem.getPos().subNew(this.getPos()).Magnitude();
			if (mag < bestDist) {
				bestDist = mag;
				g = grem;
			}
		}
	}

	if (g === null) {
		g = this;
	}
	this.setLeader(g);
};

/**
 * @param {Gremlin} g
 */
Gremlin.prototype.setLeader = function(g) {
	if (this.leader) {
		for (var i = 0; i < this.followers.length; i++) {
			if (this.followers[i] == this) {
				this.followers.splice(i, 1);
				break;
			}
		}
	}
	this.leader = g;
	if (g !== null) {
		g.followers.push(this);
	}
};

Gremlin.prototype.disbandFollowers = function() {
	for (var i = 0; i < this.followers.length; i++) {
		var follower = this.followers[i];
		if (follower.hasLeader)
			follower.setLeader(null);
		else
			followers.slice(i, 1);
	}
};

Gremlin.prototype.incomingBallRoll = function() {
	var player = this.awarenessTarget;
	if (player instanceof PlayerCharacter) {
		var rollingLeft = player.facingRight;
		if (player.isBallRolling()) {
			var playerPos = player.getPos();
			var gremPos = this.getPos();
			var hDiff = playerPos.x - gremPos.x;
			var vDiff = playerPos.y - gremPos.y;
			var fromLeft = hDiff < 0;
			if (rollingLeft ^ fromLeft)
				if (Math.abs(vDiff) < 100)
					if (Math.abs(hDiff) < 150)
						return true;
		}
	}
	return false;
};

Gremlin.prototype.hasClearLineOfSight = function() {
	var player = this.awarenessTarget;
	if (player instanceof PlayerCharacter && player.enabled()) {
		var playerPos = player.getPos();
		var gremPos = this.getPos();
		var hDiff = playerPos.x - gremPos.x;
		var vDiff = playerPos.y - gremPos.y;
		if (Math.abs(vDiff) < 50)
			if (Math.abs(hDiff) < 400) {
				return !this.movement.SweepTest((new Vec2(0, -20)).add(gremPos), (new Vec2(0, -20)).add(playerPos));
			}
	}
	return false;
};

Gremlin.prototype.shootProjectile = function() {
	/*this.projectile = create pickup object...;
	 this.projectile.setType(kPickupCopperGyro);
	 this.projectile.setCustomType(PickupProjectile.typeskFork, !IsFacingRight());
	 this.projectile.init(false);
	 var v = new Vec2(IsFacingRight() ? 20 : -20, -20);
	 this.projectile.setPos(v.add(this.getPos()));
	 this.projectile.setZeroGravity();
	 this.projectile.bounce(new Vec2(!this.isFacingRight() ? -500 : 500, 0));
	 //todo: app.game.addGameObject(projectile);
	 this.projectile = null;*/
};

Gremlin.prototype.isBunchedUp = function() {
	var r = this.awarenessTrigger.getWorldSpaceRect();
	var gremlins = [];
	// todo: gremlins = app.game.currentStage.getGameObjectsByType("gremlin");

	for (var i = 0; i < gremlins.length; i++) {
		var grem = gremlins[i];
		if (grem.enabled() && grem != this) {
			var mag = grem.getPos().subNew(this.getPos()).Magnitude();
			if (mag < 30) {
				return true;
			}
		}
	}
	return false;
};

Gremlin.prototype.explosion = function(hits, dir, mag) {
	HittableGameObject.prototype.explosion.call(this, hits, dir, mag);
	var d = new Vec2(dir.x < 0 ? -0.7 : 0.7, -0.7);
	this.movement.SetDesiredVelocity(d.mul(mag));
};

Gremlin.prototype.spawnPickups = function(count, spawnExtras) {
	var numLoot = 0;
	for (var i = 0; i < count; i++) {
		numLoot += ResourceDepot.instance.getDropCount(this.spawnType);
	}

	app.game.spawnPickupTable(this.spawnType, this.getPos().add(new Vec2(0, -20)), 0, 0, -250, -350, numLoot);
	// TODO
	//if (spawnExtras) {
	//}
};

Gremlin.prototype.getLootInAwareness = function() {
	return null; // todo
};

Gremlin.prototype.getIdolInfo = function() {
	return new IdolInfo(IdolType.kIdolGoblin, GemType.kGemBlue, GemType.kGemBlue, MetalType.kMetalSilver);
};


//todo: only temporary 
function Villager() {

}
