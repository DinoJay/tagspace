import d3 from "d3";
import d3_hierarchy from "d3";
import _ from "lodash";

function neighbors(a, linkedByIndex, nodes) {
  var nb;
  var nbs = [];

  // console.log("a", a);
  for (var property in linkedByIndex) {
    var s = property.split(",").map(d => parseInt(d));
    if (s[0] === a.index) {
      nb = nodes[s[1]];
      // console.log("nb", nb);
      nbs.push(nb);
    }
  }
  return nbs;
}

function traverse(cur, id, nodes) {
  if (cur.children) {
    cur.children.forEach(next => {
      // if(seen.indexOf(next) === -1)
      traverse(next, id, nodes);
    });
    if (id !== cur.id)
      cur.children = cur.children.filter(c => nodes.indexOf(c.id) === -1);
  }
}

function reinsert(cur, id, children, linkedByIndex, nodes) {
  if (cur.id === id) return;
  // TODO: wrong
  var nbs = neighbors(cur, linkedByIndex, nodes);
  var children_ids = children.map(c => c.id);
  var selected = nbs.filter(c => children_ids.indexOf(c.id) !== -1);
  var selected_ids = selected.map(s => s.id);
  var newChildren = children.filter(c => selected_ids.indexOf(c.id) === -1);

  if (cur.children) {
    cur.children.forEach(next => {
        reinsert(next, id, newChildren, linkedByIndex, nodes);
    });
    cur.children.push(...selected);
  }
}


function tagList(sim, hierarchy) {
  var {root, linkedByIndex, nodes} = hierarchy;
  // console.log("ROOT", root);
  // data.forEach(t => {
  //   t.width = 100;
  //   t.height = 100;
  // });

  // var cont = d3.select("body").append("div");
  //
  // var ul = cont.append("ul")
  //              .attr("class", "tagList");
  //
  // var li = ul.selectAll("li")
  //            .data(data);
  //
  // li.enter()
  //   .append("li")
  //   .on("click", d => {
  //     var doc = d3.selectAll(".doc")
  //       .filter(e => e.tags.indexOf(d.key) !== -1)
  //       .select("rect");
  //
  //     doc.filter(d => !d.clicked).each(d => {
  //       d.width = d.width * 20;
  //       d.height = d.height * 20;
  //       d.clicked = true;
  //     });
  //     // doc.attr("width", d => d.width * 10);
  //     // doc.attr("height", d => d.height * 10);
  //     console.log("doc", doc);
  //     sim.alphaTarget(0.35);
  //     sim.restart();
  //   })
  //   .text(d => d.__key__);
// //
// //
//
  console.log("tags", root);
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 400 - margin.left - margin.right,
      barHeight = 20,
      barWidth = width * .8;

  var i = 0,
      duration = 400;

  console.log("d3_hierarchy", d3_hierarchy);

  var tree = d3_hierarchy.layout.tree()
      .separation(() => 0)
      .nodeSize([0, 20]);

  var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; });

  var cont = d3.select("body").append("div");
  var svg = cont.append("svg")
      .attr("width", width + margin.left + margin.right)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    root.x0 = 0;
    root.y0 = 0;
    // root._children = root.children;
    root.children = root._children;
    update(root);

  function update(source) {
    console.log("UPpaDate");

    // Compute the flattened node list. TODO use d3.layout.hierarchy.
    console.log("rooot", root);
    var nodes = tree.nodes(root);

    var height = Math.max(600, nodes.length * barHeight + margin.top + margin.bottom);

    console.log("SIZE", height);
    cont.select("svg")
        .attr("height", height);

    // d3.select(self.frameElement).transition()
    //     // .duration(duration)
    //     .style("height", height + "px");

    // Compute the "layout".
    nodes.forEach(function(n, i) {
      n.x = i * barHeight;
    });

    // Update the nodes…
    var node = svg.selectAll("g.node")
        .data(nodes, (d) => d.id || (d.id = ++i));

    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", () => "translate(" + [source.y0, source.x0] + ")")
        .style("opacity", 1e-6);

    // Enter any new nodes at the parent's previous position.
    nodeEnter.append("rect")
        .attr("y", -barHeight / 2)
        .attr("height", barHeight)
        .attr("width", barWidth)
        .style("fill", color)
        .on("click", click);

    nodeEnter.append("text")
        .attr("dy", 3.5)
        .attr("dx", 5.5)
        .text(d => d.__key__);

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
        .style("fill", color);

    // Transition exiting nodes to the parent's new position.
    node.exit().transition()
        .duration(duration)
        .attr("transform", () => "translate(" + [source.y, source.x] + ")")
        .style("opacity", 1e-6)
        .remove();

    // Update the links…
    var link = svg.selectAll("path.link")
        .data(tree.links(nodes), d => d.target.id);

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", () => {
          var o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
        })
      .transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", () => {
          var o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
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
    console.log("click parent", d.parent);

    if (d.children) {
      d._children = d.children;
      d.children = [];
      reinsert(root, d.id, d._children, linkedByIndex, nodes);
      // update(d.oldRoot);
    } else {
      d.children = d._children;
      var children_ids = d._children.map(d => d.id);
      // d.old_children = d._children;
      console.log("children_ids", children_ids);
      // d.oldRoot = _.cloneDeep(root);
      traverse(root, d.id, children_ids);
      d._children = [];
    }
    update(root);
  }

  function color(d) {
    return d._children.length > 0 ? "orange" : d.children ? "orange" : "white";
    // return "orange";
  }

}
export default tagList;
