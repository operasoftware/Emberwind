function AnimationHandle(animation, callback, mirrored){
	if(animation instanceof AnimationHandle){
		animation = animation.animation;
	}
	this.animation = animation;
	this.callback = callback === undefined ? null : callback;

	this.currentFrame = 0;
	this.time = 0;

	if(mirrored === undefined) mirrored = false;
	this.renderMirrored = mirrored;

	this.speed = 1;
	this.start = 0;
	this.end = 1;

	this.playTo = -1;

	this.loop = true;
	this.playing = false;
}

AnimationHandle.constructor = AnimationHandle;

AnimationHandle.prototype.clone = function() {
	var clone = new AnimationHandle(this.animation, this.callback, this.renderMirrored);
	clone.start = this.start;
	clone.end = this.end;
	clone.time = this.time;
	return clone;
};

AnimationHandle.prototype.update = function(dt) {
	if(!this.playing) return;

	var oldTime = this.time;
	this.time += this.speed * dt;
	var halfFrame = 0.5 / this.animation.framerate;

	var animationLength = this.animation.animationLength;

	if (this.loop) {
		if (this.speed > 0) {
			this.time = this.time >= animationLength * this.end ? this.start * animationLength : this.time;
		} else {
			this.time = this.time <= animationLength * this.start ? this.end * animationLength - halfFrame : this.time;
		}
	} else {
		var tempPlayTo;
		if (this.speed > 0) {
			tempPlayTo = this.playTo >= 0 ? this.playTo : this.end;
			if (this.time >= animationLength * tempPlayTo) {
				this.time = animationLength * tempPlayTo - halfFrame;
				this.playing = false;
			}
		} else {
			tempPlayTo = this.playTo >= 0 ? this.playTo : this.start;
			if (this.time <= animationLength * tempPlayTo) {
				this.time = animationLength * tempPlayTo + halfFrame;
				this.playing = false;
			}
		}
	}

	this.time = Math.max(0, this.time);

	this.currentFrame = Math.floor(this.time * this.animation.framerate) % this.animation.nbrOfFrames;

	if(this.callback !== null){
		var timeToCheck = this.playing ? this.time : (this.speed > 0 ? animationLength * this.end : this.animation.animationLength * this.start);
		var evts;
		if(oldTime < timeToCheck)
			evts = this.animation.getEvents(oldTime, timeToCheck);
		else
			evts = this.animation.getEventsSlow(oldTime, timeToCheck, animationLength * this.start, animationLength * this.end, dt);

		if(evts.length >= 2){
			this.time = this.animation.getTimeForNextEvent(oldTime, timeToCheck);
			evts = [evts[0]];
		}

		for (var e = 0; e < evts.length; e++) {
			this.callback(evts[e], this);
		}

		if (!this.playing) {
			this.callback("stopped", this);
		}
	}
};

AnimationHandle.prototype.draw = function(render, x, y, angle, alpha, tint) {
	var image = this.animation.frames[this.currentFrame];

	var baseX = this.renderMirrored ? x - (image.textureWidth - this.animation.pivotx) : x - this.animation.pivotx;
	render.drawImage(image, baseX, y - this.animation.pivoty, angle, false, alpha, tint, this.renderMirrored);
};

AnimationHandle.prototype.mirror = function() {
	this.renderMirrored = !this.renderMirrored;
};

AnimationHandle.prototype.play = function(loop) {
	this.playTo = -1;
	if(loop === undefined) loop = true;
	this.loop = loop;
	this.playing = true;
};

AnimationHandle.prototype.playToTime = function(t) {
	this.playTo = t;
	this.playing = true;
};

AnimationHandle.prototype.playToEvent = function(name) {
	for (var i = 0; i < this.animation.events.length; i++) {
		var e = this.animation.events[i];
		if(e.name == name){
			this.playToTime(e.time / this.animation.animationLength);
			break;
		}
	}
};

AnimationHandle.prototype.stop = function() {
	this.playing = false;
};

AnimationHandle.prototype.rewind = function() {
	this.time = this.start * this.animation.animationLength;
};

AnimationHandle.prototype.gotoTime = function(time) {
	this.time = time * this.animation.animationLength;
};

AnimationHandle.prototype.gotoEvent = function(evt) {
	for (var i = 0; i < this.animation.events.length; i++) {
		var e = this.animation.events[i];
		if(e.name == evt) {
			this.time = e.time;
			break;
		}
	}
};

AnimationHandle.prototype.gotoEnd = function() {
	var halfFrame = 0.5 / this.animation.framerate;
	this.time = (this.end - halfFrame) * this.animation.animationLength;
};

AnimationHandle.prototype.setRange = function(s, e) {
	this.start = s;
	this.end = e;

	var length = this.animation.animationLength;

	if(this.time < s * length) this.time = s * length;
	if(this.time > e * length) this.time = e * length;
};

AnimationHandle.prototype.setSpeed = function(speed) {
	this.speed = speed;
};

AnimationHandle.prototype.playToTime = function(time) {
	this.end = time;
	this.loop = false;
};

AnimationHandle.prototype.playToEvent = function(name) {
	for (var i = 0; i < this.animation.events.length; i++) {
		var e = this.animation.events[i];
		if(e.name == name){
			this.playToTime(e.time / this.animation.animationLength);
			break;
		}
	}
};

AnimationHandle.prototype.getLength = function() {
	return this.animation.animationLength * (this.end - this.start);
};

AnimationHandle.prototype.getCurrentPosition = function() {
	return this.time;
};

AnimationHandle.prototype.isStopped = function() {
	return !this.playing;
};

AnimationHandle.prototype.setCallback = function(callback) {
	this.callback = callback;
};

function Animation(anim, frames){
	copy(anim, this);
	
	/**
	 * The frames in the animation.
	 */
	this.frames = frames;
	/**
	 * How long the animation is in seconds.
	 */
	this.animationLength = frames.length / anim.framerate;
}

Animation.prototype.constructor = Animation;

/**
 * Return all events between the different points in time
 *
 * @returns [String]
 */
Animation.prototype.getEvents = function (from, to) {
	var events = [];
	for (var e = 0; e < this.events.length; e++) {
		var evt =  this.events[e];
		if (evt.time >= from && evt.time < to) {
			events.push(evt.name);
		}
	}

	return events;
};

Animation.prototype.getTimeForNextEvent = function(from, to){
	var first = -1;
	for (var e = 0; e < this.events.length; e++) {
		var evt =  this.events[e];
		if (evt.time > from && evt.time < to) {
			if(first != -1) return evt.time;
			first = evt.time;
		}
	}
	return first;
};

Animation.prototype.getEventsSlow = function (from, to, start, end, dt) {
	var events = [];
	var e, evt;
	for (e = 0; e < this.events.length; e++) {
		evt =  this.events[e];
		if (evt.time >= from && evt.time < end) {
			events.push(evt.name);
		}
	}

	for (e = 0; e < this.events.length; e++) {
		evt =  this.events[e];
		if (evt.time >= start && evt.time < to) {
			events.push(evt.name);
		}
	}

	return events;
};