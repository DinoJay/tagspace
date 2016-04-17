import d3 from "d3";
import _ from "lodash";
import fociLayout from "./foci";

require("./style/style.less");

function biconnectedComponents(graph){

  var n = Object.keys(graph).length; // number vertices
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
      // console.log("u", u);
      dfsVisit(u);
    }
  }

  return result.map(g => _.uniq(g));

  function dfsVisit(u){
    visited[u] = true;
    d[u] = low[u] = count++;
    // console.log("graph u", graph[u]);
    graph[u].forEach(e =>{
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


function collide(data, alpha, padding) {
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

// var dsq = function(a,b) {
//         var dx = a[0]-b[0], dy = a[1]-b[1];
//         return dx*dx+dy*dy;
//     };
//
// var alpha = 50;
// var asq = alpha*alpha;
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
  }
  return current_group;
};

var groupPath = function(d) {
  // var points = d.map(function(i) { return [i.x, i.y]; });
  // var hull = d3.geom.hull(points);
  // var ch = d3.geom.delaunay(points).filter(function(t) {
  //   return dsq(t[0],t[1]) < asq && dsq(t[0],t[2]) < asq && dsq(t[1],t[2]) < asq;
  // });
  // // console.log("ch", ch);
  // if (hull.length === 0) console.log("tags", d.map(d => d.title));
  // // return hull.length > 0 ? "M" + hull.join("L") + "Z" : null;
  // return ch.length > 0 ? "M" + ch.join("L") + "Z" : null;
  var offset = 30;
  var fakePoints = [];
  d.forEach(function(e) {
    fakePoints = fakePoints.concat([
      // "0.7071" is the sine and cosine of 45 degree for corner points.
         [(e.x), (e.y + offset)],
         [(e.x + (0.7071 * offset)),
           (e.y + (0.7071 * offset))],
         [(e.x + offset), (e.y)],
         [(e.x + (0.7071 * offset)),
           (e.y - (0.7071 * offset))],
         [(e.x), (e.y - offset)],
         [(e.x - (0.7071 * offset)),
           (e.y - (0.7071 * offset))],
         [(e.x - offset), (e.y)],
         [(e.x - (0.7071 * offset)),
           (e.y + (0.7071 * offset))]
      ]);
  });
  return "M" + d3.geom.hull(fakePoints).join("L") + "Z";
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
  data.documents.forEach(d => d.r = 12);

  var svg = d3.select("body").append("svg")
              .attr("width", 1200)
              .attr("height", 800);

  var foci = fociLayout()
                .gravity(0.01)
                .sets(data.documents)
                .size([800, 500])
                .charge(function(d) {
                  var conn = this.hasConnections(d);
                  return conn > 0 ? -100 / conn : -500;})
                .linkStrength(1)
                .linkDistance(function(l){
                  return l.intersec.length > 0 ? 200 / l.intersec.length : 100000;
                  // var conn1 = this.hasConnections(l.source);
                  // var conn2 = this.hasConnections(l.target);
                  // var conn = conn1 > conn2 ? conn1 : conn2;

                  // return conn > 5 ? 2000 / conn : 200;
                })
                .startForce();

  var nodes = foci.data();

  var force = d3.layout.force()
                .nodes(nodes)
                .size([800, 500])
                .charge(0)
                .linkStrength(0)
                // .linkDistance(l => {
                //   var conn1 = hasConnections(l.source);
                //   var conn2 = hasConnections(l.target);
                //   var conn = conn1 > conn2 ? conn1 : conn2;
                //   return conn > 0 ? 20000 / conn : 2000;
                // })
                // .chargeDistance(200)
                .gravity(0)
                // .friction(0.4)
                .theta(1);

  // console.log("clusteredDocs", nodes);
  // console.log("fociLinks", foci.links());

  var forceEdges = _.flattenDeep(foci.links().map(l => {
    return l.source.nodes.map(s => {
      return l.target.nodes.map(t => {
        return {
          source: force.nodes().findIndex(d => d.id === s.id),
          target: force.nodes().findIndex(d => d.id === t.id),
          intersec: l.intersec
        };
      });
    });
  }));

  force.links(forceEdges);
  // console.log("forceEdges", forceEdges);

  var edgeList = forceEdges.map(l => [l.source, l.target]);
  // var linkedByIndex = {};
  // forceEdges.forEach(function(d) {
  //   linkedByIndex[d.source + "," + d.target] = true;
  // });
  //
  // function hasConnections(a) {
  //   var connections = 0;
  //   for (var property in linkedByIndex) {
  //     var s = property.split(",");
  //     if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property])
  //       connections++;
  //   }
  //   return connections;
  // }


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
  // console.log("edgeList", edgeList);
  var vertices = force.nodes().map((_, i) => i);
  var adjList = convert_edgelist_to_adjlist(vertices, edgeList);
  // console.log("adjList", adjList);

  var comps = biconnectedComponents(adjList);

  var cut_vertices = _.uniq(_.flatten(comps.map(c => {
    return c.filter(u => {
      var n = comps.filter(c => c.find(v => v === u) ? true : false);
      return n.length > 1;
    });
  }).filter(s => s > 0)));

  // console.log("cut_vertices", cut_vertices);

  nodes.forEach((d, i) => {
    if (cut_vertices.indexOf(i) !== -1 ) d.cut = true;
  });

  var redComps = comps.map(c => c.filter(v => cut_vertices.indexOf(v) === -1));

  // console.log("redComps", redComps);

  var deeperComps = redComps.map(c => {
    // console.log("comp", c);
    var compLinks = edgeList.filter(l => c.indexOf(l[0]) !== -1 && c.indexOf(l[1]) !== -1);
    // console.log("compLinks", compLinks);
    var adjList = convert_edgelist_to_adjlist(vertices, compLinks);
    // console.log("adjlist", adjList);
    return biconnectedComponents(adjList);
  });
  // console.log("deeper comps", deeperComps);

  var groups = [];
  var visited = {};
  var v;
  for (v in adjList) {
    if (adjList.hasOwnProperty(v) && !visited[v]) {
      groups.push(bfs(v, adjList, visited));
    }
  }
  // TODO: fix later
  groups = groups.map(g => g.map(n => parseInt(n)));
  // console.log("groups", groups);

  var groupedNodes = groups.map(g => g.map(i => nodes[parseInt(i)]));
  var compNodes = redComps.map(c => c.map(i => nodes[i]));

  // console.log("groupedNodes", groupedNodes);

  var doc = svg.selectAll(".doc")
    .data(nodes, d => d.id);

  doc.enter()
     .append("circle")
     .attr("class", "doc")
     .attr("r", d => d.r)
     .attr("stroke", d => d.cut ? "red" : "black")
     .attr("stroke-width", "2")
     .attr("fill", "white")
     .call(force.drag);

  var link = svg
      .insert("g", ":first-child")
      .selectAll(".link")
     .data(forceEdges)
     .enter().append("line")
     //    .attr("class", function(d) { return "link " + d.type; })
     .attr("class", "link");

  force.on("tick", function(e) {
    doc.each(d => {
      moveToPos(d, {x: d.center.x, y: d.center.y}, e.alpha * 2);
    });
    doc.each((collide(doc.data(), e.alpha, 0)));

    svg.selectAll("path.group")
      .data(compNodes)
        .attr("d", groupPath)
      .enter().insert("path", "circle")
        .attr("class", "group")
        .style("fill", "red")
        .style("stroke", groupFill)
        // .style("stroke-width", 40)
        .style("stroke-linejoin", "round")
        .style("opacity", 0.2)
        .attr("d", groupPath);

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
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d =>  d.target.y);

    doc.attr("transform", d => "translate(" + [d.x, d.y] + ")");
  });

  force.start();

  doc.on("click", d => console.log("d", d.tags));
});