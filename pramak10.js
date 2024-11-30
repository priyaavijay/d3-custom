//map dimensions and projection
const width = document.getElementById('map').clientWidth;
const height = 600;

// const projection = d3.geoMercator().scale(150).translate([width / 2, height / 2]);
let rotate = [0, 0]; 
let rotationActive = true;  

const projection = d3.geoOrthographic()
    .scale(400)
    .translate([width / 2, height/2+100 ]);
const path = d3.geoPath().projection(projection);


const svg = d3.select("#map")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%");
// tooltip 
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("padding", "8px")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("box-shadow", "0px 2px 8px rgba(0, 0, 0, 0.5)") 
    .style("border-radius", "4px")
    .style("color", "#fff")
    .style("font-size", "12px");

const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);
svg.call(zoom);

// zoom behavior
svg.on("click", function(event) {
    if (!event.target.classList.contains('country-path')) {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        d3.selectAll('.country-path').classed('highlighted', false); 
        d3.selectAll('.influencer-bubble').remove(); 
    }
});



// Zoomed function
function zoomed(event) {
    svg.selectAll("path").attr("transform", event.transform);
    svg.selectAll("circle").attr("transform", event.transform);
   
    if (event.transform.k <= zoom.scaleExtent()[0] && !rotationActive) {
        rotationActive = true;  // Restart rotation when zooming out fully
    }
    
}
// zoom control buttons
const controls = d3.select("#map")
    .append("div")
    .attr("class", "zoom-controls");

controls.append("button")
    .attr("class", "zoom-button")
    .text("+")
    .on("click", function() {
        svg.transition().duration(500).call(
            zoom.scaleBy, 1.5 
        );
    });

controls.append("button")
    .attr("class", "zoom-button")
    .text("-")
    .on("click", function() {
        svg.transition().duration(500).call(
            zoom.scaleBy, 0.75 
        );
    });

const countryMapping = {
    "United States": "USA",
    "Côte d'Ivoire": "Ivory Coast",
    
};

d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function(worldData) {
    d3.csv("Top_Influencers.csv").then(function(data) {
        // data pre processing
        data.forEach(d => {
            d.Rank = +d.Rank;
            d['Influence Score'] = +d['Influence Score'];
            d.Followers = parseData(d.Followers); 
            d.Posts = parseData(d.Posts);
            d.Posts = +d.Posts || 0; 
        });
        
        
const totalInfluencers = data.length;
const filteredData = data.filter(d => {
    // Filtering 'Country Or Region' is  empty or 'Unknown'
    return d['Country Or Region'] && d['Country Or Region'] !== 'Unknown';
});

const influencersByCountry = d3.rollups(filteredData, 
    values => {
        const numInfluencers = values.length; 
        const totalFollowers = d3.sum(values, v => v['Followers']); 

        
        const avgInfluence = d3.mean(values, v => v['Influence Score']); 
        const totalAvgInfluence = d3.mean(filteredData, d => d['Influence Score']); 
        
        // Normalized calculation of influence score of a country as opposed to the total influencers
        const totalInfluencers = filteredData.length; 
        const normalizedAvgInfluence = (numInfluencers / totalInfluencers) *(avgInfluence/totalAvgInfluence)* 100; 

        const countryName = values[0]['Country Or Region']; 
        console.log(`Country: ${countryName}, Number of Influencers: ${numInfluencers}, Total Influencers: ${totalInfluencers}`);
        
        return {
            count: numInfluencers, 
            avgInfluence: avgInfluence, 
            normalizedAvgInfluence: normalizedAvgInfluence, 
            totalFollowers: totalFollowers, 
            influencers: values 
        };
    },
    d => countryMapping[d['Country Or Region']] || d['Country Or Region'] // Grouping by mapped country name
);

        
        const colorScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.Followers), d3.mean(data, d => d.Followers), d3.max(data, d => d.Followers)])
        .range(["#ffe6f2", "#ff66b2", "#99004d"]); 
const sizeScale = d3.scaleLinear()
.domain(d3.extent(data, d => d['Influence Score']))
.range([1, 10]);

const borderThicknessScale = d3.scaleLinear()
.domain(d3.extent(data, d => d.Posts))
.range([1, 5]); // Border thickness scale based on Posts

        const countryHighlightScale = d3.scaleLinear()
            .domain([0, d3.max(influencersByCountry, d => d[1].normalizedAvgInfluence)])
            .range([0.2, 0.7]);
          
        let currentSelectedCountry = null; 
        svg.append("path")
        .datum({type: "Sphere"}) 
        .attr("d", path)
        .attr("fill", "#62bdf1a9");
    
const countries = svg.selectAll("path")
.data(worldData.features)
.enter()
.append("path")
.attr("d", path)
.attr("fill", function(d) {
    const country = influencersByCountry.find(f => f[0] === d.properties.name);
    if (country) {
        const highlight = countryHighlightScale(country[1].count);
        return d3.interpolateYlGnBu(highlight);
    }
    return "#f0f0f0";
    
})
.attr("stroke", "#ddd")
.attr("stroke-width", 0.5)
.attr("class", "country-path") 
.on("mouseover", function(event, d) {
    const country = influencersByCountry.find(f => f[0] === d.properties.name);
    if (country) {
        const avgInfluenceScore = country[1].normalizedAvgInfluence.toFixed(2);
        const numInfluencer =  country[1].count;
        const tooltip = svg.append("text")
            .attr("id", "tooltip")
            .attr("x", d3.pointer(event)[0])
            .attr("y", d3.pointer(event)[1] - 10)
            .attr("fill", "#000")
            .style("border-radius", "4px") 
    .style("box-shadow", "0px 2px 8px rgba(0, 0, 0, 0.5)") 
            .attr("font-size", "14px");
         
        tooltip.append("tspan")
            .attr("x", d3.pointer(event)[0]) 
            .attr("dy", "1.2em") 
            .text(`${d.properties.name} - Avg Influence Score: ${avgInfluenceScore}`);

        tooltip.append("tspan")
            .attr("x", d3.pointer(event)[0])
            .attr("dy", "1.2em") 
            .text(`Top influencer count: ${numInfluencer}`);
    }
})
.on("mouseout", function() {
    d3.select("#tooltip").remove();
})
.on("click", function(event, d) {
    rotationActive = false;

    if (currentSelectedCountry === d.properties.name) {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        d3.selectAll('.country-path').classed('highlighted', false); 
        d3.selectAll('.influencer-bubble').remove(); 
        currentSelectedCountry = null; 
    } else {
        if (currentSelectedCountry) {
            d3.selectAll('.country-path').classed('highlighted', false);
        }
        const country = worldData.features.find(f => f.properties.name === d.properties.name);
        if (country) {
            const centroid = path.centroid(country); 
            const scale = 4; 
            const translateX = width / 2 - centroid[0] * scale;
            const translateY = height / 2 - centroid[1] * scale;   
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
            d3.select(this).classed('highlighted', true); 
            currentSelectedCountry = d.properties.name; 

            const countryData = influencersByCountry.find(f => f[0] === d.properties.name);
            if (countryData) {
                const influencers = countryData[1].influencers;

const simulation = d3.forceSimulation(influencers)
    .force("collide", d3.forceCollide().radius(d => sizeScale(d.Rank) + 5).iterations(10)) 
    .force("x", d3.forceX().strength(0.1).x(d => {
        if (d['Country Or Region'] === "Côte d'Ivoire" || d['Country Or Region'] === "Ivory Coast") {
            return width / 2;
        }
        
        const country = worldData.features.find(f => f.properties.name === d['Country Or Region']);
        if (country) {
            const centroid = path.centroid(country); 
            if (centroid && centroid[0] && centroid[1]) {
                return centroid[0]; 
            }
        }

        console.warn(`Centroid not found for country: ${d['Country Or Region']}. Using zoomed center position.`);
        //const transform = svg.node().__zoom;
        const transform = d3.zoomTransform(svg.node()); 
        console.log(transform)
        //return transform.x + 500; 
        return transform.x+300;
    }))
    .force("y", d3.forceY().strength(0.1).y(d => {
        if (d['Country Or Region'] === "Côte d'Ivoire" || d['Country Or Region'] === "Ivory Coast") {
            return height / 2+30; 
        }
        
        const country = worldData.features.find(f => f.properties.name === d['Country Or Region']);
        if (country) {
            const centroid = path.centroid(country); 
            if (centroid && centroid[0] && centroid[1]) {
                return centroid[1]; 
            }
        }

        
        console.warn(`Centroid not found for country: ${d['Country Or Region']}. Using zoomed center position.`);
        const transform = svg.node().__zoom; // Getting current zoom transformation

       // return transform.y + 100; 
       return transform.y+100
    }))
    .stop();

for (let i = 0; i < 300; i++) {
    simulation.tick();
}


// Creating influencer bubbles
svg.selectAll(".influencer-bubble")
    .data(influencers)
    .enter()
    .append("circle")
    .attr("class", "influencer-bubble")
    .attr("cx", d => {
        if (isNaN(d.x) || d.x === undefined || typeof d.x !== 'number') {
            const transform = svg.node().__zoom;
            return (transform.x + width / 2) / transform.k;
        }
        return d.x;
    })
    .attr("cy", d => {
        if (isNaN(d.y) || d.y === undefined || typeof d.y !== 'number') {
            const transform = svg.node().__zoom;
            return (transform.y + height / 2) / transform.k;
        }
        return d.y;
    })
    .attr("r", d => Math.max(1, sizeScale(d['Influence Score']))) 
    .attr("fill", d => colorScale(d.Followers)) 
    .attr("opacity", 0.7)
    .attr("stroke", d => d3.color(colorScale(d.Followers)).darker(0.5))
    .attr("stroke-width", d => borderThicknessScale(d.Posts)) 
    .on("mouseover", function(event, d) {
        tooltip
            .style("visibility", "visible")
            .html(`
                <strong>Name:</strong> ${d["Channel Info"]}<br>
                <strong>Followers:</strong> ${d.Followers.toLocaleString()}<br>
                <strong>Influence Score:</strong> ${d['Influence Score'].toFixed(2)}<br>
                <strong>Posts:</strong> ${d.Posts ? d.Posts.toLocaleString() : "Data not available"}
            `);
    })
    .on("mousemove", function(event) {
        tooltip
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
    });


            }
        }
    }
}); 
function updateRotation() {
    if (rotationActive) {  
        rotate[0] += 0.1; 
        projection.rotate(rotate); 
        countries.attr("d", path);
    }
}

d3.timer(updateRotation);

    });
});

function parseData(followers) {
    const suffix = followers.slice(-1);
    let number = parseFloat(followers.slice(0, -1));
    if (suffix === 'k') {
        number *= 1000;
    } else if (suffix === 'm') {
        number *= 1000000;
    } else if (suffix === 'b') {
        number *= 1000000000;
    }
    return number;
}