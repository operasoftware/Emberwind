/**
 * Trigger.js
 * 
 * Depends on Common.js, Render.js, Collisions.js
 */

/**
 * TriggerParticle class
 */
TriggerParticle.prototype = {};
TriggerParticle.prototype.constructor = TriggerParticle;

/**
 * TriggerParticle is a base class for any object used by the trigger
 * system. It needs to be able to return the position and whether the
 * object has turned from it's original direction. (since triggers may
 * need to be flipped) 
 * 
 * @returns {TriggerParticle}
 */
function TriggerParticle() { 
}

/**
 * Default position
 */
TriggerParticle.prototype.ZERO = new Vec2(0, 0);

/**
 * @returns whether this particle is flipped
 */
TriggerParticle.prototype.hasTurned = function() {
    return false;
};

/**
 * gives particle position
 * 
 * @returns Vec2
 */
TriggerParticle.prototype.getPos = function() {
    return this.ZERO;
};

/**
 * TriggerVolume class
 */
TriggerVolume.prototype = {};
TriggerVolume.prototype.constructor = TriggerVolume;

/**
 * A volume that can send a trigger signal if a trigger object enters it.
 * If the volume has a target the events are sent to it. If not the events are sent to the entity entering.
 * 
 * @param name is string
 * @param rect is a Rectf or null
 * @param parent is a TriggerParticle or null
 * @param target is an object with onTrigger(event, volume, object) method, or null
 * @param [onenter] is a string, signaled when something enters the volume.
 * @param [onexit] is a string, signaled when something exits the volume.
 * @returns {TriggerVolume}
 */
function TriggerVolume(name, rect, parent, target, onenter, onexit) {
    assert(name != null && ( onenter != null || onexit != null));    
    assert(rect instanceof Rectf);
    assert(parent === null || parent instanceof TriggerParticle);
    assert(target !== undefined);
    if(onenter === undefined) onenter = null;
    if(onexit === undefined) onexit = null;

    this.name = name;
    this.rect = rect;
    this.parent = parent;
    this.target = target;
    this.onenter = onenter;
    this.onexit = onexit;
}

/**
 * checks for trigger object to overlap this volume
 * 
 * @param loacation is a Vec2
 * @param object is a TriggerObject
 * @returns boolean
 */
TriggerVolume.prototype.overlaps = function(location, object) {
    assert(location instanceof Point2 && object instanceof TriggerObject);
    var r = this.getWorldSpaceRect();
    if (object.isRect()) {
        var or = object.getRect();
        return r.overlaps(or, location);
    } else {
        var circles = object.getCircles(), i;
        for (i = 0; i < circles.length; i++) {
            if (r.overlaps(circles[i], location)) {
                return true;
            }
        }
        return false;
    }
};

/**
 * gives center point of the world rectangle
 * 
 * @returns {Vec2}
 */
TriggerVolume.prototype.getCenter = function() {
    return this.getWorldSpaceRect().center();
};

/**
 * @returns current rectangle
 */
TriggerVolume.prototype.getRect = function() {
    return this.rect;
};

/**
 * gives rectangle, transformed according parent position
 * 
 * @returns {Rectf}
 */
TriggerVolume.prototype.getWorldSpaceRect = function() {
	var r = this.rect;

	if (this.parent !== null) {
		if (this.parent.hasTurned()) {
			r = r.invert(true);
		}
		r = r.offset(this.parent.getPos());
	}

	return r;
};

/**
 * updates trigger area
 * 
 * @param rect is a Rectf
 */
TriggerVolume.prototype.updateRect = function(rect) {
    assert(rect instanceof Rectf);
    this.rect = rect;
};

/**
 * @returns parent particle if any
 */
TriggerVolume.prototype.getParent = function() {
    return this.parent;
};

/**
 * clears parent reference
 */
TriggerVolume.prototype.orphan = function() {
    this.parent = null;
};

/**
 * color for volume visualization
 */
TriggerVolume.prototype.color = new Pixel32(255, 255, 255, 64);

/**
 * draws volume
 * 
 * @param render is a Render instance
 * @param x is camera x position
 * @param y is camera y position
 */
TriggerVolume.prototype.draw = function(render, x, y) {
    assert(render instanceof Render);
    var rect = this.getWorldSpaceRect().offset(x, y);
    render.drawRect(rect.x0, rect.y0, rect.x1, rect.y1, this.color);
};

/**
 * TriggerObject class
 */
TriggerObject.prototype = {};
TriggerObject.prototype.constructor = TriggerObject;

/**
 * A trigger object is an entity that can make trigger volumes signal its events.
 * 
 * @param particle is a TriggerParticle
 * @param target is an object with onTrigger(event, volume, object) method
 * @param shapes is either a {Rectf} or an array of {Circle} objects, non-empty
 * @returns {TriggerObject}
 */
function TriggerObject(particle, target, shapes) {
    assert(particle instanceof TriggerParticle && target != null);
    this.particle = particle;
    this.target = target;
    if (shapes instanceof Rectf) {
        this.rect = shapes;
        this.circles = null;
    } else if (shapes instanceof Array) {
        assert(shapes.length > 0);
        var cursor = shapes[0], r = cursor.r, x = cursor.c.x, y = cursor.c.y, i;
        var x0 = x - r, y0 = y - r, x1 = x + r, y1 = y + r;
        with (Math) {
            for (i = 0; i < shapes.length; i++) {
                cursor = shapes[i];
                r = cursor.r;
                x = cursor.c.x;
                y = cursor.c.y;
                x0 = min(x0, x - r);
                y0 = min(y0, y - r);
                x1 = max(x1, x + r);
                y1 = max(y1, y + r);
            }
        }
        this.rect = new Rectf(x0, y0, x1, y1);
        this.circles = shapes;
    } else {
        assert(false);
    }
}

/**
 * determines whether this trigger object is a bunch of circles or a rectangle
 * 
 * @returns {Boolean}
 */
TriggerObject.prototype.isRect = function() {
    return this.circles == null;
};

/**
 * gives rectangular area around this object
 * 
 * @returns {Rectf}
 */
TriggerObject.prototype.getRect = function() {
    return this.rect;
};

/**
 * in case if this object is build of circles, gives them
 * 
 * @returns array of Circle instances
 */
TriggerObject.prototype.getCircles = function() {
    assert(!this.isRect());
    return this.circles;
};

/**
 * color for object visualization
 */
TriggerObject.prototype.color = new Pixel32(255, 255, 0, 255);

/**
 * draws object
 * 
 * @param render is a Render instance
 * @param x is camera x position
 * @param y is camera y position
 */
TriggerObject.prototype.draw = function(render, x, y) {
    assert(render instanceof Render);
    if (this.isRect()) {
        var rect = this.rect.offset(this.particle.getPos()).offset(x, y);
        render.drawRect(rect.x0, rect.y0, rect.x1, rect.y1, this.color);
    } else {
        var i, pos = this.particle.getPos(), circle;
        for (i = 0; i < this.circles.length; i++) {
            circle = this.circles[i]; 
            var cx = pos.x + circle.c.x + x, cy = pos.y + circle.c.y + y;
            render.drawCircle(cx, cy, circle.r, this.color);
        }
    }
};

/*
 * Utility classes, internal to TriggerSystem
 */

/**
 * Set class
 */
Set.prototype = {};
Set.prototype.constructor = Set;

/**
 * Set is a collection where each element is unique, elements are compared by reference.
 * Elements property is accessible as array. 
 * 
 * @param filter is type of elements
 * @returns {Set}
 */
function Set(filter) {
    this.elements = [];
    this.filter = filter;
}

/**
 * adds object to the set without checking containment check
 * 
 * @param element is an object
 */
Set.prototype.push = function(element) {
    assert(element instanceof this.filter);
    this.elements.push(element);
};

/**
 * adds an object if it is not already in the set
 * 
 * @param element is an object to insert
 * @param property is an optional name of the property to compare by
 */
Set.prototype.add = function(element, property) {
    if (this.findIndex(element, property, true) == -1) {
        this.elements.push(element);
        return true;
    } else {
        return false;
    }
};

/**
 * looks up for an object
 * 
 * @param element is an object to compare to, or a container of such object
 * @param property is optional string, means that we compare to a field of set elements
 * @param isContainer is optional boolean, if property is absent then isContainer is true. 
 * @returns a index of matching element from the set or -1 if none is found
 */
Set.prototype.findIndex = function(element, property, isContainer) {
    assert(property !== null && isContainer !== null);
    var isProperty = property !== undefined;
    isContainer = isContainer === undefined? true : isContainer;
    assert(isProperty || isContainer); // !isProperty -> isContainer
    var value = isContainer ? this.resolve(element, property) : element;
    var result;
    for (i = 0; i < this.elements.length; i++) {
        var cursor = this.resolve(this.elements[i], property);
        if (cursor == value) {
            return i;
        } else if (value instanceof TriggerObject && value.particle === cursor) {
            return i;
        }
    }
    return -1;
};

/**
 * resolve property chain
 * 
 * @param element is an object
 * @param property is a string or an array of strings or undefined
 * @returns resolved value
 */
Set.prototype.resolve = function(element, property) {
    if (property instanceof Array) {
        var result = element, i;
        for (i = 0; i < property.length; i++) {
            result = result[property[i]];
        }
		return result;
    } else if (property === undefined) {
        return element;
    } else {
        return element[property];
    }
};

/**
 * looks up for an object
 * 
 * @param element is an object to compare to, or a container of such object
 * @param property is optional string, means that we compare to a field of set elements
 * @param isContainer is optional boolean, if property is absent then isContainer is true. 
 * @returns a matching element from the set or null if none is found
 */
Set.prototype.find = function(element, property, isContainer) {
    var index = this.findIndex(element, property, isContainer);
    return index == -1 ? null : this.elements[index];
};

/**
 * removes an element
 * 
 * @param index is the position of element in the array
 * @returns a matching element from the set or null is none is removed
 */
Set.prototype.removeByIndex = function(index) {
    if (index == -1) {
        return null;
    } else {
        var result = this.elements[index];
        if (index != this.elements.length - 1) {
            this.elements[index] = this.elements[this.elements.length - 1];
        }
        this.elements.pop();
        return result;
    }
};

/**
 * removes an element
 * 
 * @param element is an object to compare to, or a container of such object
 * @param property is optional string, means that we compare to a field of set elements
 * @param isContainer is optional boolean, if property is absent then isContainer is true. 
 * @returns a matching element from the set or null is none is removed
 */
Set.prototype.remove = function(element, property, isContainer) {
    var index = this.findIndex(element, property, isContainer);
    return this.removeByIndex(index);
};

/**
 * remove all element from the set
 */
Set.prototype.clear = function() {
    if (!this.isEmpty()) {
        this.elements = [];
    }
};

/**
 * queries whether this set has elements
 * 
 * @returns {Boolean}
 */
Set.prototype.isEmpty = function() {
    return this.elements.length == 0;
};

/**
 * @returns number of elements in the set
 */
Set.prototype.size = function() {
    return this.elements.length;
};

/**
 * TriggerSystemSignal class
 */
TriggerSystemSignal.prototype = {};
TriggerSystemSignal.prototype.constructor = TriggerSystemSignal;

/**
 * create an object that describes a single signal
 * 
 * @param volume is a TriggerVolume
 * @param object is a TriggerObject
 * @param isEnter is boolean
 * @returns {TriggerSystemSignal}
 */
function TriggerSystemSignal(volume, object, isEnter) {
    assert(volume instanceof TriggerVolume && object instanceof TriggerObject);
    assert(isEnter != null);
    this.volume = volume;
    this.object = object;
    this.isEnter = isEnter;
}

/**
 * sends the persisted signal to either volume or object
 */
TriggerSystemSignal.prototype.signal = function() {
    var event = this.isEnter ? this.volume.onenter : this.volume.onexit;
    if (event != "") {
        var target = this.volume.target == null ? this.object.target : this.volume.target;
        if (target != null) {
            target(event, this.volume, this.object);
        }
    }
};

/**
 * TriggerSystemFlushable class
 */
TriggerSystemFlushable.prototype = {};
TriggerSystemFlushable.prototype.constructor = TriggerSystemFlushable;

/**
 * Flushable is an entity that can be marked for deletion
 * 
 * @param flushed is an initial state, defaults to false
 * @returns {TriggerSystemFlushable}
 */
function TriggerSystemFlushable(flushed) {
    assert(flushed !== null);
    this.flushed = flushed == true;
}

/**
 * removes object, can be called multiple times
 */
TriggerSystemFlushable.prototype.flush = function() {
    this.flushed = true;
};

/**
 * makes an object valid again
 */
TriggerSystemFlushable.prototype.restore = function() {
    this.flushed = false;
};

/**
 * @returns {Boolean} whether this object is flushed (marked for deletion)
 */
TriggerSystemFlushable.prototype.isFlushed = function() {
    return this.flushed;
};

/**
 * TriggerSystemObject class
 */
TriggerSystemObject.prototype = new TriggerSystemFlushable();
TriggerSystemObject.prototype.constructor = TriggerSystemObject;

/**
 * TriggerSystemObject captures relation between trigger object and trigger system volumes 
 * 
 * @param object is a TriggerObject
 * @param flush is an initial state, defaults to false
 * @returns {TriggerSystemObject}
 */
function TriggerSystemObject(object, flush) {
    TriggerSystemFlushable.apply(this, [flush]);
    assert(object instanceof TriggerObject);
    this.object = object;
    this.volumes = new Set(TriggerSystemVolume);
}

/**
 * TriggerSystemVolume class
 */
TriggerSystemVolume.prototype = new TriggerSystemFlushable();
TriggerSystemVolume.prototype.constructor = TriggerSystemVolume;

/**
 * TriggerSystemVolume captures relation between trigger volume and trigger system objects 
 * 
 * @param volume is a TriggerVolume
 * @param flush is an initial state, defaults to false
 * @returns {TriggerSystemVolume}
 */
function TriggerSystemVolume(volume, flush) {
    TriggerSystemFlushable.apply(this, [flush]);
    assert(volume instanceof TriggerVolume);
    this.volume = volume;
    this.objects = new Set(TriggerSystemObject);
}

/**
 * TriggerSystemGrid class
 */
TriggerSystemGrid.prototype = {};
TriggerSystemGrid.prototype.constructor = TriggerSystemGrid;

/**
 * Implicit grid is a spatial partitioning class. The world is partitioned into a uniform
 * grid and the objects inserted are stored in row and column bit arrays. To check if an
 * object with id 'i' exists in a specific grid cell you check bit 'i' in the row and column 
 * bit arrays.
 * This representation makes it very easy to check for potential overlaps by using some
 * bit arithmetic.
 * 
 * @returns {TriggerSystemDeleteRow}
 */
function TriggerSystemGrid() {
    this.rows = [];
    this.columns = [];
    this.mergedColumns = [];
    this.mergedRows = [];
    this.result = { length : 0, elements : []};
}

/**
 * sets n elements to 0
 * 
 * @param array is an Array
 * @param size is number of elements to set
 */
TriggerSystemGrid.prototype.blank = function(array, size) {
    var i;
    for (i = 0; i < size; i++) {
        array[i] = 0;
    }
};

/**
 * finds a bound for iteration
 * 
 * @param value is a rectangle coordinate
 * @param isHorizontal is boolean
 * @returns integer
 */
TriggerSystemGrid.prototype.clamp = function(value, isHorizontal) {
    var top;
    value = Math.floor(value / (isHorizontal ? this.cellWidth : this.cellHeight));
    if (value < 0) {
        return 0;
    } else if (value >= (top = (isHorizontal ? this.gridResolutionH : this.gridResolutionV))) {
        return top;
    } else {
        return value;
    }
};

/**
 * Try to initialize the grid with the given parameters. If there's not enough memory
 * the grid will reduce its resolution to fit. If there's not enough memory to make
 * at least a 2x2 grid it will return false.
 * 
 * @param w is client area width in pixels
 * @param h is client area height in pixels
 * @param gridResH is narrowed client area width in pixels
 * @param gridResV is narrowed client area height in pixels
 * @param objectsCount is number of rectangles that can be in the area
 */
TriggerSystemGrid.prototype.init = function(w, h, gridResolutionH, gridResolutionV, objectsCount) {
    this.cellSize = Math.ceil(objectsCount / 32);
    this.width = w;
    this.height = h;
    this.cellWidth = w / gridResolutionH;
    this.cellHeight = h / gridResolutionV;
    this.gridResolutionH = gridResolutionH;
    this.gridResolutionV = gridResolutionV;
    this.size = (this.gridResolutionH + this.gridResolutionV) * this.cellSize;
    
    if (gridResolutionH > 1 && gridResolutionV > 1) {
        // clear arrays
        this.blank(this.rows, this.gridResolutionV * this.cellSize);
        this.blank(this.columns, this.gridResolutionH * this.cellSize);
        return true;
    } else {
        return false;
    }
};

/**
 * Insert a rectangle into the grid.
 * 
 * @param id is a number
 * @param rect is a Rectf
 */
TriggerSystemGrid.prototype.insert = function(id, rect) {
    var sx = this.clamp(rect.x0, true), ex = this.clamp(rect.x1, true);
    var sy = this.clamp(rect.y0, false), ey = this.clamp(rect.y1, false);
    var i;
    for (i = sx; i <= ex; i++) {
        this.columns[i * this.cellSize + Math.floor(id / 32)] |= (1 << (id % 32));
    }
    for (i = sy; i <= ey; i++) {
        this.rows[i * this.cellSize + Math.floor(id / 32)] |= (1 << (id % 32));
    }
};

/**
 * Check for overlap with the rectangles in the grid.
 * 
 * @param rect is a Rectf
 * @returns {length, elements}
 */
TriggerSystemGrid.prototype.test = function(rect) {
    this.blank(this.mergedRows, this.cellSize);
    this.blank(this.mergedColumns, this.cellSize);
    
    var sx = this.clamp(rect.x0, true), ex = this.clamp(rect.x1, true);
    var sy = this.clamp(rect.y0, false), ey = this.clamp(rect.y1, false);
    
    var x, y, i, j;
    // merge rows into a single value
    for (y = sy; y <= ey; y++) {
        for (i = 0; i < this.cellSize; i++) {
            this.mergedRows[i] |= this.rows[y * this.cellSize + i];
        }
    }
        
    // merge columns into a single value
    for (x = sx; x <= ex; x++) {
        for (i = 0; i < this.cellSize; i++) {
            this.mergedColumns[i] |= this.columns[x * this.cellSize + i];
        }
    }
    
    // collect results
    var count = 0; 
    for (i = 0; i < this.cellSize; i++) {
        var mask = this.mergedRows[i] & this.mergedColumns[i];
        for (j = 0; (j < 32) && (mask != 0); j++) {
            if ((1 & mask) == 1) {
                this.result.elements[count] = i * 32 + j;
                count++;
            }
            mask >>>= 1;
        }
    }
    this.result.length = count;
    return this.result;
};

/*
 * Trigger System
 */

/**
 * TriggerSystem class
 */
TriggerSystem.prototype = {};
TriggerSystem.prototype.constructor = TriggerSystem;

/**
 * A manager for trigger volumes and routing of trigger signals.
 * 
 * @returns {TriggerSystem}
 */
function TriggerSystem() {
    this.grid = new TriggerSystemGrid(1024 * 32);
    this.volumes = new Set(TriggerSystemVolume);
    this.objects = new Set(TriggerSystemObject);
    this.signals = new Set(TriggerSystemSignal);
    this.volumeDeathRow = new Set(TriggerVolume);
    this.objectDeathRow = new Set(TriggerParticle);
}

/*
 * Trigger system private methods
 */

/**
 * tires up system volume and system object and reports a signal event
 * 
 * @param overlaps is boolean, true if volume overlaps object
 * @param volume is a TriggerSystemVolume
 * @param object is a TriggerSystemObject
 */
TriggerSystem.prototype.report = function(overlaps, volume, object) {
    assert(volume instanceof TriggerSystemVolume && object instanceof TriggerSystemObject);
    var signaled = false;
    if (overlaps) {
        // add a new relation
        if (volume.objects.add(object)) {
            object.volumes.push(volume);
            signaled = true;
        }
    } else {
        // remove a relation
        if (volume.objects.remove(object) != null) {
            object.volumes.remove(volume);
            signaled = true;
        }
    }
    // add the message
    if (signaled) {
        this.signals.push(new TriggerSystemSignal(volume.volume, object.object, overlaps));
    }
};

/**
 * draws triggers on screen whenever a render is set
 * 
 * @param render is a Render instance
 * @param x is camera x position
 * @param y is camera y position
 */
TriggerSystem.prototype.draw = function(render, x, y) {
    assert(render instanceof Render, "invalid render is set: " + render);
    var i;
    // draw volumes
    for (i = 0; i < this.volumes.size(); i++) {
        this.volumes.elements[i].volume.draw(render, x, y);
    }
    // draw objects
    for (i = 0; i < this.objects.size(); i++) {
        this.objects.elements[i].object.draw(render, x, y);
    }
};

/*
 * Trigger system public methods
 */

/**
 * adds a trigger object
 * 
 * @param object is a TriggerObject
 */
TriggerSystem.prototype.addObject = function(object) {
    assert(object instanceof TriggerObject);
    if (this.objectDeathRow.remove(object.particle) == null || 
            this.objects.find(object, "object", false) == null) {
        this.objects.push(new TriggerSystemObject(object));
    }
};

/**
 * puts a particle onto death row
 * 
 * @param particle is a TriggerParticle
 */
TriggerSystem.prototype.removeObject = function(particle) {
    this.objectDeathRow.add(particle);
};

/**
 * insert whenever volume is not on death row and is not within volumes
 * 
 * @param volume is a TriggerVolume
 */
TriggerSystem.prototype.addVolume = function(volume) {
    // insert whenever volume is not on death row and is not within volumes 
    if (this.volumeDeathRow.remove(volume) == null ||
            this.volumes.find(volume, "volume", false) == null) {
        this.volumes.push(new TriggerSystemVolume(volume));
    }
};

/**
 * puts trigger volume on a death row with a possible deletion mark
 * 
 * @param volume is a TriggerVolume
 */
TriggerSystem.prototype.removeVolume = function(volume) {
    if (volume !== null && this.volumeDeathRow.add(volume)) {
        this.flushVolume(volume);
    }
};

/**
 * find trigger volume by name
 * 
 * @returns TriggerVolume or null
 */
TriggerSystem.prototype.getVolume = function() {
    var result = this.volumes.find(name, ["volume", "name"], false);
    return result == null ? null : result.volume;
};

/**
 * resets state of trigger system
 */
TriggerSystem.prototype.reset = function() {
    this.volumes.clear();
    this.objects.clear();
    this.signals.clear();
    this.volumeDeathRow.clear();
    this.objectDeathRow.clear();
}; 

/**
 * Forces all objects to leave the volume (if they're still there next frame they
 * will enter again).
 * 
 * @param volume is a TriggerVolume
 */
TriggerSystem.prototype.flushVolume = function(volume) {
    assert(volume instanceof TriggerVolume);
    var vi = this.volumes.find(volume, "volume", false);
    if (vi != null) {
        vi.flush();
    }
};

/**
 * prepares particle for removal
 * 
 * @param particle is a TriggerObject
 */
TriggerSystem.prototype.flushObject = function(particle) {
    assert(particle instanceof TriggerParticle);
    var oi = this.objects.find(particle, ["object", "particle"], false);
    if (oi != null) {
        oi.flush();
    }
};

/**
 * checks whether there are elements in the volume
 * 
 * @param volume is a TriggerVolume
 * @returns boolean
 */
TriggerSystem.prototype.isEmpty = function(volume) {
    assert(volume instanceof TriggerVolume);
    var vi = this.volumes.find(volume, "volume", false);
    return vi == null ? false : vi.objects.isEmpty();
};

/**
 * finds particles by volume
 * 
 * @param volume is a TriggerVolume to search by
 * @returns {Array} is list of TriggerParticle
 */
TriggerSystem.prototype.getContainedObjects = function(volume) {
    assert(volume instanceof TriggerVolume);
    var result = [], i;
    var vi = this.volumes.find(volume, "volume", false);
    if (vi != null) {
        for (i = 0; i < vi.objects.size(); i++) {
            result.push(vi.objects.elements[i].object.particle);
        }
    }
    return result;
};

/**
 * finds enter events by particle
 * 
 * @param particle is a TriggerParticle
 * @returns array of strings
 */
TriggerSystem.prototype.getEnterEventsForContainingVolumes = function(particle) {
    assert(particle instanceof TriggerParticle);
    var result = new Set(String), i, j;
    var oi = this.objects.find(particle, ["object", "particle"], false);
    if (oi != null) {
        for (j = 0; j < oi.volumes.size(); j++) {
            // duplicates are filtered
            result.add(oi.volumes.elements[j].volume.onenter);
        }
    }
    return result.elements;
};

/**
 * remove parents from all the volumes
 */
TriggerSystem.prototype.orphanAllVolumes = function() {
    var i;
    for (i = 0; i < this.volumes.size(); i++) {
        this.volumes.elements[i].volume.orphan();
    }
};

/**
 * flushed objects are deleted
 */
TriggerSystem.prototype.updateDeathRows = function() {
    // flush all volumes that are marked for flushing
    var i;
    for (i = 0; i < this.volumes.size(); i++) {
        var volume = this.volumes.elements[i];
        if (volume.isFlushed()) {
            while (!volume.objects.isEmpty()) {
                this.report(false, volume, volume.objects.elements[0]);
            }
            volume.restore();
        }
    }
    
    // flush all objects that are marked for flushing
    for (i = 0; i < this.objects.size(); i++) {
        var object = this.objects.elements[i];
        if (object.isFlushed()) {
            while (!object.volumes.isEmpty()) {
                this.report(false, object.volumes.elements[0] , object);
            }
            object.restore();
        }
    }
    
    // process volumes death row
    for (i = 0; i < this.volumeDeathRow.size(); i++) {
        this.volumes.remove(this.volumeDeathRow.elements[i], "volume", false);
    }
    this.volumeDeathRow.clear();
    
    // process objects death row
    for (i = 0; i < this.objectDeathRow.size(); i++) {
        this.objects.remove(this.objectDeathRow.elements[i], ["object", "particle"], false);
    }
    this.objectDeathRow.clear();
};

/**
 * updates trigger collision detection
 * 
 * @param ext is a {Rectf}
 */
TriggerSystem.prototype.update = function(ext) {
    assert(ext instanceof Rectf);
    // Update any items that was pushed on the death row prior to this update
    this.updateDeathRows();
    
    // initialize grid to speed up intersection tests
    var i, j, k, volume, object;
    if (this.grid.init(ext.width, ext.height, ext.width / (96 * 2), ext.height / (96 * 2), this.volumes.size())) {
        // insert all the volumes using their world space rect
        for (i = 0; i < this.volumes.size(); i++) {
            this.grid.insert(i, this.volumes.elements[i].volume.getWorldSpaceRect());
        }
        // check for overlaps using grid
        for (i = 0; i < this.objects.size(); i++) {
            object = this.objects.elements[i];
            var wsr = object.object.rect.offset(object.object.particle.getPos());
            // test world space rect against the grid
            var res = this.grid.test(wsr);
            // go through the potential intersections
            for (j = 0; j < res.length; j++) {
                volume = this.volumes.elements[res.elements[j]];
                this.report(volume.volume.overlaps(object.object.particle.getPos(), object.object), volume, object);
            }
            // We need to go over all the volumes that has this object in it and see if
            // there's any volume that were culled away completely. If we find such a volume we need
            // to remove this object from it.
            for (j = 0; j < object.volumes.size();) {
                volume = object.volumes.elements[j];
                var found = false;
                for (k = 0; k < res.length && !found; k++) {
                    found = this.volumes.elements[res.elements[k]] == volume;
                }
                if (found) {
                    j++;
                } else {
                    this.report(false, volume, object);
                }
            }
        }
    } else {
        for (i = 0; i < this.objects.size(); i++) {
            object = this.objects.elements[i];
            // go through the potential intersections
            for (j = 0; j < this.volumes.size(); j++) {
                volume = this.volumes.elements[j];
                this.report(volume.volume.overlaps(object.object, object.object.particle.getPos()), volume, object);
            }
        }
    }
    
    // emit signals
    var i;
    for (i = 0; i < this.signals.size(); i++) {
        this.signals.elements[i].signal();
    }
    this.signals.clear();
};







