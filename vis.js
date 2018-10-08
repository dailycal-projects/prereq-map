// Selects the first element that matches selector string "svg"
var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

svg.append("svg:defs").selectAll("marker")
    .data([{ id: "end-arrow", opacity: 1 }, { id: "end-arrow-fade", opacity: 0.1 }])
    .enter().append("marker")
      .attr("id", d => d.id)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 26)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999")
        .style("opacity", d => d.opacity);

// Ordinal scale to map set of categories to set of colors
// (Can use npm install d3-scale-chromatic to find color schemes that will work with d3-scale)
var color = d3.scaleOrdinal(d3.schemeCategory20);

// Creates a new force simulation
// A force is a function that modifies node positions + velocities
// .force("name") -> Assigns the force for specified name and returns this simulation
var simulation = d3.forceSimulation()
    
    // Pushes linked nodes according to desired link distance (like a spring force)
    // .id(function...) -> Returns a string to use named sources and targets
      .force("link", d3.forceLink().id(function(d) { return d.id; }))
    // Applies mutually on all nodes, i.e. a charge force that repels
    .force("charge", d3.forceManyBody())
    // Like this centers along the y-axis (?)
    // .force("xAxis",d3.forceX(width/2))
    // If 'root' then the y-value is set to 10, else it's centered around middle
    .force("y", d3.forceY(function(d) {
      return height / 1.1
      // if (d.group === 1) {
      //   d.fy = 50
      // } else {
      //   return height / 1.1
      // }
    }))
    // Treat nodes as circles with given radius, to prevent overlapping
    .force("collide", d3.forceCollide().radius(70))
    // Creates new centering force with specified x and y coordinates 
    .force("center", d3.forceCenter(width / 2, height / 2));
    
// Get a JSON file
d3.json("chem.json", function(error, graph) {
  if (error) throw error;

  var link = svg.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
      .attr("stroke-width", function(d) { return 5; })
      // .attr("stroke", function(d) { return color(d.group; )})
    .attr('marker-end', 'url(#end-arrow)');


  var node = svg.append("g")
      .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
      .attr("r", 35)
      .attr("fill", function(d) { return color(d.group); })
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
      .on("mouseover", fade(0.1))
      .on("mouseout", fade(1));

  node.append("title")
      .text(function(d) { return d.title; });

  // Create a selection label
  // D3 data-join to add text-elements and set label-text
  var label = svg.selectAll("text")
      .data(graph.nodes)
      .enter()
      .append("text")
      .text(function (d) { return d.name; })
      .style("text-anchor)", "middle")
      .style("fill", "#000")
      .style("font-family", "Arial")
      .style("font-size", 11.5);

  var tip;
    svg.on("click", function(){
      if (tip) tip.remove();
    });
    node.on("click", function(d){
      d3.event.stopPropagation(); 
    
      if (tip) tip.remove();
      
      tip  = svg.append("g")
        .attr("transform", "translate(" + 0  + "," + 0 + ")");
        
      var rect = tip.append("rect")
        .style("fill", "white");

      tip.append("text")
        .text("Prerequisites: " + d.details)
        .attr("dy", "10em")
        .attr("x", 5);
      
      var bbox = tip.node().getBBox();
      rect.attr("width", bbox.width + 15)
          .attr("height", bbox.height + 15)
    });

  simulation
      .nodes(graph.nodes)
      .on("tick", ticked);

  simulation.force("link")
      .links(graph.links);

  function ticked() {
    node
        .attr("cx", function(d) { return d.x = Math.max(node.attr("r"), Math.min(width - node.attr("r"), d.x)); })
        .attr("cy", function(d) { return d.y = Math.max(node.attr("r"), Math.min(height - node.attr("r"), d.y)); });

    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    
    // Position labels by setting x and y of text element according to x and y value of graph.nodes element
    label
        .attr("x", function(d) { return d.x - (node.attr("r") - 8); })
        .attr("y", function(d) { return d.y + 5; });
  }

  // Build a dictionary of nodes that are linked
  var linkedByIndex = {};
    graph.links.forEach(function(d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
  });

  function isConnected(a, b) {
      return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
  } 


  // Fade nodes on hover
    function fade(opacity) {
        return function(d) {
            // check all other nodes to see if they're connected
            // to this one. if so, keep the opacity at 1, otherwise
            // fade
            node.style("stroke-opacity", function(o) {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            node.style("fill-opacity", function(o) {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            // also style link/arrow accordingly
            link.style('stroke-opacity', o => (o.source === d || o.target === d ? 1 : opacity));
            link.attr('marker-end', o => (opacity === 1 || o.source === d || o.target === d ? 'url(#end-arrow)' : 'url(#end-arrow-fade)'));
        };
    }
});

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}