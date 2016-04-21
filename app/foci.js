import d3 from "d3";
import _ from "lodash";

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
    console.log("New Biconnected Component Found");
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

function startForce() {

  var force = d3.layout.force()
                .charge(d => this._charge(d))// * d.size)
                .size(this.size())
                .gravity(this._gravity)
                .linkStrength(this._linkStrength)
                .linkDistance(d => this._linkDistance(d));

  // var pack = d3.layout.pack()
  //     .value(function(d) {
  //       return d.nbs.length > 0 ? d.nbs.length : 1;
  //     })
  //     // .radius(d => {
  //     //   return d.nodes ? d.nodes.length * 10 : 30;
  //     // })
  //     .padding(10)
  //     .children(d => d.nbs)
  //     .size(this.size());

  var nodes = this.sets();
  var links = this.links();

  // var root = {__key__: "all", nbs: values};
  // var packed = pack(root);
  // packed.forEach(d => {
  //   d.center = {x: d.x, y: d.y - d.r};
  // });
  // console.log("root", packed);

  // var totalSize = values.reduce((a, b) => a.size + b.size);
  // console.log("SETS", this.sets());
  // console.log("fociLinks", this._fociLinks.map(d => d.source.__key__ + " - " + d.target.__key__));



  // var packedNodes = packed.filter(d => d.nodes);

  // packedNodes.forEach(d => {
  //   d.x = null;
  //   d.y = null;
  //   d.px = null;
  //   d.py = null;
  // });
  // var links = pack.links(packedNodes);

  // force.nodes(packedNodes);
  console.log("links", links);
  force.nodes(nodes);
  force.links(links);

  // run the simulation n times
  var n = 300;
  force.start();
  for (var i = n * n; i > 0; --i) force.tick();
  force.stop();

  nodes.forEach(function(d) {
    // console.log("d", d);
    d.center = {
      x: d.x,
      y: d.y
      // x : (d.x + d.dx / 2),
      // y : (d.y + d.dy / 2)
      // z: null
    };

    // TODO: check
    d.nodes.forEach((e, i)=> {
      e.center = Object.assign({}, d.center);
      e.center.px = e.center.x + (i * 10);
      e.center.py = e.center.y + (i * 10);
      // e.center.z = i;
      // e.dx = d.dx;
      // e.dy = d.dy;
    });
  });

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
  if (!data) return this._sets;

  var copyData = _.cloneDeep(data);

  // var oldSets = null; //this._sets, //foci.sets() ,

  var sets = d3.map({}, function(d) {
      return d.__key__;
    });

  var fociLinks = [],
    individualSets = d3.map(),
    set,
    key,
    i,
    n = copyData.length;

  // function getKey(set, selected) {
  //   // filter the items from the invalid list, out of the complete list
  //   var tags = set.filter(d => selected.indexOf(d) !== -1);
  //   // console.log("set", set);
  //   // console.log("tags", tags);
  //   return tags;
  //
  // }

  // TODO: rename __key__
  for (i = -1; ++i < n;) {
    // TODO: change it later, too specific
    set = copyData[i].tags;
    key = set.sort().join(","); //so taht we have the same key as in https://github.com/benfred/foci.js
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

  // TODO: clean up everything
  var nodes = sets.values().filter(v => v.nodes.length > 0);

  nodes.forEach((d, i) => d.index = i);

  nodes.forEach(s => {
    nodes.forEach(t => {
    var intersect = _.intersection(s.sets, t.sets);
    var linkExist = fociLinks.findIndex(l => l.source === s.index && l.target === t.index || l.target === s.index && l.source === t.index);

    if (s.index !== t.index && intersect.length > 0 && linkExist === -1)
      fociLinks.push({
        source: s.index,
        target: t.index,
        intersec: intersect
      });
    });
  });

  console.log("foci nodes", nodes);
  console.log("fociLinks", fociLinks);
  console.log("fociLinks length", fociLinks.length);

  // console.log("focilinks", fociLinks);
  // // reset the size for each set.
  // sets.forEach((k, v) => {
  //   v.size = this._clusterSize(v.size);
  //   if ((n = v.sets.length) && n != 1) {
  //     for (i = -1; ++i < n;) {
  //       var target = sets.get(k);
  //       var source = sets.get(v.sets[i]);
  //       var intersec = _.intersection(target.sets, source.sets);
  //       fociLinks.push({
  //       source: source,
  //       target: target,
  //         intersec: intersec
  //       });
  //     }
  //   }
  //
  //   if (oldSets && (set = oldSets.get(k))) {
  //     v.center = set.center;
  //     v.x = set.x;
  //     v.y = set.y;
  //   }
  // });

  var linkedByIndex = {};
  fociLinks.forEach(function(d) {
    linkedByIndex[d.source + "," + d.target] = true;
  });

  console.log("linkedByIndex", linkedByIndex);

  this._linkedByIndex = linkedByIndex;

  var edgeList = fociLinks.map(l => [l.source, l.target]);
  // console.log("edgeList", edgeList);

  var sortedNodes = _.sortBy(nodes, d => {
    // console.log("d.index", d.index);
    // var conn = connectionsIndex(d.index, linkedByIndex, nodes);
    // return conn * d.nodes.length;

    return d.sets.length;
  }).reverse();

  var sv = sortedNodes.map(n => n.index);
  console.log("sortedNodes", sortedNodes);

  console.log("sv", sv);
  // var sv = [];
  // var seen = [];
  function induceNbs(cur) {

    // console.log("cur", cur);
    var nbs = neighbors(cur.index, linkedByIndex, sv);
    // console.log("nbs", neighbors);
    // seen.push(cur.index);

    sv = _.difference(sv, nbs);
    // console.log("sv", sv);

    // TODO: not correct
    var sorted = _.sortBy(nbs.map(i => nodes[i]), d => {
      var conn = connectionsIndex(d.index, linkedByIndex, sv.map(i => nodes[i]));
      return 100 * conn / d.sets.length;
    });
    // console.log("sorted", sorted);

    cur.nbs = sorted;

    cur.nbs.forEach(next => {
      // if(seen.indexOf(next) === -1)
        induceNbs(next);
    });
  }
  //
  // sv = sortedNodes.map(d => d.index);
  // console.log("sv", sv);
  //
  // var simpleComps = [];
  // var hierarchy = [];

// old_undirected graph G
//  new_directed graph D
//  dequeue Q
//  v is any node in G
//  add v to D
//  Q.push_back(v)
//  while(Q is not empty):
//      v = Q.pop_front()
//      for all neighbors u to v:
//          if u in D
//               add edge u->v to D
//          else
//               add u to D and add edge v->u to D
//               Q.push_back(u)
//
//  return D

function remove_cycle(totalOrder) {
  var D = {nodes: [], edges: []}; // new_directed graph D
  var Q = [];
  var u0 = totalOrder[totalOrder.length - 1];
  var tags = [];
  Q.push(u0);
  while (Q.length !== 0) {

    var u = Q.pop(); // pop front

    console.log("u", nodes[u]);
    console.log("seen", tags);
    console.log("sets", nodes[u].sets);
    console.log("diff", _.difference(nodes[u].sets, tags));
    var vs = nbsForward(u, linkedByIndex, nodes, tags);

    var sorted = _.sortBy(vs.map(i => nodes[i]), d => {
      return d.sets.length;

      // var conn = connectionsIndex(d.index, linkedByIndex, sv.map(i => nodes[i]));
      // return 100 * conn / d.sets.length;
    }).map(d => d.index).reverse();

    console.log("vs", sorted.map(u => nodes[u].__key__));

    // console.log("sorted", sorted.map(i => nodes[i]));

    sorted.forEach(v => {
      if (D.nodes.indexOf(v) !== -1) {
        var filterOut = D.edges.filter(l => l.target === v);
        // console.log("filterOut", filterOut);
        D.edges = _.difference(D.edges, filterOut);

        D.edges.push({source: u, target: v});
      }
      else {
        D.nodes.push(v);
        D.edges.push({source: u, target: v});
        Q.push(v);

        Q = _.uniq(Q);
        Q = _.sortBy(Q.map(i => nodes[i]), d => {
          return d.sets.length;
        }).map(d => d.index).reverse();
      }
    });
    tags = tags.concat(nodes[u].sets);
  }
  return D;
}

var D = remove_cycle(sv);

console.log("D", D);


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

  this._sets = nodes;
  this._fociLinks = D.edges;

  return this;
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


function hasConnections(a) {
  var connections = 0;
  for (var property in this._linkedByIndex) {
    var s = property.split(",");
    if ((s[0] == a.index || s[1] == a.index) && this._linkedByIndex[property])
      connections++;
  }
  return connections;
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
    }
    else {
      if (s[1] === a && nodes[s[0]]) {
        nb = nodes[s[0]];
        // console.log("nb", nb);
        connections+= nb.nodes.length;
      }

    }

  }
  return connections;
}



function nbsForward(a, linkedByIndex, nodes, seen) {
  var nbs = [];
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    var source = nodes[s[0]];
    var target = nodes[s[1]];
    var diff, interset;

    if (s[0] === a ) {
      diff = _.difference(source.sets, seen);
      interset = _.intersection(diff, target.sets);
      if(interset.length > 0)
        nbs.push(s[1]);
    }
    else {
      if (s[1] === a) {
        diff = _.difference(target.sets, seen);
        interset = _.intersection(diff, source.sets);
        if(interset.length > 0)
        nbs.push(s[0]);
      }
    }
  }
  return _.uniq(nbs);
}

function neighbors(a, linkedByIndex, nodes) {
  var nbs = [];
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    if (s[0] === a && nodes.indexOf(s[1]) !== -1) {
      nbs.push(s[1]);
    }
    else {
      if (s[1] === a && nodes.indexOf(s[0]) !== -1) {
        nbs.push(s[0]);
      }
    }
  }
  return _.uniq(nbs);
}

const d3Foci = function(){
  return {
    _sets:         null,
    _data:         null,
    _charge:       () => -30,
    _size:         [1, 1],
    _fociLinks:    null,
    _nodeLinks:    null,
    _linkDistance: 20,
    _linkStrength: 0.1,
    _gravity:      0.1,
    _clusterSize:  d => d,

    _orientation:  Math.PI / 2,
    _normalize:    true,
    _padding:      0,

    linkDistance:  linkDistance,
    linkStrength:  linkStrength,
    charge:        charge,
    size:          size,
    data:          getData,
    clusterSize:   clusterSize,
    sets:          extractSets,
    gravity:       gravity,
    startForce:    startForce,
    links     :    links,

    hasConnections: hasConnections
  };
};

export default function() {
  return new d3Foci;
}
