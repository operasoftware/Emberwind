function BreakableContainer() {
	HittableGameObject.call(this, true);

	this.setMaxHitPoints(3);
	this.setHitPoints(3);

	this.breakEffectSound = null;
	this.kindleWowSound = null;

	this.exploder = new ShrapnelExploder();
}

BreakableContainer.prototype = new HittableGameObject();
BreakableContainer.prototype.constructor = BreakableContainer;

BreakableContainer.prototype.reset = function () {
	HittableGameObject.prototype.reset.call(this);
};

BreakableContainer.prototype.init = function (reinit) {
	HittableGameObject.prototype.init.call(this, reinit);

	if (this.enabled) {
		var triggerObj = new TriggerObject(this,
		                                   createCallback(this.onTrigger, this),
										   this.getHittableRect());
		app.game.currentStage.triggerSystem.addObject(triggerObj);
	}

	this.exploder.reset();
	this.exploder.setBase(this);

	this.breakEffectSound = ResourceDepot.getInstance().getSFX("exploding_wood");
	this.kindleWowSound = ResourceDepot.getInstance().getSFX("kindle_win");
};

BreakableContainer.prototype.deinit = function () {
	HittableGameObject.prototype.deinit.call(this);
	app.game.currentStage.triggerSystem.removeObject(this);
};

BreakableContainer.prototype.update = function (dt) {
	HittableGameObject.prototype.update.call(this, dt);
	this.exploder.update(dt);

	if (this.exploder.isDone()) {
		this.enable(false);
	}
};

BreakableContainer.prototype.draw = function (render, x, y) {
	this.exploder.draw(render, x, y);
	HittableGameObject.prototype.draw.call(this, render, 
	                                       Math.floor(this.getPos().x + x),
										   Math.floor(this.getPos().y + y));
};

BreakableContainer.prototype.getCollision = function () {
	return [ new Circle(new Vec2(0, 7), 30) ];
};

BreakableContainer.prototype.getObjectExtent = function () {
	return new Rectf(-40, -40, 40, 40);
};

BreakableContainer.prototype.getHittableRect = function () {
	return new Rectf(-30, -23, 30, 37);
};

BreakableContainer.prototype.getSoundType = function () {
	return HitSoundType.kWood;
};

BreakableContainer.prototype.onTrigger = function (param, volume, object) {
	if (param === "damage" || param === "stun" || param === "damage_pwr" || param === "stun_pwr") {
		if (volume.getParent() instanceof PlayerCharacter) {
			app.game.addChainHit();
		}

		app.game.setCurrentFoe(this);
		this.hit(1, volume.getCenter().x < this.getPos().x, false, true);
	}
};

BreakableContainer.prototype.onDisable = function () {
	app.game.currentStage.triggerSystem.removeObject(this);
};

BreakableContainer.prototype.onEnable = function () {
	var triggerObj = new TriggerObject(this, 
	                                   createCallback(this.onTrigger, this),
	                                   this.getHittableRect());
	app.game.currentSta.triggerSystem.addObject(triggerObj);
};

BreakableContainer.prototype.setDamagedState = function (fromLeft, hitsTaken) {
	this.exploder.hit(fromLeft);
};

BreakableContainer.prototype.setTossedState = function (fromLeft, low) {
	this.setDamagedState(fromLeft, 1);
};

BreakableContainer.prototype.setKnockedOutState = function (fromLeft, hitsTaken, tossed) {
	this.exploder.explode(fromLeft);
	app.game.currentStage.triggerSystem.removeObject(this);
	this.setDisableWhenOffScreen(true);
};

BreakableContainer.prototype.setImage = function (i, off) {
	this.exploder.setImage(i, off);
};

BreakableContainer.prototype.addShrapnel = function (i, off) {
	this.exploder.addShrapnelPiece(i, off);
};

BreakableContainer.prototype.setWaterLevel = function (f) {
	HittableGameObject.prototype.setWaterLevel.call(this, f);
	this.exploder.setWaterLevel(f);
};

// ----------------------------------------------------------------------------

function AppleBasket() {
	BreakableContainer.call(this);
}

AppleBasket.prototype = new BreakableContainer();
AppleBasket.prototype.constructor = AppleBasket;

AppleBasket.prototype.init = function (reinit) {
	BreakableContainer.prototype.init.call(this, reinit);
	this.setMaxHitPoints(1);
	this.setHitPoints(1);

	var depot = ResourceDepot.getInstance();
	this.setImage(depot.getImage("pickups", "AppleBasket"));
	this.addShrapnel(depot.getImage("apple_basket_pieces", "piece1"), new Point2(15, 3));
	this.addShrapnel(depot.getImage("apple_basket_pieces", "piece0"), new Point2(-7, 3));
	this.addShrapnel(depot.getImage("apple_basket_pieces", "piece2"), new Point2(8, -1));
};

AppleBasket.prototype.getIdolInfo = function () {
	return new IdolInfo(IdolType.kIdolAppleBasket, GemType.kGemPurple, GemType.kGemPurple, MetalType.kMetalSilver);
};

AppleBasket.prototype.setKnockedOutState = function (fromLeft, hitsTaken, tossed) {
	BreakableContainer.prototype.setKnockedOutState.call(this, fromLeft, hitsTaken, tossed);

	app.game.getTallyInfo().chests++;
	var pType = Pickup.Type.kPickupApple;

	var count = Math.floor(randomRange(3, 7));
	app.game.spawnPickup(pType, this.getPos().addNew(new Vec2(0, -20)), -75, 75, -200, -350, count);
	app.audio.playFX(this.breakEffectSound);
};

// ----------------------------------------------------------------------------

function Chest() {
	BreakableContainer.call(this);
	this.setMaxHitPoints(3);
	this.setHitPoints(3);
}

Chest.prototype = new BreakableContainer();
Chest.prototype.constructor = Chest;

Chest.prototype.init = function (reinit) {
	BreakableContainer.prototype.init.call(this, reinit);

	var depot = ResourceDepot.getInstance();
	this.setImage(depot.getImage("pickups", "Chest"));
	this.addShrapnel(depot.getImage("chest_pieces", "piece1"), new Point2(  2, -5));
	this.addShrapnel(depot.getImage("chest_pieces", "piece2"), new Point2(-18,  10));
	this.addShrapnel(depot.getImage("chest_pieces", "piece3"), new Point2(  5,  7));
	this.addShrapnel(depot.getImage("chest_pieces", "piece0"), new Point2(-17, -5));
	this.addShrapnel(depot.getImage("chest_pieces", "piece0"), new Point2( 17, -13));

	switch (this.getGrade()) {
		case 0:
			this.setMaxHitPoints(3);
			this.setHitPoints(3);
			break;
		case 1:
			this.setMaxHitPoints(6);
			this.setHitPoints(6);
			break;
		default:
			this.setMaxHitPoints(10);
			this.setHitPoints(10);
			break;
	}
};

Chest.prototype.getIdolInfo = function () {
	return new IdolInfo(IdolType.kIdolChest, GemType.kGemPurple, GemType.kGemPurple, MetalType.kMetalSilver);
};

Chest.prototype.setKnockedOutState = function (fromLeft, hitsTaken, tossed) {
	BreakableContainer.prototype.setKnockedOutState.call(this, fromLeft, hitsTaken, tossed);
	if (this.isInWater()) {
		// TODO
		// app.game.startShatterDust(this.getPos(), new Pixel32(204, 130, 46), 0.35);
	}

	app.game.getTallyInfo().chests++;

	var count = 0;
	var dropType = DropTableType.kDTChestGradeA;

	switch (this.getGrade()) {
		case 0:
			dropType = DropTableType.kDTChestGradeA;
			count = ResourceDepot.getInstance().getDropCount(dropType);
			if (count == 10) {
				app.audio.playDelayedFX(this.kindleWowSound, 0.5);
			}
			break;
		case 1:
			dropType = DropTableType.kDTChestGradeB;
			count = ResourceDepot.getInstance().getDropCount(dropType);
			if (count == 14) {
				app.audio.playDelayedFX(this.kindleWowSound, 0.5);
			}
			break;
		default:
			dropType = DropTableType.kDTChestGradeC;
			count = ResourceDepot.getInstance().getDropCount(dropType);
			if (count == 20) {
				app.audio.playDelayedFX(this.kindleWowSound, 0.5);
			}
			break;
	}

	var pType = ResourceDepot.getInstance().getDropType(dropType);
	app.game.spawnPickup(pType, this.getPos().add(new Vec2(0, -20)), -75, 75, -200, -350, count);
	app.audio.playFX(this.breakEffectSound);
};

