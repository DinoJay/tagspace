import * as d3 from "d3";
// import brewer from "colorbrewer";
// import _ from "lodash";
// import d3_hierarchy from "d3-hierarchy";
// import * as d3_force from "d3-force";

// "2016/04/16 10:50:21 +0000" var format = d3.time.format("%m/%d/%y ");

// var timeMap = d3.map({day: d3.timeDay, month: d3.timeMonth, year: d3.timeYear})
//
//
var colors = ["#66cdff","#79c8ff","#8ac4ff","#9bbdff","#a7b8ff","#b3b3ff","#beaeff","#c9a7ff"];
// d3.scaleThreshold()
//     .range();

function styleAxis(self) {
    self.selectAll("text")
        .attr("transform", function() {
             return "translate(" + this.getBBox().height*-2 + "," + this.getBBox().height + ")rotate(-45)";
      });
     self.selectAll("text")
        .style("text-anchor", "middle");
        // .attr("dy", 10);
        // .attr("dx", -5);

  var ticks = self.selectAll(".tick");
  ticks.each(function() {
    d3.select(this).select("circle").remove();
    d3.select(this).append("circle")
                            .attr("r", 4)
                            .attr("transform", "translate(8, 0)")
                            .attr("fill", "black");
  });
  ticks.selectAll("line").remove();
}

function pushNewData(props, state, nextTimeFormat) {
  var allNewData = prepareData(props.data, nextTimeFormat);
  var pushData = allNewData.reduce((acc, d) => {
    var i = state.simData.findIndex(old => old.tagKey === d.tagKey && !old.marked);
    var old = state.simData[i];
    if (old) {
      old.size = d.size;
      old.date = d.date;
      old.key = d.key;
      old.values = d.values;
      // old.vy = d.vy;
      // old.vx = d.vx;
      old.marked = true;
    } else acc.push(d);
    return acc;
  }, []);
  state.simData.push(...pushData);
  state.simData.forEach(d => d.marked = false);
}

const timeFormatMap = d3.map({
  year: {key: "year", nextKey: "month", prevKey: "year", format: d3.timeYear},
  month: {key: "month", nextKey: "week", prevKey: "year", format: d3.timeMonth},
  week: {key: "week", nextKey: "day", prevKey: "month", format: d3.timeDay},
  day: {key: "day", nextKey: "day", prevKey: "week", format: d3.timeDay}
}, d => d.key);

var format = d3.timeFormat("%Y/%m/%d %H:%M:%S %Z");
var parseTime = d3.timeParse("%Y/%m/%d %H:%M:%S %Z");

var color = d3.scaleOrdinal().range(colors);

var height = 300,
    width  = 1400;
var margin = {left: 100, right: 50, top: 0, bottom: 50};

var bundleLine = d3.line();
            // .curve(d3.curveStepAfter);

function rectCollide(nodes, strength) {
  return function(alpha) {
    var quadtree = d3.quadtree()
                     .x(d => d.x)
                     .y(d => d.y)
                     .addAll(nodes);
    var padding = 6;

    for (var i = 0, n = nodes.length; i < n; ++i) {
      var node = nodes[i];
      quadtree.visit(function(quad, x1, y1, x2, y2) {

        if (quad.data && (quad.data !== node)) {
          var x = node.x - quad.data.x,
            y = node.y - quad.data.y,
            xSpacing = (quad.data.width + node.width) / 2,
            ySpacing = (quad.data.height + node.height + padding) / 2,
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

            x *= lx * alpha * strength;
            y *= ly * alpha * strength;

            node.vx -= x;
            node.vy -= y;
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

  var tags = rawData.map(d => {
      d.date = parseTime(d.created_at);
      // console.log("time", format(time(d.date)));
      d.width = 8 * 5,
      d.height = 4 * 5;
      d.x = width / 2;
      d.y = height / 2;
      // d.x = d.x;
      // d.y = d.y;
      return d;
  });

  // console.log("tags", tags);
  var nestedDateTag = d3.nest()
    .key(d => d.key + format(time(d.date)))
    .entries(tags);

  nestedDateTag.forEach(g => {
    g.date = new Date(time(g.values[0].date));
    g.size = g.values.length;
    g.tagKey = g.values[0].key;
  });

  // console.log("nested", nestedDateTag);
  return nestedDateTag;
}

var dbg = d => {
  console.log("d", d);
  return d;
};


function create(data, cont) {
  cont
    .append("div")
    .attr("class", "view-name")
    .append("h3")
    .text("time-cloud")
    .on("click", () => d3.select(".paneOptions")
                         .style("left", margin.left + "px")
                         .style("top", 450 + "px")
                         .style("display", "inline")
    );

  var paneOptions = cont
    .append("div")
    .attr("class", "paneOptions");

  var times = ["year", "month", "week", "day"];
  // var y = d3.scaleBand()
  //     .domain(times)
  //     .range([0, 200]);

  paneOptions.append("h4")
    .text("Aggregate");

  paneOptions
    .append("div")
    .selectAll(".legendButton")
    .data(times)
    .enter()
    .append("input")
    .attr("title", d => d)
    .attr("type", "button")
    // .attr("class", "legendButton")
    .attr("value", d => d);

  var svg = cont.append("svg")
                  .attr("width", width)
                  .attr("height", height);

  var mainG = svg.append("g")
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
    .attr("transform", "translate(" + [0, height - margin.bottom] + ")");


  var props = {data: data};
  var initTags = prepareData(props.data, d3.timeYear , null);
  var simulation = d3.forceSimulation(initTags);
  var state = {
    time: "year",
    xScale: null,
    simulation: simulation,
    simData: initTags,
    k: 1
  };
  update(props, state);
}

function update(props, state) {
  var time = timeFormatMap.get(state.time),
      nextTime = timeFormatMap.get(time.nextKey),
      prevTime = timeFormatMap.get(time.prevKey),
      simulation = state.simulation,
      xScale = state.xScale;

  // console.log("time", time.key);
  var wordScale = d3.scaleLinear()
      .domain(d3.extent(simulation.nodes(), d => d.size))
      .rangeRound([7, 30]);

    var [t1, t2] = d3.extent(simulation.nodes(), d => d.date);
    // console.log("t1", t1);
    // console.log("t2", t2);
    var t0 = time.format.offset(t1, -1);
    var t3 = time.format.offset(t2, +1);
    // console.log("t2", t1);
    // console.log("t3", t2);
    xScale = d3.scaleTime()
      .domain([t0, t3])
      .range([margin.left, width - margin.right]);
      // .range([t0, t3].map(d3.scaleTime()
      //   .domain([t1, t2])
      //   .range([margin.left, width - margin.right]))
      // );
  // xScale = d3.scaleTime().domain([Date.UTC(2001, 0, 1), Date.UTC(2002, 0, 1)]).range([margin.left, width - margin.right]),
  // console.log("xScale domain", xScale.domain());

  var xAxis = d3.axisBottom()
      .scale(xScale)
      .ticks(time.format)
      .tickSize(12).tickPadding(-2);

  var mainG = d3.select("g.main");

  mainG.call(d3.zoom()
               .scaleExtent([-1, 10])
               .translateExtent([[-50, -50], [width, height]])
               .duration(1000)
               .on("zoom", zoomed))
               .on("dblclick.zoom", null);

  var gTag = mainG.select("g.tags");
           // .attr("transform", "translate(" + [0, margin.top] + ")");

  var gAxis = d3.select(".x.axis")
    .call(xAxis)
    .call(styleAxis);


  var tag = gTag.selectAll(".tag")
    .data(simulation.nodes(), d => d.key);

  var tagEnterG = tag.enter()
    .append("g")
    .attr("class", "tag");

  tagEnterG.append("rect")
    .style("opacity", 0.3);

  tagEnterG.append("text")
    .text(d => d.tagKey);

  tag.exit().remove();

  var tagEnterUpdate = tagEnterG.merge(tag);

  tagEnterUpdate.style("font-size", d => wordScale(d.size) + "px");

  tagEnterUpdate.select("text")
    .each(function(d) {
      var self = d3.select(this);
      var bbox = self.node().getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    })
    .on("click", function(d) {
      console.log("time link", d);
      var timeLink = d3.select("g.tags").selectAll(".time-link")
                      .data(d.values)
                      .enter()
                      .insert("path", ":first-child")
                      .attr("stroke", "red")
                      .attr("fill", "none")
                      .attr("d", e => {
                        var a = [
                          [d.x, d.y],
                          [xScale(e.date), height - margin.bottom]
                        ];
                        return bundleLine(a);
                      });
    });

    tagEnterUpdate.select("text")
      .attr("dy", d => d.height * 3/4);

    tagEnterUpdate.select("rect")
      .attr("width", d =>  d.width)
      .attr("height", d => d.height);
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

    simulation
          .force("y", d3.forceY(height / 2).strength(0.1))
          .force("x", d3.forceX(d => xScale(d.date)).strength(0.3))
          .force("collide", rectCollide(simulation.nodes(), 6))
          .on("tick", () => {
            // rect
            //   .attr("x", d => d.x - d.width / 2)
            //   .attr("y", d => d.y - d.height / 2);

            tagEnterUpdate
              .attr("transform", d => {
                return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
              });

            tagEnterG.select("rect").style("fill", "#8ac4ff");

            // tag
            //   .attr("transform", d => {
            //     return "translate(" + [d.x - d.width / 2, d.y - d.height / 2] + ")";
            //   })
            //   .select("rect").style("fill",  "green");

            //
            // tag.select("rect")
            //   .attr("x", d => d.x - d.width / 2)
            //   .attr("y", d => d.y - d.height / 2);
            //
            // tag.select("text")
            //   .attr("x", d => d.x - d.width / 2)
            //   .attr("y", d => d.y + d.height / 4);
          })
          .velocityDecay(0.6)
          // .alphaDecay(1)
          .alpha(0.5);
        // .stop();

    simulation.restart();

  function zoomed() {
    if(state.simulation.alpha() > 0.4) return;
    var newState;
    if (d3.event.transform.k < state.k) {
      console.log("zoom out");
      pushNewData(props, state, prevTime.format);
      simulation.nodes(state.simData);
      newState = {
        time: prevTime.key,
        simulation: simulation,
        simData: state.simData,
        k: d3.event.transform.k
      };
      update(props, newState);
    } else {
      if (state.time !== "day") {
        pushNewData(props, state, nextTime.format);
        simulation.nodes(state.simData);
        newState = {
          time: nextTime.key,
          simulation: simulation,
          simData: state.simData,
          k: d3.event.transform.k
        };
        update(props, newState);
      } else {
          var newXscale = d3.event.transform.rescaleX(xScale);
          d3.select(".x.axis").call(xAxis.scale(newXscale).ticks(d3.timeDay))
                              .call(styleAxis);

          simulation
            .force("x", d3.forceX(d => newXscale(d.date)).strength(0.3))
            .force("collide", rectCollide(simulation.nodes(), 3));
          simulation.alpha(0.4);
          simulation.restart();

      }

    }

  // }
  }
}

function slider(g) {

  var margin = {right: 50, left: 20, top: 20};

  var height = 200;

  var r = 10;


  // g.attr("transform", "translate(" + [margin.left, (height - margin.bottom)  / 2] + ")");
  //
  // console.log("d3 scale month", y.domain());
  // var sliderG = g.append("g")
  //     .attr("class", "slider")
  //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  //
  // console.log("domain", y.domain());
  //
  // sliderG.selectAll(".date-bubble")
  //  .data(y.domain())
  //  .enter()
  //  .append("rect")
  //  .attr("x", margin.left + r/2)
  //  .attr("y", d => dbg(y(d)))
  //  .attr("width", 20)
  //  .attr("height", 20)
  //  .attr("fill", "blue");

}

export default create;
