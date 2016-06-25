import d3_old from "d3";
import brewer from "colorbrewer";
import _ from "lodash";
// import d3_hierarchy from "d3-hierarchy";
import * as d3_force from "d3-force";
import * as d3_time_format from "d3-time-format";
import * as d3_scale from "d3-scale";
import * as d3_axis from "d3-axis";

// "2016/04/16 10:50:21 +0000"
// var format = d3_old.time.format("%m/%d/%y ");

var format = d3_time_format.timeFormat("%Y/%m/%d %H:%M:%S %Z");
var parseTime = d3_time_format.timeParse("%Y/%m/%d %H:%M:%S %Z");

var color = d3_old.scale.ordinal().range(brewer.Spectral[9]);

var height = 1000,
    width  = 1000;
var margin = {left: 100, top: 0};


// var wordScale = d3_old.scale.linear()
//     .domain(d3_old.extent(allTags, d => d.values.length))
//     .rangeRound([7, 50]);

function rectCollide(nodes) {
  return function(alpha) {
    var quadtree = d3_old.geom.quadtree(nodes);
    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i];

      quadtree.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
          var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            xSpacing = (quad.point.width + node.width) / 2,
            ySpacing = (quad.point.height + node.height) / 2,
            absX = Math.abs(x),
            absY = Math.abs(y),
            l,
            lx,
            ly;

          // console.log("Node quad", node.width, node.height);

          if (absX < xSpacing && absY < ySpacing) {
            l = Math.sqrt(x * x + y * y);

            lx = (absX - xSpacing) / l;
            ly = (absY - ySpacing) / l;

            // the one that"s barely within the bounds probably triggered the collision
            if (Math.abs(lx) > Math.abs(ly)) {
              lx = 0;
            } else {
              ly = 0;
            }

            node.vx -= x *= lx;
            node.vy -= y *= ly;
            quad.point.vx += x;
            quad.point.vy += y;

            // updated = true;
          }
        }
      });
    }
  };
}

function prepareData(rawData) {

  var tags = rawData.map(d => {
    d.date = parseTime(d.created_at);
    d.date.setHours(0,0,0,0);

    d.date.setDate(1);
    return {
      key: d.key,
      date: d.date,
      width: 8 * 5,
      height: 4 * 5,
      value: 1
    };
  });

  var nested = d3_old.nest()
    .key(function(d){ return d3_old.time.month(d.date); })
    .entries(tags);

  console.log("nested", nested);

  nested.forEach(g => {
    g.date = g.values[0].date;
    g.values = d3_old.nest().key(d => d.key)
      .entries(g.values);
    g.values.forEach(d => d.date = g.date);
    g.values.forEach(sg => sg.size = sg.values.length * 4);
    // g.values.forEach(d => d.interpolatedDate = parseTime(g.key));
  });

  // return {groups: nested, data: _.flatten(layers.map(l => l.values))};
  return {groups: nested, data: nested.reduce((acc, g) => acc.concat(g.values), [])};
}

var dbg = d => {
  console.log("d", d);
  return d;
};

function tagStream(spreadDocs, cont) {
  // var x = d3_old.time.scale().range([0, 600]);
  // var y = d3_old.scale.linear().range([600, 0]);

  console.log("spreadDocs", spreadDocs);
  // TODO: FIX cleaning

  var {groups, data} = prepareData(spreadDocs);
  console.log("data", data);

  var x = d3_old.scale.linear().range([0, 600])
            .domain([0, d3_old.max(groups, d => d.values.length)]);

  //d3_old.scale.ordinal().rangeRoundBands([0, 580], .05)
  var y = d3_scale.scaleTime()
    .range([0, height * 3 / 4])
    .domain(d3_old.extent(groups, d => d.date));
    // .ticks(d3_time_format.timeMonth);
            // .domain(groups.map(d => d.date));

  groups.forEach(d => {
    d.width = x(d.values.length);
    d.height = 40;
    d.values.forEach(d => d.value = 1);
  });

  console.log("d3 axis", d3_axis);
  var yAxis = d3_old.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(d3_old.time.month);

  var svg = cont.append("svg")
                .attr("width", width)
                .attr("height", height);

  var g = svg.append("g");
             // .attr("transform", "translate(" + [margin.left, margin.top] + ")");
  var gSub = svg.append("g")
              // TODO: fix translate
             .attr("transform", "translate(" + [600, margin.top] + ")");

  g.append("g")
      .attr("class", "y axis")
      // .attr("transform", "translate(0," + height + ")");
      .attr("transform", "translate(" + [margin.left, margin.top] + ")")
      .call(yAxis);

  var gEnter = gSub.selectAll(".rect")
    .data(data)
    .enter();

  var gWord = gEnter.append("g");
    // .attr("x", d => d.x - d.width / 2)
    // .attr("y", d => d.y - d.height / 2);

    // .attr("transform", function(d) { return "translate(" + (-d.width / 2) + "," + (-d.height / 2) + ")"; });


  var text = gWord.append("text")
    .text(d => d.key)
    .style("font-size", d => d.size + "px")
    .each(function(d) {
      var self = d3_old.select(this);
      var bbox = self.node().getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });


  var rect = gWord.append("rect")
    .attr("width", function(d) { return d.width; })
    .attr("height", function(d) { return d.height; })
    .style("fill", function(d, i) { return color(i % 3); })
    .style("opacity", 0.3);

  // gSub.selectAll("circle")
  //   .data(data)
  //   .enter()
  //   .append("circle")
  //     .attr("r", 3)
  //     .attr("cx", d => d.x)
  //     .attr("cy", d => d.y)
  //     .on("click", d => console.log("d.date", d.date));

  var simulation = d3_force.forceSimulation(data)
        // .force("y", d3_old.forceY(height / 2))
        .force("y", d3_force.forceY(d => y(d.date)).strength(0.1))
        // .force("x", d3_force.forceX(width / 2).strength(0.2))
        // .force("center", d3_force.forceCenter().x(width/2))
        // .force("collide", d3_force.forceCollide(4))
        .force("collide", rectCollide(data))
        // .stop()
        .on("tick", () => {
          rect
            .attr("x", d => d.x - d.width / 2)
            .attr("y", d => d.y - d.height / 2);

          text
            .attr("x", d => d.x - d.width / 2)
            .attr("y", d => d.y + d.height / 4);
        });
        // .stop();



}

export default tagStream;
