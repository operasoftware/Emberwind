/**
 * Audio component
 *
 * @param [callback]
 */
function Audio(callback) {
	this.enabled = true;
	this.player = new SoundPlayer(callback);
	
	if(/iP(ad|od|hone)|Linux mips/i.test(navigator.userAgent)) {// todo: temporary mips
		console.log("Audio disabled for iOS devices, see http://tinyurl.com/3sj2mtz");
		this.disable(callback);

		return;
	}

	this.musicVolume = 0.5;

	var fileSuffix = null;

	// Test to see what filetypes are supported
	var a = document.createElement('audio');

	// Seeking is botched up in Chrome using anything but wav so temporarily we prefer that over ogg
	// whenever it's available.
	/*if (a.canPlayType && a.canPlayType('audio/wav').replace(/no/, '')) {
		fileSuffix = ".wav";
	} else*/ if (a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')) {
		fileSuffix = ".ogg";
	} else if (a.canPlayType && a.canPlayType('audio/aac').replace(/no/, '')) {
		fileSuffix = ".m4a";
	} else if (a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, '')) {
		fileSuffix = ".mp3";
	} else {
		console.log("Audio unsupported by your browser");
		this.disable(callback);
		return;
	}

	var res = ResourceDepot.getInstance();
	this.musicFile = res.path + "audio/music" + fileSuffix;
	this.sfxFile = res.path + "audio/sfx" + fileSuffix;

	this.player.AddChannel(this.musicFile, 0, this.musicVolume);
	// Use fewer channels on mobile devices.
	var channels = /Opera mobile|Android|Windows (ce|phone)|Symbian|Fennec/i.test(navigator.userAgent) ? 1 : 7;
	for(var c = 0; c < channels; c++){
		this.player.AddChannel(this.sfxFile, 1, 1);
	}

	Audio.instance = this;
}

Audio.instance = null;

Audio.getInstance = function() {
	if (Audio.instance === null) {
		Audio.instance = new Audio();
	}

	return Audio.instance;
};

Audio.prototype = {};
Audio.prototype.constructor = Audio;

/**
 * Disable the audio player
 *
 * @param {Function} callback Should be called when all audio resources are
 *                            loaded.
 */
Audio.prototype.disable = function (callback) {
	this.enabled = false;
	this.player.initialized = true;

	if (callback !== undefined) { callback(); }
};

/**
 * Play sound effect
 *
 * @param {[number]} fx   Handle, or times of sound
 * @param {boolean}  loop Whether to loop the effect or not
 */
Audio.prototype.playFX = function (fx, loop) {
	if (this.enabled) {
		if (loop === undefined) loop = false;
		return this.player.PlayFX(fx, loop, 1);
	}
};

Audio.prototype.playDelayedFX = function(fx, delay, loop) {
	var _this = this;
	setTimeout(function() {
		_this.playFX(fx, loop);
	}, delay);
};

/**
 * Play music track
 *
 * @param {[number]} fx   Handle, or times of sound
 * @param {boolean}  loop Whether to loop the track or not
 */
Audio.prototype.playMusic = function (fx, loop) {
	if (this.enabled) {
		if (loop === undefined) loop = true;
		return this.player.PlayFX(fx, loop, 0);
	}
};

/**
 * Stop sound with the given id from playing
 *
 * @param {number} id
 */
Audio.prototype.stopSound = function (id) {
	if (this.enabled) {
		this.player.StopSound(id);
	}
};

/**
 * Sets the music volume.
 *
 * @param {number} level the volume level.
 */
Audio.prototype.setMusicVolume = function(level) {
	if (this.enabled) {
		this.player.setVolume(level * this.musicVolume, 0);
	}
};

Audio.prototype.stopAllSoundFX = function(){
	for (var i = 0; i < this.player.channels.length; i++) {
		var channel = this.player.channels[i];
		if(channel.category == 1){
			channel.Stop();
		}
	}
};

/**
 * Draws debug information (wraps SoundPlayer)
 *
 * @param {Render} render Render instance
 */
Audio.prototype.draw = function (render) {
	if (this.enabled) {
		this.player.draw(render);
	}
};

/**
 * Class holding information about a specific channel
 *
 * @param {Audio} audio	 HTML5 Audio element
 * @param {Timer} timer
 * @param {number} category Category ID
 * @constructor
 */
function Channel(audio, timer, category) {
	this.audio_elem = audio;
	this.timer = timer;
	this.category = category;

	// Which sound ID this channel is playing
	this.id = -1;

	// Data about playing sound
	this.age = null;
	this.sound = null;
	this.loop = false;

	// Whether the channel is ready for playing or not
	this.initialized = false;
}

/**
 * Comparing function for channels. Sorts by age of channel, where a channel
 * without any playing sound is the lowest
 *
 * @param {Channel} a
 * @param {Channel} b
 * @returns {number} Whether a is greater than, equals to or less than b
 */
Channel.prototype.Compare = function(a, b) {
	if (a.age == b.age) {
		return 0;
	}
	else if (a.age === null) {
		return -1;
	}
	else if (b.age === null) {
		return 1;
	}
	else {
		return (a.age > b.age) ? -1 : 1;
	}
};

/**
 * Stops the sound playing on the channel
 */
Channel.prototype.Stop = function () {
	// Clear timer
	if (this.timer) {
		clearTimeout(this.timer);
		this.timer = null;
	}

	this.age = null;
	this.sound = null;
	this.loop = false;

	this.audio_elem.pause();
};

/**
 * Class responsible for playing actual sounds, which holds current channels.
 *
 * @constructor
 */
function SoundPlayer(callback) {
	if (callback === undefined) {
		callback = null;
	}

	this.callback = callback;
	this.initialized = false;
	this.channels = [];
	this.nextSound = 0;
	this.showControls = false;
}

/**
 * Adds a channel to the specified category
 *
 * @param {String} track	String containing relative path to track
 * @param {number} category Which category the channel is to belong to
 */
SoundPlayer.prototype.AddChannel = function(track, category, volume) {
	if (volume === undefined) volume = 1;
	var audio = document.createElement('audio');
	audio.src = track;
	audio.volume = volume;
	audio.preload = 'auto';

	// Seems to make FF actually load the audio data, but IE however fucks up
	if (audio.play && navigator.userAgent.toLowerCase().indexOf('msie') < 0) {
		audio.play();
		audio.pause();
	}

	// Create channel, setting timer to null (not playing)
	var channel = new Channel(audio, null, category);
	this.channels.push(channel);

	// Called by the event of a channel being loaded fully
	var loadedCallback = function() {
		channel.initialized = true;
		this.checkInit();
	};

	this.SortChannels();

	// Debugging
	if (this.showControls) {
		audio.controls = true;
	}

	// We need to make sure that all the data has been loaded before trying to use it
	audio.addEventListener('canplaythrough', createCallback(loadedCallback, this), false);

	document.body.appendChild(audio);

};

/**
 * Checks wheter all channels are fully initialized and fires the callback (if
 * specified)
 */
SoundPlayer.prototype.checkInit = function () {
	var init = true;
	for (var i = 0; i < this.channels.length; i++) {
		if (!this.channels[i].initialized) {
			init = false;
			break;
		}
	}

	if (init) {
		this.initialized = true;
		if (this.callback !== null) {
			this.callback();
		}
	}
};

/**
 * Sorts the channels based on age
 */
SoundPlayer.prototype.SortChannels = function() {
	this.channels.sort(Channel.prototype.Compare);
};

/**
 * Play a sound
 *
 * @param {[number]} handle
 * @param {boolean}  looping
 * @param {category} to which category the sound is to belong to
 */
SoundPlayer.prototype.PlayFX = function(handle, looping, category) {
	// Check that we got a valid sound to play
	if (!handle) {
		return -1;
	}

	var start = handle[0];
	var duration = handle[1];

	var channel = null;

	// Channels are sorted by age, so use first one from same category
	var i = 0;
	for (i = 0; i < this.channels.length; i++) {
		var ch = this.channels[i];
		if (ch.category == category && ch.initialized) {
			channel = this.channels[i];
			break;
		}
	}

	if (channel !== null) {
		// Found channel, play sound

		// Check if the channel is playing
		var playing = false;

		// If playing, reset timer
		if (channel.timer) {
			playing = true;

			clearTimeout(channel.timer);
			channel.timer = null;
		}

		channel.audio_elem.currentTime = start;
		channel.loop = looping;
		channel.sound = handle;
		channel.id = this.nextSound;

		var d = new Date();
		channel.age = d.valueOf();

		// Timeout granularity in ms
		var this_ = this;
		var timer = setTimeout(function() {
			this_.TimerEvent(this_, channel);
		}, 1000 * duration + (looping ? 0 : 200)); // Wait a bit before stopping (there's time..)
		channel.timer = timer;

		// Start sound
		if (!playing) {
			channel.audio_elem.play();
		}

		this.SortChannels();
	}

	return this.nextSound++;
};

/**
 * Stops the sound with the given ID
 *
 * @param {number} id
 */
SoundPlayer.prototype.StopSound = function (id) {
	for (var ch = 0; ch < this.channels.length; ch++) {
		if (this.channels[ch].id === id) {
			this.channels[ch].Stop();
			break;
		}
	}

	this.SortChannels();
};


/**
 * Timer function to manage stopping and looping channels
 *
 * @param {SoundPlayer} _this   SoundPlayer instance
 * @param {Channel}	 channel
 */
SoundPlayer.prototype.TimerEvent = function(this_, channel) {
	if (channel.loop) {
		var start = channel.sound[0];
		var duration = channel.sound[1];
		channel.audio_elem.currentTime = start;
		channel.timer = setTimeout(function() {
			this_.TimerEvent(this_, channel);
		}, 1000 * duration + (channel.looping ? 0 : 200));
	}
	else {
		channel.Stop();
		this_.SortChannels();
	}
};

/**
 * Sets the volume on all channels that belongs to the specifed category.
 *
 * @param {Number} volume
 * @param {Number} category
 */
SoundPlayer.prototype.setVolume = function(volume, category) {
	for (var i = 0; i < this.channels.length; i++) {
		var channel = this.channels[i];
		if (channel.category == category)
			channel.audio_elem.volume = volume;
	}
};

/**
 * Draws debug information
 *
 * @param {Render} render Render instance
 */
SoundPlayer.prototype.draw = function (render) {
	var w = 250;
	var h = 20 + this.channels.length * 20;
	var y0 = 20;

	render.drawFilledRect(Math.floor(render.getWidth() / 2) - w/2, y0,
	                      Math.floor(render.getWidth() / 2) + w/2, y0 + h,
						  new Pixel32(0, 0, 0, 128));

	var lineX0 = Math.floor(render.getWidth()/2) - w/2 + 20;
	var lineX1 = lineX0 + w - 40;
	var lineY = y0 + 20;
	var lineCol = new Pixel32(0, 200, 0);
	var playCol = new Pixel32(200, 0, 0);

	for (var c = 0; c < this.channels.length; c++) {
		var audio_elem = this.channels[c].audio_elem;
		var barX = lineX0 + Math.floor((lineX1-lineX0) * (audio_elem.currentTime/audio_elem.duration));

		render.drawLine(lineX0, lineY, lineX1, lineY, lineCol);
		render.drawLine(barX, lineY-5, barX, lineY+5,
		                audio_elem.paused ? lineCol : playCol);

		lineY += 20;
	}

};

