function Lamppost() {
	GameObject.call(this);
	this.pickupVolume = null;
	this.safeZoneTrigger = null;
	this.lit = null;
	this.unlit = null;
	this.isLit = false;
	this.alphaParam = 0;
	this.alphaMul = 2;
}


Lamppost.prototype = new GameObject();
Lamppost.prototype.constructor = Lamppost;

Lamppost.prototype.init = function(reinit) {
	GameObject.prototype.init.call(this, reinit);
	this.pickupVolume = new TriggerVolume("lamppost", new Rectf(-20, -250, 20, -210), this, createCallback(this.onTrigger, this), "lamppost");
	var ts = app.game.currentStage.triggerSystem;
	ts.addVolume(this.pickupVolume);

	if (this.isLit) {
		this.safeZoneTrigger = new TriggerVolume("lamppost_safe", new Rectf(-100, -250, 100, 0), this, null, "safe_zone_enter", "safe_zone_exit");
		ts.addVolume(this.safeZoneTrigger);
	}

	var dep = ResourceDepot.getInstance();

	this.collectSound = dep.getSFX("stage_spawn");

	this.lit = dep.getImage("lamp_post_lit", "default");
	this.unlit = dep.getImage("lamp_post", "default");

	this.alphaParam = 0;
	this.alphaMul = 2;
};

Lamppost.prototype.update = function(dt) {
	var pis = Math.floor(this.alphaParam / Math.PI);
	this.alphaParam += dt * this.alphaMul;
	if (pis != Math.floor(this.alphaParam / Math.floor))
		this.alphaMul = randomRange(1, 4);
};

Lamppost.prototype.draw = function(render, x, y) {
	var pos = this.getPos();

	render.drawImage(this.unlit, x + pos.x - this.unlit.textureWidth / 2, y + pos.y - this.unlit.textureHeight, 0, false);
	if (this.isLit)
		render.drawImage(this.lit, x + pos.x - this.lit.textureWidth / 2, y + pos.y - this.lit.textureHeight, 0, false, 0.9 + Math.sin(this.alphaParam) * 0.1);
};

Lamppost.prototype.getObjectExtent = function() {
	return new Rectf(this.isLit ? -150 : -40, -290, this.isLit ? 150 : 40, 0);
};

Lamppost.prototype.setPos = function(pos, dropToGround) {
};

Lamppost.prototype.reset = function() {

};

Lamppost.prototype.onTrigger = function(param, volume, object) {
	if (!this.isLit) {
		if (param == "lamppost") {
			if (object.particle instanceof PlayerCharacter) {
				this.light(object.particle);
			}
		}
	}
};

Lamppost.prototype.light = function(player) {
	player.setLastLamppost(this);
	var ts = app.game.currentStage.triggerSystem;
	this.isLit = true;
	app.audio.playFX(this.collectSound);
	if (this.pickupVolume) {
		ts.removeVolume(this.pickupVolume, true);
		this.pickupVolume = null;
	}
	if (!this.safeZoneTrigger) {
		this.safeZoneTrigger = new TriggerVolume("lamppost_safe", new Rectf(-100, -250, 100, 0), this, null, "safe_zone_enter", "safe_zone_exit");
		ts.addVolume(this.safeZoneTrigger);
	}

	var lampposts = app.game.getGameObjectByType(Lamppost);
	for (var i = 0; i < lampposts.length; i++) {
		var l = lampposts[i];
		if (l != this) l.putOut();
	}
};

Lamppost.prototype.putOut = function() {
	var ts = app.game.currentStage.triggerSystem;

	if (this.safeZoneTrigger) {
		ts.removeVolume(this.safeZoneTrigger, true);
		this.safeZoneTrigger = null;
	}
	if (this.pickupVolume) {
		ts.removeVolume(this.pickupVolume, true);
		this.pickupVolume = null;
	}

	this.isLit = false;

	this.pickupVolume = new TriggerVolume("lamppost", new Rectf(-20, -250, 20, -210), this, createCallback(this.onTrigger, this), "lamppost");
	ts.addVolume(this.pickupVolume);
};