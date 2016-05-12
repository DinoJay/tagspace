import d3 from "d3";
import jsonData from "./miserables.js";
import $ from "jquery";
import _ from "lodash";

var cell_size = 7;
var isolevel = 0.002; //0.0008  0.002
var epsilon = 0.00000001;
var allCells=[];
var grid = {
  width: 800,
  height: 800
};

var set = []; //the current set for the bubble

var edge_table = [
    0x0,     //0000,
    0x9,     //1001,
    0x3,     //0011
    0xa,     //1010
    0x6,     //0110,
    0xf,     //1111,
    0x5,     //0101
    0xc,     //1100
    0xc,     //1100
    0x5,     //0101
    0xf,     //1111,
    0x6,     //0110,
    0xa,     //1010
    0x3,     //0011
    0x9,     //1001,
    0x0     //0000
];

var segment_table = [
    [-1,-1,-1,-1,-1],
    [0,3,-1,-1,-1],
    [1,0,-1,-1,-1],
    [1,3,-1,-1,-1],
    [2,1,-1,-1,-1],
    [2,1,0,3,-1],
    [2,0,-1,-1,-1],
    [2,3,-1,-1,-1],
    [3,2,-1,-1,-1],
    [0,2,-1,-1,-1],
    [1,0,3,2,-1],
    [1,2,-1,-1,-1],
    [3,1,-1,-1,-1],
    [0,1,-1,-1,-1],
    [3,0,-1,-1,-1],
    [-1,-1,-1,-1,-1]
];


function vertex_interp(isolevel, p1, p2, valp1, valp2) {
  if ( Math.abs(isolevel - valp1) < epsilon ) { return p1; }
  if ( Math.abs(isolevel - valp2) < epsilon ) { return p2; }
  if ( Math.abs(valp1 - valp2) < epsilon ) { return p2; }
  var mu = (isolevel - valp1) / (valp2 - valp1);
  var p = {
    x: p1.x + mu * (p2.x - p1.x),
    y: p1.y + mu * (p2.y - p1.y)
  };
  return p;
}

function get_grid_cell(x, y) {
  var cell = {
    x: x,
    y: y,
    v: [
      {x: x, y: y},
      {x: x+cell_size, y: y},
      {x: x+cell_size, y: y+cell_size},
      {x: x, y: y+cell_size}
    ],
    val: [
      threshold(x, y),
      threshold(x+cell_size, y),
      threshold(x+cell_size, y+cell_size),
      threshold(x, y+cell_size)
    ],
    status:false
  };

  if (
    cell.val[0] < isolevel ||
    cell.val[1] < isolevel ||
    cell.val[2] < isolevel ||
    cell.val[3] < isolevel
    ) { cell.status = true; }


  return cell;

}

function polygonize(cell, isolevel) {
  var index = 0;
  if ( cell.val[0] < isolevel ) { index |= 1; }
  if ( cell.val[1] < isolevel ) { index |= 2; }
  if ( cell.val[2] < isolevel ) { index |= 4; }
  if ( cell.val[3] < isolevel ) { index |= 8; }

  if ( edge_table[index] == 0 ) {
    return []; // no segments here!
  }

  var vertlist = [
    {x:0, y:0},
    {x:0, y:0},
    {x:0, y:0},
    {x:0, y:0}
  ];

  if ( edge_table[index] & 1 ) {
    vertlist[0] = vertex_interp(isolevel,cell.v[0], cell.v[1], cell.val[0], cell.val[1]);
  }
  if ( edge_table[index] & 2 ) {
    vertlist[1] = vertex_interp(isolevel,cell.v[1], cell.v[2], cell.val[1], cell.val[2]);
  }
  if ( edge_table[index] & 4 ) {
    vertlist[2] = vertex_interp(isolevel,cell.v[2], cell.v[3], cell.val[2], cell.val[3]);
  }
  if ( edge_table[index] & 8 ) {
    vertlist[3] = vertex_interp(isolevel,cell.v[3], cell.v[0], cell.val[3], cell.val[0]);
  }

  var segments = [];
  for ( var i = 0; segment_table[index][i] != -1; i += 2 ) {
    segments.push({ a: vertlist[segment_table[index][i  ]],
                    b: vertlist[segment_table[index][i+1]]
                  });
  }

  return segments;
}

//graph.nodes dependence
function threshold(x, y){
  var f = 0;
  var d, g_force;
  for ( var i = 0; i < set.length; i++ ) {
    d = Math.sqrt(Math.pow(set[i].x - x, 2) + Math.pow(set[i].y - y, 2));
    g_force = 1 / Math.pow(d, 2);
    f += g_force;
  }
  return f;
}

var curve = d3.svg.line()
      .interpolate("cardinal-closed")
       .x(function(d) { return d.x; })
       .y(function(d) { return d.y; });

var iterationOfMarchingSquares = 0;
var selectTetrisCells = null;
var bubblePoints = [];
var prevArrayOfArraysLength=[];
var groups = [];
var groupFillOpacity = 0.5;

var tetrisIsOn = false;
var tetrisOpacityMap = null;

var minTestrisOpacity=0.25, maxTestrisOpacity=1;
var tetrisOpacityRange = [minTestrisOpacity, maxTestrisOpacity];

function draw_marching_squares() {

  d3.select(".marchingRectGroup").selectAll(".tetriscells").remove();
  //get the groups to iterate through
  groups = _.uniq(graph.nodes.map(function(d){return d.group;}));

  var g;
  for(g in groups){

    g = groups[g];

    set = graph.nodes.filter(function(x){return x.group==g;});

    bubblePoints = [];
    var tetriscells = [];
    for ( var i = 0; i < grid.width / cell_size; i += 1 ) {
      for ( var j = 0; j < grid.height / cell_size; j += 1 ) {

        var cell = get_grid_cell(i*cell_size, j*cell_size);

        if ( cell.status ) {

          var segments = polygonize(cell, isolevel);

          if(segments.length==0){
            // console.log("length", segments.length);
          }else{
            tetriscells.push({x:cell.x, y:cell.y,val:d3.median(cell.val)});
          }

          for ( var k = 0; k < segments.length; k++ ) {

             bubblePoints.push({x: segments[k].b.x, y: segments[k].b.y, id:"i"+i+"j"+j+"k"+k+"g"+g,group:g});
             bubblePoints.push({x: segments[k].a.x, y:segments[k].a.y, id:"i"+i+"j"+j+"k"+k+"g"+g,group:g});

          }
        } //if(cell)
        else{
          tetriscells.push({x:cell.x, y:cell.y,val:d3.median(cell.val)});
        }
      } // j
    } // i

    var opacityExtent = d3.extent(tetriscells.map(function(d) {return d.val;}));

    if (tetrisIsOn){
      groupFillOpacity = 0;
      tetrisOpacityRange = [minTestrisOpacity, maxTestrisOpacity];
    }
    else{
      groupFillOpacity = 0.5;
      tetrisOpacityRange = [0, 0];
    }

    tetrisOpacityMap = d3.scale.linear().domain(opacityExtent).range(tetrisOpacityRange);


    if(iterationOfMarchingSquares==0){

    selectTetrisCells = d3.select(".marchingRectGroup").selectAll(".tetriscells")
                          .data(tetriscells)
                                .enter()
                                .append("rect")
                                  .attr("class","tetriscells")
                                  .attr("fill",function() { return color(g); })
                                  .attr("opacity",function(d) { return tetrisOpacityMap(d.val); })
                                   .attr("rx","2")
                                   .attr("ry","2")
                                    .attr("x",function(d){return d.x;})
                                    .attr("y",function(d){return d.y;})
                                    .attr("width",cell_size)
                                    .attr("height",cell_size);
    }else{

    selectTetrisCells = selectTetrisCells.data(tetriscells, function(d) { return d.x +"-"+ d.y; });

    selectTetrisCells
                .enter()
                .append("rect")
                  .attr("class","tetriscells")
                  .attr("fill",function() { return color(g); })
                  .attr("opacity",function(d) { return tetrisOpacityMap(d.val); })
                   .attr("rx","2")
                   .attr("ry","2")
                    .attr("x",function(d){return d.x;})
                    .attr("y",function(d){return d.y;})
                    .attr("width",cell_size)
                    .attr("height",cell_size);
    }


    iterationOfMarchingSquares += 1;

    bubblePoints = bubblePoints.filter(function(x){return x.group == g;});

     var sortedBubblePoints = sortBubblePoints(bubblePoints);
     var arrayOfArrays = splitSortedBubblePoints(sortedBubblePoints);

     if(typeof prevArrayOfArraysLength[g] != "undefined"){
       for(var i = 0 ; i < prevArrayOfArraysLength[g]; i++){
           svg.select(".marchingPathGroup").selectAll(".bubble"+g+i).remove();
       }
     }

     for(var i = 0 ; i < arrayOfArrays.length; i++){
         var points = arrayOfArrays[i];
         svg.select(".marchingPathGroup").selectAll(".bubble"+g+i).remove();
         var cardinalPath = svg.select(".marchingPathGroup")
                     .selectAll(".bubble"+g+i)
                      .data([points])
                      .enter()
                      .append("path")
                        .attr("class", "bubble"+g+i)
                        .attr("d", function(d){ return curve(d); })
                         .attr("fill",function() { return color(g); })
                         .attr("opacity",groupFillOpacity);
     }

     prevArrayOfArraysLength[g] = arrayOfArrays.length;


     } // g


}

function sortBubblePoints(bubblePoints){
  var subSets = [];
  var bubblePointsCopy = bubblePoints;
  var sortedBubblePoints = [];
  sortedBubblePoints.push(bubblePointsCopy[0]);
  bubblePointsCopy = bubblePointsCopy.slice(1,bubblePoints.length);
  var id = bubblePointsCopy[0].id;

  for (var i = 0 ; i < bubblePoints.length-1; i++){

      var shortestDistance = Infinity, shortestIndex=null;
      for (var j = 0 ; j < bubblePointsCopy.length; j++){
          //calculate distance
          var dist = computeDistance(sortedBubblePoints[i],bubblePointsCopy[j]);
          if(dist<shortestDistance){
              shortestIndex = j;
              shortestDistance = dist;
          }
      }
      //console.log("sd:"+shortestDistance);
      id = bubblePointsCopy[shortestIndex].id;

      sortedBubblePoints.push(bubblePointsCopy[shortestIndex]);
      bubblePointsCopy.splice(shortestIndex,1); //remove the element
  }

 //or just take the evens to approximate the bubble
  sortedBubblePoints = sortedBubblePoints.filter(function(x,i){return (i%2==0);});

  return sortedBubblePoints;
}

function splitSortedBubblePoints(sortedBubblePoints){
    var subSets = [];
    var lastSplit = 0;
    var thresholdDist = computeDistance({x:cell_size,y:cell_size},{x:0,y:0});
    for (var i = 0; i < sortedBubblePoints.length - 1; i++){

        if (computeDistance(sortedBubblePoints[i], sortedBubblePoints[i+1]) > thresholdDist){
            subSets.push(sortedBubblePoints.slice(lastSplit, i));
            lastSplit = i+1;
        }
    }
    if(lastSplit!=sortedBubblePoints.length){
      subSets.push(sortedBubblePoints.slice(lastSplit, sortedBubblePoints.length));
    }
    return subSets;
}

function squared(a){
  return Math.pow(a,2);
}

function computeDistance(a,b){
  return Math.sqrt( squared(a.x - b.x) + squared(a.y- b.y) );
}


var zoom = d3.behavior.zoom()
                .scaleExtent([0.1,5])
                .on("zoom", redraw);

function redraw() {
  svg.attr("transform","translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

var width = 800,
    height = 800,
    r = 4;


var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-1000)
    .gravity(0.5)
    .linkDistance(function(d) { return Math.sqrt(d.value); })
    .theta(0.5)
    .size([width, height + 400]);


var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("style", "border:1px solid lightgrey;")
                              .append("svg:g")
                                .call(zoom)
                                .on("dblclick.zoom", null)
                              .append("svg:g");
svg.attr("transform","scale(" + 0.9 + ")");
svg.append("svg:rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "white");

var graph = jsonData;

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

var link = svg.append("g")
              .attr("class", "linkGroup")
                .selectAll(".link")
                  .data(graph.links)
                  .enter()
                  .append("line")
                    .attr("class", "link")
                    .style("stroke-width", 0.5);

svg.append("g")
    .attr("class", "marchingPathGroup");
svg.append("g")
    .attr("class", "marchingRectGroup");
var node = svg.append("g")
              .attr("class", "nodeGroup")
                .selectAll(".node")
                .data(graph.nodes)
                .enter()
                .append("circle")
                  .attr("group",function(d) { return d.group; })
                  .attr("name",function(d) { return d.name; })
                  .attr("class", "node")
                  .attr("r", r)
                  .style("fill", function(d) { return color(d.group); });


force.on("tick", function() {

  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("cx", function(d) {
    return d.x = Math.max(r, Math.min(width - 200, d.x));
  })
    .attr("cy", function(d) {
      return d.y = Math.max(r, Math.min(height - 200, d.y));
    });

  node.attr("cx", d => d.x);
  node.attr("cy", d => d.y);

  draw_marching_squares();

});

//draw_marching_squares();

for ( var i = 0; i < grid.width / cell_size; i += 1 ) {
  for ( var j = 0; j < grid.height / cell_size; j += 1 ) {
    allCells.push({x: i*cell_size, y: j*cell_size, width: cell_size, height: cell_size });
  } // j
} // i
/*
svg.selectAll("cells")
                .data(allCells)
                  .enter()
                  .append("rect")
                    .attr("class", "cell")
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y; })
                    .attr("width", function(d) { return d.width; })
                    .attr("height", function(d) { return d.height; });
*/

function initIsolevelSlider(){

  $(function(){
      $( "#sliderIsolevel" ).slider({min: 0.002, max: 0.004, step:0.0002, value:isolevel});
  });
  console.log(isolevel.toPrecision(2));
  var iso = isolevel.toPrecision(2)+"";
  $( "#sliderValueIsolevel" ).text(iso);

  $("#sliderIsolevel").bind( "slide", function(event, ui) { isolevel  = ui.value;
                                                            draw_marching_squares();
                                                           var iso = isolevel.toPrecision(2);
                                                           console.log(iso);
                                                          $( "#sliderValueIsolevel" ).text(iso);
  });

}

function initBubbleCellDimension(){

  $(function(){
      $( "#sliderBubbleCellDimension" ).slider({min: 2, max: 14, step:2, value:cell_size});
  });

  $( "#sliderValueBubbleCellDimension" ).text(cell_size+"px");
  $("#sliderBubbleCellDimension").bind( "slide", function(event, ui) { cell_size  = ui.value;
                                                                       draw_marching_squares();
                                                     $( "#sliderValueBubbleCellDimension" ).text(cell_size+"px");
  });

}


function updateTetrisLook(){

    if (tetrisIsOn){
      tetrisIsOn = false;
    }
    else{
      tetrisIsOn = true;
    }
    draw_marching_squares();

}

initIsolevelSlider();
initBubbleCellDimension();
