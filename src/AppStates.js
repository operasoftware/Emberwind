/**
 * Fades the screen from one color to another.
 *
 * @param {Number} maxT the maximum time that the transition should take.
 * @param {Pixel32} from starting color.
 * @param {Pixel32} to ending color.
 * @returns {ScreenTransitionFade}
 */
function ScreenTransitionFade(maxT, from, to) {
	this.maxT = maxT;
	this.from = from;
	this.to = to;

	this.time = 0;
	this.isDone = false;
}

ScreenTransitionFade.prototype = {};
ScreenTransitionFade.constructor = ScreenTransitionFade;

ScreenTransitionFade.prototype.update = function(dt) {
	this.t = Math.min(this.t + dt, this.maxT);
};

ScreenTransitionFade.prototype.draw = function(render) {
	this.isDone = this.t == this.maxT;

	var color = new Pixel32(lerp(this.from.r, this.to.r, this.t / this.maxT),
			lerp(this.from.g, this.to.g, this.t / this.maxT),
			lerp(this.from.b, this.to.b, this.t / this.maxT),
			lerp(this.from.a, this.to.a, this.t / this.maxT));
	if (color.a > 0) {
		render.drawFillScreen(color);
	}
};

ScreenTransitionFade.prototype.reset = function() {
	this.t = 0;
	this.isDone = false;
};

// ---------------------------------------------------------------------------

/**
 * Fades the music from 0 to 100% user set volume.
 */
function AudioTransition(length) {
	this.length = length;
	this.t = 0;
}

AudioTransition.prototype.reset = function() {
	this.t = 0;
};

AudioTransition.prototype.end = function() {
	app.audio.setMusicVolume(1);
};

AudioTransition.prototype.update = function(dt, out) {
	this.t += dt;
	var value = out ? Math.max(0, (this.length - this.t) / this.length) : Math.min(1, this.t / this.length);
	app.audio.setMusicVolume(value);
};

// ---------------------------------------------------------------------------

/**
 * State that shows the developer splash screen.
 *
 * @returns {DeveloperSplashState}
 */
function DeveloperSplashState() {
	this.skip = false;

	BaseState.apply(this, arguments);
}

DeveloperSplashState.prototype = new BaseState();
DeveloperSplashState.constructor = DeveloperSplashState;

DeveloperSplashState.prototype.enter = function(msg, fromState) {
	this.host.canvas.onmousedown = createCallback(function(e) {
		e.preventDefault();
		this.skip = true;
		this.host.input = new InputHandler(this.host.canvas, false);
	}, this);
	window.onkeydown = this.host.canvas.onmousedown;

	this.host.canvas.ontouchstart = createCallback(function(e) {
		e.preventDefault();
		this.skip = true;
		this.host.input = new InputHandler(this.host.canvas, true);
		// Some units seem to send both touch and mousedown events, prevent
		// the input system to be overwritten..
		this.host.canvas.onmousedown = undefined;
	}, this);


	var res = ResourceDepot.getInstance();
	this.animation = res.getAnimation("TimeTrap");
	this.splashSound = res.getSFX("timetrap_sound");

	this.timeInState = 0;

	// this.host.preload();
};

DeveloperSplashState.prototype.update = function(dt) {
	dt = Math.min(dt, 1 / 15);
	this.animation.update(dt);
	if (this.timeInState < 0.5 && this.timeInState + dt > 0.5) {
		this.animation.play(false);
		this.soundID = this.host.audio.playFX(this.splashSound);
	}
	this.timeInState += dt;

};

DeveloperSplashState.prototype.leave = function () {
	this.host.audio.stopSound(this.soundID);
};

DeveloperSplashState.prototype.transition = function() {
	return this.host.tryChangeState(this.timeInState > 5 || this.skip, fsmStates.kNextState, "stage0");
};

DeveloperSplashState.prototype.draw = function(render) {
	render.clear(render.white);
	if (this.timeInState > 0.5) {
		this.animation.draw(render, render.getWidth() / 2, render.getHeight() / 2, 0, 1, null);
	}
};

// ---------------------------------------------------------------------------

/**
 * State when a stage is loading.
 */
function LoadingStageState() {
	this.t = 0;
	this.delayAfter = 1;
	this.delayBefore = 0.1;
	this.doneT = null;
	this.progress = 0;

	this.font = null;
	this.progressText = null;
	this.lastProgress = -1;

	BaseState.apply(this, arguments);
}

LoadingStageState.prototype = new BaseState();
LoadingStageState.constructor = LoadingStageState;

LoadingStageState.prototype.enter = function(msg, fromState) {
	this.doneT = null;
	this.t = 0;
	this.progress = 0;

	this.stage = msg;

	this.font = ResourceDepot.getInstance().getFont("BannerFont");

	this.host.game.loadStage(msg, createCallback(this.progressCallback, this));
};

LoadingStageState.prototype.progressCallback = function(status) {
	this.progress = status;

	if (status >= 1) {
		if (this.t <= this.delayBefore) {
			this.doneT = 0;
		} else {
			this.doneT = this.t + this.delayAfter;
		}
	}
};

LoadingStageState.prototype.update = function(dt) {
	this.t += dt;
};

LoadingStageState.prototype.transition = function() {
	return this.host.tryChangeState(this.doneT != null && this.t >= this.doneT, appStates.kStateInGame);
};

LoadingStageState.prototype.draw = function(render) {
	render.clear(render.black);

	if (this.lastProgress != this.progress) {
		this.progressText = this.font.generateCanvas(Math.ceil(this.progress * 100) + " %");
		this.lastProgress = this.progress;
	}

	var alpha = Math.min(1, Math.max(0, this.t * 2 - this.delayBefore));

	render.drawText(this.progressText, (render.getWidth() - this.progressText.width) / 2,
			render.getHeight() / 2 - this.progressText.height / 2, alpha);
};

// ---------------------------------------------------------------------------

/**
 * In game state, when the player is playing a stage.
 *
 * @returns {InGameState}
 */
function InGameState() {
	this.restartDelay = 0;
	this.stageDisplayDelay = 0;

	this.stageNameDisplayAnim = null;
	this.stageDisplayBannerR = null;
	this.stageDisplayBannerC = null;
	this.bannerSound = null;
	this.defeatSound = null;
	this.victorySound = null;

	this.stageNameDisplayXPos = 0;

	this.areaNameText = "";
	this.stageNameText = "";

	this.backReleased = false;
	this.playBannerSound = false;
	this.playInGameTrack = false;

	this.controlImage = null;
	this.canvasImage = null;
	this.canvasDisabledImage = null;
	this.webglImage = null;

	this.controlPressedTint = new Pixel32(0, 0, 0, 128);
	this.dpadImage = null;
	this.dpadStickImage = null;
	this.deadZoneDpad = 20;
	this.dpadRect = null;
	this.dpadRectInner = null;
	this.dpadDistance = 128;
	this.dpadInnerDistance = 10;

	this.interactImage = null;

	BaseState.apply(this, arguments);
}

InGameState.prototype = new BaseState();
InGameState.constructor = InGameState;

InGameState.prototype.enter = function(msg, fromState) {
	this.timeSinceRenderSwap = 0;
	this.dimTimeLeft = 0;
	this.playBannerSound = false;
	this.playInGameTrack = false;

	var dep = ResourceDepot.getInstance();
	this.gremlinFont = dep.getFont("StartTextFont");

	this.restartDelay = 0;
	this.stageDisplayDelay = 0;
	this.stageDisplayBannerR = null;
	this.stageDisplayBannerC = null;

	this.controlImage = dep.getImage("ControlsiPhoneEscape", "default");
	this.canvasImage = dep.getImage("btn_canvas", "btn_canvas");
	this.canvasDisabledImage = dep.getImage("btn_canvas_disabled", "btn_canvas_disabled");
	this.webglImage = dep.getImage("btn_webgl", "btn_webgl");

	this.defeatSound = ResourceDepot.getInstance().getMusic("defeat");
	this.victorySound = ResourceDepot.getInstance().getMusic("victory");

	// Todo: Add the extra states checks.

	if (fromState == appStates.kStateLoadingStage && this.host.skipToStage === null) {
		this.stageDisplayDelay = 4.25;
		this.stageNameDisplayXPos = -50.0;
		this.bannerSound = dep.getSFX("stage_banner");
		this.stageNameDisplayAnim = dep.getAnimation("WickFlyRight");
		this.stageNameDisplayAnim.play();

		this.stageDisplayBannerR = dep.getImage("StageBanner", "RightPiece");
		this.stageDisplayBannerC = dep.getImage("StageBanner", "CentrePiece");

		var font = dep.getFont("BannerFont");

		var stagename = app.game.currentStage.name;

		this.areaNameText = font.generateCanvas(dep.getString("STR_AREA_" + (stagename != "stage0" ? "OUTER" : "ELDER")));
		var text = dep.getString("STR_STAGE_" + stagename.substring(5));
		this.stageNameText = font.generateCanvas(text);

		this.playBannerSound = true;
	}

	this.playInGameTrack = true;

	if (this.host.useTouch) {
		this.dpadImage = dep.getImage("ControlsiPhoneDpad", "default");
		this.dpadStickImage = dep.getImage("ControlsiPhoneStick", "default");

		this.attackImage = dep.getImage("ControlsiPhoneButtonA", "default");
		this.jumpImage = dep.getImage("ControlsiPhoneButtonY", "default");
		this.interactImage = dep.getImage("ControlsiPhoneButtonX", "default");

		var screenW = this.host.render.getWidth();
		var screenH = this.host.render.getHeight();


		var x = 18 + 64;
		var y = screenH / 2;

		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 0, Buttons.down);
		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 180, Buttons.up);
		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 90, Buttons.left);
		GameInput.instance.addGUIIsoscelesTriangle(x, y, this.dpadInnerDistance, this.dpadDistance, 100, 270, Buttons.right);

		this.dpadRect = new Rectf(x - this.dpadDistance, y - this.dpadDistance, x + this.dpadDistance, y + this.dpadDistance);
		this.dpadRectInner = new Rectf(x - this.dpadInnerDistance, y - this.dpadInnerDistance, x + this.dpadInnerDistance, y + this.dpadInnerDistance);

		GameInput.instance.addGUICircle(screenW - 50, screenH / 2, 32, Buttons.attack);
		GameInput.instance.addGUICircle(screenW - 50, screenH / 2 + 74, 32, Buttons.jump);
		GameInput.instance.addGUICircle(screenW - 50, screenH / 2 - 74, 32, Buttons.interact);
	}

	this.host.game.updateCamera(0.01);
};

InGameState.prototype.leave = function() {
};

InGameState.prototype.update = function(dt) {
	if (this.playBannerSound) {
		this.playBannerSound = false;
		app.audio.playFX(this.bannerSound);
	}

	if (this.playInGameTrack) {
		this.playInGameTrack = false;
		this.startInGameTrack();
	}

	var game = this.host.game;

	if (this.stageDisplayDelay > 0) {
		this.stageDisplayDelay -= dt;
		this.stageNameDisplayAnim.update(dt);
		this.stageNameDisplayXPos += dt * 800;
		game.updateCamera(dt);
		//Todo: add update background?
	} else {
		game.update(dt);

		var focus = app.game.focus;
		if (focus && !focus.isAlive()) {
			if (this.restartDelay === 0) {
				app.audio.playMusic(this.defeatSound);
			}

			this.restartDelay += dt;
			if (this.restartDelay > 3) {
				this.restartDelay = 0;
				var msg = {
					id: App.Messages.kYesNoDialogMsg,
					question: ResourceDepot.getInstance().getString("STR_RETRY_OR_QUIT"),
					yes: ResourceDepot.getInstance().getString("STR_RETRY"),
					no: ResourceDepot.getInstance().getString("STR_EXIT_TO_MENU")
				};
				this.host.setState(appStates.kStateYesNoDialog, msg, true);
			}
		}

		// Todo: Add focus object stuff
	}

	var inp = InputHandler.instance;
	if (GameInput.instance.held(Buttons.esc) || (inp.clickInCircle(50, 50, 32)) && app.useTouch) {
		this.host.setState(appStates.kStateMainMenu);
	}
	if (!this.host.webGLFailed && (GameInput.instance.pressed(Buttons.render) || inp.clickInCircle(50, (this.host.useTouch ? 50 + 74 : 50), 32)) && this.timeSinceRenderSwap > 1) {
		this.host.createRender(this.host.render instanceof RenderCanvas);
		this.timeSinceRenderSwap = 0;
	}
	this.timeSinceRenderSwap += dt;
};

InGameState.prototype.draw = function(render) {
	if (!render.frontToBack) this.host.game.draw(render);

	if (this.stageDisplayDelay > 0) {
		this.bannerAlpha = 1;
		this.textAlpha = 1;

		if (this.stageDisplayDelay < 1) {
			this.bannerAlpha = Math.max(0, this.stageDisplayDelay);
			this.textAlpha = Math.max(0, this.stageDisplayDelay);
		} else if (this.stageDisplayDelay < 3) {

		} else if (this.stageDisplayDelay < 3.5) {
			this.textAlpha = (3.5 - this.stageDisplayDelay) * 2;
		} else {
			this.textAlpha = 0;
		}

		var tmpPos = Math.min(render.getWidth(), Math.floor(this.stageNameDisplayXPos) - this.stageDisplayBannerR.textureWidth);
		render.drawImage(this.stageDisplayBannerR, tmpPos, 200, 0, false, this.bannerAlpha, null, false);

		while (tmpPos > 0) {
			tmpPos -= this.stageDisplayBannerC.textureWidth;
			render.drawImage(this.stageDisplayBannerC, tmpPos, 200, 0, false, this.bannerAlpha, null, false);
		}

		if (this.textAlpha) {
			render.drawText(this.areaNameText, (render.getWidth() - this.areaNameText.width) / 2, 220, this.textAlpha);
			render.drawText(this.stageNameText, (render.getWidth() - this.stageNameText.width) / 2, 270, this.textAlpha);
		}

		this.stageNameDisplayAnim.draw(render, this.stageNameDisplayXPos - 25, 255);
	}

	var controlsAlpha = 1;
	if (this.stageDisplayDelay > 0)
		controlsAlpha = Math.max(0, 1 - this.stageDisplayDelay);

	if (this.host.useTouch) {
		render.drawImage(this.controlImage, 50, 50, 0, true, controlsAlpha, null, false);

		var input = InputHandler.instance;

		var screenW = render.getWidth();
		var screenH = render.getHeight();
		var x = 18 + 64;
		var y = screenH / 2;
		render.drawImage(this.dpadImage, x, y, 0, true, controlsAlpha, null, false);
		var noTouch = true;
		for (var k in input.touches) {
			if (input.touches.hasOwnProperty(k)) {
				var touch = input.touches[k];
				if (this.dpadRect.contains(touch.x, touch.y) && !this.dpadRectInner.contains(touch.x, touch.y)) {
					if (Math.pow(x - touch.x, 2) + Math.pow(y - touch.y, 2) < Math.pow(64, 2)) {
						render.drawImage(this.dpadStickImage, touch.x, touch.y, 0, true, controlsAlpha, null, false);
					} else {
						var angle = Math.atan2(touch.y - y, touch.x - x);
						render.drawImage(this.dpadStickImage, Math.cos(angle) * 64 + x, Math.sin(angle) * 64 + y, 0, true, controlsAlpha, null, false);
					}
					noTouch = false;
					break;
				}
			}
		}
		if (noTouch) {
			render.drawImage(this.dpadStickImage, x, y, 0, true, controlsAlpha, null, false);
		}

		render.drawImage(this.attackImage, screenW - 50, screenH / 2, 0, true, controlsAlpha, null, false);
		render.drawImage(this.jumpImage, screenW - 50, screenH / 2 + 74, 0, true, controlsAlpha, null, false);
		if (this.host.game.focus.hasInteractTarget())
			render.drawImage(this.interactImage, screenW - 50, screenH / 2 - 74, 0, true, controlsAlpha, null, false);
	}

	var renderImage;
	if (this.host.webGLFailed) {
		renderImage = this.canvasDisabledImage;
	} else {
		renderImage = render instanceof RenderCanvas ? this.canvasImage : this.webglImage;
	}
	render.drawImage(renderImage, 50, (this.host.useTouch ? 50 + 74 : 50), 0, true, controlsAlpha, null, false);

	if (render.frontToBack) this.host.game.draw(render);
};

InGameState.prototype.startInGameTrack = function () {
	if (this.host.game.currentStage.type === "siege") {
		var sName = this.host.game.currentStage.name;
		if (sName == "stage0" || sName == "stage1" || sName == "stage2" || sName == "stage3") {
			this.host.audio.playMusic(ResourceDepot.getInstance().getMusic("outer_grendale"));
		}
		// Should be more stuff here I guess, but since we only include the
		// first stages, there's no point in going any further..
		else {
			this.host.audio.playMusic(ResourceDepot.getInstance().getMusic("outer_grendale"));
		}
	}
};

InGameState.prototype.resume = function (msg, fromState) {
	if (fromState == appStates.kStateYesNoDialog) this.startInGameTrack();
	this.restartDelay = 0;
};

// ---------------------------------------------------------------------------

function MainMenuState() {
	this.timeInactive = null;
	this.titleImgs = [];
	this.titleLeftImgs = [];
	this.titleRightImgs = [];
	this.wickEyes = [];
	this.kindleEyes = [];
	this.copyright = null;

	this.guiBox = null;

	this.buttonPressed = -1;
	this.cloudXPos = 0;
	this.fogXPos = 0;

	this.acceptSound = null; // todo
	this.declineSound = null; // todo
	this.refuseSound = null; // todo
	this.selectSound = null; // todo
	this.enterSound = null; // todo

	this.nextWickBlink = 0;
	this.wickBlinkLeft = 0;
	this.nextWickLook = 0;
	this.wickLookLeft = 0;
	this.wickLookType = 0;
	this.nextKindleBlink = 0;
	this.kindleBlinkLeft = 0;
	this.lastMusicPos = null;

	this.doStartScreen = true; // temp
	this.timeIntoStartScreen = 0;
	this.titleParam = 0;
	this.pressStartText = null;
	this.pressStartFlash = 0;
	this.timeInSinceStartScreen = 0;

	BaseState.apply(this, arguments);
}

MainMenuState.prototype = new BaseState();
MainMenuState.constructor = MainMenuState;

MainMenuState.prototype.enter = function(msg, fromState) {
	if (this.doStartScreen) {
		this.host.canvas.onmousedown = createCallback(function(e) {
			e.preventDefault();
			this.timeInactive = 0;
			this.doStartScreen = true;
			this.timeIntoStartScreen = 0.01;
			this.host.useTouch = false;
			this.host.input = new InputHandler(this.host.canvas, false);
			this.host.canvas.ontouchstart = undefined;
		}, this);
		window.onkeydown = this.host.canvas.onmousedown;

		this.host.canvas.ontouchstart = createCallback(function(e) {
			e.preventDefault();
			this.timeInactive = 0;
			this.doStartScreen = true;
			this.timeIntoStartScreen = 0.01;
			this.host.useTouch = true;
			this.host.input = new InputHandler(this.host.canvas, true);
			// Some units seem to send both touch and mousedown events, prevent
			// the input system to be overwritten..
			this.host.canvas.onmousedown = undefined;
		}, this);
	}

	this.timeInSinceStartScreen = 999;
	this.timeInactive = 0;
	this.lastMusicPos = 0;

	this.buttonPressed = -1;
	var dep = ResourceDepot.getInstance();
	this.titleImgs[0] = dep.getImage("Titlescreen0", "default");
	this.titleImgs[1] = dep.getImage("Titlescreen1", "default");
	this.titleImgs[2] = dep.getImage("Titlescreen2", "default");
	this.titleImgs[3] = dep.getImage("Titlescreen3", "default");
	this.titleImgs[4] = dep.getImage("Titlescreen4", "default");
	this.titleImgs[5] = dep.getImage("TitlescreenLogo", "default");

	this.wickEyes[0] = dep.getImage("TitlescreenWickEyes", "eyes0");
	this.wickEyes[1] = dep.getImage("TitlescreenWickEyes", "eyes1");
	this.wickEyes[2] = dep.getImage("TitlescreenWickEyes", "eyes2");
	this.wickEyes[3] = dep.getImage("TitlescreenWickEyes", "eyes3");

	this.kindleEyes = dep.getImage("TitlescreenKindleEyes", "default");

	this.copyright = dep.getImage("copyright", "copyright", true);

	this.wickBlinkLeft = 0;
	this.nextWickBlink = randomRange(4, 6);
	this.wickLookLeft = 0;
	this.nextWickLook = randomRange(4, 6);
	this.wickLookType = 1;

	this.nextKindleBlink = randomRange(4, 6);
	this.kindleBlinkLeft = 0;

	this.cloudXPos = 0;
	this.fogXPos = 0;

	var startStage = function(event, num) {
		if (GUIButton.eventTypes.onButtonPressed == event) {
			app.setState(appStates.kStateLoadingStage, "stage" + num);
		}
	};

	this.guiBox = new GUIBox();

	if (this.host.game.stagesFinished == -1) {
		var button = GUITextButton.getStandardButton(null, null, dep.getString("STR_START"), "MenuButtonFont", function(e) {
			if (GUIButton.eventTypes.onButtonPressed == e) {
				app.setState(appStates.kStoryBoardState);
			}
		});
		this.guiBox.addButton(button);
	} else {
		var callbacks = [function(e) {
			startStage(e, 0);
		},function(e) {
			startStage(e, 1);
		},function(e) {
			startStage(e, 2);
		}];
		for (var i = 0; i <= Math.min(2, this.host.game.stagesFinished); i++) {
			var text = dep.getString("STR_STAGE_" + i);
			var button = GUITextButton.getStandardButton(null, null, text, "MenuButtonFont", callbacks[i]);
			this.guiBox.addButton(button);
		}
	}

	this.font = dep.getFont("StartTextFont");
	this.pressStartText = this.font.generateCanvas("Click or touch the screen");

	this.backgroundMusic = dep.getMusic("main_theme");
	this.musicID = this.host.audio.playMusic(this.backgroundMusic, true);

};

MainMenuState.prototype.leave = function() {
	this.host.audio.stopSound(this.musicID);
};

MainMenuState.prototype.draw = function(render) {
	if (this.doStartScreen)
		this.drawStartScreenBackground(render);
	else {
		this.drawBackground(render);
		this.guiBox.draw(render);
	}
};

MainMenuState.prototype.drawStartScreenBackground = function(render) {
	var center = new Vec2(render.getWidth() / 2, render.getHeight() / 2);

	render.clear();
	render.drawImage(this.titleImgs[0], center.x, center.y, 0, true, 1, null, false);


	for (var i = 0; i < 3; i++)
		render.drawParticle(this.titleImgs[1], this.cloudXPos + this.titleImgs[1].textureWidth * 2 * i, this.titleImgs[1].textureHeight - 150, 0, 2, 2, 1, new Pixel32(255, 255, 255), false);


	var castleScale = 1.25;
	if (this.timeIntoStartScreen > 0.5)
		castleScale = 1.25 - 0.25 * Clamp(0, (this.timeIntoStartScreen - 0.5) / 2, 1);


	render.drawParticle(this.titleImgs[2], center.x, center.y, 0, castleScale, castleScale, 1, new Pixel32(0xff, 0xff, 0xff, 0x0), false);

	var fgScale = 5;
	if (this.timeIntoStartScreen > 0.5)
		fgScale = 5 - 4 * Clamp(0, (this.timeIntoStartScreen - 0.5) / 2, 1);

	render.drawParticle(this.titleImgs[4], center.x, center.y, 0, fgScale, fgScale, 1, new Pixel32(0xff, 0xff, 0xff, 0x0), false);


	var titlePos = center.y;
	if (this.timeIntoStartScreen > 2.5)
		titlePos = -(this.titleImgs[5].textureHeight / 2) + this.titleImgs[5].textureHeight * Clamp(0, (this.timeIntoStartScreen - 2.5) * 2, 1);
	else {
		var tp = Clamp(0, this.timeIntoStartScreen * 4, 1) * Math.PI / 2;
		titlePos = center.y - Math.sin(tp) * render.getHeight() * 2 / 3;
	}


	var offsetX = perlin.noise1(this.titleParam / 2) * 5;
	var offsetY = perlin.noise1(this.titleParam / 2 + 100) * 5;

	offsetY += 10; // Maybe

	render.drawParticle(this.titleImgs[5], center.x + offsetX, titlePos + offsetY, 0, 1, 1, 1, new Pixel32(0xff, 0xff, 0xff, 0xff), false);

	render.drawImage(this.copyright, center.x, render.getHeight() - this.copyright.textureHeight / 2 - 5, 0, true, 1, null, false);

	if (this.timeIntoStartScreen == 0) {
		var alpha = 0.5 + (1 + Math.sin(this.pressStartFlash)) / 4;
		render.drawText(this.pressStartText, center.x - this.pressStartText.width / 2, render.getHeight() * 2 / 3, alpha);
	}
};

MainMenuState.prototype.drawBackground = function(render) {
	var center = new Vec2(render.getWidth() / 2, render.getHeight() / 2);

	render.drawImage(this.titleImgs[0], center.x, center.y, 0, true, 1, null, false);

	for (var i = 0; i < 3; ++i)
		render.drawParticle(this.titleImgs[1], this.cloudXPos + this.titleImgs[1].textureWidth * 2 * i, this.titleImgs[1].textureHeight - 150, 0, 2, 2, 1, new Pixel32(255, 255, 255), false);

	render.drawImage(this.titleImgs[2], center.x, center.y, 0, true, 1, null, false);

	render.drawParticle(this.titleImgs[3], this.fogXPos + this.titleImgs[3].textureWidth * 5, 620, 0, 10, 10, Math.min(1, this.timeInSinceStartScreen), new Pixel32(255, 255, 255), false);


	if (this.titleImgs[3].textureWidth * 10 + this.fogXPos < render.getWidth())
		render.drawParticle(this.titleImgs[3], this.titleImgs[3].textureWidth * 15 + this.fogXPos, 620, 0, 10, 10, Math.min(1, this.timeInSinceStartScreen), new Pixel32(255, 255, 255), false);

	render.drawImage(this.titleImgs[4], center.x, center.y, 0, true, 1, null, false);

	var offsetX = perlin.noise1(this.titleParam / 2) * 5;
	var offsetY = perlin.noise1(this.titleParam / 2 + 100) * 5;


	offsetY += 10;

	render.drawParticle(this.titleImgs[5], center.x + offsetX, this.titleImgs[5].textureHeight / 2 + offsetY, 0, 1, 1, 1, new Pixel32(0xff, 0xff, 0xff, 0xff), false);

	render.drawImage(this.copyright, center.x, render.getHeight() - this.copyright.textureHeight / 2 - 5, 0, true, 1, null, false);

	var wx = center.x + 214;
	var wy = center.y - 49;
	if (this.wickBlinkLeft > 0)
		render.drawImage(this.wickEyes[0], wx, wy);
	else if (this.wickLookLeft > 0)
		render.drawImage(this.wickEyes[Math.floor(this.wickLookType)], wx, wy);

	var kx = center.x - 266;
	var ky = center.y + 108;
	if (this.kindleBlinkLeft > 0)
		render.drawImage(this.kindleEyes, kx, ky);
};

MainMenuState.prototype.update = function(dt) {
	this.titleParam += dt;
	this.pressStartFlash += dt;

	if (this.doStartScreen) {
		this.timeInSinceStartScreen = 0;
		if (this.timeIntoStartScreen > 0)
			this.timeIntoStartScreen += dt;

		if (this.timeIntoStartScreen > 3) {
			this.doStartScreen = false;
		}

		this.cloudXPos -= 24 * dt;
		if (this.cloudXPos < -this.titleImgs[1].textureWidth * 2)
			this.cloudXPos = -24 * dt;

		this.fogXPos -= 8 * dt;
		if (this.fogXPos < -this.titleImgs[3].textureWidth * 10)
			this.fogXPos = -8 * dt;
	} else {
		this.timeInSinceStartScreen += dt;
		this.timeInactive += dt;

		this.cloudXPos -= 24 * dt;
		if (this.cloudXPos < -this.titleImgs[1].textureWidth * 2)
			this.cloudXPos = -24 * dt;

		this.fogXPos -= 8 * dt;
		if (this.fogXPos < -this.titleImgs[3].textureWidth * 10)
			this.fogXPos = -8 * dt;

		this.updateWickEyes(dt);
		this.updateKindleEyes(dt);
		this.guiBox.update(dt);
	}
};

MainMenuState.prototype.updateWickEyes = function(dt) {
	if (this.wickBlinkLeft > 0)
		this.wickBlinkLeft -= dt;
	else if (this.nextWickBlink > 0) {
		this.nextWickBlink -= dt;
		if (this.nextWickBlink <= 0) {
			this.wickBlinkLeft = 0.1;
			this.nextWickBlink = randomRange(4, 6);
		}
	}

	if (this.wickLookLeft > 0)
		this.wickLookLeft -= dt;
	else if (this.nextWickLook > 0) {
		this.nextWickLook -= dt;
		if (this.nextWickLook <= 0) {
			this.wickLookLeft = randomRange(1, 2);
			this.nextWickLook = randomRange(2, 3);
			this.wickLookType = randomRange(1, 3);
		}
	}
};

MainMenuState.prototype.updateKindleEyes = function(dt) {
	if (this.kindleBlinkLeft > 0)
		this.kindleBlinkLeft -= dt;
	else if (this.nextKindleBlink > 0) {
		this.nextKindleBlink -= dt;
		if (this.nextKindleBlink <= 0) {
			this.kindleBlinkLeft = 0.1;
			this.nextKindleBlink = randomRange(4, 6);
		}
	}
};

// ----------------------------------------------------------------------------

function YesNoDialogState(host, stateName, stateId) {
	this.pressedButton = 0;
	this.frame = null;
	this.originalState = 0;

	this.yesStr = "Ok";
	this.noStr = "Cancel";
	this.questionStr = "";

	this.questionText = null;
	this.yesButton = null;
	this.noButton = null;

	this.acceptSound = null;
	this.declineSound = null;
	this.selectSound = null;

	BaseState.apply(this, arguments);
}

YesNoDialogState.prototype = new BaseState();
YesNoDialogState.constructor = YesNoDialogState;

YesNoDialogState.prototype.enter = function (msg, fromState) {
	this.pressedButton = -1;
	this.originalState = fromState;

	if (msg && msg.id === App.Messages.kYesNoDialogMsg) {
		this.yesStr = msg.yes;
		this.noStr = msg.no;
		this.questionStr = msg.question;
	}

	this.questionText = new Text();
	this.questionText.set(this.questionStr, "MenuHeadingFont");

	var resume = function(event, respawn) {
		if (GUIButton.eventTypes.onButtonPressed == event) {
			if (respawn) {
				app.game.doRespawn();
				app.setState(appStates.kStateInGame);
			} else {
				app.setState(appStates.kStateMainMenu);
			}
		}
	};

	this.yesButton = GUITextButton.getStandardButton(null, null, this.yesStr, "MenuButtonFont", function(a) {
		resume(a, true);
	});
	this.noButton = GUITextButton.getStandardButton(null, null, this.noStr, "MenuButtonFont", function(a) {
		resume(a, false);
	});

	var padding = 25;
	var buttonsRect = new Rectf(0, 0, this.yesButton.size.width + this.noButton.size.width + padding, this.yesButton.size.height);
	var textRect = this.questionText.getRect();
	buttonsRect = buttonsRect.offset(0, textRect.height + padding);

	var infoRect = textRect.copy();
	infoRect.include(buttonsRect.x1, buttonsRect.y1);
	infoRect.include(buttonsRect.x0, buttonsRect.y0);
	var c = infoRect.center();

	textRect = textRect.offset(new Vec2((c.subNew(textRect.center())).x, 0));
	buttonsRect = buttonsRect.offset(new Vec2((c.subNew(buttonsRect.center())).x, 0));

	this.frame = new ResizableFrame("Frame", new Rectf(10, 5, 109, 107));
	this.frame.setInteriorSize(infoRect.width, infoRect.height);
	var frameRect = this.frame.getInteriorArea();

	// Center in interior area
	c = frameRect.center();
	textRect = textRect.offset(c.subNew(infoRect.center()));
	buttonsRect = buttonsRect.offset(c.subNew(infoRect.center()));

	var xOffset = (app.render.getWidth() - this.frame.getWidth()) / 2 + frameRect.x0;
	var yOffset = (app.render.getHeight() - this.frame.getHeight()) / 2 + frameRect.y0;

	this.texts = textRect.offset(new Point2(xOffset, yOffset));
	this.buttons = buttonsRect.offset(new Point2(xOffset, yOffset));

	this.yesButton.position = new Vec2(xOffset + buttonsRect.x0, yOffset + buttonsRect.y0);
	this.noButton.position = this.yesButton.position.addNew(new Vec2(this.yesButton.size.width + padding, 0));
};

YesNoDialogState.prototype.leave = function () {
	if (this.frame) {
		this.frame = null;
	}
};

YesNoDialogState.prototype.update = function (dt) {
	GUIButton.prototype.update.call(this.yesButton, false, false);
	GUIButton.prototype.update.call(this.noButton, false, false);
};

YesNoDialogState.prototype.message = function () {
};

YesNoDialogState.prototype.transition = function () {
};

YesNoDialogState.prototype.draw = function (render) {
	//this.fsm.stateArray[appStates.kStateInGame].draw(render);
	render.drawFilledRect(0, 0, render.getWidth(), render.getHeight(), new Pixel32(0, 0, 0, 128));
	var x = (render.getWidth() - this.frame.getWidth()) / 2;
	var y = (render.getHeight() - this.frame.getHeight()) / 2;
	this.frame.draw(render, x, y);

	this.questionText.draw(render, this.texts.x0, this.texts.y0);
	this.yesButton.draw(render, this.yesButton.position.x, this.yesButton.position.y);
	this.noButton.draw(render, this.noButton.position.x, this.noButton.position.y);

};

// ----------------------------------------------------------------------------

/**
 * State for displaying the Opera logo and preloading developer splash and main menu.
 */
function IntroState() {
	this.t = 0;
	this.delayAfter = 1;
	this.doneT = null;
	this.progress = 0;

	this.minLogoTime = 3;
	this.logoStartT = null;

	this.font = null;
	this.progressText = null;
	this.lastProgress = -1;

	this.operaLogo = null;

	BaseState.apply(this, arguments);
}

IntroState.prototype = new BaseState();
IntroState.constructor = IntroState;

IntroState.prototype.enter = function(msg, fromState) {
	ResourceLoader.getInstance().preloadImages(["atlas/gui/opera_logo.png"], createCallback(this.operaProgressCallback, this));

	var images = [
		"atlas/gui/titlescreen0.png",
		"atlas/no_c_red/titlescreen1.png",
		"atlas/gui/titlescreen2.png",
		"atlas/no_c_red/titlescreen3.png",
		"atlas/no_c_red/titlescreen4.png",
		"atlas/no_c_red/storyboardintro.png",
		"atlas/gui/titletext_html5.png",
		"atlas/gui/titlescreen_wick_eyes.png",
		"atlas/gui/titlescreen_kindle_eyes.png",
		"atlas/game/timetrap.png",
		"localized/english/Copyright.png",
		"atlas/gui/button.png",
		"atlas/storyboards/storyboard1.png",
		"atlas/storyboards/storyboard2.png",
		"atlas/storyboards/storyboard3.png",
		"atlas/storyboards/storyboard4.png",
		"atlas/gui/textbubble.png",
		"localized/english/controls_mac_pc.png"
	];
	ResourceLoader.getInstance().preloadImages(images, createCallback(this.progressCallback, this));

	this.font = ResourceDepot.getInstance().getFont("LoadingIntro");
	this.operaLogo = ResourceDepot.getInstance().getImage("opera_logo", "opera_logo");
};

IntroState.prototype.progressCallback = function(status) {
	this.progress = status;

	if (status >= 1) {
		this.doneT = this.t + this.delayAfter;
	}
};

IntroState.prototype.operaProgressCallback = function(status) {
	if (status >= 1) {
		this.logoStartT = this.t;
		this.minLogoTime += this.t;
	}
};

IntroState.prototype.update = function(dt) {
	this.t += dt;
};

IntroState.prototype.transition = function() {
	return this.host.tryChangeState(this.doneT != null && this.t >= this.doneT && this.logoStartT != null && this.t >= this.minLogoTime && app.audio.player.initialized, fsmStates.kNextState);
};

IntroState.prototype.draw = function(render) {
	render.clear(render.white);

	var centerW = render.getWidth() / 2;
	var centerH = render.getHeight() / 2;

	if (this.logoStartT != null) {
		var logoAlpha = Math.min(1, this.t - this.logoStartT);
		render.drawImage(this.operaLogo, centerW, centerH, 0, true, logoAlpha, null, false);
	}


	if (this.lastProgress != this.progress) {
		this.progressText = this.font.generateCanvas(Math.ceil(this.progress * 100) + " %");
		this.lastProgress = this.progress;
	}

	var alpha = 1;
	if (this.t < 1) {
		alpha = this.t;
	}
	if (this.doneT != null) {
		alpha = Math.max(0, this.doneT - this.t);
	}

	render.drawText(this.progressText, centerW - this.progressText.width / 2, 420, alpha);
};

// ----------------------------------------------------------------------------

function StageCompleteState() {
	BaseState.apply(this, arguments);

	this.timeInState = 0;

	this.totalScore = null;
	this.bannerImage = null;
	this.tallyKindle = null;
	this.tallyUpgrade = null;
	this.levelUp = null;
	this.multiplier = null;
	this.multiplierText = null;
	this.multiplierSubText = null;
	this.numEntries = 0;
	this.score = 0;
	this.scoreGained = 0;
	this.goToNextState = false;
	this.continueText = null;
	this.doUpgrade = 0;
	this.upgradeFlash = 0;
	this.levelUpFade = 0;

	this.tallySound = null;
	this.totalSound = null;

	this.state = null;
	this.timeToNextState = 0;
	this.lastItem = 0;

	this.currMult = 0;
	this.targetMult = 0;

	this.kDispDelay = 0.2;

	this.entries = [];

	this.backgroundColor = new Pixel32(0, 0, 0, 170);

	this.victoryMusic = null;
	this.musicId = null;
}

StageCompleteState.prototype = new BaseState();
StageCompleteState.constructor = StageCompleteState;

StageCompleteState.prototype.enter = function(msg, fromState) {
	this.doUpgrade = false;
	this.upgradeFlash = 0;
	this.levelUpFade = 0;
	this.goToNextState = false;
	this.timeInState = 0;

	if (app.game.currentStage.name == "stage0") {
		app.game.stagesFinished = Math.max(app.game.stagesFinished, 1);
	} else if (app.game.currentStage.name == "stage1") {
		app.game.stagesFinished = Math.max(app.game.stagesFinished, 2);
	} else if (app.game.currentStage.name == "stage2") {
		app.game.stagesFinished = Math.max(app.game.stagesFinished, 3);
	}

	var dep = ResourceDepot.getInstance();

	this.host.audio.stopAllSoundFX();

	this.victoryMusic = dep.getMusic("victory");
	this.musicId = this.host.audio.playMusic(this.victoryMusic, false);

	this.stageCompleted = new Text();
	this.stageCompleted.set(dep.getString("STR_STAGE_COMPLETED"), "TallyLargeFont");

	var kScoreTally = "ScoreTallyItems";

	this.tallyAcorn = dep.getImage(kScoreTally, "tally_acorn");
	this.tallyGremlin = dep.getImage(kScoreTally, "tally_gremlin");
	this.tallyBrownie = dep.getImage(kScoreTally, "tally_brownie");
	this.tallyFlamesprite = dep.getImage(kScoreTally, "tally_flamesprite");
	this.tallyChest = dep.getImage(kScoreTally, "tally_chest");
	this.tallyHouse = dep.getImage(kScoreTally, "tally_house");
	this.tallyTime = dep.getImage(kScoreTally, "tally_time");
	this.tallyHero = dep.getImage(kScoreTally, "tally_hero");
	this.tallyMultiply = dep.getImage(kScoreTally, "tally_multiply");
	this.tallyBoss = dep.getImage(kScoreTally, "tally_boss");
	this.tallyEquals = dep.getImage(kScoreTally, "tally_equals");

	this.tallyKindle = dep.getImage("KindleTally", "default");
	//this.tallyUpgrade = dep.getImage("KindleTallyUpgrade", "default");
	//this.levelUp = dep.getImage("upgrade_banners", "level_up", true);
	this.multiplier = dep.getImage("pickups", "GoldenWings");

	this.multiplierText = new Text();
	this.multiplierText.set(dep.getString("STR_TALLY_MULTIPLIER_FORMAT"), "TallyMultiplierFont");

	this.multiplierSubText = new Text();
	this.multiplierSubText.set(dep.getString("STR_TALLY_MULTIPLIER_SUBTEXT"), "TallyMultiplierSubFont");


	var tallyInfo = app.game.getTallyInfo();

	this.score = tallyInfo.currscore;
	this.scoreGained = 0;

	this.entries = [];

	this.addEntry(this.tallyAcorn, dep.getString("STR_TALLY_ACORN"), 25, this.tallyMultiply, tallyInfo.acorns, this.tallyEquals, false);
	this.addEntry(this.tallyGremlin, dep.getString("STR_TALLY_GREMLIN"), 100, this.tallyMultiply, tallyInfo.gremlins, this.tallyEquals);
	this.addEntry(this.tallyChest, dep.getString("STR_TALLY_CHEST"), 500, this.tallyMultiply, tallyInfo.chests, this.tallyEquals);
	this.addEntry(this.tallyHouse, dep.getString("STR_TALLY_HOUSE"), 1000, this.tallyMultiply, tallyInfo.houses, this.tallyEquals);

	this.addEntry(this.tallyBrownie, dep.getString("STR_TALLY_BROWNIE"), 2000, this.tallyMultiply, tallyInfo.brownies, this.tallyEquals);
	this.addEntry(this.tallyFlamesprite, dep.getString("STR_TALLY_FLAMESPRITE"), 5000, this.tallyMultiply, tallyInfo.flamesprites, this.tallyEquals);
	this.addEntry(this.tallyTime, dep.getString("STR_TALLY_SPEED"), 10000, this.tallyMultiply, tallyInfo.speedbonus, this.tallyEquals);
	this.addEntry(this.tallyHero, dep.getString("STR_TALLY_HERO"), 12000, this.tallyMultiply, tallyInfo.herobonus, this.tallyEquals);

	this.addEntry(this.tallyBoss, dep.getString("STR_TALLY_BOSS"), 20000, this.tallyMultiply, tallyInfo.bossdefeat, this.tallyEquals);

	this.totalScore = new Text();
	this.totalScore.set(formatScore(this.scoreGained), "TallyHugeFont");

	this.continueText = new Text();
	this.continueText.set(dep.getString("STR_PRESS_TO_CONTINUE"), "BackButtonFont");

	this.bannerImage = dep.getImage("StageBanner", "CentrePiece");

	this.tallySound = dep.getSFX("stage_tally");
	this.totalSound = dep.getSFX("kindle_win");
};

StageCompleteState.prototype.leave = function(dt) {
	this.host.audio.stopSound(this.musicId);

	app.game.score += this.scoreGained;
};

StageCompleteState.prototype.update = function(dt) {
	this.timeInState += dt;
	if (this.timeInState > 1) {
		if (InputHandler.instance.anythingPressed())
			this.goToNextState = true;
	}
};

StageCompleteState.prototype.transition = function() {
	if (this.host.game.currentStage.name != "stage2") {
		var isStage0 = this.host.game.currentStage.name == "stage0";
		return this.host.tryChangeState(this.goToNextState, appStates.kStateLoadingStage, isStage0 ? "stage1" : "stage2");
	}
	return this.host.tryChangeState(this.goToNextState, appStates.kStateMainMenu);
};

StageCompleteState.prototype.draw = function(render) {
	render.drawFillScreen(this.backgroundColor);

	var width = render.getWidth();
	var bannerTop = (render.getHeight() - this.bannerImage.textureHeight) / 2;
	for (var p = 0; p < width; p += this.bannerImage.textureWidth) {
		render.drawImage(this.bannerImage, p, bannerTop);
	}

	render.drawImage(this.tallyKindle, 0, 20, 0);

	var x = this.entries.length <= 4 ? 270 : 90, y = bannerTop + 25;
	var len = Math.min(this.entries.length, 8);
	for (var i = 0; i < len; i++,y += 25) {
		if (i == 4) {
			x += 340;
			y = bannerTop + 25;
		}
		this.entries[i].draw(render, x, y);
	}

	this.stageCompleted.draw(render, (width - this.stageCompleted.canvas.width) / 2, bannerTop - 50);

	this.totalScore.draw(render, (width - this.totalScore.canvas.width) / 2, 400);

	this.continueText.draw(render, (width - this.continueText.canvas.width) / 2, 500, Clamp(0, this.timeInState - 1, 1));
};

StageCompleteState.prototype.addEntry = function(icon, typeName, typeScore, mulImg, numCollected, equImg, forceAdd) {
	forceAdd = forceAdd === undefined ? false : forceAdd;

	if (numCollected == 0 && !forceAdd) return;

	var row = new TallyRow(icon, typeName, formatScore(typeScore), mulImg, numCollected, equImg, formatScore(typeScore * numCollected));

	this.entries.push(row);

	this.scoreGained += typeScore * numCollected;
};

function formatScore(s) {
	s = Math.floor(s);
	if (s >= 1000000) return Math.floor(s / 1000000) + "," + pad(Math.floor((s % 1000000) / 1000)) + "," + pad(s % 1000);
	else if (s >= 1000) return Math.floor(s / 1000) + "," + pad(s % 1000);
	return s;
}

function pad(s) {
	if (s < 10) return "00" + s;
	else if (s < 100) return "0" + s;
	return s;
}


function TallyRow(icon, typeName, score, mulImg, numCollected, equImg, totalScore) {
	this.icon = icon;
	this.typeName = new Text();
	this.typeName.set(typeName, "TallyTinyFont");

	this.score = new Text();
	this.score.set(score, "TallyTinyFont");

	this.mulImg = mulImg;

	this.numCollected = new Text();
	this.numCollected.set(numCollected, "TallyTinyFont");

	this.equImg = equImg;

	this.totalScore = new Text();
	this.totalScore.set(totalScore, "TallyTinyFont");
}

TallyRow.prototype.draw = function(render, x, y) {
	var xOff = 0;
	render.drawImage(this.icon, x, y + 10, 0, true);

	xOff += 40;
	this.typeName.draw(render, x + xOff, y);

	xOff += 70;
	this.score.draw(render, x + xOff, y);

	xOff += 50;
	render.drawImage(this.mulImg, x + xOff, y + 3, 0);

	xOff += 20;
	this.numCollected.draw(render, x + xOff, y);

	xOff += 30;
	render.drawImage(this.equImg, x + xOff, y + 3, 0);

	xOff += 20;
	this.totalScore.draw(render, x + xOff, y);
};

// ----------------------------------------------------------------------------

function TutorialPageState() {
	BaseState.apply(this, arguments);

	this.backgroundColor = new Pixel32(0, 0, 0, 170);
}

TutorialPageState.prototype = new BaseState();
TutorialPageState.constructor = TutorialPageState;

TutorialPageState.prototype.enter = function(msg, fromState) {
	this.card = null;

	if (msg == "walk")
		this.card = new TutorialCardWalk();
	else if (msg == "attack")
		this.card = new TutorialCardAttack();
	else if (msg == "hide")
		this.card = new TutorialCardHide();
	else if (msg == "dash")
		this.card = new TutorialCardDash();
	else if (msg == "enter")
		this.card = new TutorialCardEnter();
	else if (msg == "barrelroll")
		this.card = new TutorialCardBarrelRoll();
	else if (msg == "jumpclimb")
		this.card = new TutorialCardJumpClimb();

	if (this.card)
		this.card.doEnter();

	this.skip = false;
	this.skippable = false;
};

TutorialPageState.prototype.update = function(dt) {
	if (this.card) {
		this.card.doUpdate(dt);
		if (this.card.timeInState > 0.5)
			this.skippable = true;
	}

	this.skip = InputHandler.instance.anythingPressed();
};

TutorialPageState.prototype.transition = function() {
	return this.host.tryChangeState(!this.card || this.skippable && this.skip, appStates.kStateInGame);
};

TutorialPageState.prototype.draw = function(render) {
	var halfScreenWidth = render.getWidth() / 2;
	var halfScreenHeight = render.getHeight() / 2;

	render.drawFillScreen(this.backgroundColor);

	if (this.card)
		this.card.doDraw(render, halfScreenWidth, halfScreenHeight);
};

// ----------------------------------------------------------------------------

function DialogueState() {
	BaseState.apply(this, arguments);

	this.backgroundColor = new Pixel32(0, 0, 0, 170);

	this.dEntries = [];
	this.timeInState = 0;
	this.cues = [];
	this.currCue = 0;
	this.speakersToRemove = 0;
}

DialogueState.prototype = new BaseState();
DialogueState.constructor = DialogueState;

DialogueState.prototype.enter = function(msg, fromState) {
	this.timeInState = 0;
	this.currCue = -1;
	this.cues = this.host.game.dialogueSystem.getActiveCues();
	this.dEntries = [];
	app.setShowSkipButton();
	this.speakersToRemove = 0;
};

DialogueState.prototype.update = function(dt) {
	this.timeInState += dt;

	var i, e;
	if (this.speakersToRemove > 0) {
		for (i = 0; i < this.dEntries.length; i++) {
			e = this.dEntries[i];
			if (e.swoopOut)
				e.update(dt);
		}
		for (i = 0; i < this.dEntries.length;) {
			e = this.dEntries[i];
			if (e.swoopOut && e.pos == 0) {
				this.dEntries.splice(i, 1);
				this.speakersToRemove--;
			} else i++;
		}
	} else {
		for (i = 0; i < this.dEntries.length; i++) {
			e = this.dEntries[i];
			e.update(dt);
		}

		var done = true;
		for (i = 0; i < this.dEntries.length; i++) {
			e = this.dEntries[i];
			if (!e.done()) {
				done = false;
				break;
			}
		}

		if (done) {
			this.currCue++;
			if (this.currCue < this.cues.length) {
				var foundMatch = false;
				var cue;
				for (i = 0; i < this.dEntries.length; i++) {
					e = this.dEntries[i];
					if (e.who == this.cues[this.currCue].who) {
						foundMatch = true;
						cue = this.cues[this.currCue];
						e.setCue(cue.text, cue.time, cue.pause, true);
						break;
					}
				}
				if (!foundMatch) {
					var left = this.cues[this.currCue].who == "Kindle";
					for (i = 0; i < this.dEntries.length; i++) {
						e = this.dEntries[i];
						if (e.isLeft == left) {
							this.speakersToRemove++;
							e.swoopOut = true;
						}
					}
					var entry = new DEntry(left, this.cues[this.currCue].who);
					cue = this.cues[this.currCue];
					entry.setCue(cue.text, cue.time, cue.pause);
					this.dEntries.push(entry);
				}
			}
		}
	}
};

DialogueState.prototype.leave = function() {
	app.setShowSkipButton(false);
};

DialogueState.prototype.transition = function() {
	return this.host.tryChangeState(this.currCue > this.cues.length, appStates.kStateInGame);
};

DialogueState.prototype.message = function(message) {
	if (message == "skip") {
		for (i = 0; i < this.dEntries.length;) {
			var e = this.dEntries[i];
			if (e.skip()) {
				this.dEntries.splice(i, 1);
				this.speakersToRemove--;
			} else i++;
		}
	}
};

DialogueState.prototype.draw = function(render) {
	render.drawFillScreen(this.backgroundColor);

	var leftY = 140;
	var rightY = leftY + 170;

	for (var i = 0; i < this.dEntries.length; i++) {
		var e = this.dEntries[i];
		e.draw(render, e.isLeft ? leftY : rightY);
	}
};

function DEntry(left, w) {
	this.pos = 0;
	this.isLeft = left;
	this.displayLeft = 0;
	this.pauseLeft = 0;

	this.who = w;
	this.cue = null;
	this.top = null;
	this.bottom = null;
	this.text = new Text();
	this.newText = null;
	this.fadeOut = false;
	this.fadeParam = 1;
	this.swoopOut = false;

	this.frame = ResourceDepot.getInstance().getImage("DialogueIdols", "frame");
	this.idol = ResourceDepot.getInstance().getImage("DialogueIdols", w);
	if (this.idol == null)
		this.idol = ResourceDepot.getInstance().getImage("DialogueIdols2", w);
	if (w == "Kindle") {
		this.top = new Pixel32(190, 255, 0);
		this.bottom = new Pixel32(10, 90, 10);
	} else if (w == "Candlefinger" || w == "Warrior" || w == "SoupTroop" || w == "Bandit" || w == "Guard" || w == "Bouncer" || w == "Scout") {
		this.top = new Pixel32(255, 128, 64);
		this.bottom = new Pixel32(90, 10, 10);
	} else {
		this.top = new Pixel32(0, 190, 255);
		this.bottom = new Pixel32(10, 10, 90);
	}
}

DEntry.prototype.setCue = function(c, displayLen, pauseLen, showChange) {
	showChange = showChange === undefined ? false : showChange;

	this.cue = c;
	this.displayLeft = displayLen;
	this.pauseLeft = pauseLen;
	if (showChange) {
		this.newText = this.cue;
		this.fadeOut = true;
		this.fadeParam = 1;
	} else
		this.text.set(this.cue, "DialogueEventFont", 460);
};

DEntry.prototype.update = function(dt) {
	if (this.fadeOut) {
		this.fadeParam = Math.max(0, this.fadeParam - dt * 4);
		if (this.fadeParam == 0) {
			this.fadeOut = false;
			this.text.set(this.newText, "DialogueEventFont", 460);
			this.newText = null;
		}
	} else if (this.fadeParam < 1)
		this.fadeParam = Math.min(1, this.fadeParam + dt * 4);
	else if (this.swoopOut) {
		this.pos = Math.max(0, this.pos - dt / 0.5);
	} else {
		if (this.cue != null && this.pos != 1)
			this.pos = Math.min(1, this.pos + dt / 0.5);
		else if (this.displayLeft > 0)
			this.displayLeft = Math.max(0, this.displayLeft - dt);
		else if (this.pauseLeft > 0)
			this.pauseLeft = Math.max(0, this.pauseLeft - dt);
	}
};

DEntry.prototype.skip = function() {
	this.fadeOut = false;
	this.fadeParam = 1;
	this.pos = 1;
	this.displayLeft = 0;

	if (this.newText != null) {
		this.text.set(this.newText, "DialogueEventFont", 460);
		this.newText = null;
	}

	return this.swoopOut;
};

DEntry.prototype.draw = function(render, y) {
	var x;
	if (this.isLeft)
		x = lerp(render.getWidth() + 20, 0, Math.sin(this.pos * Math.PI / 2));
	else
		x = lerp(-170, render.getWidth() - 170, Math.sin(this.pos * Math.PI / 2));

	if (this.isLeft)
		render.drawRect(x + 154, y + 25, x + 650, y + 145, new Pixel32(128, 128, 128, 255));
	else
		render.drawRect(x - 480, y + 25, x + 18, y + 145, new Pixel32(128, 128, 128, 255));

	this.drawBackground(render, x + 18, y + 18);
	render.drawImage(this.frame, x, y, 0, false);
	render.drawImage(this.idol, x, y, 0, false);

	if (this.pos == 1)
		if (this.isLeft)
			this.text.draw(render, x + 170, y + 40, this.fadeParam);
		else
			this.text.draw(render, x - 460, y + 40, this.fadeParam);
};

DEntry.prototype.drawBackground = function(render, x, y) {
	render.drawFilledRect(x, y, x + 134, y + 134, this.top, this.bottom);
};

DEntry.prototype.done = function() {
	return this.pos == 1 && this.displayLeft == 0 && this.pauseLeft == 0;
};

// ----------------------------------------------------------------------------

function StoryboardState() {
	BaseState.apply(this, arguments);

	this.timeToNextState = 0;
	this.timeInCurrentState = 0;
	this.timeToBlink = [0,0];
	this.blinkLeft = [0,0];
	this.timeToShiftEyes = 0;
	this.currEyePos = 0;

	this.text = new Text();
	this.locationText = new Text();
	this.subLocationText = new Text();

	this.currentState = -1;

	this.sbImage1 = null;
	this.sbImage1Brownie = null;
	this.sbImage1BrownieBlink = null;
	this.sbImage2 = null;
	this.sbImage2Kindle = null;
	this.sbImage2Wick1 = null;
	this.sbImage2Wick2 = null;
	this.sbImage2Wick3 = null;
	this.sbImage2Wick4 = null;
	this.sbImage3 = null;
	this.sbImage3Kindle = null;
	this.sbImage3Wick1 = null;
	this.sbImage3Wick2 = null;
	this.sbImage3Wick3 = null;
	this.sbImage3Wick4 = null;
	this.sbImage4 = null;
	this.rightBubble = null;
	this.leftBubble = null;

	this.musicID = -1;
}

StoryboardState.prototype = new BaseState();
StoryboardState.constructor = StoryboardState;

StoryboardState.states = {
	kStateDisplayLocation : 0,
	kStateStoryBoard1 : 1,
	kStateStoryBoard1a : 2,
	kStateStoryBoard1b : 3,
	kStateStoryBoard1c : 4,
	kStateStoryBoard2 : 5,
	kStateStoryBoard2a : 6,
	kStateStoryBoard2b : 7,
	kStateStoryBoard2c : 8,
	kStateStoryBoard3 : 9,
	kStateStoryBoard3a : 10,
	kStateStoryBoard3b : 11,
	kStateStoryBoard4 : 12,
	kStateMax : 13
};

StoryboardState.prototype.enter = function(msg, fromState) {
	var dep = ResourceDepot.getInstance();

	this.musicID = this.host.audio.playMusic(dep.getMusic("story_board"));

	this.locationText.set(dep.getString("STR_INTRO_ELDERWOOD"), "StoryboardHugeFont");

	this.subLocationText.set(dep.getString("STR_INTRO_HOMESTEAD"), "StoryboardLargeFont");

	this.sbImage1 = dep.getImage("Storyboard1", "default");
	this.sbImage1Brownie = dep.getImage("Storyboard1Brownie", "default");
	this.sbImage1BrownieBlink = dep.getImage("Storyboard1BrownieBlink", "default");
	this.sbImage2 = dep.getImage("Storyboard2", "default");
	this.sbImage2Kindle = dep.getImage("Storyboard2Kindle", "default");
	this.sbImage2Wick1 = dep.getImage("Storyboard2Wick", "eyes0");
	this.sbImage2Wick2 = dep.getImage("Storyboard2Wick", "eyes1");
	this.sbImage2Wick3 = dep.getImage("Storyboard2Wick", "eyes2");
	this.sbImage2Wick4 = dep.getImage("Storyboard2Wick", "eyes3");
	this.sbImage3 = dep.getImage("Storyboard3", "default");
	this.sbImage3Kindle = dep.getImage("Storyboard3Kindle", "default");
	this.sbImage3Wick1 = dep.getImage("Storyboard3Wick", "eyes0");
	this.sbImage3Wick2 = dep.getImage("Storyboard3Wick", "eyes1");
	this.sbImage3Wick3 = dep.getImage("Storyboard3Wick", "eyes2");
	this.sbImage3Wick4 = dep.getImage("Storyboard3Wick", "eyes3");
	this.sbImage4 = dep.getImage("Storyboard4", "default");

	this.rightBubble = new GUITextBubble(false, 300);
	this.leftBubble = new GUITextBubble(true, 300);

	this.timeToBlink[0] = 0;
	this.timeToBlink[1] = 0;
	this.blinkLeft[0] = 0;
	this.blinkLeft[1] = 0;
	this.timeToShiftEyes = 0;
	this.currEyePos = 0;

	this.timeInCurrentState = 0;
	this.currentState = -1;
	this.nextState();

	app.setShowSkipButton(true);
};

StoryboardState.prototype.update = function(dt) {
	this.timeInCurrentState += dt;

	this.timeToNextState -= dt;
	if (this.timeToNextState <= 0)
		this.nextState();

	if (this.blinkLeft[0] > 0)
		this.blinkLeft[0] -= dt;
	if (this.timeToBlink[0] > 0) {
		this.timeToBlink[0] -= dt;
		if (this.timeToBlink[0] <= 0) {
			this.timeToBlink[0] = randomRange(3, 4);
			this.blinkLeft[0] = 0.1;
		}
	}

	if (this.blinkLeft[1] > 0)
		this.blinkLeft[1] -= dt;
	if (this.timeToBlink[1] > 0) {
		this.timeToBlink[1] -= dt;
		if (this.timeToBlink[1] <= 0) {
			this.timeToBlink[1] = randomRange(3, 4);
			this.blinkLeft[1] = 0.1;
		}
	}

	if (this.timeToShiftEyes > 0) {
		this.timeToShiftEyes -= dt;
		if (this.timeToShiftEyes <= 0) {
			this.timeToShiftEyes = randomRange(1.5, 3);
			this.currEyePos = randomRange(0, 3);
		}
	}
};

StoryboardState.prototype.leave = function() {
	app.setShowSkipButton(false);

	this.host.audio.stopSound(this.musicID);
};

StoryboardState.prototype.transition = function() {
	return false;
};

StoryboardState.prototype.message = function(message) {
	if (message == "skip" && this.timeInCurrentState > 0.25)
		this.nextState();
};

StoryboardState.prototype.draw = function(render) {
	var cx = render.getWidth() / 2;
	var cy = render.getHeight() / 2;

	render.clear();

	switch (this.currentState) {
		case StoryboardState.states.kStateDisplayLocation:
			this.drawScene1(render);
			this.locationText.draw(render, cx - this.locationText.canvas.width / 2, 200, 1);
			this.subLocationText.draw(render, cx - this.subLocationText.canvas.width / 2, 300, 1);
			break;
		case StoryboardState.states.kStateStoryBoard1:
			this.drawScene1(render);
			break;
		case StoryboardState.states.kStateStoryBoard1a:
			this.drawScene1(render);
			this.rightBubble.draw(render, cx + 110, cy - 25);
			break;
		case StoryboardState.states.kStateStoryBoard1b:
			this.drawScene1(render);
			this.drawBrownie1(render);
			break;
		case StoryboardState.states.kStateStoryBoard1c:
			this.drawScene1(render);
			this.drawBrownie1(render);
			this.leftBubble.draw(render, cx - 40, cy - 30);
			break;
		case StoryboardState.states.kStateStoryBoard2:
			this.drawScene2(render);
			break;
		case StoryboardState.states.kStateStoryBoard2a:
		case StoryboardState.states.kStateStoryBoard2c:
			this.drawScene2(render);
			this.rightBubble.draw(render, cx - 40, cy + 160);
			break;
		case StoryboardState.states.kStateStoryBoard2b:
			this.drawScene2(render);
			this.rightBubble.draw(render, cx + 160, cy - 100);
			break;
		case StoryboardState.states.kStateStoryBoard3:
			this.drawScene3(render);
			break;
		case StoryboardState.states.kStateStoryBoard3a:
			this.drawScene3(render);
			this.rightBubble.draw(render, cx - 55, cy + 45);
			break;
		case StoryboardState.states.kStateStoryBoard3b:
			this.drawScene3(render);
			this.rightBubble.draw(render, cx + 25, cy - 100);
			break;
		case StoryboardState.states.kStateStoryBoard4:
			this.drawScene4(render);
			this.leftBubble.draw(render, cx - 85, cy + 145);
			break;
	}
};

StoryboardState.prototype.drawScene1 = function(render) {
	var cx = render.getWidth() / 2;
	var cy = render.getHeight() / 2;

	render.drawParticle(this.sbImage1, cx, cy, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
};

StoryboardState.prototype.drawBrownie1 = function(render) {
	var cx = render.getWidth() / 2;
	var cy = render.getHeight() / 2;

	var posx = 212 - 400 + 329 / 2;
	var posy = 210 - 300 + 252 / 2;

	var pos2x = 291 - 400 + 35 / 2;
	var pos2y = 287 - 300 + 15 / 2;

	render.drawParticle(this.sbImage1Brownie, cx + posx, cy + posy, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	if (this.blinkLeft[0] > 0)
		render.drawParticle(this.sbImage1BrownieBlink, cx + pos2x, cy + pos2y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
};

StoryboardState.prototype.drawScene2 = function(render) {
	var cx = render.getWidth() / 2;
	var cy = render.getHeight() / 2;

	render.drawParticle(this.sbImage2, cx, cy, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);

	var pos1x = 173 + 51 / 2;
	var pos1y = 206 - 300 + 18 / 2;
	var pos2x = 116 + 123 / 2;
	var pos2y = -20 + 43 / 2;
	if (this.blinkLeft[0] > 0)
		render.drawParticle(this.sbImage2Kindle, cx + pos1x, cy + pos1y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	if (this.blinkLeft[1] > 0)
		render.drawParticle(this.sbImage2Wick1, cx + pos2x, cy + pos2y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	else if (this.currEyePos == 1)
		render.drawParticle(this.sbImage2Wick2, cx + pos2x, cy + pos2y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	else if (this.currEyePos == 2)
		render.drawParticle(this.sbImage2Wick3, cx + pos2x, cy + pos2y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	else if (this.currEyePos == 3)
		render.drawParticle(this.sbImage2Wick4, cx + pos2x, cy + pos2y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
};

StoryboardState.prototype.drawScene3 = function(render) {
	var cx = render.getWidth() / 2;
	var cy = render.getHeight() / 2;
	render.drawParticle(this.sbImage3, cx, cy, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	var pos1x = 73 + 102 / 2;
	var pos1y = 136 - 300 + 35 / 2;
	var pos2x = 359 - 400 + 246 / 2;
	var pos2y = 284 - 300 + 85 / 2;
	if (this.blinkLeft[0] > 0)
		render.drawParticle(this.sbImage3Kindle, cx + pos1x, cy + pos1y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
	if (this.blinkLeft[1] > 0)
		render.drawParticle(this.sbImage3Wick1, cx + pos2x, cy + pos2y, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
};

StoryboardState.prototype.drawScene4 = function(render) {
	var cx = render.getWidth() / 2;
	var cy = render.getHeight() / 2;

	render.drawParticle(this.sbImage4, cx, cy, 0, 1, 1, 1, new Pixel32(255, 255, 255, 0), false);
};

StoryboardState.prototype.nextState = function() {
	this.timeToNextState = 4;
	this.timeInCurrentState = 0;
	++this.currentState;

	var dep = ResourceDepot.getInstance();

	switch (this.currentState) {
		case StoryboardState.states.kStateDisplayLocation:
			this.timeToNextState = 3;
			break;
		case StoryboardState.states.kStateStoryBoard1:
			this.timeToNextState = 2;
			break;
		case StoryboardState.states.kStateStoryBoard1a:
			this.rightBubble.open(dep.getString("STR_INTRO1"), dep.getString("STR_LUCKY"));
			this.timeToNextState = 1.5;
			break;
		case StoryboardState.states.kStateStoryBoard1b:
			this.rightBubble.close();
			this.timeToNextState = 1;
			this.timeToBlink[0] = 0.5;
			break;
		case StoryboardState.states.kStateStoryBoard1c:
			this.leftBubble.open(dep.getString("STR_INTRO2"), dep.getString("STR_LUCKY"));
			this.timeToNextState = 1;
			this.timeToBlink[0] = 0.5;
			break;
		case StoryboardState.states.kStateStoryBoard2:
			this.leftBubble.close();
			this.timeToNextState = 2;
			this.timeToBlink[0] = 0.5;
			this.timeToBlink[1] = 0.75;
			this.timeToShiftEyes = 0.25;
			break;
		case StoryboardState.states.kStateStoryBoard2a:
			this.rightBubble.open(dep.getString("STR_INTRO3"), dep.getString("STR_LUCKY"), 120);
			this.timeToNextState = 8;
			break;
		case StoryboardState.states.kStateStoryBoard2b:
			this.rightBubble.close();
			this.rightBubble.open(dep.getString("STR_INTRO4"), dep.getString("STR_KINDLE"), 120);
			this.timeToNextState = 5;
			break;
		case StoryboardState.states.kStateStoryBoard2c:
			this.rightBubble.close();
			this.rightBubble.open(dep.getString("STR_INTRO5"), dep.getString("STR_LUCKY"), 120);
			this.timeToNextState = 6;
			break;
		case StoryboardState.states.kStateStoryBoard3:
			this.rightBubble.close();
			this.timeToNextState = 0.5;
			break;
		case StoryboardState.states.kStateStoryBoard3a:
			this.timeToNextState = 6;
			this.rightBubble.open(dep.getString("STR_INTRO6"), dep.getString("STR_WICK"), 120);
			break;
		case StoryboardState.states.kStateStoryBoard3b:
			this.rightBubble.close();
			this.timeToNextState = 6;
			this.rightBubble.open(dep.getString("STR_INTRO7"), dep.getString("STR_KINDLE"), 120);
			break;
		case StoryboardState.states.kStateStoryBoard4:
			this.rightBubble.close();
			this.timeToNextState = 5;
			this.leftBubble.open(dep.getString("STR_INTRO8"), dep.getString("STR_LUCKY"), 120);
			break;
		case StoryboardState.states.kStateMax:
			this.leftBubble.close();
			this.host.setState(appStates.kStateLoadingStage, "stage0");
			break;
	}
};
