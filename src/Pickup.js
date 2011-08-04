/**
 * Enumerator
 */
var DropTableType = {
	kDTVillager : "villager",
	kDTSoupGrem : "soupgrem",
	kDTScoutGrem : "scoutgrem",
	kDTWarriorGrem : "warriorgrem",
	kDTGuardGrem : "guardgrem",
	kDTThiefGrem : "thiefgrem",
	kDTKiteGrem : "kitegrem",
	kDTBouncerGrem : "bouncergrem",
	kDTWishingWell : "wishingwell",
	kDTAppleBasket : "applebasket",
	kDTCandleFinger : "candlefinger",
	kDTChestGradeA : "chestA",
	kDTChestGradeB : "chestB",
	kDTChestGradeC : "chestC",
	kDTMortar : "mortar",
	kMaxDT : "default"
};

/**
 * General Pickup item class
 *
 * @param {Pickup.Type}       t The pickup type (optional)
 * @param {DropTableType} table Drop table type (optional)
 * @constructor
 * @auguments GameObject
 */
function Pickup (t, table) {
	if (t === undefined) { t = Pickup.Type.kPickupMaxType; }
	if (table === undefined) { table = DropTableType.kMaxDT; }

	this.isStatic = true;
	this.type = t;
	this.timeToDestabilize = 10;
	this.pickupVolume = null;
	this.lootTable = table;
	this.timeToPickable = 0;
	this.timeToPop = 0;
	this.angle = 0;
	this.angleVel = 0;
	this.endAngle = 0;
	this.endAngleVel = 0;
	this.useCustomDropSound = false;
	this.timeWithNoCollision = 999;

	this.movement = new SimpleMovementComponent();
	this.triggerSystem = app.game.currentStage.triggerSystem;

	this.waitingForBounce = false;
	this.pickupVolume = null;
	this.lootTable = null;
	this.customDropSound = null;
	this.pickupEffect = null;
	this.pickupVanish = null;
	this.img = null;
}

Pickup.prototype = new GameObject();
Pickup.prototype.constructor = Pickup;

Pickup.Type = {
	kPickupFireworks : 0,
	kPickupDiamond : 1,
	kPickupEmerald : 2,
	kPickupRuby : 3,
	kPickupOpal : 4,
	kPickupGoldenApple : 5,
	kPickupAquamarine : 6,
	kPickupAmethyst : 7,
	kPickupGoldenBar : 8,
	kPickupGoldenGyro : 9,
	kPickupApple : 10,
	kPickupSilverBar : 11,
	kPickupSilverGyro : 12,
	kPickupCopperBar : 13,
	kPickupCopperGyro : 14,
	kPickupGoldenAcorn : 15,
	kPickupDrumStick : 16,
	kPickupCupCake : 17,
	kPickupRootBeer : 18,
	kPickupCarrot : 19,
	kPickupPixieStick : 20,
	kPickupGoldenWings : 21,
	kPickupMaxType : 22
};

Pickup.litTypeToEnum = {
	"fireworks" :  Pickup.Type.kPickupFireworks,
	"diamond" :  Pickup.Type.kPickupDiamond,
	"emerald" :  Pickup.Type.kPickupEmerald,
	"ruby" :  Pickup.Type.kPickupRuby,
	"opal" :  Pickup.Type.kPickupOpal,
	"goldenapple" :  Pickup.Type.kPickupGoldenApple,
	"aquamarine" :  Pickup.Type.kPickupAquamarine,
	"amethyst" :  Pickup.Type.kPickupAmethyst,
	"goldenbar" :  Pickup.Type.kPickupGoldenBar,
	"goldengyro" :  Pickup.Type.kPickupGoldenGyro,
	"apple" :  Pickup.Type.kPickupApple,
	"silverbar" :  Pickup.Type.kPickupSilverBar,
	"silvergyro" :  Pickup.Type.kPickupSilverGyro,
	"copperbar" :  Pickup.Type.kPickupCopperBar,
	"coppergyro" :  Pickup.Type.kPickupCopperGyro,
	"goldenacorn" :  Pickup.Type.kPickupGoldenAcorn,
	"drumstick" :  Pickup.Type.kPickupDrumStick,
	"cupcake" :  Pickup.Type.kPickupCupCake,
	"rootbeer" :  Pickup.Type.kPickupRootBeer,
	"carrot" :  Pickup.Type.kPickupCarrot,
	"pixiestick" :  Pickup.Type.kPickupPixieStick,
	"golden_wings" :  Pickup.Type.kPickupGoldenWings,
	"nothing" : Pickup.Type.kPickupMaxType
};

Pickup.kTypeScore = [ 0, 1000, 800, 700, 600, 1200, 500, 400, 300, 100, 100, 150, 50, 75, 25, 10, 10, 10, 10, 10, 10, 10 ];
Pickup.kTypeImage = [ "Fireworks", "Diamond", "Emerald", "Ruby", "Opal", "GoldenApple", "Aquamarine", "Amethyst", "GoldenBar", "GoldenGyro", "Apple", "SilverBar", "SilverGyro", "CopperBar", "CopperGyro", "GoldenAcorn", "DrumStick", "CupCake", "RootBeer", "Carrot", "PixieStick", "GoldenWings" ];

/**
 * Sets the type of the pickup. Has to be called before init to have any effect
 *
 * @param {Pickup.Type}       t
 * @param {DropTableType} table
 */
Pickup.prototype.setType = function (t, table) {
	if (t === undefined) { t = Pickup.Type.kPickupMaxType; }
	if (table === undefined) { table = DropTableType.kMaxDT; }

	this.type = t;
	this.lootTable = table;
};

Pickup.prototype.reset = function () {
	GameObject.reset.call(this);
};

Pickup.prototype.onCreate = function (res) {
	GameObject.prototype.onCreate.call(this, res);
	this.type = res.subtype;
};

Pickup.prototype.init = function (reinit) {
	if (this.type === Pickup.Type.kPickupMaxType) {
		this.type = this.getRandomType(this.lootTable); 
	}

	var circles = this.getCollision();

	this.movement.Init(9.82 * 50, this, circles, app.game.provider);

	GameObject.prototype.init.call(this, reinit);

	this.updateOffScreen = true;

	this.pickupVolume = new TriggerVolume("pickup", new Rectf(-20, -40, 20, 0), 
	                                      this, createCallback(this.onTrigger, this),
										  "pickup");

	if (this.enabled) {
		this.triggerSystem.addVolume(this.pickupVolume);
	}

	
	var depot = ResourceDepot.getInstance();
	this.genericCollectSound = depot.getSFX("pickup_collect");
	this.appleCollectSound = depot.getSFX("kindle_gobble");
	this.liquidCollectSound = depot.getSFX("kindle_burp");
	this.gappleCollectSound = depot.getSFX("pickup_goldenapplecollect");
	this.pixieCollectSound = depot.getSFX("tutorial_tip");
	this.coinDropSound = depot.getSFX("pickup_coindrop");
	this.gemDropSound = depot.getSFX("pickup_gemdrop");
	this.foodDropSound = depot.getSFX("food_land");
	this.barDropSound = depot.getSFX("pickup_bardrop");

	this.waitingForBounce = false;
	this.timeToPickable = 0;
	this.timeToDestabilize = 0;
	this.timeToPop = 3;

	var anim = this.getIdleAnimation()
	this.idleAnim = anim.idleAnim;

	if (this.idleAnim) {
		var animCallback = this.getAnimationCallback();

		if (animCallback) {
			this.idleAnim.setCallback(animCallback);
		}

		if (anim.random) {
			this.idleAnim.gotoTime(randomRange(0, 1));
		}

		if (anim.play) {
			this.idleAnim.play();
		}

		this.img = null;
	}
	else {
		this.img = this.getIdleImage();
	}

	this.pickupEffect = depot.getAnimation("PickupCollect");
	this.pickupVanish = depot.getAnimation("PickupVanish");

	this.pointLight = depot.getImage("LightShapes", "point");
};

Pickup.prototype.deinit = function () {
	GameObject.prototype.deinit.call(this);
	this.idleAnim = null;

	if (this.pickupVolume) {
		this.triggerSystem.removeVolume(this.pickupVolume, true);
		this.pickupVolume = null;
	}
};

Pickup.prototype.onDisable = function () {
	this.triggerSystem.removeVolume(this.pickupVolume);

	// TODO stopMagicShimmer
};

Pickup.prototype.onEnable = function () {
	this.triggerSystem.addVolume(this.pickupVolume);
};

Pickup.prototype.update = function (dt) {
	GameObject.prototype.update.call(this, dt);

	if (this.idleAnim) {
		this.idleAnim.update(dt);
	}

	if (!this.isStatic && !this.waitingForBounce) {
		if (this.movement.HasCollided()) {
			if (this.timeWithNoCollision > 0.5) {
				if (this.useCustomDropSound) {
					app.audio.playFX(this.customDropSound);
				}
				else {
					switch (this.type) {
						case Pickup.Type.kPickupGoldenGyro:
						case Pickup.Type.kPickupSilverGyro:
						case Pickup.Type.kPickupCopperGyro:
							app.audio.playFX(this.coinDropSound);
							break;
						case Pickup.Type.kPickupDiamond:
						case Pickup.Type.kPickupEmerald:
						case Pickup.Type.kPickupRuby:
						case Pickup.Type.kPickupOpal:
						case Pickup.Type.kPickupAquamarine:
						case Pickup.Type.kPickupAmethyst:
						case Pickup.Type.kPickupGoldenWings:
							app.audio.playFX(this.gemDropSound);
							break;
						case Pickup.Type.kPickupCopperBar:
						case Pickup.Type.kPickupSilverBar:
						case Pickup.Type.kPickupGoldenBar:
							app.audio.playFX(this.barDropSound);
							break;
						case Pickup.Type.kPickupDrumStick:
						case Pickup.Type.kPickupCupCake:
						case Pickup.Type.kPickupApple:
						case Pickup.Type.kPickupRootBeer:
						case Pickup.Type.kPickupCarrot:
						case Pickup.Type.kPickupPixieStick:
							app.audio.playFX(this.foodDropSound);
							break;
						default:
							break;
					}
				}
			}

			this.movement.ClearCollisionFlag();
			this.timeWithNoCollision = 0;

		}
		else {
			this.timeWithNoCollision += dt;
		}

		if (this.movement.halted) {
			var slope = this.movement.GetSlope();
			if (this.endAngle !== 0 && this.angle !== this.endAngle + slope) {
				if (slope < 0 && this.endAngleVel < 0 || slope > 0 && this.endAngleVel > 0) {
					this.endAngleVel = -this.endAngleVel;
					this.endAngle = -this.endAngle;
				}

				if (this.endAngleVel < 0) {
					this.angle = Math.max(this.endAngle + slope, this.angle + this.endAngleVel * dt);
				}
				else {
					this.angle = Math.min(this.endAngle + slope, this.angle + this.endAngleVel * dt);
				}
			}
		}
		else {
			this.movement.Update(dt);
			if (this.angleVel) {
				this.angle += this.angleVel * dt;
			}
		}

		if (this.timeToPickable > 0) {
			this.timeToPickable -= dt;
			if (this.movement.velocity.y > 0) {
				this.timeToPickable = 0;
			}
			if (this.timeToPickable <= 0) {
				this.triggerSystem.flushVolume(this.pickupVolume);
			}
		}

		if (this.timeToDestabilize > 0) {
			this.timeToDestabilize -= dt;
		}
		else if (this.timeToPop > 0) {
			this.timeToPop -= dt;
		}
		else {
			app.game.currentStage.particleSystem.spawnAnimatedParticle(this.pickupVanish, this.getPos().addNew(new Vec2(0, -20)), new Vec2(0, 0));
			this.enable(false);
		}
	}
};

Pickup.prototype.draw = function (render, x, y) {
	if (this.timeToDestabilize > 0 || this.timeToPop > 0) {
		var pos = this.getPos();
		var t = 0;

		if (this.timeToDestabilize <= 0) {
			if (this.timeToPop % 0.5 > 0.4) {
				t = 128;
			} else if (this.timeToPop % 0.5 > 0.2) {
				t = (this.timeToPop % 0.5 - 0.2) * 640;
			} else {
				t = 0;
			}
		}

		var tint = new Pixel32(255, 255, 255, t);
		if (this.idleAnim) {
			this.idleAnim.draw(render, pos.x + x, pos.y + y - 20, this.angle, 1, tint);
		} else {
			render.drawImage(this.img, pos.x + x, pos.y + y - 20, this.angle, true, 1, tint, false);
		}
	}

	if (app.debugMovementTrigger) {
		for (var i = 0; i < this.movement.spheres.length; i++) {
			var sp = this.movement.spheres[i];
			var pos = this.movement.position;

			render.drawCircle(pos.x + x + sp.c.x, pos.y + y + sp.c.y, sp.r, render.blue);
		}
	}

};

Pickup.prototype.getPos = function () {
	return this.movement.position;
};

Pickup.prototype.setPos = function (pos) {
	this.movement.SetPosition(pos);
	this.updateInWaterFlag();
};

Pickup.prototype.getCollision = function () {
	return [ new Circle(new Vec2(0, -20), 20) ];
};

Pickup.prototype.getRandomType = function (table) {
	return ResourceDepot.instance.getDropType(table);
};

Pickup.prototype.bounce = function (dir) {
	this.waitingForBounce = false;
	this.isStatic = false;
	var pos = this.getPos();
	this.setStartPos(pos.x, pos.y);
	this.movement.SetDesiredVelocity(dir);
	this.timeToDestabilize = 7;
	this.timeToPop = 3;
	this.timeToPickable = 0.25;

	switch (this.type) {
		case Pickup.Type.kPickupFireworks:
		case Pickup.Type.kPickupGoldenBar:
		case Pickup.Type.kPickupSilverBar:
		case Pickup.Type.kPickupCopperBar:
		case Pickup.Type.kPickupDrumStick:
		case Pickup.Type.kPickupCupCake:
		case Pickup.Type.kPickupRootBeer:
		case Pickup.Type.kPickupCarrot:
		case Pickup.Type.kPickupPixieStick:
		case Pickup.Type.kPickupGoldenWings:
			this.movement.allowedBounces = 0;
			this.movement.bouncyness = 0;
			this.movement.PushGravity(9.82 * 100);
			break;

		case Pickup.Type.kPickupDiamond:
		case Pickup.Type.kPickupEmerald:
		case Pickup.Type.kPickupRuby:
		case Pickup.Type.kPickupAquamarine:
		case Pickup.Type.kPickupAmethyst:
			this.endAngle = randomBool() ? -0.85 : 0.85;
			this.endAngleVel = this.endAngle * 4;
		case Pickup.Type.kPickupOpal:
			this.movement.allowedBounces = 1;
			this.movement.bouncyness = 0.30;
			break;

		case Pickup.Type.kPickupGoldenGyro:
		case Pickup.Type.kPickupSilverGyro:
		case Pickup.Type.kPickupCopperGyro:
			this.movement.allowedBounces = 2;
			this.movement.bouncyness = 0.40;
			break;

		case Pickup.Type.kPickupGoldenAcorn:
			this.movement.allowedBounces = 1;
			this.movement.bouncyness = 0.2;
			this.angleVel = randomRange(-10, 10);
			break;

		case Pickup.Type.kPickupGoldenApple:
		case Pickup.Type.kPickupApple:
			this.movement.allowedBounces = 2;
			this.movement.bouncyness = 0.2;
			this.angleVel = randomRange(-5, 5);
			break;
	}

	// TODO magix shimmah
};

Pickup.prototype.pickable = function () {
	return this.timeToPickable <= 0;
};

Pickup.prototype.onTrigger = function (param, volume, object) {
	if (this.pickable()) {
		if (param === "pickup") {
			if (object.particle) {
				var player = object.particle;
				if (player instanceof PlayerCharacter && player.isAlive()) {
					this.collected(player);
					this.enable(false);
				}
			}
		}
	}
};

Pickup.prototype.collected = function (p) {
	// TODO partakle affakts!
	
	var g = app.game;

	switch (this.type) {
		case Pickup.Type.kPickupFireworks:	  
			// TODO: g->TriggerFireworks();
			break;
		case Pickup.Type.kPickupGoldenApple:  
			if (!p.regenerate()) {
				g.addScore(Pickup.kTypeScore[this.type], this.getPos());
			} else {
				g.displayHeal(this, 10);
			}
			app.audio.playFX(this.gappleCollectSound);
			break;
		case Pickup.Type.kPickupRootBeer:
			if (!p.regenerate(3)) {
				g.addScore(Pickup.kTypeScore[this.type], this.getPos());
			} else {
				g.displayHeal(this, 3);
			}
			app.audio.playFX(this.liquidCollectSound);
			break;
		case Pickup.Type.kPickupPixieStick:
			if (!p.sugarRush()) {
				g.addScore(Pickup.kTypeScore[this.type], this.getPos());
				app.audio.playFX(this.genericCollectSound);
			} else {
				app.audio.playFX(this.pixieCollectSound);
			}
			g.stopMagicShimmer(this);
			break;
		case Pickup.Type.kPickupApple:
		case Pickup.Type.kPickupCarrot:
			if (!p.regenerate(1)) {
				g.addScore(Pickup.kTypeScore[this.type], this.getPos());
			} else {
				g.displayHeal(this, 1);
			}
			app.audio.playFX(this.appleCollectSound);
			break;
		case Pickup.Type.kPickupDrumStick:
		case Pickup.Type.kPickupCupCake:
			if (!p.regenerate(2)) {
				g.addScore(Pickup.kTypeScore[this.type], this.getPos());
			} else {
				g.displayHeal(this, 2);
			}
			app.audio.playFX(this.appleCollectSound);
			break;
		case Pickup.Type.kPickupGoldenAcorn:  
			g.addScore(Pickup.kTypeScore[this.type], this.getPos());
			g.addAcorn(1);
			app.audio.playFX(this.genericCollectSound);
			break;
		case Pickup.Type.kPickupGoldenWings:
			g.addMultiplier();
			break;
		default:
			g.addScore(Pickup.kTypeScore[this.type], this.getPos());
			app.audio.playFX(this.genericCollectSound);
			break;
	}
};

Pickup.prototype.addTrigger = function () {
	this.triggerSystem.addVolume(this.pickupVolume);
};

Pickup.prototype.removeTrigger = function () {
	this.triggerSystem.removeVolume(this.pickupVolume);
};

Pickup.prototype.setCustomDropSound = function (sound) {
	this.useCustomDropSound = true;
	this.customDropSound = sound;
};

Pickup.prototype.getIdleImage = function () {
	return this.getImage(this.type)
};

Pickup.prototype.getIdleAnimation = function () {
	var depot = ResourceDepot.getInstance();

	return { idleAnim : depot.getAnimation(Pickup.kTypeImage[this.type]), play : true, random : false};
};

Pickup.prototype.getImage = function (t) {
	return ResourceDepot.instance.getImage("pickups", Pickup.kTypeImage[t]);
};

Pickup.prototype.setZeroGravity = function () {
	this.movement.PushGravity(0);
};

Pickup.prototype.getAnimationCallback = function () {
	return null;
};

