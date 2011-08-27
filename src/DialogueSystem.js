function DialogueSystem() {
	this.events = null;
	this.activeEvent = -1;
}

DialogueSystem.prototype.read = function(data) {
	this.events = data;
};

DialogueSystem.prototype.trigger = function(stage, trigger, forceTrigger) {
	for (var i = 0; i < this.events.length; i++) {
		var e = this.events[i];
		if ((e.stage == stage || e.stage == "") && e.trigger == trigger && e.cues.length != 0 && (!e.triggered || forceTrigger)) {
			e.triggered = true;
			this.activeEvent = i;
			app.startDialogue();
			return true;
		}
	}
	return false;
};

DialogueSystem.prototype.resetTrigger = function(stage, trigger) {
	for (var i = 0; i < this.events.length; i++) {
		var e = this.events[i];
		if (e.stage == stage && e.trigger == trigger) {
			e.triggered = false;
			break;
		}
	}
};

DialogueSystem.prototype.resetAllTriggers = function() {
	for (var i = 0; i < this.events.length; i++) {
		this.events[i].triggered = false;
	}
};

DialogueSystem.prototype.isTriggered = function(stage, trigger) {
	for (var i = 0; i < this.events.length; i++) {
		var e = this.events[i];
		if (e.stage == stage && e.trigger == trigger) {
			return e.triggered;
		}
	}

	return false;
};

DialogueSystem.prototype.exists = function(stage, trigger) {
	for (var i = 0; i < this.events.length; i++) {
		var e = this.events[i];
		if (e.stage == stage && e.trigger == trigger) {
			return true;
		}
	}
	return false;
};

DialogueSystem.prototype.getActiveCues = function() {
	return this.activeEvent == -1 ? null : this.events[this.activeEvent].cues;
};