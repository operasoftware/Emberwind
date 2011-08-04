function ParticleSystem() {
	this.background = [];
	this.foreground = [];
	this.lights = [];
}

ParticleSystem.prototype.update = function(dt) {
	var i;
	for (i = 0; i < this.background.length; i++) {
		if (this.background[i].update(dt)) {
			this.background.splice(i, 1);
		}
	}

	for (i = 0; i < this.foreground.length; i++) {
		if (this.foreground[i].update(dt)) {
			this.foreground.splice(i, 1);
		}
	}

	for (i = 0; i < this.lights.length; i++) {
		if (this.lights[i].update(dt)) {
			this.lights.splice(i, 1);
		}
	}
};

ParticleSystem.prototype.draw = function(render, x, y, foreground) {
	foreground = foreground === undefined ? false : foreground;
	var list = foreground ? this.foreground : this.background;
	for (var i = 0; i < list.length; i++) {
		list[i].draw(render, x, y);
	}
};

ParticleSystem.prototype.spawnAnimatedParticle = function(anim, pos, vel, fgnd) {
	var list = fgnd ? this.foreground : this.background;
	list.push(new AnimatedParticle(anim, pos, vel));
};

ParticleSystem.prototype.spawnImageParticle = function(img, pos, vel, life, fgnd, flash) {
	if (flash === undefined) { flash = new Pixel32(0, 0, 0, 0); }
	var list = fgnd ? this.foreground : this.background;
	list.push(new ImageParticle(img, pos, vel, life, flash));
};

// ----------------------------------------------------------------------------

function Particle(pos, vel, life) {
	this.position = pos;
	this.velocity = vel;
	this.lifeLeft = life;
}

Particle.prototype.update = function(dt) {
	this.position.add(this.velocity.copy().mul(dt));
	this.lifeLeft -= dt;
	return this.lifeLeft <= 0;
};

// ----------------------------------------------------------------------------

function AnimatedParticle(animation, pos, vel) {
	Particle.call(this, pos, vel, animation.getLength());
	this.animation = animation;

	this.animation.play();
}

AnimatedParticle.prototype = new Particle();
AnimatedParticle.prototype.constructor = AnimatedParticle;

AnimatedParticle.prototype.update = function(dt) {
	this.animation.update(dt);
	return Particle.prototype.update.call(this, dt);
};

AnimatedParticle.prototype.draw = function(render, x, y) {
	this.animation.draw(render, this.position.x + x, this.position.y + y);
};

// ----------------------------------------------------------------------------

function ImageParticle(img, pos, vel, life, flash) {
	Particle.call(this, pos, vel, life);
	this.image = img;
	this.startLife = life;
	this.flash = flash;
	this.flashLeft = 0.25;
}

ImageParticle.prototype = new Particle();
ImageParticle.prototype.constructor = ImageParticle;

ImageParticle.prototype.update = function (dt) {
	this.flashLeft -= dt;
	return Particle.prototype.update.call(this, dt);
};

ImageParticle.prototype.draw = function (render, x, y) {
	var s = 1;
	if (this.flash.a > 0 && this.flashLeft > 0) {
		s += this.flashLeft / 0.5;
		var amt = this.flash.a * this.flashLeft / 0.25;
		render.drawParticle(this.image, this.position.x + x, this.position.y + y, 0, s, s, 1, new Pixel32(255, 255, 255, amt), false);
	} else {
		render.drawParticle(this.image, this.position.x + x, this.position.y + y, 0, s, s, this.lifeLeft / this.startLife, new Pixel32(255, 255, 255, amt), false);
	}
};

