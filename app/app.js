import d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";
import d3_force from "d3-force";

import marching_squares from "./marchingSquaresHelpers.js";
import offsetInterpolate from "./polyOffset.js";

import edgeBundling from "./edgebundling.js";
import brewer from "colorbrewer";

import tagList from "./tagList.js";

console.log("brewer", brewer);

var o = d3.scale.ordinal()
    .domain(["foo", "bar", "baz"])
    .range(brewer.Paired[9]);

var hullcolor = d3.scale.category20();

var hullcurve = d3.svg.line()
  .interpolate("linear")
  .x(d => d.x)
  .y(d => d.y);

var bundleLine = d3.svg.line()
            .x(d => d.x)
            .y(d => d.y)
            .interpolate("monotone");

function collide(node, energy) {
  return function(quad, x1, y1, x2, y2) {
    var updated = false;
    if (quad.point && (quad.point !== node)) {

      var x = node.x - quad.point.x,
        y = node.y - quad.point.y,
        xSpacing = (quad.point.width + node.width) / 2,
        ySpacing = (quad.point.height + node.height) / 2,
        absX = Math.abs(x),
        absY = Math.abs(y),
        l,
        lx,
        ly;

      if (absX < xSpacing && absY < ySpacing) {
        l = Math.sqrt(x * x + y * y);

        lx = (absX - xSpacing) / l;
        ly = (absY - ySpacing) / l;

        // the one that's barely within the bounds probably triggered the collision
        if (Math.abs(lx) > Math.abs(ly)) {
          lx = 0;
        } else {
          ly = 0;
        }

        node.vx -= x *= lx;
        node.vy -= y *= ly;
        quad.point.vx += x;
        quad.point.vy += y;

        updated = true;
      }
    }
    return updated;
  };
}

var collide0 = function(nodes) {
  return function(alpha) {
    var quadtree = d3.geom.quadtree(nodes);
      for (var i = 0, n = nodes.length; i < n; ++i) {
        var d = nodes[i];
        d.r = 50;
        var nx1 = d.x - d.r,
          nx2 = d.x + d.r,
          ny1 = d.y - d.r,
          ny2 = d.y + d.r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d) && quad.point.comp !== d.comp && quad.point.clicked && d.clicked) {
            // console.log("quad.point", quad.point.comp, d.comp);
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = d.r + quad.point.r;

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
      }
    };
};

var collide_compose = function(nodes) {
  var q = d3.geom.quadtree(nodes);
  return function(alpha) {
    for (var i = 0, n = nodes.length; i < n; ++i) {
    // while (++i < n) {
            // console.log("alpha", alpha);
            q.visit(collide(nodes[i]), alpha);
            // checkBounds(nodes[i]);
    }
  };
};

// var collide_rect = function(nodes) {
//   var padding = 0;
//   return function(alpha) {
//     var quadtree = d3.geom.quadtree(nodes);
//     var energy = alpha * 2;
//       for (var i = 0, n = nodes.length; i < n; ++i) {
//         var node = nodes[i];
//         quadtree.visit(function(quad, x1, y1, x2, y2) {
//           if (quad.point && (quad.point !== node) && quad.point.comp === node.comp) {
//             var x = node.x - quad.point.x,
//                 y = node.y - quad.point.y,
//                 xSpacing = (quad.point.width + node.width + padding) / 2,
//                 ySpacing = (quad.point.height + node.height + padding) / 2,
//                 absX = Math.abs(x),
//                 absY = Math.abs(y),
//                 l,
//                 lx,
//                 ly;
//
//             if (absX < xSpacing && absY < ySpacing) {
//                 l = Math.sqrt(x * x + y * y) * energy;
//
//                 lx = (absX - xSpacing) / l;
//                 ly = (absY - ySpacing) / l;
//
//                 // the one that"s barely within the bounds probably triggered the collision
//                 if (Math.abs(lx) > Math.abs(ly)) {
//                         lx = 0;
//                 } else {
//                         ly = 0;
//                 }
//
//                 node.vx -= x *= lx;
//                 node.vy -= y *= ly;
//                 quad.point.vx += x;
//                 quad.point.vy += y;
//
//                 // updated = true;
//             }
//           }
//         });
//     }
//      // return updated;
//     };
// };

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


var width = 1000;//window.innerWidth;
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

// function interCollide(node, padding, energy) {
//     return function(quad) {
//       var updated = false;
//       if (quad.point && (quad.point !== node) && quad.point.comp !== node.comp && quad.point.clicked && node.clicked) {
//         var x = node.x - quad.point.x,
//             y = node.y - quad.point.y,
//             xSpacing = (quad.point.width + node.width + padding) / 2,
//             ySpacing = (quad.point.height + node.height + padding) / 2,
//             absX = Math.abs(x),
//             absY = Math.abs(y),
//             l,
//             lx,
//             ly;
//
//         if (absX < xSpacing && absY < ySpacing) {
//             l = Math.sqrt(x * x + y * y) * energy;
//
//             lx = (absX - xSpacing) / l;
//             ly = (absY - ySpacing) / l;
//
//             // the one that"s barely within the bounds probably triggered the collision
//             if (Math.abs(lx) > Math.abs(ly)) {
//                     lx = 0;
//             } else {
//                     ly = 0;
//             }
//
//             node.vx -= x *= lx;
//             node.vy -= y *= ly;
//             quad.point.vx += x;
//             quad.point.vy += y;
//
//             updated = true;
//         }
//       }
//       return updated;
//     };
// }

function intraCollide(node, padding, energy) {
    return function(quad) {
      var updated = false;
      if (quad.point && (quad.point !== node) && quad.point.comp === node.comp) {
        var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            xSpacing = (quad.point.width + (node.width) + padding) / 2,
            ySpacing = (quad.point.height + (node.height) + padding) / 2,
            absX = Math.abs(x),
            absY = Math.abs(y),
            l,
            lx,
            ly;

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
var groupPath = function(d) {
  if (d.nodes.length < 2) return null;

  var hull = d3.geom.hull()
    .x(function(d) {
    return d.x;
  }).y(function(d) {
    return d.y;
  });

  var labelLine = d3.svg.line()
    .x(d => d.x)
    .y(d => d.y)
    .interpolate(offsetInterpolate(d.clicked ? 30 : 15));

  return labelLine(hull(d.nodes).reverse());
};


d3.json("diigo.json", function(error, data) {
  var diigo = data.slice(0, 300).map((d, i)=> {
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
                //
  svg.append("rect")
        .attr("width", shiftedWidth)
        .attr("height", shiftedHeight)
        .style("pointer-events", "all")
        .style("fill", "none");
            //make transparent (vs black if commented-out)
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
      e.clicked = false;
      // e.tags = e.sets;
      return e;
    });
  }));

  var appliedComps = foci.comps().map(c => {
    c.isolevel = 0.0050;
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

  nodes.forEach(d => {
    var cx = width / 2;
    var cy  = (height + viewBox.top) / 2;
    var m = 4;
    var i = Math.floor(Math.random() * m);
      // var m = i % 7 + 1;
      // d.x = panels.top.cx;
      // d.y = panels.top.cy + Math.random();

      // d.y = getRandomIntInclusive(0, height);
      d.x = Math.cos(i / m * 2 * Math.PI) * 200 + cx + Math.random();
      d.y = Math.sin(i / m * 2 * Math.PI) * 200 + cy  + Math.random();
  });

  var simulation = d3_force.forceSimulation(nodes)
      // .force("charge", d3_force.forceManyBody()
      //                    .strength(- 10)
      //                    // .distanceMin(9)
      //                    // .distanceMax(200)
      // )
      .force("x", d3_force.forceX(d => d.center.x)
        .strength(d => d.clicked ? 0 : 0.1)
      )
      .force("y", d3_force.forceY(d => d.center.y)
        .strength(d => d.clicked ? 0 : 0.1)
      )
      .force("intraCollide", collide_compose(nodes))
      // .force("interCollide", collide0(nodes));
      .alphaMin(0.3);

  var spreadNodes = _.flatten(nodes.map(d => d.tags.map(t => {
    var copy = _.clone(d);
    copy.key = t;
    return copy;
  })));

  var allTags = d3.nest()
    .key(d => d.key)
    .entries(spreadNodes)
    .map(n => {
      var tags = _.uniq(_.flatten(n.values.map(v => v.tags)))
        .filter(t => t !== n.key);
      n.relatedTags = tags;
      return n;
    })
  .sort((a, b) => d3.descending(a.values.length, b.values.length));

  console.log("allTags", allTags);

  var wordScale = d3.scale.linear()
      .domain(d3.extent(allTags, d => d.values.length))
      .rangeRound([7, 50]);

  var boundzoom = function(d) {
    // simulation.alphaTarget(0.7);
    var bbox = this.getBBox(),
      dx = bbox.width,
      dy = bbox.height + 50,
      x = (bbox.x + bbox.x + bbox.width) / 2,
      y = (bbox.y + bbox.y + bbox.height) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, (height + viewBox.top) / 2 - scale * y];

    // d3.select(this).attr("stroke", 0);
    // console.log("hull", d);
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

  // console.log("foci comps", foci.comps());
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
      .on("click", function(d) {
        d.clicked = true;
        // d.isolevel = 0.0120;
        d.isolevel = 0.0020;
        var ids = d.nodes.map(d => d.id);
        var hullNodes = d3.selectAll(".doc")
          .filter(e => ids.indexOf(e.id) !== -1);

        console.log("hullNodes", hullNodes);
        hullNodes.each(function(d) {
          d.width = 20;
          d.height = 40;
          d.clicked = true;
          // d.fixed = true;
        });

        simulation.restart();
        // hullNodes
        // simulation.alphaTarget(0.7);
      });

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
      .attr("rx", 0.05)
      .attr("ry", 0.05)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .attr("fill",  "white")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .append("title")
      .text(d => d.__setKey__);

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

    // console.log("deepLinks", deepLinks);

    var fbundling = edgeBundling()
                    .step_size(1)
                    .compatibility_threshold(0.35)
                    .nodes(nodes)
                    .edges(deepLinks);

    var bundledEdgeSegments = fbundling();

    bundledEdgeSegments.forEach( d => {
    // for each of the arrays in the results
    // draw a line between the subdivions points for that edge
        svg.selectAll(".bundle-line").remove();
        svg
          .insert("path", ":first-child")
          .style("stroke-width", 1)
          .style("stroke", "#ff2222")
          .style("fill", "none")
          .style("stroke-opacity", 0.3) //use opacity as blending;
          .attr("d", bundleLine(d))
          .attr("class", "bundle-link");
    });

    // marching_squares(group => {
    //   // TODO: hull zoom
    //   // this happens in a for loop
    //   var backdrop = svg.select(".bubble-cont")
    //      .selectAll(".backdrop")
    //      .data(group.d);
    //
    //   // console.log("group d", group.d);
    //         // .attr("d", function(d){ return curve(d); })
    //   backdrop.enter()
    //     // .insert("path", ":first-child")
    //     .append("path")
    //     .attr("class", "backdrop")
    //     .attr("stroke-linejoin", "round")
    //     .attr("opacity", 0.1);
    //         // .attr("id", (d, i) => "co" + i)
    //
    //   backdrop
    //     .attr("d", d => hullcurve(d))
    //     .attr("fill", "grey")
    //     .attr("stroke", "lightgrey")
    //     .on("click", boundzoom);
    //     // .on("click", boundzoom)
    //     // .on("mouseover", function(d) {
    //     //   d3.select(this).attr("opacity", 1);
    //     //   console.log("d", d);
    //     // })
    //     // .on("mouseout", function() {
    //     //   d3.select(this).attr("opacity", 0.5);
    //     // });
    //
    //   backdrop.exit().remove();
    //
    //   }, [{values: foci.data()}], 0.005);


    appliedComps.forEach((c, i) => {
      // console.log("current comp", c);
      // c.sets.forEach(s => {
      //   // console.log("set", s);
      //   s.values = _.flatten(s.values.map(n => {
      //     return [
      //       {x: n.x, y: n.y},
      //       {x: n.x, y: n.y + n.height},
      //       {x: n.x + n.width, y: n.y},
      //       {x: n.x + n.width, y: n.y + n.height}
      //     ];
      //   }));
      // });
      var bufSets;
      if (c.clicked) {
        var padding = 0;
        bufSets = c.sets.map(s => {
          return {
            values: _.flatten(s.values.map(n => {
                // n.x = n.x - n.width / 2;
                // n.y = n.y - n.height / 2;
              return [
               {x: n.x, y: n.y},
                {x: n.x, y: n.y + (n.height / 2) + padding},
                {x: n.x, y: n.y - (n.height / 2) - padding},
                {x: n.x + (n.width / 2) + padding, y: n.y},
                {x: n.x - (n.width / 2) - padding, y: n.y},
                // //
                // {x: n.x + n.width / 2, y: n.y - (n.height / 2) - padding},
                // {x: n.x + n.width / 2, y: n.y + (n.height / 2) - padding},
                //
                // {x: n.x - n.width / 2, y: n.y - (n.height / 2) - padding},
                // {x: n.x - n.width / 2, y: n.y + (n.height / 2) - padding},

                // {x: n.x - n.width / 4, y: n.y - n.height / 4},
                // {x: n.x - n.width / 4, y: n.y + n.height / 4},
                //
                // {x: n.x + n.width / 4, y: n.y - n.height / 4},
                // {x: n.x + n.width / 4, y: n.y + n.height / 4}
              ];
            }))
          };
        });
      } else bufSets = c.sets;

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
          .attr("fill", o(group.key))
          .on("click", boundzoom)
          .on("mouseover", function(d) {
            d3.select(this).attr("opacity", 1);
            console.log("d", d);
          })
          .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.5);
          });

        bubble.exit().remove();
      }, bufSets, c.isolevel);
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

    // var q2 = d3.geom.quadtree(nodes);
    // nodes.forEach(d => {
    //   if (d.clicked){
    //     // q2.visit(interCollide(d, 75, 8));
    //     q2.visit(intraCollide(d, 5, 2));
    //   }
    // });

    // label.each((interCollide(label.data(), e.alpha, 10)));
    //

    // doc.each(d => boundMargin(d, width, height, margin));
    // label.each(d => boundMargin(d, width, height, margin));

    hull.attr("d", groupPath);

    hull.each(function(d) {
      cropHullLabels(d, d3.select(this));
    });

    doc
      .attr("transform", d => {
        return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
      })
      .select("rect")
      .attr("width", d => d.width)
      .attr("height", d => d.height);

    label.attr("transform", d => {
      return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
    });
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
  console.log("foci hierarchy", foci.hierarchy());
  tagList(simulation, foci.hierarchy());
});
