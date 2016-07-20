// import d3 from "d3";
import * as d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";
import * as d3_force from "d3-force";

import marching_squares from "./marchingSquaresHelpers.js";
import offsetInterpolate from "./polyOffset.js";

import edgeBundling from "./edgebundling.js";
import brewer from "colorbrewer";
import rectCollide from "./utils.js";

import tagList from "./tagList.js";
import timeCloud from "./tagStream.js";
// bigger scale :0.0048
//
const linkOpacity = 0.05;

var dbg = d => {
  console.log("dbg", d);
  return d;
};

function styleTspan(wordScale) {
  return function(self) {
    self.attr("class", "tagLabel")
    .attr("font-size", function(d) {
      return wordScale(d.values.length);
    })
  .text(d => d.key+ " · ")
    .on("mouseover", function(d) {

      var lc = d3.selectAll(".textPath")
        .filter(e => e.tags.map(d => d.key).includes(d.key));
      var selComps = lc.data();

      d3.select(this)
        .style("font-weight", "bold");
        // .style("fill", "red");

      d.tmpSel = lc.selectAll("tspan").filter(e => e.key === d.key);
      d.tmpSel
        .style("font-weight", "bold")
        .style("font-size", d => wordScale(d.values.length) + 10);
        // .style("fill", "red");

      selComps.forEach(src => {
        selComps.forEach(c => {
          var q = ".bundle-link-" + src.id + "-" + c.id;
          d3.selectAll(q)
            .style("stroke-opacity", 0.2);
        });
      });

    })
    .on("mouseout", function(d){
      d.tmpSel
        .style("font-weight", null)
        .style("font-size", d => wordScale(d.values.length))
        .style("fill", null);

      d3.selectAll(".bd")
        .style("stroke-opacity", linkOpacity);
    });
  };
}

var o = d3.scaleOrdinal()
    .domain(["foo", "bar", "baz"])
    .range(brewer.Paired[9]);

// var hullcolor = d3.scale.category20();
// var size = d3.scaleLinear()
//              .domain([0, 400])
//              .range([0, 10]);

var hullcurve = d3.line()
  .curve(d3.curveBasisClosed)
  .x(d => d.x)
  .y(d => d.y);

var bundleLine = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveBundle);

// function collide(node, energy) {
//   return function(quad, x1, y1, x2, y2) {
//     var updated = false;
//     if (quad.point && (quad.point !== node)) {
//
//       var x = node.x - quad.point.x,
//         y = node.y - quad.point.y,
//         xSpacing = (quad.point.width + node.width) / 2,
//         ySpacing = (quad.point.height + node.height) / 2,
//         absX = Math.abs(x),
//         absY = Math.abs(y),
//         l,
//         lx,
//         ly;
//
//       if (absX < xSpacing && absY < ySpacing) {
//         l = Math.sqrt(x * x + y * y);
//
//         lx = (absX - xSpacing) / l;
//         ly = (absY - ySpacing) / l;
//
//         // the one that's barely within the bounds probably triggered the collision
//         if (Math.abs(lx) > Math.abs(ly)) {
//           lx = 0;
//         } else {
//           ly = 0;
//         }
//
//         node.vx -= x *= lx;
//         node.vy -= y *= ly;
//         quad.point.vx += x;
//         quad.point.vy += y;
//
//         updated = true;
//       }
//     }
//     return updated;
//   };
// }

// var collide0 = function(nodes) {
//   return function(alpha) {
//     var quadtree = d3.geom.quadtree(nodes);
//       for (var i = 0, n = nodes.length; i < n; ++i) {
//         var d = nodes[i];
//         d.r = 50;
//         var nx1 = d.x - d.r,
//           nx2 = d.x + d.r,
//           ny1 = d.y - d.r,
//           ny2 = d.y + d.r;
//         quadtree.visit(function(quad, x1, y1, x2, y2) {
//           if (quad.point && (quad.point !== d) && quad.point.comp !== d.comp && quad.point.clicked && d.clicked) {
//             // console.log("quad.point", quad.point.comp, d.comp);
//             var x = d.x - quad.point.x,
//                 y = d.y - quad.point.y,
//                 l = Math.sqrt(x * x + y * y),
//                 r = d.r + quad.point.r;
//
//             if (l < r) {
//               l = (l - r) / l * alpha;
//               d.x -= x *= l;
//               d.y -= y *= l;
//               quad.point.x += x;
//               quad.point.y += y;
//             }
//           }
//           return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
//         });
//       }
//     };
// };

// var collide_compose = function(nodes) {
//   var q = d3.geom.quadtree(nodes);
//   return function(alpha) {
//     for (var i = 0, n = nodes.length; i < n; ++i) {
//     // while (++i < n) {
//             // console.log("alpha", alpha);
//             q.visit(collide(nodes[i]), alpha);
//             // checkBounds(nodes[i]);
//     }
//   };
// };

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

require("./style/style.less");

var width = 1000;//window.innerWidth;
var height = 400;//window.innerHeight;

var viewBox = {
  left: 0,
  top: 300
};

var shiftedHeight = height + viewBox.top;
var shiftedWidth = width + viewBox.top;

// function intraCollide(node, padding, energy) {
//     return function(quad) {
//       var updated = false;
//       if (quad.point && (quad.point !== node) && quad.point.comp === node.comp) {
//         var x = node.x - quad.point.x,
//             y = node.y - quad.point.y,
//             xSpacing = (quad.point.width + (node.width) + padding) / 2,
//             ySpacing = (quad.point.height + (node.height) + padding) / 2,
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
//             node.x -= x *= lx;
//             node.y -= y *= ly;
//             quad.point.x += x;
//             quad.point.y += y;
//
//             updated = true;
//         }
//       }
//       return updated;
//     };
// }
//
// function nbsDirected(a, linkedByIndex) {
//   var nbs = [];
//   for (var property in linkedByIndex) {
//     var s = property.split(",").map(d => parseInt(d));
//     // if (s[0] === a) {
//     //   nbs.push(s[1]);
//     // }
//     // else {
//       if (s[1] === a) {
//         nbs.push(s[0]);
//       }
//     // }
//   }
//   return _.uniq(nbs);
// }
//
// function collideCircle(data, alpha, padding) {
//   var quadtree = d3.geom.quadtree(data);
//   return function(d) {
//       var r = d.r + padding,
//           nx1 = d.x - r,
//           nx2 = d.x + r,
//           ny1 = d.y - r,
//           ny2 = d.y + r;
//       quadtree.visit(function(quad, x1, y1, x2, y2) {
//         if (quad.point && (quad.point !== d)) {
//           var x = d.x - quad.point.x,
//               y = d.y - quad.point.y,
//               l = Math.sqrt(x * x + y * y),
//               r = d.r + padding + quad.point.r;
//
//           if (l < r) {
//             l = (l - r) / l * alpha;
//             d.x -= x *= l;
//             d.y -= y *= l;
//             quad.point.x += x;
//             quad.point.y += y;
//           }
//         }
//         return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
//     });
//   };
// }
//

var fill = (i) => d3.schemeCategory10[i];

// d3.select("body").append("div")
//   .on("click", () => console.log("it works with es6!"))
//   .text("it works!");

// Converts an edgelist to an adjacency list representation
// In this program, we use a dictionary as an adjacency list,
// where each key is a vertex, and each value is a list of all
// vertices adjacent to that vertex
// Breadth First Search using adjacency list
var groupPath = function(nodes) {
    var fakePoints = [];
    var offset = 5;
    nodes.forEach(function(element) {
      fakePoints = fakePoints.concat([   // "0.7071" is the sine and cosine of 45 degree for corner points.
        [(element.x), (element.y + offset)],
        [(element.x + (0.7071 * offset)),
          (element.y + (0.7071 * offset))],
        [(element.x + offset), (element.y)],
               [(element.x + (0.7071 * offset)),
                 (element.y - (0.7071 * offset))],
               [(element.x), (element.y - offset)],
               [(element.x - (0.7071 * offset)),
                 (element.y - (0.7071 * offset))],
               [(element.x - offset), (element.y)],
               [(element.x - (0.7071 * offset)),
                 (element.y + (0.7071 * offset))]
        ]);
    });

  var hull = d3.polygonHull(fakePoints).reverse();
  return offsetInterpolate(15)(hull);
};

var groupPathAll = function(nodes) {
  var hull = d3.polygonHull(nodes.map(d => [d.x, d.y]));
  if (!hull) {
    console.log("noHULL");
    return null;
  }
  return offsetInterpolate(0)(hull.reverse());
};

function create(diigo) {
  var g = d3.select("body")
              .append("div")
              .attr("class", "node-map view")
              .append("svg")
              .attr("width", width)
              .attr("height", height)
              // .attr("viewBox", 0 + " " + 200 + " " + width + " " + height)
              .attr("viewBox", (viewBox.left ) + " " + (viewBox.top ) + " " + (width - viewBox.left) + " " + (height - viewBox.top))
              // .attr("overflow", "visible")
              .append("g")
              // .attr("viewBox", (-viewBox.left ) + " " + (-viewBox.top ) + " " + (width - viewBox.left) + " " + (height - viewBox.top))
                // .attr("transform", "translate(200, 200)")
                .attr("overflow", "visible");
                // .attr("transform", "translate(" + [0, 0] + ")")
                // .append("g");
                //
                //

  var foci = fociLayout()
                .sets(diigo)
                .size([shiftedWidth, shiftedHeight])
                .start();

  g.append("g")
    .attr("class", "edge-seg");

  d3.select(".node-map")
    .insert("div", ":first-child")
    .attr("class", "view-name")
    .append("h3")
    .text("node-map");

  // g.append("rect")
  //       .attr("width", shiftedWidth)
  //       .attr("height", shiftedHeight)
  //       .style("pointer-events", "all")
  //       .style("fill", "none");
            //make transparent (vs black if commented-out)
            //
  g.append("g")
    .attr("class", "hull-labels");

  g.append("g")
     .attr("class", "bubble-cont");


  d3.select("body").append("p").append("input")
    .datum({})
    .attr("id", "slider")
    .attr("type", "range")

  var state = {first: true};
  update(foci, {main: true, search: true, cloud: true}, state);
}



function update(foci, pattern, state) {

  console.log("foci data", foci.data());
  var cont = d3.select(".node-map"),
  svg = cont.select("svg g"),
  hullLabelCont = d3.select(".hull-labels"),

  bubbleCont = svg.select(".bubble-cont");
  hullLabelCont.selectAll("*").remove();
  d3.selectAll(".bubbleHandle").remove();
  d3.selectAll(".bd").remove();

  var zoom = d3.zoom()
     .extent([shiftedWidth, shiftedHeight])
     .scaleExtent([-100, 40])
     .on("zoom", function() {
        var translate = [d3.event.transform.x, d3.event.transform.y];
        var scale = d3.event.transform.k;

        svg
          .transition(1000)
          .attr("transform", "translate(" + translate  + ")scale(" + scale + ")");

        var w = 1 * d3.event.transform.k;
        var h = 2 * d3.event.transform.k;
        // thumb
        //   .style("width", w + "px")
        //   .style("height", h + "px");

        d3.selectAll(".thumb").select("iframe")
          .style("transform", "translate("+ [- w + "px", - h / 2 + "px"] +")")
          .style("width", w + "px")
          .style("height", h + "px");
        // thumb.style("width", w + "px");
        // thumb.style("height", h + "px");
     });
  // var boundzoom = function() {
  //   console.log("click zoom");
  //   var bbox = this.getBBox(),
  //     dx = bbox.width,
  //     dy = bbox.height,
  //     x = (bbox.x + bbox.x + bbox.width) / 2,
  //     y = (bbox.y + bbox.y + bbox.height) / 2,
  //     scale = Math.max(-10, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
  //     translate = [width / 2 - scale * x, (height + viewBox.top) / 2 - scale * y];
  //   // console.log("hull", d);
  //   // var hullDocs = gDoc.filter(e => d.nodes.find(n => n.id === e.id));
  //   // console.log("hullDocs", hullDocs);
  //   zoom.translateExtent(translate);
  //   // TODO: maxScale 1000?
  //   zoom.scaleExtent([scale, 1000]);
  //
  //   svg.transition()
  //     .duration(750)
  //     // .style("stroke-width", 1.5 / scale + "px")
  //     .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
  // };
  svg.call(zoom);

  d3.select("#slider")
    .attr("value", zoom.scaleExtent()[0])
    .attr("min", zoom.scaleExtent()[0])
    .attr("max", zoom.scaleExtent()[1])
    .attr("step", (zoom.scaleExtent()[1] - zoom.scaleExtent()[0]) / 100)
    .on("input", function() {
      zoom.scale(d3.select(this).property("value"))
          .event(svg);
    });

  var programmaticZoom = function(state) {
    // simulation.alphaTarget(0.7);
    return function(self) {
      var bbox = self.node().getBBox(),
        dx = bbox.width,
        dy = bbox.height,
        x = (bbox.x + bbox.x + bbox.width) / 2,
        y = (bbox.y + bbox.y + bbox.height) / 2,
        scale = Math.max(-10, Math.min(2.5, 1 / Math.max(dx / width, dy / height))),
        translate = [width / 2 - scale * x,
          (height + viewBox.top) / 2 - scale * y];

      zoom.transform(svg,
        d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale));
      // // TODO: maxScale 1000?
      // zoom.scaleExtent([scale, 1000]);
      // console.log("trans", translate);
      // zoom.translate(translate[0], translate[1]);
      // zoom.scale(scale);

      // svg.call(d3.zoomIdentity
      //   .translate(width / 2, height / 2)
      //   .scale(8)
      //   .translate(translate[0], translate[1]));

      // zoom.transform(svg, "translate(" + translate + ")scale(" + scale + ")");
      // svg.transition()
      //   .duration(750)
      //   // .style("stroke-width", 1.5 / scale + "px")
      //   .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

    };
  };

  var nodes = _.flatten(foci.data().map(d => {
    // TODO: not really clean
    if (d.label) return d;
    return d.nodes.map(e => {
      e.center = d.center;
      e.width = 3; // bigger 1: 10, 20
      e.height = 6;
      e.clicked = false;
      e.level = d.level;
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


  // console.log("foci data", foci.data(), foci.data().length);
  // console.log("foci links", foci.links());
  // console.log("force nodes", nodes, "length", nodes.length);
  // console.log("foci-groups", foci.groups());

  var simulation = d3.forceSimulation(nodes)
      .force("charge", d3_force.forceManyBody()
                         .strength(- 2)
                         // .distanceMin(9)
                         // .distanceMax(200)
      )
      .force("x", d3_force.forceX(d => d.center.x)
        .strength(0.5)
      )
      .force("y", d3_force.forceY(d => d.center.y)
        .strength(0.5)
      )
      // .force("collide", rectCollide(nodes, 0.6))
      .alphaMin(0.7);

  var spreadNodes = _.flatten(nodes.map(d => d.tags.map(t => {
    var copy = _.clone(d);
    copy.key = t;
    return copy;
  })));


  var allTags = d3.nest()
    .key(d => d.key)
    .entries(spreadNodes)
  .sort((a, b) => d3.descending(a.values.length, b.values.length));


  // var tagLinks = [];
  // allTags.forEach((n, i)=> {
  //   n.index = i;
  //   var tags = _.uniq(_.flatten(n.values.map(v => v.tags)))
  //     .filter(t => t !== n.key);
  //   tags.forEach(t => {
  //     if (t !== n.key) {
  //       var tgtIndex = allTags.findIndex(d => d.key === t);
  //       tagLinks.push({source: i, target: tgtIndex});
  //     }
  //   });
  // });

  var wordScale = d3.scaleLinear()
      .domain(d3.extent(allTags, d => d.values.length))
      .rangeRound([7, 50/2]);


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

  var labelG = hullLabelCont
      .selectAll("g")
      .data(foci.comps(), d => d.id);

  labelG.exit().remove();
  var labelGEnter = labelG.enter();
  var labelGMerge = labelGEnter.merge(labelG);

  var textPath = labelGEnter
    .append("g")
    .append("text")
    .append("textPath")
      .attr("class", d => "label-cont-" + d.id + " textPath")
      .attr("text-anchor", "middle")
      .attr("startOffset", "75%")
      .attr("alignment-baseline", "text-after-edge")
      .attr("dominant-baseline", "baseline")
      .attr("id", d => "tp-hull" + d.id)
      .attr("xlink:href", d => "#hull " + d.id);

  textPath.selectAll("tspan")
    .data(d => d.sets)
    .enter()
    .append("tspan")
    .call(styleTspan(wordScale));

  var hull = labelGEnter
      // .attr("class", "group")
      // .append("path", "circle")
      .insert("path", ":first-child")
      .attr("class", "hull")
      .attr("id", d => "hull " + d.id)
      .style("fill", fill)
      // .on("click", boundzoom)
      .attr("title", d => d.key);

  labelGMerge.selectAll("path")
    .attr("d", d => groupPath(d.nodes))
      .on("click", function(d) {
        d.clicked = true;
        // d.isolevel = 0.0120;
        var ids = d.nodes.map(d => d.id);
        var hullNodes = d3.selectAll(".doc")
          .filter(e => ids.indexOf(e.id) !== -1);

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

  // var circle = svg.selectAll(".circle")
  //   .data(foci.data().filter(d => d.cut))
  //   .enter()
  //   .append("circle")
  //     // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
  //     .attr("class", "circle")
  //     .attr("r", 7)
  //     .attr("cx", d => d.x)
  //     .attr("cy", d => d.y)
  //     .attr("stroke", "red")
  //     .attr("stroke-width", 2)
  //     .attr("fill",  "none");



  var doc = svg.selectAll(".doc")
    .data(nodes.filter(d => !d.label), d => d.id);

  var docEnter = doc
    .enter()
    .append("g")
    .attr("class", "doc");

  doc.exit().remove();


  var rectDoc = docEnter.append("rect")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("rx", 0.05)
      .attr("ry", 0.05)
      .attr("stroke", "black")
      .attr("stroke-width", 0.3)
      .attr("fill",  "white")
      .attr("width", d => d.width)
      .attr("height", d => d.height);

  docEnter.append("title")
      .text(d => d.__setKey__);

  var docMerge = docEnter.merge(doc);

  // TODO: fix update
  // var thumb = doc
  //     .append("foreignObject", ":first-child")
  //     .attr("class", "thumb")
  //       // .attr("transform", null)
  //       .attr("width", d => d.width)
  //       .attr("height", d => d.height);
  //       // .append("xhtml:div");
  //       // .attr("class", "thumbnail")
  //       // .style("width", d => d.width + "px")
  //       // .style("height", d => d.height + "px");
  // var label = svg.selectAll(".label")
  //   .data(nodes.filter(d => d.label), d => d.id);

  // TODO: where are the labels?
  // var labelEnter = label
  //   .enter()
  //   .append("g")
  //   .attr("class", "label")
  //   // .insert("rect", ":first-child")
  //   .append("text")
  //   // .attr("class", "label")
  //   .attr("font-size", 5)
  //   .text(d => d.text);

  // var labelMerge = labelEnter.merge(label);

  // labelMerge.each(function(d) {
  //   d.width = this.getBBox().width;
  //   d.height = this.getBBox().height;
  //
  //   d3.select(this).select("text")
  //     .attr("dy", d.height);
  //
  //   d3.select(this)
  //     .insert("rect", ":first-child")
  //     .attr("fill", "none")
  //     .attr("width", d.width)
  //     .attr("height", d.height);
  // });

  simulation.on("end", function() {
    // hull.each(function(d) {
    //   cropHullLabels(d, d3.select(this));
    // });

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
      // TODO: check
      if (src.comp === tgt.comp) return [];
      var srcComp = appliedComps.find(d => d.id === src.comp);
      var tgtComp = appliedComps.find(d => d.id === tgt.comp);
      if (_.intersection(srcComp.sets.map(d => d.key),
        tgtComp.sets.map(d => d.key)).length > 0) {
        return srcComp.nodes.map(s => {
          return tgtComp.nodes.reduce((acc, t)=> {
            if (_.intersection(s.tags, t.tags).length > 0) {
              acc.push({
                source: nodes.find(n => n.id === s.id).index,
                target: nodes.find(n => n.id === t.id).index
              });
            }
            return acc;
          }, []);
        });
      } else return [];
    }));

    var docLinks = [];
    nodes.forEach(s => {
      var srcComp = appliedComps.find(d => d.id === s.comp);
      if (srcComp === undefined) return;
      var srcSets = srcComp.sets.map(d => d.key);
      // var scomp = appliedComps.find(d => d.id === s.comp);
      // var sCompTags = tags
      nodes.forEach(t => {
      var tgtComp = appliedComps.find(d => d.id === t.comp);
      if (tgtComp === undefined) return;
      var tgtSets = tgtComp.sets.map(d => d.key);
        // var tcomp = appliedComps.find(d => d.id === s.comp);
        if (s.comp !== t.comp && _.intersection(srcSets, tgtSets).length > 0) {
        var filtered = docLinks.filter(l => l.source === s.index && l.target === t.index || l.source === t.index && l.target === s.index);
          if (filtered.length === 0)
          docLinks.push({
              id: s.index + t.index,
              id2: t.index + s.index,
              source: s.index,
              target: t.index
          });
        }
      });
    });
    var aggrLinks = _.uniqBy(docLinks, "id");


    // var flatLinks = foci._cutEdges.map(l => {
    //                     return {
    //                       source: l.source.index,
    //                       target: l.target.index
    //                     };
    //                 });


    var fbundling = edgeBundling()
                    .step_size(0.1)
                    .compatibility_threshold(0.65)
                    .nodes(nodes)
                    .edges(deepLinks);

    var bundledEdgeSegments = fbundling();

    bundledEdgeSegments.forEach( d => {
    // for each of the arrays in the results
    // draw a line between the subdivions points for that edge

      var src = d[0];
      var tgt = d[d.length - 1];
      svg.select(".edge-seg")
        .insert("g", ":first-child")
        .attr("class", "bundle-link-" + src.comp + "-" + tgt.comp + " bd")
        .append("path")
        // .attr("class", "bundle-link-" + src.comp + "-" + tgt.comp + " bd")
        .style("stroke-width", 1)
        .style("stroke", "#C35817")
        .style("fill", "none")
        .style("stroke-opacity", linkOpacity) //use opacity as blending;
        .attr("d", bundleLine(d));
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
    //     .attr("opacity", 0.1)
    //     .attr("d", d => hullcurve(d))
    //     .attr("fill", "grey")
    //     .attr("stroke", "lightgrey")
    //     .on("click", boundzoom);
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
    //   // TODO: divide
    //   }, [{values: foci.data()}], 0.005);

    appliedComps.forEach((c, i) => {
      marching_squares(group => {
        // TODO: not running right now
        // this happens in a for loop

        var bubbleGroup = bubbleCont
           .selectAll(".bubbleX" + group.key + i)
           .data([group]);

        var bubbleGroupEnter = bubbleGroup.enter()
          .append("g")
          .attr("class", "bubbleX" + group.key + i + " bubbleHandle");

        var bubble = bubbleGroupEnter.selectAll("path")
          .data(d => d.path);

        var bubbleEnter = bubble.enter()
          .append("path");

        var bubbleMerge = bubbleEnter.merge(bubble);

        bubbleMerge
          .attr("class", (_, i) => "bubble-"+ i + group.key + "bubble")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.5)
          .attr("d", d => hullcurve(d))
          .attr("fill", o(group.key))
          .style("cursor", "pointer")
          .on("click", () => bubbleGroupEnter.call(programmaticZoom(0.6)))
          .on("mouseover", function() {
            d3.select(this).attr("opacity", 1);
            var tp = d3.select(".label-cont-" + c.id);

            var comp = appliedComps.find(d => d.id === c.id);

            d3.selectAll(".doc")
              .filter(d => comp.nodes.map(d => d.id).includes(d.id))
              .style("opacity", 0.1);

            var ids = group.values.map(d => d.id);
            d3.selectAll(".doc")
              .filter(d => ids.includes(d.id))
              .style("opacity", 1);

            var interSet =_.intersection(...group.values.map(d => d.tags));
            var tags = comp.tags.filter(d => interSet.includes(d.key));

            tp.selectAll("tspan").remove();
            tp.selectAll("tspan")
              .data(tags)
              .enter()
              .append("tspan")
              .call(styleTspan(wordScale));
          })
          .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.5);
            d3.selectAll(".doc").style("opacity", 1);

            var tp = d3.select(".label-cont-" + c.id);
            tp.selectAll("tspan").remove();
            tp.selectAll("tspan")
              .data(c.sets)
              .enter()
              .append("tspan")
              .call(styleTspan(wordScale));
          });

        bubble.exit().remove();
        bubbleGroup.exit().remove();

      }, c.sets, 0.044); // bigger: 0.0048, 0.024 (with updated bubble points)
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

    d3.select("#zoom-hull").remove();
    var zoomHull = svg
        // .attr("class", "group")
        // .append("path", "circle")
        .insert("path", ":first-child")
        .attr("class", "hull")
        .attr("id", "zoom-hull")
        .attr("d", groupPath(nodes))
        // .style("fill", "gray")
        .style("opacity", 0)
        .on("click", function() {programmaticZoom(state)(d3.select(this));});
        // .on("mouseover", function() {d3.select(this).attr("fill", "red");});

    zoomHull.call(programmaticZoom(state));

    // console.log("zoom", zoomHull);
    });

  // console.log("hull", hull, "doc", doc);
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

    hull.attr("d", d => groupPath(d.nodes));

    // hull.each(function(d) {
    //   cropHullLabels(d, d3.select(this));
    // });

    docMerge
      .attr("transform", d => {
        return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
      });

    // label.attr("transform", d => {
    //   return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
    // });
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

    // var zoomHullData = d3.polygonHull(d.nodes.map(d => [d.x, d.y])).reverse();
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

  if (pattern.search) {
    d3.select(".tag-list").remove();
    var tagListDiv = d3.select("body")
      .append("div")
      .style("height", "400px")
      .attr("class", "tag-list view");
    // TODO:
    tagList(allTags, tagListDiv, foci, update);
  }

  if (pattern.cloud) {
    d3.select(".time-cloud").remove();
    var timeCloudDiv = d3.select("body")
      .append("div")
      .attr("class", "time-cloud view")
      // TODO
      .style("height", "300px")
      .style("width", "1350px");
    timeCloud(spreadNodes.filter(d => !d.label), timeCloudDiv);
  }
  // console.log("foci._cutEdges", foci._cutEdges);

}

d3.json("diigo.json", function(error, data) {
  var diigo = data.slice(0, 200).map((d, i) => {
    d.tags = d.tags.split(",");
    d.id = i;
    return d;
  });
  //diigo.filter(d => d.tags.includes("d3"))
  // console.log("Diigo", diigo);
  create(diigo);
});
