/**
 * The Game class manages the ingame state.
 *
 * @param {ResourceDepot} resources the resource depot instance.
 * @returns {Game}
 */
function Game(resources) {
	this.resources = resources;

	this.currentStage = null;
	this.mainStage = null;
	this.stages = {};

	this.camera = new Vec2(0, 0);
	this.cameraConstraint = new Rectf(0, 0, 0, 0);

	this.shaders = null;

	this.loadingStageProgress = 0;

	this.initialized = false;
	this.loadingStage = false;
	this.runningStage = false;

	this.externalPreloadCallback = null;

	this.focus = null;

	this.hud = new GUIHeadsUp();

	this.iteratingObjects = 0;
	this.currentFoe = null;
	this.currentFoeTimeout = 0;
	this.scoreObservers = [];

	this.deathRow = [];

	this.score = 0;
	this.tallyInfo = null;

	this.fadeParam = 0;
	this.fadeOut = false;
	this.respawn = false;
	this.isInCave = false;

	this.pendingMessages = [];

	this.dialogueSystem = new DialogueSystem();
	this.dialogueTriggerTimer = 0;

	this.stagesFinished = -1;

	/**
	 * Provides a set of shapes based on the given coordinates
	 *
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 */
	var _this = this;
	this.provider = function (x1, x2, y1, y2) {
		var tileW = _this.currentStage.tileW;
		var tileH = _this.currentStage.tileH;
		var tileX1 = Math.floor(x1 / tileW);
		var tileX2 = Math.floor(x2 / tileW);
		var tileY1 = Math.floor(y1 / tileW);
		var tileY2 = Math.floor(y2 / tileW);
		var shapes = [];

		for (var x = tileX1; x <= tileX2; x++) {
			if (_this.currentStage.shapes[x]) {
				for (var y = tileY1; y <= tileY2; y++) {
					if (_this.currentStage.shapes[x][y]) {
						for (var s = 0; s < _this.currentStage.shapes[x][y].length; s++) {
							shapes.push(_this.currentStage.shapes[x][y][s]);
						}
					}
				}
			}
		}

		var c;
		// todo: temporary solution for keeping Kindle inside the stage to the left and right.
		if (x1 <= 0) {
			c = new ConvexShape();
			c.PushPoint(new Vec2(0, -100));
			c.PushPoint(new Vec2(-100, -100));
			c.PushPoint(new Vec2(-100, _this.currentStage.gamePlayLayerExtent.height + 100));
			c.PushPoint(new Vec2(0, _this.currentStage.gamePlayLayerExtent.height + 100));
			shapes.push(c);
		}

		if (x2 >= _this.currentStage.gamePlayLayerExtent.width) {
			c = new ConvexShape();
			c.PushPoint(new Vec2(_this.currentStage.gamePlayLayerExtent.width + 0, -100));
			c.PushPoint(new Vec2(_this.currentStage.gamePlayLayerExtent.width + 100, -100));
			c.PushPoint(new Vec2(_this.currentStage.gamePlayLayerExtent.width + 100, _this.currentStage.gamePlayLayerExtent.height + 100));
			c.PushPoint(new Vec2(_this.currentStage.gamePlayLayerExtent.width + 0, _this.currentStage.gamePlayLayerExtent.height + 100));
			shapes.push(c);
		}

		return shapes;
	};
}

Game.prototype.init = function () {
	var depot = ResourceDepot.instance;
	this.points_1200 = depot.getImage("floating_points", "1200_points");
	this.points_1000 = depot.getImage("floating_points", "1000_points");
	this.points_800 = depot.getImage("floating_points", "800_points");
	this.points_700 = depot.getImage("floating_points", "700_points");
	this.points_600 = depot.getImage("floating_points", "600_points");
	this.points_500 = depot.getImage("floating_points", "500_points");
	this.points_400 = depot.getImage("floating_points", "400_points");
	this.points_300 = depot.getImage("floating_points", "300_points");
	this.points_150 = depot.getImage("floating_points", "150_points");
	this.points_100 = depot.getImage("floating_points", "100_points");
	this.points_75 = depot.getImage("floating_points", "75_points");
	this.points_50 = depot.getImage("floating_points", "50_points");
	this.points_25 = depot.getImage("floating_points", "25_points");
	this.points_10 = depot.getImage("floating_points", "10_points");
	this.points_1 = depot.getImage("floating_points", "1_points");

	this.plusHealth = [];
	this.plusHealth[0] = depot.getImage("battle_text", "plus_one");
	this.plusHealth[1] = depot.getImage("battle_text", "plus_two");
	this.plusHealth[2] = depot.getImage("battle_text", "plus_three");
	this.plusHealth[9] = depot.getImage("battle_text", "plus_ten");

	this.minusHealth = [];
	this.minusHealth[0] = depot.getImage("battle_text", "minus_one");
	this.minusHealth[1] = depot.getImage("battle_text", "minus_two");
	this.minusHealth[2] = depot.getImage("battle_text", "minus_three");
	this.minusHealth[9] = depot.getImage("battle_text", "minus_ten");

	// Missing atlas?
	this.critHealth = [];
	this.critHealth[1] = depot.getImage("critical_hits", "crit_two", true);
	this.critHealth[3] = depot.getImage("critical_hits", "crit_four", true);
	this.critHealth[5] = depot.getImage("critical_hits", "crit_six", true);
	this.critHealth[7] = depot.getImage("critical_hits", "crit_eight", true);
	this.critHealth[9] = depot.getImage("critical_hits", "crit_ten", true);

	this.shieldHealth = depot.getImage("battle_text", "shield");
	this.shieldZeroHealth = depot.getImage("battle_text", "shield_zero");

	this.initialized = true;
};

/**
 * Starts loading a stage.
 *
 * @param {String} stageName the name of a stage.
 * @returns {Boolean} True if the stage could start loading.
 */
Game.prototype.loadStage = function(stageName, callback) {
	if (!this.initialized) {
		return false;
	}

	this.externalPreloadCallback = callback;
	this.render.evict();

	this.tallyInfo = new TallyInfo();

	this.hud.init();
	this.scoreObservers = [this.hud.scoreDisp, this.hud.acornDisp]; // TEMP
	for (var i = 0; i < this.scoreObservers.length; i++) {
		this.scoreObservers[i].onScoreSet(this.score);
		this.scoreObservers[i].onAcornsSet(this.tallyInfo.acorns);
	}

	this.initStage(stageName);
	this.stages = {};
	this.dialogueSystem.resetAllTriggers();

	return true;
};

Game.prototype.initStage = function(stageName) {
	this.currentStage = new Stage(stageName, createCallback(this.preloadCallback, this));
	this.currentStage.initStage(createCallback(this.preloadCallback, this));

	this.dialogueTriggerTimer = 20;

	if (this.stagesFinished == -1) {
		this.stagesFinished = 0;
	}

	this.setUpStage();
};

Game.prototype.setUpStage = function() {
	var gpr = this.currentStage.gameplayExtent;
	var screenW = this.render.getWidth();
	var screenH = this.render.getHeight();
	this.cameraConstraint = new Rectf(0, 0, (gpr.w - screenW), (gpr.h - screenH));

	this.checkStageCompletion();

	// Center camera if screen is wider than gameplay area
	if (gpr.w < screenW) {
		var halfw = (screenW - gpr.w) / 2;
		this.cameraConstraint.x0 = halfw;
		this.cameraConstraint.x1 = halfw;
	}

	// Center camera if screen is higher than gameplay area
	if (gpr.w < screenH) {
		var halfh = (screenH - gpr.h) / 2;
		this.cameraConstraint.y0 = halfh;
		this.cameraConstraint.y1 = halfh;
	}

	if (!this.isInCave) {
		this.updateCamera(0);
		this.updateObjects(0);
	}
};

/**
 * Called when the preloading face have changed state.
 *
 * @param {Number} status the progress of the preloading face.
 */
Game.prototype.preloadCallback = function(status) {
	if (status >= 1) {
		this.loadingStage = false;
		this.runningStage = true;
	}

	this.loadingStageProgress = status;

	if (this.externalPreloadCallback !== null) this.externalPreloadCallback(status);
};

/**
 * Updates the camera position.
 */
Game.prototype.updateCamera = function(dt) {
	var halfW = Math.floor(this.render.getWidth() / 2);
	var halfH = Math.floor(this.render.getHeight() / 2);

	if (this.focus) {
		var focusPos = this.focus.getPos().addNew(this.focus.getCameraOffset());
		var newCameraPos = new Point2(halfW - Math.floor(focusPos.x), halfH - Math.floor(focusPos.y));

		// Camera deadzone
		var kDeadZone = 32;
		var diff = newCameraPos.copy().sub(this.camera);

		if (diff.x > kDeadZone) {
			diff.x -= kDeadZone;
		}
		else if (diff.x < -kDeadZone) {
			diff.x += kDeadZone;
		}
		else {
			diff.x = 0;
		}

		if (diff.y > kDeadZone) {
			diff.y -= kDeadZone;
		}
		else if (diff.y < -kDeadZone) {
			diff.y += kDeadZone;
		}
		else {
			diff.y = 0;
		}

		this.camera.add(diff);
	}

	// Rects only deal with positive numbers
	this.camera.mul(-1);
	this.camera = this.cameraConstraint.clip(this.camera);
	this.camera.mul(-1);
};

Game.prototype.update = function(dt) {
	if (this.currentStage != null && !this.loadingStage) {

		if (this.dialogueTriggerTimer > 0 && this.fadeParam == 0) {
			this.dialogueTriggerTimer -= dt;
			if (this.dialogueTriggerTimer <= 0) {
				this.dialogueTrigger("enter");
			}
		}

		this.updateCamera();

		this.updateObjects(dt);

		this.currentStage.update(dt);

		this.updateDeathRow();

		this.checkFoeTimeout(dt);
		this.hud.update(dt);

		if (this.fadeOut || this.fadeParam > 0) {
			if (this.fadeOut) {
				if (this.fadeParam == 1) {
					this.fadeOut = false;

					/*this.currentStage.gameObjects.children.forEach(function(v){
					 v.onDisable();
					 });*/
					this.focus.onDisable();

					//app.game.currentStage.triggerSystem.reset()

					if (this.enterStage) {
						this.hud.objectiveDisp.hide(true);
						this.mainStage = this.currentStage;
						this.isInCave = true;
						if (!this.stages[this.targetStage]) {
							this.initStage(this.targetStage, null);
							this.stages[this.currentStage.name] = this.currentStage;
							this.currentStage.gameObjects.addChild(this.focus);
						} else {
							this.currentStage = this.stages[this.targetStage];
							this.setUpStage();
						}

						this.focus.enterCave(this.targetStage, this.targetDoorway, this.houseId, this.houseStatus);

						this.focus.placeAtExit(this.targetDoorway);
					} else {
						this.isInCave = false;
						this.hud.objectiveDisp.hide(false);
						var name = this.currentStage.name;
						this.currentStage = this.mainStage;
						this.setUpStage();
						if (!this.respawn) this.focus.placeAtEntrance(this.targetDoorway, name);
					}

					this.dialogueTriggerTimer = 0.05;

					app.audio.stopAllSoundFX();

					this.focus.triggerSystem = this.currentStage.triggerSystem;

					this.focus.onEnable();

					this.sendPendingMessages();

					this.checkStageCompletion();

					/*this.currentStage.gameObjects.children.forEach(function(v){
					 v.onEnable();
					 });*/
				}
				this.fadeParam = Math.min(1, this.fadeParam + dt / 0.25);
			}
			else
				this.fadeParam = Math.max(0, this.fadeParam - dt / 0.25);
		}

		this.respawn = false;
	}
};

Game.prototype.updateObjects = function (dt) {
	var cull = this.getCullRect();
	var objects = this.currentStage.gameObjects.children;
	for (var key in objects) {
		if (objects.hasOwnProperty(key)) {
			var o = objects[key];
			if (o.enabled) {
				o.onScreen = o.isInRect(cull);
				if (o.updateOffScreen || o.onScreen) {
					o.update(dt);
				} else if (o.disableWhenOffScreen) {
					if ((o instanceof Gremlin) && o.fsm.currentState == Gremlin.states.kStateKnockedOut) {
						o.onDisable();
						objects.splice(Number(key), 1);
					}
				}
			}
		}
	}
};

Game.prototype.draw = function() {
	if (this.render.frontToBack) {
		if (this.fadeParam != 0) this.render.drawFillScreen(new Pixel32(0, 0, 0, this.fadeParam * 255));
		this.hud.draw(this.render);
	}
	this.currentStage.draw(this.render, this.camera.x, this.camera.y);
	if (!this.render.frontToBack) {
		this.hud.draw(this.render);
		if (this.fadeParam != 0) this.render.drawFillScreen(new Pixel32(0, 0, 0, this.fadeParam * 255));
	}
};

Game.prototype.getScreenRect = function () {
	return new Rectf(-this.camera.x, -this.camera.y,
			-this.camera.x + app.maxWidth,
			-this.camera.y + app.maxHeight);
};


Game.prototype.setFocusObject = function (obj) {
	this.focus = obj;
	var idolInfo = this.focus.getIdolInfo();
	this.hud.healthBarLeft.setIdolInfo(idolInfo, EmotionType.kEmoteNormal, 1, -1, "", "");
	this.focus.addObserver(this.hud.healthBarLeft);
	this.hud.show = true; // todo: wrong place
};

Game.prototype.addChainHit = function () {
	return;
};

Game.prototype.displayShieldHit = function (obj) {
	this.currentStage.particleSystem.spawnImageParticle(this.shieldHealth, obj.getPos().addNew(new Vec2(0, -100)), new Vec2(0, -50), 1.5, true, new Pixel32(255, 0, 0, 128));
};

Game.prototype.displayShieldZeroHit = function (obj) {
	this.currentStage.particleSystem.spawnImageParticle(this.shieldHealth, obj.getPos().addNew(new Vec2(0, -100)), new Vec2(0, -50), 1.5, true, new Pixel32(255, 255, 255, 128));
};

Game.prototype.displayCritHit = function (obj, hp) {
	if (hp >= 0 && hp <= 10) {
		if (this.critHealth[hp - 1] !== undefined) {
			this.currentStage.particleSystem.spawnImageParticle(this.critHealth[hp - 1], obj.getPos().addNew(new Vec2(0, -100)), new Vec2(0, -30), 2.2, true, new Pixel32(255, 0, 0, 128));
		}
	}
};

Game.prototype.displayHeal = function (obj, hp) {
	if (hp >= 0 && hp <= 10) {
		if (this.plusHealth[hp - 1] !== undefined) {
			this.currentStage.particleSystem.spawnImageParticle(this.plusHealth[hp - 1], obj.getPos().addNew(new Vec2(0, -100)), new Vec2(0, -50), 1.5, true);
		}
	}
};

Game.prototype.displayHit = function (obj, hp) {
	if (hp >= 0 && hp <= 10) {
		if (this.minusHealth[hp - 1] !== undefined) {
			this.currentStage.particleSystem.spawnImageParticle(this.minusHealth[hp - 1], obj.getPos().addNew(new Vec2(0, -100)), new Vec2(0, -50), 1.5, true, new Pixel32(255, 0, 0, 128));
		}
	}
};

Game.prototype.getFocusObject = function () {
	return this.focus;
};

Game.prototype.getCurrentPower = function() {
	return 0; //todo: temp sol.
};

Game.prototype.startSpawnSmoke = function (pos) {
	return;
};

Game.prototype.completeStage = function() {
	this.hud.objectiveDisp.hide(true);
	this.hud.objectiveArrow.hideTargetArrow();

	if (this.dialogueTrigger("exit"))
		this.completeStageAfterDialogue = true;
	else {
		this.completeStageAfterDialogue = false;

		this.focus.exitOnWick();
	}
};

Game.prototype.checkStageCompletion = function() {
	if (this.stageObjectivesComplete()) {
		var wick = this.currentStage.gameObjects.getObjectsByType(Wick)[0];
		this.hud.objectiveArrow.showTargetArrow(new Point2(wick.getPos().x, wick.getPos().y - 40));
	} else if (this.currentStage.name == "stage0") {
		var centr = this.currentStage.gameObjects.getObjectsByType(CaveEntrance)[0];
		if (!centr.isCleared())
			this.hud.objectiveArrow.showTargetArrow(new Point2(centr.getPos().x, centr.getPos().y - 50));
		else {
			var obj = this.currentStage.gameObjects.getObjectsByType(House)[0];
			if (obj)
				this.hud.objectiveArrow.showTargetArrow(new Point2(obj.getPos().x - 200, obj.getPos().y));
		}
	} else if (this.currentStage.name == "Stage_0_C1") {
		var obj = this.currentStage.gameObjects.getObjectsByType(CaveExit)[1];
		if (obj)
			this.hud.objectiveArrow.showTargetArrow(new Point2(obj.getPos().x, obj.getPos().y - 50));
	} else {
		this.hud.objectiveArrow.hideTargetArrow();
	}
};

Game.prototype.stageObjectivesComplete = function() {
	var houses = this.currentStage.gameObjects.getObjectsByType(House);

	if (houses.length != 0) {
		for (var i = 0; i < houses.length; i++) {
			if (!houses[i].getStatus()) return false;
		}
		return true;
	}
	return false;
};

Game.prototype.pushOnDeathRow = function (object) {
	this.deathRow.push(object);
	// TODO Set dead-property of object?
};

Game.prototype.updateDeathRow = function () {
	var objects = this.currentStage.gameObjects.children;
	for (var i = 0; i < this.deathRow.length; i++) {
		// Find object
		for (var o = 0; o < objects.length; o++) {
			if (this.deathRow[i] && this.deathRow[i] === objects[o]) {
				objects[o].deinit();
				delete objects[o];
				delete this.deathRow[i];
			}
		}
	}

	var newObjects = [];
	for (var o = 0; o < objects.length; o++) {
		if (objects[o] !== undefined) {
			newObjects.push(objects[o]);
		}
	}

	this.currentStage.gameObjects.children = newObjects;
	this.deathRow = [];
};

Game.prototype.addScore = function (score, pos) {
	this.score += score;

	for (var i = 0; i < this.scoreObservers.length; i++) {
		this.scoreObservers[i].onScoreSet(this.score);
	}

	var pointDisplay = null;

	switch (score) {
		case 1200:
			pointDisplay = this.points_1200;
			break;
		case 1000:
			pointDisplay = this.points_1000;
			break;
		case 800:
			pointDisplay = this.points_800;
			break;
		case 700:
			pointDisplay = this.points_700;
			break;
		case 600:
			pointDisplay = this.points_600;
			break;
		case 500:
			pointDisplay = this.points_500;
			break;
		case 400:
			pointDisplay = this.points_400;
			break;
		case 300:
			pointDisplay = this.points_300;
			break;
		case 150:
			pointDisplay = this.points_150;
			break;
		case 100:
			pointDisplay = this.points_100;
			break;
		case 75:
			pointDisplay = this.points_75;
			break;
		case 50:
			pointDisplay = this.points_50;
			break;
		case 25:
			pointDisplay = this.points_25;
			break;
		case 10:
			pointDisplay = this.points_10;
			break;
		case 1:
			pointDisplay = this.points_1;
			break;
		default:
			break;
	}

	if (pointDisplay != null) {
		this.currentStage.particleSystem.spawnImageParticle(pointDisplay, pos.addNew(new Vec2(0, -10)), new Vec2(0, -50), 1.5, true);
	}
};

Game.prototype.addAcorn = function (a) {
	this.tallyInfo.acorns += a;

	for (var i = 0; i < this.scoreObservers.length; i++) {
		this.scoreObservers[i].onAcornsSet(this.tallyInfo.acorns);
	}
};

Game.prototype.addMultiplier = function () {
	this.tallyInfo.multiplier += 0.1;

	for (var i = 0; i < this.scoreObservers.length; i++) {
		this.scoreObservers[i].onMultiplierSet(this.tallyInfo.multiplier);
	}
};

Game.prototype.triggerFireworks = function () {
	return;
};

Game.prototype.stopMagicShimmer = function () {
	return;
};

Game.prototype.enterCave = function(tgtStage, tgtEntrance, houseId, status) {
	if (!this.fadeOut) {
		houseId = houseId === undefined ? -1 : houseId;
		status = status === undefined ? false : status;
		this.targetStage = tgtStage;
		this.targetDoorway = tgtEntrance;
		this.fadeParam = 0;
		this.fadeOut = true;
		this.enterStage = true;
		this.houseId = houseId;
		this.houseStatus = status;
	}
};

Game.prototype.exitCave = function(tgtEntrance) {
	if (!this.fadeOut) {
		this.targetDoorway = tgtEntrance;
		this.fadeParam = 0;
		this.fadeOut = true;
		this.enterStage = false;
	}
};

Game.prototype.doRespawn = function() {
	this.focus.setPos(this.focus.lastLamppost.getPos());
	this.focus.inWater = false;
	this.focus.regenerate();
	this.focus.fsm.setState(PCStates.kStateIdle);

	if (this.isInCave) {
		this.respawn = true;
		this.fadeParam = 1;
		this.fadeOut = true;
		this.enterStage = false;
	}
};

Game.prototype.getCullRect = function () {
	var r = this.getScreenRect();
	return r.expand(100, 100);
};

Game.prototype.setCurrentFoe = function (foe) {
	this.currentFoeTimeout = 0;
	if (this.currentFoe != foe) {
		if (this.currentFoe !== null) this.currentFoe.removeObserver(this.hud.healthBarRight);
		this.currentFoe = foe;
		if (foe !== null) {
			foe.addObserver(this.hud.healthBarRight);
			var idi = this.currentFoe.getIdolInfo();
			this.hud.healthBarRight.setIdolInfo(idi, EmotionType.kEmoteNormal, 10, -1, "", "");
		} else {
			this.hud.healthBarRight.removePermanentIdol();
		}
	}
};

Game.prototype.checkFoeTimeout = function (dt) {
	if (this.currentFoe !== null) {
		this.currentFoeTimeout += dt;
		if (this.currentFoeTimeout > (this.currentFoe.isAlive() ? 3 : 0.25))
			this.setCurrentFoe(null);
	}
};

Game.prototype.spawnPickupTable = function (table, pos, xmin, xmax, ymin, ymax, count) {
	for (var i = 0; i < count; i++) {
		var type = ResourceDepot.instance.getDropType(table);
		// TODO: Implement fireworks, until then, get another drop type
		if (type === Pickup.Type.kPickupFireworks) {
			i--;
			continue;
		}
		this.spawnPickup(type, pos, xmin, xmax, ymin, ymax, 1);
	}
};

Game.prototype.addGameObject = function (object) {
	this.currentStage.gameObjects.children.push(object);
};

Game.prototype.spawnPickup = function (type, pos, xmin, xmax, ymin, ymax, count) {
	if (type === Pickup.Type.kPickupMaxType) {
		return;
	}
	var pickup = null;
	var dir = null;
	for (var i = 0; i < count; i++) {
		dir = new Vec2(randomRange(xmin, xmax), randomRange(ymin, ymax));
		pickup = new Pickup();
		pickup.setType(type);
		pickup.init(false);
		pickup.setPos(pos.copy());
		pickup.bounce(dir);

		this.addGameObject(pickup);
	}
};


Game.prototype.getTileReferences = function () {
	return []; // todo
};

Game.prototype.sendMessageToId = function (id, params) {
	var objects = this.currentStage.gameObjects.children;
	for (var i = 0; i < objects.length; i++) {
		if (objects[i].objId == id) {
			objects[i].onMessage(params);
			return;
		}
	}
	this.pendingMessages.push({id:id, params:params});
};

Game.prototype.sendMessageToType = function (type, params) {
	var objects = this.currentStage.gameObjects.getObjectsByType(type);
	for (var i = 0; i < objects.length; i++) {
		objects[i].onMessage(params);
	}
};

Game.prototype.sendPendingMessages = function () {
	var objects = this.currentStage.gameObjects.children;
	for (var i = 0; i < objects.length; i++) {
		var oid = objects[i].objId;
		if (oid != undefined) {
			for (var j = 0; j < this.pendingMessages.length; j++) {
				if (oid == this.pendingMessages[j].id) {
					objects[i].onMessage(this.pendingMessages[j].params);
					this.pendingMessages.splice(j, 1);
					break;
				}
			}
		}
	}
};

Game.prototype.blastRect = function (r, hits, hitPlayer, burn, countAsChain) {
	hits = hits === undefined ? -1 : hits;
	hitPlayer = hitPlayer === undefined ? false : hitPlayer;
	burn = burn === undefined ? false : burn;
	countAsChain = countAsChain === undefined ? false : countAsChain;

	var objects = this.currentStage.gameObjects.children;
	for (var i = 0; i < objects.length; i++) {
		var hittable = objects[i];
		if (!(hittable instanceof HittableGameObject)) continue;
		if (!(hittable instanceof Gremlin) && !(hittable instanceof PlayerCharacter)) continue;

		if (hittable.isInRect(r) && hittable.enabled && hittable.isAlive()) {
			var fromLeft = hittable.getPos().x > r.center().x;
			if (hittable instanceof PlayerCharacter) {
				if (hitPlayer && !hittable.handleBlast())
					hittable.hit(1, fromLeft);
			} else {
				if (countAsChain)
					this.addChainHit();

				if (burn)
					hittable.burn(fromLeft);
				else if (hits == -1)
					hittable.kill();
				else
					hittable.hit(hits, fromLeft);
			}
		}
	}
};

Game.prototype.getCameraPos = function () {
	return this.camera.copy();
};

Game.prototype.getGameObjectByType = function (type, rect) {
	rect = rect === undefined ? null : rect;
	var objects = this.currentStage.gameObjects.children;
	var res = [];
	for (var i = 0; i < objects.length; i++) {
		var o = objects[i];
		if (o instanceof type && o.enabled) {
			if (rect == null || rect.overlaps(o.getObjectExtent().offset(o.getPos()))) {
				res.push(o);
			}
		}
	}
	return res;
};

Game.prototype.setStageStarted = function () {
	this.dialogueTriggerTimer = 0.05;
	if (this.currentStage.name == "stage0" && !app.noTutorial) {
		this.focus.setBlankState();
		this.showTutorialTip("walk", true);
	}
};

Game.prototype.isCurrStageDialogueCompleted = function(trig) {
	return this.dialogueSystem.isTriggered(this.currentStage.name, trig);
};

Game.prototype.dialogueTrigger = function(trig) {
	var didTrigger = this.dialogueSystem.trigger(this.currentStage.name, trig);
	if (didTrigger) {
		this.focus.dialogueStarted();
	}
	return didTrigger;
};

Game.prototype.getIdolType = function(str) {
	switch (str) {
		case "kindle":
			return IdolType.kIdolKindle;
		case "wick":
			return IdolType.kIdolWick;
		case "man1":
			return IdolType.kIdolMan1;
		case "man2":
			return IdolType.kIdolMan2;
		case "man3":
			return IdolType.kIdolMan3;
		case "gremlin":
			return IdolType.kIdolGoblin;
		case "villager1":
			return IdolType.kIdolVillager1;
		case "villager2":
			return IdolType.kIdolVillager2;
		case "brownie":
			return IdolType.kIdolBrownieY;
		case "gyro":
			return IdolType.kIdolGyro;
		case "candlefinger":
			return IdolType.kIdolCandleFinger;
		case "flamesprite":
			return IdolType.kIdolFlamesprite;
	}
	return IdolType.kMaxIdols;
};


// Temporary - debugging only
Game.prototype.step = function (dt) {
	//if (app.gameLoop.keepUpdating)
	app.appLoop.stop();

	app.looper(dt);
};


Game.prototype.showTutorialTip = function (tip, newStyle) {
	if (newStyle)
		app.setState(appStates.kStateTutorialPage, tip, true);
	else
		app.fsm.onTutorialTip(this.resources.getString(tip));
};

Game.prototype.exitToTallyScreen = function () {
	app.setState(appStates.kStateStageComplete, null, true);
};

Game.prototype.getTallyInfo = function () {
	return this.tallyInfo;
};

function TallyInfo() {
	this.acorns = 0;
	this.gremlins = 0;
	this.chests = 0;
	this.houses = 0;
	this.brownies = 0;
	this.flamesprites = 0;
	this.speedbonus = 0;
	this.herobonus = 1;
	this.withoutdamagebonus = 1;
	this.currscore = 0;
	this.bossdefeat = 0;
	this.multiplier = 1;
}
