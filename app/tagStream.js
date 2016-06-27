import * as d3 from "d3";
import brewer from "colorbrewer";
import _ from "lodash";
// import d3_hierarchy from "d3-hierarchy";
// import * as d3_force from "d3-force";

// "2016/04/16 10:50:21 +0000"
// var format = d3.time.format("%m/%d/%y ");

console.log("d3", d3);
var format = d3.timeFormat("%Y/%m/%d %H:%M:%S %Z");
var parseTime = d3.timeParse("%Y/%m/%d %H:%M:%S %Z");

var color = d3.scaleOrdinal().range(brewer.Spectral[9]);

var height = 300,
    width  = 1000;
var margin = {left: 100, right: 100, top: 0};

var bundleLine = d3.line()
            .curve(d3.curveStepAfter);

function rectCollide(nodes) {
  return function(alpha) {
    var quadtree = d3.quadtree()
                     .x(d => d.x)
                     .y(d => d.y)
                     .addAll(nodes);


    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i];
      quadtree.visit(function(quad, x1, y1, x2, y2) {

        if (quad.data && (quad.data !== node)) {
          var x = node.x - quad.data.x,
            y = node.y - quad.data.y,
            xSpacing = (quad.data.width + node.width) / 2,
            ySpacing = (quad.data.height + node.height) / 2,
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
            quad.data.vx += x;
            quad.data.vy += y;

            // updated = true;
          }
        }
      });
    }
  };
}

function prepareData(rawData, time) {

  console.log("rawData", rawData);
  var tags = rawData.map(d => {
      d.date = parseTime(d.created_at);
      d.key = d.key;
      d.date = d.date;
      d.width = 8 * 5,
      d.height = 4 * 5;
      d.value = 1;
      d.vx = d.vx;
      d.vy = d.vy;
      d.x = d.x;
      d.y = d.y;
      return d;
  });

  var nested = d3.nest()
    .key(d => time(d.date))
    .entries(tags);

  console.log("nested", nested);

  nested.forEach(g => {
    g.date = new Date(d3.median(g.values, d => d.date));
    console.log("median", g.date);
    g.values = d3.nest().key(d => d.key)
      .entries(g.values);
    g.values.forEach(d => {
      d.date = g.date;
      d.size = d.values.length;
    });
  });

  var values = nested.reduce((acc, g) => acc.concat(g.values), []);
  // console.log("")
  return values;

  // return {groups: nested, data: _.flatten(layers.map(l => l.values))};
  // return {groups: nested, tags: tags};
}

var dbg = d => {
  console.log("d", d);
  return d;
};


function create(spreadDocs, cont) {
  var mainG = cont.append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("class", "main")
                .attr("transform", "translate(" + [0, margin.top] + ")");

  mainG
      .insert("rect", ":first-child")
  // append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none");

  mainG.append("g")
              // TODO: fix translate
              .attr("class", "tags");

  mainG.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(" + [0, height - 40] + ")");

  update(spreadDocs, d3.timeWeek);
}

function update(spreadDocs, time, xScale, alpha) {
  // var x = d3.time.scale().range([0, 600]);
  // var y = d3.scale.linear().range([600, 0]);

  console.log("spreadDocs", spreadDocs);
  // TODO: FIX cleaning

  var tags = prepareData(spreadDocs, time);
  console.log("tags", tags);

  var wordScale = d3.scaleLinear()
      .domain(d3.extent(tags, d => d.size))
      .rangeRound([10, 50]);

  // var y = d3.scaleLinear().range([0, 600])
  //           .domain([0, d3.max(groups, d => d.values.length)]);

  //d3.scale.ordinal().rangeRoundBands([0, 580], .05)
  if(xScale === undefined) // TODO
    xScale = d3.scaleTime()
      .domain(d3.extent(_.flatten(tags.map(d => d.values)), d => d.date))
      .range([margin.left, width - margin.right]);
    else {
      console.log("time defined", time);
      console.log("Xscale", xScale.domain());
    }
    // .ticks(d3.timeMonth, 2);
            // .domain(groups.map(d => d.date));
  // groups.forEach(d => {
  //   d.width = xScale(d.values.length);
  //   d.height = 40;
  //   d.values.forEach(d => d.value = 1);
  // });

  var xAxis = d3.axisBottom()
      .scale(xScale)
      .ticks(time);

  var mainG = d3.select("g.main");

  mainG.call(d3.zoom()
               .scaleExtent([1, 1000])
               .translateExtent([[-50, -50], [width, height]])
               .on("zoom", zoomed)
          );

  // var view = svg.append("rect")
  //     .attr("class", "view")
  //     .attr("x", 0.5)
  //     .attr("y", 0.5)
  //     .attr("fill", "none")
  //     .attr("width", width - 1)
  //     .attr("height", height - 1);

             // .attr("transform", "translate(" + [margin.left, margin.top] + ")");
    var gTag = mainG.select("g.tags")
             .attr("transform", "translate(" + [0, margin.top] + ")");

    // .attr("transform", "translate(0," + height + ")");
    // .attr("transform", "translate(" + [margin.left, margin.top] + ")")
    d3.select(".x.axis")
      .call(xAxis);

  var tag = gTag.selectAll(".tag")
    .data(tags, d => d.key + format(d.date));

  var tagEnterG = tag.enter()
    .append("g")
    .attr("class", "tag");

  var rectEnter = tagEnterG.append("rect")
    .style("fill", (_, i) => color(i % 3))
    .style("opacity", 1);

  var textEnter = tagEnterG.append("text")
    .text(d => d.key)
    .style("font-size", d => wordScale(d.size) + "px")
    .each(function(d) {
      var self = d3.select(this);
      var bbox = self.node().getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    })
    .on("click", function(d) {
      var timeLink = d3.select(this.parentNode).selectAll(".time-link")
                      .data(d.values)
                      .enter()
                      .insert("path", ":first-child")
                      .attr("stroke", "red")
                      .attr("fill", "none")
                      .attr("d", e => {
                        var a = [
                          [d.x, d.y],
                          [xScale(e.date), height - 40]
                        ];
                        console.log("a", a, "e.date", e.date);
                        return bundleLine(a);
                      });
    });


    textEnter
      .attr("dy", d => d.height / 2);

    rectEnter
      .attr("width", d =>  d.width)
      .attr("height", d => d.height);


  tag.exit().remove();

  var tagEnterUpdate = tagEnterG;//.merge(tag);

  // var rect = tagEnterUpdate.select("rect");
  // var text = tagEnterUpdate.select("text");


  // gTag.selectAll("circle")
  //   .data(tags)
  //   .enter()
  //   .append("circle")
  //     .attr("r", 3)
  //     .attr("cx", d => d.x)
  //     .attr("cy", d => d.y)
  //     .on("click", d => console.log("d.date", d.date));

  // if (simulation === undefined)
    var simulation = d3.forceSimulation(tags)
          // .force("y", d3.forceY(height / 2))
          .force("x", d3.forceX(d => xScale(d.date) ? xScale(d.date) : 0).strength(0.3))
          // .force("y", d3.forceY(height / 2).strength(0.2))
          // .force("center", d3_force.forceCenter().x(width/2))
          // .force("collide", d3_force.forceCollide(4))
          .force("collide", rectCollide(tags))
          // .stop()
          .on("tick", () => {
            // rect
            //   .attr("x", d => d.x - d.width / 2)
            //   .attr("y", d => d.y - d.height / 2);

            tagEnterUpdate
              .attr("transform", d => {
                return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
              });
            //
            // tag.select("rect")
            //   .attr("x", d => d.x - d.width / 2)
            //   .attr("y", d => d.y - d.height / 2);
            //
            // tag.select("text")
            //   .attr("x", d => d.x - d.width / 2)
            //   .attr("y", d => d.y + d.height / 4);
          })
          .alpha(alpha ? alpha : 1);
        // .stop();


  function zoomed() {
    // console.log("zoomed", xAxis.scale());
    var newXscale = d3.event.transform.rescaleX(xScale);
    // view.attr("transform", d3.event.transform);
    // console.log("d3.event.transform", d3.event.transform);
    console.log("xscale domain", newXscale.domain(), newXscale.range());

    var newTags = d3.map(prepareData(spreadDocs, d3.timeDay), d => d.key);
    simulation.nodes().forEach(d => d.date = newTags.get(d.key).date);
    simulation.force("x", d3.forceX(d => newXscale(d.date)).strength(0.1));
    // d3.selectAll(".tag").remove();
    // update(_.flatten(tags.map(d => d.values)), d3.timeDay, newXscale, 0.5);
    d3.select(".x.axis").call(xAxis.scale(newXscale));
    // simulation.force("collide", null);
    simulation.alpha(1);
    simulation.restart();
  }

}

export default create;
