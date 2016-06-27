import _ from "lodash";

var vAdd, vNorm, vNormalized, vScale, vSub,
  slice = [].slice;

vAdd = function() {
  var vs;
  vs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
  return _.reduce(vs, function(v, w) {
    return _.zipWith(v, w, _.add);
  });
};

vSub = function(v, w) {
  return vAdd(v, vScale(-1.0, w));
};

vScale = function(scalar, v) {
  return _.map(v, function(e) {
    return e * scalar;
  });
};

vNorm = function(v) {
  return Math.sqrt(_.reduce(_.map(v, function(e) {
    return Math.pow(e, 2);
  }), _.add));
};

vNormalized = function(v) {
  return vScale(1 / vNorm(v), v);
};


var offsetInterpolate = function(offset) {
  // console.log("offset", offset);
  return function(polygon) {
    // console.log("polygon", polygon);
    var arc, copy, d, edge, first, l, offsetPairs, pairs, points,
    rotated, scaledNormal, v, w;
    if (polygon.length < 2) {
      return null;
    }
    copy = polygon.slice();
    first = copy.shift();
    copy.push(first);
    pairs = _.zip(polygon, copy);
    offsetPairs = (function() {
      var j, len, ref, results;
      results = [];
      for (j = 0, len = pairs.length; j < len; j++) {
        ref = pairs[j], v = ref[0], w = ref[1];
        edge = vSub(v, w);
        rotated = [-edge[1], edge[0]];
        scaledNormal = vScale(offset, vNormalized(rotated));
        results.push([vAdd(v, scaledNormal), vAdd(w, scaledNormal)]);
      }
      return results;
    })();
    points = _.flatten(offsetPairs);
    points.push(points[0]);
    arc = "A " + offset + "," + offset + " 0 0,1 ";
    l = "L";
    d = "" + points.shift();
    points.forEach(function(p, i) {
      if (i % 2 === 0) {
        d += l;
      } else {
        d += arc;
      }
      return d += p;
    });
    d += "z";

    // if (mode)
    return d;
    // else return {points: points, string: d};
  };
};


var curveOffset = function(offset) {
  // console.log("offset", offset);
  return function(polygon) {
    var arc, copy, d, edge, first, l, offsetPairs, pairs, points,
    rotated, scaledNormal, v, w;
    if (polygon.length < 2) {
      return null;
    }
    copy = polygon.slice();
    first = copy.shift();
    copy.push(first);
    pairs = _.zip(polygon, copy);
    offsetPairs = (function() {
      var j, len, ref, results;
      results = [];
      for (j = 0, len = pairs.length; j < len; j++) {
        ref = pairs[j], v = ref[0], w = ref[1];
        edge = vSub(v, w);
        rotated = [-edge[1], edge[0]];
        scaledNormal = vScale(offset, vNormalized(rotated));
        results.push([vAdd(v, scaledNormal), vAdd(w, scaledNormal)]);
      }
      return results;
    })();
    points = _.flatten(offsetPairs);
    points.push(points[0]);
    arc = "A " + offset + "," + offset + " 0 0,1 ";
    l = "L";
    d = "" + points.shift();
    points.forEach(function(p, i) {
      if (i % 2 === 0) {
        d += l;
      } else {
        d += arc;
      }
      return d += p;
    });

    d += "z";

    // if (mode)
      return d;
    // else return {points: points, string: d};
  };
};


export default offsetInterpolate;
//
function Offset(context) {
  this._context = context;
}

Offset.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    // x = +x, y = +y;

    // switch (this._point) {
    //   case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
    //   case 1: this._point = 2; // proceed
    //   default: this._context.lineTo(x, y); break;
    // }
    console.log("point", x, y);

  }
};

// export default function(context) {
//   return new Offset(context);
// }

