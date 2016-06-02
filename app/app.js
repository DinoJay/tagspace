import d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";
import d3_force from "d3-force";

import marching_squares from "./marchingSquaresHelpers.js";
import offsetInterpolate from "./polyOffset.js";

import edgeBundling from "./edgebundling.js";

var hullcolor = d3.scale.category20();

var hullcurve = d3.svg.line()
  .interpolate("basis-closed")
  .x(d => d.x)
  .y(d => d.y);

var bundleLine = d3.svg.line()
            .x(d => d.x)
            .y(d => d.y)
            .interpolate("linear");


// function force(alpha) {
//   for (var i = 0, n = nodes.length, node, k = alpha * 0.1; i < n; ++i) {
//     node = nodes[i];
//     node.vx -= node.x * k;
//     node.vy -= node.y * k;
//   }
// }

function rectCircleColliding(circle, rect, init){
// var distX = Math.abs(circle.x - rect.x);
// var distY = Math.abs(circle.y - rect.y);

var center = {
    x: circle.x - (rect.x),
    y: circle.y - (rect.y)
};

// check circle position inside the rectangle quadrant
var side = {
    x: Math.abs (center.x) - rect.width / 2,
    y: Math.abs (center.y) - rect.height / 2
  };


// if (side.x < circle.r && side.y < circle.r) {
//   console.log("side", side);
//   // return { bounce: false };
// } // inside

if (side.x > circle.r) return { bounce: false };
if (side.y > circle.r) return { bounce: false };


var dx = 0, dy = 0;
if (side.x <= 0 || side.y <=0) {
  if (Math.abs (side.x) < circle.r && side.y < 0)
  {
    dx = center.x*side.x < 0 ? 1 : -1;
  }
  else if (Math.abs (side.y) < circle.r && side.x < 0)
  {
    dy = center.y*side.y < 0 ? 1 : -1;
  }

  return { bounce: init, x:dx, y:dy };
}

// circle is near the corner
var bounce = side.x*side.x + side.y*side.y  < circle.r*circle.r;
if (!bounce) return { bounce:false };

var norm = Math.sqrt (side.x*side.x+side.y*side.y);
dx = center.x < 0 ? 1 : -1;
dy = center.y < 0 ? 1 : -1;
return { bounce:true, x: dx*side.x/norm, y: dy*side.y/norm };

}

function cropHullLabels(d, path) {
  //  var textpath = document.getElementById("tp");
  //   var path = document.getElementById("s3");
  while ((d3.select("#tp-hull" + d.id).node().getComputedTextLength() * 1.1) > path.node().getTotalLength()) {
    // TODO: remove last element
    var tspan = d3.select("#tp-hull" + d.id).selectAll("tspan");
    var minTag = _.minBy(tspan.data(), d => d.values.length);

    tspan.filter(d => d.key === minTag.key).remove();

    // .attr("font-size", function() {
    //   var fontsize = d3.select(this).attr("font-size");
    //   fontsize -= 0.01;
    //   return fontsize;
    // });
  }
}

// function wrap(d) {
//   var self = d3.select(this),
//     textLength = self.node().getComputedTextLength(),
//     text = self.text();
//   while ( ( textLength > self.attr('width') )&& text.length > 0) {
//     text = text.slice(0, -1);
//     self.text(text + '...');
//     textLength = self.node().getComputedTextLength();
//   }
// }

require("./style/style.less");

var labelLine = d3.svg.line()
  .x(d => d.x)
  .y(d => d.y)
  .interpolate(offsetInterpolate(15));

var width = 1400;//window.innerWidth;
var height = 600;//window.innerHeight;

var viewBox = {
  left: 0,
  top: 500
};

var shiftedHeight = height + viewBox.top;
var shiftedWidth = width + viewBox.top;

function boundMargin(node, width, height, margin) {
  var halfHeight = node.height / 2,
      halfWidth = node.width / 2;

  if (node.x - halfWidth < margin.left) {
          node.x = halfWidth + margin.left;
  }
  if (node.x + halfWidth > (width - margin.right)) {
          node.x = (width - margin.right) - halfWidth;
  }

  if (node.y - halfHeight < margin.top) {
          node.y = halfHeight + margin.top;
  }
  if (node.y + halfHeight > (height - margin.top)) {
          node.y = (height - margin.top) - halfHeight;
  }
  return node;
}

// function simple_comp(nodes, links) {
//   var groups = [];
//   var visited = {};
//   var v;
//
//   // this should look like:
//   // {
//   //   "a2": ["a5"],
//   //   "a3": ["a6"],
//   //   "a4": ["a5"],
//   //   "a5": ["a2", "a4"],
//   //   "a6": ["a3"],
//   //   "a7": ["a9"],
//   //   "a9": ["a7"]
//   // }
//
//   var vertices = nodes.map(d => d.index);
//   var edgeList = links.map(l => {
//     var edge = [l.source.index, l.target.index];
//     return edge;
//   });
//   // console.log("edgeList", edgeList);
//
//   var adjlist = convert_edgelist_to_adjlist(vertices, edgeList);
//
//   for (v in adjlist) {
//     if (adjlist.hasOwnProperty(v) && !visited[v]) {
//       var indices = bfs(v, adjlist, visited);
//       groups.push(indices.map(i => nodes[i]));
//     }
//   }
//   return groups.map(g => g.filter(d => d));
// }

function collide(node, padding, energy) {
    return function(quad) {
      var updated = false;
      if (quad.point && (quad.point !== node)) {
        var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            xSpacing = (quad.point.width + node.width + padding) / 2,
            ySpacing = (quad.point.height + node.height + padding) / 2,
            absX = Math.abs(x),
            absY = Math.abs(y),
            l,
            lx,
            ly;

        // console.log("node", node.width);
        if (absX < xSpacing && absY < ySpacing) {
            l = Math.sqrt(x * x + y * y) * energy;

            lx = (absX - xSpacing) / l;
            ly = (absY - ySpacing) / l;

            // the one that"s barely within the bounds probably triggered the collision
            if (Math.abs(lx) > Math.abs(ly)) {
                    lx = 0;
            } else {
                    ly = 0;
            }

            node.x -= x *= lx;
            node.y -= y *= ly;
            quad.point.x += x;
            quad.point.y += y;


            updated = true;
        }
      }
      return updated;
    };
}

function nbsDirected(a, linkedByIndex) {
  var nbs = [];
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    // if (s[0] === a) {
    //   nbs.push(s[1]);
    // }
    // else {
      if (s[1] === a) {
        nbs.push(s[0]);
      }
    // }
  }
  return _.uniq(nbs);
}


function collideCircle(data, alpha, padding) {
  var quadtree = d3.geom.quadtree(data);
  return function(d) {
      var r = d.r + padding,
          nx1 = d.x - r,
          nx2 = d.x + r,
          ny1 = d.y - r,
          ny2 = d.y + r;
      quadtree.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d)) {
          var x = d.x - quad.point.x,
              y = d.y - quad.point.y,
              l = Math.sqrt(x * x + y * y),
              r = d.r + padding + quad.point.r;

          if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}


var fill = d3.scale.category10();

// d3.select("body").append("div")
//   .on("click", () => console.log("it works with es6!"))
//   .text("it works!");

// Converts an edgelist to an adjacency list representation
// In this program, we use a dictionary as an adjacency list,
// where each key is a vertex, and each value is a list of all
// vertices adjacent to that vertex
var convert_edgelist_to_adjlist = function(vertices, edgelist) {
  var adjlist = {};
  var i, len, pair, u, v;
  for (i = 0, len = edgelist.length; i < len; i += 1) {
    pair = edgelist[i];
    u = pair[0];
    v = pair[1];
    // if (vertices.indexOf(u) === -1 || vertices.indexOf(v) === -1) continue;
    if (adjlist[u]) {
      // append vertex v to edgelist of vertex u
      adjlist[u].push(v);
    } else {
      // vertex u is not in adjlist, create new adjacency list for it
      adjlist[u] = [v];
    }
    if (adjlist[v]) {
      adjlist[v].push(u);
    } else {
      adjlist[v] = [u];
    }
  }
  vertices.forEach(v => {
    if (!adjlist.hasOwnProperty(v)) adjlist[v] = [];
  });
  return adjlist;
};

// Breadth First Search using adjacency list
var bfs = function(v, adjlist, visited) {
  var q = [];
  var current_group = [];
  var i, len, adjV, nextVertex;
  q.push(v);
  visited[v] = true;
  var level = 0;
  // var max = 10;
  while (q.length > 0 /* && level <= 50 */) {
    v = q.shift();
    current_group.push(v);
    // Go through adjacency list of vertex v, and push any unvisited
    // vertex onto the queue.
    // This is more efficient than our earlier approach of going
    // through an edge list.
    adjV = adjlist[v];
    for (i = 0, len = adjV.length; i < len; i += 1) {
      nextVertex = adjV[i];
      if (!visited[nextVertex]) {
        q.push(nextVertex);
        visited[nextVertex] = true;
      }
    }
    level += 1;
  }
  return current_group;
};

var groupPath = function(d) {
  if (d.nodes.length < 2) return null;

  var hull = d3.geom.hull()
    .x(function(d) {
    return d.x;
  }).y(function(d) {
    return d.y;
  });

// var fakePoints = [];
  // d.nodes.forEach(function(e) {
  //   var xOffset = 75;
  //   var yOffset = 75;
  //   fakePoints = fakePoints.concat([
  //     // "0.7071" is the sine and cosine of 45 degree for corner points.
  //     [e.x, (e.y + xOffset)],
  //     [(e.x + (0.7071 * xOffset)), (e.y + (0.7071 * yOffset))],
  //     [(e.x + xOffset), e.y],
  //     [(e.x + (0.7071 * xOffset)), (e.y - (0.7071 * yOffset))],
  //     [(e.x), (e.y - yOffset)],
  //     [(e.x - (0.7071 * xOffset)), (e.y - (0.7071 * yOffset))],
  //     [(e.x - xOffset), e.y],
  //     [(e.x - (0.7071 * xOffset)), (e.y + (0.7071 * yOffset))]
  //     ]);
  // });
  // // return null;
  // // var h0 = labelLine(hull(d.nodes).reverse());
  // var fh = d3.geom.hull(fakePoints);
  // var first = fh[fh.length - 2];
  // var rev = fh.reverse();
  // var res = [first].concat(rev.slice(1, rev.length));
  // res = rev;

  // var revH = [];
  // for(var i = 0; i < fh.length - 1; i++) {
  //
  //   var ax = fh[i][0];
  //   var bx = fh[i+1][0];
  //   var ay = fh[i][1];
  //   var by = fh[i+1][1];
  //
  //   if(ax > bx)  {
  //     console.log("swap");
  //     revH.push([bx, ay]);
  //     fh[i+1] = [ax, by];
  //   }
  //   else revH.push([ax, ay]);
  // }
  // revH.push(fh[fh.length-1]);

  // var ps = "M" + fh.join("L") + "Z";
  // var revP = reversePath(ps);
  // console.log("revP", revP);
  return labelLine(hull(d.nodes).reverse());
  // return ps;
  // return "M" + revP;

  // // var h1 = offsetInterpolate(100)(d3.geom.hull(d.nodes.map(d => [d.x, d.y])).reverse());
  // // d.points = h1.points;
  // var h1 = offsetInterpolate(75)(d3.geom.hull(d.values.map(d => [d.x, d.y])).reverse());
  // // return h1;
  // var lp = pathParser(ll);

  // console.log("ll", ll);
  // return ll;

};


var labelPath = function(d) {
  // if (d.values.length < 2) return null;

  // var hull = d3.geom.hull()
  //   .x(function(d) {
  //   return d.x;
  // }).y(function(d) {
  //   return d.y;
  // });

  // var h0 = labelLine(hull(d).reverse());
  // var h1 = offsetInterpolate(100)(d3.geom.hull(d.values.map(d => [d.x, d.y])).reverse());
  // console.log("h1", h1);
  // console.log("pathData", pathData);
  // var h1 = "M" + h.map(d => [d.x, d.y]).join("L") + "Z";
  // var sortedFakePoints = _.sortBy(d, d => d[1]);
  // return "M" + h0.join("L") + "Z";
  return d3.svg.line().interpolate("cardinal-closed")(d.values);
  // return h0;

};


// var groupFill = function(d, i) { return fill(i & 3); };

d3.json("diigo.json", function(error, data) {
  var diigo = data.slice(0, 200).map((d, i)=> {
    d.tags = d.tags.split(",");
    d.id = i;
    return d;
  });
  console.log("diigo length", diigo.length);
  // diigo = diigo.filter(d => d.tags.indexOf("music") !== -1);
  // console.log("rawData", rawData);
  // const { data: data, edges: edges } = prepareData(rawData.documents);
  // console.log("tagData", data);
  //d
  // data.documents.forEach(d => d.r = 12);

  var zoom = d3.behavior.zoom()
     .size(shiftedWidth, shiftedHeight)
     .scaleExtent([-10, 40])
     .on("zoom", () => {
        console.log("zoom", d3.event);
        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        var w = 1 * d3.event.scale;
        var h = 2 * d3.event.scale;
        thumb
          .style("width", w + "px")
          .style("height", h + "px");

        thumb.select("iframe")
          .style("transform", "translate("+ [- w + "px", - h / 2 + "px"] +")")
          .style("width", w + "px")
          .style("height", h + "px");
        // thumb.style("width", w + "px");
        // thumb.style("height", h + "px");
     });

  var svg = d3.select("body").append("svg")
              .attr("width", width)
              .attr("height", height)
              // .attr("viewBox", 0 + " " + 200 + " " + width + " " + height)
              .attr("viewBox", (viewBox.left ) + " " + (viewBox.top ) + " " + (width - viewBox.left) + " " + (height - viewBox.top))
              .attr("overflow", "visible")
              .append("g")
              // .attr("viewBox", (-viewBox.left ) + " " + (-viewBox.top ) + " " + (width - viewBox.left) + " " + (height - viewBox.top))
                // .attr("transform", "translate(200, 200)")
                .attr("overflow", "visible")
                // .attr("transform", "translate(" + [0, 0] + ")")
                .call(zoom)
                .on("dblclick.zoom", null);
                // .append("g");

  // svg.attr("transform", "scale(0.5)");
  // var elmnt = d3.select("svg").node();

  // window.scrollTo(overflow.left, overflow.top ) ;

  // TODO: update
  var foci = fociLayout()
                .gravity(0.01)
                .sets(diigo)
                .size([width, height + viewBox.top])
                .charge(function() {
                  // var conn = this.hasConnections(d);
                  // return conn > 0 ? -100 / conn : -100;
                  // return - d.nodes.length * 40;
                  return -20;
                })
                .linkStrength(l => l.target.label ? 0: 0)
                .linkDistance(function(){
                  // var conn = this.connections(l.source);
                  return 7;
                })
                .start();

  var nodes = _.flatten(foci.data().map(d => {
    // TODO: not really clean
    if (d.label) return d;
    return d.nodes.map(e => {
      e.center = d.center;
      e.width = 1;
      e.height = 2;
      // e.tags = e.sets;
      return e;
    });
  }));

  var appliedComps = foci.comps().map(c => {
    c.sets.map(s => {
      s.values = s.values.map(on => {
        return nodes.find(n => n.id === on.id);
      });
      // if(s.values.length === s.nodes.length) return [];
      return s;
    });
    return c;
  });

  console.log("foci.comps()", foci.comps());

  // console.log("foci data", foci.data(), foci.data().length);
  // console.log("foci links", foci.links());
  // console.log("force nodes", nodes, "length", nodes.length);
  // console.log("foci-groups", foci.groups());

  var simulation = d3_force.forceSimulation(nodes)
      .force("x", d3_force.forceX(d => d.center.x).strength(1))
      .force("y", d3_force.forceY(d => d.center.y).strength(1))
      // .force("centerCircle", function(alpha) {
        // for (var i = 0, n = nodes.length, k = alpha ; i < n; ++i) {
        //   var d = nodes[i];
        //   // node.vx -= node.x * k;
        //   // node.vy -= node.y * k;
        //   var circle={x: shiftedWidth/2, y: shiftedHeight/2, r: 300};
        //   var collision = rectCircleColliding(circle, d, false);
        //   if (collision.bounce) {
        //     d.vx = d.x + (collision.x) * ( k / 10000 );
        //     d.vy = d.y + (collision.y) * ( k / 10000 );
        //   }
        // }

      // });
      // .force("charge", d3_force.forceManyBody()
      //                          .theta(2)
      //                          .strength(2)
      //                          .distanceMin(15)
      // )
      .alphaMin(0.3);

  // var forceEdges = _.flattenDeep(foci.links().filter(l => l.source.nodes && l.target.nodes).map(l => {
  //   return l.source.nodes.map(s => {
  //     return l.target.nodes.map(t => {
  //       return {
  //         source: nodes.find(d => d.__setKey__ === s.__setKey__),
  //         target: nodes.find(d => d.__setKey__ === t.__setKey__)
  //         // intersec: l.intersec
  //       };
  //     });
  //   });
  // }));

  // console.log("forceEdges", forceEdges);

  //
  // // this should look like:
  // // console.log("edgeList", edgeList);
  //
  // var edgeList = forceEdges.map(e => [e.source.index, e.target.index]);
  // var vertices = nodes.map(d => d.index);
  // var adjList = convert_edgelist_to_adjlist(["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9"], example);

  // console.log("adjList", adjList);

  // var bicomps = foci.bicomps();
  //
  // console.log("bicomps", bicomps);
  // console.log("biconnectedComponents", comps);
  var spreadTags = _.flatten(nodes.map(d => d.tags));

  // console.log("spreadTags", spreadTags);

  var allTags = d3.nest()
    .key(d => d)
    .entries(spreadTags)
  .sort((a, b) => d3.descending(a.values.length, b.values.length));

  var wordScale = d3.scale.linear()
      .domain(d3.extent(allTags, d => d.values.length))
      .rangeRound([7, 50]);

  // var simple_gr = simple_comp(foci.data(), foci.reducedEdges());
  // console.log("largest simple group", simple_gr.find(d => d.length > 50).filter(d => d.label));
  // var complex_gr = bicomps.map(g => {
  //   return g.map(i => nodes[i]);
  // });
  // console.log("bicomps", bicomps);
  // console.log("largest complex group", gr.find(d => d.length > 50).filter(d => d.label));
  // console.log("simple gr", simple_gr);

  // var comps = simple_gr.map((g, i) => {
  //   var nodes = _.flatten(g.map(d => d.nodes));
  //   var tags = d3.nest()
  //     .key(d => d)
  //     // TODO: check it later
  //     .entries(_.flatten(nodes.filter(d => d).map(d => d.tags)))
  //   .sort((a, b) => d3.descending(a.values.length, b.values.length));
  //
  //   return {
  //     id: i + "comp", values: g,
  //     tags: tags,
  //     // TODO: check later
  //     nodes: nodes.filter(d => d)
  //     // nodes: g
  //   };
  // });

  // var cutEdges = foci.cutEdges();
  // console.log("cutEdges", cutEdges);
  //
  // console.log("bundledEdgeSegments", bundledEdgeSegments);

  var boundzoom = function(d) {
    var bbox = this.getBBox(),
      dx = bbox.width,
      dy = bbox.height + 50,
      x = (bbox.x + bbox.x + bbox.width) / 2,
      y = (bbox.y + bbox.y + bbox.height) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, (height + viewBox.top) / 2 - scale * y];

    // d3.select(this).attr("stroke", 0);
    console.log("hull", d);
    // var hullDocs = doc.filter(e => d.nodes.find(n => n.id === e.id));
    // console.log("hullDocs", hullDocs);
    zoom.translate(translate);
    zoom.scale(scale);

    svg.transition()
      .duration(750)
      // .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
  };

  var zoomRect = function(d) {
    // var dx = d.width,
    //   dy = d.height,
    var x = d.x,
      y = d.y,
      scale = 150,//Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [shiftedWidth / 2 - scale * x, shiftedHeight / 2 - scale * y];

    svg.transition()
    .duration(750)
    // .style("stroke-width", 1.5 / scale + "px")
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
  };

  var lc = svg.append("g")
      .attr("class", "hull-labels")
      .selectAll(".label-cont")
      .data(foci.comps(), d => d.id);

  console.log("foci comps", foci.comps());
  var lcEnter = lc.enter();

  var tp = lcEnter
    .append("g")
    .attr("class", ".label-cont")
    .append("text")
      .attr("class", "descr")
    .append("textPath")
      .attr("text-anchor", "middle")
      .attr("startOffset", "75%")
      .attr("alignment-baseline", "text-after-edge")
      .attr("dominant-baseline", "baseline")
      .attr("id", d => "tp-hull" + d.id)
      .attr("xlink:href", d => "#hull " + d.id);

  // var tp = lc.selectAll(".descr").select("textPath");
  tp.each(d => {
    d.scale = d3.scale.linear()
      .domain(d3.extent(d.tags, d => d.values.length))
      .rangeRound([5, 50]);
  });

  tp.selectAll("tspan")
    .data(d => d.tags)
    .enter()
    .append("tspan")
    .attr("font-size", function(d) {
      // var wordScale = d3.select(this.parentNode).datum().scale;
      return wordScale(d.values.length);
    })
  .text(d => d.key+ " · ")
    .on("click", d => console.log("click0", d));

  var hull = lc
      // .attr("class", "group")
      // .append("path", "circle")
      .insert("path", ":first-child")
      .attr("class", "hull")
      .attr("id", d => "hull " + d.id)
      .style("fill", fill)
      .style("stroke-linejoin", "round")
      .style("stroke-width", 10)
      // .style("stroke", groupFill)
      .style("opacity", 0.2)
      .attr("title", d => d.key)
      .attr("d", groupPath)
      .on("click", boundzoom);

  var circle = svg.selectAll(".circle")
    .data(foci.data().filter(d => d.cut))
    .enter()
    .append("circle")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("class", "circle")
      .attr("r", 7)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("fill",  "none");


  svg.append("g")
     .attr("class", "bubble-cont");

  var doc = svg.selectAll(".doc")
    .data(nodes.filter(d => !d.label), d => d.id);

  doc
    .enter()
    .append("g")
    .attr("class", "doc")
    .append("rect")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("rx", 0.05)
      .attr("ry", 0.05)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .attr("fill",  "white")
      .append("title")
        .text(function(d) { return d.__setKey__; });

  var thumb = doc
      .append("foreignObject", ":first-child")
        // .attr("transform", null)
        .attr("width", d => d.width)
        .attr("height", d => d.height);
        // .append("xhtml:div");
        // .attr("class", "thumbnail")
        // .style("width", d => d.width + "px")
        // .style("height", d => d.height + "px");
  var label = svg.selectAll(".label")
    .data(nodes.filter(d => d.label), d => d.id);

  label
    .enter()
    .append("g")
    .attr("class", "label")
    // .insert("rect", ":first-child")
    .append("text")
    // .attr("class", "label")
    .attr("font-size", 5)
    .text(d => d.text);

  label.each(function(d) {
    d.width = this.getBBox().width;
    d.height = this.getBBox().height;

    d3.select(this).select("text")
      .attr("dy", d.height);

    d3.select(this)
      .insert("rect", ":first-child")
      .attr("fill", "none")
      .attr("width", d.width)
      .attr("height", d.height);
  });

  // var circle = svg.append("g")
  //     .attr("class", "circle-cont")
  //     .selectAll("g")
  //     .data(foci.data())
  //     .enter().append("g")
  //       .attr("transform", function(d) {
  //         return "translate(" + d.center.x + "," + d.center.y + ")"; })
  //       .attr("class", function(d) { return "node" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
  //       .on("click", d => console.log(d));

  circle.append("circle")
        .attr("id", function(d, i) { return "node-" + i; })
        .attr("r", function(d) { return d.center.r; })
        .style("stroke", "black")
        .attr("fill", "none")
        .attr("opacity", 0.1)
        .on("click", d => console.log(d));

  // var link = svg.selectAll(".link")
  //              .data(foci.links().filter(l => l.strength === 1));

  simulation.on("end", function() {
    hull.each(function(d) {
      cropHullLabels(d, d3.select(this));
    });

    var deepLinks = _.flattenDeep(foci._cutEdges.map(e => {
                      var src, tgt;
                      if (e.source.nodes.length > e.target.nodes.length) {
                        src = e.source;
                        tgt = e.target;
                      }
                      else {
                        src = e.target;
                        tgt = e.source;
                      }
                      return src.nodes.map(s => {
                        return tgt.nodes.map(t => {
                          return {
                            source: nodes.find(n => n.id === s.id).index,
                            target: nodes.find(n => n.id === t.id).index
                          };
                        });
                      });
    }));

    var flatLinks = foci._cutEdges.map(l => {
                        return {
                          source: l.source.index,
                          target: l.target.index
                        };
                    });

    console.log("deepLinks", deepLinks);

    var fbundling = edgeBundling()
                    .step_size(1)
                    .compatibility_threshold(0.1)
                    .nodes(nodes)
                    .edges(deepLinks);

  var bundledEdgeSegments = fbundling();

    bundledEdgeSegments.forEach( d => {
    // for each of the arrays in the results
    // draw a line between the subdivions points for that edge
        svg
          .insert("path", ":first-child")
            .style("stroke-width", 1)
            .style("stroke", "#ff2222")
            .style("fill", "none")
            .style("stroke-opacity", 0.3) //use opacity as blending
          .attr("d", bundleLine(d));
    });

    marching_squares(group => {
      // TODO: hull zoom
      // this happens in a for loop
      var backdrop = svg.select(".bubble-cont")
         .selectAll(".backdrop")
         .data(group.d);

      // console.log("group d", group.d);
            // .attr("d", function(d){ return curve(d); })
      backdrop.enter()
        // .insert("path", ":first-child")
        .append("path")
        .attr("class", "backdrop")
        .attr("stroke-linejoin", "round")
        .attr("opacity", 0.1);
            // .attr("id", (d, i) => "co" + i)

      backdrop
        .attr("d", d => hullcurve(d))
        .attr("fill", "grey")
        .attr("stroke", "lightgrey")
        .on("click", boundzoom);
        // .on("click", boundzoom)
        // .on("mouseover", function(d) {
        //   d3.select(this).attr("opacity", 1);
        //   console.log("d", d);
        // })
        // .on("mouseout", function() {
        //   d3.select(this).attr("opacity", 0.5);
        // });

      backdrop.exit().remove();

      }, [{values: foci.data()}], 0.005);

    appliedComps.forEach((c, i)=> {
      // console.log("current comp", c);
      marching_squares(group => {
        // TODO: not running right now
        // console.log("group", group);
        // this happens in a for loop
        var bubble = svg.select(".bubble-cont")
           .selectAll(".bubble-"+ i + group.key)
           .data(group.d);

        // console.log("group d", group.d);
              // .attr("d", function(d){ return curve(d); })
        bubble.enter()
          // .insert("path", ":first-child")
          .append("path")
          .attr("class", "bubble-"+ i + group.key)
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.3);
              // .attr("id", (d, i) => "co" + i)

        bubble
          .attr("d", d => hullcurve(d))
          .attr("fill", hullcolor(group.key))
          .on("click", boundzoom)
          .on("mouseover", function(d) {
            d3.select(this).attr("opacity", 1);
            console.log("d", d);
          })
          .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.5);
          });

        bubble.exit().remove();
      }, c.sets);

    });


    // link.enter()
    //   .insert("line", ":first-child")
    //   // .append("line")
    //   //    .attr("class", function(d) { return "link " + d.type; })
    //   .attr("class", "link")
    //   // .attr("opacity", 0.3)
    //   // .attr("marker-end", "url(#end)");
    //   .attr("x1", d => d.source.x)
    //   .attr("y1", d => d.source.y)
    //   .attr("x2", d => d.target.x)
    //   .attr("y2", d => d.target.y);
    });

  simulation.on("tick", function() {

    // label.each(d => {
    //   d.x = Math.max(d.width, Math.min(width - 2, d.x));
    //   d.y = Math.max(d.height, Math.min(height - 2, d.y));
    // });
    // doc.each(d => {
    //   d.x = Math.max(d.width, Math.min(width - 2, d.x));
    //   d.y = Math.max(d.height, Math.min(height - 2, d.y));
    // });

    var q2 = d3.geom.quadtree(nodes);
    nodes.forEach(d => {
      q2.visit(collide(d, 5, 1));
      // var circle={x: shiftedWidth/2, y: shiftedHeight/2, r: 300};
      // var collision = rectCircleColliding(circle, d, false);
      // if (collision.bounce) {
      //   d.x = d.x + (collision.x * d.x) * 0.01;
      //   d.y = d.y + (collision.y * d.y) * 0.01;
      // }
      // boundPanel(d, panels.center, 1);
    });

    // label.each((collide(label.data(), e.alpha, 10)));
    //

    // doc.each(d => boundMargin(d, width, height, margin));
    // label.each(d => boundMargin(d, width, height, margin));

    hull.attr("d", groupPath);

    hull.each(function(d) {
      cropHullLabels(d, d3.select(this));
    });


    doc.attr("transform", d => {
      return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
    });
    label.attr("transform", d => {
      return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
    });


    // doc.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    // doc.attr("x", d => d.x - d.width / 2 );
    // doc.attr("y", d => d.y - d.width / 2 );



  });


  doc.on("click", function(d) {
    console.log("d", d);
    var rectBox = this.getBoundingClientRect();
    var bbox = this.getBBox();
    console.log("bbox", bbox, "rectBox", rectBox);
    svg.append("circle")
       .attr("cx", d.x)
       .attr("cy", d.y)
       .attr("r", 1)
       .attr("fill", "none")
       .attr("stroke", 0.5);

    zoomRect(d);
    // boundzoom.bind(this)();
    // rectBox.width = 80;
    // rectBox.height = 80;

    // var thumbNail = d3.select(this).select("foreignObject div");
    // var iframe = d3.select(this).select("foreignObject div iframe");
    // console.log("iframe", iframe, "sibling", prev);
    // iframe.attr("src", "http://starkravingfinkle.org/blog");

    // iframe.style("width", w + "px");
    // iframe.style("height", h + "px");

    // var preview = d3.select(this)
    //   .insert("foreignObject", ":first-child")
    //     .attr("transform", null)
    //     .attr("width", d.width)
    //     .attr("height", d.height)
    //     .append("xhtml:div")
    //     .attr("class", "thumbnail")
    //     // .style("width", bbox.width + "px")
    //     // .style("height", bbox.height + "px")
    //     .insert("xhtml:iframe", ":first-child")
    //     // .attr("class", "link-preview")
    //     .style("z-index", 10)
    //     // .style("width", d.width + "px")
    //     // .style("height", d.height + "px")
        // .attr("src", "http://starkravingfinkle.org/blog");

    // console.log("BBox", bbox, "preview", prev);
  });

});
