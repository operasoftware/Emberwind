function House() {
	this.lit = false;
	this.objectiveObservers = [];
	this.windows = [];
	this.chimneys = [];
	this.doors = [];
	this.localHouseRect = null;
	this.houseRect = null;
	this.targetStage = null;
	this.chimneySmoke = null;
	this.arrowParam = 0;
	this.arrowTintParam = 0;
}

House.prototype = new GameObject();
House.prototype.constructor = House;

House.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);
	this.targetStage = res.target;

	var localHouseRect = new Rectf(0, 0, 0, 0);
	for (var s = 0; s < res.subhandles.length; s += 2)
		localHouseRect.include(res.subhandles[s], res.subhandles[s + 1]);

	this.houseRect = localHouseRect;
	this.houseRect.offset(new Vec2(res.x, res.y));
};

House.prototype.init = function(reinit) {
	GameObject.prototype.init.call(this);

	this.chimneys = [];

	// todo: chimney stuff

	for (var i = 0; i < this.objectiveObservers.length; i++) {
		this.objectiveObservers[i].onObjectiveAdded(this);
	}
	if (!reinit)
		this.addObserver(app.game.hud.objectiveDisp);
};

House.prototype.deinit = function(reinit) {

};

House.prototype.update = function(dt) {
	if (this.lit) {
		for (var i = 0; i < this.chimneys.length; i++) {
			this.chimneys[i].update(dt);
		}
	} else {
		this.arrowParam += dt * Math.PI * 2;
		this.arrowTintParam += dt * Math.PI * 3;
	}
};

House.prototype.draw = function(render, x, y) {
	if (!this.lit && app.game.currentStage.name == "stage0") {
		var tint = new Pixel32(230, 230, 115, Math.floor(Math.sin(this.arrowTintParam) + 1) * 64);
		for (var i = 0; i < this.doors.length; i++) {
			var d = this.doors[i];
			render.drawImage(d.image, d.pos.x + x + Math.sin(this.arrowParam) * 5, d.pos.y + y, 0, true, 1, this.tint);
		}
	}
};

// todo: late draw?

House.prototype.setPos = function(pos, dropToGround) {
};

House.prototype.addObserver = function(o) {
	this.objectiveObservers.push(o);
	o.onObjectiveAdded(this);
};

House.prototype.removeObserver = function(o) {
	for (var i = 0; i < this.objectiveObservers.length; i++) {
		if (this.objectiveObservers[i] == o) {
			this.objectiveObservers.splice(i, 1);
			return;
		}
	}
};

House.prototype.setStatus = function(l) {
	if (l && !this.lit)
		app.game.getTallyInfo().houses++;
	this.lit = l;
	if (this.lit) {
		for (var i = 0; i < this.objectiveObservers.length; i++) {
			this.objectiveObservers[i].onObjectiveCompleted(this);
		}
		// todo: change windows
	}
};

House.prototype.getStatus = function() {
	return this.lit;
};

House.prototype.onMessage = function(msg) {
	if (msg.hasOwnProperty("houseStatus")) {
		this.setStatus(msg["houseStatus"]);
	}
};

House.prototype.getObjectExtent = function() {
	var ext = this.houseRect.copy();
	var i;
	for (i = 0; i < this.chimneys.length; i++) {
		ext.include(this.chimneys[i].offset(-this.getPos()));
	}
	for (i = 0; i < this.doors.length; i++) {
		var d = this.doors[i];
		var centre = d.getPos().subNew(this.getPos()).add(new Vec2(Math.sin(this.arrowParam) * 5, 0));
		var h = d.img.textureHeight / 2;
		var w = d.img.textureWidth / 2;
		ext.include(new Rectf(centre.x - w, centre.y - h, centre.x + w, centre.y + h));
	}
	return ext;
};

House.prototype.abc = function() {
};

function Door(pos, image) {
	this.pos = pos;
	this.image = image;
}

// ----------------------------------------------------------------------------

function Fireplace() {
	this.interactVolume = null;
	this.houseId = 0;
	this.flameAnim = null;
	this.lit = false;
	this.litSound = null;
	this.burningSound = null;

	this.spawnCount = 3;
	this.numSpawned = 0;
	this.numBlasts = 0;
	this.timeToSpawn = 0.5;
	this.leftWaypoint = 0;
	this.rightWaypoint = 0;
}

Fireplace.prototype = new GameObject();
Fireplace.prototype.constructor = Fireplace;

Fireplace.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(res);
};

Fireplace.prototype.init = function(reinit) {
	GameObject.prototype.init.call(this);

	this.numSpawned = 0;
	this.numBlasts = 0;

	var game = app.game;

	var dep = ResourceDepot.getInstance();

	this.addTriggers();
	this.flameAnim = dep.getAnimation("flame");
	this.flameAnim.play();

	this.litSound = dep.getSFX("flamesprite_spawn");
	this.burningSound = dep.getSFX("fire_crackle");

	var fireplaces = game.getTileReferences("fireplace", game.currentStage.gamePlayLayerExtent);
	if (fireplaces.length != 0) {
		var p = new Vec2(-36, -45).add(fireplaces[0].rect.center());
		this.setStartPos(Math.floor(p.x), Math.floor(p.y));
	}

	var villagers = game.currentStage.gameObjects.getObjectsByType(Villager);
	if (villagers.length != 0)
		this.spawnCount = villagers.length * 3;

	timeToSpawn = 0.0001;
};

Fireplace.prototype.deinit = function(reinit) {
	GameObject.prototype.deinit.call(this);
	this.removeTriggers();
};

Fireplace.prototype.update = function(dt) {
	if (this.lit)
		this.flameAnim.update(dt);
	else {
		if (this.timeToSpawn > 0) {
			this.timeToSpawn -= dt;
			if (this.timeToSpawn <= 0)
				this.spawn();
		}
	}

	if (this.numBlasts > 0) {
		var game = app.game;
		game.blastRect(game.currentStage.gamePlayLayerExtent, -1, false, true);
		--this.numBlasts;
	}
};

Fireplace.prototype.draw = function(render, x, y) {
	if (this.lit)
		this.flameAnim.draw(render, this.getPos().x + x, this.getPos().y + y);
};

Fireplace.prototype.light = function() {
	if (this.interactVolume !== null) {
		var game = app.game;

		this.removeTriggers();
		game.sendMessageToId(this.houseId, {"houseStatus" : true});

		//todo: game.sendMessageToType(Villager, {"houseStatusNOW" : true});

		this.numBlasts = 2;
		app.audio.playFX(this.litSound);
		// todo: app.audio.playDelayedSoundFX(this.burningSound, 0.5, true);

		//todo: game.startChainBlast(this.getPos(), true);

		//todo: game.hud.objectiveArrow.hideTargetArrow();

		this.lit = true;
	}
};

Fireplace.prototype.onTrigger = function(param, volume, object) {
	if (param == "fireplace") {
		if (object.particle && object.particle instanceof PlayerCharacter) {
			this.light();
		}
	}
};

Fireplace.prototype.onMessage = function(msg) {
	if (!msg instanceof Object) return;
	if (msg["houseId"] !== undefined) {
		this.houseId = msg["houseId"];
		delete msg["houseId"];
	}
	if (msg["houseStatus"] !== undefined) {
		this.lit = msg["houseStatus"];
		if (this.lit) {
			this.removeTriggers();
			app.audio.playFX(this.burningSound, true);
		}
	}
};

Fireplace.prototype.spawn = function(bounce) {
	bounce = bounce === undefined ? true : bounce;
	if (!this.lit && this.numSpawned < this.spawnCount) {
		++this.numSpawned;
		this.timeToSpawn = randomRange(0.5, 1);

		var gremlin = new Gremlin();
		gremlin.type = Gremlin.types.kGremStandard;
		gremlin.grade = this.getGrade();

		gremlin.init(false);
		var p = this.getPos().copy();
		if (!bounce)
			p.x = randomRange(this.leftWaypoint, this.rightWaypoint);
		gremlin.setPos(p);
		gremlin.addObserver(this);

		gremlin.leftWaypoint = this.leftWaypoint;
		gremlin.rightWaypoint = this.rightWaypoint;
		app.game.addGameObject(gremlin);

		if (bounce)
			gremlin.bounce();
	}
};

Fireplace.prototype.onInit = function(max, h) {
};
Fireplace.prototype.onMaxHitpointsSet = function(h) {
};
Fireplace.prototype.onHitpointsSet = function(h) {
};

Fireplace.prototype.onHit = function(h) {
	if (h == 0) {
		--this.numSpawned;
		if (this.numSpawned < this.spawnCount)
			this.timeToSpawn = randomRange(0.5, 1);
	}
};

Fireplace.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);

	if (res.subhandles !== undefined && res.subhandles.length != 0) {
		this.leftWaypoint = Math.floor(this.getStartPos().x + res.subhandles[0]);
		this.rightWaypoint = Math.floor(this.getStartPos().x + res.subhandles[0]);
	} else {
		this.leftWaypoint = Math.floor(this.getStartPos().x);
		this.rightWaypoint = Math.floor(this.getStartPos().x);
	}

	for (var i = 0; i < res.subhandles.length; i++) {
		var s = res.subhandles[i];
		this.leftWaypoint = Math.floor(Math.min(this.leftWaypoint, this.getStartPos().x + s));
		this.rightWaypoint = Math.floor(Math.max(this.rightWaypoint, this.getStartPos().x + s));
	}
};

Fireplace.prototype.addTriggers = function() {
	if (this.interactVolume === null) {
		this.interactVolume = new TriggerVolume("fireplace", new Rectf(-20, -40, 20, 0), this, createCallback(this.onTrigger, this), "fireplace");
		app.game.currentStage.triggerSystem.addVolume(this.interactVolume);
	}
};

Fireplace.prototype.removeTriggers = function() {
	if (this.interactVolume !== null) {
		app.game.currentStage.triggerSystem.removeVolume(this.interactVolume, true);
		this.interactVolume = null;
	}
};

Fireplace.prototype.reset = function() {
	GameObject.prototype.reset.call(this);
	this.addTriggers();
};


Fireplace.prototype.setPos = function(pos, dropToGround) {
};