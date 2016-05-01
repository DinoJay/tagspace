import d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";
import marching_squares from "./marchingSquaresHelpers";

import d3_force from "d3-force";

require("./style/style.less");

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
  return groups;
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


        if (absX < xSpacing && absY < ySpacing) {
            l = Math.sqrt(x * x + y * y) * energy;

            lx = (absX - xSpacing) / l;
            ly = (absY - ySpacing) / l;
            // console.log("lx", lx, "ly", ly);

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
  // var points = d.map(function(i) { return [i.x, i.y]; });
  // var hull = d3.geom.hull(points);
  // // console.log("ch", ch);
  // if (hull.length === 0) console.log("tags", d.map(d => d.title));
  // // return hull.length > 0 ? "M" + hull.join("L") + "Z" : null;
  // return ch.length > 0 ? "M" + ch.join("L") + "Z" : null;
  // console.log("group", d);

  var fakePoints = [];
  d.forEach(function(e) {
    var xOffset = 30;
    var yOffset = 30;
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

  var hull = d3.geom.hull(fakePoints).join("L");

  var ch = d3.geom.delaunay(fakePoints).filter(function(t) {
    return dsq(t[0],t[1]) < asq && dsq(t[0],t[2]) < asq && dsq(t[1],t[2]) < asq;
  });

  // return null;
  return "M" + hull + "Z";
};

var groupFill = function(d, i) { return fill(i & 3); };

function moveToPos(d, pos, affectSize) {
  // var affectSize = alpha * energy;
  d.x = d.x + (pos.x - d.x) * affectSize;
  d.y = d.y + (pos.y - d.y) * affectSize;
}


d3.json("data.json", function(error, data) {
  // console.log("rawData", rawData);
  // const { data: data, edges: edges } = prepareData(rawData.documents);
  // console.log("tagData", data);
  //d
  data.documents.forEach(d => d.r = 12);

  var zoom = d3.behavior.zoom()
               .scaleExtent([1, 10])
               .on("zoom", () => {
                  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                });

  var svg = d3.select("body").append("svg")
              .attr("width", 1200)
              .attr("height", 800);
              // .append("g")
                  // .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");
              // .append("g")
              // .attr("transform", "translate(" + [75, 75] + ")")
              // .call(zoom);

  svg.append("g")
     .attr("class", "bubble-cont");

  var foci = fociLayout()
                .gravity(0.01)
                .sets(data.documents)
                .size([1200, 800])
                .charge(function(d) {
                  // var conn = this.hasConnections(d);
                  // return conn > 0 ? -100 / conn : -100;
                  // return - d.nodes.length * 40;
                  return -60;
                })
                // .linkStrength(1)
                .linkDistance(function(l){
                  // var conn = this.connections(l.source);
                  return 30;
                })
                .start();

  var nodes = _.flatten(foci.data().map(d => {
    return d.nodes.map(e => {
      e.center = {x: d.center.x, y: d.center.y};
      // e.x = d.x;
      // e.y = d.y;
      e.width = 10 * 2;
      e.height = 16 * 2;
      return e;
    });
  }));

  var groupsById =  foci.groups().map(g => {
    g.ids = _.flatten(g.values.map(sg => sg.nodes.map(n => n.id)));
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


    // .force("charge", d3_force.forceManyBody().strength(- 100))
    // .force("link", d3_force.forceLink().distance(100))
    // .force("position", d3_force.forcePosition());
    // .force("center", d3_force.forceCenter(600, 400));

  // var force = d3.layout.force()
  //               .nodes(nodes)
  //               .size([1200, 800])
  //               .charge(0)
  //               .linkStrength(0)
                // .linkDistance(l => {
                //   var conn1 = hasConnections(l.source);
                //   var conn2 = hasConnections(l.target);
                //   var conn = conn1 > conn2 ? conn1 : conn2;
                //   return conn > 0 ? 20000 / conn : 2000;
                // })
                // .chargeDistance(200)
                // .gravity(0)
                // .friction(0.4)
                // .theta(1);
  //
  // console.log("clusteredDocs", force.nodes());
  // // console.log("fociLinks", foci.links());
  //
  // console.log("fociLinks", foci.links());
  // var forceEdges = [];

  var simulation = d3_force.forceSimulation(nodes)
      .force("x", d3_force.forceX(d => d.center.x).strength(1))
      .force("y", d3_force.forceY(d => d.center.y).strength(1));
      // .force("collide", d3_force.forceCollide(12));

  // simulation.stop();
  //
  //   for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) /
  //     -simulation.alphaDecay()); i < n; ++i) {
  //     simulation.tick();
  //   }

  var forceEdges = _.flattenDeep(foci.links().map(l => {
    return l.source.nodes.map(s => {
      return l.target.nodes.map(t => {
        return {
          source: nodes.find(d => d.__setKey__ === s.__setKey__),
          target: nodes.find(d => d.__setKey__ === t.__setKey__)
          // intersec: l.intersec
        };
      });
    });
  }));


  console.log("forceEdges", forceEdges);

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
  // var gr = simple_comp(foci.data(), foci.links());
  // console.log("gr", gr);

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


  var doc = svg.selectAll(".doc")
    .data(nodes, d => d.id);

  doc
    .enter()
    .append("rect")
      // .attr("transform", d => "translate(" + (-d.width / 2) + "," + (-d.height/ 2) + ")")
      .attr("class", "doc")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("stroke", "black")
      .attr("stroke-width", "2")
      .attr("fill", "white")
      .append("title")
        .text(function(d) { return d.title; });

  // var link = svg.selectAll(".link")
  //              .data(foci.links());
  //
  // // build the arrow.
  // svg.append("svg:defs").selectAll("marker")
  //     .data(["end"])      // Different link/path types can be defined here
  //   .enter().append("svg:marker")    // This section adds in the arrows
  //     .attr("id", String)
  //     .attr("viewBox", "0 -5 10 10")
  //     .attr("refX", 15)
  //     .attr("refY", -1.5)
  //     .attr("markerWidth", 6)
  //     .attr("markerHeight", 6)
  //     .attr("orient", "auto")
  //   .append("svg:path")
  //     .attr("d", "M0,-5L10,0L0,5");
  //
  // link.enter().insert("line", ":first-child")
  //              //    .attr("class", function(d) { return "link " + d.type; })
  //              .attr("class", "link")
  //              .attr("marker-end", "url(#end)");





  simulation.on("tick", function(e) {

    // doc.each(d => {
    //   moveToPos(d, {x: d.center.x, y: d.center.y}, e.alpha );
    // });
    //
    // var q2 = d3.geom.quadtree(doc.data());
    // doc.each(d => {
    //   q2.visit(collide(d, 0, 1));
    //   // boundPanel(d, panels.center, 1);
    // });

    // doc.each((collide(doc.data(), e.alpha, 10)));
    //
    // svg.selectAll("path.group")
    //   .data(foci.groups())
    //     .attr("d", d => groupPath(d.values))
    //   .enter()
    //     // .insert("g")
    //     .insert("path", "circle")
    //     .attr("class", "group")
    //     .style("fill", (_, i) => fill(i))
    //     .attr("title", d => d.key)
    //     .style("stroke", groupFill)
    //     // .style("stroke-width", 40)
    //     .style("stroke-linejoin", "round")
    //     .style("opacity", 0.2)
    //     .attr("d", d => groupPath(d.values));

    // svg.selectAll("path.comp")
    //   .data(groupedNodes)
    //     .attr("d", groupPath)
    //   .enter().insert("path", "circle")
    //     .attr("class", "comp")
    //     .style("fill", "green")
    //     .style("stroke", groupFill)
    //     // .style("stroke-width", 40)
    //     .style("stroke-linejoin", "round")
    //     .style("opacity", 0.2)
    //     .attr("d", groupPath);
    // link
    //   .attr("x1", d => d.source.x)
    //   .attr("y1", d => d.source.y)
    //   .attr("x2", d => d.target.x)
    //   .attr("y2", d => d.target.y);

    doc.attr("transform", d => "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")");

    // doc.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    // doc.attr("x", d => d.x - d.width / 2 );
    // doc.attr("y", d => d.y - d.width / 2 );

    marching_squares(svg, groupsById);
  });

  // force.start();

  doc.on("click", d => console.log("d nodes", d.__key__, d.nodes));

});
