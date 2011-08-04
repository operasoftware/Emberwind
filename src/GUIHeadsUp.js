/**
 * HUD in-game.
 */
function GUIHeadsUp() {
	this.healthBarLeft = null;
	this.healthBarRight = null;
	this.objectiveDisp = null;
	this.acornDisp = null;
	this.scoreDisp = null;
	this.bossBar = null;
	this.objectiveArrow = null;
	this.show = false;
	this.chainHitTime = 0;
	this.chainHits = 0;
	this.chainHitText = null;
	this.chainHitCounter = null;
}

GUIHeadsUp.prototype = {};
GUIHeadsUp.prototype.constructor = GUIHeadsUp;

GUIHeadsUp.prototype.init = function() {
	this.healthBarLeft = new GUIHealthBar(true, true);
	this.healthBarRight = new GUIHealthBar(false, false);

	this.objectiveDisp = new GUIObjectiveDisplay();

	this.acornDisp = null; //todo: = new GUIAcornDisplay();

	this.scoreDisp = new GUIScoreDisplay();

	this.objectiveArrow = new GUIObjectiveArrow();

	this.chainHitCounter = null; //todo: = new ScaleCounter("ChainHitCounterFont", 2, 4);

	this.chainHitText = null; //todo: = new ScaleCounter("ChainHitTextFont", 2, 4);
	//todo: this.chainHitText.set(StringTable.get("STR_CHAIN_COMBO"));	
};

GUIHeadsUp.prototype.draw = function(render) {
	if (!this.show) return;

	var safe = render.getSafeRect();
	var x0 = safe.x0;
	var y0 = safe.y0;
	var x1 = safe.x1;
	var y1 = safe.y1;
	var centerX = render.getWidth() / 2;


	if (this.healthBarLeft)
		this.healthBarLeft.draw(render, x0 + 70, y1 - 50);
	if (this.healthBarRight)
		this.healthBarRight.draw(render, x1 - 70, y1 - 50);
	if (this.objectiveDisp)
		this.objectiveDisp.draw(render, x0 + 90, y0 + 20);
	if (this.acornDisp)
		this.acornDisp.draw(render, centerX, y0);

	if (this.scoreDisp)
		this.scoreDisp.draw(render, x0 + 115 + 5, y1 - 90 + 29);
	if (this.chainHitCounter && this.chainHitTime > 0 && this.chainHits > 1) {
		this.chainHitText.draw(render, (x1 - 20 - this.chainHitText.getRect().width), (y0 + 20),
				this.getChainHitFadeFactor(), this.getChainHitFactor());
		this.chainHitCounter.draw(render, (x1 - 20 - (this.chainHitText.getRect().width +
				this.chainHitCounter.getRect().width) / 2), y0 + 10 + 30, this.getChainHitFadeFactor(),
				this.getChainHitFactor());
	}

	if (this.objectiveArrow)
		this.objectiveArrow.draw(render);
};

GUIHeadsUp.prototype.update = function(dt) {
	if (this.chainHitTime > 0)
		this.chainHitTime -= dt;
	else
		this.chainHits = 0;

	if (this.healthBarLeft)
		this.healthBarLeft.update(dt);
	if (this.healthBarRight)
		this.healthBarRight.update(dt);
	if (this.acornDisp)
		this.acornDisp.update(dt);
	if (this.objectiveDisp)
		this.objectiveDisp.update(dt);
	if (this.objectiveArrow)
		this.objectiveArrow.update(dt);
	if (this.chainHitCounter)
		this.chainHitCounter.update(dt);
	if (this.chainHitText)
		this.chainHitText.update(dt);
};

GUIHeadsUp.prototype.openRightBubble = function(obj, prio, cue, who, length) {
	//todo
};

GUIHeadsUp.prototype.openLeftBubble = function(obj, prio, cue, who, length) {
	//todo
};

GUIHeadsUp.prototype.show = function(s) {
	this.show = s;
};

GUIHeadsUp.prototype.hit = function() {
	//todo
};

GUIHeadsUp.prototype.resetChainHit = function() {
	this.chainHits = 0;
	this.chainHitTime = 0;
};

GUIHeadsUp.prototype.getChainHitFadeFactor = function() {
	return Math.min(1, 2 * this.chainHitTime);
};

GUIHeadsUp.prototype.getChainHitFactor = function() {
	return Math.min(1, this.chainHits / 30);
};

// ----------------------------------------------------------------------------

function GUIHealthBar(left, gold) {
	this.left = left;
	this.capacity = 3;
	this.hp = 3;
	this.hitDelay = 0.5;
	this.blinkLeft = 0;
	this.brownie = BrownieType.kBrownieMax;
	this.brownieState = 0;
	this.brownieCoolDown = 0;
	this.talkLeft = 0;
	this.nextTalk = 0.01;
	this.bubble = new GUITextBubble(left, 300);
	this.visible = true;
	this.hpDisplay = true;
	this.cooldown = new GUITransitionClock(null, -1, ResourceDepot.getInstance().getImage("gui_healthbar", "health_ring_glow"));

	this.healthCircle = [];
	this.healthFrameLeft = [];
	this.healthFrameMiddle = [];
	this.healthFrameRight = [];
	this.healthGem = [];
	this.iconFrame = [];
	this.iconGem = [];
	this.idol = [];
	this.idolIdle = [];
	this.idolTalk = [];
	this.idolBrownie = [];

	this.idolEntries = []; // {[IdolEntry]}

	this.pixieTimeLeft = 0;

	// Shimmer behind brownie
	this.pbuffer = null;
	this.pEmitter1 = null;
	this.pEmitter2 = null;
	this.rayImage = null;
	this.pfxAccumTime = 0;

	this.flashTimes = [];
	for (var i = 0; i < this.capacity; ++i)
		this.flashTimes.push(0);

	this.nextBlink = randomRange(4, 6);

	var dep = ResourceDepot.getInstance();
	var kGUIHealthBar = "gui_healthbar";

	this.healthCircle[MetalType.kMetalGold] = dep.getImage(kGUIHealthBar, "golden_health_ring");
	this.healthCircle[MetalType.kMetalSilver] = dep.getImage(kGUIHealthBar, "silver_health_ring");
	this.healthFrameLeft[MetalType.kMetalGold] = dep.getImage(kGUIHealthBar, "golden_health_frame_left");
	this.healthFrameMiddle[MetalType.kMetalGold] = dep.getImage(kGUIHealthBar, "golden_health_frame_middle");
	this.healthFrameRight[MetalType.kMetalGold] = dep.getImage(kGUIHealthBar, "golden_health_frame_right");
	this.healthFrameLeft[MetalType.kMetalSilver] = dep.getImage(kGUIHealthBar, "silver_health_frame_left");
	this.healthFrameMiddle[MetalType.kMetalSilver] = dep.getImage(kGUIHealthBar, "silver_health_frame_middle");
	this.healthFrameRight[MetalType.kMetalSilver] = dep.getImage(kGUIHealthBar, "silver_health_frame_right");
	this.healthGem[GemType.kGemRed] = dep.getImage(kGUIHealthBar, "health_gem_red");
	this.healthGem[GemType.kGemBlue] = dep.getImage(kGUIHealthBar, "health_gem_blue");
	this.healthGem[GemType.kGemPurple] = dep.getImage(kGUIHealthBar, "health_gem_purple");
	this.healthGem[GemType.kGemGreen] = dep.getImage(kGUIHealthBar, "health_gem_green");
	this.healthGem[GemType.kGemYellow] = dep.getImage(kGUIHealthBar, "health_gem_yellow");
	this.iconFrame[MetalType.kMetalGold] = dep.getImage(kGUIHealthBar, "golden_idol_frame");
	this.iconFrame[MetalType.kMetalSilver] = dep.getImage(kGUIHealthBar, "silver_idol_frame");

	this.iconGem[GemType.kGemBlue] = dep.getImage(kGUIHealthBar, "idol_gem_blue");
	this.iconGem[GemType.kGemGreen] = dep.getImage(kGUIHealthBar, "idol_gem_green");
	this.iconGem[GemType.kGemPurple] = dep.getImage(kGUIHealthBar, "idol_gem_purple");
	this.iconGem[GemType.kGemRed] = dep.getImage(kGUIHealthBar, "idol_gem_red");
	this.iconGem[GemType.kGemYellow] = null;

	// todo: Particle stuff start
	if (false) {
		this.pfxAccumTime = 0;
		this.rayImage = dep.getImage("ParticleDoubleRay", "default");

		var j = new KeyedParameter(KeyedParameter.prototype.kConstant, KeyedParameter.prototype.kConstant);
		j.insertKey(0.0, Math.sin(0));
		j.insertKey(0.1, Math.sin(0.1 * Math.PI));
		j.insertKey(0.2, Math.sin(0.2 * Math.PI));
		j.insertKey(0.3, Math.sin(0.3 * Math.PI));
		j.insertKey(0.4, Math.sin(0.4 * Math.PI));
		j.insertKey(0.5, Math.sin(0.5 * Math.PI));
		j.insertKey(0.6, Math.sin(0.6 * Math.PI));
		j.insertKey(0.7, Math.sin(0.7 * Math.PI));
		j.insertKey(0.8, Math.sin(0.8 * Math.PI));
		j.insertKey(0.9, Math.sin(0.9 * Math.PI));
		j.insertKey(1.0, Math.sin(Math.PI));

		this.pbuffer = new ParticleBuffer(kParticleStride, 200, kParticleLife, kParticleDT, ParticleBuffer.prototype.kReturnOldest);
		this.pEmitter1 = new PointEmitter(pbuffer, initRanges, 1.5, 0, 0, 0, 0, 0, 0, 0);
		this.pbuffer.addEmitter(pEmitter1);
		this.pEmitter2 = new PointEmitter(pbuffer, initRangesW, 0.25, 0, 0, 0, 0, 0, 0, 0);
		this.pbuffer.addEmitter(pEmitter2);
		this.pbuffer.addModifier(new SetKeyedParam(j, kOpacityOffset));

		// Update the rotation from the rotationspeed (rot = rot + dt * rotspeed)
		pbuffer.addModifier(new AddMultipliedParam(kParticleDT, kRotationSpeedOffset, kRotationOffset));

		pEmitter1.stop();
		pEmitter2.stop();
	}
	// Particle stuff end

	var kCharacterIcons = "character_icons";
	this.idol[EmotionType.kEmoteNormal] = [];
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolWick] = dep.getImage(kCharacterIcons, "icon_wick");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolMan1] = dep.getImage(kCharacterIcons, "icon_man1");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolGoblin] = dep.getImage(kCharacterIcons, "icon_goblin");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolVillager1] = dep.getImage(kCharacterIcons, "icon_villager1");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolVillager2] = dep.getImage(kCharacterIcons, "icon_villager2");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolBrownieY] = dep.getImage(kCharacterIcons, "icon_brownie_y");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolBrownieB] = dep.getImage(kCharacterIcons, "icon_brownie_b");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolBrownieG] = dep.getImage(kCharacterIcons, "icon_brownie_g");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolBrownieR] = dep.getImage(kCharacterIcons, "icon_brownie_r");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolBrownieP] = dep.getImage(kCharacterIcons, "icon_brownie_p");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolMan2] = dep.getImage(kCharacterIcons, "icon_man2");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolMan3] = dep.getImage(kCharacterIcons, "icon_man3");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolGyro] = dep.getImage(kCharacterIcons, "icon_gyro");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolCandleFinger] = dep.getImage(kCharacterIcons, "icon_candlefinger");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolChest] = dep.getImage("pickups", "Chest");

	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceRocks] = dep.getImage("cave_entrances", "icon_caveentrance_rocks");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceBricks] = dep.getImage("cave_entrances", "icon_caveentrance_bricks");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceBoards] = dep.getImage("cave_entrances", "icon_caveentrance_boards");

	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolFlamesprite] = dep.getImage(kCharacterIcons, "icon_flamesprite");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolBasket] = dep.getImage("gremlinbasket", "basket_back");
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolAppleBasket] = dep.getImage("pickups", "AppleBasket");

	//this.idol[EmotionType.kEmoteNormal][IdolType.kIdolSiegeTower] = dep.getImage("SiegeTowerIcon", "tower_icon");

	//this.idol[EmotionType.kEmoteNormal][IdolType.kIdolMortar] = dep.getImage("MortarIcon", "default");

	this.idolIdle[EmotionType.kEmoteNormal] = [];
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolWick] = dep.getImage(kCharacterIcons, "icon_wick_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolMan1] = dep.getImage(kCharacterIcons, "icon_man1_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolGoblin] = dep.getImage(kCharacterIcons, "icon_goblin_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolVillager1] = dep.getImage(kCharacterIcons, "icon_villager1_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolVillager2] = dep.getImage(kCharacterIcons, "icon_villager2_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolBrownieY] = dep.getImage(kCharacterIcons, "icon_brownie_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolBrownieB] = dep.getImage(kCharacterIcons, "icon_brownie_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolBrownieG] = dep.getImage(kCharacterIcons, "icon_brownie_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolBrownieR] = dep.getImage(kCharacterIcons, "icon_brownie_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolBrownieP] = dep.getImage(kCharacterIcons, "icon_brownie_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolMan2] = dep.getImage(kCharacterIcons, "icon_man2_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolMan3] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolGyro] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolCandleFinger] = dep.getImage(kCharacterIcons, "icon_candlefinger_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolChest] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceRocks] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceBricks] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceBoards] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolFlamesprite] = dep.getImage(kCharacterIcons, "icon_flamesprite_blink");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolBasket] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolAppleBasket] = null;
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolSiegeTower] = null;

	this.idolTalk[EmotionType.kEmoteNormal] = [];
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolWick] = dep.getImage(kCharacterIcons, "icon_wick_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolMan1] = dep.getImage(kCharacterIcons, "icon_man1_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolGoblin] = dep.getImage(kCharacterIcons, "icon_goblin_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolVillager1] = dep.getImage(kCharacterIcons, "icon_villager1_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolVillager2] = dep.getImage(kCharacterIcons, "icon_villager2_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolBrownieY] = dep.getImage(kCharacterIcons, "icon_brownie_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolBrownieB] = dep.getImage(kCharacterIcons, "icon_brownie_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolBrownieG] = dep.getImage(kCharacterIcons, "icon_brownie_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolBrownieR] = dep.getImage(kCharacterIcons, "icon_brownie_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolBrownieP] = dep.getImage(kCharacterIcons, "icon_brownie_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolMan2] = dep.getImage(kCharacterIcons, "icon_man2_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolMan3] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolGyro] = dep.getImage(kCharacterIcons, "icon_gyro_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolCandleFinger] = dep.getImage(kCharacterIcons, "icon_candlefinger_talk");
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolChest] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceRocks] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceBricks] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolCaveEntranceBoards] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolFlamesprite] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolBasket] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolAppleBasket] = null;
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolSiegeTower] = null;

	var kKindleIcons = "kindle_icons";
	this.idol[EmotionType.kEmoteNormal][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_normal");
	this.idolIdle[EmotionType.kEmoteNormal][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_normal_blink");
	this.idolTalk[EmotionType.kEmoteNormal] = [];
	this.idolTalk[EmotionType.kEmoteNormal][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_normal_talk");

	this.idol[EmotionType.kEmoteHappy] = [];
	this.idol[EmotionType.kEmoteHappy][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_happy");
	this.idolIdle[EmotionType.kEmoteHappy] = [];
	this.idolIdle[EmotionType.kEmoteHappy][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_happy_blink");
	this.idolTalk[EmotionType.kEmoteHappy] = [];
	this.idolTalk[EmotionType.kEmoteHappy][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_happy_talk");

	this.idol[EmotionType.kEmoteMad] = [];
	this.idol[EmotionType.kEmoteMad][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_mad");
	this.idolIdle[EmotionType.kEmoteMad] = [];
	this.idolIdle[EmotionType.kEmoteMad][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_mad_blink");
	this.idolTalk[EmotionType.kEmoteMad] = [];
	this.idolTalk[EmotionType.kEmoteMad][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_mad_talk");

	this.idol[EmotionType.kEmoteSurprised] = [];
	this.idol[EmotionType.kEmoteSurprised][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_surprised");
	this.idolIdle[EmotionType.kEmoteSurprised] = [];
	this.idolIdle[EmotionType.kEmoteSurprised][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_surprised_blink");
	this.idolTalk[EmotionType.kEmoteSurprised] = [];
	this.idolTalk[EmotionType.kEmoteSurprised][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_surprised_talk");

	this.idol[EmotionType.kEmoteSarcastic] = [];
	this.idol[EmotionType.kEmoteSarcastic][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_sarcastic");
	this.idolIdle[EmotionType.kEmoteSarcastic] = [];
	this.idolIdle[EmotionType.kEmoteSarcastic][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_sarcastic_blink");
	this.idolTalk[EmotionType.kEmoteSarcastic] = [];
	this.idolTalk[EmotionType.kEmoteSarcastic][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_sarcastic_talk");

	this.idol[EmotionType.kEmoteSad] = [];
	this.idol[EmotionType.kEmoteSad][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_sad");
	this.idolIdle[EmotionType.kEmoteSad] = [];
	this.idolIdle[EmotionType.kEmoteSad][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_sad_blink");
	this.idolTalk[EmotionType.kEmoteSad] = [];
	this.idolTalk[EmotionType.kEmoteSad][IdolType.kIdolKindle] = dep.getImage(kKindleIcons, "icon_kindle_sad_talk");


	var kBrownieIdols = "idols_brownie";

	this.idolBrownie[BrownieType.kBrownieBlue] = [];
	this.idolBrownie[BrownieType.kBrownieGreen] = [];
	this.idolBrownie[BrownieType.kBrownieRed] = [];
	this.idolBrownie[BrownieType.kBrownieYellow] = [];
	this.idolBrownie[BrownieType.kBrowniePurple] = [];
	this.idolBrownie[BrownieType.kBrownieBlue][0] = dep.getImage(kBrownieIdols, "brownie_blue");
	this.idolBrownie[BrownieType.kBrownieGreen][0] = dep.getImage(kBrownieIdols, "brownie_green");
	this.idolBrownie[BrownieType.kBrownieRed][0] = dep.getImage(kBrownieIdols, "brownie_red");
	this.idolBrownie[BrownieType.kBrownieYellow][0] = dep.getImage(kBrownieIdols, "brownie_yellow");
	this.idolBrownie[BrownieType.kBrowniePurple][0] = dep.getImage(kBrownieIdols, "brownie_purple");
	this.idolBrownie[BrownieType.kBrownieBlue][1] = dep.getImage(kBrownieIdols, "brownie_blue_ready");
	this.idolBrownie[BrownieType.kBrownieGreen][1] = dep.getImage(kBrownieIdols, "brownie_green_ready");
	this.idolBrownie[BrownieType.kBrownieRed][1] = dep.getImage(kBrownieIdols, "brownie_red_ready");
	this.idolBrownie[BrownieType.kBrownieYellow][1] = dep.getImage(kBrownieIdols, "brownie_yellow_ready");
	this.idolBrownie[BrownieType.kBrowniePurple][1] = dep.getImage(kBrownieIdols, "brownie_purple_ready");

	this.cacheRender = new RenderCanvas(document.createElement("canvas"), 1);
	this.cacheRender.canvas.width = 96;
	this.cacheRender.canvas.height = 96;
	this.cacheNeedsUpdate = true;
	this.lateDrawHealth = -1;
	this.lateDrawIdol = false;
}

GUIHealthBar.prototype = {};
GUIHealthBar.prototype.constructor = GUIHealthBar;

GUIHealthBar.prototype.kFlashTime = 0.5;
GUIHealthBar.prototype.kParticleDT = 1 / 30;
GUIHealthBar.prototype.kParticleLife = 2;

GUIHealthBar.prototype.onInit = function(max, h) {
	this.setStartValues(max, h);
};

GUIHealthBar.prototype.onMaxHitpointsSet = function(h) {
	this.setCapacity(h);
};

GUIHealthBar.prototype.onHitpointsSet = function(h) {
	this.setHealth(h);
};

GUIHealthBar.prototype.onHit = function(h) {
	this.hit(h);
};

GUIHealthBar.prototype.setStartValues = function(cap, h) {
	this.cacheNeedsUpdate = true;
	this.cacheRender.canvas.width = 96 + cap * 28 - 16;
	this.flashTimes = [];
	for (var i = 0; i < cap; i++)
		this.flashTimes.push(0);
	this.capacity = cap;
	this.hp = h;
};

GUIHealthBar.prototype.setCapacity = function(c) {
	this.cacheNeedsUpdate = true;
	if (c > this.capacity)
		for (var i = this.flashTimes.length; i < c; i++)
			this.flashTimes.push(0);
	else if (c < this.capacity)
		for (var j = 0; j < this.flashTimes.length - c; j++)
			this.flashTimes.pop();
	this.capacity = c;
};

GUIHealthBar.prototype.setHealth = function(h) {
	this.cacheNeedsUpdate = true;
	if (h > this.hp)
		for (var i = this.hp; i < h; i++)
			this.flashTimes[i] = -this.kFlashTime;
	else if (h < this.hp)
		for (var j = Math.min(this.capacity - 1, this.hp - 1); j >= h; j--)
			this.flashTimes[j] = this.kFlashTime;
	this.hp = h;
};

GUIHealthBar.prototype.hit = function(h) {
	this.cacheNeedsUpdate = true;
	for (var i = h; i < this.hp; i++) {
		if (h < this.hp)
			this.flashTimes[i] = this.kFlashTime;
		else if (h > this.hp)
			this.flashTimes[i] = -this.kFlashTime;
		this.hp = h;
	}
};

GUIHealthBar.prototype.update = function(dt) {
	this.pfxAccumTime += dt;
	while (this.pfxAccumTime >= this.kParticleDT && false) { //todo: particle
		this.pbuffer.update();
		this.pfxAccumTime -= this.kParticleDT;
	}

	this.bubble.update(dt);

	this.pixieTimeLeft = Math.max(0, this.pixieTimeLeft - dt);
	if (this.pixieTimeLeft == 0 && false) { //todo: particle
		this.pEmitter1.stop();
		this.pEmitter2.stop();
	}
	this.cooldown.setVal(this.pixieTimeLeft / 20);

	// Calculate a tint to make the cooldown bar flash.
	var tintParam = (1 + Math.sin(this.pixieTimeLeft * Math.PI * 6)) / 2;
	var tint = new Pixel32(lerp(115, 205, tintParam), lerp(184, 254, tintParam), lerp(255, 230, tintParam));
	this.cooldown.setTint(tint);

	var topEntryRemoved = false;

	for (var key in this.idolEntries) {
		if (this.idolEntries.hasOwnProperty(key)) {
			var e = this.idolEntries[key];
			if (e.timeLeft >= 0) {
				e.timeLeft -= dt;
				if (e.timeLeft <= 0) {
					this.topEntryRemoved = true;
					this.idolEntries.splice(key, 1);
				}
			}
		}
	}

	if (topEntryRemoved) {
		if (this.idolEntries.length != 0 && this.idolEntries[0].cue.length != 0)
			this.bubble.open(this.idolEntries[0].cue, this.idolEntries[0].title, this.idolEntries[0].timeLeft);
		else
			this.bubble.close();
	}

	if (this.brownie != BrownieType.kBrownieMax)
		this.brownieState = Math.min(this.brownieState + dt * this.brownieCoolDown, 1);

	for (var i = 0; i < this.flashTimes.length; i++) {
		var v = this.flashTimes[i];
		this.flashTimes[i] = v > 0 ? Math.max(0, v - dt) : Math.min(0, v + dt);
	}

	if (this.blinkLeft > 0)
		this.blinkLeft -= dt;
	if (this.nextBlink > 0) {
		this.nextBlink -= dt;
		if (this.nextBlink <= 0) {
			this.blinkLeft = 0.1;
			this.nextBlink = randomRange(3, 6);
		}
	}

	if (this.bubble.isOpen()) {
		if (this.talkLeft > 0)
			this.talkLeft -= dt;
		else if (this.nextTalk > 0) {
			this.nextTalk -= dt;
			if (this.nextTalk <= 0) {
				this.talkLeft = randomRange(0.04, 0.08);
				this.nextTalk = randomRange(0.08, 0.16);
			}
		}
	}
};

GUIHealthBar.prototype.clearIdols = function() {
	var topEntryRemoved = false;
	for (var key in this.idolEntries) {
		if (this.idolEntries.hasOwnProperty(key)) {
			var e = this.idolEntries[key];
			if (e.timeLeft >= 0) {
				topEntryRemoved = true;
				this.idolEntries.splice(key, 1);
			}
		}
	}

	this.bubble.close();
};

GUIHealthBar.prototype.visible = function(v) {
	this.visible = v;
};

GUIHealthBar.prototype.hPDisplay = function(d) {
	this.hpDisplay = d;
};

GUIHealthBar.prototype.draw = function(render, x, y) {
	if (!this.visible || this.idolEntries.length == 0) return;

	var xpos = this.left ? 48 : this.cacheRender.canvas.width - 48;
	var xoffset = xpos - 48;
	var ypos = 48;
	var dir = this.left ? 1 : -1;

	if (this.cacheNeedsUpdate)
		this.cacheRender.clear();

	if (this.brownie != BrownieType.kBrownieMax && this.cacheNeedsUpdate) {
		var extended = new Vec2(-26, -52);
		var retracted = new Vec2(-18, -33);

		/* todo: particle
		 var p = pbuffer.getParticles();
		 if (pnum > 0){
		 var px = x + extended.x,
		 var py = y + extended.y;
		 render.drawParticles(this.rayImage, px, py, p.particles, p.num, p.stride);
		 }
		 */

		var bp = extended.sub(retracted).mul(this.brownieState).add(retracted);
		this.cacheRender.drawImage(this.idolBrownie[this.brownie][this.brownieState == 1 ? 1 : 0], bp.x + xoffset, bp.y, 0, false);
	}

	var idolInfo = this.idolEntries[0];
	var image = this.iconFrame[idolInfo.metalType];
	var image2 = null;

	if (this.cacheNeedsUpdate)
		this.cacheRender.drawImage(image, xoffset, 0, 0, false);
	if (this.iconGem[idolInfo.gemType] != null && this.cacheNeedsUpdate)
		this.cacheRender.drawImage(this.iconGem[idolInfo.gemType], xoffset, 0, 0, false);

	this.cooldown.draw(render, new Point2(xpos, ypos));

	xpos += dir * image.textureWidth / 2;
	if (this.pixieTimeLeft > 0 && idolInfo.emoteType == EmotionType.kEmoteNormal && idolInfo.idolType == IdolType.kIdolKindle && this.cacheNeedsUpdate) {
		this.lateDrawIdol = false;
		// Draw kindles "pixie-face"
		image = this.idol[EmotionType.kEmoteSarcastic][IdolType.kIdolKindle];
		if (image)
			this.cacheRender.drawImage(image, xoffset, 0, 0, false);
	} else {
		this.lateDrawIdol = true;
		// Draw the idol image
		image = this.idol[idolInfo.emoteType][idolInfo.idolType];
		if (image && this.cacheNeedsUpdate)
			this.cacheRender.drawImage(image, xoffset + 48, ypos, 0, true);
	}

	if (this.hpDisplay && idolInfo.showHP && this.cacheNeedsUpdate) {
		xpos += this.left ? -19 : 19;
		ypos += 30;

		// Draw the leftmost piece of the frame
		image = this.left ? this.healthFrameLeft[idolInfo.metalType] : this.healthFrameRight[idolInfo.metalType];
		this.cacheRender.drawImage(image, xpos, ypos, 0, true);
		xpos += dir * Math.floor(image.textureWidth / 2);
		var tmp = xpos;

		// Draw any center pieces of the frame
		image = this.healthFrameMiddle[idolInfo.metalType];
		for (var j = 1; j < this.capacity; j++) {
			this.cacheRender.drawImage(image, xpos + dir * Math.floor(image.textureWidth / 2), ypos, 0, true);
			xpos += dir * image.textureWidth;
		}

		// Draw the rightmost piece of the frame
		image = this.left ? this.healthFrameRight[idolInfo.metalType] : this.healthFrameLeft[idolInfo.metalType];
		this.cacheRender.drawImage(image, xpos + dir * Math.floor(Math.floor(image.textureWidth / 2)), ypos, 0, true);
		xpos += dir * image.textureWidth;

		// Draw the health rings
		this.lateDrawHealth = -1;
		xpos = tmp;
		image = this.healthCircle[idolInfo.metalType];
		image2 = this.healthGem[idolInfo.healthType];
		for (var i = 0; i < this.capacity; i++) {
			if (this.flashTimes[i] > 0) {
				this.lateDrawHealth = i;
				break;
			} else if (this.flashTimes[i] < 0) {
				this.lateDrawHealth = i;
				break;
			} else if (i < this.hp) {
				this.cacheRender.drawImage(image, xpos, ypos, 0, true);
				this.cacheRender.drawImage(image2, xpos, ypos, 0, true);
			} else {
				this.cacheRender.drawImage(image, xpos, ypos, 0, true, 0.25);
				this.cacheRender.drawImage(image2, xpos, ypos, 0, true, 0.25);
			}
			xpos += dir * image.textureWidth;
		}
	}

	this.cacheNeedsUpdate = false;
	render.drawCanvas(this.cacheRender.canvas, x - 48 - xoffset, y - 48);

	if (this.lateDrawHealth !== -1) {
		xpos = x + 39;
		if (!this.left) xpos -= 78;
		ypos = y + 30;
		image = this.healthCircle[idolInfo.metalType];
		image2 = this.healthGem[idolInfo.healthType];
		xpos += dir * image.textureWidth * this.lateDrawHealth;
		for (var i = this.lateDrawHealth; i < this.capacity; i++) {
			if (this.flashTimes[i] > 0) {
				render.drawImage(image, xpos, ypos, 0, true);
				render.drawImage(image2, xpos, ypos, 0, true, 1, new Pixel32(255, 255, 255, Math.min(255, Math.max(0, this.flashTimes[i] * 2 * 255))));
			} else if (this.flashTimes[i] < 0) {
				render.drawImage(image, xpos, ypos, 0, true);
				render.drawImage(image2, xpos, ypos, 0, true, 1, new Pixel32(0, 255, 0, Math.min(255, Math.max(0, this.flashTimes[i] * -2 * 255))));
			} else if (i < this.hp) {
				this.cacheNeedsUpdate = true;
				render.drawImage(image, xpos, ypos, 0, true);
				render.drawImage(image2, xpos, ypos, 0, true);
			} else {
				this.cacheNeedsUpdate = true;
				render.drawImage(image, xpos, ypos, 0, true, 0.25);
				render.drawImage(image2, xpos, ypos, 0, true, 0.25);
			}
			xpos += dir * image.textureWidth;
		}
	}

	if (this.lateDrawIdol) {
		if (this.idolIdle[idolInfo.emoteType][idolInfo.idolType] != null && this.blinkLeft > 0)
			render.drawImage(this.idolIdle[idolInfo.emoteType][idolInfo.idolType], x, y, 0, true);
		if (this.bubble.isOpen() && this.idolTalk[idolInfo.emoteType][idolInfo.idolType] != null && this.talkLeft > 0)
			render.drawImage(this.idolTalk[idolInfo.emoteType][idolInfo.idolType], x, y, 0, true);
	}

	if (this.left)
		this.bubble.draw(render, x + 25, y - 25);
	else
		this.bubble.draw(render, x - 25, y - 25);
};

GUIHealthBar.prototype.setIdolInfo = function(idolInfo, et, prio, dispTime, title, cue, hpFlag) {
	hpFlag = hpFlag === undefined ? null : hpFlag;

	this.cacheNeedsUpdate = true;

	var entry = new IdolEntry();

	entry.metalType = idolInfo.mt;
	entry.gemType = idolInfo.gt;
	entry.healthType = idolInfo.ht;
	entry.idolType = idolInfo.it;
	entry.emoteType = et;
	switch (entry.idolType) {
		case IdolType.kIdolKindle:
		case IdolType.kIdolGoblin:
		case IdolType.kIdolChest:
		case IdolType.kIdolCaveEntranceRocks:
		case IdolType.kIdolCaveEntranceBricks:
		case IdolType.kIdolCaveEntranceBoards:
		case IdolType.kIdolBasket:
		case IdolType.kIdolAppleBasket:
		case IdolType.kIdolSiegeTower:
		case IdolType.kIdolMortar:
			entry.showHP = true;
			break;
		case IdolType.kIdolWick:
			entry.showHP = this.left;
			break;
		default:
			entry.showHP = false;
			break;
	}

	if (hpFlag)
		entry.showHP = hpFlag;

	entry.priority = prio;
	entry.timeLeft = dispTime;
	entry.title = title;
	entry.cue = cue;

	if (entry.timeLeft < 0)
		this.removePermanentIdol(false);

	for (var i = 0; i < this.idolEntries.length && this.idolEntries[i].priority > entry.priority; i++) ;

	if (this.idolEntries.length == 0 || i == 0)
		if (entry.cue.length == 0)
			this.bubble.close();
		else
			this.bubble.open(entry.cue, entry.title, entry.timeLeft);

	this.idolEntries.splice(i, 0, entry);
};

GUIHealthBar.prototype.removePermanentIdol = function(openbubble) {
	// todo: openbubble is unused.
	openbubble = openbubble === undefined ? true : openbubble;

	this.cacheNeedsUpdate = true;

	var firstEntryRemoved = false;

	for (var key in this.idolEntries) {
		if (this.idolEntries.hasOwnProperty(key)) {
			var e = this.idolEntries[key];
			if (e.timeLeft < 0) {
				if (key == 0) {
					firstEntryRemoved = true;
					this.idolEntries.splice(key, 1);
				}
			} else {
				if (firstEntryRemoved) {
					if (this.idolEntries.length != 0 && this.idolEntries[0].cue.length != 0)
						this.bubble.open(this.idolEntries[0].cue, this.idolEntries[0].title, this.idolEntries[0].timeLeft);
				}
			}
		}
	}
};

GUIHealthBar.prototype.setBrownie = function(b, coolDown, currState, pixieTime) {
	this.cacheNeedsUpdate = true;
	this.brownie = b;
	this.brownieCoolDown = coolDown;
	this.brownieState = currState;
	this.pixieTimeLeft = pixieTime;
	if (pixieTime > 0) {
		this.pEmitter1.start();
		this.pEmitter2.start();
	} else {
		this.pEmitter1.stop();
		this.pEmitter2.stop();
	}
};

// ----------------------------------------------------------------------------

function GUIScoreDisplay() {
	this.txt = new Text();
	this.txt.set("0", "ScoreDisplayFont");
}

GUIScoreDisplay.prototype.onScoreSet = function (s) {
	this.txt.set(s, "ScoreDisplayFont");
};

GUIScoreDisplay.prototype.draw = function (render, x, y) {
	this.txt.draw(render, x, y);
};

// ----------------------------------------------------------------------------

function IdolInfo(it, gt, ht, mt) {
	this.it = it;
	this.gt = gt;
	this.ht = ht;
	this.mt = mt;
}

// ----------------------------------------------------------------------------

function IdolEntry() {
	//IdolEntry() : metalType(kMetalGold), gemType(kGemYellow), healthType(kGemYellow), idolType(IdolType.kIdolKindle), emoteType(EmotionType.kEmoteNormal), timeLeft(0), priority(0), showHP(false) { }

	this.metalType = null; //{Object}
	this.gemType = null; //{Object}
	this.healthType = null; //{Object}
	this.idolType = null; //{Object}
	this.emoteType = null; //{Object}
	this.timeLeft = 0; //{Number}
	this.priority = 0; //{Number}
	this.cue = null; //{String}
	this.title = null; //{String}
	this.showHP = false; //{Boolean}
}

// ----------------------------------------------------------------------------

function GUITextBubble(left, wWidth) {
	this.left = left;
	this.wrapWidth = wWidth;
	this.frame = null;
	this.text = new Text();
	this.titleText = new Text();
	this.open = false;

	this.titleX = 17;
	this.titleY = 6;

	this.xminOff = 12;
	this.xmaxOff = 90;
	this.yminOff = 30;
	this.ymaxOff = 65;

	var source = left ? "TextBubbleLeft" : "TextBubbleRight";

	var dep = ResourceDepot.getInstance();
	var x0 = dep.getImage(source, "topleft").textureWidth;
	var y0 = dep.getImage(source, "topleft").textureHeight;
	var x1 = x0 + dep.getImage(source, "top").textureWidth;
	var y1 = y0 + dep.getImage(source, "left").textureHeight;

	this.frame = new ResizableFrame(source, new Rectf(x0, y0, x1, y1));

	this.xminOff -= x0;
	this.xmaxOff -= x1;
	this.safeX = -this.xminOff + this.xmaxOff;

	this.yminOff -= y0;
	this.ymaxOff -= y1;
	this.safeY = -this.yminOff + this.ymaxOff;

	this.openSound = dep.getSFX("de_bubble");
}

GUITextBubble.prototype = {};
GUITextBubble.prototype.constructor = GUITextBubble;

GUITextBubble.prototype.open = function(txt, title, timeTC) {
	this.text.set(txt, "BubbleTextFont", this.wrapWidth);
	var r = this.text.getRect();

	this.titleText.set(title, "BubbleTitleFont");
	var titleRect = this.titleText.getRect();

	this.frame.setInteriorSize((r.width > titleRect.width ? r.width : titleRect.width) - this.safeX,
			r.height - this.safeY);
	var interior = this.frame.getInteriorArea();
	interior.x0 += this.xminOff;
	interior.x1 += this.xmaxOff;
	interior.y0 += this.yminOff;
	interior.y1 += this.ymaxOff;

	this.textX = interior.x0 + (interior.width - r.width) / 2;
	this.textY = interior.y0 + (interior.height - r.height) / 2;

	if (!this.open) {
		app.audio.playFX(this.openSound);
		this.open = true;
	}
	this.timeToClose = timeTC;
};

GUITextBubble.prototype.close = function() {
	this.open = false;
};

GUITextBubble.prototype.draw = function(render, x, y) {
	if (!this.open) return;
	var offsetX = this.left ? 0 : -this.frame.textureWidth;
	var offsetY = -this.frame.textureHeight;

	this.frame.draw(render, offsetX + x, offsetY + y);
	this.text.draw(render, offsetX + x + this.textX, offsetY + y + this.textY);
	this.titleText.draw(render, offsetX + x + this.titleX, offsetY + y + this.titleY);
};

GUITextBubble.prototype.update = function(dt) {
	if (this.open) {
		this.timeToClose -= dt;
		this.open = this.timeToClose > 0;
	}
};

GUITextBubble.prototype.isOpen = function() {
	return this.open;
};

// ----------------------------------------------------------------------------

function GUITransitionClock(parent, id, img) {
	GUIComponent.call(this, parent, id);
	this.image = img;
	this.val = 0.99;
	this.tint = null;

	this.vertices = [];
}

GUITransitionClock.prototype = new GUIComponent();
GUITransitionClock.prototype.constructor = GUITransitionClock;

GUITransitionClock.prototype.draw = function(render, base, tint) {
	base = base === undefined ? new Point2(0, 0) : base;
	tint = tint === undefined ? new Pixel32(0, 0, 0, 0) : tint;

	if (this.image == null || this.val == 0) return;

	var angle = this.val * 2 * Math.PI;
	var width = this.image.textureWidth;
	var height = this.image.textureHeight;

	var pos = this.getPosition().addNew(base).sub(new Point2(width / 2, height / 2));

	var numVerts = this.getClockFan(width, height, Math.PI / 2, Math.PI / 2 + angle);

	for (var i = 0; i < numVerts - 2; i++) {
		var xy = [];
		xy[0] = pos.x + this.vertices[0].x;
		xy[1] = pos.y + this.vertices[0].y;
		xy[2] = pos.x + this.vertices[i + 1].x;
		xy[3] = pos.y + this.vertices[i + 1].y;
		xy[4] = pos.x + this.vertices[i + 2].x;
		xy[5] = pos.y + this.vertices[i + 2].y;

		var uv = [];
		uv[0] = this.vertices[0].u;
		uv[1] = this.vertices[0].v;

		uv[2] = this.vertices[i + 1].u;
		uv[3] = this.vertices[i + 1].v;

		uv[4] = this.vertices[i + 2].u;
		uv[5] = this.vertices[i + 2].v;

		render.drawTriangleImage(this.image, xy, uv, tint);
	}
};

GUITransitionClock.prototype.getTypeMinSize = function() {
	if (this.image)
		return new Size2(this.image.textureWidth, this.image.textureHeight);
	return new Size2(0, 0);
};

GUITransitionClock.prototype.getClockFan = function(width, height, start, end) {
	var halfWidth = width / 2;
	var halfHeight = height / 2;
	var alpha = Math.atan(halfHeight / halfWidth);
	var angles = [ alpha, Math.PI - alpha, Math.PI + alpha, Math.PI * 2 - alpha ];
	var corners = [
		[ width, 0, 1, 0 ],
		[ 0, 0, 0, 0 ],
		[ 0, height, 0, 1 ],
		[ width, height, 1, 1 ]
	];
	var perpDists = [ halfWidth, halfHeight, halfWidth, halfHeight ];
	var normals = [new Vec2(-1, 0), new Vec2(0, -1), new Vec2(1, 0), new Vec2(0, 1) ];

	this.start = this.start % (Math.PI * 2);
	this.end = this.end % (Math.PI * 2);

	var startVec = new Vec2(Math.cos(start), Math.sin(start));
	var endVec = new Vec2(Math.cos(end), Math.sin(end));

	var index = 0;
	for (; angles[index] < start && index < 4; index++);
	index = index % 4;

	var currVert = 0;

	// The fan always starts at the middle of the screen.
	this.vertices[currVert++] = new Vertex(halfWidth, halfHeight, 0.5, 0.5);

	// Get the start intersection point.
	var rayDotNorm = normals[index].Dot(startVec);
	var perpDist = perpDists[index];
	var rayLen = -(perpDist / rayDotNorm);
	this.vertices[currVert++] = new Vertex(halfWidth + rayLen * startVec.x, halfHeight - rayLen * startVec.y, 0.5 + rayLen * startVec.x / width, 0.5 - rayLen * startVec.y / height);

	// Add a vertex for each corner of the rectangle we should sweep over.
	// Treat the case when we cross 0 separately
	if (end < start) {
		var cnt = 0;
		for (; angles[index] > end && cnt < 3; cnt++,index = (index + 1) % 4)
			this.vertices[currVert++] = new Vertex(corners[index][0], corners[index][1], corners[index][2], corners[index][3]);
	}
	else
		for (; angles[index] < end && index < 4; index++)
			this.vertices[currVert++] = new Vertex(corners[index][0], corners[index][1], corners[index][2], corners[index][3]);

	// Add the end intersection point.
	rayDotNorm = normals[index % 4].Dot(endVec);
	perpDist = perpDists[index % 4];
	rayLen = -(perpDist / rayDotNorm);
	this.vertices[currVert++] = new Vertex(halfWidth + rayLen * endVec.x, halfHeight - rayLen * endVec.y, 0.5 + rayLen * endVec.x / width, 0.5 - rayLen * endVec.y / height);

	// Return the number of this.vertices we've added.
	return currVert;
};

GUITransitionClock.prototype.setVal = function(v) {
	this.val = v;
};

GUITransitionClock.prototype.setTint = function(t) {
	this.tint = t;
};

function Vertex(x, y, u, v) {
	this.x = x;
	this.y = y;
	this.u = u;
	this.v = v;
}

// ----------------------------------------------------------------------------

function Text() {
	this.canvas = null;
}

Text.prototype.constructor = Text;
Text.prototype.set = function(text, font, width) {
	this.canvas = ResourceDepot.getInstance().getFont(font).generateCanvas(text, width);
};

Text.prototype.getRect = function() {
	return new Rectf(0, 0, this.canvas.width, this.canvas.height);
};

Text.prototype.draw = function(render, x, y) {
	if (this.canvas != null)
		render.drawText(this.canvas, x, y, 1);
};

// ----------------------------------------------------------------------------

function GUIObjectiveDisplay() {
	this.objectives = {};

	this.numCompleted = 0;
	this.numObjectives = 0;
	this.arrowParam = 0;
	this.display = true;

	var dep = ResourceDepot.getInstance();
	var kHouseDisplay = "house_display";
	this.frame = dep.getImage(kHouseDisplay, "frame");
	this.house = dep.getImage(kHouseDisplay, "house");
	this.mortar = dep.getImage(kHouseDisplay, "mortar");
	this.wick = dep.getImage(kHouseDisplay, "wick");
	this.arrow = dep.getImage("objective_arrows", "arrow", true);

	this.text = new Text();
	this.text.set("0/0", "ObjectiveDisplayFont");
}

GUIObjectiveDisplay.prototype.constructor = GUIObjectiveDisplay;

GUIObjectiveDisplay.prototype.draw = function(render, x, y) {
	if (this.display) {
		render.drawImage(this.frame, x, y, 0);
		if (this.numCompleted == this.numObjectives) {
			render.drawImage(this.wick, x + 10, y);
			render.drawImage(this.arrow, x + 43 + Math.sin(this.arrowParam) * 5, y + 8);
		} else if (this.numObjectives != 0) {
			render.drawImage(this.house, x + 9, y + 2);
			this.text.draw(render, x + 47, y + 16);
		}
	}
};

GUIObjectiveDisplay.prototype.update = function(dt) {
	if (this.numCompleted == this.numObjectives)
		this.arrowParam += dt * Math.PI * 2;
};

GUIObjectiveDisplay.prototype.hide = function(h) {
	this.display = !h;
	this.countCompleted();
};

GUIObjectiveDisplay.prototype.countCompleted = function() {
	this.numCompleted = 0;
	this.numObjectives = 0;

	for (var k in this.objectives) {
		if (this.objectives.hasOwnProperty(k)) {
			this.numObjectives++;
			if (this.objectives[k]) this.numCompleted++;
		}
	}

	this.text.set(this.numCompleted + "/" + this.numObjectives, "ObjectiveDisplayFont");

	if (this.numObjectives == this.numCompleted && false)
		app.game.dialogueTrigger("objective");  // todo
};

GUIObjectiveDisplay.prototype.onObjectiveAdded = function(obj) {
	this.objectives[obj.objId] = false;
	this.countCompleted();
};

GUIObjectiveDisplay.prototype.onObjectiveRemoved = function(obj) {
	delete this.objectives[obj.objId];
};
GUIObjectiveDisplay.prototype.onObjectiveCompleted = function(obj) {
	this.objectives[obj.objId] = true;
	this.countCompleted();
};

// ----------------------------------------------------------------------------

function GUIObjectiveArrow() {
	this.displayArrow = false;
	this.targetPoint = new Point2(0, 0);
	this.arrowTintParam = 0;
	this.arrowAnimateParam = 0;
	this.arrowLeft = ResourceDepot.getInstance().getImage("objective_arrows", "arrow", true);
	this.arrowRight = ResourceDepot.getInstance().getImage("objective_arrows", "arrow_mirrored", true);
}

GUIObjectiveArrow.prototype.constructor = GUIObjectiveArrow;

GUIObjectiveArrow.prototype.draw = function(render, x, y) {
	if (!this.displayArrow) return;

	var fWidth = render.getWidth();
	var fHeight = render.getHeight();
	var aWidth = this.arrowLeft.textureWidth;
	var aHeight = this.arrowLeft.textureHeight;
	var ratioW2H = fHeight / fWidth;
	var wOffset = 100;
	var hOffset = 100 * ratioW2H;

	var screen = render.getSafeRect().copy();
	var inner = screen.copy();
	inner.expand(-aWidth / 2 - wOffset, -aHeight / 2 - hOffset);
	var screenPoint = this.targetPoint.addNew(app.game.getCameraPos());
	var tint = Math.floor((Math.sin(this.arrowTintParam) + 1) * 64);

	if (inner.contains(screenPoint.x, screenPoint.y)) {
		render.drawImage(this.arrowLeft, screenPoint.x, screenPoint.y - aHeight / 2 - Math.sin(this.arrowAnimateParam) * 5 + 5, -Math.PI / 2, true, 1, new Pixel32(230, 230, 115, tint));
	} else {
		var offset = new Vec2(screenPoint.x, screenPoint.y).sub(screen.center());
		var targetLine = new LineSegment2(screen.center(), screen.center().addNew(offset.mul(1000)));
		var offsetLen = offset.Magnitude();
		var xOverY = screen.width / screen.height;
		var leftOrRight = Math.abs(offset.x / offset.y) > xOverY;
		var angle;
		var p;
		if (leftOrRight) {
			if (offset.x < 0) { // left
				angle = -Math.asin(offset.y / offsetLen);
				p = IntersectLineSegments(new LineSegment2(new Point2(screen.x0 + wOffset, 0 - 100), new Point2(screen.x0 + wOffset, fHeight + 100)), targetLine);
			} else { // right
				angle = -Math.PI + Math.asin(offset.y / offsetLen);
				p = IntersectLineSegments(new LineSegment2(new Point2(screen.x1 - wOffset, 0 - 100), new Point2(screen.x1 - wOffset, fHeight + 100)), targetLine);
			}
		} else {
			if (offset.y < 0) { // top
				angle = Math.PI - Math.acos(offset.x / offsetLen);
				p = IntersectLineSegments(new LineSegment2(new Point2(0 - 100, screen.y0 + hOffset), new Point2(fWidth + 100, screen.y0 + hOffset)), targetLine);
			} else { // bottom
				angle = Math.PI + Math.acos(offset.x / offsetLen);
				p = IntersectLineSegments(new LineSegment2(new Point2(0 - 100, screen.y1 - hOffset), new Point2(fWidth + 100, screen.y1 - hOffset)), targetLine);
			}
		}

		if(p != null) p = p.intersectionPoint;
		else p = new Vec2(0,0);

		var sOff = p.sub(new Vec2(fWidth / 2, fHeight / 2));
		var sMag = sOff.Magnitude();
		sOff.Normalize();
		p = new Vec2(fWidth / 2, fHeight / 2).add(sOff.mul(sMag - aWidth / 2));

		angle = (angle + Math.PI * 2) % (Math.PI * 2);
		var img = this.arrowLeft;
		if (!(Math.PI / 2 >= angle || angle >= Math.PI * 2 * 0.75)) {
			img = this.arrowRight;
			angle += Math.PI;
		}
		render.drawImage(img, p.x, p.y, angle, 1, true, new Pixel32(230, 230, 115, tint));
	}
};

GUIObjectiveArrow.prototype.update = function(dt) {
	if (this.displayArrow){
		this.arrowTintParam += dt * Math.PI * 3;
		this.arrowAnimateParam += dt * Math.PI * 2;
	}
};

GUIObjectiveArrow.prototype.showTargetArrow = function(tgt) {
	this.displayArrow = true
	this.targetPoint = tgt;
};


GUIObjectiveArrow.prototype.hideTargetArrow = function() {
	this.displayArrow = false;
};
