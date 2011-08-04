var HitSoundType = {
	kFlesh : 0,
	kWood  : 1,
	kRock  : 2,
	kMuted : 3,
	kMetal : 4,
	kMaxSoundType : 5
};

/**
 * Hittable game objects
 *
 * @constructor
 * @auguments GameObject
 */
function HittableGameObject(displayHits, displayFlash) {
	if (displayHits === undefined) { return; }
	if (displayFlash === undefined) { displayFlash = true; }

	GameObject.apply(this, arguments);

	this.maxHits = 1;
	this.hitsRemaining = 1;
	this.invunerable = false;
	this.hittable = true;

	this.hitpointObservers = [];

	this.displayHitsTaken = displayHits;
	this.displayHitEffect = displayFlash;

	this.hitEffect = null;
	this.blockEffect = null;

	this.hitEffectOffset = new Vec2(0, 0);

	this.grace = 0;
	this.maxGrace = 2;
	this.healed = 0;
	this.maxHealed = 1;

	this.damTint = [255, 0, 0];
	this.healTint = [0, 255, 0];

	this.hitSounds = [];
	this.hitSounds[HitSoundType.kFlesh] = [];
	this.hitSounds[HitSoundType.kWood]  = [];
	this.hitSounds[HitSoundType.kRock]  = [];
	this.hitSounds[HitSoundType.kMetal] = [];

	this.annoyedDelay = 0;
	this.annoyedCount = 0;
	this.annoyedEnemyCount = 0;

	this.burning = false;

	this.annoyedCues = [];
	this.annoyedEnemyCues = [];
}

HittableGameObject.prototype = new GameObject();
HittableGameObject.prototype.constructor = HittableGameObject;

HittableGameObject.prototype.reset = function () {
	GameObject.prototype.reset.call(this);
	this.setHitPoints(this.maxHits);
};

HittableGameObject.prototype.init = function (reinit) {
	GameObject.prototype.init.call(this, reinit);
	if (!reinit) {
		this.setHitPoints(this.maxHits);
	}

	var depot = ResourceDepot.getInstance();
	this.hitEffect = depot.getAnimation("HitEffect");
	this.blockEffect = depot.getAnimation("BlockEffect");

	this.hitSounds[HitSoundType.kFlesh][0] = depot.getSFX("hit");
	this.hitSounds[HitSoundType.kFlesh][1] = depot.getSFX("hit_variation");
	this.hitSounds[HitSoundType.kFlesh][2] = depot.getSFX("hit_crit");
	this.hitSounds[HitSoundType.kWood][0] = depot.getSFX("wood_hit");
	this.hitSounds[HitSoundType.kRock][0] = depot.getSFX("rock_hit");
	this.hitSounds[HitSoundType.kMetal][0] = depot.getSFX("metal_hit");

	this.annoyedCues = [];

	this.annoyedCount = 0;
	this.annoyedEnemyCount = 0;
	this.annoyedDelay = 0;
	this.burning = false;
};

HittableGameObject.prototype.update = function (dt) {
	GameObject.prototype.update.call(this, dt);

	if(this.hitEffect !== null) { this.hitEffect.update(dt); }
	if(this.blockEffect !== null) { this.blockEffect.update(dt); }

	if (this.grace > 0) {
		this.grace = Math.max(0, this.grace - dt);
	}

	if (this.healed > 0) {
		this.healed = Math.max(0, this.healed - dt);
	}

	if (this.annoyedDelay > 0) {
		this.annoyedDelay -= dt;
	}
};

HittableGameObject.prototype.draw = function (render, x, y) {
	if (this.displayHitEffect && !this.hitEffect.isStopped()) {
		this.hitEffect.draw(render, x + this.hitEffectOffset.x,
		                    y + this.hitEffectOffset.y, 0, 1, null);
	}
	if (this.blockEffect && !this.blockEffect.isStopped()) {
		this.blockEffect.draw(render, x + this.hitEffectOffset.x,
		                      y + this.hitEffectOffset.y, 0, 1, null);
	}
};

/**
 * Get effect offset
 *
 * @param {boolean} left
 */
HittableGameObject.prototype.getHitEffectOffset = function (left) {
	return new Vec2(left ? -20 : 20, -20).add(new Vec2(Math.floor(randomRange(-5, 6)),
	                                                   Math.floor(randomRange(-5, 6))));
};

/**
 * Set the maximum number of hit points of the object
 *
 * @param {number} hp Hit points
 * @param {boolean} nolimit Whether the hit points should be limited
 */
HittableGameObject.prototype.setMaxHitPoints = function (hp, nolimit) {
	if (nolimit === undefined || !nolimit) {
		// TODO
		//Achievment-stuff?
	}

	this.maxHits = hp;
	var observers = this.hitpointObservers;
	for (var i = 0; i < observers.length; i++) {
		if (observers[i] !== undefined) {
			observers[i].onMaxHitpointsSet(hp);
		}
	}
};


/**
 * Set the current number of hit points of the object and notifies current
 * observers of this.
 *
 * @param {number} hp Hit points
 */
HittableGameObject.prototype.setHitPoints = function (hp) {
	hp = Math.min(hp, this.maxHits);
	this.hitsRemaining = hp;
	var observers = this.hitpointObservers;
	for (var i = 0; i < observers.length; i++) {
		if (observers[i] !== undefined) {
			observers[i].onHitpointsSet(hp);
		}
	}
};

/**
 * Get maximum number of hit points of object
 *
 * @returns {number}
 */
HittableGameObject.prototype.getMaxHitPoints = function () {
	return this.maxHits;
};

/**
 * Get current number of hit points of object
 *
 * @returns {number}
 */
HittableGameObject.prototype.getHitPoints = function () {
	return this.hitsRemaining;
};

/**
 * Deal damage to the object
 *
 * @param {number} hits
 * @param {boolean} fromLeft
 * @param {boolean} enemyHit optional
 * @param {boolean} shieldHit optional
 * @param {boolean} critHit optional
 */
HittableGameObject.prototype.hit = function (hits, fromLeft, enemyHit, shieldHit, critHit) {
	if (enemyHit === undefined) { enemyHit = false; }
	if (shieldHit === undefined) { shieldHit = false; }
	if (critHit === undefined) { critHit = false; }

	if (critHit) {
		this.playCritHitSound();
		hits *= 2;
	}
	else {
		this.playHitSound();
	}

	this.checkAnnoyed(enemyHit);

	this.hitEffectOffset = this.getHitEffectOffset(fromLeft);
	this.hitEffect.rewind();
	this.hitEffect.play(false);

	if (!this.invunerable && this.hittable && !this.hasGrace()) {
		if (this.hitsRemaining) {
			if (this.displayHitsTaken) {
				if (shieldHit) {
					app.game.displayShieldHit(this);
				}
				else if (critHit) {
					app.game.displayCritHit(this, hits);
				}
				else {
					app.game.displayHit(this, hits);
				}
			}

			var hitsTaken = Math.min(hits, this.hitsRemaining);
			this.hitsRemaining = Math.max(0, this.hitsRemaining - hits);

			var observers = this.hitpointObservers;
			for (var i = 0; i < observers.length; i++) {
				observers[i].onHit(this.hitsRemaining);
			}

			if (this.hitsRemaining === 0) {
				this.setKnockedOutState(fromLeft, hitsTaken, false);
			}
			else {
				this.setDamagedState(fromLeft, hitsTaken);
			}
		}
		else if (!this.burning) {
			this.setCorpseSmackedState(fromLeft);
		}
	}
};

/**
 * Block
 *
 * @param {boolean} fromLeft
 */
HittableGameObject.prototype.block = function (fromLeft) {
	this.hitEffectOffset = this.getHitEffectOffset((fromLeft));
	this.blockEffect.rewind();
	this.blockEffect.play(false);
	if (this.displayHitsTaken) {
		app.game.displayShielZeroHit(this);
	}
};

/**
 * Stun the object
 *
 * @param {number} hits
 * @param {boolean} fromLeft
 * @param {boolean} enemyHit optional
 */
HittableGameObject.prototype.stun = function (hits, fromLeft, enemyHit) {
	if (enemyHit === undefined) { enemyHit = false; }
	this.playHitSound();
	this.checkAnnoyed(enemyHit);

	this.hitEffectOffset = this.getHitEffectOffset(fromLeft);
	this.hitEffect.rewind();
	this.hitEffect.play(false);

	if (!this.invunerable && this.hittable && !this.hasGrace()) {
		if (this.hitsRemaining) {
			if (this.displayHitsTaken) {
				app.game.displayHit(this. hits);
			}

			this.hitsRemaining = Math.max(0, this.hitsRemaining - hits);
			var observers = this.hitpointObservers;
			for (var i = 0; i < observers.length; i++) {
				observers[i].onHit(this.hitsRemaining);
			}

			if (this.hitsRemaining === 0) {
				this.setKnockedOutState(fromLeft, hits, false);
			}
			else {
				this.setStunnedState(fromLeft);
			}
		}
		else if (!this.burning) {
			this.setCorpseSmackedState(fromLeft);
		}
	}
};

/**
 * Burn the object
 *
 * @param {boolean} fromLeft
 * @param {boolean} enemyHit optional
 */
HittableGameObject.prototype.burn = function (fromLeft, enemyHit) {
	enemyHit = enemyHit == undefined ? false : enemyHit;
	this.checkAnnoyed(enemyHit);
	if (this.hitsRemaining && !this.invunerable && !this.hasGrace()) {
		if (this.displayHitsTaken && false) //todo
			app.game.displayHit(this, 10);

		var hitsTaken = this.hitsRemaining;
		this.hitsRemaining = 0;
		for (var i = 0; i < this.hitpointObservers.length; i++) {
			this.hitpointObservers[i].onHit(this.hitsRemaining);
		}
		this.setBurntState(fromLeft, hitsTaken);
		this.burning = true;
	}
};

// TODO
// More functions

/**
 * Regenerate the object
 *
 * @param {number} hits optional
 * @returns {boolean}
 */
HittableGameObject.prototype.regenerate = function (hits) {
	if (hits === undefined) { hits = -1; }

	if (this.hitsRemaining == this.maxHits) { return false; }

	if (hits == -1) {
		this.setHitPoints(this.maxHits);
	}
	else {
		this.setHitPoints(Math.min(this.maxHits, this.hitsRemaining + hits));
	}

	this.healed = this.maxHealed;

	return true;
};

/**
 * Kill the object
 */
HittableGameObject.prototype.kill = function () {
	if (this.displayHitsTaken) {
		app.game.displayHit(this, 10);
	}

	var hitsTaken = this.hitsRemaining;
	this.hitsRemaining = 0;
	var observers = this.hitpointObservers;
	for (var i = 0; i < observers.length; i++) {
		observers[i].onHit(this.hitsRemaining);
	}
	this.setKnockedOutState(false, hitsTaken, false);
};

/**
 * Primitive sugarRush func
 *
 * @returns {boolean}
 */
HittableGameObject.prototype.sugarRush = function () {
	return false;
};

/**
 * Deal damage from nearby explosion
 *
 * @param {number} hits
 * @param {Vec2} dir
 * @param {number} mag 
 */
HittableGameObject.prototype.explosion = function (hits, dir, mag) {
	this.hit(hits, dir.x > 0);
};

HittableGameObject.prototype.isInvunerable = function () {
	return this.invunerable;
};

/**
 * Set whether the object is invunerable or not
 *
 * @param {boolean} inv
 */
HittableGameObject.prototype.setInvunerable = function (inv) {
	this.invunerable = inv;
};

/**
 * Set whether the object is hittable or not
 *
 * @param {boolean} h
 */
HittableGameObject.prototype.setHittable = function (h) {
	this.hittable = h;
};

HittableGameObject.prototype.addObserver = function (o) {
	this.hitpointObservers.push(o);
	o.onInit(this.maxHits, this.hitsRemaining);
};

HittableGameObject.prototype.removeObserver = function (o) {
	var observers = this.hitpointObservers;
	for (var i = 0; i < observers.length; i++) {
		if (observers[i] === o) {
			observers.splice(i, 1);
			return;
		}
	}
};

HittableGameObject.prototype.isAlive = function () {
	return this.hitsRemaining !== 0;
};

HittableGameObject.prototype.isHittable = function () {
	return this.hittable;
};

HittableGameObject.prototype.hasGrace = function () {
	return this.grace > 0;
};

HittableGameObject.prototype.giveGrace = function (t) {
	this.grace = Math.max(this.grace, t);
	this.maxGrace = this.grace;
};

HittableGameObject.prototype.cancelGrace = function () {
	this.grace = 0;
};

/**
 * Gets the display tint as an anonymous object
 *
 * @returns {Object} {tint, r, g, b}
 */
HittableGameObject.prototype.getDisplayTint = function () {
	var ob = {
		tint : 0,
		r : 0,
		g : 0,
		b : 0
	};

	if (this.grace > 0) {
		if (this.grace > this.maxGrace - 0.2) {
			ob.tint = Math.floor(128 * (1 - (this.maxGrace - this.grace) * 5));
			ob.r = ob.g = ob.b = 255;
		}
		else if (this.grace < 0.2) {
			ob.tint = Math.floor(128 * this.grace * 5);
			ob.r = ob.g = ob.b = 255;
		}
		else {
			ob.tint = Math.floor(this.grace / this.maxGrace * 80 + 40);
			ob.r = this.damTint[0];
			ob.g = this.damTint[1];
			ob.b = this.damTint[2];
		}
	}
	else if (this.healed > 0) {
		if (this.healed < 0.2) {
			ob.tint = Math.floor(128 * this.healed * 5);
			ob.r = ob.g = ob.b = 255;
		}
		else {
			ob.tint = Math.floor(this.healed / this.maxHealed * 80 + 40);
			ob.r = this.healTint[0];
			ob.g = this.healTint[1];
			ob.b = this.healTint[2];
		}
	}
	else {
		ob.tint = 0;
	}

	return ob;
};

/**
 * Set the tint color of the object when damaged
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
HittableGameObject.prototype.setDamageTint = function (r, g, b) {
	this.damTint[0] = r;
	this.damTint[1] = g;
	this.damTint[2] = b;

};

HittableGameObject.prototype.getSoundType = function () {
	return HitSoundType.kFlesh;
};

HittableGameObject.prototype.playHitSound = function () {
	switch (this.getSoundType()) {
		case HitSoundType.kMuted: break;
		case HitSoundType.kWood:
			app.audio.playFX(this.hitSounds[HitSoundType.kWood][0]);
			break;
		case HitSoundType.kRock:
			app.audio.playFX(this.hitSounds[HitSoundType.kRock][0]);
			break;
		case HitSoundType.kMetal:
			app.audio.playFX(this.hitSounds[HitSoundType.kMetal][0]);
			break;
		// Defaults to flesh sound
		default: 
			app.audio.playFX(this.hitSounds[HitSoundType.kFlesh][Math.floor(randomRange(0, 2))]);
			break;
	}
};

HittableGameObject.prototype.playCritHitSound = function () {
	switch (this.getSoundType()) {
		case HitSoundType.kMuted: break;
		case HitSoundType.kWood:
			app.audio.playFX(this.hitSounds[HitSoundType.kWood][2]);
			break;
		case HitSoundType.kRock:
			app.audio.playFX(this.hitSounds[HitSoundType.kRock][2]);
			break;
		case HitSoundType.kMetal:
			app.audio.playFX(this.hitSounds[HitSoundType.kMetal][2]);
			break;
		// Defaults to flesh sound
		default: 
			app.audio.playFX(this.hitSounds[HitSoundType.kFlesh][2]);
			break;
	}
};

HittableGameObject.prototype.checkAnnoyed = function (enemyHit) {
	if (this.annoyedDelay <= 0) {
		this.annoyedDelay = 3;
		if (this.enemyHit) {
			this.getAnnoyed(this.annoyedEnemyCount++, enemyHit);
		}
		else {
			this.getAnnoyed(this.annoyedCount++, enemyHit);
		}
	}
};

HittableGameObject.prototype.getAnnoyed = function (num, enemyHit) {
	if (enemyHit) {
		var index = -1;
		if (num < this.annoyedEnemyCues.length) {
			index = num;
		}
		else if (this.annoyedEnemyCues.length > 0) {
			index = Math.floor(randomRange(0, this.annoyedEnemyCues.length));
		}

		if (index != -1) {
			if (app.game.getFocusObject() == this) {
				// TODO

			}
		}
	}
	else {
		var index = -1;
		if (num < this.annoyedCues.length) {
			index = num;
		}
		else if (this.annoyedCues.length > 0) {
			index = Math.floor(randomRange(0, this.annoyedCues.length));
		}

		if (index != -1) {
			if (app.game.getFocusObject() == this) {
				// TODO

			}
		}
	}
};

HittableGameObject.prototype.setKnockedOutState = function(fromLeft, hitsTaken, tossed) {
};

HittableGameObject.prototype.setCorpseSmackedState = function(fromLeft) {
};

HittableGameObject.prototype.setInvulnerable = function(i){
	this.invunerable = i;
};