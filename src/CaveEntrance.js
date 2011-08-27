/**
 * Entrance to caves.
 */
function CaveEntrance() {
	HittableGameObject.call(this, true);

	this.explodeSound = null;
	this.targetStage = null;
	this.targetExit = null;

	this.exploder = new ShrapnelExploder();
	this.playerEntered = false;
	this.isLeftEntrance = false;
	this.entranceType = 0;

	this.setMaxHitPoints(3);
	this.setHitPoints(3);
}

CaveEntrance.prototype = new HittableGameObject();
CaveEntrance.prototype.constructor = CaveEntrance;

CaveEntrance.prototype.reset = function() {
	HittableGameObject.prototype.reset.call(this);
};

CaveEntrance.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);

	this.entranceType = res.subtype;
	this.targetStage = res.target;
	var p = this.targetStage.indexOf(' ');
	if (p !== -1) {
		this.targetExit = this.targetStage.substr(p + 1);
		this.targetStage = this.targetStage.substr(0, p);
	} else
		this.targetExit = null;
};

CaveEntrance.prototype.init = function(reinit) {
	HittableGameObject.prototype.init.call(this, reinit);

	if (this.enabled) {
		var triggerObj = new TriggerObject(this, createCallback(this.onTrigger, this), this.getHittableRect());
		app.game.currentStage.triggerSystem.addObject(triggerObj);
	}

	this.isLeftEntrance = this.targetExit == "left";

	if (!reinit) this.playerEntered = false;

	this.exploder.reset();
	this.exploder.setBase(this);

	var dep = ResourceDepot.getInstance();

	if (this.entranceType == 0) {
		var entranceRocks = "entrance_rocks";
		if (this.isLeftEntrance) {
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_1"), new Vec2(13, -4));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_2"), new Vec2(5, -20));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_0"), new Vec2(-14, 19));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_0"), new Vec2(3, -10));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_1"), new Vec2(-10, 0));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_2"), new Vec2(5, 18));
		} else {
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_1r"), new Vec2(-13, -4));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_2r"), new Vec2(-5, -20));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_0r"), new Vec2(14, 19));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_0r"), new Vec2(-3, -10));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_1r"), new Vec2(10, 0));
			this.exploder.addShrapnelPiece(dep.getImage(entranceRocks, "rock_2r"), new Vec2(-5, 18));
		}
	} else if (this.entranceType == 1) {
		var entranceBricks = "entrance_bricks";
		var yShift = 15;
		if (this.isLeftEntrance) {
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_0"), new Vec2(-3, 22 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_1"), new Vec2(11, 26 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_2"), new Vec2(-12, 32 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_3"), new Vec2(3, -4 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_4"), new Vec2(10, -21 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_5"), new Vec2(8, -42 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_6"), new Vec2(10, -54 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_7"), new Vec2(9, -68 + yShift));
		} else {
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_0r"), new Vec2(3, 22 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_1r"), new Vec2(-11, 26 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_2r"), new Vec2(12, 32 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_3r"), new Vec2(-3, -4 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_4r"), new Vec2(-10, -21 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_5r"), new Vec2(-8, -42 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_6r"), new Vec2(-10, -54 + yShift));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBricks, "brick_7r"), new Vec2(-9, -68 + yShift));
		}
	} else {
		var entranceBoards = "entrance_boards";
		var entranceBoarded = "entrance_boarded";
		if (this.isLeftEntrance) {
			this.exploder.setImage(dep.getImage(entranceBoarded, "left"));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_0"), new Vec2(3, -41));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_1"), new Vec2(3, 5));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_2"), new Vec2(18, -38));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_3"), new Vec2(19, 24));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_4"), new Vec2(8, 4));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_5"), new Vec2(15, -30));
		} else {
			this.exploder.setImage(dep.getImage(entranceBoarded, "right"));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_0r"), new Vec2(-11, -28));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_1r"), new Vec2(-11, 38));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_2r"), new Vec2(3, 16));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_3r"), new Vec2(0, -34));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_4r"), new Vec2(-7, -21));
			this.exploder.addShrapnelPiece(dep.getImage(entranceBoards, "board_5r"), new Vec2(-1, 13));
		}
	}

	this.explodeSound = dep.getSFX("exploding_rocks");
};

CaveEntrance.prototype.deinit = function() {
	HittableGameObject.prototype.deinit.call(this, reinit);
	app.game.currentStage.triggerSystem.removeObject(this);
};

CaveEntrance.prototype.update = function(dt) {
	HittableGameObject.prototype.update.call(this, dt);
	this.exploder.update(dt);
};

CaveEntrance.prototype.draw = function(render, x, y) {
	this.exploder.draw(render, x, y);
	HittableGameObject.prototype.draw.call(this, render, this.getPos().x + x, this.getPos().y + y);
};


CaveEntrance.prototype.onTrigger = function(param, volume, object) {
	if (param == "damage" || param == "stun" || param == "damage_pwr" || param == "stun_pwr") {
		var hitByPlayer = volume.getParent() && volume.getParent() instanceof PlayerCharacter;
		//todo:app.game.addChainHit();

		app.game.setCurrentFoe(this);
		this.hit(1, volume.getCenter().x < this.getPos().x, false, true);
	}
};

CaveEntrance.prototype.onDisable = function() {
	app.game.currentStage.triggerSystem.removeObject(this);
};

CaveEntrance.prototype.onEnable = function() {
	var triggerObj = new TriggerObject(this, createCallback(this.onTrigger, this), this.getHittableRect());
	app.game.currentStage.triggerSystem.addObject(triggerObj);
};


CaveEntrance.prototype.setDamagedState = function(fromLeft, hitsTaken) {
	this.exploder.hit(fromLeft);
};

CaveEntrance.prototype.setTossedState = function(fromLeft, low) {
	this.exploder.hit(fromLeft);
};

CaveEntrance.prototype.setKnockedOutState = function(fromLeft, hitsTaken, tossed) {
	var game = app.game;

	this.setInteractive(new Rectf(-20, -40, 20, 40));

	//todo:game.quake(5);
	if (!this.isInWater() && false) {
		//todo: below. change if above.
		if (this.entranceType == 0)
			game.startShatterDust(this.getPos(), new Pixel32(176, 143, 92), 1);
		else if (this.entranceType == 1)
			game.startShatterDust(this.getPos(), new Pixel32(206, 199, 178), 1);
		else
			game.startShatterDust(this.getPos(), new Pixel32(113, 88, 36), 1);
	}

	this.exploder.explode(fromLeft);
	app.audio.playFX(this.explodeSound);
	app.game.currentStage.triggerSystem.removeObject(this);
};

CaveEntrance.prototype.isCleared = function() {
	return this.exploder.isExploding() || this.exploder.isDone();
};

CaveEntrance.prototype.breakOpen = function() {
	if (!this.isCleared()) {
		this.playerEntered = true;
		this.hit(10, false);
		var pos = this.getPos();
		var blast = new Rectf(pos.x, pos.y, pos.x, pos.y);
		blast.expand(800 / 6, 600 / 4);
		app.game.blastRect(blast);
	}
};

CaveEntrance.prototype.onInteract = function(obj, param) {
	this.playerEntered = true;
	app.game.enterCave(this.targetStage, this.targetExit);
	return false;
};

/**
 * @param {Array} msg list of values with strings as keys.
 */
CaveEntrance.prototype.onMessage = function(msg) {
	if (msg.hasOwnProperty("caveStatus")) {
		if (msg["caveStatus"]) {
			this.exploder.setCleared();
			this.setInteractive(new Rectf(-20, -40, 20, 40));
			app.game.currentStage.triggerSystem.removeObject(this);
		}
		delete msg["caveStatus"];
	}

	HittableGameObject.prototype.onMessage.call(this, msg);
};

CaveEntrance.prototype.setPos = function(pos, dropToGround) {
};

CaveEntrance.prototype.getObjectExtent = function() {
	return new Rectf(-50, -65, 50, 65);
};

CaveEntrance.prototype.getHittableRect = function() {
	return new Rectf(-30, -30, 30, 30);
};

CaveEntrance.prototype.getIdolInfo = function() {
	var it;
	switch (this.entranceType) {
		case 0:
			it = IdolType.kIdolCaveEntranceRocks;
			break;
		case 1:
			it = IdolType.kIdolCaveEntranceBricks;
			break;
		default:
			it = IdolType.kIdolCaveEntranceBoards;
			break;
	}

	return new IdolInfo(it, GemType.kGemPurple, GemType.kGemPurple, MetalType.kMetalSilver);
};


CaveEntrance.prototype.setWaterLevel = function(f) {
	GameObject.prototype.setWaterLevel.call(this, f);
	this.exploder.setWaterLevel(f); 
};

// ----------------------------------------------------------------------------

/**
 * Cave exit.
 */
function CaveExit() {
	this.targetEntrance = null;
	this.arrowParam = 0;
	this.arrowTintParam = 0;
	this.arrowImg = null;
}

CaveExit.prototype = new GameObject();
CaveExit.prototype.constructor = CaveExit;

CaveExit.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);
	this.targetEntrance = res.target;
};

CaveExit.prototype.init = function(reinit) {
	GameObject.prototype.init.call(this, reinit);
	this.setInteractive(new Rectf(-20, -20, 20, 20));
	this.arrowImg = ResourceDepot.getInstance().getImage("objective_arrows", "arrow", true);
};

CaveExit.prototype.draw = function(render, x, y) {
	if (app.game.currentStage.name == "Stage_0_H1") {
		var fireplaces = app.game.currentStage.gameObjects.getObjectsByType(Fireplace);
		if (fireplaces.length != 0 && fireplaces[0].lit) {
			var tint = new Pixel32(230, 230, 115, Math.floor((Math.sin(this.arrowTintParam) + 1) * 64));
			render.drawImage(this.arrowImg, this.getPos().x + 50 + x + Math.sin(this.arrowParam) * 5, this.getPos().y + y, 0, true, 1, tint);
		}
	}
};

CaveExit.prototype.setPos = function(pos, dropToGround) {
	dropToGround = dropToGround === undefined ? true : dropToGround;
};

CaveExit.prototype.update = function(dt) {
	this.arrowParam += dt * Math.PI * 2;
	this.arrowTintParam += dt * Math.PI * 3;
};

CaveExit.prototype.onInteract = function(obj, param) {
	app.game.exitCave(this.targetEntrance);
	return false;
};

CaveExit.prototype.getTargetEntrance = function() {
	return this.targetEntrance;
};

// ----------------------------------------------------------------------------

function HouseEntrance() {
	this.targetEntrance = null;
	this.targetExit = null;
	this.targetStage = null;
	this.houseId = 0;

	this.arrowTintParam  = 0;
	this.arrowParam = 0;
	this.isLeftEntrance = false;
	this.arrow = null;
	this.house = null;
}

HouseEntrance.prototype = new GameObject();
HouseEntrance.prototype.constructor = HouseEntrance;

HouseEntrance.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);
	this.targetEntrance = res.target;
	this.targetStage = res.target;
	var p = this.targetStage.indexOf(' ');
	if (p !== -1) {
		this.targetExit = this.targetStage.substr(p + 1);
		this.targetStage = this.targetStage.substr(0, p);
	} else
		this.targetExit = null;

	this.isLeftEntrance = this.targetExit == "left";

	var dep = ResourceDepot.getInstance();
	this.arrow = this.isLeftEntrance ? dep.getImage("objective_arrows", "arrow_mirrored", true) :
			dep.getImage("objective_arrows", "arrow", true);
};

HouseEntrance.prototype.init = function(reinit) {
	GameObject.prototype.init.call(this, reinit);
	this.setInteractive(new Rectf(-20, -20, 20, 20));
	var houses = app.game.currentStage.gameObjects.getObjectsByType(House);
	for (var i = 0; i < houses.length; i++) {
		var h = houses[i];
		if (h.targetStage == this.targetStage) {
			this.houseId = h.getId();
			this.house = h;
			break;
		}
	}
};

HouseEntrance.prototype.update = function(dt) {
	this.arrowParam += dt * Math.PI * 2;
	this.arrowTintParam += dt * Math.PI * 3;
};

HouseEntrance.prototype.draw = function(render, x, y) {
	if (!this.house.lit && app.game.currentStage.name != "stage0") {
		var tint = ((Math.sin(this.arrowTintParam) + 1) * 64);
		render.drawImage(this.arrow, this.getPos().x + x + Math.sin(this.arrowParam) * 5 + (this.isLeftEntrance ? -58 : 20), this.getPos().y + y - 15, 0, false, 1, new Pixel32(230, 230, 115, tint));
	}
};

HouseEntrance.prototype.setPos = function(pos, dropToGround) {
	dropToGround = dropToGround === undefined ? true : dropToGround;
};

HouseEntrance.prototype.onInteract = function(obj, param) {
	var status = false;
	var houses = app.game.currentStage.gameObjects.getObjectsByType(House);
	for (var i = 0; i < houses.length; i++) {
		var h = houses[i];
		if (h.getId() == this.houseId) {
			status = h.getStatus();
			if (h.lit) app.audio.playDelayedFX(ResourceDepot.getInstance().getSFX("fire_crackle"), 500, true);
			break;
		}
	}


	app.game.enterCave(this.targetStage, this.targetExit, this.houseId, status);
	return false;
};

HouseEntrance.prototype.getTargetEntrance = function() {
	return this.targetEntrance;
};

// ----------------------------------------------------------------------------

function ShrapnelExploder() {
	this.shrapnel = [];

	this.rattleIndex = 0;
	this.exploding = false;
	this.done = false;
	this.hitFromLeft = false;
	this.image = null;
	this.offset = new Point2(0, 0);
	this.base = null;
	this.callback = null;
}

ShrapnelExploder.prototype = {};
ShrapnelExploder.prototype.constructor = ShrapnelExploder;

ShrapnelExploder.rattleOffsets = [
	new Vec2(3, -1),
	new Vec2(3, -2),
	new Vec2(2, -3),
	new Vec2(1, -2),
	new Vec2(-1, -1),
	new Vec2(-2, -1),
	new Vec2(-1, -2),
	new Vec2(1, -1),
	new Vec2(2, -1),
	new Vec2(1, 0),
	new Vec2(0, 0) ];

ShrapnelExploder.prototype.reset = function() {
	this.shrapnel = [];
	this.rattleIndex = ShrapnelExploder.rattleOffsets.length - 1;
	this.base = null;
	this.offset = new Point2(0, 0);
	this.exploding = false;
	this.done = false;
	this.hitFromLeft = false;
};

ShrapnelExploder.prototype.update = function(dt) {
	if (this.rattleIndex < ShrapnelExploder.rattleOffsets.length - 1)
		this.rattleIndex = Math.min(ShrapnelExploder.rattleOffsets.length - 1, this.rattleIndex + 60 * dt);

	if (this.exploding) {
		var rect = app.game.getScreenRect().copy();
		rect.expand(100, 100);

		var vis = false;
		for (var i = 0; i < this.shrapnel.length; i++) {
			var r = this.shrapnel[i];
			r.velocity.y += dt * 9.82 * 50.0;
			r.offset.add(r.velocity.mulNew(dt));
			r.angle += r.angularVelocity * dt;
			r.update(dt);

			if (rect.contains((this.base ? this.base.getPos() : new Vec2(0, 0)).addNew(r.offset)))
				vis = true;
		}
		if (!vis) {
			this.exploding = false;
			this.done = true;
		}
	}
};

ShrapnelExploder.prototype.draw = function(render, x, y) {
	if (!this.done) {
		var ri = Math.floor(this.rattleIndex);
		var xPos = (this.hitFromLeft ? ShrapnelExploder.rattleOffsets[ri].x : -ShrapnelExploder.rattleOffsets[ri].x)
				+ x + (this.base ? this.base.getPos().x : 0);
		var yPos = ShrapnelExploder.rattleOffsets[ri].y + y + (this.base ? this.base.getPos().y : 0);

		if (!this.exploding && this.callback != null) {
			this.callback.draw(render, x + (this.base ? this.base.getPos().x : 0),
					y + (this.base ? this.base.getPos().y : 0),
					this.hitFromLeft ? ShrapnelExploder.rattleOffsets[ri].x : -ShrapnelExploder.rattleOffsets[ri].x,
					ShrapnelExploder.rattleOffsets[ri].y);
		} else if (!this.exploding && this.image != null) {
			render.drawImage(this.image, xPos + this.offset.x, yPos + this.offset.y, 0, true);
		} else {
			for (var i = 0; i < this.shrapnel.length; i++) {
				var r = this.shrapnel[i];
				render.drawImage(r.image, xPos + r.offset.x, yPos + r.offset.y, r.angle, true);
			}
		}
	}
};

ShrapnelExploder.prototype.getRattleOffset = function() {
	var ri = Math.floor(this.rattleIndex);
	return new Vec2(this.hitFromLeft ? ShrapnelExploder.rattleOffsets[ri].x : -ShrapnelExploder.rattleOffsets[ri].x,
			ShrapnelExploder.rattleOffsets[ri].y);
};

ShrapnelExploder.prototype.setImage = function(img, pos) {
	pos = pos || new Point2(0, 0);
	this.image = img;
	this.offset = pos;
};

ShrapnelExploder.prototype.addShrapnelPiece = function(img, pos) {
	pos = pos || new Vec2(pos.x, pos.y);
	this.shrapnel.push(new Shrapnel(this.base, img, pos));
};

ShrapnelExploder.prototype.setBase = function(obj) {
	this.base = obj;
};

ShrapnelExploder.prototype.hit = function(fromLeft) {
	this.hitFromLeft = fromLeft;
	this.rattleIndex = 0;
};

ShrapnelExploder.prototype.explode = function(fromLeft) {
	for (var i = 0; i < this.shrapnel.length; i++) {
		this.shrapnel[i].updateInWaterFlag();
	}

	this.hitFromLeft = fromLeft;
	this.exploding = true;
};

ShrapnelExploder.prototype.setWaterLevel = function(f) {
	for (var i = 0; i < this.shrapnel.length; i++) {
		this.shrapnel[i].setWaterLevel(f);
	}
};

ShrapnelExploder.prototype.setCleared = function() {
	this.done = true;
};

ShrapnelExploder.prototype.isExploding = function() {
	return this.exploding;
};

ShrapnelExploder.prototype.isDone = function() {
	return this.done;
};

ShrapnelExploder.prototype.isHit = function() {
	return this.rattleIndex != ShrapnelExploder.rattleOffsets.length - 1;
};

// ----------------------------------------------------------------------------

/**
 * A shrapnel from an explosion.
 *
 * @param {GameParticle} b
 * @param {ImageHandle} img
 * @param {Vec2} off
 */
function Shrapnel(b, img, off) {
	img = img || null;
	off = off || new Vec2(0, 0);

	GameParticle.call(this);

	this.offset = off;
	this.angle = 0;
	this.image = img;
	this.velocity = new Vec2(randomRange(-100, 100), randomRange(-200, -150));
	this.angularVelocity = randomRange(-3 * Math.PI, 3 * Math.PI);
	this.base = b;

	this.splashInSound = null;
	this.splashOutSound = null;

	this.splashAnim = null;
	this.splashOutAnim = null;
}

Shrapnel.prototype = new GameParticle();
Shrapnel.prototype.constructor = Shrapnel;

Shrapnel.prototype.getPos = function() {
	return this.base.getPos().addNew(this.offset);
};

Shrapnel.prototype.setWaterLevel = function(f) {
	GameParticle.prototype.setWaterLevel.call(this, f);

	this.splashInSound = ResourceDepot.getInstance().getSFX("splash_in");
	this.splashOutSound = ResourceDepot.getInstance().getSFX("splash_out");

	this.splashAnim = ResourceDepot.getInstance().getAnimation("water_splash");
	this.splashOutAnim = new AnimationHandle(this.splashAnim);
	this.splashOutAnim.setRange(11 / 15, 1);
};

Shrapnel.prototype.onEnterWater = function() {
	app.audio.playFX(this.splashInSound);
	app.game.currentStage.particleSystem.spawnAnimatedParticle(this.splashAnim, new Vec2(this.getPos().x, this.waterLevel), new Vec2(0, 0), true);
};

Shrapnel.prototype.onExitWater = function() {
	app.audio.playFX(this.splashOutSound);
	app.game.currentStage.particleSystem.spawnAnimatedParticle(this.splashOutAnim, new Vec2(this.getPos().x, this.waterLevel), new Vec2(0, 0), true);
};