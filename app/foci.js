import d3 from "d3";
import _ from "lodash";
import d3_force from "d3-force";
// import d3_hierarchy from "d3-hierarchy";

var maxDepth = 5;

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
  var level = 0;
  // var max = 10;
  while (q.length > 0 /* && level <= 50 */) {
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
    level += 1;
  }
  return current_group;
};

// function crop_graph(nodes, links) {
//
//   var reducedEdges = [];
//   var visited = {};
//   var v;
//
//   var vertices = nodes.map(d => d.index);
//   var edgeList = links.map(l => {
//     var edge = [l.source, l.target];
//     return edge;
//   });
//   // console.log("edgeList", edgeList);
//
//   var adjlist = convert_edgelist_to_adjlist(vertices, edgeList);
//   console.log("vertices", vertices, "edges", edgeList, "adjlist", adjlist);
//
//   var bfs = function(st, adjlist, visited) {
//     var q = [];
//     var u;
//     var current_group = [];
//     var i, len, adjV, nextVertex;
//     q.push(st);
//     visited[st] = true;
//     var level = 0;
//     var max = 10;
//     var reducedEdges = [];
//     var delVertices = [];
//     while (q.length > 0 && level <= max) {
//       u = q.shift();
//       current_group.push(u);
//       // Go through adjacency list of vertex v, and push any unvisited
//       // vertex onto the queue.
//       // This is more efficient than our earlier approach of going
//       // through an edge list.
//       adjV = adjlist[u];
//
//       if (level === max) {
//         reducedEdges.push(...adjV.map(v => {
//           return {source: u, target: v};
//         }));
//         delVertices.push(...adjV);
//       }
//
//       for (i = 0, len = adjV.length; i < len; i += 1) {
//         nextVertex = adjV[i];
//         if (!visited[nextVertex]) {
//           q.push(nextVertex);
//           visited[nextVertex] = true;
//         }
//       }
//       level += 1;
//     }
//     return reducedEdges;
//   };
//
//   for (v in adjlist) {
//     if (adjlist.hasOwnProperty(v) && !visited[v]) {
//       var edges = bfs(v, adjlist, visited);
//       reducedEdges.push(...edges);
//     }
//   }
//   return reducedEdges;
// }

// function biconnectedComponents(setData){
//   var fg = fullGraph(setData);
//
//   var nodes = fg.nodes;
//   var links = fg.edges;
//
//
//   var vertices = nodes.map(d => d.index);
//   var edgeList = _.flatten(links.filter(l => l.cut).map(l => {
//     var edge = [[l.source, l.target], [l.target, l.source]];
//     return edge;
//   }));
//
//   var adjList = convert_edgelist_to_adjlist(vertices, edgeList);
//   // console.log("vertices", vertices);
//   // console.log("edgelist", edgeList);
//   // console.log("adjList", adjList);
//
//   var n = Object.keys(adjList).length; // number vertices
//   // console.log("n", n);
//   var result = [];
//   // var m = 10; // number edges
//
//   var count = 0;
//   var stack = []; // stack edge
//   var visited = d3.range(0, n).map(() => false); // boolean
//   var low = []; // low points
//   var d = []; // ??
//   var parent = d3.range(0, n).map(() => -1);
//
//   for(var u=0; u < n - 1; u++){
//     if(!visited[u]){
//       dfsVisit(u);
//     }
//   }
//
//   return result.map(g => _.uniq(g));
//
//   function dfsVisit(u){
//     visited[u] = true;
//     d[u] = low[u] = count++;
//     // console.log("graph u", u, nodes[u]);
//     var vs = adjList[u];
//     // console.log("vs", vs);
//     vs.forEach(e =>{
//       // console.log("e", e);
//       var min = Math.min(u, e);
//       var max = Math.max(u, e);
//       var v = u === min ? max : min;
//
//       if(v==parent[u]){
//         return;
//       }
//       if(!visited[v]){
//         stack.push([u, e]);
//         parent[v] = u;
//         dfsVisit(v);
//         if (low[v] >= d[u]){
//           outputComp(u, v);
//         }
//         low[u] = Math.min(low[u], low[v]);
//       }else
//         if(d[v]<d[u]) {
//           stack.push([u, e]);
//           low[u] = Math.min(low[u], d[v]);
//         } else {
//               // dont push edge on stack when v has been visited
//               // and has distance more than that of u in the dfs tree
//       }
//     });
//   }
//
// function outputComp(u, v){
//     // console.log("New Biconnected Component Found");
//     var check = [u, v];
//     var comp = [];
//
//     while(stack.length > 0 && _.difference(check, e).length > 0) {
//       var e = stack.pop();
//       comp.push(e[0], e[1]);
//       // var diff = _.difference(check, e);
//       // console.log("check", check);
//       // console.log("e", e);
//     }
//     // console.log("stack", stack);
//     result.push(comp);
//   }
//   function fullGraph(setData) {
//     // if (!data) return this._sets;
//
//     // TODO: filter out before
//     var nodes = setData.filter(v => v.nodes.length > 0);
//
//     nodes.forEach((d, i) => {
//       d.level = 0;
//       d.index = i;
//     });
//
//     var fociLinks = [];
//     nodes.forEach(s => {
//       nodes.forEach(t => {
//         var interSet = _.intersection(s.sets, t.sets);
//         // var linkExist = fociLinks.findIndex(l => (
//         //   l.source === s.index && l.target === t.index || l.target === s.index && l.source === t.index)) === -1 ? false : true;
//
//         if (s.index !== t.index && interSet.length > 0)
//           fociLinks.push({
//             source: s.index,
//             target: t.index,
//             interSet: interSet
//           });
//       });
//     });
//
//     var linkedByIndex = {};
//     fociLinks.forEach(function(d) {
//       linkedByIndex[d.source + "," + d.target] = true;
//     });
//
//     return {nodes: nodes, edges: fociLinks};
//   }
// }
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
    // if (adjlist[v]) {
    //   adjlist[v].push(u);
    // } else {
    //   adjlist[v] = [u];
    // }
  }
  vertices.forEach(v => {
    if (!adjlist.hasOwnProperty(v)) adjlist[v] = [];
  });
  return adjlist;
};

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

  // var sortedGroups = _.sortBy(groups, g => g.values.length).reverse();

  // console.log("sortedGroups", sortedGroups);

  labelNodes.forEach(l => {
    var bool = false;
    groups.forEach(g => {
      if (l.interSet.indexOf(g.key) !== -1) {
        // l.text = g.id;
        // TODO: dirty hack, fix this
        // l.id = g.id + " label";
        // console.log("label with group!");
        g.values.push(l);
      }
      else bool = true;
      // else console.log("label without group!");
    });
    console.log("label group", bool);
  });

  // groups.forEach(d => {
  //   d.values = d.values.map(d => d.data);
  // });

  return groups;
}


function start() {

  // function hierarchy(cur, nodes, linkedByIndex) {
  //   cur.children = neighbors(cur, linkedByIndex, nodes);
  //
  //   if (cur.children.length !== 0) cur.shallow = false;
  //   else cur.shallow = true;
  //
  //   cur.value = cur.children.length;
  //   // console.log("cur", cur);
  //   // console.log("cur children", cur.children);
  //
  //   cur.children.forEach(next => {
  //     hierarchy(next, nodes, linkedByIndex);
  //   });
  // }
  //
  // function addShallow(cur) {
  //
  //   // console.log("cur", cur);
  //   // console.log("cur children", cur.children);
  //   cur.children.forEach(next => {
  //     addShallow(next);
  //   });
  //
  //   if (!cur.shallow) {
  //     var copyNode = _.cloneDeep(cur);
  //     copyNode.shallow = true;
  //     copyNode.children = [];
  //
  //     var labelNode = _.cloneDeep(cur);
  //     labelNode.shallow = false;
  //     labelNode.label = true;
  //     labelNode.children = [];
  //     labelNode.text = labelNode.__key__ + " labelNode";
  //     labelNode.__key__ = labelNode.__key__ + " labelNode";
  //     labelNode.id = labelNode.__key__ + " labelNode";
  //     // console.log("__key__", labelNode.__key__);
  //     labelNode.nodes = [{
  //       id: labelNode.__key__ + " labelNode",
  //       "__key__": labelNode.__key__ + " labelNode",
  //       "__setKey__": labelNode.__key__ + " labelNode",
  //       label: true,
  //       // shallow: true,
  //       children: [],
  //       sets: cur.sets
  //     }];
  //     // labelNode.nodes = [];
  //
  //     if (!cur.root) {
  //       cur.children.push(copyNode, labelNode);
  //     }
  //     cur.nodes = [];
  //   }
  // }

  function runForce(nodes, links, that) {
        // .on("tick", ticked);

    // console.log("force Nodes", nodes);
    var center = that._size.map(d => d/2);
    // center[0]-= 300;

    var simulation = d3_force.forceSimulation(nodes)
      .force("charge", d3_force.forceManyBody()
                         .strength(-20)
                         .distanceMin(20)
                         .distanceMax(200)
      )
      .force("link", d3_force.forceLink()
                             .distance(l => l.target.label ? 1 : 9)
                             .strength(l => {
                               var targetDeg = l.target.outLinks.length;
                               console.log("outLinks", targetDeg);
                               return l.level % maxDepth === 0 && targetDeg > 0 ? 0.00000000 : 1;
                             })
                             .iterations(4))
      // .force("position", d3_force.forcePosition());
      .force("collide", d3_force.forceCollide(d => d.label ? 0 : 7))
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

    // var uniqLabelNodes = _.uniq(labelNodes, d => d.id);

    labelNodes.forEach((d, i) => d.index = nodes.length + i);

    // console.log("LABELNODES", labelNodes);
    var labelLinks = labelNodes.map(n => {
      return {source: n.parent.index, target: n.index, cut: false};
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
    });

    // console.log("labelNodes", labelNodes, "labelLinks", labelLinks);
    // console.log("NODES", nodes);
    // links = links.filter(l => nodes[l.source].outLinks.length > 1);
    // console.log("LINX", links);


    // nodes.forEach(d => {
    //   if (d.label) {
    //     d.width = 40;
    //     d.height = 30;
    //   } else {
    //     d.width = 6;
    //     d.height = 10;
    //   }
    //
    // });

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    // .on("tick", ticked);
    simulation.stop();

    for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) /
      -simulation.alphaDecay()); i < n; ++i) {
      simulation.tick();
    }

    that._groups = deriveGroups(nodes);
    // that._groups = gs;

    // console.log("GS", gs);
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

  // function runTree(nodes, that) {
  //
  //   var links = that.links();
  //   var linkedByIndex = {};
  //
  //   // var center = that._size.map(d => d/2);
  //   console.log("size", that._size);
  //   var pack = d3_hierarchy.pack()
  //       .size(that._size)
  //       // .radius(d => d.data.label ? 10 : d.data.nodes.length * 5)
  //       .padding(0);
  //
  //   var root = {
  //     index:     nodes.length,
  //     level:     0,
  //     "__key__": "root",
  //     root:      true,
  //     sets:      [],
  //     nodes:     []
  //   };
  //
  //   nodes.forEach(d => {
  //     if (d.level === 1) {
  //       links.push({
  //         source: root.index,
  //         target: d.index
  //       });
  //     }
  //   });
  //
  //   nodes.push(root);
  //
  //   links.forEach(function(d) {
  //     linkedByIndex[d.source + "," + d.target] = true;
  //   });
  //
  //   var linkObjs = links.map(l => {
  //     l.source = nodes[l.source];
  //     l.target = nodes[l.target];
  //   });
  //
  //   hierarchy(root, nodes, linkedByIndex);
  //   addShallow(root);
  //
  //   var rootNode = d3_hierarchy.hierarchy(root);
  //
  //   // TODO: Bug ??
  //   rootNode.sum((d) => d.nodes.length > 1 ? d.nodes.length * 3: 30);
  //   rootNode.sort((a, b) => !b.data.label);
  //   pack(rootNode);
  //
  //   var packed = rootNode.descendants();
  //
  //   packed.forEach(d => {
  //     d = _.merge(d, d.data);
  //     d.data.center = {
  //       x: d.x,
  //       y: d.y,
  //       r: d.r
  //     };
  //   });
  //
  //   // console.log("PACKED", packed);
  //
  //   var packedNodes = packed.map(d => {
  //     return d.data;
  //   });
  //   var shallowNodes = packed.filter(d => {
  //     return d.data.shallow;
  //   });
  //
  //   var labelNodes = packed.filter(d => {
  //     return d.data.label;
  //   });
  //
  //   // shallowNodes.forEach((d, i) => {
  //   //   d.index = i;
  //   // });
  //
  //   // console.log("shallow nodes", shallowNodes);
  //   // console.log("LABEL NODES", labelNodes);
  //
  //   that._links = linkObjs;
  //   // TODO: buggy
  //   var gs = that.deriveGroups(packed);
  //   console.log("GROUPS", gs);
  //   // labelNodes.forEach(l => {
  //   //   gs.for
  //   // })
  //   that._groups = gs;
  //
  //   // console.log("shallow", packed.filter(d => d.shallow));
  //
  //   return packed.map(d => d.data);
  // }

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

  var {nodes, edges} = prepareGraph(this, setData);

  var linkedByIndex = {};
  edges.forEach(function(l) {
    linkedByIndex[l.source + "," + l.target] = l;
  });
  // var bicomps = _.sortBy(biconnectedComponents(setData), d => d.length)
  //   .reverse();
  //
  // var bicut_edges = _.flatten(bicomps.map(c => {
  //   return c.filter(u => {
  //     var targets = bicomps.filter(c => c.find(v => v === u));
  //     // return n.length > 1;
  //     return targets.map(t => {
  //       return {source: u, target: t, cut: true};
  //     });
  //   });
  // }).filter(s => s > 0));
  //
  // console.log("bicut edges", bicut_edges);
  // console.log("bicomps", bicomps);
  // console.log("cut_vertices", bicut_vertices);

  // console.log("reducedEdges", reducedEdges, "del len", reducedEdges.length, "edges", edges.length);

  // TODO: check later
  // var crop_edges = crop_graph(nodes, edges);
  // crop_edges.push(...bicut_edges);

  // var cut_vertices = _.flatten(crop_edges.map(e => [e.source, e.target]));


  // nodes.forEach((d, i) => {
  //   if (cut_vertices.indexOf(i) !== -1) d.cut = true;
  // });

  // console.log("crop_edges", crop_edges);
  // crop_edges.forEach(ce => {
  //   edges.forEach(e => {
  //     if ((ce.source === e.source && ce.target === e.target) || (ce.source === e.target && ce.target === e.source) ) {
  //       console.log("cut FOUND", e, ce);
  //       e.cut = true;
  //     }
  //     // else e.cut = false;
  //   });
  // });
  // console.log("cut EDGES", edges.filter(e => e.cut));

  this._reducedEdges = edges.filter(l => {
    // var targetDeg = outLinks(l.target, nodes, linkedByIndex).length;
    return l.level % maxDepth !== 0;// || targetDeg === 0;
  });
  // console.log("Biconnected COmps", bicomps);
  var simple_gr = simple_comp(nodes, this._reducedEdges);

  var comps = simple_gr.map((g, i) => {
    var nodes = _.flatten(g.map(d => d.nodes));
    var tags = d3.nest()
      .key(d => d)
      // TODO: check it later
      .entries(_.flatten(nodes.filter(d => d).map(d => d.tags)))
    .sort((a, b) => d3.descending(a.values.length, b.values.length));

    return {
      id: i + "comp", values: g,
      tags: tags,
      // TODO: check later
      nodes: nodes.filter(d => d)
      // nodes: g
    };
  });

  this._sets = nodes;
  // this._bicomps = bicomps.map(g => g.map(i => setData[i]));
  this._cutEdges = edges.filter(l => {
    return l.level % maxDepth === 0; // && targetDeg > 0;
  });
  this._fociLinks = edges;
    // .filter(e => cut_vertices.indexOf(e.target) === -1);
    // .concat(this._cutEdges);
  this._comps = comps;
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
          strength: _.union(s.sets, t.sets).length / s.sets.length
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
                level: level
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
                level: level
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

  // // console.log("adjList", adjList);
  //
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


// function neighbors(a, linkedByIndex, nodes) {
//   var nb;
//   var nbs = [];
//
//   // console.log("a", a);
//   for (var property in linkedByIndex) {
//     var s = property.split(",").map(d => parseInt(d));
//     if (s[0] === a.index) {
//       // console.log("s[1]", s[1]);
//       nb = nodes[s[1]];
//       // console.log("nb", nb);
//       nbs.push(nb);
//     }
//     // else {
//     //   if (s[1] === a.index) {
//     //     console.log("s[0]", s[0]);
//     //     nb = nodes[s[0]];
//     //     console.log("nb", nb);
//     //     nbs.push(nb);
//     //   }
//     // }
//   }
//   return nbs;
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
    groups: deriveGroups,
    comps: function() {return this._comps;},
    cutEdges: function() {return this._cutEdges;},
    reducedEdges: function() {return this._reducedEdges;},

    connections: connections,
    hasConnections: hasConnections
  };
};

export
default

function() {
  return new d3Foci;
}
