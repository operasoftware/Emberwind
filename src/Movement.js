// TODO:
// PlatformComponent
//


// BaseMovementComponent  ----------------------------------------------------

// Constants
var kInfiniteForce = -1;
var kContactEpsilon = 1;
var kInfinitesimalDistance = 0.01;
var kMinTimeThreshold = 0.001;
var kWalkableAngle = 0.5;
var kMinJumpSpeed = 40.0;
var kMaxDropHeight = 1000;
var kDropEpsilon = 1.0;
var kWallAngle = 0.866; // cos(30 degrees)


/**
 * MovementComponent class held by a game object
 *
 * @constructor
 */
function BaseMovementComponent() {
    // "Enumerator" :P
    this.CollisionMode = { 'kNormal' : 1, 'kDiscardOneSided' : 2, 'kDiscardNormal' : 3};

	this.spheres    = [];               // @type [Circle]
    this.contacts   = [];               // @type [CollisionContact]
    this.desiredVel = new Vec2(0, 0);   // @type Vec2
    this.force      = new Vec2(0, 0);   // @type Vec2
    this.velocity   = new Vec2(0, 0);   // @type Vec2
    this.position   = new Vec2(0, 0);   // @type Vec2
    this.gravity    = -9.82;            // @type number
    this.lastPosition = new Vec2(0, 0); // @type Vec2
    this.owner      = null;             // @type {Object}
    this.gravityStack  = [];            // @type {[number]}
    this.collisionMode = this.CollisionMode.kNormal; // @type CollisionMode

    this.platform = null;               // TODO

    // This is a placeholder for the "collision provider", which is a function
    // to be loaded during the initialization of the movement component. It is
    // expected that the function returns an array of ConvexShape objects
    this.collisionProvider = null;

    this.localContactPoints = []; // @type [CollisionContact]
    this.tempContacts = []; // @type [Collisioncontact]
    this.shapes = []; // @type [ConvexShape]
}

/**
 * Initializer for the BaseMovementComponent
 *
 * @param {number}     gravity
 * @param {GameObject} owner
 * @param {[Circle]}   spheres
 * @param {Function}       provider
 */
BaseMovementComponent.prototype.Init = function (gravity, owner, spheres, provider) {
    this.gravity = gravity;
    this.owner = owner;
    this.maxForce = new Vec2(kInfiniteForce, kInfiniteForce);
    this.spheres = spheres;

    this.collisionProvider = provider;
};

/**
 * Sets the desired horizontal velocity
 *
 * @param {number} desiredVel Desired velocity
 * @param {number} maxForce   Optional maximum horizontal force
 */
BaseMovementComponent.prototype.SetDesiredVelocityHoriz = function (desiredVel, maxForce) {
    maxForce = typeof(maxForce) != 'undefined' ? maxForce : kInfiniteForce;

    this.desiredVel.x = desiredVel;
    this.maxForce.x   = maxForce;
};

/**
 * Sets the desired vertical velocity
 *
 * @param {number} desiredVel Desired velocity
 * @param {number} maxForce   Optional maximum vertical force
 */
BaseMovementComponent.prototype.SetDesiredVelocityVert = function (desiredVel, maxForce) {
    maxForce = typeof(maxForce) != 'undefined' ? maxForce : kInfiniteForce;

    this.desiredVel.y = desiredVel;
    this.maxForce.y   = maxForce;

};

/**
 * Sets the desired velocity
 *
 * @param {Vec2}   desiredVel Desired velocity
 * @param {number} maxForce   Optional maximum force
 */
BaseMovementComponent.prototype.SetDesiredVelocity = function (desiredVel, maxForce) {
    maxForce = typeof(maxForce) != 'undefined' ? maxForce : kInfiniteForce;

    this.desiredVel = desiredVel;
    this.maxForce.x = maxForce;
    this.maxForce.y = maxForce;
};

/**
 * @returns {Vec2}
 */
BaseMovementComponent.prototype.GetDesiredVelocity = function () {
    return this.desiredVel;
};

/**
 * Sets the desired velocity
 *
 * @param {number} desiredVel
 * @param {number} maxForce
 */
BaseMovementComponent.prototype.SetDesiredVelocityTan = function (desiredVel, maxForce) {
    maxForce = typeof(maxForce) != 'undefined' ? maxForce : kInfiniteForce;

    if (this.IsOnFloor()) {
        var slope = this.GetSlope();
        if (desiredVel > 0) {
            slope += 0.5;
        }
        else {
            slope -= 0.5;
        }
        this.desiredVel.x = Math.cos(slope) * desiredVel;
        this.desiredVel.y = Math.sin(slope) * desiredVel;
        this.maxForce.x   = maxForce;
    }
    else {
        this.SetDesiredVelocityHoriz(desiredVel, maxForce);
    }

    if (this.desiredVel.y < 0) {
        this.desiredVel.y = 0;
    }
};

/**
 * Push a gravity on the gravity stack
 * 
 * @param {number} g
 */
BaseMovementComponent.prototype.PushGravity = function (g) {
    this.gravityStack.push(this.gravity);
    this.gravity = g;
};

/**
 * Pop a gravity off the gravity stack
 */
BaseMovementComponent.prototype.PopGravity = function () {
    this.gravity = this.gravityStack.pop();
};

/**
 * Teleport to a location. No checks..
 *
 * @param {Vec2} pos
 */
BaseMovementComponent.prototype.SetPosition = function (pos) {
    this.position = pos;
    this.lastPosition = pos;
};


BaseMovementComponent.prototype.ClearSpheres = function () {
    this.spheres = [];
};

/**
 * From contacts determine best move to get out of overlaps.
 *
 * @return {Vec2} Move to take
 */
BaseMovementComponent.prototype.FindPushOutMove = function () {
    var moveOut = new Vec2(0, 0);

    if (this.contacts.length > 0) {
        // Find smallest overlap.
        var smallestOverlap = this.contacts[this.contacts.length - 1];
        for (var i = 0; i < this.contacts.length; i++) {
            var c = this.contacts[i];
            if(c.depth > kContactEpsilon && (smallestOverlap === this.contacts[this.contacts.length-1] || c.depth > smallestOverlap.depth)) {
                smallestOverlap = c;
            }
        }
        if (smallestOverlap != this.contacts[this.contacts.length-1]) {
            // Move out along this normal
            moveOut.add(smallestOverlap.normal);
            moveOut.mul(smallestOverlap.depth);

            moveOut = this.ClipToContacts(moveOut);
        }
    }

    return moveOut;
};


/**
 * Do a test at the specified position with a contact epsilon. 
 *
 * @param {Vec2} pos
 * @param {number} epsilon
 * @param {[ConvexShape]} shapes
 *
 * @return {[CollisionContact]} Contacts for the given position
 */
BaseMovementComponent.prototype.FixedPosTest = function (pos, epsilon, shapes) {
    var ctc = []; // @type [CollisionContact]

    for (var iter_sph = 0; iter_sph < this.spheres.length; iter_sph++) {
        var sph = this.spheres[iter_sph];

        var tmp = new Circle(new Vec2(sph.c.x, sph.c.y), sph.r);
        tmp.r += epsilon;
        this.tempContacts = [];
        var tmpContacts = GetPenetrations(tmp, pos, shapes);
        ctc = ctc.concat(tmpContacts); 
    }

    // TODO: Not important, but in case of needed optimizations, this should,
    // according to the c++ source code be simplified. Check
    // BaseMovementComponent.cpp:167
    for (;;) {
        var noBreak = true;
        for (var c = 0; c < ctc.length; c++) {
            for (var t = 0; t < ctc.length; t++) {
                if (c == t || !ctc[t] || !ctc[c]) {
                    continue;
                }
                
                var tmp2 = new Vec2(ctc[c].point.x, ctc[c].point.y);
                tmp2.sub(ctc[t].point);
                if (Math.abs(tmp2.Dot(ctc[c].faceNormal)) < 0.001) { // Magic constant, wat is dis
                    if (ctc[c].depth < ctc[t].depth) {
                        ctc[c] = ctc[t];
                    }
                    ctc[t] = null; // Mark for removal
                    noBreak = false;
                    break;
                }
            }

            if (!noBreak) {
                break;
            }
        }

        if(noBreak) {
            break;
        }
    }

    // ctc may contain null values which must be discarded
    var ctc_ = [];

    for (var i = 0; i < ctc.length; i++) {
        if (ctc[i]) {
            ctc_.push(ctc[i]);
        }
    }

    return ctc_;
};


/**
 * Do a sweep test between from and to with a contact epsilon. store the contact
 * info and the contact time.
 *
 * @param {Vec2} from
 * @param {Vec2} to
 * @return {Object}
 */
BaseMovementComponent.prototype.SweepTest = function (from, to) {
    var foundCollision = false;
    var contactTime = 1.1;
    var contact = new CollisionContact();
    this.shapes = [];

    this.shapes = this.ExtractCollision(from, to, this.spheres); 
    for (var s = 0; s < this.spheres.length; s++) {
        for (var sit = 0; sit < this.shapes.length; sit++) {
            var cir = new Circle(new Vec2(this.spheres[s].c.x, this.spheres[s].c.y), this.spheres[s].r);            
            cir.c.add(from);
            var tofrom = new Vec2(to.x, to.y);
            tofrom.sub(from);
            var cs = GetCollisionShape(cir, tofrom, this.shapes[sit]);
            if (cs && cs.cts.length !== 0 && cs.it < contactTime) {
                foundCollision = true;
                contact.normal = cs.cts[0].normal;
                contact.point = cs.cts[0].point;
                contact.depth = 0;
                contact.material = cs.cts[0].material;
                contactTime = cs.it;
            }
        }
    }

    return {
        foundCollision : foundCollision,
        contact        : contact,
        contactTime    : contactTime
    };
};


/**
 * Build collision geometry for the region.
 *
 * @param {Vec2} from
 * @param {Vec2} to
 * @param {[Circle]}      spheres
 *
 * @return {[ConvexShape]} Array of shapes considered for collision
 */
BaseMovementComponent.prototype.ExtractCollision = function (from, to, spheres) {
    var low  = new Vec2(Math.min(from.x, to.x), Math.min(from.y, to.y));
    var high = new Vec2(Math.max(from.x, to.x), Math.min(from.y, to.y)); 
    var fromYMax = from.y;
    var kExtractEpsilon = 4;

    for (var iter_sph = 0; iter_sph < spheres.length; iter_sph++) {
        var s = spheres[iter_sph];

        low.x =  Math.min(low.x,  from.x + s.c.x - s.r - kExtractEpsilon);
        low.y =  Math.min(low.y,  from.y + s.c.y - s.r - kExtractEpsilon);
        high.x = Math.max(high.x, from.x + s.c.x + s.r + kExtractEpsilon);
        high.y = Math.max(high.y, from.y + s.c.y + s.r + kExtractEpsilon);

        low.x =  Math.min(low.x,  to.x + s.c.x - s.r - kExtractEpsilon);
        low.y =  Math.min(low.y,  to.y + s.c.y - s.r - kExtractEpsilon);
        high.x = Math.max(high.x, to.x + s.c.x + s.r + kExtractEpsilon);
        high.y = Math.max(high.y, to.y + s.c.y + s.r + kExtractEpsilon);
    
        fromYMax = Math.max(fromYMax, from.y + s.c.y + s.r);
    }

    // local shapes === [ConvexShape]
    var shapes = this.collisionProvider(Math.floor(low.x), Math.floor(high.x), Math.floor(low.y), Math.floor(high.y));

    var shapes_ = [];
    for (var iter_sha = 0; iter_sha < shapes.length; iter_sha++) {
        var sh = shapes[iter_sha];

        var oneWay = sh.type === "oneway";
        var oneWayDiscard = oneWay && fromYMax > sh.y_min;

        if ((this.collisionMode === this.CollisionMode.kDiscardOneSided) && oneWay) {
            continue;
        }
        else if ((this.collisionMode === this.CollisionMode.kDiscardNormal) && !oneWay || (oneWay && oneWayDiscard)) {
            continue;
        }
        else if ((this.collisionMode === this.CollisionMode.kNormal) && oneWayDiscard) {
            continue;
        }

        shapes_.push(sh);
    }

    return shapes_;
};


/**
 * Clip the input vector to respect the contact points given in contacts.
 *
 * @param {Vec2} v Input vector
 * @param {number} bouncyness
 * @returns {Vec2} Clipped Vector
 */
BaseMovementComponent.prototype.ClipToContacts = function (v, bouncyness) {
    bouncyness = typeof(bouncyness) != 'undefined' ? bouncyness : 0; // Default value

    var kRepulsion = 0.0001;

    if (v.MagnitudeSquared() > kInfinitesimalDistance * kInfinitesimalDistance) {
        var result = v.copy();

        // Accumulate the average normal of the contacts.
        var avgNorm = new Vec2(0, 0);

        for (var i = 0; i < this.contacts.length; i++) {
            // Add this contact normal to the average after projecting it onto the surface.
            var c = this.contacts[i];
            avgNorm.add(c.normal);

            // Project on normal
            var normProj = result.Dot(c.normal);

            // If vector is moving towards the contact, remove that part of the vector
            // we then add a tiny bit of away to make it non-stick.
            if (normProj < 0) {
                // result = result - (1.0f + bouncyness) * c.normal * normProj;
                var tmp = c.normal.copy();
                tmp.mul(normProj);
                tmp.mul(1 + bouncyness);
                result.sub(tmp);
            }
        }
        // Add a tiny bit of repulsion in the averaged normal direction.
        var mag = avgNorm.Magnitude();
        if (mag) {
            avgNorm.div(mag);
            avgNorm.mul(kRepulsion);
            result.add(avgNorm);
        }

        return result;
    }

    return v;
};


/**
 * Apply the move to the current position, using contacts to clip the movement
 *
 * @param {Vec2} move
 */
BaseMovementComponent.prototype.DoClippedMove = function (move) {
    var workingPos = new Vec2(this.position.x, this.position.y);
    if (move.MagnitudeSquared() > kInfinitesimalDistance * kInfinitesimalDistance) {
        move = this.ClipToContacts(move);

        var endPos = new Vec2(workingPos.x, workingPos.y);
        endPos.add(move);

        var maxTests = 4;
        var timeLeft = 1;
        while (timeLeft > kMinTimeThreshold && --maxTests >= 0) {
            var retVal = this.SweepTest(workingPos, endPos, 0);
            if (retVal.foundCollision) {
                // Move almost all the way. 
                // TODO: This can be improved to depend on the angle of incidence
                // Should make it such that it always moves to 95% of contact epsilon proximity.
                var moveTime = Math.max(0, retVal.contactTime - 0.001);
                var _vec2buf = endPos.copy().sub(workingPos).mul(moveTime);
                workingPos.add(_vec2buf);

                // Next we need to clip the velocity.
                this.contacts.push(retVal.contact);

                move = this.ClipToContacts(move);

                // And use up the rest of the alloted time
                timeLeft -= moveTime;

                // Figure out new point
                _vec2buf = new Vec2(move.x, move.y);
                _vec2buf.mul(timeLeft);
                _vec2buf.add(workingPos);
                endPos = _vec2buf;
            } 
            else {
                // There was no collision, move right along.
                workingPos = endPos;
                break;
            }
        }

        // Store final position, snapped to path
        this.position = workingPos;
    }
};

/**
 * Gets the slope of the current contacts
 *
 * @returns {number}
 */
BaseMovementComponent.prototype.GetSlope = function () {
    var avg = new Vec2(0, 0);
    var dwn = new Vec2(0, -1);
    for (var i = 0; i < this.contacts.length; i++) {
        if (dwn.Dot(this.contacts[i].normal) > 0) {
            avg.add(this.contacts[i].normal);
        }
    }
    var len = avg.Magnitude();
    if (len > 0) {
        avg.div(len);
    }
    var ang = Math.acos(avg.Dot(dwn));

    return avg.x < 0 ? -ang : ang;
};

/**
 * Returns true if the object is considered to be on the "floor".
 * 
 * @return {boolean}
 */
BaseMovementComponent.prototype.IsOnFloor = function () {
    for (c_it = 0; c_it < this.contacts.length; c_it++) {
        var c = this.contacts[c_it];
        if ((c.normal.Dot(new Vec2(0, -1)) > kWalkableAngle) && (c.normal.Dot(this.velocity) < kMinJumpSpeed)) {
            return true;
        }
    }
    return false;
};

/**
 * Returns true if the object is near the floor
 *
 * @param {number}                              limit
 * @param {BaseMovementComponent.CollisionMode} mode
 */
BaseMovementComponent.prototype.IsNearFloor = function (limit, mode) {
    var tempMode = this.collisionMode;
    this.collisionMode = mode;

    var result = false;
    var to = new Vec2(0, 1); to.mul(limit); to.add(this.position); // pos + YAxis * limit
    var sweepRes = this.SweepTest(this.position, to);
    if (sweepRes.foundCollision) {
        if (sweepRes.contact.normal.Dot(new Vec2(0, -1)) > kWalkableAngle) {
            result = true;
        }
    }

    this.collisionMode = tempMode;

    return result;
};

/**
 * Returns true if the object is facing a wall
 *
 * @param {boolean} left
 * @returns {boolean}
 */
BaseMovementComponent.prototype.IsFacingWall = function (left) {
	var yAxis = new Vec2(0, 1);
	var from = this.position.copy().sub(yAxis.mul(25));
	yAxis = new Vec2(0, 1);
	var to = this.position.copy().sub(yAxis.mul(25));
	to.add(new Vec2(left ? -25 : 25, 0));
	var res = this.SweepTest(from, to);

	if (res.foundCollision && res.contactTime <= 1) {
		if ((res.contact.normal.Dot(new Vec2(left ? 1 : -1, 0)) > kWallAngle) &&
		  (res.contact.normal.Dot(this.velocity) <= 0)) {
			return true;
		}
	}

	return false;
};

/**
 * Returns true if the object has contact with a wall
 *
 * @param {boolean} left
 * @returns {boolean}
 */
BaseMovementComponent.prototype.IsHittingWall = function (left) {
	for (var i = 0; i < this.contacts.length; i++) {
		if (this.contacts[i].normal.Dot(new Vec2(left ? 1 : -1, 0)) > kWallAngle) {
			return true;
		}
	}

	return false;
};

/**
 * Returns true if the object is facing an edge
 *
 * @param {boolean} left
 * @returns {boolean}
 */
BaseMovementComponent.prototype.IsFacingEdge = function (left) {
	var tmpPos = this.position.copy().add(
		new Vec2(left ? -this.spheres[0].r * 2 : this.spheres[0].r, 0));
	var from = tmpPos.copy().sub((new Vec2(0, 1)).mul(25));
	var to = tmpPos.copy().add((new Vec2(0, 1)).mul(75));
	var res = this.SweepTest(from, to);
	if (res.foundCollision && res.contactTime <= 1) {
		return false;
	}
	return true;
};

/**
 * Returns true if the object can jump
 *
 * @param {boolean} left
 * @param {number} height
 * @returns {boolean}
 */
BaseMovementComponent.prototype.CanJump = function (left, height) {
	var from = this.position.copy().sub((new Vec2(0, 1)).mul(height));
	var to = from.copy().add(new Vec2(left ? -75 : 75, 0));
	var res = this.SweepTest(from, to);
	if (res.foundCollision && res.contactTime <= 1) {
		return false;
	}
	return true;
};

/**
 * Returns true if the object can be dropped
 *
 * @param {boolean} left
 * @param {number} height
 * @returns {boolean}
 */
BaseMovementComponent.prototype.CanDrop = function (left, height) {
	var tmpPos = this.position.copy().add(
		new Vec2(left ? -this.spheres[0].r * 2 : this.spheres[0].r, 0));
	var from = tmpPos.copy().sub((new Vec2(0, 1)).mul(25));
	var to = tmpPos.copy().sub((new Vec2(0, 1)).mul(height));
	var res = this.SweepTest(from, to);
	if (res.foundCollision && res.contactTime <= 1) {
		return true;
	}
	return false;
};

/**
 * Drop object to the ground
 *
 */
BaseMovementComponent.prototype.DropToGround = function () {
    var posCopy = new Vec2(0, 1);
    posCopy.mul(kMaxDropHeight);
    posCopy.add(this.position);
    var test = this.SweepTest(this.position, posCopy);
    if (test.foundCollision) {
        posCopy = new Vec2(0, 1);
        posCopy.mul(kMaxDropHeight * test.contactTime - kDropEpsilon);
        posCopy.add(this.position);

        this.SetPosition(posCopy);
    }

    this.Update(1/30);
};


BaseMovementComponent.prototype.PlaceOutside = function(r, left, placeEpsilon) {
	placeEpsilon = placeEpsilon === undefined ? 5 : placeEpsilon;
	var xlimit;
	if (left) {
		var xmin = 0;
		for (var i = 0; i < this.spheres.length; i++) {
			var s = this.spheres[i];
			xmin = Math.min(xmin, s.c.x - s.r);
		}
		xlimit = r.x0 + xmin - placeEpsilon;
	} else {
		var xmax = 0;
		for (var i = 0; i < this.spheres.length; i++) {
			var s = this.spheres[i];
			xmin = Math.max(xmax, s.c.x + s.r);
		}
		xlimit = r.x1 + xmax + placeEpsilon;
	}
	this.SetPosition(new Vec2(xlimit, r.center().y));
};

// ---------------------------------------------------------------------------


// MovementComponent  --------------------------------------------------------

// Constants
var kInfinitesimalTime = 0.00001;
var kClampVelocity = 0.1;

MovementComponent.prototype = new BaseMovementComponent();

/**
 * The movement component handles movement of a "walking" (sliding) object
 * To handle collision one or more circles are used.
 *
 * @constructor
 * @auguments BaseMovementComponent
 */
function MovementComponent() {
    BaseMovementComponent.apply(this, arguments);

    this.timeStatic = 0;
}


/**
 * Update the movement according to what is set as the desired velocity and 
 * external influences.
 *
 * @param {number} dt Time delta
 */
MovementComponent.prototype.Update = function (dt) {
    var _vec2buf; // Buffer during vector arithmetic 

    var oldPosition = new Vec2(this.position.x, this.position.y);

    // Guard against unhandelable infinities, no one will miss a frame rendered at this speed anyway
    if (dt < kInfinitesimalTime) {
        return;
    }

    // Re-establish contacts (they might have moved).
    this.shapes = [];
    var epsilonVec = new Vec2(kContactEpsilon, kContactEpsilon);

    var posSub = new Vec2(this.position.x, this.position.y);
    posSub.sub(epsilonVec);
    var posAdd = new Vec2(this.position.x, this.position.y);
    posAdd.add(epsilonVec);
    this.shapes = this.ExtractCollision(posSub, posAdd, this.spheres); 
    this.contacts = this.FixedPosTest(this.position, kContactEpsilon, this.shapes);

    // We pretend that the impulse is a force of exactly the right size, hence the divide by 'dt'
    var impulse = new Vec2(this.desiredVel.x, this.desiredVel.y);
    impulse.sub(this.velocity);
    // force + impulse / dt
    impulse.div(dt);
    impulse.add(this.force);
    this.force = this.ClipToContacts(impulse);

    if (this.maxForce.x > 0) {
        this.force.x = Clamp(-this.maxForce.x, force.x, this.maxForce.x);
    }
    if (this.maxForce.y > 0) {
        this.force.y = Clamp(-this.maxForce.y, force.y, this.maxForce.y);
    }

    // velocity += force * dt;
    _vec2buf = new Vec2(this.force.x, this.force.y);
    _vec2buf.mul(dt);
    this.velocity.add(_vec2buf);
    
    // compute the move in absolute terms for this update
    var move = new Vec2(this.velocity.x, this.velocity.y);
    move.mul(dt);

    // Add gravity if we're not standing on anything.
    if (!this.IsOnFloor() || this.desiredVel.x !== 0) {
        move.y     += 0.5 * this.gravity * dt * dt;
        this.velocity.y += this.gravity * dt;
    }

    // Figure out if we intersect anything (too deply) and find move to get us out.
    move.add(this.FindPushOutMove(dt));

    this.DoClippedMove(move);

    // Establish resting contacts
    this.shapes = [];
    posSub = new Vec2(this.position.x, this.position.y);
    posSub.sub(epsilonVec);
    posAdd = new Vec2(this.position.x, this.position.y);
    posAdd.add(move);
    posAdd.add(epsilonVec);
    this.shapes = this.ExtractCollision(posSub, posAdd, this.spheres);
    this.contacts = this.FixedPosTest(this.position, kContactEpsilon, this.shapes);

    // Clip remainder of velocity to resting contacts, this might avoid oscilations (MovementComponent.cpp:67)
    this.velocity = this.ClipToContacts(this.velocity);

    // Current desired velocity (until told otherwise) is current velocity
    this.desiredVel = this.velocity;

    if (this.contacts.length > 0) {
        this.desiredVel.x = 0;    
    }

    if (this.desiredVel.MagnitudeSquared() < kClampVelocity * kClampVelocity) {
        this.desiredVel = new Vec2(0, 0);
    }

    // Prepare for the next frame
    this.force = new Vec2(0,0);
    this.maxForce = new Vec2(kInfiniteForce, kInfiniteForce);
    this.lastPosition = this.position;

    // TODO
    // this.UpdatePlatformAttachment();
    
    _vec2buf = new Vec2(this.position.x, this.position.y);
    _vec2buf.sub(oldPosition);
    if (_vec2buf.MagnitudeSquared() > 0.25) {
        this.timeStatic = 0;
    }
    else {
        this.timeStatic += dt;
    }
};

// -----------------------------------------------------------------------------

function SimpleMovementComponent() {
    this.halted = false;
    this.allowBounces = 1;
    this.bouncyness = 0.5;
    this.collisionFlag = false;
    this.gravityLineY = -1;

    //BaseMovementComponent.call(this);
}

SimpleMovementComponent.prototype = new BaseMovementComponent();
SimpleMovementComponent.prototype.constructor = SimpleMovementComponent;

SimpleMovementComponent.prototype.Update = function (dt) {
    if (this.halted) { return; }

    // Guard against unhandelable infinities, no one will miss a frame rendered at this speed anyway
    if (dt < kInfinitesimalTime) { return; }

    // We pretend that the impulse is a force of exactly the right size, hence the divide by 'dt'
    var impulse = this.desiredVel.copy();
    impulse.sub(this.velocity);
    // force + impulse / dt
    impulse.div(dt);
    impulse.add(this.force);
    this.force = this.ClipToContacts(impulse);

    if (this.maxForce.x > 0) {
        this.force.x = Clamp(-this.maxForce.x, force.x, this.maxForce.x);
    }
    if (this.maxForce.y > 0) {
        this.force.y = Clamp(-this.maxForce.y, force.y, this.maxForce.y);
    }

    // velocity += force * dt;
    _vec2buf = new Vec2(this.force.x, this.force.y);
    _vec2buf.mul(dt);
    this.velocity.add(_vec2buf);

    // Compute the move in absolute terms for this update
    var move = this.velocity.copy();
    move.mul(dt);

    // Add gravity.
    move.y     += 0.5 * this.gravity * dt * dt;
    this.velocity.y += this.gravity * dt;

    this.contacts = [];

    var workingPos = this.position.copy();

    if (move.MagnitudeSquared() > Math.sqrt(kInfinitesimalDistance)) {
        var endPos = workingPos.copy();
        endPos.add(move);

        var timeLeft = 1;
        var test = this.SweepTest(workingPos, endPos);
        if (test.foundCollision) {
            this.collisionFlag = true;

            // Move almost all the way. 
            var moveTime = Math.max(0, test.contactTime - 0.001);
            endPos.sub(workingPos);
            endPos.mul(moveTime);
            workingPos.add(endPos);

            // Next we need to clip the velocity.
            this.contacts.push(test.contact);

            var bounceFactor = this.bouncyness;
            if (this.allowedBounces >= 0 && this.IsOnFloor()) {
                if (this.allowedBounces == 0) {
                    this.bounceFactor = 0;
                    this.halted = true;
                }
                this.allowedBounces--;
            }

            move = this.ClipToContacts(move, bounceFactor);
            this.velocity = this.ClipToContacts(this.velocity, bounceFactor);

            // And use up the rest of the alloted time.
            timeLeft -= moveTime;

            // Figure out new end point
            endPos = move.copy();
            endPos.mul(timeLeft);
            endPos.add(workingPos);
        }
        else {
            workingPos = endPos;
        }

        // Store final position, snapped to path
        this.position = workingPos;
    }

    // Current desired velocity (until told otherwise) is current velocity
    this.desiredVel = this.velocity;

    // Prepare for the next frame
    this.force = new Vec2(0, 0);
    this.maxForce = new Vec2(kInfiniteForce, kInfiniteForce);
    this.lastPosition = this.position;

    if (this.gravityLineY !== -1) {
        this.gravity = (this.gravityLineY - this.position.y) * 20;
    }
};

SimpleMovementComponent.prototype.ClearCollisionFlag = function () {
    this.collisionFlag = false;
};

SimpleMovementComponent.prototype.HasCollided = function () {
    return this.collisionFlag;
};

SimpleMovementComponent.prototype.AddGravityLine = function (ypos) {
    this.gravityLineY = ypos;
};

