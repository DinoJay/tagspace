import d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";
import d3_force from "d3-force";

import marching_squares from "./marchingSquaresHelpers.js";
import offsetInterpolate from "./polyOffset.js";
import PolyK from "./polyk.js";
// import ClipperLib from "js-clipper";
// import Raphael from "raphael";
import lineclip from "lineclip";
import pathParser from "svg-path-parser";

function reversePath(pathString) {
    var pathPieces = pathString.match(/[MLHVCSQTA][-0-9.,]*/gi);
    var reversed = "";
    var skip = true;
    var previousPathType;
    for (var i = pathPieces.length - 1; i >= 0; i--) {
        var pathType = pathPieces[i].substr(0, 1);
        var pathValues = pathPieces[i].substr(1);
        switch (pathType) {
            case "M":
            case "L":
                reversed += (skip ? "" : pathType) + pathValues;
                skip = false;
                break;
            case "C":
                var curvePieces = pathValues.match(/^([-0-9.]*,[-0-9.]*),([-0-9.]*,[-0-9.]*),([-0-9.]*,[-0-9.]*)$/);
                reversed += curvePieces[3] + pathType + curvePieces[2] + "," + curvePieces[1] + ",";
                skip = true;
                break;
            default:
                alert("Not implemented: " + pathType);
                break;
        }
    }
    return reversed;
}

require("./style/style.less");

var flipTable =  {
        a : "\u0250",
        b : "q",
        c : "\u0254",
        d : "p",
        e : "\u01DD",
        f : "\u025F",
        g : "\u0183",
        h : "\u0265",
        i : "\u0131",
        j : "\u027E",
        k : "\u029E",
        l : "\u05DF",
        m : "\u026F",
        n : "u",
        r : "\u0279",
        t : "\u0287",
        v : "\u028C",
        w : "\u028D",
        y : "\u028E",
        "." : "\u02D9",
        "[" : "]",
        "(" : ")",
        "{" : "}",
        "?" : "\u00BF",
        "!" : "\u00A1",
        "\"" : ",",
        "<" : ">",
        "_" : "\u203E",
        "\\" : "\\",
        ";" : "\u061B",
        "\u203F" : "\u2040",
        "\u2045" : "\u2046",
        "\u2234" : "\u2235"
    };

var flipText =  function(input) {
        var last = input.length - 1;
        var result = new Array(input.length);
        for (var i = last; i >= 0; --i) {
            var c = input.charAt(i);
            var r = this.flipTable[c];
            result[last - i] = r != undefined ? r : c;
        }
        return result.join("");
};

var labelLine = d3.svg.line()
  .x(function(d) {
  return d.x;
}).y(function(d) {
  return d.y;
}).interpolate(offsetInterpolate(30));

var width = 1200;
var height = 800;
var margin = {
  right: 100,
  left: 100,
  top: 100,
  bottom: 100
};

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
  if (node.y + halfHeight > (height - margin.bottom)) {
          node.y = (height - margin.bottom) - halfHeight;
  }
  return node;
}

function simple_comp(nodes, links) {
  var groups = [];
  var visited = {};
  var v;

  // this should look like:
  // {
  //   "a2": ["a5"],
  //   "a3": ["a6"],
  //   "a4": ["a5"],
  //   "a5": ["a2", "a4"],
  //   "a6": ["a3"],
  //   "a7": ["a9"],
  //   "a9": ["a7"]
  // }

  var vertices = nodes.map(d => d.index);
  var edgeList = links.map(l => {
    var edge = [l.source.index, l.target.index];
    return edge;
  });
  console.log("edgeList", edgeList);

  var adjlist = convert_edgelist_to_adjlist(vertices, edgeList);

  for (v in adjlist) {
    if (adjlist.hasOwnProperty(v) && !visited[v]) {
      var indices = bfs(v, adjlist, visited);
      groups.push(indices.map(i => nodes[i]));
    }
  }
  return groups.map(g => g.filter(d => d));
}

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

function biconnectedComponents(nodes, links){

  var vertices = nodes.map(d => d.index);
  var edgeList = links.map(l => {
    var edge = [l.source.index, l.target.index];
    return edge;
  });

  var adjList = convert_edgelist_to_adjlist(vertices, edgeList);
  console.log("edgelist", edgeList);
  console.log("adjList", adjList);

  var n = Object.keys(adjList).length; // number vertices
  console.log("n", n);
  var result = [];
  // var m = 10; // number edges

  var count = 0;
  var stack = []; // stack edge
  var visited = d3.range(0, n).map(() => false); // boolean
  var low = []; // low points
  var d = []; // ??
  var parent = d3.range(0, n).map(() => -1);

  for(var u=0; u<n; u++){
    if(!visited[u]){
      dfsVisit(u);
    }
  }

  return result.map(g => _.uniq(g));

  function dfsVisit(u){
    visited[u] = true;
    d[u] = low[u] = count++;
    console.log("graph u", u, nodes[u]);
    adjList[u].forEach(e =>{
      var min = Math.min(u, e);
      var max = Math.max(u, e);
      var v = u === min ? max : min;

      if(v==parent[u]){
        return;
      }
      if(!visited[v]){
        stack.push([u, e]);
        parent[v] = u;
        dfsVisit(v);
        if (low[v] >= d[u]){
          outputComp(u, v);
        }
        low[u] = Math.min(low[u], low[v]);
      }else
        if(d[v]<d[u]) {
          stack.push([u, e]);
          low[u] = Math.min(low[u], d[v]);
        } else {
              // dont push edge on stack when v has been visited
              // and has distance more than that of u in the dfs tree
      }
    });
  }

function outputComp(u, v){
    // console.log("New Biconnected Component Found");
    var check = [u, v];
    var comp = [];

    while(stack.length > 0 && _.difference(check, e).length > 0) {
      var e = stack.pop();
      comp.push(e[0], e[1]);
      // var diff = _.difference(check, e);
      // console.log("check", check);
      // console.log("e", e);
    }
    // console.log("stack", stack);
    result.push(comp);
  }
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

var dsq = function(a,b) {
        var dx = a[0]-b[0], dy = a[1]-b[1];
        return dx*dx+dy*dy;
    };

var alpha = 50;
var asq = alpha*alpha;
//
// var offset = function(a,dx,dy) {
//   return a.map(function(d) { return [d[0]+dx,d[1]+dy]; });
// };

    // well, this is where the "magic" happens..

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
  while (q.length > 0) {
    v = q.shift();
    current_group.push(parseInt(v));
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

var fakePoints = [];
  d.nodes.forEach(function(e) {
    var xOffset = 75;
    var yOffset = 75;
    fakePoints = fakePoints.concat([
      // "0.7071" is the sine and cosine of 45 degree for corner points.
      [e.x, (e.y + xOffset)],
      [(e.x + (0.7071 * xOffset)), (e.y + (0.7071 * yOffset))],
      [(e.x + xOffset), e.y],
      [(e.x + (0.7071 * xOffset)), (e.y - (0.7071 * yOffset))],
      [(e.x), (e.y - yOffset)],
      [(e.x - (0.7071 * xOffset)), (e.y - (0.7071 * yOffset))],
      [(e.x - xOffset), e.y],
      [(e.x - (0.7071 * xOffset)), (e.y + (0.7071 * yOffset))]
      ]);
  });
  // return null;
  // var h0 = labelLine(hull(d.nodes).reverse());
  var fh = d3.geom.hull(fakePoints);
  var first = fh[fh.length - 2];
  var rev = fh.reverse();
  var res = [first].concat(rev.slice(1, rev.length));
  res = rev;

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


var groupFill = function(d, i) { return fill(i & 3); };


d3.json("data.json", function(error, data) {
  // console.log("rawData", rawData);
  // const { data: data, edges: edges } = prepareData(rawData.documents);
  // console.log("tagData", data);
  //d
  // data.documents.forEach(d => d.r = 12);

  var zoom = d3.behavior.zoom()
               .size(width, height)
               .scaleExtent([-10, 40])
               .on("zoom", () => {
                  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                });

  var svg = d3.select("body").append("svg")
              .attr("width", width)
              .attr("height", height)
              .append("g")
              .attr("transform", "translate(" + [0, 0] + ")")
              .call(zoom)
              .append("g");

  // svg.attr("transform", "scale(0.5)");

  svg.append("g")
     .attr("class", "bubble-cont");

  var foci = fociLayout()
                .gravity(0.01)
                .sets(data.documents)
                .size([width, height])
                .charge(function(d) {
                  // var conn = this.hasConnections(d);
                  // return conn > 0 ? -100 / conn : -100;
                  // return - d.nodes.length * 40;
                  return -20;
                })
                .linkStrength(l => l.target.label ? 0: 0)
                .linkDistance(function(l){
                  // var conn = this.connections(l.source);
                  return 7;
                })
                .start();

  var nodes = _.flatten(foci.data().map(d => {
    // TODO
    if (d.label) return d;

    return d.nodes.map(e => {
      e.center = d.center;
      e.width = 1;
      e.height = 2;
      return e;
    });
  }));

  var groupsById =  foci.groups().map(g => {
    g.ids = _.flatten(g.values.map(sn => sn.nodes ? sn.nodes.map(n => n.id) : sn.id ));
    return g;
  });

  console.log("groupsById", groupsById);

  groupsById.forEach(g => {
    g.nodes = g.ids.map(id => {
      var n = nodes.find(n => n.id === id);
      return n;
    });

    return g;
  });

  console.log("foci data", foci.data(), foci.data().length);
  console.log("foci links", foci.links());
  console.log("force nodes", nodes, "length", nodes.length);
  console.log("foci-groups", foci.groups());

  var simulation = d3_force.forceSimulation(nodes)
      .force("x", d3_force.forceX(d => d.center.x).strength(1))
      .force("y", d3_force.forceY(d => d.center.y).strength(1))
      .force("charge", d3_force.forceManyBody()
                               .theta(2)
                               .strength(-2)
                               .distanceMin(15)
      );
      // .force("collide", (alpha) => {
      //   label.each((collideCircle(label.data(), alpha, 100)));
      // });
      // .force("collide", d3_force.forceCollide(39));

  // simulation.stop();
  //
  //   for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) /
  //     -simulation.alphaDecay()); i < n; ++i) {
  //     simulation.tick();
  //   }

  // var forceEdges = _.flattenDeep(foci.links().map(l => {
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
  //
  //
  // console.log("forceEdges", forceEdges);

  //
  // // this should look like:
  // // {
  // //   "a2": ["a5"],
  // //   "a3": ["a6"],
  // //   "a4": ["a5"],
  // //   "a5": ["a2", "a4"],
  // //   "a6": ["a3"],
  // //   "a7": ["a9"],
  // //   "a9": ["a7"]
  // // }
  // // console.log("edgeList", edgeList);
  //
  // var comps = biconnectedComponents(foci.data(), foci.links());
  // console.log("biconnectedComponents", comps);
  var spreadTags = _.flatten(nodes.map(d => d.tags));

  console.log("spreadTags", spreadTags);

  // var allTags = d3.nest()
  //   .key(d => d)
  //   .entries(spreadTags)
  // .sort((a, b) => d3.descending(a.values.length, b.values.length));
  //
  // var wordScale = d3.scale.linear()
  //     .domain(d3.extent(allTags, d => d.values.length))
  //     .rangeRound([10, 50]);

  var gr = simple_comp(foci.data(), foci.links());
  var comps = gr.map((g, i) => {
    var nodes = _.flatten(g.map(d => d.nodes));
    var tags = d3.nest()
      .key(d => d)
      .entries(_.flatten(nodes.map(d => d.tags)))
    .sort((a, b) => d3.descending(a.values.length, b.values.length));

    return {
      id: i + "comp",
      values: g,
      tags: tags,
      nodes: nodes
    };
  });

  console.log("gr", gr);
  console.log("comps", comps);

  //
  // var cut_vertices = _.uniq(_.flatten(comps.map(c => {
  //   return c.filter(u => {
  //     var n = comps.filter(c => c.find(v => v === u) ? true : false);
  //     return n.length > 1;
  //   });
  // }).filter(s => s > 0)));
  //
  // // console.log("cut_vertices", cut_vertices);
  //
  // nodes.forEach((d, i) => {
  //   if (cut_vertices.indexOf(i) !== -1 ) d.cut = true;
  // });
  //
  // var redComps = comps.map(c => c.filter(v => cut_vertices.indexOf(v) === -1));
  //
  // // console.log("redComps", redComps);
  //
  // var deeperComps = redComps.map(c => {
  //   // console.log("comp", c);
  //   var compLinks = edgeList.filter(l => c.indexOf(l[0]) !== -1 && c.indexOf(l[1]) !== -1);
  //   // console.log("compLinks", compLinks);
  //   var adjList = convert_edgelist_to_adjlist(vertices, compLinks);
  //   // console.log("adjlist", adjList);
  //   return biconnectedComponents(adjList);
  // });
  // // console.log("deeper comps", deeperComps);
  //
  // var groups = [];
  // var visited = {};
  // var v;
  // for (v in adjList) {
  //   if (adjList.hasOwnProperty(v) && !visited[v]) {
  //     groups.push(bfs(v, adjList, visited));
  //   }
  // }
  // // TODO: fix later
  // groups = groups.map(g => g.map(n => parseInt(n)));
  // // console.log("groups", groups);
  //
  // var groupedNodes = groups.map(g => g.map(i => nodes[parseInt(i)]));
  // var compNodes = redComps.map(c => c.map(i => nodes[i]));
  //
  // // console.log("groupedNodes", groupedNodes);

  // var circle = svg.selectAll(".circle")
  //   .data(nodes, d => d.__key__);
  //
  // circle.enter()
  //    .append("circle")
  //    .attr("class", "circle")
  //    .attr("r", d => d.r)
  //    .attr("stroke", d => d.cut ? "red" : "black")
  //    .attr("stroke-width", "2")
  //    .attr("fill", "white");
  //    // .call(force.drag);
  //
  // circle.enter()
  //   .append("g")
  //     .attr("class", "circle")
  //     .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  //
  // circle.append("circle")
  //     .attr("class", "circleDoc")
  //     .attr("r", function(d) { return d.r; })
  //     .attr("stroke", "black")
  //     .attr("stroke-width", "2")
  //     .attr("fill", "orange");

  var lc = svg.append("g")
      .attr("class", "hull-labels")
      .selectAll(".label-cont")
      .data(comps);

  var lcEnter = lc.enter();

  var tp = lcEnter
    .append("g")
    .attr("class", ".label-cont")
    .append("text")
      .attr("class", "descr")
    .append("textPath")
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .attr("alignment-baseline", "text-after-edge")
      .attr("dominant-baseline", "baseline")
      .attr("xlink:href", d => "#" + d.id);

  // var tp = lc.selectAll(".descr").select("textPath");
  tp.each(d => {
    d.scale = d3.scale.linear()
      .domain(d3.extent(d.tags, d => d.values.length))
      .rangeRound([5, 50]);
  });

  tp.selectAll("tspan")
    .data(d => d.tags.slice(0, 5))
    .enter()
    .append("tspan")
    .attr("font-size", function(d) {
      var wordScale = d3.select(this.parentNode).datum().scale;
      return wordScale(d.values.length);
    })
  .text(d => d.key+" ")
    .on("click", d => console.log("click0", d));


  var hull = lc
      // .attr("class", "group")
      // .append("path", "circle")
      .insert("path", ":first-child")
      .attr("class", "hull")
      .attr("id", d => d.id)
      .style("fill", fill)
      .style("stroke-linejoin", "round")
      .style("stroke-width", 10)
      // .style("stroke", groupFill)
      .style("opacity", 0.2)
      .attr("title", d => d.key)
      .attr("d", groupPath)
      .on("click", function() {
        // console.log("BBox", this.getBBox());
        var bbox = this.getBBox();
        svg.append("circle")
          .attr("cx", bbox.x)
          .attr("cy", bbox.y)
          .attr("r", 5)
          .attr("fill", "red");

        svg.append("circle")
          .attr("cx", bbox.x + bbox.width)
          .attr("cy", bbox.y + bbox.height)
          .attr("r", 5)
          .attr("fill", "red");
      });

  var circle = svg.selectAll(".circle")
    .data(foci.data().filter(d => !d.label && d.nodes.length > 0))
    .enter()
    .append("circle")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("class", "circle")
      .attr("r", 7)
      .attr("cx", d => d.center.x)
      .attr("cy", d => d.center.y)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .attr("fill",  "none");

  var doc = svg.selectAll(".doc")
    .data(nodes.filter(d => !d.label), d => d.id);

  doc
    .enter()
    .append("rect")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("class", "doc")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("rx", 0.05)
      .attr("ry", 0.05)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .attr("fill",  "white")
      .append("title")
        .text(function(d) { return d.__setKey__; });

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

  var circle = svg.append("g")
      .attr("class", "circle-cont")
      .selectAll("g")
      .data(foci.data())
      .enter().append("g")
        .attr("transform", function(d) {
          return "translate(" + d.center.x + "," + d.center.y + ")"; })
        .attr("class", function(d) { return "node" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
        .on("click", d => console.log(d));

  circle.append("circle")
        .attr("id", function(d, i) { return "node-" + i; })
        .attr("r", function(d) { return d.center.r; })
        .style("stroke", "black")
        .attr("fill", "none")
        .attr("opacity", 0.1)
        .on("click", d => console.log(d));

  var link = svg.selectAll(".link")
               .data(foci.links());

  // build the arrow.
  svg.append("svg:defs").selectAll("marker")
      .data(["end"])      // Different link/path types can be defined here
    .enter().append("svg:marker")    // This section adds in the arrows
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -1.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

  link.enter().insert("line", ":first-child")
               //    .attr("class", function(d) { return "link " + d.type; })
               .attr("class", "link")
               .attr("marker-end", "url(#end)");



  simulation.on("tick", function() {

    var q2 = d3.geom.quadtree(nodes);
    nodes.forEach(d => {
      q2.visit(collide(d, 4, 1));
      // boundPanel(d, panels.center, 1);
    });

    // label.each((collide(label.data(), e.alpha, 10)));
    //

    // doc.each(d => boundMargin(d, width, height, margin));
    // label.each(d => boundMargin(d, width, height, margin));

    hull.attr("d", groupPath);

    doc.attr("transform", d => {
      return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
    });
    label.attr("transform", d => {
      return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
    });

    // link
    //   .attr("x1", d => d.source.x)
    //   .attr("y1", d => d.source.y)
    //   .attr("x2", d => d.target.x)
    //   .attr("y2", d => d.target.y);

  // node.attr("cx", function(d) {
  //   return d.x = Math.max(r, Math.min(width - r, d.x));
  // })
  // .attr("cy", function(d) {
  //   return d.y = Math.max(r, Math.min(height - r, d.y));
  // });
    // doc.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    // doc.attr("x", d => d.x - d.width / 2 );
    // doc.attr("y", d => d.y - d.width / 2 );

    marching_squares(svg, groupsById);
  });


  doc.on("click", function(d) {
    console.log("d nodes", d.__setKey__, d.nodes, "shallow", d.shallow);
    console.log("BBox", this.getBoundingClientRect());
  });

});
