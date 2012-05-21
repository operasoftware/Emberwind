function GremlinBasket () {
	HittableGameObject.call(this, true);
	this.spawnsPerSecond = 0.5; // From GameParameters.cpp
	this.maxSpawned = 2;
	this.numSpawned = 0;
	this.timer = 0;
	this.type = Gremlin.types.kGremStandard;

	this.setMaxHitPoints(10);
	this.setHitPoints(10);

	this.exploder = new ShrapnelExploder();
	this.breakEffectSound = null;
}

GremlinBasket.prototype = new HittableGameObject();
GremlinBasket.prototype.constructor = GremlinBasket;

GremlinBasket.prototype.onCreate = function (res) {
	HittableGameObject.prototype.onCreate.call(this, res);

	this.type = res.subtype;
	this.type = this.type === Gremlin.types.kGremWarrior ? Gremlin.types.kGremStandard : this.type;
	this.maxSpawned = res.count;
};

GremlinBasket.prototype.init = function (reinit) {
	HittableGameObject.prototype.init.call(this, reinit);

		
	if (this.enabled) {
		var triggerObj = new TriggerObject(this,
		                                   createCallback(this.onTrigger, this),
										   this.getHittableRect());
		app.game.currentStage.triggerSystem.addObject(triggerObj);
	}

	var depot = ResourceDepot.getInstance();

	this.numSpawned = 0;
	this.exploder.reset()
	this.exploder.setBase(this);
	this.exploder.setImage(depot.getImage("gremlinbasket", "basket_back"));

	this.exploder.addShrapnelPiece(depot.getImage("gremlin_basket_pieces", "piece3"), new Point2(-13, 1));
	this.exploder.addShrapnelPiece(depot.getImage("gremlin_basket_pieces", "piece2"), new Point2(-3, 10));
	this.exploder.addShrapnelPiece(depot.getImage("gremlin_basket_pieces", "piece0"), new Point2(-2, -10));
	this.exploder.addShrapnelPiece(depot.getImage("gremlin_basket_pieces", "piece4"), new Point2(11, 3));
	this.exploder.addShrapnelPiece(depot.getImage("gremlin_basket_pieces", "piece1"), new Point2(-1, -25));
	this.exploder.addShrapnelPiece(depot.getImage("gremlin_basket_pieces", "piece5"), new Point2(-13, 2));

	this.breakEffectSound = depot.getSFX("exploding_wood");
};

GremlinBasket.prototype.deinit = function () {
	HittableGameObject.prototype.deinit.call(this);
	app.game.currentStage.triggerSystem.removeObject(this);

};

GremlinBasket.prototype.update = function (dt) {
	HittableGameObject.prototype.update.call(this, dt);
	this.exploder.update(dt);

	if (this.numSpawned < this.maxSpawned && !this.exploder.isExploding() && !this.exploder.isDone()) {
		this.timer += dt * this.spawnsPerSecond;
		while (this.timer >= 1) {
			this.timer -= 1;
			this.spawn();
		}
	}

	if (this.exploder.isDone()) {
		this.enable(false);
	}
};

GremlinBasket.prototype.draw = function (render, x, y) {
	this.exploder.draw(render, x, y);
	HittableGameObject.prototype.draw.call(this, render, 
	                                       Math.floor(this.getPos().x) + x,
										   Math.floor(this.getPos().y) + y);
};

GremlinBasket.prototype.getCollision = function () {
	return [ new Circle(new Vec2(0, 0), 40) ];
};

GremlinBasket.prototype.getObjectExtent = function () {
	return new Rectf(-40, -40, 40, 40);
};

GremlinBasket.prototype.getHittableRect = function () {
	return new Rectf(-40, -40, 40, 40);
};

GremlinBasket.prototype.getIdolInfo = function () {
	return new IdolInfo(IdolType.kIdolBasket, GemType.kGemPurple, GemType.kGemPurple, MetalType.kMetalSilver);
};

GremlinBasket.prototype.getSoundType = BreakableContainer.prototype.getSoundType;
GremlinBasket.prototype.onTrigger = BreakableContainer.prototype.onTrigger;
GremlinBasket.prototype.onDisable = BreakableContainer.prototype.onDisable;
GremlinBasket.prototype.onEnable = BreakableContainer.prototype.onEnable;
GremlinBasket.prototype.setDamagedState = BreakableContainer.prototype.setDamagedState;
GremlinBasket.prototype.setTossedState  = BreakableContainer.prototype.setTossedState;

GremlinBasket.prototype.setKnockedOutState = function (fromLeft, hitsTaken, tossed) {
	this.tossDeadGrems(1);
	// TODO
	// Brownie stuff
	// ShatterDust
	this.exploder.explode(fromLeft);
	app.audio.playFX(this.breakEffectSound);
	app.game.currentStage.triggerSystem.removeObject(this);
	this.setDisableWhenOffScreen(true);
};

GremlinBasket.prototype.tossDeadGrems = function (num) {
	for (var i = 0; i < num; i++) {
		var gremlin = new Gremlin();
		gremlin.type = this.type;
		gremlin.grade = this.getGrade();
		gremlin.init(false);
		gremlin.setPos(this.getPos());
		app.game.addGameObject(gremlin);
		gremlin.kill();
	}
};

GremlinBasket.prototype.spawn = function () {
	this.numSpawned++;

	var gremlin = new Gremlin();

	gremlin.type = this.type;
	gremlin.grade = this.getGrade();
	gremlin.init(false);
	gremlin.setPos(this.getPos());
	gremlin.addObserver(this);

	gremlin.leftWaypoint = this.getPos().x - 300;
	gremlin.rightWaypoint = this.getPos().x + 300;
	gremlin.bounce();
	app.game.addGameObject(gremlin);

	app.game.startSpawnSmoke(this.getPos().subNew(new Vec2(0, 30)));
};

GremlinBasket.prototype.onHit = function (h) {
	if (h === 0) {
		this.numSpawned--;
	}
};

GremlinBasket.prototype.onInit = function () { };
GremlinBasket.prototype.onMaxHitpointsSet = function () { };
GremlinBasket.prototype.onHitpointsSet = function ()    { };

