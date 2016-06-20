import d3 from "d3";
import d3_hierarchy from "d3";
import _ from "lodash";

var line = d3.svg.line()
  .interpolate("basis")
  .x(d => d.y)
  .y(d => d.x);

var stepLine = d3.svg.line().interpolate("step-before")
        .x(d => d.x)
        .y(d => d.y);
// function neighbors(a, linkedByIndex, nodes) {
//   var nb;
//   var nbs = [];
//
//   // console.log("a", a);
//   for (var property in linkedByIndex) {
//     var s = property.split(",").map(d => parseInt(d));
//     if (s[0] === a.index) {
//       nb = nodes[s[1]];
//       // console.log("nb", nb);
//       nbs.push(nb);
//     }
//   }
//   return nbs;
// }

// function hierarchy(cur, nodes, linkedByIndex) {
//   cur._children = neighbors(cur, linkedByIndex, nodes);
//   cur.value = cur._children.length;
//   cur.children = [];
//   console.log("cur", cur, "children", cur._children);
//   // console.log("cur", cur);
//   // console.log("cur children", cur.children);
//
//   cur._children.forEach(next => {
//     // if(seen.indexOf(next) === -1)
//     hierarchy(next, nodes, linkedByIndex);
//   });
// }


function nbs_map(d, nodeMap) {
  return d.relatedTags.reduce((acc, t) => {
    var nb = nodeMap.get(t);
    var pathTest =  _.intersection(nb.path, nb.relatedTags).length === nb.path.length;
    if (pathTest) acc.push(nb);
    return acc;
  }, []);
  // var nbs = nodes.filter(n => n.relatedTags.some(t => nodes.some(n0 => n0.relatedTags.indexOf(t) !== -1)));
  // console.log("nbs", nbs);
  // return nbs;
}

function traverse(cur, key, nodes) {
  if (cur.children) {
    if (key !== cur.key)
      cur.children = cur.children.filter(c => nodes.indexOf(c.key) === -1);
    cur.children.forEach(next => {
      traverse(next, key, nodes);
    });
  }
}

var findByDepth = function(start, depth) {
  var q = [],
    cur;

  q.push(start);
  while (q.length > 0) {
    cur = q.pop();
    if (cur.depth === depth) return cur;
    if (cur.children) q.push(...cur.children);
  }
};

// function findByDepth(cur, depth) {
//   if (cur.depth === depth){
//     return cur;
//   }
//   else {
//     if (cur.children) {
//       return cur.children.filter(next => {
//         return findByDepth(next, depth);
//       });
//     }
//     return null;
//   }
// }


function yield0(cur, nodes) {
  if (cur.children) {
    nodes.push(...cur.children);
    cur.children.forEach(next => {
      yield0(next, nodes);
    });
    return nodes;
  }
}

function reinsert(cur, key, children, nodeMap) {
  if (cur.depth === 0)  {
    console.log("shortcut");
    cur.children.push(...children);
    return;
  }
  var nbs = nbs_map(cur, nodeMap);
  var selected = nbs.filter(c => children.map(c => c.key).indexOf(c.key) !== -1);
  var selected_keys = selected.map(s => s.key);
  var newChildren = children.filter(c => selected_keys.indexOf(c.key) === -1);

  cur.children.push(...selected);

  if (cur.parent) {
    reinsert(cur.parent, key, newChildren, nodeMap);
  }
}


function tagList(sim, tagGraph) {
  var {nodes, links} = tagGraph;
  var allTags = nodes.map(n => n.key);

  nodes.forEach(n => {
    n.relatedTags = _.uniq(_.flatten(n.values.map(d => d.tags)))
      .filter(t => t !== n.key);
    n._children = [];
    n.path = [];
  });

  var allValues = _.flatten((nodes.map(n => n.values)));

  var root = {
    index:       nodes.length,
    level:       0,
    "__key__":   "root",
    key:         "root",
    sets:        [],
    children:    nodes,
    relatedTags: allTags,
    path:        [],
    values:      allValues,
    height:      30,
    x:          0
    // xScale: d3.scale.linear()
    //         .domain([0, nodes.length])
    //         .range([0, maxBarWidth])
  };

  root.yScale = d3.scale.linear()
    .domain([1, d3.max(root.children, d => d.values.length)])
    .range([10, root.height]);

  nodes.push(root);

  // nodes.forEach(d => {
  //   d.xScale = d3.scale.linear()
  //     .domain([0, d.values.length])
  //     .range([0, maxBarWidth]);
  // });

  var nodeMap = d3.map(nodes, d => d.key);

  root.children = nbs_map(root, nodeMap);

  var margin = {top: 0, right: 0, bottom: 0, left: 30},
      width = 300 - margin.left - margin.right;
      // maxBarWidth = width * 0.8;

  var duration = 400;

  var cont = d3.select("body")
    .append("div")
    // TODO: make dynamic
    .style("height", "600px")
    .attr("class", "tag-list");

  var svg = cont.append("svg");

  var g = svg
      .attr("width", width + margin.left + margin.right)
    .append("g")
      .attr("overflow", "scroll")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    root.x0 = 0;
    root.y0 = 0;
    // root._children = root.children;
    // root.children = root._children;
    update(root);

  function update(source) {
    var tree = d3_hierarchy.layout.tree()
        .nodeSize([0, 30]);
    // Compute the flattened node list. TODO use d3.layout.hierarchy.
    var treeNodes = tree.nodes(source);//_.orderBy(tree.nodes(source), d => d.values.length, "desc");
    var rootDatum = treeNodes.find(d => d.depth === 0);
    console.log("rootDatum", rootDatum);
    var nodes = treeNodes.filter(d => d.depth > 0);

    nodes.forEach(n => {
      if (n.children) {
        n.yScale = d3.scale.linear()
          .domain([1, d3.max(n.children, d => d.values.length)])
          .range([10, n.parent.yScale(n.values.length)]);
      }
    });


    rootDatum.x = 0;
    rootDatum.height = 20;
    rootDatum.width = 50;

      // nodes.length * barHeight + margin.top + margin.bottom);

    // Update the nodes…
    var root = cont.selectAll("div.root")
        .data([rootDatum], d => d.key);

    var rootEnter = root.enter()
      .insert("div", ":first-child")
        .attr("class", "root");

    rootEnter
      .append("input")
        .on("focusin", function(d) {
          console.log("focusin");
          var input = d3.select(this).node().value;
          if (input === "") {
            d.oldSrc = _.cloneDeep(source);
            console.log("empty", "oldSrc", d.oldSrc);
            // update(d.oldSrc);
          }
        })
        .on("focusout", function(d) {

          var input = d3.select(this).node().value;
          if (input === "")
            update(d.oldSrc);

          var maxDepth = d3.max(treeNodes.filter(n => n.children), d => d.depth);
          console.log("maxDepth", maxDepth);
          var newSrc = findByDepth(source, maxDepth);
          console.log("newSrc", newSrc);
          newSrc.children = newSrc.children.filter(d => d.key.includes(input));

          newSrc.yScale = d3.scale.linear()
            .domain([1, d3.max(source.children, d => d.values.length)])
            .range([10, source.height]);

          update(source);
        });

    rootEnter
        // .attr("y", d => -d.height / 2)
        .style("height", d => d.height + "px")
        .style("width", 100 + "px")
        .style("transform", "translate(" + margin.left + "px," + margin.top + "px)");
        // .attr("width", maxBarWidth)
        // .style("background", "orange")
        // .style("opacity", 1e-6)


    var node = g.selectAll("g.node")
        .data(nodes, d => d.key);

    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        // .attr("transform", () => "translate(" + [root.y0, root.x0] + ")")
        .style("opacity", 1e-6);

    // Enter any new nodes at the parent's previous position.
    nodeEnter.append("rect")
      .style("fill", color)
      .on("click", click);

    nodeEnter.append("text");

    node.select("text")
      .style("font-size", d => d.parent.yScale(d.values.length))
      .text(d => d.key)
      .each(function(d) {d.bbox = d3.select(this).node().getBBox();});

    var padding = 7;
    var height = nodes.reduce((h, n) => {
      n.x = h;
      n.height = n.bbox.height; //yScale(n.values.length);
      n.width = n.bbox.width + 5;
      h += n.height + padding;
      return h;
    }, rootDatum.height + padding * 4);

    svg.attr("height", height);

    node.select("text").transition()
      .duration(duration)
      .attr("dy", d => d.height / 2)
      .attr("dx", d => d.width / 2)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "central");

    // Transition nodes to their new position.
    nodeEnter.transition()
      .duration(duration)
      .attr("transform", d => "translate(" + [d.y, d.x] + ")")
      .style("opacity", 1);

    node.transition()
      .duration(duration)
      .attr("transform", d => "translate(" + [d.y, d.x] + ")")
      .style("opacity", 1)
    .select("rect")
      .style("fill", color)
      .attr("height", d => d.height)
      .attr("width", d => d.width);
      // .on("click", click);

    // Transition exiting nodes to the parent's new position.
    node.exit().transition()
      .duration(duration)
      .attr("transform", () => "translate(" + [source.y, source.x] + ")")
      .style("opacity", 1e-6)
      .remove();

    // Update the links…
    var link = g.selectAll("path.link")
        .data(tree.links(treeNodes), d => d.target.key);

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link");
        // .attr("d", (d) => {
        //   return stepLine([{
        //     x: d.source.y,
        //     y: d.source.x + d.source.height / 2
        //   }, {
        //     x: d.target.y + d.target.height / 2,
        //     y: d.target.x
        //   }]);
        // })
      // .transition()
        // .duration(duration)
        // .attr("d", d => {
        //   return stepLine([{
        //     x: d.source.y,
        //     y: d.source.x + d.source.height / 2
        //   }, {
        //     x: d.target.y,
        //     y: d.target.x + d.target.height / 2
        //   }]);
        // });

    // Transition links to their new position.
    link
      // .transition()
      // .duration(duration)
       .attr("d", d => {
          return stepLine([{
            x: d.source.y,
            y: d.source.x + d.source.height / 2
          }, {
            x: d.target.y,
            y: d.target.x + d.target.height / 2
          }]);
        });

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
      .duration(duration)
      .attr("d", (d) => {
        return stepLine([{
          y: d.source.x + d.source.height / 2,
          x: d.source.y
        }, {
          y: d.target.x,
          x: d.target.y + d.target.height / 2
        }]);
      })
      .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Toggle children on click.
  function click(d) {
    var nbs;
    if (d.children) {
      d.path.pop();
      console.log("D:PATH", d.path);
      nbs = nbs_map(d, nodeMap);
      var succs = [];
      var clonedChilds = _.cloneDeep(d.children);
      d.children = [];
      reinsert(d.parent, d.key, clonedChilds.concat(yield0(d, succs)), nodeMap);
      update(root);
    } else {
      d.path = _.uniq(d.path.concat(d.parent.path, [d.key]));
      nbs = nbs_map(d, nodeMap);

      d.children = nbs;
      var children_ids = nbs.map(d => d.key);
      // d.old_children = d._children;
      console.log("children_ids", children_ids);
      traverse(root, d.key, nbs.map(d => d.key));
      update(root);
    }
  }

  function focusout() {
            var input = d3.select(this).node().value;
            root.children = root.children.filter(d => d.key.includes(input));
            update(root);
  }

  function color(d) {
    return d.children ? "orange" : "white";
    // return "orange";
  }

}
export default tagList;
