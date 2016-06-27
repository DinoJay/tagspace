// import d3 from "d3";
import * as d3 from "d3";
import _ from "lodash";
import * as d3_force from "d3-force";
console.log("d3_force", d3_force);

var maxDepth = 1;
var bigger = true;

var isCutEdge = (l, nodes, linkedByIndex) => {
  var tgt = nodes[l.target];
  var targetDeg = outLinks(tgt, nodes, linkedByIndex).length;
  return l.level % maxDepth === 0 && targetDeg > 0;
};

function runTree(nodes, links) {

  function hierarchy(cur, nodes, linkedByIndex) {
    cur._children = neighbors(cur, linkedByIndex, nodes);
    cur.value = cur._children.length;
    cur.children = [];
    // console.log("cur", cur);
    // console.log("cur children", cur.children);

    cur._children.forEach(next => {
      // if(seen.indexOf(next) === -1)
      hierarchy(next, nodes, linkedByIndex);
    });
  }

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
    }
    return nbs;
  }
  var linkedByIndex = {};


  var root = {
    index:     nodes.length,
    level:     0,
    "__key__": "root",
    sets     : [],
    // children: nodes.filter(d => d.level === 0),
    nodes: []
  };

  nodes.forEach(d => {
    // if (d.level === 1) {
      links.push({
        source: root.index,
        target: d.index
      });
    // }
  });

  nodes.push(root);

  links.forEach(function(d) {
    linkedByIndex[d.source + "," + d.target] = true;
  });

  // var linkObjs = links.map(l => {
  //   l.source = nodes[l.source];
  //   l.target = nodes[l.target];
  // });

  hierarchy(root, nodes, linkedByIndex);
  // var rootNode = d3_hierarchy.hierarchy(root);
  // rootNode
  //   .sum((d) => d.nodes.length);
  //
  // rootNode.sort((a, b) => a.data.nodes.length - b.data.nodes.length);

  // pack(rootNode);
  // var packed = rootNode.descendants();
  // packed.forEach(p => {
  //   p.data.tags = _.uniq(_.flatten(p.data.children.map(c => c.sets)));
  // });
  //
  // // packed.forEach(d => {
  // //   // console.log("pack d", d.x, d.y);
  // //   d.data.center = {
  // //     x: _.clone(d.x),
  // //     y: _.clone(d.y)
  // //   };
  // // });
  // //
  // console.log("packed", packed.map(d => d.data).filter(d => d.children.length > 0));

  return {root: root, linkedByIndex, nodes: nodes};//packed.map(d => d.data);
}

var collide = function(nodes) {
  return function(alpha) {
    var quadtree = d3.quadtree()
                     .x(d => d.x)
                     .y(d => d.y)
                     .addAll(nodes);

      for (var i = 0, n = nodes.length; i < n; ++i) {
        var d = nodes[i];
        // TODO: adopt to size of diigo
        d.r = bigger ? 50 * 1.7 : 50;
        var nx1 = d.x - d.r,
          nx2 = d.x + d.r,
          ny1 = d.y - d.r,
          ny2 = d.y + d.r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.data && (quad.data !== d)
            && quad.data.comp !== d.comp && !d.label && !quad.data.label) {
            var x = d.x - quad.data.x,
                y = d.y - quad.data.y,
                l = Math.sqrt(x * x + y * y),
                r = d.r + quad.data.r;

            if (l < r) {
              l = (l - r) / l * alpha;
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
    var edge = [l.source.index, l.target.index]; return edge;
  });
  // console.log("edgeList", edgeList);

  var adjlist = convert_edgelist_to_adjlist(vertices, edgeList);

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
  var labelNodes = nodes.filter(d => d.label);

  var spread_data = _.flatten(realNodes.map(n => {
    var clones = n.tags.map(t => {
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

  labelNodes.forEach(l => {
    groups.forEach(g => {
      if (l.interSet.indexOf(g.key) !== -1) {
        // l.text = g.id;
        // TODO: dirty hack, fix this
        // l.id = g.id + " label";
        // console.log("label with group!");
        g.values.push(l);
      }
      // else console.log("label without group!");
    });
  });

  // groups.forEach(d => {
  //   d.values = d.values.map(d => d.data);
  // });

  return groups;
}


function start() {

  function runForce(nodes, links, that) {
        // .on("tick", ticked);
    // console.log("CLOned LINX", _.cloneDeep(links));

    // console.log("force Nodes", nodes);
    var center = that._size.map(d => d/2);

    var linkedByIndex = {};
    links.forEach(function(l) {
      linkedByIndex[l.source + "," + l.target] = l;
    });

    var labelNodes = _.flatten(nodes.filter(n => isParent(n, linkedByIndex))
        .map(n => {
          var links = outLinks(n, nodes, linkedByIndex);
          var interSet = links[0].interSet;
          // return interSet.map(s => {
            return {
              id: n.__key__ + "label ", //+ s,
              // index: nodes.length + index,
              label: true,
              text: interSet.join(", "), //s,
              interSet: interSet,
              tags: interSet,
              parent: n
            };
            // index += 1;
          // });
        }));


    labelNodes.forEach((d, i) => d.index = nodes.length + i);

    // console.log("LABELNODES", labelNodes);
    var labelLinks = labelNodes.map(n => {
      return {
        source: n.parent.index,
        target: n.index,
        cut: false,
        strength: 1
      };
    });

    nodes.push(...labelNodes);
    links.push(...labelLinks);

    linkedByIndex = {};
    links.forEach(function(l) {
      linkedByIndex[l.source + "," + l.target] = l;
    });

    nodes.forEach(n => {
      n.parent = getParent(n, linkedByIndex, nodes);
      n.outLinks = outLinks(n, nodes, linkedByIndex);
      n.inLinks = inLinks(n, nodes, linkedByIndex);
    });

    links.forEach(l => {
      if (isCutEdge(l, nodes, linkedByIndex))
        l.cut = true;
      else l.cut = false;
    });

    var simulation = d3_force.forceSimulation(nodes)
      .force("charge", d3_force.forceManyBody()
                          // scale: 40, 40 * 3,
                         .strength(bigger ? - 40 * 5 : 40)
                         // .distanceMin(9)
                         .distanceMax(300)
      )
      // TODO: encapsulate in function
      .force("link", d3_force.forceLink()
               .distance(l => l.target.label ? 1 : l.cut ? 100 : bigger ? 10 * 5 : 9)
               .strength(l => {
                 var def = 1 / Math.min(l.source.outLinks.length, l.target.outLinks.length);
                 return l.cut ? def : 1;
               })
               .iterations(4))
      // .force("position", d3_force.forcePosition());
      .force("collide", d3_force.forceCollide(d => d.label ? 0 : 7))
      // .force("specialCollide", (alpha) => {
      //   var quadtree = d3.geom.quadtree(nodes);
      //   collide2(alpha, nodes, quadtree);
      // })
      .force("intraCollide", collide(nodes))
      .force("center", d3_force.forceCenter(...center));

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.stop();


    // that._groups = deriveSets(comps);

    // TODO: dirty hack
    that._sets = nodes;

    that._reducedEdges = links.filter(l => !l.cut);
    that._cutEdges = links.filter(l => l.cut);

    // console.log("nODes", nodes);
    // console.log("cutEdges", that._cutEdges);

    var comps = simple_comp(nodes, that._reducedEdges).map((g, i) => {
      var id = i + "comp";
      var compNodes = _.flatten(g.map(d => d.nodes)).filter(d => d);
      // console.log("compNodes", compNodes);
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

      return {
        id: id,
        values: g,
        tags: tags,
        // TODO: check later
        nodes: compNodes,
        sets: deriveSets(compNodes)
        // nodes: g
      };
    });

    console.log("filter", nodes.filter(n => n.comp));
    for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) /
      -simulation.alphaDecay()); i < n; ++i) {
      simulation.tick();
    }
    console.log("LINX", links.map(l => l.strength));

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
          // console.log("d", d);
          d.vx = 0;
          d.vy = 0;
          d.x = 0;
          d.y = 0;
      }
    });

    return nodes;
  }
  var nodes = this.sets();
  var clonedNodes = _.cloneDeep(this.sets());
  var links = this.links();
  var clonedLinks = _.cloneDeep(links);

  this.data(runForce(nodes, links, this));
  this._hierarchy = runTree(clonedNodes, clonedLinks);

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

function initSets(data) {
  if (!data) return this._sets;

  var sets = extractSets(data);
  var setData = sets.values();

  var {nodes, edges} = prepareGraph(this, setData);
  // console.log("EDGES", edges);

  this._sets = nodes;
  var linkedByIndex = {};
  edges.forEach(function(l) {
    linkedByIndex[l.source + "," + l.target] = l;
  });

  this._reducedEdges = edges.filter(l => {
    // return l.level % maxDepth !== 0;// || targetDeg === 0;
    return !isCutEdge(l, nodes, linkedByIndex);
  });
  // console.log("Biconnected COmps", bicomps);

  // this._bicomps = bicomps.map(g => g.map(i => setData[i]));
  this._cutEdges = edges.filter(l => {
    return l.level % maxDepth === 0; // && targetDeg > 0;

  });
  this._fociLinks = edges;
    // .filter(e => cut_vertices.indexOf(e.target) === -1);
    // .concat(this._cutEdges);
    // .filter(e => crop_edges.find(c => c.source === e.source && c.target === e.target) ? false : true);
  // this._allLinks = edges;

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
    linkedByIndex[d.source + "," + d.target] = true;
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
            return 100 * conn / d.sets.length;
          }).map(d => d.index).reverse();

          // console.log("vs", sorted.map(u => nodes[u].__key__));

          // console.log("sorted", sorted.map(i => nodes[i]));

          sorted.forEach(v => {
            if (G.vertices.indexOf(v) !== -1) {
              var filterOut = G.edges.filter(l => l.target === v);
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

export
default

function() {
  return new d3Foci;
}
