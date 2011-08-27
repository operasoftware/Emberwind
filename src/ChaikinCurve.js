var Chaikin = {};

Chaikin.subdivide = function (handles, subdivs) {
	if (handles.length) {
		do {
			var numHandles = handles.length;
			// keep the first point
			handles.push(new Point2(handles[0].x, handles[0].y));

			for (var i = 0; i < numHandles - 1; ++i) {
				// get 2 original points
				var p0 = handles[i];
				var p1 = handles[i + 1];
				// average the 2 original points to create 2 new points. For each
				// CV, another 2 verts are created.
				var Q = new Point2(0.75 * p0.x + 0.25 * p1.x, 0.75 * p0.y + 0.25 * p1.y);
				var R = new Point2(0.25 * p0.x + 0.75 * p1.x, 0.25 * p0.y + 0.75 * p1.y);

				handles.push(Q);
				handles.push(R);
			}
			// keep the last point
			handles.push(new Point2(handles[numHandles - 1].x, handles[numHandles - 1].y));

			// update the points array
			for (var i = 0; i < numHandles; ++i)
				handles.shift();
			//handles.shift(numHandles);
		} while (--subdivs > 0);
	}
};

Chaikin.getLength = function (points) {
	var len = 0;
	var diff = null;
	for (var i = 1; i < points.length; i++) {
		diff = points[i].subNew(points[i-1]);
		len += Math.sqrt(diff.x * diff.x + diff.y * diff.y);
	}
	return len;
};

Chaikin.getPointAtLength = function (points, len) {
	if (points.length === 0) { return new Point2(0, 0); }
	if (points.length === 1) { return points[0]; }

	var diff = null;
	for (var i = 0; i !== points.length - 1; i++) {
		diff = points[i+1].subNew(points[i]);
		var segLen = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
		if (segLen > len) {
			return new Point2(points[i].x + diff.x * len / segLen, points[i].y + diff.y * len / segLen);
		} else {
			len -= segLen;
		}
	}
	return points[points.length-1];
};

Chaikin.getDirAtParam = function (points, param) {
	if (points.length < 2) { return new Point2(0, 0); }

	var totalLen = Chaikin.getLength(points);
	var tgtLen = param * totalLen;
	var diff = null;

	for (var i = 0; i !== points.length - 1; i++) {
		diff = points[i+1].subNew(points[i]);
		var segLen = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
		if (segLen > tgtLen) {
			return diff;
		} else {
			tgtLen -= segLen;
		}
	}

	return points[points.length-1].subNew(points[points.length-2]);
};

Chaikin.getEvenlySpacedPoints = function (handles, count, normals) {
	var tmp = handles.slice(0);
	var points = [];
	var dir = null;
	Chaikin.subdivide(tmp, 3);
	var len = Chaikin.getLength(tmp);
	var spacing = len / (count - 1);
	points.push(tmp[0]);

	if (normals) {
		dir = Chaikin.getDirAtParam(tmp, 0);
		normals.push(new Point2(-dir.y, dir.x));
	}

	for (var i = 1; i < count - 1; i++) {
		points.push(Chaikin.getPointAtLength(tmp, i * spacing));
		if (normals) {
			dir = Chaikin.getDirAtParam(tmp, i * spacing / len);
			normals.push(new Point2(-dir.y, dir.x));
		}
	}
	
	points.push(tmp[tmp.length-1]);

	if (normals) {
		dir = Chaikin.getDirAtParam(tmp, 1);
		normals.push(new Point2(-dir.y, dir.x));
	}

	return points;
};

