import d3 from "d3";
import _ from "lodash";
import d3_force from "d3-force";
import d3_hierarchy from "d3-hierarchy";

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


function deriveGroups(nodes) {
  if (!nodes) return this._groups;

  var realNodes = nodes.filter(d => !d.label);
  var labelNodes = nodes.filter(d => d.label);

  var spread_data = _.flatten(realNodes.map(n => {
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

  var sortedGroups = _.sortBy(groups, g => g.values.length).reverse();

  console.log("sortedGroups", sortedGroups);

  sortedGroups.forEach(g => {
    labelNodes.forEach(l => {
      // var sameParent = g.values.find(v => {
      //   return v.parent && v.parent.__key__ === l.parent.__key__;
      // });
      if (l.interSet.indexOf(g.key) !== -1) {
        // l.text = g.id;
        g.values.push(l);
      }
    // d.values = d.values.map(d => d.data);
    });
  });

  // groups.forEach(d => {
  //   d.values = d.values.map(d => d.data);
  // });

  this._groups = groups;

  return groups;
}


function start() {

  function hierarchy(cur, nodes, linkedByIndex) {
    cur.children = neighbors(cur, linkedByIndex, nodes);

    if (cur.children.length !== 0) cur.shallow = false;
    else cur.shallow = true;

    cur.value = cur.children.length;
    // console.log("cur", cur);
    // console.log("cur children", cur.children);

    cur.children.forEach(next => {
      hierarchy(next, nodes, linkedByIndex);
    });
  }

  function addShallow(cur) {

    // console.log("cur", cur);
    // console.log("cur children", cur.children);
    cur.children.forEach(next => {
      addShallow(next);
    });

    if (!cur.shallow) {
      var copyNode = _.cloneDeep(cur);
      copyNode.shallow = true;
      copyNode.children = [];

      var labelNode = _.cloneDeep(cur);
      labelNode.shallow = false;
      labelNode.label = true;
      labelNode.children = [];
      labelNode.text = labelNode.__key__ + " labelNode";
      labelNode.__key__ = labelNode.__key__ + " labelNode";
      labelNode.id = labelNode.__key__ + " labelNode";
      // console.log("__key__", labelNode.__key__);
      labelNode.nodes = [{
        id: labelNode.__key__ + " labelNode",
        "__key__": labelNode.__key__ + " labelNode",
        "__setKey__": labelNode.__key__ + " labelNode",
        label: true,
        // shallow: true,
        children: [],
        sets: cur.sets
      }];
      // labelNode.nodes = [];

      if (!cur.root) {
        cur.children.push(copyNode, labelNode);
      }
      cur.nodes = [];
    }
  }

  function runForce(nodes, links, that) {
        // .on("tick", ticked);

    console.log("force Nodes", nodes);
    var center = that._size.map(d => d/2);
    // center[0]-= 300;

    var simulation = d3_force.forceSimulation(nodes)
      .force("charge", d3_force.forceManyBody()
                         .strength(d => d.label ? -10 : d.nodes.length * -30)
                         .distanceMin(30)
      )
      .force("link", d3_force.forceLink()
                             .distance(l => l.target.label ? 10 : 35)
                             .strength(1)
                             .iterations(1))
      // .force("position", d3_force.forcePosition());
      .force("center", d3_force.forceCenter(...center));



    // var force = d3.layout.force()
    //   .charge(d => that._charge(d)) // * d.size)
    //   .size(that.size())
    //   .gravity(that._gravity)
    //   .linkStrength(that._linkStrength)
    //   .linkDistance(d => that._linkDistance(d));


    var linkedByIndex = {};
    links.forEach(function(l) {
      linkedByIndex[l.source + "," + l.target] = l;
    });

    var labelNodes = nodes.filter(n => isParent(n, linkedByIndex))
        .map((n, i)=> {
          var links = outLinks(n, nodes, linkedByIndex);
          var interSet = links[0].interSet;
          return {
            id: n.__key__ + "label",
            index: nodes.length + i,
            label: true,
            text: interSet.join(","),
            interSet: interSet,
            parent: n
          };
        });
    var labelLinks = labelNodes.map(n => {
      return {source: n.parent.index, target: n.index};
    });

    nodes.push(...labelNodes);
    links.push(...labelLinks);

    linkedByIndex = {};
    links.forEach(function(l) {
      linkedByIndex[l.source + "," + l.target] = l;
    });
    nodes.forEach(n => n.parent = getParent(n, linkedByIndex, nodes));

    console.log("labelNodes", labelNodes, "labelLinks", labelLinks);

    nodes.forEach(d => {
      if (d.label) {
        d.width = 40;
        d.height = 30;
      } else {
        d.width = 11;
        d.height = 20;
      }

    });
    // var colaForce = cola.d3adaptor()
    //   // .flowLayout("y", 12)
    //   .handleDisconnected(true)
    //   .avoidOverlaps(true)
    //   .size(that.size());
    //   // .jaccardLinkLengths(40, 0.7);
    //
    // colaForce
    //   .nodes(nodes)
    //   .links(links)
    //   .linkDistance(l => {
    //     return l.source.nodes ? l.source.nodes.length * 10 : 20;
    //     // return 40;
    //   });
      // .groups(gs);
      //

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    // .on("tick", ticked);
    simulation.stop();

    for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) /
      -simulation.alphaDecay()); i < n; ++i) {
      simulation.tick();
    }

    var gs = that.groups(nodes);
    // that._groups = gs;

    console.log("GS", gs);
    // console.log("Nodes after force", nodes.filter(d => d.label));

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
          // e.bounds = Object.assign({}, d.bounds);
          // e.center.px = e.center.x + (i * 10);
          // e.center.py = e.center.y + (i * 10);
          // // e.center.z = i;
          // e.dx = d.dx;
          // e.dy = d.dy;
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



  // var diagonal = d3.svg.diagonal.radial()
  //     .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

  function runTree(nodes, that) {

    var links = that.links();
    var linkedByIndex = {};

    // var center = that._size.map(d => d/2);
    console.log("size", that._size);
    var pack = d3_hierarchy.pack()
        .size(that._size)
        // .radius(d => d.data.label ? 10 : d.data.nodes.length * 5)
        .padding(0);

    var root = {
      index:     nodes.length,
      level:     0,
      "__key__": "root",
      root:      true,
      sets:      [],
      nodes:     []
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

    links.forEach(function(d) {
      linkedByIndex[d.source + "," + d.target] = true;
    });

    var linkObjs = links.map(l => {
      l.source = nodes[l.source];
      l.target = nodes[l.target];
    });

    hierarchy(root, nodes, linkedByIndex);
    addShallow(root);

    var rootNode = d3_hierarchy.hierarchy(root);

    // TODO: Bug ??
    rootNode.sum((d) => d.nodes.length > 1 ? d.nodes.length * 3: 30);
    rootNode.sort((a, b) => !b.data.label);
    pack(rootNode);

    var packed = rootNode.descendants();

    packed.forEach(d => {
      d = _.merge(d, d.data);
      d.data.center = {
        x: d.x,
        y: d.y,
        r: d.r
      };
    });

    // console.log("PACKED", packed);

    var packedNodes = packed.map(d => {
      return d.data;
    });
    var shallowNodes = packed.filter(d => {
      return d.data.shallow;
    });

    var labelNodes = packed.filter(d => {
      return d.data.label;
    });

    // shallowNodes.forEach((d, i) => {
    //   d.index = i;
    // });

    // console.log("shallow nodes", shallowNodes);
    // console.log("LABEL NODES", labelNodes);

    that._links = linkObjs;
    // TODO: buggy
    var gs = that.deriveGroups(packed);
    console.log("GROUPS", gs);
    // labelNodes.forEach(l => {
    //   gs.for
    // })
    that._groups = gs;

    // console.log("shallow", packed.filter(d => d.shallow));

    return packed.map(d => d.data);
  }

  var nodes = this.sets();
  var links = this.links();

  this.data(runForce(nodes, links, this));

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

  var G = prepareGraph(this, setData);

  // G.nodes.filter(n => {
  //   console.log("N", n);
  // })
  // check
  this._sets = G.nodes;

  this._fociLinks = G.edges;

  return this;
}

function prepareGraph(that, setData) {
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
      // var linkExist = fociLinks.findIndex(l => (
      //   l.source === s.index && l.target === t.index || l.target === s.index && l.source === t.index)) === -1 ? false : true;

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

  // TODO
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
            // return d.sets.length;
            // return d.nodes.length;
            var conn = connectionsIndex(d.index, linkedByIndex,
              sv.map(i => nodes[i]));
            console.log("conn", conn);
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
                interSet: _.intersection(nodes[u].sets, nodes[v].sets)
              });
            } else {
              G.vertices.push(v);
              var node = nodes[v];
              node.level = level;
              G.nodes.push(node);

              G.edges.push({
                source: u,
                target: v,
                interSet: _.intersection(nodes[u].sets, nodes[v].sets)
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

function outLinks(a, nodes, linkedByIndex) {
  var links = [];
  for (var property in linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index) && linkedByIndex[property])
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
    groups: deriveGroups,

    connections: connections,
    hasConnections: hasConnections
  };
};

export
default

function() {
  return new d3Foci;
}
