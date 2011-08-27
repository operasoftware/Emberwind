function Villager() {
	HittableGameObject.call(this, true);

	var states = [
		Villager.states.kStateHappy, new SimpleState(Villager.states.kStateHappy, createCallback(this.happyEnter, this), createCallback(this.happyLeave, this), createCallback(this.happyUpdate, this)),
		Villager.states.kStatePanic, new SimpleState(Villager.states.kStatePanic, createCallback(this.panicEnter, this), null, createCallback(this.panicUpdate, this)),
		Villager.states.kStateScared, new SimpleState(Villager.states.kStateScared, createCallback(this.scaredEnter, this), null, null)
	];

	this.fsm = new FSM(this, states);

	this.movement = new MovementComponent();
	this.facingRight = false;

	this.timeToScared = 0;
	this.animVariation = 0;


	this.currentAnim = null;
	this.happyAnim = [];
	this.panicLeftAnim = [
		[],
		[]
	];
	this.panicRightAnim = [
		[],
		[]
	];
	this.scaredAnim = [];
	this.type = null;
	this.animCallback = null;
	this.villagerName = null;
	this.spawnGoodies = false;

	this.scaredSound = [];
	this.happySound = [2];
	this.timeToGreeting = 0;
	this.hasGreeted = false;
	this.timeToScream = 0;

	this.annoyedCues = [];
	this.annoyedEnemyCues = [];

	this.kMale = 0;
	this.kFemale = 1;

	this.setInvulnerable(true);
}

Villager.prototype = new HittableGameObject();

Villager.prototype.constructor = Villager;

Villager.states = {
	kStateHappy : 0,
	kStatePanic : 1,
	kStateScared : 2
};

Villager.prototype.onCreate = function(res) {
	HittableGameObject.prototype.onCreate.call(this, res);
	this.type = res.subtype;
	this.villagerName = res.name;
};

Villager.prototype.init = function(reinit) {
	this.hasGreeted = false;

	this.movement.Init(9.82 * 50, this, this.getCollision(), app.game.provider);

	HittableGameObject.prototype.init.call(this, reinit);

	if (this.enabled) {
		var triggerObj = new TriggerObject(this, createCallback(this.onTrigger, this), this.getHittableRect());
		app.game.currentStage.triggerSystem.addObject(triggerObj);
	}

	var dep = ResourceDepot.getInstance();
	this.happyAnim[this.kMale] = dep.getAnimation("VillagerHappyMale");
	this.happyAnim[this.kFemale] = dep.getAnimation("VillagerHappyFemale");

	this.panicLeftAnim[this.kMale][0] = dep.getAnimation("VillagerPanicLeftMale");
	this.panicLeftAnim[this.kFemale][0] = dep.getAnimation("VillagerPanicLeftFemale");

	this.panicLeftAnim[this.kMale][1] = dep.getAnimation("VillagerPanicLeft2Male");
	this.panicLeftAnim[this.kFemale][1] = dep.getAnimation("VillagerPanicLeft2Female");

	this.panicRightAnim[this.kMale][0] = new AnimationHandle(this.panicLeftAnim[this.kMale][0]);
	this.panicRightAnim[this.kMale][0].mirror();
	this.panicRightAnim[this.kFemale][0] = new AnimationHandle(this.panicLeftAnim[this.kFemale][0]);
	this.panicRightAnim[this.kFemale][0].mirror();

	this.panicRightAnim[this.kMale][1] = new AnimationHandle(this.panicLeftAnim[this.kMale][1]);
	this.panicRightAnim[this.kMale][1].mirror();
	this.panicRightAnim[this.kFemale][1] = new AnimationHandle(this.panicLeftAnim[this.kFemale][1]);
	this.panicRightAnim[this.kFemale][1].mirror();

	this.scaredAnim[this.kMale] = dep.getAnimation("VillagerScaredMale");
	this.scaredAnim[this.kFemale] = dep.getAnimation("VillagerScaredFemale");

	this.animCallback = createCallback(this.onAnimationEvent, this);

	this.scaredSound[this.kMale] = dep.getSFX("villager_male_scared");
	this.scaredSound[this.kFemale] = dep.getSFX("villager_female_scared");
	this.happySound[this.kMale] = dep.getSFX("villager_male_cheer");
	this.happySound[this.kFemale] = dep.getSFX("villager_female_cheer");

	var graham = this.villagerName == "man3";
	var villagerStr = graham ? dep.getString("STR_GRAHAM") : dep.getString("STR_VILLAGER");
	this.annoyedCues.push(graham ? dep.getString("STR_GRAHAM_ANNOYED1") : dep.getString("STR_VILLAGER_ANNOYED1"));
	this.annoyedCues.push(villagerStr);
	this.annoyedCues.push(graham ? dep.getString("STR_GRAHAM_ANNOYED2") : dep.getString("STR_VILLAGER_ANNOYED2"));
	this.annoyedCues.push(villagerStr);
	this.annoyedCues.push(graham ? dep.getString("STR_GRAHAM_ANNOYED3") : dep.getString("STR_VILLAGER_ANNOYED3"));
	this.annoyedCues.push(villagerStr);
	this.annoyedCues.push(graham ? dep.getString("STR_GRAHAM_ANNOYED4") : dep.getString("STR_VILLAGER_ANNOYED4"));
	this.annoyedCues.push(villagerStr);

	this.annoyedEnemyCues.push(graham ? dep.getString("STR_GRAHAM_ENEMY_ANNOYED1") : dep.getString("STR_VILLAGER_ENEMY_ANNOYED1"));
	this.annoyedEnemyCues.push(villagerStr);
	this.annoyedEnemyCues.push(graham ? dep.getString("STR_GRAHAM_ENEMY_ANNOYED2") : dep.getString("STR_VILLAGER_ENEMY_ANNOYED2"));
	this.annoyedEnemyCues.push(villagerStr);
	this.annoyedEnemyCues.push(graham ? dep.getString("STR_GRAHAM_ENEMY_ANNOYED3") : dep.getString("STR_VILLAGER_ENEMY_ANNOYED3"));
	this.annoyedEnemyCues.push(villagerStr);

	this.fsm.setState(Villager.states.kStateScared);
};

Villager.prototype.deinit = function() {
	HittableGameObject.prototype.deinit.call(this);
	app.game.currentStage.triggerSystem.removeObject(this);
};

Villager.prototype.update = function(dt) {
	HittableGameObject.prototype.update.call(this, dt);
	this.fsm.update(dt);
	this.movement.Update(dt);
	this.currentAnim.update(dt);
};

Villager.prototype.draw = function(render, x, y) {
	var p = this.getPos().addNew(new Vec2(x, y));
	this.currentAnim.draw(render, p.x, p.y);
	HittableGameObject.prototype.draw.call(this, render, p.x, p.y);
};

Villager.prototype.getCollision = function() {
	var c = [];
	c.push(new Circle(new Vec2(0, -50), 50));
	return c;
};

Villager.prototype.onAnimationEvent = function(param, anim) {
	if (param == "stopped" && this.fsm.currentState == Villager.states.kStateScared)
		this.fsm.setState(Villager.states.kStatePanic);
};

Villager.prototype.getPos = function() {
	return this.movement.position;
};

Villager.prototype.setPos = function(pos, dropToGround) {
	dropToGround = dropToGround === undefined ? true : dropToGround;
	this.movement.SetPosition(pos);
	if (dropToGround)
		this.movement.DropToGround();
	this.updateInWaterFlag();
};

Villager.prototype.turn = function() {
	this.facingRight = !this.facingRight;
};

Villager.prototype.onMessage = function(msg) {
	if (msg.hasOwnProperty("houseStatus") && msg["houseStatus"])
		this.fsm.setState(Villager.states.kStateHappy);
	else if (msg.hasOwnProperty("houseStatusNOW") && msg["houseStatusNOW"]) {
		this.spawnGoodies = true;
		this.fsm.setState(Villager.states.kStateHappy);
	} else if (msg.hasOwnProperty("greeted")) {
		this.timeToGreeting = randomRange(0.5, 2);
	}
};

Villager.prototype.onInteract = function(obj, param) {
	var dialogueSystem = app.game.dialogueSystem;
	 var stageName = app.game.currentStage.name;
	 dialogueSystem.trigger(stageName, this.villagerName, true);
	 this.checkInteractive();
	 return true;
};

Villager.prototype.happyEnter = function() {
	this.currentAnim = this.happyAnim[this.type];
	this.currentAnim.play();
	var game = app.game;

	if (!game.dialogueTrigger("villager")) {
		var graham = this.villagerName == "man3";
		var dep = ResourceDepot.getInstance();
		game.hud.openRightBubble(this, 20, dep.getString("STR_VILLAGER_GREETING"), graham ? dep.getString("STR_GRAHAM") : dep.getString("STR_VILLAGER"), 3);
	}

	this.checkInteractive();
	this.timeToGreeting = randomRange(0.5, 2);
};

Villager.prototype.checkInteractive = function() {
	var dialogueSystem = app.game.dialogueSystem;
	var stageName = app.game.currentStage.name;
	if (dialogueSystem.exists(stageName, this.villagerName)) {
		if (!this.isInteractive())
			this.setInteractive(new Rectf(-20, -20, 20, 20));
	} else
		this.setNonInteractive();
};

Villager.prototype.happyUpdate = function(dt) {
	var game = app.game;
	if (this.spawnGoodies) {
		var count = 1;
		game.spawnPickupTable(DropTableType.kDTVillager, this.getPos().addNew(new Vec2(0, -100)), -50, 50, -250, -350, count);
		this.spawnGoodies = false;
	}
	if (!this.hasGreeted) {
		this.timeToGreeting -= dt;
		if (this.timeToGreeting <= 0) {
			app.audio.playFX(this.happySound[this.type]);
			var msg = {greeted : 0};
			app.game.sendMessageToType(Villager, msg);
			this.hasGreeted = true;
		}
	}
};

Villager.prototype.happyLeave = function() {
	this.setNonInteractive();
};

Villager.prototype.panicEnter = function() {
	this.animVariation = randomBool() ? 0 : 1;
	this.timeToScared = randomRange(2, 6);
	if (this.facingRight)
		this.currentAnim = this.panicRightAnim[this.type][this.animVariation];
	else
		this.currentAnim = this.panicLeftAnim[this.type][this.animVariation];
	this.currentAnim.play();

	this.timeToScream = randomRange(0.5, 2);
};

Villager.prototype.panicUpdate = function(dt) {
	this.timeToScared -= dt;
	if (this.timeToScared <= 0)
		this.fsm.setState(Villager.states.kStateScared);
	else {
		this.movement.SetDesiredVelocityHoriz(this.facingRight ? 200 : -200);
		if (this.movement.IsFacingWall(!this.facingRight)) {
			this.turn();
			if (this.facingRight)
				this.currentAnim = this.panicRightAnim[this.type][this.animVariation];
			else
				this.currentAnim = this.panicLeftAnim[this.type][this.animVariation];
			this.currentAnim.play();
		}
	}

	this.timeToScream -= dt;
	if (this.timeToScream <= 0) {
		app.audio.playFX(this.scaredSound[this.type]);
		this.timeToScream = randomRange(1, 3);
	}
};

Villager.prototype.scaredEnter = function() {
	this.currentAnim = this.scaredAnim[this.type];
	this.currentAnim.setCallback(this.animCallback);
	this.currentAnim.play(true);
};


Villager.prototype.getIdolInfo = function() {
	var idolType = app.game.getIdolType(this.villagerName);
	if(idolType == IdolType.kMaxIdols)
		idolType = this.type == this.kMale ? IdolType.kIdolVillager2 : IdolType.kIdolVillager1;
	return new IdolInfo(idolType, GemType.kGemGreen, GemType.kGemGreen, MetalType.kMetalSilver);
};

Villager.prototype.onTrigger = function(param, volume, object) {
	if (param == "damage" || param == "damage_pwr" || param == "stun" || param == "stun_pwr") {
		this.hit(0, volume.getWorldSpaceRect().center().x < this.getPos().x);
		this.fsm.setState(Villager.states.kStatePanic);
	} else if (param == "pattack" && this.fsm.currentState == Villager.states.kStateScared) {
		this.hit(0, volume.getWorldSpaceRect().center().x < this.getPos().x, true);
		this.fsm.setState(Villager.states.kStatePanic);
	}
};

Villager.prototype.getObjectExtent = function() {
	return new Rectf(-50, -100, 50, 0);
};

Villager.prototype.getHittableRect = function() {
	return new Rectf(-50, -50, 50, 0);
};