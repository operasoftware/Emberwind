function TutorialTip() {
	GameObject.call(this);

	this.pickupVolume = null;
	this.anim = null;
	this.isLit = false;
	this.inTrigger = false;
	this.isAutoTip = false;
	this.targetTip = null;
	this.timeInTrigger = 0;
	this.litSound = null;
	this.animParam = randomRange(0, 2 * Math.PI);
	this.style = null;
	this.skillId = -1;
}

TutorialTip.prototype = new GameObject();
TutorialTip.prototype.constructor = TutorialTip;

TutorialTip.styles = {
	kOldStyle : 0,
	kNewStyle : 1,
	kSkillBookStyle : 2
};

TutorialTip.colorsBasic = [new Pixel32(5, 48, 149),new Pixel32(5, 141, 192) ];
TutorialTip.colorsAdvanced = [new Pixel32(160, 0, 0), new Pixel32(224, 144, 0)];
TutorialTip.colorsLocked = [new Pixel32(0, 0, 0, 192), new Pixel32(0, 0, 0, 192)];

TutorialTip.prototype.onCreate = function(res) {
	GameObject.prototype.onCreate.call(this, res);
	this.style = res.subtype;
	this.targetTip = res.target;
	if (this.targetTip.indexOf("auto ") == 0) {
		this.isAutoTip = true;
		this.targetTip = this.targetTip.substring(5);
	}

	this.anim = ResourceDepot.getInstance().getAnimation("tutorialtip");
};

TutorialTip.prototype.init = function(reinit) {
	GameObject.prototype.init.call(this, reinit);

	if (!this.isAutoTip) {
		if (this.enabled) {
			if (!reinit || !this.isLit) {
				this.pickupVolume = new TriggerVolume("tutorialtip", this.getInteractRect(), this,
						createCallback(this.onTrigger, this), "enter", "exit");
				app.game.currentStage.triggerSystem.addVolume(this.pickupVolume);
			} else
				this.setInteractive(this.getInteractRect());
		}

		this.litSound = ResourceDepot.getInstance().getSFX("flamesprite_get");

		this.inTrigger = false;
		this.timeInTrigger = 0;
	}

	if (!reinit)
		this.isLit = false;

	if (app.noTutorial) {
		this.isLit = true;
		this.setInteractive(this.getInteractRect());
	}

	this.anim.stop();
	if (this.isLit)
		this.anim.gotoEnd();
	else
		this.anim.gotoTime(0);
};
TutorialTip.prototype.deinit = function() {
	GameObject.prototype.deinit.call(this);
	this.onDisable();
};
TutorialTip.prototype.update = function(dt) {
	this.anim.update(dt);
	if (!this.isLit)
		this.animParam += dt * Math.PI;
	if (this.isAutoTip) {
	}
	else if (this.inTrigger) {
		this.timeInTrigger += dt;
		if (this.timeInTrigger > 1.5 && this.style == TutorialTip.styles.kOldStyle) {
			app.game.showTutorialTip(this.targetTip, this.style != TutorialTip.styles.kOldStyle);
			this.timeInTrigger = 0;
		}
	}
};

TutorialTip.prototype.draw = function(render, x, y) {
	if (!this.isAutoTip) {
		var pos = this.getPos();

		this.anim.draw(render, x + pos.x, y + pos.y + Math.sin(this.animParam) * 3);
	}
};

TutorialTip.prototype.onDisable = function() {
	if (this.pickupVolume) {
		app.game.currentStage.triggerSystem.removeVolume(this.pickupVolume, true);
		this.pickupVolume = null;
	}
	this.setNonInteractive();
};
TutorialTip.prototype.onEnable = function() {
	this.pickupVolume = new TriggerVolume("tutorialtip", this.getInteractRect(), this, createCallback(this.onTrigger, this), "enter", "exit");
	app.game.currentStage.triggerSystem.addVolume(this.pickupVolume);
	if (this.isLit && this.style != TutorialTip.styles.kOldStyle)
		this.setInteractive(this.getInteractRect());
};

TutorialTip.prototype.onTrigger = function(param, volume, object) {
	if (object.particle && object.particle instanceof PlayerCharacter) {
		var player = object.particle;
		if (param == "enter") {
			if (!this.isLit) {
				player.setBlankState();
				this.light(player);
			}
			this.inTrigger = true;
			this.timeInTrigger = 0;
		} else if (param == "exit") {
			this.inTrigger = false;
		}
	}
};


TutorialTip.prototype.light = function(player) {
	app.audio.playFX(this.litSound);
	this.isLit = true;
	app.game.showTutorialTip(this.targetTip, this.style != TutorialTip.styles.kOldStyle);

	if (this.style != TutorialTip.styles.kOldStyle)
		this.setInteractive(this.getInteractRect());
	this.anim.play(false);
};

TutorialTip.prototype.onInteract = function(obj, param) {
	if (obj && obj instanceof PlayerCharacter) {
		obj.setBlankState();
	}

	app.game.showTutorialTip(this.targetTip, this.style != TutorialTip.styles.kOldStyle);
	return true;
};

TutorialTip.prototype.getObjectExtent = function() {
	return new Rectf(-20, -20, 20, 20);
};

TutorialTip.prototype.getInteractRect = function() {
	return new Rectf(-20, -20, 20, 20);
};

TutorialTip.prototype.setPos = function(pos, dropToGround) {
};

TutorialTip.prototype.reset = function() {
	this.isLit = false;
	GameObject.prototype.reset.call(this);
	this.anim.stop();
	this.anim.gotoTime(0);
	if (!this.pickupVolume) {
		this.pickupVolume = new TriggerVolume("tutorialtip", this.getInteractRect(), this, createCallback(this.onTrigger, this), "enter", "exit");
		app.game.currentStage.triggerSystem.addVolume(this.pickupVolume);
	}
};

// ----------------------------------------------------------------------------

function TutorialCard(move, advanced) {
	if (move == undefined) return;
	this.timeInState = 0;
	this.advanced = advanced;
	this.isLocked = false;
	this.text = new Text();
	this.text.set(move, "TutorialPageFont");

	var masteryStr = ResourceDepot.getInstance().getString("STR_TUTIPCARD_TIER" + (advanced ? "2" : "1"));
	this.smallText = new Text();
	this.smallText.set(masteryStr, "TutorialPageSmallFont");
	this.pageImage = ResourceDepot.getInstance().getImage("TutorialPage", "default");
	this.padlock = ResourceDepot.getInstance().getImage("Padlock", "default");
}

TutorialCard.prototype.doEnter = function() {
	this.timeInState = 0;
	this.enter();
};

TutorialCard.prototype.doUpdate = function(dt) {
	if (this.timeInState == 3)
		this.timeInState = 0;
	this.timeInState = Math.min(3, this.timeInState + dt);
	this.update(dt);
};

TutorialCard.prototype.doDraw = function(render, x, y) {
	var kFrameWidth = this.pageImage.textureWidth;
	var kFrameHeight = this.pageImage.textureHeight;
	var backRect = new Rectf(x - kFrameWidth / 2 + 2, y - kFrameHeight / 2 + 70 + 3, x + kFrameWidth / 2 - 2 - 2, y + kFrameHeight / 2 - 22);

	render.drawFilledRect(backRect.x0, backRect.y0, backRect.x1, backRect.y1,
			this.advanced ? TutorialTip.colorsAdvanced[0] : TutorialTip.colorsBasic[0],
			this.advanced ? TutorialTip.colorsAdvanced[1] : TutorialTip.colorsBasic[1]);

	render.pushClipRect(backRect);

	this.draw(render, backRect.center().x, backRect.center().y);

	if (this.isLocked) {
		render.drawFilledRect(backRect.x0, backRect.y0, backRect.x1, backRect.y1,
				TutorialTip.colorsLocked[0], TutorialTip.colorsLocked[1]);
		render.drawImage(this.padlock, backRect.center().x, backRect.center().y, true);
	}

	render.popClipRect();

	render.drawImage(this.pageImage, x, y, 0, true);
	this.text.draw(render, x - kFrameWidth / 2 + 10 + 3, y - kFrameHeight + 160);
	this.smallText.draw(render, x - this.smallText.canvas.width / 2, y + 92 - 7);
};

TutorialCard.prototype.width = function() {
	return this.pageImage.textureWidth;
};

TutorialCard.prototype.height = function() {
	return this.pageImage.textureHeight;
};

// ----------------------------------------------------------------------------

function TutorialCardWalk() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_WALK"), false);

	var dep = ResourceDepot.getInstance();

	this.idleAnim = dep.getAnimation("KindleIdleRight");
	this.walkAnim = dep.getAnimation("KindleRunRight");
	this.groundTile = dep.getTile(4).image;

	this.scrollParam = 0;

	this.animation = null;
}

TutorialCardWalk.prototype = new TutorialCard();
TutorialCardWalk.prototype.constructor = TutorialCardWalk;

TutorialCardWalk.prototype.enter = function() {
	this.animation = this.idleAnim;
	this.animation.play();

	this.scrollParam = 0;
};

TutorialCardWalk.prototype.leave = function() {
};

TutorialCardWalk.prototype.update = function(dt) {
	if (this.timeInState < 0.5 && this.timeInState + dt >= 0.5) {
		this.animation = this.walkAnim;
		this.animation.play();
	} else if (this.timeInState < 2 && this.timeInState + dt >= 2) {
		this.animation = this.idleAnim;
		this.animation.play();
	}

	this.animation.update(dt);

	if (this.timeInState > 0.5 && this.timeInState < 2)
		this.scrollParam += 100 * dt;
};

TutorialCardWalk.prototype.draw = function(render, x, y) {
	var dpadRImage = app.getControlImage(Buttons.right);

	render.drawTilingImage(this.groundTile, x - 70 - (this.scrollParam % 96), y + 30, 4, 1, 0.5);
	this.animation.draw(render, x, y + 35);
	render.drawImage(dpadRImage, x - 90, y - 40, 0, true, 1, new Pixel32(255, 255, 255,
			this.timeInState >= 0.5 && this.timeInState <= 2 ? 128 : 0));
};

// ----------------------------------------------------------------------------

function TutorialCardAttack() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_ATTACK"), false);


	var dep = ResourceDepot.getInstance();

	this.idleAnim = dep.getAnimation("KindleIdleRight");
	this.swingAnim = dep.getAnimation("KindleCaneSwingARight");
	this.groundTile = dep.getTile(4).image;

	this.animation = null;
}

TutorialCardAttack.prototype = new TutorialCard();
TutorialCardAttack.prototype.constructor = TutorialCardAttack;

TutorialCardAttack.prototype.enter = function() {
	this.animation = this.idleAnim;
	this.animation.play();
};

TutorialCardAttack.prototype.leave = function() {
};

TutorialCardAttack.prototype.update = function(dt) {
	if (this.timeInState < 0.5 && this.timeInState + dt >= 0.5) {
		this.animation = this.swingAnim;
		this.animation.play(false);
	} else if (this.animation.isStopped()) {
		this.animation = this.idleAnim;
		this.animation.play();
	}

	if (this.animation != null)
		this.animation.update(dt);
};

TutorialCardAttack.prototype.draw = function(render, x, y) {
	var xImage = app.getControlImage(Buttons.attack);

	render.drawTilingImage(this.groundTile, x - 70, y + 30, 4, 1, 0.5);
	this.animation.draw(render, x, y + 35);
	var tintStrength = 0;
	if (this.timeInState > 0.5)
		tintStrength = Clamp(0, 1 - (this.timeInState - 0.5) * 5, 1);
	render.drawImage(xImage, x - 90, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(255 * tintStrength)));
};

// ----------------------------------------------------------------------------

function TutorialCardDash() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_DASH"), true);


	var dep = ResourceDepot.getInstance();

	this.idleAnim = dep.getAnimation("KindleIdleRight");
	this.dashAnim = dep.getAnimation("KindleSprintRight");
	this.groundTile = dep.getTile(4).image;

	this.scrollParam = 0;

	this.animation = null;
}

TutorialCardDash.prototype = new TutorialCard();
TutorialCardDash.prototype.constructor = TutorialCardDash;

TutorialCardDash.prototype.enter = function() {
	this.animation = this.idleAnim;
	this.animation.play();

	this.scrollParam = 0;
};

TutorialCardDash.prototype.leave = function() {
};

TutorialCardDash.prototype.update = function(dt) {
	if (this.timeInState < 0.5 && this.timeInState + dt >= 0.5) {
		this.animation = this.dashAnim;
		this.animation.play();
	} else if (this.timeInState < 2 && this.timeInState + dt >= 2) {
		this.animation = this.idleAnim;
		this.animation.play();
	}

	this.animation.update(dt);

	if (this.timeInState > 0.5 && this.timeInState < 2)
		this.scrollParam += 200 * dt;
};

TutorialCardDash.prototype.draw = function(render, x, y) {
	var dpadRImage = app.getControlImage(Buttons.right);

	var tintOne = 0;
	var tintTwo = 0;

	if (this.timeInState > 0.5)
		tintOne = Clamp(0, 1 - (this.timeInState - 0.5) * 5, 1);
	if (this.timeInState > 0.7 && this.timeInState < 2)
		tintTwo = 1;

	render.drawTilingImage(this.groundTile, x - 70 - (this.scrollParam % 96), y + 30, 4, 1, 0.5);
	this.animation.draw(render, x, y + 35);
	render.drawImage(dpadRImage, x - 90, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(255 * tintOne)));
	render.drawImage(dpadRImage, x - 50, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(128 * tintTwo)));
};

// ----------------------------------------------------------------------------

function TutorialCardHide() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_HIDE_UNHIDE"), true);

	var dep = ResourceDepot.getInstance();

	this.idleAnim = dep.getAnimation("KindleIdleRight");
	this.hideAnim = dep.getAnimation("KindleHideRight");
	this.groundTile = dep.getTile(4).image;

	this.animation = null;
}

TutorialCardHide.prototype = new TutorialCard();
TutorialCardHide.prototype.constructor = TutorialCardHide;

TutorialCardHide.prototype.enter = function() {
	this.animation = this.idleAnim;
	this.animation.play();

	this.scrollParam = 0;
};

TutorialCardHide.prototype.leave = function() {
};

TutorialCardHide.prototype.update = function(dt) {
	if (this.timeInState < 0.5 && this.timeInState + dt >= 0.5) {
		this.animation = this.hideAnim;
		this.animation.playToEvent("hide_marker");
		this.animation.setSpeed(1.5);
	} else if (this.timeInState < 1.5 && this.timeInState + dt >= 1.5) {
		this.animation.play(false);
	} else if (this.animation.isStopped() && this.timeInState > 2) {
		this.animation = this.idleAnim;
		//this.animation.rewind();
		this.animation.play();
	}
	this.animation.update(dt);

	if (this.timeInState > 0.5 && this.timeInState < 2)
		this.scrollParam += 200 * dt;
};

TutorialCardHide.prototype.draw = function(render, x, y) {
	var upImage = app.getControlImage(Buttons.up);
	var downImage = app.getControlImage(Buttons.down);

	render.drawTilingImage(this.groundTile, x - 70, y + 30, 4, 1, 0.5);
	this.animation.draw(render, x, y + 35);
	var tintStrength = 0;
	var alpha = 1;

	if (this.timeInState > 1.5)
		tintStrength = Clamp(0, 1 - (this.timeInState - 1.5) * 5, 1);
	else if (this.timeInState > 0.5)
		tintStrength = Clamp(0, 1 - (this.timeInState - 0.5) * 5, 1);

	if (this.timeInState > 2.8)
		alpha = Clamp(0, 1 - (this.timeInState - 2.8) * 5, 1);
	else if (this.timeInState > 1.3)
		alpha = Clamp(0, (this.timeInState - 1.3) * 5, 1);
	else if (this.timeInState > 1)
		alpha = Clamp(0, 1 - (this.timeInState - 1) * 5, 1);
	else
		alpha = Clamp(0, this.timeInState * 5, 1);

	if (this.timeInState < 1.3)
		render.drawImage(downImage, x - 90, y - 40, 0, true, alpha, new Pixel32(255, 255, 255, Math.floor(255 * tintStrength)));
	else
		render.drawImage(upImage, x - 90, y - 40, 0, true, alpha, new Pixel32(255, 255, 255, Math.floor(255 * tintStrength)));
};

// ----------------------------------------------------------------------------

function TutorialCardJumpClimb() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_JUMP_CLIMB"), false);


	var dep = ResourceDepot.getInstance();

	this.idleAnim = dep.getAnimation("KindleIdleRight");
	this.jumpAnim = dep.getAnimation("KindleJumpRight");
	this.climbAnim = dep.getAnimation("KindleClimb");

	this.tiles = [
		[-1, -1, -1, 4],
		[-1, -1, -1, 4],
		[85, 85, 95, 4],
		[-1, -1, -1, 4]
	];
	for (var x = 0; x < 4; ++x)
		for (var y = 0; y < 4; ++y) {
			var tile = dep.getTile(this.tiles[x][y]);
			this.tiles[x][y] = tile == null ? null : tile.image;
		}

	this.scrollXParam = 0;
	this.scrollYParam = 0;

	this.animation = null;
}

TutorialCardJumpClimb.prototype = new TutorialCard();
TutorialCardJumpClimb.prototype.constructor = TutorialCardJumpClimb;

TutorialCardJumpClimb.prototype.enter = function() {
	this.scrollXParam = 0;
	this.scrollYParam = 0;

	this.animation = this.idleAnim;
	this.animation.play();
};

TutorialCardJumpClimb.prototype.leave = function() {
};

TutorialCardJumpClimb.prototype.update = function(dt) {
	if (this.timeInState < 0.5 && this.timeInState + dt >= 0.5) {
		this.animation = this.jumpAnim;
		this.animation.play(false);
	} else if (this.timeInState < 1 && this.timeInState + dt >= 1) {
		this.animation = this.climbAnim;
		this.animation.gotoTime(0.3);
		this.animation.setSpeed(130 / 65);
		this.animation.play();
	} else if (this.timeInState < 2 && this.timeInState + dt >= 2) {
		this.animation.stop();
	} else if (this.timeInState < 2.75 && this.timeInState + dt >= 2.75) {
		this.animation = this.idleAnim;
		this.animation.play();
	}

	if (this.timeInState >= 2.75) {
		this.scrollXParam = 0;
		this.scrollYParam = 0;
	} else if (this.timeInState >= 1 && this.timeInState < 2) {
		this.scrollYParam += dt * 130;
	} else if (this.timeInState > 0.5) {
		var sinParam = Math.min(1, (this.timeInState - 0.5) * 2);
		this.scrollXParam = -sinParam * 96;
		this.scrollYParam = Math.sin(sinParam * Math.PI / 2 * 1.1) * 96;
	}

	this.animation.update(dt);
};

TutorialCardJumpClimb.prototype.draw = function(render, x, y) {
	var aImage = app.getControlImage(Buttons.jump);
	var dpadUImage = app.getControlImage(Buttons.up);

	var px = x - 48 - 96;
	var py = y - 96 * 3 - 16;

	var oneTint = 0;
	var twoTint = 0;
	if (this.timeInState >= 0.5 && this.timeInState <= 1)
		oneTint = 1;
	if (this.timeInState >= 1 && this.timeInState <= 2)
		twoTint = 1;

	var alpha = 1;
	if (this.timeInState > 2.5 && this.timeInState <= 2.75)
		alpha = Clamp(0, 1 - (this.timeInState - 2.5) * 5, 1);
	else if (this.timeInState > 2.75)
		alpha = Clamp(0, (this.timeInState - 2.75) * 5, 1);


	for (var h = 0; h < 4; ++h)
		for (var v = 0; v < 4; ++v)
			if (this.tiles[h][v] != null)
				render.drawImage(this.tiles[h][v], px + h * 96 + this.scrollXParam, py + v * 96 + this.scrollYParam, 0, false, 0.5 * alpha);

	this.animation.draw(render, x, y + 35, 0, alpha);

	render.drawImage(aImage, x - 90, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(oneTint * 128)));
	render.drawImage(dpadUImage, x - 50, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(twoTint * 128)));
};

// ----------------------------------------------------------------------------

function TutorialCardEnter() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_ENTER"), false);


	var dep = ResourceDepot.getInstance();

	this.idleAnim = dep.getAnimation("KindleIdleRight");

	this.indoorTiles = [
		[104, 104],
		[141, 151],
		[-1, 142],
		[-1, 142]
	];
	this.outdoorTiles = [
		[-1, 4 ],
		[ -1, 4 ],
		[ 68, 78 ],
		[ 24, 27]
	];
	for (var x = 0; x < 4; ++x)
		for (var y = 0; y < 2; ++y) {
			var tile = dep.getTile(this.indoorTiles[x][y]);
			this.indoorTiles[x][y] = tile == null ? null : tile.image;
			tile = dep.getTile(this.outdoorTiles[x][y]);
			this.outdoorTiles[x][y] = tile == null ? null : tile.image;
		}

	this.animation = null;
}

TutorialCardEnter.prototype = new TutorialCard();
TutorialCardEnter.prototype.constructor = TutorialCardEnter;

TutorialCardEnter.prototype.enter = function() {
	this.animation = this.idleAnim;
	this.animation.play();
};

TutorialCardEnter.prototype.leave = function() {
};

TutorialCardEnter.prototype.update = function(dt) {
	this.animation.update(dt);
};

TutorialCardEnter.prototype.draw = function(render, x, y) {
	var bImage = app.getControlImage(Buttons.interact);

	var px = x - 70 - 48 + 10 - 96;
	var py = y - 96 - 16;

	var btnTint = 0;
	if (this.timeInState >= 0.75)
		btnTint = Math.max(0, 1 - (this.timeInState - 0.75) * 5);

	var alpha = 1;
	if (this.timeInState >= 1.25)
		alpha = Math.min(1, (this.timeInState - 1.25) * 2);
	else if (this.timeInState >= 0.75)
		alpha = Math.max(0, 1 - (this.timeInState - 0.75) * 2);

	for (var h = 0; h < 4; ++h)
		for (var v = 0; v < 2; ++v)
			if (this.timeInState >= 1.25) {
				if (this.indoorTiles[h][v] != null)
					render.drawImage(this.indoorTiles[h][v], px + h * 96 + 15, py + v * 96 - 10, 0, false, 0.5 * alpha);
			} else {
				if (this.outdoorTiles[h][v] != null)
					render.drawImage(this.outdoorTiles[h][v], px + h * 96, py + v * 96, 0, false, 0.5 * alpha);
			}
	this.animation.draw(render, x, y + 35, 0, alpha);

	render.drawImage(bImage, x - 90, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(btnTint * 255)));
};


// ----------------------------------------------------------------------------

function TutorialCardBarrelRoll() {
	TutorialCard.call(this, ResourceDepot.getInstance().getString("STR_TUTIPCARD_BARREL_ROLL"), true);


	this.xImage = null;
	this.animation = null;
	this.scrollParam = 0;
	this.heightParam = 0;

	var dep = ResourceDepot.getInstance();

	this.dashAnim = dep.getAnimation("KindleSprintRight");
	this.rollAnim = dep.getAnimation("KindleBarrelRollRight");
	this.groundTile = dep.getTile(4).image;

	this.animation = null;
}

TutorialCardBarrelRoll.prototype = new TutorialCard();
TutorialCardBarrelRoll.prototype.constructor = TutorialCardBarrelRoll;

TutorialCardBarrelRoll.prototype.enter = function() {
	this.animation = this.dashAnim;
	this.animation.play();

	this.scrollParam = 0;
	this.heightParam = 0;
};

TutorialCardBarrelRoll.prototype.leave = function() {
};

TutorialCardBarrelRoll.prototype.update = function(dt) {
	if (this.timeInState < 0.5 && this.timeInState + dt >= 0.5) {
		this.animation = this.rollAnim;
		this.animation.playToTime(21 / 61);
	}
	else if (this.timeInState < 2 && this.timeInState + dt >= 2) {
		this.animation.setRange(40 / 61, 1);
		this.animation.play(false);
	}
	else if (this.timeInState > 2 && !this.animation.playing) {
		this.animation = this.dashAnim;
		this.animation.play();
	}
	else if (this.timeInState > 0.5 && !this.animation.playing) {
		this.animation.setRange(21 / 61, 40 / 61);
		this.animation.play();
	}

	this.animation.update(dt);

	this.scrollParam += 200 * dt;
	if (this.timeInState >= 0.5 && this.timeInState <= 1.5)
		this.heightParam = Math.sin((this.timeInState - 0.5) * Math.PI) * 100;
	else
		this.heightParam = 0;
};

TutorialCardBarrelRoll.prototype.draw = function(render, x, y) {
	this.xImage = app.getControlImage(Buttons.attack);

	var tintOne = 0;
	if (this.timeInState > 0.5)
		tintOne = Clamp(0, 1 - (this.timeInState - 0.5) * 5, 1);

	render.drawTilingImage(this.groundTile, x - 70 - (this.scrollParam % 96), y + 30 + this.heightParam, 4, 1, 0.5);
	this.animation.draw(render, x, y + 35);
	render.drawImage(this.xImage, x - 90, y - 40, 0, true, 1, new Pixel32(255, 255, 255, Math.floor(255 * tintOne)));
};