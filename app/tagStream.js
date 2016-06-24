import d3 from "d3";
import brewer from "colorbrewer";
import _ from "lodash";
import d3_hierarchy from "d3-hierarchy";
import cloud from "d3.layout.cloud";

console.log("d3_hierarchy", d3_hierarchy);

// "2016/04/16 10:50:21 +0000"
// var format = d3.time.format("%m/%d/%y ");
var format = d3.time.format("%Y/%m/%d %H:%M:%S %Z");
var color = d3.scale.ordinal().range(brewer.Spectral[9]);

var height = 600,
    width  = 600;

var margin = {left: 100, top: 50};

function prepareData(data) {

  var docs = data.map(d => {
    d.date = format.parse(d.created_at);
    d.date.setHours(0,0,0,0);
    // d.date.setDate(1);
    return {key: d.key, date: d.date, value: 1};
  });

  var nested = d3.nest()
    .key(function(d){ return d3.time.month(d.date); })
    .entries(docs);

  nested.forEach(g => g.date = g.values[0].date);
  nested.forEach(g => g.values = d3.nest().key(d => d.key).entries(g.values));

  // return {groups: nested, data: _.flatten(layers.map(l => l.values))};
  return {groups: nested, data: docs};
}

var dbg = d => {
  console.log("d", d);
  return d;
};

function tagStream(spreadDocs, cont) {
  // var x = d3.time.scale().range([0, 600]);
  // var y = d3.scale.linear().range([600, 0]);

  console.log("spreadDocs", spreadDocs);
  // TODO: FIX cleaning

  // docs = docs.slice(0, 5);


  var {groups, data} = prepareData(spreadDocs);

  var x = d3.scale.linear().range([0, 600])
            .domain([0, d3.max(groups, d => d.values.length)]);

  var ordinalXScale = d3.scale.ordinal()
      .domain(_.orderBy(d3.map(groups, function(d) { return d.date; })))
      .rangeRoundBands([0, 580], 0.4, 0);

  //d3.scale.ordinal().rangeRoundBands([0, 580], .05)
  var y = d3.time.scale().range([580, 0])
            .domain(d3.extent(groups, d => d.date));
            // .domain(groups.map(d => d.date));

  groups.forEach(d => {
    d.width = x(d.values.length);
    d.height = 40;
    d.values.forEach(d => d.value = 1);
  });

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(d3.time.weeks);

  var svg = cont.append("svg")
                .attr("width", width)
                .attr("height", height);

  svg.append("g")
      .attr("class", "y axis")
      // .attr("transform", "translate(0," + height + ")");
      .attr("transform", "translate(" + [margin.left, 0] + ")")
      .call(yAxis.orient("left"));

  var subG = svg.append("g");
      // .attr("transform", "translate(0," + height + ")");

  var gEnter = subG.selectAll(".layer")
                    .data(groups)
                    .enter();

  var g = gEnter.append("g")
            .attr("transform", d => "translate(" + [margin.left, y(d.date)] + ")")
            .attr("class", "layer");

  g
    .append("g")
      .attr("class", "layer")
      // .attr("y", function(d) { return y(d.date); })
      // .attr("y", function() { return 100; })
      // .attr("height", x(d))
      .each(function(d) {
        var self = d3.select(this);
        self.append("rect")
          .style("fill", "none")
          .attr("width", d => d.width)
          // .attr("height", d => d.height)
          .attr("width", ordinalXScale.rangeBand())
          .style("stroke", (d, i) => color(i));

        // var values = d.values.slice(0, 100);
        // var root = {key: "root", value: d3.sum(values, d => d.value), children: values};
        // var rootNode = d3_hierarchy.hierarchy(root);
        // console.log("root", root);
        //
        // var treemap = d3_hierarchy.treemap()
        //   .size([d.width, d.height]);
        //   // .padding(1)
        //   // .round(true);
        //   // .value(d => d.value);
        //
        // var nodes = treemap(rootNode)
        //   // .sum(function(d) { return dbg(d).values.length; })
        //   .sort(function(a, b) { return b.height - a.height || b.value - a.value; })
        //   .descendants();
        //
        // console.log("root nodes", nodes);
        //
        // var cell = d3.select(this).selectAll("g")
        //   .data(nodes)
        //   .enter().append("rect")
        //   .attr("x", function(d) { return d.x0; })
        //   .attr("y", function(d) { return d.y0; })
        //   .attr("width", function(d) { return d.x1 - d.x0; })
        //   .attr("height", function(d) { return d.y1 - d.y0; })
        //   .style("fill", (d, i) => color(i))
        //   .on("click", d => {
        //     console.log("d", d.data);
        //   });

    var layout = cloud()
          .size([d.width, d.height])
          .words(d.values.map(function(d) {
            return {text: d.key, size: 12};
          }))
          // .padding(5)
          .rotate(() => ~~(Math.random()*2 ) * 90)
          .font("Impact")
          .fontSize(d => d.size)
          .on("end", draw);

    layout.start();

    function draw(words) {
      self
      .append("g")
      .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
      .selectAll("text")
      .data(words)
      .enter().append("text")
      .style("font-size", d => d.size + "px")
      // .style("font-family", "Impact")
      .style("fill", (d, i) => color(i))
      .attr("text-anchor", "middle")
      .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
      .text(d => d.text)
      .on("click", d => console.log("word", d));
    }
          // .attr("height", function(d) { return d.dy; })
        // .style("fill", function(d, i) { return d.children ? color(i) : null; });
          // .attr("class", "cell")
          // .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        // cell.append("rect")
        // .attr("width", function(d) { return d.dx; })
        // .attr("height", function(d) { return d.dy; })
        //.style("fill", function(d, i) { return d.children ? color(i) : null; });
      });

  // g.append("path")
  //   // .attr("class", "layer")
  //   .attr("d", d => area(d.values))
  //   .style("fill", (d, i) => color(i))
  //   .on("mouseon", d => console.log("hover", d));

  // g.append("title")
  //   .text(d => {
  //     return d.key;
  //   });

}

export default tagStream;
