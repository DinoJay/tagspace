// import d3 from "d3";
import * as d3 from "d3";
import _ from "lodash";
import * as d3_force from "d3-force";
import {parseTime} from "./utils.js";

var isCutEdge = (l, nodes, linkedByIndex, maxDepth) => {
  var tgt = nodes[l.target];
  var targetDeg = outLinks(tgt, nodes, linkedByIndex).length;
  // console.log("modulo", l.level, maxDepth, l.level % maxDepth);
  return l.level % maxDepth === 0 && targetDeg > 0;
};

var collide = function(nodes) {
  return function(alpha) {
    var quadtree = d3.quadtree()
                     .x(d => d.x)
                     .y(d => d.y)
                     .addAll(nodes);

      for (var i = 0, n = nodes.length; i < n; ++i) {
        var d = nodes[i];
        // TODO: adopt to size of diigo
        d.r = 100;
        var nx1 = d.x - d.r,
          nx2 = d.x + d.r,
          ny1 = d.y - d.r,
          ny2 = d.y + d.r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          // important check
          if (quad.data && (quad.data !== d)
            && quad.data.comp !== d.comp && !d.label && !quad.data.label) {
            var x = d.x - quad.data.x,
                y = d.y - quad.data.y,
                l = Math.sqrt(x * x + y * y),
                r = d.r + quad.data.r;

            if (l < r) {
              l = (l - r) / l * (alpha * 0.035);
              d.x -= x *= l;
              d.y -= y *= l;
              quad.data.x += x;
              quad.data.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      }
    };
};

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
  // console.log("edgeList", edgeList);

  var adjlist = convert_edgelist_to_adjlist(vertices, edgeList);
  // console.log("adjList", adjlist, adjlist.length, "vertices", vertices,
  // vertices.length);

  for (v in adjlist) {
    if (adjlist.hasOwnProperty(v) && !visited[v]) {
      var indices = bfs(v, adjlist, visited);
      groups.push(indices.map(i => nodes[i]));
    }
  }
  return groups.map(g => g.filter(d => d));
}

var bfs = function(v, adjlist, visited) {
  var q = [];
  var current_group = [];
  var i, len, adjV, nextVertex;
  q.push(v);
  visited[v] = true;
  // var max = 10;
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
    // two way
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

function deriveSets(nodes) {
  if (!nodes) return this._groups;

  var realNodes = nodes.filter(d => !d.label);

  var spread_data = _.flatten(realNodes.map(n => {
    var clones = n.tags.map(t => {
      var clone = _.cloneDeep(n);
      clone.tag = t;
      return clone;
    });
    return clones;
  }));

  var nested_data = d3.nest()
    .key(d => d.tag)
    .entries(spread_data).filter(d => d.values.length > 1);

  var groups = nested_data.map(g => {
    g.id = g.key;
    return g;
  });

  // labelNodes.forEach(l => {
  //   groups.forEach(g => {
  //     if (l.interSet.indexOf(g.key) !== -1) {
  //       // l.text = g.id;
  //       // TODO: dirty hack, fix this
  //       // l.id = g.id + " label";
  //       // console.log("label with group!");
  //       g.values.push(l);
  //     }
  //     // else console.log("label without group!");
  //   });
  // });

  // groups.forEach(d => {
  //   d.values = d.values.map(d => d.data);
  // });

  return groups;
}


function start() {

  function runForce(nodes, links, that) {

    console.log("NODes", nodes, "LinKs", links);
    var center = that._size.map(d => d/2);

    var linkedByIndex = {};
    links.forEach(function(l) {
      linkedByIndex[l.source + "," + l.target] = l;
    });

    console.log("linkedByIndex", linkedByIndex);

    // linkedByIndex = {};
    // links.forEach(function(d) {
    //   var src = d.source.index ? d.source.index : d.source;
    //   var tgt = d.target.index ? d.target.index : d.target;
    //   linkedByIndex[src + "," + tgt] = true;
    // });

    console.log("linkedByIndex Force", linkedByIndex);
    console.log("nodes Force", nodes.map(d => d.index));
    nodes.forEach(n => {
      n.parent = getParent(n, linkedByIndex, nodes);
      n.outLinks = outLinks(n, nodes, linkedByIndex);
      n.inLinks = inLinks(n, nodes, linkedByIndex);
    });

    console.log("sim start", "links", links);
    links.forEach(l => {
      l.cut = isCutEdge(l, nodes, linkedByIndex, that._maxDepth);
    });
    console.log("cutEdges", links.filter(l => l.cut));

    var simulation = d3_force.forceSimulation(nodes)
      // .force("charge", d3.forceManyBody())
      .force("link", d3_force.forceLink()
               .distance(l => l.target.label ? 1 : l.cut ? 100 : 9)
               .strength(l => {
                 // var maxLen = Math.min(l.source.outLinks.length,
                 //   l.target.outLinks.length);
                 // console.log("1/maxLen", maxLen);
                 return l.cut ? 0.5 : 1;
                 // return 1;
               }))
      // .force("position", d3_force.forcePosition());
      .force("collide", d3_force.forceCollide(() => 7))
      // .force("specialCollide", (alpha) => {
      //   var quadtree = d3.geom.quadtree(nodes);
      //   collide2(alpha, nodes, quadtree);
      // })
      .force("intraCollide", collide(nodes))
      .force("center", d3_force.forceCenter(...center));
      // .alphaMin(0.4);

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.stop();


    // that._groups = deriveSets(comps);
    //

    // TODO: dirty hack
    that._setNodes = nodes;

    that._reducedEdges = links.filter(l => !l.cut);
    // that._cutEdges = links.filter(l => l.cut);

    // console.log("nODes", nodes);
    // console.log("cutEdges", that._cutEdges);
    var simpleComps = simple_comp(nodes, that._reducedEdges);

    var comps = simpleComps.map((g, i) => {
      var id = i + "comp";
      var compNodes = _.flatten(g.map(d => d.nodes)).filter(d => d);
      compNodes.forEach(cn => {
        nodes.forEach(n => {
          if (cn.__setKey__ === n.__key__) {
            n.nodes.forEach(n => n.comp = id);
            n.comp = id;
          }
        });
      });
      // g.forEach(d => d.compId = id);
      var tags = d3.nest()
        .key(d => d)
        // TODO: check it later
        .entries(_.flatten(compNodes.filter(d => d).map(d => d.tags)))
      .sort((a, b) => d3.descending(a.values.length, b.values.length));

      var interTags = _.intersection(compNodes.filter(d => d)
        .map(d => d.tags));

      return {
        id: id,
        values: g,
        tags: tags,
        // TODO: check later
        nodes: compNodes,
        interTags: interTags,
        sets: deriveSets(compNodes)
        // nodes: g
      };
    });

    console.log("no comp nodes", nodes.filter(n => !n.comp));
    // var cutComps = simple_comp(nodes, links.filter(l => l.cut));
    // console.log("cutComps", cutComps);
    // console.log("simple_comp", simpleComps.map(d => d.map(d => d.comp)));

    nodes.forEach(function(d) {
      d.x = 300 + Math.random() * 200;
      d.y = 100 + Math.random() * 200;
      d.vx = d.vy = 0;
    });

    // for (var i = 0, n = 50; i < n; ++i) {
    for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) /
      -simulation.alphaDecay()); i < n; ++i) {
      simulation.tick();
    }

    that._comps = comps;

    nodes.forEach(function(d) {
      // console.log("d", d);
      d.center = {
        x: d.x,
        y: d.y
        // r: d.r
      };

      // TODO: check
      if (!d.label) {
        d.nodes.forEach((e)=> {
          e.center = Object.assign({}, d.center);
          });
      } else {
          d.center = Object.assign({}, d.center);
          d.vx = 0;
          d.vy = 0;
          d.x = 0;
          d.y = 0;
      }
    });
    return nodes;
  }

  var nodes = this.sets();
  var links = this.links();

  this.data(runForce(nodes, links, this));
  // this._hierarchy = runTree(clonedNodes, clonedLinks);

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
  // console.log("copyData", copyData);
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
    // if (!set) continue;
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

  individualSets.each(function(v, k) {
    if (!sets.get(k)) {
      sets.set(k, v);
    }
  });

  return sets;
}

function initSets(arg, union) {
  if (!arg) return this._setNodes;

  var graph;
  var setData;
  if (this._sets) {
    var filterFunc;
    if (!union) {
      filterFunc = n => _.intersection(n.sets, arg).length === arg.length;
    }
    else {
      filterFunc = n => _.intersection(n.sets, arg).length > 0;
    }


    var setNodes = this._cachedGraph.nodes
        .filter(filterFunc);

    graph = prepareGraph(this, setNodes);
    var nodes = graph.nodes;
    var edges = graph.edges;

    if (this._timerange) {
      var st = this._timerange[0];
      var et = this._timerange[1];
      nodes = nodes.reduce((acc, d) => {
        var nodes = d.nodes.filter(n => n.date >= st && n.date <= et);
        if (nodes.length > 0) {
          d.nodes = nodes;
          acc.push(d);
        }
        return acc;
      }, []);
      this._timerange = null;
    }
    //
    // var edges = [];
    // nodes.forEach((src, i) => {
    //   nodes.forEach((tgt, j) => {
    //     if (_.intersection(src.sets, tgt.sets).length > 0) {
    //       edges.push({
    //                   source: i,
    //                   target: j,
    //                   id: i + j
    //                   // level: l.level
    //                 });
    //     }
    //   });
    // });
    // edges = _.uniqBy(edges, "id");
    // console.log("edges", edges);
    // this._cachedGraph.edges.forEach(l => {
    //   var src = nodes.findIndex(n => n.__key__ === l.source.__key__);
    //   var tgt = nodes.findIndex(n => n.__key__ === l.target.__key__);
    //   if (src !== -1 && tgt !== -1) {
    //     edges.push({
    //                 source: src,
    //                 target: tgt,
    //                 level: l.level
    //               });
    //   }
    // });

    // console.log("oldEdges", oldEdges);

    this._setNodes = nodes;
    this._fociLinks = edges;

    this._cutEdges = edges.filter(l => {
      return l.level % this._maxDepth === 0;
    });

  }
  else {
    var data = arg;
    data.forEach(d => d.date = parseTime(d.created_at));
    this._sets = extractSets(data);
    setData = this._sets.values();
    graph = prepareGraph(this, setData);
    this._cachedGraph = graph;
    this._setNodes = graph.nodes;
    // this._bicomps = bicomps.map(g => g.map(i => setData[i]));
    this._cutEdges = graph.edges.filter(l => {
      return l.level % this._maxDepth === 0;
    });

    this._fociLinks = graph.edges;
  }

  return this;
}



function prepareGraph(that, setData) {
  // if (!data) return this._sets;

  // TODO: filter out before
  var nodes = setData.filter(v => v.nodes.length > 0);

  nodes.forEach((d, i) => {
    d.level = 0;
    d.index = i;
  });

  var fociLinks = [];
  nodes.forEach(s => {
    nodes.forEach(t => {
      var interSet = _.intersection(s.sets, t.sets);
      // var linkExist = fociLinks.findIndex(l => (
      //   l.source === s.index && l.target === t.index || l.target === s.index && l.source === t.index)) === -1 ? false : true;

      if (s.index !== t.index && interSet.length > 0)
        fociLinks.push({
          source: s.index,
          target: t.index,
          interSet: interSet,
          strength: t.sets.length / s.sets.length
        });
    });
  });

  // console.log("foci nodes", nodes);
  // console.log("fociLinks", fociLinks);
  // console.log("fociLinks length", fociLinks.length);

  var linkedByIndex = {};
  fociLinks.forEach(function(d) {
    var src = d.source.index ? d.source.index : d.source;
    var tgt = d.target.index ? d.target.index : d.target;
    linkedByIndex[src + "," + tgt] = true;
  });

  // console.log("linkedByIndex", linkedByIndex);

  // TODO
  // this._linkedByIndex = linkedByIndex;

  // TODO: do more testing
  return forest(nodes, linkedByIndex);
  // return {nodes: nodes, edges: fociLinks};


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
        // level += 1;
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
            // return d.sets.length;
            // return d.nodes.length;
            var conn = connectionsIndex(d.index, linkedByIndex,
              sv.map(i => nodes[i]));
            return 100 * conn * d.nodes.length / d.sets.length;
          }).map(d => d.index).reverse();

          // console.log("vs", sorted.map(u => nodes[u].__key__));

          // console.log("sorted", sorted.map(i => nodes[i]));

          sorted.forEach(v => {
            if (G.vertices.indexOf(v) !== -1) {
              var filterOut = G.edges.filter(l => {
                // var tgtNode = nodes[l.target];
                // console.log("tgtNodes", tgtNodes);
                return l.target === v; //&& tgtNode.nodes.length > 1;
              });
              // TODO:
              // console.log("filterOut", filterOut);
              G.edges = _.difference(G.edges, filterOut);
              G.edges.push({
                source: u,
                target: v,
                interSet: _.intersection(nodes[u].sets, nodes[v].sets),
                level: level,
                strength: nodes[v].sets.length / nodes[u].sets.length
              });
            } else {
              G.vertices.push(v);
              var node = nodes[v];
              node.level = level;
              G.nodes.push(node);

              G.edges.push({
                source: u,
                target: v,
                interSet: _.intersection(nodes[u].sets, nodes[v].sets),
                level: level,
                strength: nodes[v].sets.length / nodes[u].sets.length
              });
              q.push(v);

              q = _.uniq(q);
              q = _.sortBy(q.map(i => nodes[i]), d => {
                return d.sets.length;
              }).map(d => d.index).reverse();
            }
          });
          level += 1;
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

function outLinks(a, nodes, linkedByIndex) {
  var links = [];
  // if (!a.index) console.log("aindex", a);
  for (var property in linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index) && linkedByIndex[property])
      links.push(linkedByIndex[property]);
  }
  return links;
}

function inLinks(a, nodes, linkedByIndex) {
  var links = [];
  for (var property in linkedByIndex) {
    var s = property.split(",");
    if ((s[1] == a.index) && linkedByIndex[property])
      links.push(linkedByIndex[property]);
  }
  return links;
}

function hasConnections(a, linkedByIndex) {
  for (var property in linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property])
      return true;
  }
  return false;
}

function isParent(a, linkedByIndex) {
  for (var property in linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index) && linkedByIndex[property])
      return true;
  }
  return false;
}

function getParent(a, linkedByIndex, nodes) {
  for (var property in linkedByIndex) {
    var s = property.split(",");
    if ((s[1] == a.index) && linkedByIndex[property])
      return nodes[s[0]];
  }
  return null;
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

const d3Foci = function() {
  return {
    _sets: null,
    _data: null,
    _maxDepth: 3,
    _charge: () => -30,
    _size: [1, 1],
    _fociLinks: null,
    _nodeLinks: null,
    _linkDistance: 20,
    _linkStrength: 0.1,
    _gravity: 0.1,
    _clusterSize: d => d,
    _cutEdges: [],

    _orientation: Math.PI / 2,
    _normalize: true,
    _padding: 0,

    linkDistance: linkDistance,
    linkStrength: linkStrength,
    timerange: function(timerange) {
      this._timerange = timerange;
      return this;
    },
    charge: charge,
    size: size,
    data: getData,
    clusterSize: clusterSize,
    sets: initSets,
    gravity: gravity,
    start: start,
    links: links,
    groups: deriveSets,
    comps: function() {return this._comps;},
    cutEdges: function() {return this._cutEdges;},
    reducedEdges: function() {return this._reducedEdges;},
    hierarchy: function() {return this._hierarchy;},

    connections: connections,
    hasConnections: hasConnections
  };
};

export default function() {
  return new d3Foci;
}
