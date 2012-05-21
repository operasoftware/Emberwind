function Wick() {
	HittableGameObject.call(this, false, false);
	this.states = [
		Wick.states.kStateEnterStage, WickEnterStageState,
		Wick.states.kStateLand, WickLandState,
		Wick.states.kStateIdle, WickIdleState,
		Wick.states.kStateExitStage, WickExitStageState
	];
	this.fsm = new FSM(this, this.states);
	this.currAnimation = null;
	this.animCallback = null;

	this.dismount = null;
	this.mount = null;
	this.idle = null;
	this.flyAscend = null;
	this.flyDescend = null;
	this.flyRight = null;
	this.flyRightIdle = null;
	this.flyCloudHit = null;

	this.player = null;

	this.movement = new MovementComponent();
	this.exitVolume = null;

	this.flapSound = null;
	this.mountSound = null;
	this.dismountSound = null;
	this.hitSound = null;
	this.idleSound = null;
	this.iceBoltFireSound = null;
	this.iceBoltChargeSound = null;

	this.iceBoltReload = 1;
	this.animAngle = 0;
	this.attackWasReleased = false;
	this.iceBoltCharge = 0;

	this.pointLight = null;

	this.triggerSystem = null;

	this.setMaxHitPoints(3);
	this.setHitPoints(3);
}

Wick.states = {
	kStateEnterStage : 0,
	kStateLand : 1,
	kStateIdle : 2,
	kStateEnterBonus : 3,
	kStateFlyIdle : 4,
	kStateFlyCloudHit : 5,
	kStateFlyExit : 6,
	kStateExitStage : 7
};

Wick.kDefaultCameraOffset = -128;
Wick.kWickDismountOffsetX = 17;
Wick.kWickDismountOffsetY = -90;

Wick.prototype = new HittableGameObject();
Wick.prototype.constructor = Wick;

Wick.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);

	this.triggerSystem = app.game.currentStage.triggerSystem;
};


Wick.prototype.init = function(reinit) {
	var circles = this.getCollision();
	this.movement.Init(0, this, circles, app.game.currentStage.provider);

	HittableGameObject.prototype.init.call(this, reinit);

	if (this.enabled) {
		var triggerObj = new TriggerObject(this, createCallback(this.onTrigger, this), this.getHittableRect());
		this.triggerSystem.addObject(triggerObj);
	}

	var dep = ResourceDepot.getInstance();
	this.dismount = dep.getAnimation("WickDismount");
	this.mount = dep.getAnimation("WickMount");
	this.idle = dep.getAnimation("WickIdle");
	this.flyRight = dep.getAnimation("WickFlyRight");

	this.animCallback = createCallback(this.onAnimationEvent, this);

	this.flapSound = dep.getSFX("wick_flap");
	this.mountSound = dep.getSFX("wick_mount_flaps");
	this.dismountSound = dep.getSFX("wick_dismount_flaps");
	this.hitSound = dep.getSFX("wick_hit");
	this.idleSound = dep.getSFX("wick_idle_who");
	this.iceBoltFireSound = dep.getSFX("wick_bolt");
	this.iceBoltChargeSound = dep.getSFX("wick_charge");

	var wickStr = dep.getString("STR_WICK");
	this.annoyedCues.push(dep.getString("STR_WICK_ANNOYED1"));
	this.annoyedCues.push(wickStr);
	this.annoyedCues.push(dep.getString("STR_WICK_ANNOYED2"));
	this.annoyedCues.push(wickStr);
	this.annoyedCues.push(dep.getString("STR_WICK_ANNOYED3"));
	this.annoyedCues.push(wickStr);
	this.annoyedCues.push(dep.getString("STR_WICK_ANNOYED4"));
	this.annoyedCues.push(wickStr);
	this.annoyedCues.push(dep.getString("STR_WICK_ANNOYED5"));
	this.annoyedCues.push(wickStr);
	this.annoyedCues.push(dep.getString("STR_WICK_ANNOYED6"));
	this.annoyedCues.push(wickStr);

	this.attackWasReleased = true;
	this.iceBoltCharge = 0;

	this.fsm.setState(Wick.states.kStateIdle);
};

Wick.prototype.deinit = function() {
	HittableGameObject.prototype.deinit.call(this);
	//this.removeExitTrigger();

	this.triggerSystem.removeObject(this);

	this.currAnimation = null;
};

Wick.prototype.update = function(dt) {
	HittableGameObject.prototype.update.call(this, dt);

	this.fsm.update(dt);
	this.currAnimation.update(dt);
};

Wick.prototype.draw = function(render, x, y) {
	var p = new Vec2(x, y).add(this.getPos());
	var tint = null;
	this.currAnimation.draw(render, p.x, p.y, this.animAngle, 1, tint);
	HittableGameObject.prototype.draw.call(this, render, p.x, p.y);
};


Wick.prototype.getCollision = function() {
	return [new Circle(new Vec2(0, -10), 35)];
};

Wick.prototype.getObjectExtent = function() {
	return new Rectf(-70, -20, 70, 100);
};

Wick.prototype.getHittableRect = function() {
	return new Rectf(-35, -45, 35, 25);
};

Wick.prototype.getHitEffectOffset = function(left) {
	return new Vec2(left ? -30 : 30, 40).add(new Vec2(randomRange(-5, 5), randomRange(-5, 5)));
};

Wick.prototype.setAndPlay = function(h, loop, start, end) {
	loop = loop === undefined ? true : loop;
	start = start === undefined ? 0 : start;
	end = end === undefined ? 1 : end;
	this.currAnimation = h;
	this.currAnimation.setRange(start, end);
	this.currAnimation.play(loop);
	this.currAnimation.setCallback(this.animCallback);
};

Wick.prototype.onDisable = function() {
	HittableGameObject.prototype.onDisable.call(this);
	this.setNonInteractive();
	this.triggerSystem.removeObject(this);
};

Wick.prototype.onEnable = function() {
	HittableGameObject.prototype.onEnable.call(this);
};

Wick.prototype.onAnimationEvent = function(param, anim) {
	if (param == "flap")
		app.audio.playFX(this.flapSound);
	else if (param == "flap_mount")
		app.audio.playFX(this.mountSound);
	else if (param == "flap_dismount")
		app.audio.playFX(this.dismountSound);
	else
		this.fsm.message(param, anim);
};

Wick.prototype.onInteract = function() {
	var game = app.game;
	if (game.stageObjectivesComplete()) {
		game.completeStage();
		return false;
	} else {
		game.hud.openRightBubble(this, 30, ResourceDepot.getInstance().getString("STR_WICK_INTERACT"), ResourceDepot.getInstance().getString("STR_WICK"), 3);
	}
};

Wick.prototype.waitForKindle = function(pos) {
	this.setPos(new Vec2(Wick.kWickDismountOffsetX, Wick.kWickDismountOffsetY).add(pos));
	this.movement.DropToGround();
	this.fsm.setState(Wick.states.kStateIdle);
};

Wick.prototype.mountPlayer = function(p) {
	this.player = p;
	p.enable(false);
	this.fsm.setState(Wick.states.kStateEnterStage);
};

Wick.prototype.onTrigger = function(param, volume, object) {
	var game = app.game;
	if (param == "cloud") {
		this.hit(1, false);
	} else if (param == "exit") {
		if (object.particle instanceof PlayerCharacter) {
			if (game.stageObjectivesComplete())
				game.completeStage();
		}
	} else if (param == "damage" || param == "damage_pwr" || param == "stun" || param == "stun_pwr") {
		this.hit(0, volume.getWorldSpaceRect().center().x < this.getPos().x);
	}
};

Wick.prototype.updateFlying = function(dt, vertVel) {
};

Wick.prototype.setPos = function(p, dropToGround) {
	this.movement.SetPosition(p);
	this.updateInWaterFlag();
};

Wick.prototype.getPos = function() {
	return this.movement.position
};

Wick.prototype.reset = function() {
	HittableGameObject.prototype.reset.call(this);
};

Wick.prototype.exitStage = function() {
	this.fsm.setState(Wick.states.kStateExitStage);
};

Wick.prototype.getIdolInfo = function() {
	return new IdolInfo(IdolType.kIdolWick, GemType.kGemBlue, GemType.kGemBlue, MetalType.kMetalSilver);
};

Wick.prototype.setAutoExit = function(rect) {
	assert(rect instanceof Rectf);
	var volume = new TriggerVolume("interact", rect, this, createCallback(Wick.prototype.onAutoExit, this), "enter", "exit");
	app.game.currentStage.triggerSystem.addVolume(volume);
	this.autoExitTrigger = volume;
};

Wick.prototype.setNonAutoExit = function() {
	app.game.currentStage.triggerSystem.removeVolume(this.autoExitTrigger);
	this.autoExitTrigger = null;
};

Wick.prototype.onAutoExit = function(param, volume, object) {
	var game = app.game;
	if (object.particle instanceof PlayerCharacter) {
		if (game.stageObjectivesComplete()) {
			game.completeStage();
		}
	}
};


// ----------------------------------------------------------------------------

function WickIdleState() {
	BaseState.apply(this, arguments);

	this.timeToSound = 0;
}

WickIdleState.prototype = new BaseState();
WickIdleState.prototype.constructor = WickIdleState;

WickIdleState.prototype.enter = function(msg, fromState) {
	this.host.setAndPlay(this.host.idle);
	this.timeToSound = randomRange(5, 10);
	var r = new Rectf(-20, -20, -10, 44);
	this.host.setInteractive(r);
	this.host.setInvulnerable(true);
	this.host.setAutoExit(r);
};

WickIdleState.prototype.update = function(dt) {
	this.timeToSound -= dt;
	if (this.timeToSound <= 0) {
		this.timeToSound = randomRange(5, 10);
		app.audio.playFX(this.host.idleSound);
	}
};

WickIdleState.prototype.leave = function() {
	this.host.setNonInteractive();
	this.host.setNonAutoExit();
};

WickIdleState.prototype.message = function(msg) {
};

WickIdleState.prototype.transition = function() {
	return false;
};

// ----------------------------------------------------------------------------

function WickEnterStageState() {
	BaseState.apply(this, arguments);

	this.timeInState = 0;
	this.switchState = false;
}

WickEnterStageState.prototype = new BaseState();
WickEnterStageState.prototype.constructor = WickEnterStageState;

WickEnterStageState.prototype.enter = function(msg, fromState) {
	this.host.setInvulnerable(true);
	this.host.updateOffScreen = true;
	this.host.setAndPlay(this.host.flyRight);
	this.timeInState = 0;
	this.switchState = false;
};

WickEnterStageState.prototype.update = function(dt) {
	this.timeInState += dt;
	var targetPos = new Vec2(Wick.kWickDismountOffsetX, Wick.kWickDismountOffsetY).add(this.host.player.getPos());
	var currPos = this.host.getPos();
	var diff = targetPos.sub(currPos);
	var len = diff.Magnitude();
	if (len > 0.1) {
		var p = 200 * dt / len;
		if (p > 1) p = 1;
		var newPos = currPos.add(diff.mul(p));
		this.host.setPos(newPos);
	}
};

WickEnterStageState.prototype.leave = function() {
	this.host.updateOffScreen = false;
};

WickEnterStageState.prototype.message = function(message) {
	if (message == "wings_up") {
		var sqDist = (new Vec2(Wick.kWickDismountOffsetX, Wick.kWickDismountOffsetY).add(this.host.player.getPos()).sub(this.host.getPos())).MagnitudeSquared();
		this.switchState = sqDist < 100 * 100;
	}
};

WickEnterStageState.prototype.transition = function() {
	return this.fsm.tryChangeState(this.switchState, Wick.states.kStateLand);
};

// ----------------------------------------------------------------------------

function WickLandState() {
	BaseState.apply(this, arguments);

	this.timeInState = 0;
	this.switchState = false;
}

WickLandState.prototype = new BaseState();
WickLandState.prototype.constructor = WickLandState;

WickLandState.prototype.enter = function(msg, fromState) {
	this.host.setAndPlay(this.host.dismount, false);
	this.timeInState = 0;

	var lampPosts = app.game.getGameObjectByType(Lamppost);
	if (lampPosts.length != 0) {
		var bestObj = lampPosts[0];
		var bestDist = this.host.getPos().subNew(bestObj.getPos()).MagnitudeSquared();

		for (var i = 0; i < lampPosts.length; i++) {
			var testObj = lampPosts[i];
			var testDist = testObj.getPos().subNew(this.host.getPos()).MagnitudeSquared();
			if (testDist < bestDist) {
				bestDist = testDist;
				bestObj = testObj;
			}
		}

		bestObj.light(this.host.player);
	}
};

WickLandState.prototype.update = function(dt) {
	this.timeInState += dt;

	var targetPos = new Vec2(Wick.kWickDismountOffsetX, Wick.kWickDismountOffsetY).add(this.host.player.getPos());
	var currPos = this.host.getPos();
	var diff = targetPos.sub(currPos);
	var len = diff.Magnitude();
	if (len > 0.1) {
		var p = 200 * dt / len;
		if (p > 1) p = 1;
		var newPos = currPos.addNew(diff.mul(p));
		this.host.setPos(newPos);
	}
};

WickLandState.prototype.leave = function() {
	//this.host.updateOffScreen = true;
	this.host.setPos(new Vec2(Wick.kWickDismountOffsetX, Wick.kWickDismountOffsetY).add(this.host.player.getPos()));
	this.host.player.enable(true);
	app.game.setStageStarted();
};

WickLandState.prototype.message = function(message) {
	if (message == "stopped")
		this.fsm.setState(Wick.states.kStateIdle);
};

WickLandState.prototype.transition = function() {
	return false;
};

// ----------------------------------------------------------------------------

function WickExitStageState() {
	BaseState.apply(this, arguments);


}

WickExitStageState.prototype = new BaseState();
WickExitStageState.prototype.constructor = WickExitStageState;

WickExitStageState.prototype.enter = function(msg, fromState) {
	this.host.updateOffScreen = true;
	this.host.setAndPlay(this.host.mount, false);
	this.timeInState = 0;
	this.onGround = true;
	this.flying = false;
};

WickExitStageState.prototype.update = function(dt) {
	this.timeInState += dt;
	if (!this.onGround) {
		if (this.flying) {
			this.host.setPos(this.host.getPos().addNew(new Vec2(200, -100).mul(dt)));
			if (!this.host.isInRect(app.game.getScreenRect())) {
				app.game.exitToTallyScreen();
			}
		} else {
			this.host.setPos(this.host.getPos().addNew(new Vec2(50, -150).mul(dt)));
		}
	}
};

WickExitStageState.prototype.leave = function() {
};

WickExitStageState.prototype.message = function(message) {
	if (message == "stopped") {
		this.host.setAndPlay(this.host.flyRight);
		this.host.currAnimation.gotoTime(2 / 3);
		this.flying = true;
	} else if (message == "takeoff") {
		this.onGround = false;
	}
};

WickExitStageState.prototype.transition = function() {
	return false;
};