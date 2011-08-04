/**
 * GameObjects.js
 *
 * Depends on Common.js, Trigger.js
 */

//-----------------------------------------------------------------------------------------

/**
 * GameParticle class
 */
GameParticle.prototype = new TriggerParticle();
GameParticle.prototype.constructor = GameParticle;

/**
 * GameParticle is another base that adds two main functionalities,
 * a start position that can be used to reset the object and
 * functions for keeping track of when the object enters and exits
 * water (if the water level has been set).
 *
 * @returns {GameParticle}
 */
function GameParticle() {
	// by default a particle is not in water and there's no water it'll be affected by.
	this.startPos = new Vec2(0, 0);
	this.waterLevel = -1.0;
	this.wasInWater = false;
	this.inWater = false;
}

/**
 * gives particle position
 *
 * @returns Vec2
 */
GameParticle.prototype.getPos = function() {
	return this.startPos;
};

/**
 * gives particle position
 *
 * @returns Vec2
 */
GameParticle.prototype.getStartPos = function() {
	return this.startPos;
};

/**
 * set position (abstract)
 *
 * @param pos is a Vec2
 * @param dropToGround is boolean
 */
GameParticle.prototype.setPos = function(pos, dropToGround) {
	assert(false);
};

/**
 * set start position
 *
 * @param x is a number
 * @param y is a number
 */
GameParticle.prototype.setStartPos = function(x, y) {
	this.startPos = new Vec2(x, y);
};

GameParticle.prototype.update = function(dt) {
	// Only update if there's a valid waterlevel set
	if (this.waterLevel != -1) {
		this.inWater = this.getPos().y >= this.waterLevel;

		// If this particle has made a transition from or to water
		if (this.inWater ? !this.wasInWater : this.wasInWater) {
			// Call the appropriate transition method and update the status flag.
			if (this.inWater)
				this.onEnterWater();
			else
				this.onExitWater();
			this.wasInWater = this.inWater;
		}
	}
};

GameParticle.prototype.setWaterLevel = function(f) {
	this.waterLevel = f;
	this.updateInWaterFlag();
};

GameParticle.prototype.updateInWaterFlag = function() {
	if (this.waterLevel != -1)
		this.inWater = this.wasInWater = this.getPos().y >= this.waterLevel;
	else
		this.inWater = this.wasInWater = false;
};

GameParticle.prototype.waterLevel = function() {
	return this.waterLevel;
};

GameParticle.prototype.isInWater = function() {
	return this.inWater;
};

//-----------------------------------------------------------------------------------------

/**
 * GameObject class
 */
GameObject.prototype = new GameParticle();
GameObject.prototype.constructor = GameObject;

/**
 * Game object class
 */
function GameObject() {
	// Set to true if this object was statically placed i.e. placed within a level and not spawned at runtime.
	this.staticallyPlaced = false;
	this.disableWhenOffScreen = true;
	this.updateOffScreen = false;
	this.visible = true;
	this.show = true;
	this.enabled = false;
	this.objType = -1;
	this.subType = -1;
	this.objId = 0;
	// lists
	this.interactTargets = [];
	this.interactVolumes = [];
	this.interactList = [];

	this.currentCameraOffset = null;

	this.splashAnim = null;
	this.splashOutAnim = null;

	this.onScreen = true;

	this.grade = null;
}

/*
 * Private methods
 */

/**
 * adds an interact target
 *
 * @param gameObject is a GameObject
 * @param param is a string
 */
GameObject.prototype.addInteractTarget = function(gameObject, param) {
	assert(gameObject instanceof GameObject);
	this.interactTargets.push({gameObject : gameObject, param : param});
};

/**
 * removes interact target
 *
 * @param gameObject is a GameObject
 * @param param is a string
 */
GameObject.prototype.removeInteractTarget = function(gameObject, param) {
	assert(gameObject instanceof GameObject);
	var i, cursor;
	for (i = 0; i < this.interactTargets.length; i++) {
		cursor = this.interactTargets[i];
		if (cursor.gameObject == gameObject && cursor.param == param) {
			this.interactTargets.splice(i, 1);
			break;
		}
	}
};

/**
 * post-construction
 */
GameObject.prototype.create = function(triggerSystem) {
	assert(triggerSystem instanceof TriggerSystem);
	this.triggerSystem = triggerSystem;
};

/**
 * initialize positioning
 *
 * @param reinit is boolean
 */
GameObject.prototype.init = function(reinit) {
	reinit = reinit === undefined ? false : reinit;
	this.setPos(this.getStartPos(), true);
	this.interactTargets = [];
	if (!reinit) {
		this.enabled = true;
		this.show = true;
		this.updateOffScreen = false;
		this.disableWhenOffScreen = false;
	}
};

GameObject.prototype.onCreate = function(res) {
	this.splashInSound = ResourceDepot.getInstance().getSFX("splash_in");
	this.splashOutSound = ResourceDepot.getInstance().getSFX("splash_out");
	this.staticallyPlaced = true;
	this.setStartPos(res.x, res.y);
	this.grade = res.grade;
	this.objId = res.name;

	this.splashAnim = ResourceDepot.getInstance().getAnimation("water_splash");
	this.splashOutAnim = new AnimationHandle(this.splashAnim);
	this.splashOutAnim.setRange(11 / 15, 1);
};

/**
 * deinitialize
 */
GameObject.prototype.deinit = function() {
	this.removeInteractVolumes();
	if (!this.staticallyPlaced) {
		this.pushOnDeathRow();
	} else if (this.enabled && this.disableWhenOffScreen) {
		this.enable(false);
	}
};

/**
 * resets trigger interaction
 */
GameObject.prototype.reset = function() {
	if (this.staticallyPlaced) {
		this.enable(true);
		this.setPos(this.getStartPos());
		this.removeInteractVolumes();
	} else {
		this.deinit();
		this.pushOnDeathRow();
	}
};

/**
 * enabling/disabling
 *
 * @param isEnabled is boolean
 */
GameObject.prototype.enable = function(isEnabled) {
	this.enabled = isEnabled;
	if (isEnabled) {
		this.onEnable();
	} else {
		this.onDisable();
		if (!this.staticallyPlaced) {
			this.deinit();
			this.pushOnDeathRow();
		}
	}
};

/**
 * get game object type
 *
 * @returns {Number}
 */
GameObject.prototype.getType = function() {
	return this.objType;
};

GameObject.prototype.getGrade = function() {
	return this.grade;
};

/**
 * get sub-type (int)
 *
 * @returns {Number}
 */
GameObject.prototype.getSubType = function() {
	return this.subType;
};

/**
 * get game object id
 *
 * @returns {Number}
 */
GameObject.prototype.getId = function() {
	return this.objId;
};

// Trigger interaction

/**
 * return false if this will cause the stage to be deinitialised.
 *
 * @param gameObject is a GameObject
 * @param param is a string
 */
GameObject.prototype.onInteract = function(gameObject, param) {
	assert(gameObject instanceof GameObject);
	return true;
};

/**
 * checks whether there are any TriggerVolumes
 *
 * @returns {Boolean}
 */
GameObject.prototype.isInteractive = function() {
	return this.interactVolumes.length != 0;
};

/**
 * creates volume and registers it
 *
 * @param rect is a Rectf
 * @param param is a string
 * @param parented is boolean
 */
GameObject.prototype.setInteractive = function(rect, param, parented) {
	assert(rect instanceof Rectf);
	param = param === undefined ? "default" : param;
	parented = parented === undefined ? true : parented;
	var volume = new TriggerVolume("interact", rect, parented ? this : null, createCallback(GameObject.prototype.onTrigger, this), "interact_enter" + param, "interact_exit" + param);
	app.game.currentStage.triggerSystem.addVolume(volume);
	this.interactVolumes.push(volume);
	this.interactList.push({param : param, rect : rect, parented : parented});
};

/**
 * removes all volumes
 */
GameObject.prototype.setNonInteractive = function() {
	for (var i = 0; i < this.interactVolumes.length; i++) {
		app.game.currentStage.triggerSystem.removeVolume(this.interactVolumes[i]);
	}
	this.interactVolumes = [];
	this.interactList = [];
};

/**
 * looks up for a n interact target with game object of specified type
 *
 * @param type is an integer
 * @returns {Boolean}
 */
GameObject.prototype.hasInteractTarget = function(type) {
	type = type === undefined ? 0xffffffff : type; // todo: use 8 bytes?
	for (var i = 0; i < this.interactTargets.length; i++) {
		if (this.interactTargets[i].gameObject.getType() & type) {
			return true;
		}
	}
	return false;
};

/**
 * sends messages to interact targets
 */
GameObject.prototype.interact = function() {
	var i, cursor;
	for (i = 0; i < this.interactTargets.length; i++) {
		cursor = this.interactTargets[i];
		if (!cursor.gameObject.onInteract(this, cursor.param)) {
			break;
		}
	}
};

/**
 * finds a rectangle by parameter
 *
 * @param param is a string
 * @returns Rectf or null
 */
GameObject.prototype.getInteractRect = function(param) {
	param = param === undefined ? "default" : param;
	var i, cursor;
	for (i = 0; i < this.interactList.length; i++) {
		cursor = this.interactList[i];
		if (cursor.param == param) {
			return cursor.parented ? cursor.rect.offset(this.getPos()) : cursor.rect;
		}
	}
	return null;
};

/**
 * handles trigger collision messages
 *
 * @param param is a string
 * @param volume is a TriggerVolume
 * @param object is a TriggetObject
 */
GameObject.prototype.onTrigger = function(param, volume, object) {
	if (object.particle instanceof GameObject) {
		if (param.indexOf("interact_enter") == 0) {
			object.particle.addInteractTarget(this, param.substring("interact_enter".length));
		} else if (param.indexOf("interact_exit") == 0) {
			object.particle.removeInteractTarget(this, param.substring("interact_exit".length));
		}
	}
};

/**
 * push the object on death row
 */
GameObject.prototype.pushOnDeathRow = function() {
	app.game.pushOnDeathRow(this);
};

GameObject.prototype.update = function(dt) {
	GameParticle.prototype.update.call(this, dt);
	//todo?
};

GameObject.prototype.setDisableWhenOffScreen = function(b) {
	this.disableWhenOffScreen = b;
};

GameObject.prototype.onEnterWater = function() {
	app.audio.playFX(this.splashInSound);
	app.game.currentStage.particleSystem.spawnAnimatedParticle(this.splashAnim.clone(), new Vec2(this.getPos().x, this.waterLevel), new Vec2(0, 0), true);
};

GameObject.prototype.onExitWater = function() {
	app.audio.playFX(this.splashOutSound);
	app.game.currentStage.particleSystem.spawnAnimatedParticle(this.splashOutAnim.clone(), new Vec2(this.getPos().x, this.waterLevel), new Vec2(0, 0), true);
};

GameObject.prototype.isInRect = function(r) {
	var obj = this.getObjectExtent();
	obj = obj.offset(this.getPos());
	return r.overlaps(obj);
};

GameObject.prototype.isInScreen = function () {
	return this.enabled && this.isInRect(app.game.getScreenRect());
};

GameObject.prototype.getObjectExtent = function () {
	return new Rectf(-50, -50, 50, 50); // todo: temporary.
};

GameObject.prototype.removeInteractVolumes = function() {
	for (var i = 0; i < this.interactList.length; i++) {
		app.game.currentStage.triggerSystem.removeVolume(this.interactList[i]);
	}
	this.interactList = [];
};

GameObject.prototype.onDisable = function() {
};

GameObject.prototype.onEnable = function() {
};

GameObject.prototype.setCameraOffset = function(offset) {
	this.currentCameraOffset = offset;
};

GameObject.prototype.getCameraOffset = function() {
	return this.currentCameraOffset;
};


//-----------------------------------------------------------------------------------------

function GameObjects(depth) {
	this.depth = depth;
	// temp
	this.children = [];
}

GameObjects.prototype.addChild = function (obj) {
	this.children.push(obj);
};

GameObjects.prototype.draw = function (render, x, y) {
	for (var i = 0; i < this.children.length; i++) {
		if(this.children[i].onScreen && this.children[i].enabled)
			this.children[i].draw(render, x, y);
	}
};

GameObjects.prototype.update = function (dt) {
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].update(dt);
	}
};

GameObjects.prototype.init = function () {
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].init();
	}
};

/**
 * Gets all objects of a specific type.
 *
 * @param {Function} type
 */
GameObjects.prototype.getObjectsByType = function(type) {
	var list = [];
	for (var i = 0; i < this.children.length; i++) {
		var obj = this.children[i];
		if (obj instanceof type) {
			list.push(obj);
		}
	}
	return list;
};

// ----------------------------------------------------------------------------

var IdolType = {
	kIdolKindle: 0,
	kIdolWick: 1,
	kIdolMan1: 2,
	kIdolGoblin: 3,
	kIdolVillager1: 4,
	kIdolVillager2: 5,
	kIdolBrownieY: 6,
	kIdolBrownieR: 7,
	kIdolBrownieB: 8,
	kIdolBrownieG: 9,
	kIdolBrownieP: 10,
	kIdolMan2: 11,
	kIdolMan3: 12,
	kIdolGyro: 13,
	kIdolCandleFinger: 14,
	kIdolChest: 15,
	kIdolCaveEntranceRocks: 16,
	kIdolCaveEntranceBricks: 17,
	kIdolCaveEntranceBoards: 18,
	kIdolFlamesprite: 19,
	kIdolBasket: 20,
	kIdolAppleBasket: 21,
	kIdolSiegeTower: 22,
	kIdolMortar: 23,
	kMaxIdols : 24
};

var GemType = {
	kGemYellow: 0,
	kGemRed: 1,
	kGemBlue: 2,
	kGemPurple: 3,
	kGemGreen: 4,
	kMaxGemType :5
};

var MetalType = {
	kMetalGold: 0,
	kMetalSilver: 1,
	kMaxMetalType: 2
};

var BrownieType = {
	kBrownieYellow: 0,
	kBrownieRed: 1,
	kBrownieBlue: 2,
	kBrownieGreen: 3,
	kBrowniePurple: 4,
	kBrownieMax: 5
};

var EmotionType = {
	kEmoteNormal: 0,
	kEmoteHappy: 1,
	kEmoteMad: 2,
	kEmoteSurprised: 3,
	kEmoteSarcastic: 4,
	kEmoteSad: 5,
	kEmoteMax:6
};

var DropTableType = {
	kDTVillager: 0,
	kDTSoupGrem: 1,
	kDTScoutGrem: 2,
	kDTWarriorGrem: 3,
	kDTGuardGrem: 4,
	kDTThiefGrem: 5,
	kDTKiteGrem: 6,
	kDTBouncerGrem: 7,
	kDTWishingWell: 8,
	kDTAppleBasket: 9,
	kDTCandleFinger: 10,
	kDTChestGradeA: 11,
	kDTChestGradeB: 12,
	kDTChestGradeC: 13,
	kDTMortar: 14,
	kMaxDT: 15
};

var PickupType = {
	kPickupFireworks: 0,
	kPickupDiamond: 1,
	kPickupEmerald: 2,
	kPickupRuby: 3,
	kPickupOpal: 4,
	kPickupGoldenApple: 5,
	kPickupAquamarine: 6,
	kPickupAmethyst: 7,
	kPickupGoldenBar: 8,
	kPickupGoldenGyro: 9,
	kPickupApple: 10,
	kPickupSilverBar: 11,
	kPickupSilverGyro: 12,
	kPickupCopperBar: 13,
	kPickupCopperGyro: 14,
	kPickupGoldenAcorn: 15,
	kPickupDrumStick: 16,
	kPickupCupCake: 17,
	kPickupRootBeer: 18,
	kPickupCarrot: 19,
	kPickupPixieStick: 20,
	kPickupGoldenWings: 21,
	kPickupMaxType: 22
};
