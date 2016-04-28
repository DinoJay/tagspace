import d3 from "d3";
import _ from "lodash";
import cola from "webcola";

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

function biconnectedComponents(graph) {

  var n = Object.keys(graph).length; // number vertices
  var result = [];
  // var m = 10; // number edges

  var count = 0;
  var stack = []; // stack edge
  var visited = d3.range(0, n).map(() => false); // boolean
  var low = []; // low points
  var d = []; // ??
  var parent = d3.range(0, n).map(() => -1);

  for (var u = 0; u < n; u++) {
    if (!visited[u]) {
      // console.log("u", u);
      dfsVisit(u);
    }
  }

  return result.map(g => _.uniq(g));

  function dfsVisit(u) {
    visited[u] = true;
    d[u] = low[u] = count++;
    // console.log("graph u", graph[u]);
    graph[u].forEach(e => {
      var min = Math.min(u, e);
      var max = Math.max(u, e);
      var v = u === min ? max : min;

      if (v == parent[u]) {
        return;
      }
      if (!visited[v]) {
        stack.push([u, e]);
        parent[v] = u;
        dfsVisit(v);
        if (low[v] >= d[u]) {
          outputComp(u, v);
        }
        low[u] = Math.min(low[u], low[v]);
      } else
      if (d[v] < d[u]) {
        stack.push([u, e]);
        low[u] = Math.min(low[u], d[v]);
      } else {
        // dont push edge on stack when v has been visited
        // and has distance more than that of u in the dfs tree
      }
    });
  }

  function outputComp(u, v) {
    console.log("New Biconnected Component Found");
    var check = [u, v];
    var comp = [];

    while (stack.length > 0 && _.difference(check, e).length > 0) {
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


function moveToCenter(alpha, energy) {
  var affectSize = alpha * energy;
  return function(d) {
    d.x = d.x + (d.center.x - d.x) * affectSize;
    d.y = d.y + (d.center.y - d.y) * affectSize;
  };
}

// function moveToDX(alpha, energy) {
//   var affectSize = alpha * energy;
//   return function(d) {
//     d.x = d.x + (d.center.x - d.x) * affectSize;
//     d.y = d.y + (d.center.y - d.y) * affectSize;
//   };
// }

function groups(nodes) {
  if (!nodes) return this._groups;

  var spread_data = _.flatten(nodes.map(n => {
      var clones = n.sets.map(t => {
        var clone = _.cloneDeep(n);
        clone.tag = t;
        return clone;
      }).filter(d => d.__key__ !== "root");
      return clones;
    }));

  var nested_data = d3.nest()
    .key(d => d.tag)
    .entries(spread_data).filter(d => d.values.length > 1);

  var uniq_nested_data = _.uniqWith(nested_data, (a, b) => {
      var aKeys = a.values.map(d => d.__key__);
      var bKeys = b.values.map(d => d.__key__);

      return _.isEqual(aKeys, bKeys);
  });

  var groups = uniq_nested_data.map(g => {
    g.id = g.key;
    g.leaves = g.values.map(d => d.index);
    return g;
  });

  console.log("groups.length", groups.length);

  return groups;
}


function start() {

  var linkedByIndex = {};
  this.links().forEach(function(d) {
    linkedByIndex[d.source + "," + d.target] = true;
  });

  function hierarchy(cur, nodes, linkedByIndex) {
    cur.children = neighbors(cur, linkedByIndex, nodes);
    cur.value = cur.children.length;
    console.log("cur", cur);
    console.log("cur children", cur.children);

    cur.children.forEach(next => {
      // if(seen.indexOf(next) === -1)
      hierarchy(next, nodes, linkedByIndex);
    });
  }

  function runForce(nodes, that) {


    var force = d3.layout.force()
      .charge(d => that._charge(d)) // * d.size)
      .size(that.size())
      .gravity(that._gravity)
      .linkStrength(that._linkStrength)

      .linkDistance(d => that._linkDistance(d));


    nodes.forEach(d => {
      d.width = 11 * 2;
      d.height = 20 * 2;
    });


    var colaForce = cola.d3adaptor()
      // .flowLayout("y", 12)
      .handleDisconnected(true)
      .avoidOverlaps(true)
      .size(that.size());
      // .jaccardLinkLengths(40, 0.7);

    colaForce
      .nodes(nodes)
      .links(links)
      .linkDistance(l => {
        return l.source.nodes ? l.source.nodes.length * 10 : 20;
        // return 40;
      });
      // .groups(gs);
      //

    // colaForce
    //   .start(20, 0, 10);

    // force.nodes(nodes);
    // console.log("links", links);
    force.nodes(nodes);
    force.links(links);

    var n = 300;
    force.start();
    for (var i = n * n; i > 0; --i) force.tick();
    force.stop();

    var gs = that.groups(force.nodes());
    that._groups = gs;

    console.log("GS", gs);

    nodes.forEach(function(d) {
      // console.log("d", d);
      d.center = {
        x: d.x,
        y: d.y
      };

      // TODO: check
      d.nodes.forEach((e)=> {
        e.center = Object.assign({}, d.center);
        e.bounds = Object.assign({}, d.bounds);
        // e.center.px = e.center.x + (i * 10);
        // e.center.py = e.center.y + (i * 10);
        // // e.center.z = i;
        // e.dx = d.dx;
        // e.dy = d.dy;
      });
    });
    return nodes;
  }



  // var diagonal = d3.svg.diagonal.radial()
  //     .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });


  function runTree() {

    var root = {
      index:     nodes.length,
      level:     0,
      "__key__": "root",
      sets     : [],
      // children: nodes.filter(d => d.level === 0),
      nodes: []
    };

    nodes.forEach(d => {
      if (d.level === 1) {
        links.push({
          source: root.index,
          target: d.index
        });
      }
    });

    nodes.push(root);


    var diameter = 960;

    var tree = d3.layout.tree()
        .size([360, diameter / 2 - 120])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

    var treed = tree.nodes(root);


    // var packed = pack(root);
    // // //
    treed.forEach(d => {
      d.center = {
        x: d.x,
        y: d.y
      };
    });

    return treed;
  }

  var nodes = this.sets();
  var links = this.links();

  console.log("NODES", nodes);

  nodes = runForce(nodes, this);

  console.log("linkedByIndex", linkedByIndex);
  // hierarchy(root, nodes, linkedByIndex);

  //
  // console.log("treed", treed);
  // console.log("treed center", treed.filter(d => !d.center.x));

  // console.log("packed", packed.filter(d => !d));

  // var totalSize = values.reduce((a, b) => a.size + b.size);
  // console.log("SETS", this.sets());
  // console.log("fociLinks", this._fociLinks.map(d => d.source.__key__ + " - " + d.target.__key__));

  // var packedNodes = packed.filter(d => d.nodes);

  // nodes.forEach(d => {
  //   d.x = null;
  //   d.y = null;
  //   d.px = null;
  //   d.py = null;
  // });

  // var edges = pack.links(packedNodes);

  //
  // run the simulation n times


  // var nodes = _.flatten(values.map(d => d.nodes));

  this.data(nodes);

  return this;
}

function getData(data) {
  if (!data) return this._data;

  this._data = data;
  return this;
}


function links() {
  return this._fociLinks;
}

function extractSets(data) {

  var copyData = data.map(d => d);
  // var oldSets = null; //this._sets, //foci.sets() ,

  var sets = d3.map({}, function(d) {
    return d.__key__;
  });


  var individualSets = d3.map(),
    set,
    key,
    i,
    n = copyData.length;

  // TODO: rename __key__
  for (i = -1; ++i < n;) {
    // TODO: change it later, too specific
    set = copyData[i].tags;
    key = set.sort().join(",");
    if (set.length) {
      set.forEach(function(val) {
        if (individualSets.get(val)) {
          individualSets.get(val).size += 1;
        } else {
          individualSets.set(val, {
            __key__: val,
            size: 1,
            sets: [val],
            nodes: []
          });
        }
      });
      copyData[i].__setKey__ = key;
      if (sets.get(key)) {
        var e = sets.get(key);
        e.size++;
        e.nodes.push(copyData[i]);
      } else {
        sets.set(key, {
          __key__: key,
          sets: set,
          size: 1,
          nodes: [copyData[i]]
        });
      }
    }
  }

  individualSets.forEach(function(k, v) {
    if (!sets.get(k)) {
      sets.set(k, v);
    }
  });

  return sets;
}

function initSets(data) {
  if (!data) return this._sets;

  var sets = extractSets(data);
  var setData = sets.values();

  var G = prepareGraph(setData);

  // check
  this._sets = G.nodes;
  this._fociLinks = G.edges;

  return this;
}

function prepareGraph(setData) {
  // if (!data) return this._sets;

  var fociLinks = [];
  // TODO: filter out before
  var nodes = setData.filter(v => v.nodes.length > 0);

  nodes.forEach((d, i) => {
    d.level = 0;
    d.index = i;
  });

  nodes.forEach(s => {
    nodes.forEach(t => {
      var intersect = _.intersection(s.sets, t.sets);
      var linkExist = fociLinks.findIndex(l => (
        l.source === s.index && l.target === t.index || l.target === s.index && l.source === t.index)) === -1 ? false : true;

      if (s.index !== t.index && intersect.length > 0)
        fociLinks.push({
          source: s.index,
          target: t.index,
          intersec: intersect
        });
    });
  });

  // console.log("foci nodes", nodes);
  // console.log("fociLinks", fociLinks);
  // console.log("fociLinks length", fociLinks.length);

  var linkedByIndex = {};
  fociLinks.forEach(function(d) {
    linkedByIndex[d.source + "," + d.target] = true;
  });

  // console.log("linkedByIndex", linkedByIndex);

  // this._linkedByIndex = linkedByIndex;

  // TODO: do more testing

  return forest(nodes, linkedByIndex);


  function forest(nodes, linkedByIndex) {
      function graphToDAG(startIndex) {
        var G = {
          nodes: [],
          vertices: [],
          edges: []
        };
        var q = [];
        var visitedTags = [];
        var level = 1;

        q.push(startIndex);
        G.vertices.push(startIndex);

        var startNode = nodes[startIndex];

        startNode.level = level;
        level += 1;
        // console.log("startLevel", startNode.level);

        G.nodes.push(startNode);

        // console.log("startIndex", startIndex);

        while (q.length !== 0) {

          // console.log("q", q);
          var u = q.pop(); // pop front

          // console.log("u index", u);
          // console.log("u", nodes[u]);
          // console.log("seen", tags);
          // console.log("sets", nodes[u].sets);
          // console.log("diff", _.difference(nodes[u].sets, tags));
          var vs = nbsByTag(u, linkedByIndex, nodes, visitedTags);

          var sorted = _.sortBy(vs.map(i => nodes[i]), d => {
            return d.sets.length;
            // var conn = connectionsIndex(d.index, linkedByIndex, sv.map(i => nodes[i]));
            // return 100 * conn / d.sets.length;
          }).map(d => d.index).reverse();

          // console.log("vs", sorted.map(u => nodes[u].__key__));

          // console.log("sorted", sorted.map(i => nodes[i]));

          sorted.forEach(v => {
            if (G.vertices.indexOf(v) !== -1) {
              var filterOut = G.edges.filter(l => l.target === v);
              // console.log("filterOut", filterOut);
              G.edges = _.difference(G.edges, filterOut);

              G.edges.push({
                source: u,
                target: v
              });
            } else {
              G.vertices.push(v);
              var node = nodes[v];
              node.level = level;
              G.nodes.push(node);

              G.edges.push({
                source: u,
                target: v
              });
              q.push(v);

              q = _.uniq(q);
              q = _.sortBy(q.map(i => nodes[i]), d => {
                return d.sets.length;
              }).map(d => d.index).reverse();
            }
          });
          level = level + 1;
          visitedTags.push(...nodes[u].sets);
        }
        return G;
      }

      var sortedNodes = _.sortBy(nodes, d => {
        // console.log("d.index", d.index);
        // var conn = connectionsIndex(d.index, linkedByIndex, nodes);
        // return conn * d.nodes.length;

        return d.sets.length;
      }).reverse();

      var sv = sortedNodes.map(n => n.index);
      // console.log("sortedNodes", sortedNodes);

      var edges = [];
      var newNodes = [];
      while (sv.length > 0) {
        var G = graphToDAG(sv.pop(), nodes);
        // console.log("G.nodes", G.vertices);
        // console.log("sv", sv);
        sv = _.difference(sv, G.vertices);
        // console.log("diff", sv);
        edges = edges.concat(G.edges);
        newNodes = newNodes.concat(G.nodes);
      }

      newNodes = _.sortBy(newNodes, d => d.index);
      // console.log("G nodes", newNodes);

      // console.log("nodes len", nodes.length, "newNodes len", newNodes.length);
      return {
        nodes: newNodes,
        edges: edges,
        linkedByIndex: linkedByIndex
      };
    }
    // console.log("sv", sv);
    // while(sv.length !== 0) {
    // var cur = sv.pop();
    // var neighbors = nbs(cur, linkedByIndex, sv);
    // simpleComps.push([cur].concat(neighbors));
    // hierarchy.push({node: nodes[cur], nbs: neighbors.map(n => nodes[n])});
    // sv = _.difference(sv, neighbors);

  // var cur = sv.pop();
  // var curNode = nodes[cur];
  // induceNbs(curNode);
  // hierarchy.push(curNode);
  // console.log("nodes[cur]", nodes[cur]);
  // sv = [];
  // var neighbors = [];
  // var nbObjs = neighbors.map(i => nodes[i]);
  // console.log("seen", seen);
  // console.log("sv", sv);
  // sv = _.difference(sv, seen);
  // hierarchy.push({node: nodes[cur], nbs: nbObjs});
  // console.log("result", result);
  // sv = [];

  // console.log("cur", nodes[cur]);
  // console.log("nbs", neighbors);
  // console.log("sv", sv);
  // }
  // console.log("simpleComps", simpleComps);
  // console.log("hierarchy", hierarchy);


  // var simpleCompNodes = simpleComps.map(c => c.map(i => nodes[i]));
  // console.log("simpleCompNodes", simpleCompNodes);
  // var clusters = hierarchy.map(n => {
  //   var sets = _.uniq(_.flatten(n.nbs.map(n => n.sets)));
  //   var intersets = _.intersection(...n.nbs.map(n => n.sets));
  //   n.otherKey = sets.join(",");
  //   n.interkey = intersets.join(",");
  //   n.otherSets = sets;
  //   return n;
  // });
  // console.log("clusters", clusters);

  // var vertices = nodes.map((_, i) => i);
  // var adjList = convert_edgelist_to_adjlist(vertices, edgeList);
  // // console.log("adjList", adjList);
  //
  // var comps = biconnectedComponents(adjList);
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
  // var biComps = comps.map(c => c.filter(v => cut_vertices.indexOf(v) === -1));
  // var biCompNodes = biComps.map(c => c.map(i => nodes[i]));

  // console.log("biconnected components", biCompNodes);

  // this._sets = G.nodes;
  // this._fociLinks = G.edges;

  // return this;
}

function charge(func) {
  if (func === undefined) return this._charge;
  this._charge = func;
  return this;
}

function clusterSize(func) {
  if (func === undefined) return this._clusterSize;
  this._clusterSize = func;
  return this;
}

function linkStrength(factor) {
  if (factor === undefined) return this._linkStrength;
  this._linkStrength = factor;
  return this;
}

function linkDistance(func) {
  if (func === undefined) return this._linkDistance;
  this._linkDistance = func;
  return this;
}


function size(wh) {
  if (!wh) return this._size;
  this._size = wh;
  return this;
}

function gravity(gr) {
  if (!gr) return this._gravity;
  this._gravity = gr;
  return this;
}


function connections(a) {
  var connections = 0;
  for (var property in this._linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index || s[1] == a.index) && this._linkedByIndex[property])
      connections++;
  }
  return connections;
}

function hasConnections(a) {
  for (var property in this._linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index || s[1] == a.index) && this._linkedByIndex[property])
      return true;
  }
  return false;
}

// function nbsIndex(a, linkedByIndex) {
//   var nbs = 0;
//   for (var property in linkedByIndex) {
//     var s = property.split(",");
//     if ((s[0] == a) nbs.push(s[1])
//     else if(s[])
//       connections++;
//   }
//   return connections;
// }



function neighbors(a, linkedByIndex, nodes) {
  var nb;
  var nbs = [];

  // console.log("a", a);
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    if (s[0] === a.index) {
      // console.log("s[1]", s[1]);
      nb = nodes[s[1]];
      // console.log("nb", nb);
      nbs.push(nb);
    }
    // else {
    //   if (s[1] === a.index) {
    //     console.log("s[0]", s[0]);
    //     nb = nodes[s[0]];
    //     console.log("nb", nb);
    //     nbs.push(nb);
    //   }
    // }
  }
  return nbs;
}

// TODO: rename
function connectionsIndex(a, linkedByIndex, nodes) {
  var connections = 0;
  var nb;
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    if (s[0] === a && nodes[s[1]]) {
      nb = nodes[s[1]];
      // console.log("nb", nb);
      connections += nb.nodes.length;
    } else {
      if (s[1] === a && nodes[s[0]]) {
        nb = nodes[s[0]];
        // console.log("nb", nb);
        connections += nb.nodes.length;
      }

    }

  }
  return connections;
}



function nbsByTag(a, linkedByIndex, nodes, seen) {
  var nbs = [];
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    var source = nodes[s[0]];
    var target = nodes[s[1]];
    var diff, interset;

    if (s[0] === a) {
      diff = _.difference(source.sets, seen);
      interset = _.intersection(diff, target.sets);
      if (interset.length > 0)
        nbs.push(s[1]);
    }
    // else {
    //   if (s[1] === a) {
    //     diff = _.difference(target.sets, seen);
    //     interset = _.intersection(diff, source.sets);
    //     if(interset.length > 0)
    //     nbs.push(s[0]);
    //   }
    // }
  }
  return _.uniq(nbs);
}

// function neighbors(a, linkedByIndex, nodes) {
//   var nbs = [];
//   for (var property in linkedByIndex) {
//     var s = property.split(",").map(d => parseInt(d));
//     if (s[0] === a && nodes.indexOf(s[1]) !== -1) {
//       nbs.push(nodes[s[1]]);
//     }
//     else {
//       if (s[1] === a && nodes.indexOf(s[0]) !== -1) {
//         nbs.push(nodes[s[0]]);
//       }
//     }
//   }
//   return nbs;
// }

const d3Foci = function() {
  return {
    _sets: null,
    _data: null,
    _charge: () => -30,
    _size: [1, 1],
    _fociLinks: null,
    _nodeLinks: null,
    _linkDistance: 20,
    _linkStrength: 0.1,
    _gravity: 0.1,
    _clusterSize: d => d,

    _orientation: Math.PI / 2,
    _normalize: true,
    _padding: 0,

    linkDistance: linkDistance,
    linkStrength: linkStrength,
    charge: charge,
    size: size,
    data: getData,
    clusterSize: clusterSize,
    sets: initSets,
    gravity: gravity,
    start: start,
    links: links,
    groups: groups,

    connections: connections,
    hasConnections: hasConnections
  };
};

export
default

function() {
  return new d3Foci;
}
