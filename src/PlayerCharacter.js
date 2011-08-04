var PCAttackType = {
	kNormalAttack : 0,
	kJumpAttack : 1,
	kHammerAttack : 2,
	kWhirlwindAttack : 3,
	kFlurryAttack1 : 4,
	kFlurryAttack2 : 5,
	kFlurryAttack3 : 6,
	kBarrelRollAttack : 7,
	kCannonBallAttack : 8
};

/**
 * Object holding the playable character
 *
 * @constructor
 * @auguments HittableGameObject
 */
function PlayerCharacter() {
    HittableGameObject.apply(this, [false, false]);

	this.startPos = new Vec2(0, 0);
	this.power = 0;

	this.facingRight = true;

	// ladder info
	this.ladder = {};

	this.ladder.set = function(rect) {
	    this.isNear = true;
	    this.position = rect.center().x;
	    this.bottom = rect.y1;
	};

	this.ladder.reset = function() {
	    this.isNear = false;
	    this.position = 0.0;
	    this.bottom = 0.0;
	};

	this.ladder.reset();

	var statesList = [
		PCStates.kStateIdle,   IdleState,
		PCStates.kStateWalk,   WalkState,
		PCStates.kStateJump,   JumpState,
		PCStates.kStateFall,   FallState,
		PCStates.kStateClimb,  ClimbState,
		PCStates.kStateSprint, SprintState,
		PCStates.kStateHide,   HideState,
		PCStates.kStateUnhide, UnhideState,
		PCStates.kStateSwing,  SwingState,
		PCStates.kStateDamaged,    DamagedState,
		PCStates.kStateKnockedOut, KnockedOutState,
		PCStates.kStateJumpAttack, JumpAttackState
	];

	this.hittableRect = new Rectf(-20, -60, 20, 0);

	this.fsm = new FSM(this, statesList);
	this.movement = new MovementComponent();

	this.stepIn = 0;
	this.animation = null;

	/**
	 * Effect animation object
	 *
	 * @param {EffectType} type
	 * @param {Vec2}       pos   Position of animation
	 * @param {AnimationHandle} anim
	 */
	this.Effect = function (type, pos, anim) {
		this.type = type;
		this.pos = pos;
		this.anim = anim;
	};

	this.EffectType = {
		kWorldSpace : 0,
		kLocal      : 1
	};

	this.effectAnims = [];

	this.triggerObject = null;

	HittableGameObject.apply(this, arguments);

	this.setCameraOffset(new Vec2(0, -128));

	// TODO Temporary setting of PC:s max hitpoints
	this.maxHits = 6;
}

PlayerCharacter.prototype = new HittableGameObject();
PlayerCharacter.prototype.constructor = PlayerCharacter;

/**
 * Build player collision geometry.
 *
 * @returns [Circle]
 */
PlayerCharacter.prototype.getCollision = function () {
	var c = [];
	c.push(new Circle(new Vec2(0, -20), 20));
	c.push(new Circle(new Vec2(0, -40), 20));
	return c;
};

PlayerCharacter.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);
};

/**
 * Initialize the character. Duh.
 */
PlayerCharacter.prototype.init = function (reinit) {
	if (reinit === undefined) { reinit = false; }

	var geom = this.getCollision();
	var app = App.getInstance();

	this.movement.Init(9.82 * 50, this, geom, app.game.provider);
	
	HittableGameObject.prototype.init.call(this, reinit);

	this.movement.DropToGround();

	app.game.setFocusObject(this);

	this.enabled = false;

	// Register trigger object that corresponds to this player character
	if (this.enabled) {
	    this.triggerObject = new TriggerObject(this, createCallback(this.onTrigger, this), this.hittableRect);
	    this.triggerSystem.addObject(this.triggerObject);
	}

	var depot = ResourceDepot.getInstance();
	this.idleLeft = depot.getAnimation("KindleIdleLeft");
	this.idleRight = depot.getAnimation("KindleIdleRight");
	this.walkLeft = depot.getAnimation("KindleRunLeft");
	this.walkRight = depot.getAnimation("KindleRunRight");
	this.jumpRight = depot.getAnimation("KindleJumpRight");
	this.fallRight = depot.getAnimation("KindleFallRight");
	this.jumpLeft = depot.getAnimation("KindleJumpLeft");
	this.fallLeft = depot.getAnimation("KindleFallLeft");
	this.hideLeft = depot.getAnimation("KindleHideLeft");
	this.hideRight = depot.getAnimation("KindleHideRight");
	this.swingALeft = depot.getAnimation("KindleCaneSwingALeft");
	this.swingARight = depot.getAnimation("KindleCaneSwingARight");
	this.swingBLeft = depot.getAnimation("KindleCaneSwingBLeft");
	this.swingBRight = depot.getAnimation("KindleCaneSwingBRight");
	this.climb = depot.getAnimation("KindleClimb");
	this.sprintLeft = depot.getAnimation("KindleSprintLeft");
	this.sprintRight = depot.getAnimation("KindleSprintRight");
	this.damagedRight = depot.getAnimation("KindleDamagedRight");
	this.damagedLeft = depot.getAnimation("KindleDamagedLeft");
	this.knockedOutLeft = depot.getAnimation("KindleKnockedOutLeft");
	this.knockedOutRight = depot.getAnimation("KindleKnockedOutRight");

	this.snuffExplodeLeft = depot.getAnimation("KindleSnuffExplodeLeft");
	this.snuffExplodeRight = depot.getAnimation("KindleSnuffExplodeRight");

	this.shuffleLeft = depot.getAnimation("KindleShuffleLeft");
	this.shuffleRight = depot.getAnimation("KindleShuffleRight");
	this.shuffleTurnLeft = depot.getAnimation("KindleShuffleTurnLeft");
	this.shuffleTurnRight = depot.getAnimation("KindleShuffleTurnRight");
	this.endShuffleLeft = depot.getAnimation("KindleEndShuffleLeft");
	this.endShuffleRight = depot.getAnimation("KindleEndShuffleRight");

	this.jumpAttackLeft = depot.getAnimation("KindleJumpAttackLeft");
	this.jumpAttackRight = depot.getAnimation("KindleJumpAttackRight");

	this.whirlwindLeft = depot.getAnimation("KindleWhirlwindLeft");
	this.whirlwindRight = depot.getAnimation("KindleWhirlwindRight");

	this.chargeUpLeft = depot.getAnimation("KindleChargeUpLeft");
	this.chargeUpRight = depot.getAnimation("KindleChargeUpRight");

	this.pickUpLeft = depot.getAnimation("KindlePickUpBrownieLeft");
	this.pickUpRight = depot.getAnimation("KindlePickUpBrownieRight");

	this.forceDashRight = depot.getAnimation("ForceDashRight");
	this.forceDashLeft = depot.getAnimation("ForceDashRight", null, true);

	this.flurryLeft = depot.getAnimation("KindleFlurryLeft");
	this.flurryRight = depot.getAnimation("KindleFlurryRight");

	this.helmetRattleLeft = depot.getAnimation("KindleHelmetRattleLeft");
	this.helmetRattleRight = depot.getAnimation("KindleHelmetRattleRight");

	this.swipeAttackEffectLeft = [];
	this.swipeAttackEffectRight = [];
	this.swipeAttackEffectLeft[0] = depot.getAnimation("KindleSwipeAttackEffectL1");
	this.swipeAttackEffectLeft[1] = depot.getAnimation("KindleSwipeAttackEffectL2");
	this.swipeAttackEffectLeft[2] = depot.getAnimation("KindleSwipeAttackEffectL3");
	this.swipeAttackEffectLeft[3] = depot.getAnimation("KindleSwipeAttackEffectL4");
	this.swipeAttackEffectLeft[4] = depot.getAnimation("KindleSwipeAttackEffectL5");
	this.swipeAttackEffectRight[0] = depot.getAnimation("KindleSwipeAttackEffectL1", null, true);
	this.swipeAttackEffectRight[1] = depot.getAnimation("KindleSwipeAttackEffectL2", null, true);
	this.swipeAttackEffectRight[2] = depot.getAnimation("KindleSwipeAttackEffectL3", null, true);
	this.swipeAttackEffectRight[3] = depot.getAnimation("KindleSwipeAttackEffectL4", null, true);
	this.swipeAttackEffectRight[4] = depot.getAnimation("KindleSwipeAttackEffectL5", null, true);
	
	this.hammerAttackEffectLeft = [];
	this.hammerAttackEffectRight = [];
	this.hammerAttackEffectLeft[0] = depot.getAnimation("KindleHammerAttackEffectL1");
	this.hammerAttackEffectLeft[1] = depot.getAnimation("KindleHammerAttackEffectL2");
	this.hammerAttackEffectLeft[2] = depot.getAnimation("KindleHammerAttackEffectL3");
	this.hammerAttackEffectLeft[3] = depot.getAnimation("KindleHammerAttackEffectL4");
	this.hammerAttackEffectLeft[4] = depot.getAnimation("KindleHammerAttackEffectL5");
	this.hammerAttackEffectRight[0] = depot.getAnimation("KindleHammerAttackEffectL1", null, true);
	this.hammerAttackEffectRight[1] = depot.getAnimation("KindleHammerAttackEffectL2", null, true);
	this.hammerAttackEffectRight[2] = depot.getAnimation("KindleHammerAttackEffectL3", null, true);
	this.hammerAttackEffectRight[3] = depot.getAnimation("KindleHammerAttackEffectL4", null, true);
	this.hammerAttackEffectRight[4] = depot.getAnimation("KindleHammerAttackEffectL5", null, true);

	this.jumpAttackEffectLeft = [];
	this.jumpAttackEffectRight = [];
	this.jumpAttackEffectLeft[0] = depot.getAnimation("KindleJumpAttackEffectL1");
	this.jumpAttackEffectLeft[1] = depot.getAnimation("KindleJumpAttackEffectL2");
	this.jumpAttackEffectLeft[2] = depot.getAnimation("KindleJumpAttackEffectL3");
	this.jumpAttackEffectLeft[3] = depot.getAnimation("KindleJumpAttackEffectL4");
	this.jumpAttackEffectLeft[4] = depot.getAnimation("KindleJumpAttackEffectL5");
	this.jumpAttackEffectRight[0] = depot.getAnimation("KindleJumpAttackEffectL1", null, true);
	this.jumpAttackEffectRight[1] = depot.getAnimation("KindleJumpAttackEffectL2", null, true);
	this.jumpAttackEffectRight[2] = depot.getAnimation("KindleJumpAttackEffectL3", null, true);
	this.jumpAttackEffectRight[3] = depot.getAnimation("KindleJumpAttackEffectL4", null, true);
	this.jumpAttackEffectRight[4] = depot.getAnimation("KindleJumpAttackEffectL5", null, true);

	this.ladder.reset();
	this.facingRight = true;

	this.fsm.setState(PCStates.kStateIdle);

	this.jumpSound = depot.getSFX("kindle_jump");
	this.walkSound = depot.getSFX("kindle_step");
	this.runSound  = depot.getSFX("kindle_dash");
	this.respawnSound = depot.getSFX("kindle_cheer");
	this.enterExitSound = depot.getSFX("door_close");
	this.enterExitAltSound = depot.getSFX("door_close_alt");
	this.shootLuckySound = depot.getSFX("lucky_range");
	this.shootBernySound = depot.getSFX("berny_range");
	this.shootLazeSound = depot.getSFX("laze_range");
	this.shootDizeSound = depot.getSFX("dize_range");
	this.shootBubbaSound = depot.getSFX("bubba_shot");
	this.brownieReadySound = depot.getSFX("brownie_reload");
	this.landSound = depot.getSFX("kindle_land");
	this.hurtASound = depot.getSFX("kindle_hurt_a");
	this.hurtBSound = depot.getSFX("kindle_hurt_b");
	this.deathSound = depot.getSFX("kindle_death");
	this.drownSound = depot.getSFX("kindle_drown");
	this.helmetExplodeSound = depot.getSFX("kindle_launch");
	this.helmetBlockSound = depot.getSFX("metal_hit");
	this.barrelRollSound = depot.getSFX("kindle_roll");
	this.barrelRollInitSound = depot.getSFX("kindle_barrelroll");
	this.barrelRollBounceSound = depot.getSFX("kindle_bounce");

	this.whirlWindSound = [];
	this.caneFlurrySound = [];
	this.jumpAttackSound = [];
	this.attackSound = [];
	this.hammerAttackSound = [];
	this.whirlWindSound[0] = depot.getSFX("kindle_whirlwind");
	this.whirlWindSound[1] = depot.getSFX("kindle_whirlwind_flame");
	this.caneFlurrySound[0] = depot.getSFX("kindle_rapid_swings");
	this.caneFlurrySound[1] = depot.getSFX("kindle_rapid_flame");
	this.jumpAttackSound[0] = depot.getSFX("kindle_single_swing");
	this.jumpAttackSound[1] = depot.getSFX("kindle_single_flame");
	this.attackSound[0] = depot.getSFX("kindle_double_swing");
	this.attackSound[1] = depot.getSFX("kindle_double_flame");
	this.hammerAttackSound[0] = depot.getSFX("kindle_hammer_swing");
	this.hammerAttackSound[1] = depot.getSFX("kindle_hammer_flame");

	this.helmetRattleSound  = depot.getSFX("kindle_rattle");
	this.hideSound = depot.getSFX("kindle_hide");
	this.unhideSound = depot.getSFX("kindle_unhide");
	this.waddleSound = depot.getSFX("kindle_waddle");
	this.cannonBallSound = depot.getSFX("kindle_launch");
	this.cannonBallHitSound = depot.getSFX("kindle_cannonball_hit");
	this.chargeSound = depot.getSFX("kindle_charge");
	this.forceSound = depot.getSFX("kindle_force");
	this.slideSound = depot.getSFX("kindle_slide");
	this.useLanternSound = depot.getSFX("kindle_use_lantern");
	this.declineUseLanternSound = depot.getSFX("decline");

	this.underWaterSound = depot.getSFX("underwater");
	this.lappingWavesSound = depot.getSFX("lapping_waves");

	this.attackVolume = new TriggerVolume("PCAttack", new Rectf(0, -50, 75, 0), this, null, "damage_pwr");
	this.hammerAttackVolume = new TriggerVolume("PCAttack", new Rectf(0, -64, 79, 10), this, null, "stun_pwr");
	this.jumpAttackVolume = new TriggerVolume("PCAttack", new Rectf(0, -64, 79, 10), this, null, "damage_pwr");
};

/**
 * Deinitialize the object
 */
PlayerCharacter.prototype.deinit = function () {
    GameObject.prototype.deinit.apply(this, arguments);
    this.triggerSystem.removeObject(this);
};

PlayerCharacter.prototype.useFireflies = function (dt) {
	if (this.hasInteractTarget()){
		/*todo:if (this.hasInteractTarget(GameObjectFactory.getObjectType("brownie")))
			this.fsm.setState(PCStates.kStatePickupBrownie);
		else*/
			this.interact();
	}
	else if (this.isInWater())
		app.audio.playFX(this.declineUseLanternSound);
	else {
		if (false && this.fireflies.activate()) // todo: add fireflies (remove false)
			app.audio.playFX(this.useLanternSound);
		else
			app.audio.playFX(this.declineUseLanternSound);
	}
};

/**
 * Update the character
 *
 * @param {number} dt Time delta
 */
PlayerCharacter.prototype.update = function (dt) {
	if (this.isAlive() && GameInput.instance.pressed(Buttons.enter)) { //todo: check if not dialogue state
		this.useFireflies();
		//todo:if (app.game.stopUpdate()) return;
	}

	this.fsm.update(dt);
	HittableGameObject.prototype.update.call(this, dt);
	this.movement.Update(dt);

	this.animation.update(dt);

	var efx = [];
	for (var i = 0; i < this.effectAnims.length; i++) {
		var fx = this.effectAnims[i];
		fx.anim.update(dt);

		if (fx.anim.playing) {
			efx.push(this.effectAnims[i]);
		}
	}

	this.effectAnims = efx;

	// Temporary
	var stage = app.game.currentStage;
	var pos = this.movement.position;

	if (pos.x > stage.gameplayExtent.w || pos.x < 0 || pos.y > stage.gameplayExtent.h) {
		this.setPos(this.startPos, true);
	}

	// TODO
	// LOADS OF STUFFS :(
};

/**
 * Draw the character
 *
 * @param {Render} render
 * @param {number} x      Camera x position
 * @param {number} y      Camera y position
 */
PlayerCharacter.prototype.draw = function (render, x, y) {
	if(!this.enabled) return;
	var p = this.getPos().copy();
	p.x += x;
	p.y += y;

	this.animation.draw(render, Math.floor(p.x), Math.floor(p.y), 0, 1, null);

	HittableGameObject.prototype.draw.call(this, render, Math.floor(p.x), Math.floor(p.y));

	// Draw effects
	for (var i = 0; i < this.effectAnims.length; i++) {
		var gp = this.effectAnims[i].pos;
		if (this.effectAnims[i].type === this.EffectType.kLocal) {
			gp = gp.addNew(this.movement.position);
		}

		this.effectAnims[i].anim.draw(render, Math.floor(gp.x + x), Math.floor(gp.y + y), 0, 1, null);

	}

	if (app.debugMovementTrigger) {
		for (var i = 0; i < this.movement.shapes.length; i++) {
			var shape = this.movement.shapes[i];

			var coords = [];
			for (var pt = 0; pt < shape.points.length; pt++) {
				coords.push(shape.points[pt].x + x);
				coords.push(shape.points[pt].y + y);
			}

			for (var j = 0; j < coords.length; j += 2) {
				if (j < coords.length - 2) {
					render.drawLine(coords[j], coords[j + 1], coords[j + 2], coords[j + 3], render.white);
				} else {
					render.drawLine(coords[j], coords[j + 1], coords[0], coords[1], render.white);
				}
			}
		}

		for (var i = 0; i < this.movement.spheres.length; i++) {
			var sp = this.movement.spheres[i];
			var pos = this.movement.position;

			render.drawCircle(pos.x + x + sp.c.x, pos.y + y + sp.c.y, sp.r, render.blue);
		}

		for (var i = 0; i < this.movement.contacts.length; i++) {
			var pos = this.movement.contacts[i].point;

			render.drawCircle(pos.x + x, pos.y + y, 5, render.red);
		}
	}
};

/**
 * Sets the target animation
 *
 * @param {AnimationHandle} animation The animation to play
 * @param {boolean} loop Whether to loop the animation on not. Optional.
 * @param {number} start Where to start the animation. Optional.
 * @param {number} end Where tha animation ends. Optional.
 */
PlayerCharacter.prototype.setAndPlay = function (animation, loop, start, end) {
	if (loop === undefined) loop = true;
	if (start === undefined) start = 0;
	if (end === undefined) end = 1;

	this.animation = animation;
	animation.setRange(start, end);
	animation.rewind();
	animation.play(loop);
	animation.setCallback(createCallback(this.onAnimationEvent, this));
};

/**
 * Play the given effect
 *
 * @param {AnimationHandle} h
 * @param {boolean}         worldSpace Optional
 */
PlayerCharacter.prototype.playEffectAnim = function (anim, worldSpace) {
	if (worldSpace === undefined) worldSpace = true;

	var effect = new this.Effect(worldSpace ? this.EffectType.kWorldSpace : this.EffectType.kLocal,
	                        worldSpace ? this.movement.position : new Vec2(0, 0),
							anim);

	effect.anim.rewind();
	effect.anim.play(false);
	this.effectAnims.push(effect);
};



/**
 * Handles trigger collision messages (turning interaction system off)
 *
 * @param {String} parom
 * @param {TriggerVolume} volume
 * @param {TriggerObject} object
 */
PlayerCharacter.prototype.onTrigger = function(param, volume, object) {
    assert(volume instanceof TriggerVolume && object instanceof TriggerObject);
    if (param == "ladderenter") {
        this.ladder.set(volume.getWorldSpaceRect());
    } else if (param == "ladderexit") {
        this.ladder.reset();
	} else if (param == "pattack") {
		if (this.isInvunerable()) {
			app.audio.playFX(this.helmetBlockSound);
			this.block(volume.getCenter().x < this.getPos().x);
		}
		else {
			this.hit(1, volume.getCenter().x < this.getPos().x);
		}
    } else if (param == "kill") {
        this.kill();
    }

    //TODO debugging triggers
};

/**
 * Receiving callback for animation events
 *
 * @param {String} evt The message sent from the animation
 * @param {AnimationHandle} anim The actual animation
 */
PlayerCharacter.prototype.onAnimationEvent = function (evt, anim) {
	switch (evt) {
		case "stopped" : this.fsm.message(PCMessages.kAnimStopped); break;
		case "start_axe_attack" : this.startAttack(PCAttackType.kHammerAttack); break;
		case "start_swipe_attack" : this.startAttack(PCAttackType.kNormalAttack); break;
		case "start_jump_attack" : this.startAttack(PCAttackType.kJumpAttack); break;
		case "end_attack" : this.endAttack(); break;
		case "step-in" : this.stepIn = 0.1; break;
		case "step_sound" : app.audio.playFX(this.walkSound); break;
		case "shuffle_sound" : app.audio.playFX(this.waddleSound); break;
	}

	//this.fsm.message(evt, anim);
};


/**
 * Initiate the given attack, playing sounds and adding trigger volumes
 *
 * @param {PCAttackType} type
 */
PlayerCharacter.prototype.startAttack = function (type) {
	var triggerSys = this.triggerSystem;
	var soundIndex = this.power === 0 ? 0 : 1;
	if (type === PCAttackType.kNormalAttack) {
		triggerSys.addVolume(this.attackVolume);
		app.audio.playFX(this.attackSound[soundIndex]);
	}
	else if (type === PCAttackType.kHammerAttack) {
		triggerSys.addVolume(this.hammerAttackVolume);
		app.audio.playFX(this.hammerAttackSound[soundIndex]);
	}
	else if (type === PCAttackType.kJumpAttack) {
		triggerSys.addVolume(this.jumpAttackVolume);
		app.audio.playFX(this.jumpAttackSound[soundIndex]);
	}
};

/**
 * Stops any attack the character is currently doing
 */
PlayerCharacter.prototype.endAttack = function () {
	var triggerSys = this.triggerSystem;

	triggerSys.flushVolume(this.attackVolume);
	triggerSys.removeVolume(this.attackVolume);

	triggerSys.flushVolume(this.hammerAttackVolume);
	triggerSys.removeVolume(this.hammerAttackVolume);

	triggerSys.flushVolume(this.jumpAttackVolume);
	triggerSys.removeVolume(this.jumpAttackVolume);

	this.setInvunerable(false);
};

/* Gets the extent rect of the player character
 *
 * @returns {Rectf}
 */
PlayerCharacter.prototype.getObjectExtent = function () {
	return new Rectf(-30, -80, 30, 0);
};

/**
 * tells whether player is near a ladder
 *
 * @returns boolean
 */
PlayerCharacter.prototype.isNearLadder = function() {
    return this.ladder.isNear;
};

/**
 * gives ladder bottom y coordinate
 *
 * @returns float
 */
PlayerCharacter.prototype.getLadderBottom = function() {
    assert(this.ladder.isNear, "player must be near a ladder");
    return this.ladder.bottom;
};

/**
 * snaps player position x coordinate to ladder
 */
PlayerCharacter.prototype.snapToLadder = function() {
    assert(this.ladder.isNear, "player must be near a ladder");
    this.setPos(new Vec2(this.ladder.position, this.movement.position.y), false);
};

/**
 * Gets the characters position
 *
 * @returns {Vec2}
 */
PlayerCharacter.prototype.getPos = function () {
	return this.movement.position;
};

/**
 * Set the characters position
 *
 * @param {Vec2} pos
 * @param {boolean} dropToGround
 */
PlayerCharacter.prototype.setPos = function (pos, dropToGround) {
	this.movement.SetPosition(pos);
	if (dropToGround) {
		this.movement.DropToGround();
	}
};

PlayerCharacter.prototype.setPower = function (pow) {
	this.power = Math.min(pwr, 4);
};

PlayerCharacter.prototype.getPower = function () {
	return this.power;
};

PlayerCharacter.prototype.faceLeft = function () {
	this.facingRight = false;
	this.fsm.setState(PCStates.kStateIdle);
};

PlayerCharacter.prototype.faceRight = function () {
	this.facingRight = true;
	this.fsm.setState(PCStates.kStateIdle);
};

PlayerCharacter.prototype.hasTurned = function () {
	return !this.facingRight;
};

PlayerCharacter.prototype.enterCave = function(targetStage, targetEntrance, houseId, status) {
    if(houseId != -1){
    	app.game.sendMessageToType(Fireplace, {houseId : houseId});
    }
};

PlayerCharacter.prototype.exitCave = function(targetEntrance) {
    // TODO
};

PlayerCharacter.prototype.placeAtEntrance = function(targetExit, targetStage) {
	var entrances = app.game.currentStage.gameObjects.getObjectsByType(CaveEntrance);
	var entrance = null;

	for (var i = 0; i < entrances.length; i++) {
		if (entrances[i].targetExit == targetExit && entrances[i].targetStage == targetStage) {
			entrance = entrances[i];
			entrances[i].breakOpen();
			break;
		}
	}

	if (entrance == null) {
		entrances = app.game.currentStage.gameObjects.getObjectsByType(HouseEntrance);

		for (var i = 0; i < entrances.length; i++) {
			if (entrances[i].targetExit == targetExit && entrances[i].targetStage == targetStage) {
				entrance = entrances[i];
				app.audio.playFX(this.enterExitSound);
				break;
			}
		}
	}

	if (entrance != null) {
		var left = entrance.targetExit.indexOf("left") >= 0;
		var rect = entrance.getInteractRect();
		if (rect !== null) {
			this.movement.PlaceOutside(rect, left, 20);
		} else {
			this.movement.SetPosition(entrance.getPos());
		}

		this.movement.SetDesiredVelocity(new Vec2(0, 0));
		this.movement.DropToGround();

		if (!left)
			this.faceRight();
		else
			this.faceLeft();
	}

	//todo:this.fireflies.init(this.getPos(), this);
};

PlayerCharacter.prototype.placeAtExit = function(str){
	var exits = app.game.currentStage.gameObjects.getObjectsByType(CaveExit);

	for (var i = 0; i < exits.length; i++) {
		var e = exits[i];
		if(e.targetEntrance == str){
			var left = e.targetEntrance.indexOf("left") >= 0;
			var rect = e.getInteractRect();
			if (rect !== null) {
				this.movement.PlaceOutside(rect, !left, 20);
			} else {
				this.movement.SetPosition(e.getPos());
			}

			this.movement.SetDesiredVelocity(new Vec2(0, 0));
			this.movement.DropToGround();

			if (left)
				this.faceRight();
			else
				this.faceLeft();
			break;
		}
		//todo:this.fireflies.init(this.getPos(), this);
	}
};

PlayerCharacter.prototype.onEnable = function() {
	this.triggerObject = new TriggerObject(this, createCallback(this.onTrigger, this), this.hittableRect);
	this.triggerSystem.addObject(this.triggerObject);
};

PlayerCharacter.prototype.onDisable = function() {
	this.removeInteractVolumes();
	this.interactTargets = [];
	this.triggerSystem.removeObject(this.triggerObject);
};

PlayerCharacter.prototype.setKnockedOutState = function (fromLeft, hitsTaken, tossed) {
	app.game.getTallyInfo().herobonus = 0;
	app.game.getTallyInfo().withoutdamagebonus = 0;
	// TODO:setBrownie
	this.fsm.setState(PCStates.kStateKnockedOut);
};

PlayerCharacter.prototype.setDamagedState = function (fromLeft, hitsTaken, tossed) {
	app.game.getTallyInfo().withoutdamagebonus = 0;
	this.giveGrace(2);
	this.fsm.setState(PCStates.kStateDamaged);
};

PlayerCharacter.prototype.setCorpseSmackedState = function (fromLeft) {
	this.fsm.message(PCMessages.kCorpseSmacked);
};

PlayerCharacter.prototype.getIdolInfo = function() {
	return new IdolInfo(IdolType.kIdolKindle, GemType.kGemRed, GemType.kGemRed, MetalType.kMetalGold);
};

PlayerCharacter.prototype.spawnOnWick = function(){
  var game = app.game;

  // Make sure the active idols and bubbles don't travel across stages.
  game.hud.healthBarLeft.clearIdols();
  game.hud.healthBarRight.clearIdols();

  var wicks = game.currentStage.gameObjects.getObjectsByType(Wick);
  if (wicks.length == 0)
    this.spawnInStage();
  else
    wicks[0].mountPlayer(this);
};

PlayerCharacter.prototype.handleBlast = function() {
	var state = this.fsm.currentState;
	var doHandle = (state == PCStates.kStateHide) ||
			(state == PCStates.kStateUnhide) ||
			(state == PCStates.kStateStartShuffle) ||
			(state == PCStates.kStateShuffle) ||
			(state == PCStates.kStateEndShuffle) ||
			(state == PCStates.kStateTurnShuffle);

	if (doHandle) this.fsm.message(PCMessages.kBlasted);
	return doHandle;
};

PlayerCharacter.prototype.spawnInStage = function(){

};


PlayerCharacter.prototype.exitOnWick = function(){
	//this.fsm.setState(PCStates.kStateDialogueEvent); 
	this.enable(false);
	var wick = app.game.currentStage.gameObjects.getObjectsByType(Wick)[0];
	wick.exitStage();
	app.audio.playFX(this.respawnSound);
};
