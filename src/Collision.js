var SWEEP_EPSILON = 0.001;
var PENETRATION_EPSILON = 0.002;

// Circle  -------------------------------------------------------------------

/**
 * Simple circle object
 *
 * @param {Vec2} cent   Point of centre
 * @param {number} rad  Radius of circle
 * @constructor
 */
function Circle(cent, rad) {
    this.c = cent;
    this.r = rad;
}

// ---------------------------------------------------------------------------


// Ray2  ---------------------------------------------------------------------

/**
 * Simple ray object
 *
 * @param {Vec2} p
 * @param {Vec2} n
 * @constructor
 */
function Ray2(p, n) {
    this.point = p;
    this.normal = n;
}

// ---------------------------------------------------------------------------


// CollisionContact  ---------------------------------------------------------

function CollisionContact(p, n, d, fn, usr, mat) {
    this.point = p;
    this.normal = n;

    this.depth = d;
    this.faceNormal = fn;
    this.user = usr;
    this.material = mat;
}

// ---------------------------------------------------------------------------


// ConvexShape ---------------------------------------------------------------

function ConvexShape(type, mat) {
    this.type = type;

    if (!mat) {
        this.material = 0;
    }
    this.material = mat;

    this.y_min = Number.MAX_VALUE;
    this.user = null;

    this.points = []; // @type Vec2
}

/**
 * Push a point to the convex shape
 *
 * @param {Vec2} v Point to be pushed
 */
ConvexShape.prototype.PushPoint = function (v) {
    this.points.push(v);

    if (v.y < this.y_min) {
        this.y_min = v.y;
    }

};

/**
 * Clears the shape. Type and material is not reset.
 */
ConvexShape.prototype.Clear = function () {
    this.points = [];
    this.y_min = Number.MAX_VALUE;

    return this;
};

/**
 * Getter for number of points in the shape
 *
 * @return {number} The number of points
 */
ConvexShape.prototype.NumPoints = function () {
    return this.points.length;
};

/**
 * Add an offset vector to the shape
 *
 * @param {Vec2} v Vector to be added
 */
ConvexShape.prototype.Offset = function (v) {
    this.y_min += v.y;

    for (var i = 0; i < this.points.length; i++) {
        this.points[i].add(v);
    }

    return this;
};

/**
 * Flip the shape horizontally
 *
 * @param {number} x Where on shape to flip
 */
ConvexShape.prototype.HFlip = function (x) {
    this.points.reverse();
    for (var i = 0; i < this.points.length; i++) {
        this.points[i].x = x - (this.points[i].x - x);
    }

    return this;
};

/**
 * Deep copy
 */
ConvexShape.prototype.DeepCopy = function () {
    var c = new ConvexShape(this.type, this.material);
    for (var p = 0; p < this.points.length; p++) {
        c.PushPoint(this.points[p].copy());
    }

    return c;
};

// ---------------------------------------------------------------------------


// LineSegment2  -------------------------------------------------------------

function LineSegment2(s, e) {
    this.a = new Vec2(s.x, s.y);
    this.b = new Vec2(e.x, e.y);
}

// @param {Vec2} p
// @return {Vec2}
LineSegment2.prototype.GetClosestPoint = function (p) {
    var val = this.GetProjectionParam(p);
    // Clamp
    var param = val < 0 ? 0 : val > 1 ? 1 : val;

    var res = new Vec2(this.b.x, this.b.y);
    res.sub(this.a);
    res.mul(param);
    res.add(this.a);

    return res;
};

// @param {Vec2} p
// @return {number}
LineSegment2.prototype.GetProjectionParam = function (p) {
    var m = this.b.copy().sub(this.a); // m = b - a
    var proj = p.copy().sub(this.a); // p - a
    return m.Dot(proj) / m.Dot(m); // m.(p-a) / m.m
};

// @param {Vec2} p
// @return {number}
LineSegment2.prototype.GetProjectionDistance = function (p) {
    var p_ = new Vec2(p.x, p.y);
    p_.sub(this.GetClosestPoint(p));
    return p_.Magnitude();
};

// ---------------------------------------------------------------------------


// Collision  ----------------------------------------------------------------

/**
 * Helper area calculation function. Returns 2 X the area.
 *
 * @param  {Vec2} pointA
 * @param  {Vec2} pointB
 * @param  {Vec2} pointC
 * @return {number}
 */
function Signed2DTriArea(pointA, pointB, pointC) {
     return ((pointA.x - pointC.x) * (pointB.y - pointC.y) - (pointA.y - pointC.y) * (pointB.x - pointC.x));
}


/**
 * Helper intersection function. Intersects a ray with a sphere.
 *
 * @param {Ray2}   ray      Ray for intersecting
 * @param {Circle} circle   Circle to be intersected
 * @return {boolean}        If the ray intersects the sphere
 */
function IntersectRaySphere(ray, circle) {
    closure = function () {
        return localCollisionTime;   
    };

    var m = new Vec2(ray.point.x, ray.point.y);
    m.sub(circle.c);

    var a = ray.normal.Dot(ray.normal);
    var b = m.Dot(ray.normal);
    var c = m.Dot(m) - circle.r * circle.r;

    // Is the ray heading towards the circle? Otherwise it won't intersect
    if (c > 0 && b > 0) {
        return false;
    }
    
    var discr = b * b - a * c;

    // Do the ray intersect the sphere if the ray was infinitely long?
    if (discr < 0) {
        return false;
    }
    
    var localCollisionTime = (-b - Math.sqrt(discr)) / a;

    // Check that the collision time is on the ray
    if (localCollisionTime < 0 || localCollisionTime > 1) {
        return false;
    }

    return true;
}


/**
 * Helper intersection function. Checks if two lines intersect.
 *
 * @param {LineSegment2} a Line A
 * @param {LineSegment2} b Line B
 * @return {Object} An object is returned with intersection point and time if they intersect, otherwise null.
 */
function IntersectLineSegments(a, b) {
    var a1 = Signed2DTriArea(a.a, a.b, b.b);
    var a2 = Signed2DTriArea(a.a, a.b, b.a);
    if (a1 * a2 < 0) {
        var a3 = Signed2DTriArea(b.a, b.b, a.a);
        var a4 = a3 + a2 - a1;
        if (a3 * a4 < 0) {
            var intersectionTime = a3 / (a3 - a4);

            // intersectionPoint = a.a + intersectionTime * (a.b - a.a);
            var intersectionPoint = new Vec2(a.b.x, a.b.y);
            intersectionPoint.sub(a.a);
            intersectionPoint.mul(intersectionTime);
            intersectionPoint.add(a.a);

            return {intersectionPoint: intersectionPoint,intersectionTime : intersectionTime};
        }
    }

    return null;
}

/**
 * Collision object to hold both contact points and intersection time
 *
 * @param {[CollisionContact]} cts Array consisting of contact points
 * @param {number} it Intersection Time
 * @constructor
 */
function Collisions(cts, it) {
    this.cts = cts;
    this.it = it;
}


/**
 * Test a sweep-circle against convex shape.
 *
 * @param {Circle}      circle        Circle used in test
 * @param {Vec2}        movement      Vector describing movement
 * @param {ConvexShape} shape         Shape to be tested against
 * @return {Collisions}               Collision objects that holds both contact points and intersection time.
 */
function GetCollisionShape(circle, movement, shape) {
    var contactPoints = [];

    var foundOne = false;
    var minIntersectionTime = Number.MAX_VALUE;
    var localIntersectionTime = Number.MAX_VALUE;

    var i = 0;      // Used for iteration
    var pt;         // Handle during loops
    var contact;    // Placeholder for eventual contact point

    if (shape.NumPoints() > 1) {
        pt = shape.points;
        for (i = 0; i < pt.length; i++) {
            var last = pt[i];
            var curr = i+1 === pt.length ? pt[0] : pt[i+1];

            // last & curr is now start and end points of the line.
            var normal = new Vec2(-(curr.y - last.y), curr.x - last.x);
            if (0 < normal.Dot(movement)) { 
                continue; 
            }

            normal.Normalize();

            // last = last + normal * (circle.r + SWEEP_EPSILON)
            var _last = new Vec2(normal.x, normal.y);
            _last.mul(circle.r + SWEEP_EPSILON);
            _last.add(last);

            // curr = curr + normal * (circle.r + SWEEP_EPSILON)
            var _curr = new Vec2(normal.x, normal.y);
            _curr.mul(circle.r + SWEEP_EPSILON);
            _curr.add(curr);

            var endPos = new Vec2(circle.c.x, circle.c.y);
            endPos.add(movement);

            var localContact = new Vec2();

			var res = IntersectLineSegments(new LineSegment2(circle.c, endPos), new LineSegment2(_last, _curr));
			if (res) {
                if (res.intersectionTime < minIntersectionTime) {
                    foundOne = true;
                    minIntersectionTime = res.intersectionTime;

                    // localContact - normal * circle.r
                    var _lc = new Vec2(normal.x, normal.y);
                    _lc.mul(circle.r);

                    res.intersectionPoint.sub(_lc);

                    contact = new CollisionContact(res.intersectionPoint, normal, 0, shape.user, shape.material);
                }
            }
        }
    }


    if (!foundOne) {
        pt = shape.points;
        for (i = 0; i < pt.length; i++) {
            localIntersectionTime = Number.MAX_VALUE; 

            // Multiply the length of the ray to make sure that the spheres won't go
            // through each other at extremely low speeds
            var _mov = new Vec2(movement.x, movement.y);
            _mov.mul(1.1);
            if (IntersectRaySphere(new Ray2(circle.c, _mov), new Circle(pt[i], circle.r))) {
                localIntersectionTime = closure();
                if (localIntersectionTime < minIntersectionTime) {
                    // Got collision.
                    foundOne = true;
                    minIntersectionTime = localIntersectionTime;
                    
                    // circle.c + localIntersectionTime * movement - pt[i]
                    var _normal = new Vec2(movement.x, movement.y);
                    _normal.mul(localIntersectionTime);
                    _normal.sub(pt[i]);
                    _normal.add(circle.c);
					_normal.Normalize();

                    // Contact point is the vertex.
                    // Normal is vector from corner to position of sphere at collision time.
                    contact = new CollisionContact(pt[i], _normal, 0, shape.user, shape.material);
                }
            }
        }
    }
    

    if (foundOne) {
        contactPoints.push(contact);
        return new Collisions(contactPoints, minIntersectionTime);
    }
    else {
        return null;
    }
}


/**
 * Test two sweep circles against eachother
 *
 * @param {Circle} circleA
 * @param {Vec2}   movementA
 * @param {Circle} circleB
 * @param {Vec2}   movementB
 * @return {Collisions}  Collision objects that holds both contact points and intersection time.
 */
function GetCollisionSphere(circleA, movementA, circleB, movementB) {
    // Calculating the sum of the movement of the two circles. The test is reduced
    // to a ray test against a stationary circle
    
    // movementA - movementB
    var movementOfCircleA = new Vec2(movementA.x, movementA.y);
    movementOfCircleA.sub(movementB);
    var cB = new Circle(circleB.c, circleA.r + circleB.r);

    // Now do a regular ray-circle intersection.
    var contactPoints = [];
    var collision = null;
    
    // Multiply the length of the ray with 1.1 to make sure that the spheres won't go
    // through each other at extremely low speeds
    if (IntersectRaySphere(new Ray2(circleA.c, movementOfCircleA.mul(1.1)), cB)) {
        var localCollisionTime = closure();

        var contactPoint = new CollisionContact();

        // Normal is line between centers at collision time.
        // contactPoint.normal = ((circleA.c + localCollisionTime * movementA) - (circleB.c + localCollisionTime * movementB)).Normalize();
        var rhs = new Vec2(movementB.x, movementB.y); // RHS of -
        rhs.mul(localCollisionTime);
        rhs.add(circleB.c);

        contactPoint.normal = new Vec2(movementA.x, movementA.y); // LHS of -
        contactPoint.normal.mul(localCollisionTime);
        contactPoint.normal.add(circleA.c);

        contactPoint.normal.sub(rhs);
        contactPoint.normal.Normalize();

        // Collision point.
        // contactPoint.point = (circleB.c + localCollisionTime * movementB) + contactPoint.normal * circleB.r;
        rhs = new Vec2(contactPoint.normal.x, contactPoint.normal.y); // RHS of outer +
        rhs.mul(circleB.r);

        contactPoint.point = new Vec2(movementB.x, movementB.y); // LHS of outer +
        contactPoint.point.mul(localCollisionTime);
        contactPoint.point.add(circleB.c);

        contactPoint.point.add(rhs);

        contactPoints.push(contactPoint);
        collision = new Collisions(contactPoints, localCollisionTime);
    }

    return collision;
}


/**
 * Test if a sphere is penetrating a convex shape.
 *
 * @param {Circle}              circle
 * @param {Vec2}                pos
 * @param [ConvexShape]         shapes
 *
 * @return {[CollisionContact]}  contactPoints
 */
function GetPenetrations(circle, pos, shapes) {
    var contactPoints = [];
    for (var i = 0; i < shapes.length; i++) {
        if (shapes[i].NumPoints() > 1) {
            for (var p = 0; p < shapes[i].points.length; p++) {
                var last = shapes[i].points[p];
                var curr = p+1 === shapes[i].points.length ? shapes[i].points[0] : shapes[i].points[p+1];

                var circlePos = new Vec2(circle.c.x, circle.c.y);
                circlePos.add(pos);

                var ls = new LineSegment2(curr, last);
                var closestPoint = ls.GetClosestPoint(circlePos);

                var contactVector = new Vec2(closestPoint.x, closestPoint.y);
                contactVector.sub(circlePos);

                if (contactVector.Dot(contactVector) <= ((circle.r + PENETRATION_EPSILON) * (circle.r + PENETRATION_EPSILON))) {
                    var depth = (circle.r + SWEEP_EPSILON) - contactVector.Magnitude();

                    // faceNormal = last - curr
                    var faceNormal = new Vec2(last.x, last.y);
                    faceNormal.sub(curr);
                    faceNormal.y *= -1;
                    faceNormal.Normalize();

                    contactVector.mul(-1);

                    var contact = new CollisionContact(closestPoint, contactVector, depth, faceNormal, shapes[i].user, shapes[i].material);
                    contact.normal.Normalize();

                    contactPoints.push(contact);
                }
            }
        }
    }

    return contactPoints;
}

