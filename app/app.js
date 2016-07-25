"use strict";
import * as d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";
import * as d3_force from "d3-force";

import marching_squares from "./marchingSquaresHelpers.js";
import offsetInterpolate from "./polyOffset.js";

import edgeBundling from "./edgebundling.js";
import brewer from "colorbrewer";
// import rectCollide from "./utils.js";

import tagListLayout from "./tagList.js";
var tagList = tagListLayout();
// import tagList from "./tagList.js";
import timeCloudLayout from "./tagStream.js";
var timeCloud = timeCloudLayout();


require("./style/style.less");

// bigger scale :0.0048
//
const linkOpacity = 0.05;
var dbg = d => {
  console.log("dbg", d);
  return d;
};

function updateTagList(tags, foci, update) {
    d3.select(".tag-list").remove();
    tagList.create(tags, d3.select(".tag-list"), foci, update);
}


function extractTags(docNodes) {
  var spreadNodes = _.flatten(docNodes.map(d => d.tags.map(t => {
    var copy = _.clone(d);
    copy.key = t;
    return copy;
  })));

  var allTags = d3.nest()
    .key(d => d.key)
    .entries(spreadNodes)
  .sort((a, b) => d3.descending(a.values.length, b.values.length));

  return {nested: allTags, spread: spreadNodes};

}

function extractNodes(foci) {
  var docNodes = _.flatten(foci.data().map(d => {
    return d.nodes.map(e => {
      e.center = d.center;
      e.width = 3; // bigger 1: 10, 20
      e.height = 4;
      e.clicked = false;
      e.level = d.level;
      // e.tags = e.sets;
      return e;
    });
  }));

  var appliedComps = foci.comps().map(c => {
    c.sets.map(s => {
      s.values = s.values.map(on => {
        return docNodes.find(n => n.id === on.id);
      });
      // if(s.values.length === s.nodes.length) return [];
      return s;
    });
    return c;
  });

  var tags = extractTags(docNodes);

  return {
    docs: docNodes,
    comps: appliedComps,
    spreadTags: tags.spread,
    nestedTags: tags.nested
  };

}

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


var width = window.innerWidth * 2/3;
var height = window.innerHeight * 2/3;

var viewBox = {
  left: 500,
  top: 500
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

function create(diigo) {
  var g = d3.select("body")
              .append("div")
              .attr("class", "node-map view")
              // .append("div")
              // .attr("class", "shifted")
              // .style("margin-left", "300px")
              .append("svg")
              .attr("width", width)
              .attr("height", height)
              // .attr("viewBox", 0 + " " + 200 + " " + width + " " + height)
              // .attr("viewBox", (viewBox.left ) + " " + (viewBox.top ) + " " + (width - viewBox.left) + " " + (height - viewBox.top))
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


  var cont = d3.select(".node-map");

  cont.insert("div", ":first-child")
    .attr("class", "view-name")
    .append("h3")
    .text("node-map");

  cont.append("div")
    .attr("id", "tooltip")
    .attr("class", "tnt_tooltip");

  // g.append("rect")
  //       .attr("width", shiftedWidth)
  //       .attr("height", shiftedHeight)
  //       .style("pointer-events", "all")
  //       .style("fill", "none");
            //make transparent (vs black if commented-out)
            //
  g.append("g")
     .attr("class", "backdrop-cont");

  g.append("g")
    .attr("class", "hull-labels");

  g.append("g")
     .attr("class", "bubble-cont");

  g.append("g")
    .attr("class", "edge-seg");

  // d3.select("body").append("p").append("input")
  //   .datum({})
  //   .attr("id", "slider")
  //   .attr("type", "range");

  d3.select("body")
    .append("div")
    .style("height", "400px")
    .attr("class", "tag-list view"); // TODO:

  var state = {first: true};
  update(foci, {main: true, search: true, cloud: true}, state);
}



function update(foci, pattern, state) {

  var cont = d3.select(".node-map"),
  svg = cont.select("svg g"),
  hullLabelCont = d3.select(".hull-labels"),
  bubbleCont = svg.select(".bubble-cont"),
  backdropCont = svg.select(".backdrop-cont"),
  tooltip = d3.select("#tooltip");

  hullLabelCont.selectAll("*").remove();
  d3.selectAll(".bubbleHandle").remove();
  d3.selectAll(".bd").remove();

  var zoomHandler = d3.zoom()
     .extent([shiftedWidth, shiftedHeight])
     .scaleExtent([-100, 40])
     .on("zoom", function() {
        var translate = [d3.event.transform.x, d3.event.transform.y];
        var scale = d3.event.transform.k;

        svg
          .transition(1000)
          .attr("transform", "translate(" + translate  + ")scale(" + scale + ")");

        // var w = 2 * d3.event.transform.k;
        // var h = 4 * d3.event.transform.k;
        // d3.selectAll(".frame-cont").each(function(d){
        //     var sib = d3.select(this.parentNode).select("rect").node();
        //     d.width = sib.getBoundingClientRect().width;
        //     d.height = sib.getBoundingClientRect().height;
        //   });

        // d3.selectAll("iframe")
        //   .style("width", d => d.width * 4 + "px" )
        //   .style("height", d => d.height * 4 + "px");
     });

  svg
    .call(zoomHandler)
    .on("dblclick", null)
    .on("wheel", function(d) {
      console.log("d");
    });

  var programmaticZoom = function() {
    return function(self) {
      var bbox = self.node().getBBox(),
        dx = bbox.width,
        dy = bbox.height,
        x = (bbox.x + bbox.x + bbox.width) / 2,
        y = (bbox.y + bbox.y + bbox.height) / 2,
        scale = Math.max(-10,
          Math.min(2.5, 1 / Math.max(dx / width, dy / height))),
        translate = [width / 2 - scale * x,
          height / 2 - scale * y];

      zoomHandler.transform(svg,
        d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale));
    };
  };


  var nodes = extractNodes(foci);
  console.log("nodes", nodes);
  // console.log("foci data", foci.data(), foci.data().length);
  // console.log("foci links", foci.links());
  // console.log("force nodes", nodes, "length", nodes.length);
  // console.log("foci-groups", foci.groups());

  var simulation = d3.forceSimulation(nodes.docs)
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


  var wordScale = d3.scaleLinear()
      .domain(d3.extent(nodes.nestedTags, d => d.values.length))
      .rangeRound([7, 50/2]);


  var zoomDetail = function(d) {
    // var dx = d.width,
    //   dy = d.height,
    var x = d.x,
      y = d.y,
      scale = 70,
      translate = [shiftedWidth / 2 - scale * x,
        shiftedHeight / 2 - scale * y];

    console.log("click");
    zoomHandler.transform(svg,
      d3.zoomIdentity
      .translate(translate[0], translate[1])
      .scale(scale));
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
      .attr("text-anchor", "start")
      .attr("startOffset", "35%")
      .attr("alignment-baseline", "text-after-edge")
      .attr("dominant-baseline", "baseline")
      .attr("id", d => "tp-hull" + d.id)
      .attr("xlink:href", d => "#hull-" + d.id);

  textPath.selectAll("tspan")
    .data(d => d.sets)
    .enter()
    .append("tspan")
    .call(styleTspan(wordScale));

  var hull = labelGEnter
      // .attr("class", "group")
      // .append("path", "circle")
      .insert("path", ":first-child")
      // .attr("transform", function()"rotate(20)")
      .attr("class", "hull")
      .attr("id", d => "hull-" + d.id)
      .style("fill", fill);
      // .on("click", boundzoom)
      // .attr("title", d => d.key);

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
    .data(nodes.docs, d => d.id);

  var docEnter = doc
    .enter()
    .append("g")
    .attr("width", d => d.width)
    .attr("height", d => d.height)
    .attr("class", "doc")
    .on("click", function() {programmaticZoom(d3.select(this));})
    .on("mouseover", function(d) {
      console.log("d3 event", d3.event);
      var x = d3.event.clientX + 30;
      var y = d3.event.clientY - 30;
      tooltip
        .style("left", x + "px")
        .style("top", y + "px")
        .style("opacity", 0.7);

      var table = tooltip.append("table").append("tbody");

      var tr0 = table.append("tr");
      tr0.append("td").text("title");
      tr0.append("td").text(d.title);

      var tr1 = table.append("tr");
      tr1.append("td").text("tags");
      tr1.append("td").text(d.tags.join(","));

      var tr2 = table.append("tr");
      tr2.append("td").text("created_at");
      tr2.append("td").text(d.created_at);


      // var allTags = d3.nest()
      //   .key(d => d.key)
      //   .entries(spreadNodes)
      // .sort((a, b) => d3.descending(a.values.length, b.values.length));

    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
      tooltip.selectAll("*").remove();
    });

  doc.exit().remove();

  var zoomDoc = function(d) {
    zoomDetail(d);
    var parent = d3.select(this.parentNode);

    var rectBox = d3.select(this).node().getBoundingClientRect();

    // var thumbForeign = parent
    //     .append("foreignObject", ":first-child")
    //     .attr("class", "frame-cont");
    //       // .attr("transform", null)
    //       // .attr("width", d => d.width)
    //       // .attr("height", d => d.height);
    //
    // var thumbnail = thumbForeign.append("xhtml:div")
    //       .attr("class", "thumbnail");
    //       // .style("width", d => d.width + "px")
    //       // .style("height", d => d.height + "px");
    //
    // thumbnail
    //   // .append("foreignObject")
    //   // .append("body")
    //   // .attr("xmlns", "http://www.w3.org/1999/xhtml")
    //   .append("iframe")
    //   // .attr("class", "thu")
    //   .attr("src", d => d.url)
    //   .attr("scrolling", "no")
    //   .style("width", rectBox.width * 4 + "px")
    //   .style("height", rectBox.height * 4 + "px");
  };

  docEnter.append("rect")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("rx", 0.5)
      .attr("ry", 0.5)
      // .attr("stroke", "black")
      // .attr("stroke-width", 0.3)
      .attr("fill",  "white")
      // .attr("opacity",  0)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .on("click", zoomDoc);


  docEnter.append("image")
    .attr("xlink:href", "icon-file.png")
    .attr("width", d => d.width + "px")
    .attr("height", d => d.height + "px");
    // .on("click", zoomDoc);

  // docEnter.append("title")
  //     .text(d => d.__setKey__);

  var docMerge = docEnter.merge(doc);

  // TODO: fix update
  // var thumbnail = doc
  //     .append("foreignObject", ":first-child")
  //     .attr("class", "thumbnail")
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
      var srcComp = nodes.comps.find(d => d.id === src.comp);
      var tgtComp = nodes.comps.find(d => d.id === tgt.comp);
      if (_.intersection(srcComp.sets.map(d => d.key),
        tgtComp.sets.map(d => d.key)).length > 0) {
        return srcComp.nodes.map(s => {
          return tgtComp.nodes.reduce((acc, t)=> {
            if (_.intersection(s.tags, t.tags).length > 0) {
              acc.push({
                source: nodes.docs.find(n => n.id === s.id).index,
                target: nodes.docs.find(n => n.id === t.id).index
              });
            }
            return acc;
          }, []);
        });
      } else return [];
    }));

    var docLinks = [];
    nodes.docs.forEach(s => {
      var srcComp = nodes.comps.find(d => d.id === s.comp);
      if (srcComp === undefined) return;
      var srcSets = srcComp.sets.map(d => d.key);
      // var scomp = appliedComps.find(d => d.id === s.comp);
      // var sCompTags = tags
      nodes.docs.forEach(t => {
      var tgtComp = nodes.comps.find(d => d.id === t.comp);
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
    console.log("deepLinks", deepLinks);


    // var flatLinks = foci._cutEdges.map(l => {
    //                     return {
    //                       source: l.source.index,
    //                       target: l.target.index
    //                     };
    //                 });


    var fbundling = edgeBundling()
                    .step_size(0.1)
                    .compatibility_threshold(0.65)
                    .nodes(nodes.docs)
                    .edges(deepLinks);

    var bundledEdgeSegments = fbundling();

    bundledEdgeSegments.forEach((d, i) => {
    // for each of the arrays in the results
    // draw a line between the subdivions points for that edge

      var src = d[0];
      var tgt = d[d.length - 1];
      var edgeSegs = svg.select(".edge-seg").selectAll("g")
        .data([{source: src.comp, target: tgt.comp, path: d, id: i, focus: tgt.comp}], (d) => d.id)
        .enter()
        .append("g")
        // .attr("class", "bundle-link-" + src.comp + "-" + tgt.comp + " bd")
        .append("path")
        .attr("class", "bundle-link-" + src.comp + "-" + tgt.comp + " bd")
        .style("stroke-width", 5)
        .style("stroke", "gray")
        .style("fill", "none")
        .style("stroke-opacity", 0.1) //use opacity as blending;
        .attr("d", d => bundleLine(d.path))
        .on("click", function(d) {
          console.log("src", src, "tgt", src);
          d3.selectAll(".bundle-link-" + d.source + "-" + d.target + " bd")
            .attr("opacity", 1);

          d.focus = d.focus === d.source ? d.target : d.source;
          d3.select("#hull-" + d.focus).call(programmaticZoom(0.6));
        })
        .on("mouseover", function(){
          var segs = d3.select(this);
          segs
            .attr("opacity", 1);

          segs.attr("fill", "red");
        });
    });

    marching_squares(group => {
      // TODO: hull zoom
      // this happens in a for loop
      var bubbleGroup = backdropCont
         .selectAll(".bubbleX" + group.key)
         .data([group]);

      var bubbleGroupEnter = bubbleGroup.enter()
        .append("g")
        .attr("class", "bubbleX" + group.key +  " bubbleHandle");

      var bubble = bubbleGroupEnter.selectAll("path")
        .data(d => d.path);

      var bubbleEnter = bubble.enter()
        .append("path");

      var bubbleMerge = bubbleEnter.merge(bubble);

      bubbleMerge
        .attr("class", (_, i) => "bubble-"+ i + group.key + "bubble")
        .attr("stroke-linejoin", "round")
        .attr("d", d => hullcurve(d))
        .attr("fill", "#6699cc")
        .attr("opacity", 0.05)
        .style("cursor", "pointer")
        .on("click", function(){programmaticZoom()(d3.select(this));});

      bubble.exit().remove();
      bubbleGroup.exit().remove();

      // TODO: divide
      }, [{values: foci.data()}], 0.003);

    nodes.comps.forEach((c, i) => {
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

            tagList.update(tagList._root, foci, create);
            d3.select(this).transition(200).attr("opacity", 1);
            // d3.select(this).attr("opacity", 1);
            //
            // var tp = d3.select(".label-cont-" + c.id);
            var comp = nodes.comps.find(d => d.id === c.id);
            //
            d3.selectAll(".doc")
              .filter(d => comp.nodes.map(e => e.id).includes(d.id))
              .style("opacity", 0.1);

            var ids = group.values.map(d => d.id);
            d3.selectAll(".doc")
              .filter(d => ids.includes(d.id))
              .style("opacity", 1);
            //
            // var interSet =_.intersection(...group.values.map(d => d.tags));
            // var tags = comp.tags.filter(d => interSet.includes(d.key));
            //
            // tp.selectAll("tspan").remove();
            // tp.selectAll("tspan")
            //   .data(tags)
            //   .enter()
            //   .append("tspan")
            //   .call(styleTspan(wordScale));

              var tagNodes = extractTags(comp.nodes).nested;
              console.log("tagNodes", tagNodes);

              console.log("group", group);
              // var newRoot = _.cloneDeep(tagList._root);
              var rootkey = group.interTags.join(",");
              // newRoot.children = extractTags(comp.nodes).nested
              //   .filter(d => !group.interTags.includes(d.key));
              // tagList.update(newRoot, foci, create);
              d3.select("#search-tree").attr("value", rootkey);
              // updateTagList(nodes.nestedTags, foci, update);
          })
          .on("mouseout", function() {
            d3.select("#search-tree").attr("value", null);
            d3.select(this).attr("opacity", 0.5);
            d3.selectAll(".doc").style("opacity", 1);

            var tp = d3.select(".label-cont-" + c.id);
            tp.selectAll("tspan").remove();
            tp.selectAll("tspan")
              .data(c.sets)
              .enter()
              .append("tspan")
              .call(styleTspan(wordScale));

            d3.select("#tooltip").selectAll("*").remove();
            console.log("tagList._root", tagList._root);
            // tagList.update(tagList._root, foci, create);
          });

        bubble.exit().remove();
        bubbleGroup.exit().remove();

      }, c.sets, 0.034); // bigger: 0.0048, 0.024 (with updated bubble points)
    });

    d3.select("#zoom-hull").remove();
    var zoomHull = svg
        // .attr("class", "group")
        // .append("path", "circle")
        .insert("path", ":first-child")
        .attr("class", "hull")
        .attr("id", "zoom-hull")
        .attr("d", groupPath(nodes.docs))
        // .style("fill", "gray")
        .style("opacity", 0)
        .on("click", function() {programmaticZoom()(d3.select(this));});
        // .on("mouseover", function() {d3.select(this).attr("fill", "red");});

    console.log("zoomHull", zoomHull);
    zoomHull.call(programmaticZoom());

    });

  // console.log("hull", hull, "doc", doc);
  simulation.on("tick", function() {

    hull.attr("d", d => {
      return groupPath(d.nodes);
    });

    docMerge
      .attr("transform", d => {
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
    tagList.create(nodes.nestedTags, d3.select(".tag-list"), foci, update);

  }

  if (pattern.cloud) {
    d3.select(".time-cloud").remove();
    var timeCloudDiv = d3.select("body")
      .append("div")
      .attr("class", "time-cloud view")
      // TODO
      .style("height", "300px")
      .style("width", "1350px");
    timeCloud.create(nodes.spreadTags, foci, timeCloudDiv, update, tagList);
  }
  // console.log("foci._cutEdges", foci._cutEdges);

}

d3.json("diigo.json", function(error, data) {
  var diigo = data.slice(0, 100).map((d, i) => {
    d.tags = d.tags.split(",");
    d.id = i;
    return d;
  });
  //diigo.filter(d => d.tags.includes("d3"))
  // console.log("Diigo", diigo);
  create(diigo);
});
