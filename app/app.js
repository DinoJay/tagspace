import d3 from "d3";
require("./style/style.less");

d3.select("body").append("div")
  .on("click", () => console.log("it works with es6!"))
  .text("it works!");


