const width = 700, height = 500;

// Variáveis globais para controlar o modo de visualização
let currentMode = "brasil"; // "brasil" ou "estado"
let currentUF = null;

// Formatação para valores
const formatAbs = d3.formatLocale({
  decimal: ",",
  thousands: ".",
  grouping: [3],
  currency: ["", ""]
}).format(",.0f");

// Mapeamento de UFs para nomes
const estados = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
  "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
  "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul", "MG": "Minas Gerais",
  "PA": "Pará", "PB": "Paraíba", "PR": "Paraná", "PE": "Pernambuco", "PI": "Piauí",
  "RJ": "Rio de Janeiro", "RN": "Rio de Janeiro", "RS": "Rio Grande do Sul",
  "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina", "SP": "São Paulo",
  "SE": "Sergipe", "TO": "Tocantins"
};

// Arquivos GeoJSON para municípios
const stateGeojsonFiles = {
  "AC": "./geojson/br_cities/geojs-12-mun.json",
  "AM": "./geojson/br_cities/geojs-13-mun.json",
  "AP": "./geojson/br_cities/geojs-16-mun.json",
  "PA": "./geojson/br_cities/geojs-15-mun.json",
  "RO": "./geojson/br_cities/geojs-11-mun.json",
  "RR": "./geojson/br_cities/geojs-14-mun.json",
  "TO": "./geojson/br_cities/geojs-17-mun.json",
  "AL": "./geojson/br_cities/geojs-27-mun.json",
  "BA": "./geojson/br_cities/geojs-29-mun.json",
  "CE": "./geojson/br_cities/geojs-23-mun.json",
  "MA": "./geojson/br_cities/geojs-21-mun.json",
  "PB": "./geojson/br_cities/geojs-25-mun.json",
  "PE": "./geojson/br_cities/geojs-26-mun.json",
  "PI": "./geojson/br_cities/geojs-22-mun.json",
  "RN": "./geojson/br_cities/geojs-24-mun.json",
  "SE": "./geojson/br_cities/geojs-28-mun.json",
  "ES": "./geojson/br_cities/geojs-32-mun.json",
  "MG": "./geojson/br_cities/geojs-31-mun.json",
  "RJ": "./geojson/br_cities/geojs-33-mun.json",
  "SP": "./geojson/br_cities/geojs-35-mun.json",
  "PR": "./geojson/br_cities/geojs-41-mun.json",
  "RS": "./geojson/br_cities/geojs-43-mun.json",
  "SC": "./geojson/br_cities/geojs-42-mun.json",
  "DF": "./geojson/br_cities/geojs-53-mun.json",
  "GO": "./geojson/br_cities/geojs-52-mun.json",
  "MT": "./geojson/br_cities/geojs-51-mun.json",
  "MS": "./geojson/br_cities/geojs-50-mun.json"
};

// Dados CSV
let csvData;
d3.csv("./db_final.csv").then(function(data) {
  data.forEach(d => { d.codigo_municipio = d.codigo_municipio.toString(); });
  csvData = data;
  initBrasilMap();
});

// Tooltip
const tooltip = d3.select(".tooltip");

// =======================
// VISÃO DO BRASIL
// =======================
function initBrasilMap() {
  currentMode = "brasil";
  currentUF = null;
  d3.json("./geojson/br_states.json").then(function(geoData) {
     // Popula o dropdown de ano usando os filtros da seção regional
     const anos = Array.from(new Set(csvData.map(d => +d.ANO))).sort((a, b) => a - b);
     const dropdownAno = d3.select("#filtro-ano");
     dropdownAno.selectAll("option").remove();
     anos.forEach(a => dropdownAno.append("option").attr("value", a).text(a));
     const anoInicial = anos[anos.length - 1];
     dropdownAno.property("value", anoInicial);
     
     // Registra eventos dos filtros, de acordo com o modo atual
     d3.select("#filtro-ano").on("change", () => {
       if (currentMode === "brasil") updateBrasilMap(geoData);
       else if (currentMode === "estado") updateEstadoMap(currentUF);
     });
     d3.select("#filtro-sexo").on("change", () => {
       if (currentMode === "brasil") updateBrasilMap(geoData);
       else if (currentMode === "estado") updateEstadoMap(currentUF);
     });
     d3.select("#filtro-nutricional").on("change", () => {
       if (currentMode === "brasil") updateBrasilMap(geoData);
       else if (currentMode === "estado") updateEstadoMap(currentUF);
     });
     
     // Cria o SVG no container regional
     let svgBrasil = d3.select("#mapaRegional").select("svg");
     if (svgBrasil.empty()) {
       svgBrasil = d3.select("#mapaRegional").append("svg")
         .attr("width", width)
         .attr("height", height);
     }
     updateBrasilMap(geoData);
  });
}

function getColorScale(sexo, minVal, maxVal) {
  const gradientes = {
    "Fem": ["#FFF0F5", "#DC143C"],
    "Masc": ["#E0FFFF", "#4169E1"],
    "Todos": ["#E6E6FA", "#a43377"]
  };
  const [startColor, endColor] = gradientes[sexo] || gradientes["Todos"];
  return d3.scaleLinear().domain([minVal, maxVal]).range([startColor, endColor]);
}
function getHoverColorScale(minVal, maxVal) {
  return d3.scaleLinear().domain([minVal, maxVal * 0.6, maxVal]).range(["#E0FFE0", "#ADFF2F", "#00FF00"]);
}

function updateBrasilMap(geoData) {
  const filtroAno = d3.select("#filtro-ano").property("value");
  const filtroSexo = d3.select("#filtro-sexo").property("value");
  const filtroNutricional = d3.select("#filtro-nutricional").property("value");
  
  const allStateData = csvData.filter(d =>
     +d.ANO === +filtroAno && d.fase_vida === "adulto"
  );
  
  const valoresMapa = new Map();
  let stateAggregates = new Map();
  if (filtroNutricional === "Total") {
     if (filtroSexo === "Todos") {
        allStateData.forEach(d => {
          const uf = d.UF;
          const sumVal = (+d.baixo_peso) + (+d.eutrofico) + (+d.sobrepeso) + (+d.obesidade_G_1) + (+d.obesidade_G_2) + (+d.obesidade_G_3);
          valoresMapa.set(uf, (valoresMapa.get(uf) || 0) + sumVal);
          if (!stateAggregates.has(uf)) stateAggregates.set(uf, { total: 0, fem: 0, masc: 0 });
          const agg = stateAggregates.get(uf);
          agg.total += sumVal;
          if(d.SEXO === "Fem") agg.fem += sumVal;
          else if(d.SEXO === "Masc") agg.masc += sumVal;
        });
     } else {
        allStateData.filter(d => d.SEXO === filtroSexo).forEach(d => {
          const uf = d.UF;
          const sumVal = (+d.baixo_peso) + (+d.eutrofico) + (+d.sobrepeso) + (+d.obesidade_G_1) + (+d.obesidade_G_2) + (+d.obesidade_G_3);
          valoresMapa.set(uf, (valoresMapa.get(uf) || 0) + sumVal);
          if (!stateAggregates.has(uf)) stateAggregates.set(uf, { total: 0 });
          stateAggregates.get(uf).total += sumVal;
        });
     }
  } else {
     if (filtroSexo === "Todos") {
         // Para "Todos": agregamos por UF
         const aggregator = d3.rollup(
         allStateData,
         v => {
            const totalSum = d3.sum(v, d => (+d.baixo_peso) + (+d.eutrofico) + (+d.sobrepeso) +
                                             (+d.obesidade_G_1) + (+d.obesidade_G_2) + (+d.obesidade_G_3));
            const nutrientSum = d3.sum(v, d => +d[filtroNutricional]);
            return totalSum > 0 ? (nutrientSum / totalSum) * 100 : 0;
            },
         d => d.UF
         );
         aggregator.forEach((val, uf) => {
            valoresMapa.set(uf, val);
         });
        allStateData.forEach(d => {
          const uf = d.UF;
          const nutrient = +d[filtroNutricional];
          const sumVal = (+d.baixo_peso) + (+d.eutrofico) + (+d.sobrepeso) + (+d.obesidade_G_1) + (+d.obesidade_G_2) + (+d.obesidade_G_3);
         if (!stateAggregates.has(uf)) stateAggregates.set(uf, { total: 0, fem: 0, masc: 0 });
          const agg = stateAggregates.get(uf);
          agg.total += sumVal;
          if(d.SEXO === "Fem") agg.fem += nutrient;
          else if(d.SEXO === "Masc") agg.masc += nutrient;
        });
     } else {
      // Para filtroSexo "Feminino" ou "Masculino": use rollup para porcentagem
      const aggregator = d3.rollup(
         allStateData.filter(d => d.SEXO === filtroSexo),
         v => {
           const totalSum = d3.sum(v, d => (+d.baixo_peso) + (+d.eutrofico) + (+d.sobrepeso) +
                                           (+d.obesidade_G_1) + (+d.obesidade_G_2) + (+d.obesidade_G_3));
           const nutrientSum = d3.sum(v, d => +d[filtroNutricional]);
           return totalSum > 0 ? (nutrientSum / totalSum) * 100 : 0;
         },
         d => d.UF
       );
       aggregator.forEach((val, uf) => {
          valoresMapa.set(uf, val);
       });
       // Tooltip aggregator para sexo específico (não há separação por sexo, pois é único)
       const tooltipAggregator = d3.rollup(
         allStateData.filter(d => d.SEXO === filtroSexo),
         v => {
           return {
             total: d3.sum(v, d => (+d.baixo_peso) + (+d.eutrofico) + (+d.sobrepeso) +
                                   (+d.obesidade_G_1) + (+d.obesidade_G_2) + (+d.obesidade_G_3)),
             nutrient: d3.sum(v, d => +d[filtroNutricional])
           };
         },
         d => d.UF
       );
       tooltipAggregator.forEach((val, uf) => {
          stateAggregates.set(uf, val);
       });
     }
   }
   
   const values = Array.from(valoresMapa.values());
   const maxVal = d3.max(values);
   const minVal = d3.min(values);inVal = Math.min(...Array.from(valoresMapa.values()));
  
  const colorScale = getColorScale(filtroSexo, minVal, maxVal);
  
  geoData.features.forEach(feature => {
     const uf = feature.id;
     feature.properties.value = valoresMapa.get(uf) || 0;
  });
  
  const projection = d3.geoMercator().scale(700).center([-55, -14]).translate([width/2, height/2]);
  const path = d3.geoPath().projection(projection);
  
  let svgBrasil = d3.select("#mapaRegional").select("svg");
  if (svgBrasil.empty()) {
    svgBrasil = d3.select("#mapaRegional").append("svg")
      .attr("width", width)
      .attr("height", height);
  }
  svgBrasil.selectAll("path")
     .data(geoData.features)
     .join("path")
     .attr("class", "state")
     .attr("d", path)
     .attr("fill", d => {
        const val = valoresMapa.get(d.id);
        return val !== undefined ? colorScale(val) : "#ccc";
     })
     .attr("stroke", { "Todos": "#2E8B57", "Fem": "#4682B4", "Masc": "#DB7093" }[filtroSexo] || "#ccc")
     .attr("stroke-width", 1)
     .on("mouseover", function(event, d) {
        const nomeEstado = estados[d.id] || d.id;
        let htmlContent = "";
        const agg = stateAggregates.get(d.id) || {};
        if (filtroNutricional === "Total") {
          if (filtroSexo === "Todos") {
            const total = agg.total || 0;
            const fem = agg.fem || 0;
            const masc = agg.masc || 0;
            const percFem = total > 0 ? (fem/total)*100 : 0;
            const percMasc = total > 0 ? (masc/total)*100 : 0;
            htmlContent = `<strong>${nomeEstado}</strong><br>
               <div style="font-size:15px;">
                  Entrevistados: ${formatAbs(total)}<br>
                  <span style="color:#DC143C;">Feminino: ${percFem.toFixed(1)}%</span><br>
                  <span style="color:#4169E1;">Masculino: ${percMasc.toFixed(1)}%</span>
               </div>`;
          } else {
            const total = agg.total || 0;
            htmlContent = `<strong>${nomeEstado}</strong>: <span style="font-size:15px;">${formatAbs(total)}</span>`;
          }
        } else {
          if (filtroSexo === "Todos") {
            const total = agg.total || 0;
            const fem = agg.fem || 0;
            const masc = agg.masc || 0;
            const nutrientSum = fem + masc;
            const statePerc = total > 0 ? (nutrientSum/total)*100 : 0;
            const percFem = nutrientSum > 0 ? (fem/nutrientSum)*100 : 0;
            const percMasc = nutrientSum > 0 ? (masc/nutrientSum)*100 : 0;
            htmlContent = `<strong>${nomeEstado}</strong>:<br>
               <div style="font-size:15px;">
                  ${statePerc.toFixed(1)}%<br>
                  <span style="color:#DC143C;">Feminino: ${percFem.toFixed(1)}%</span><br>
                  <span style="color:#4169E1;">Masculino: ${percMasc.toFixed(1)}%</span>
               </div>`;
          } else {
            const total = agg.total || 0;
            const nutrientVal = agg.nutrient || 0;
            const perc = total > 0 ? (nutrientVal/total)*100 : 0;
            htmlContent = `<strong>${nomeEstado}</strong>:<br>
               <div style="font-size:15px;">${perc.toFixed(1)}%</div>`;
          }
        }
        tooltip.style("opacity", 1)
               .html(htmlContent)
               .style("left", (event.clientX + 5) + "px")
               .style("top", (event.clientY - 28) + "px");
        d3.select(this).attr("stroke-width", 2);
     })
     .on("mouseout", function(event, d) {
        tooltip.style("opacity", 0);
        d3.select(this).attr("stroke-width", 1);
     })
     .on("click", function(event, d) {
        loadEstadoMap(d.id);
     });
  
  // Legenda para a visão nacional
  const legendContainer = d3.select("#legendRegional");
  legendContainer.selectAll("*").remove();
  const legendHeight = 200, legendWidth = 20;
  const legendSvg = legendContainer.append("svg")
     .attr("width", legendWidth + 100)
     .attr("height", legendHeight + 100);
  
  const grad = legendSvg.append("defs")
     .append("linearGradient")
     .attr("id", "legend-gradient")
     .attr("x1", "0%")
     .attr("y1", "100%")
     .attr("x2", "0%")
     .attr("y2", "0%");
  
  grad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(minVal));
  grad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxVal));
  
  legendSvg.append("rect")
     .attr("x", 10)
     .attr("y", 10)
     .attr("width", legendWidth)
     .attr("height", legendHeight)
     .style("fill", "url(#legend-gradient)");
  
  const legendScale = d3.scaleLinear().domain([minVal, maxVal]).range([legendHeight, 0]);
  const legendAxis = d3.axisRight(legendScale)
     .ticks(4)
     .tickFormat(d => filtroNutricional === "Total" ? formatAbs(d) : `${d.toFixed(0)}%`);
  
  legendSvg.append("g")
     .attr("transform", `translate(${legendWidth + 20}, 10)`)
     .call(legendAxis);
}

// =======================
// VISÃO ESTADUAL (USANDO OS MESMOS CONTAINERS)
// =======================
function loadEstadoMap(uf) {
  currentMode = "estado";
  currentUF = uf;
  // Limpa o container e insere um título para a visualização estadual
  d3.select("#mapaRegional").html("");
  d3.select("#legendRegional").html("");
  d3.select("#mapaRegional")
    .insert("h2", ":first-child")
    .text(`${estados[uf]}`)
    .classed("text-center font-bold", true);
  updateEstadoMap(uf);
}

function updateEstadoMap(uf) {
  const selectedYear = d3.select("#filtro-ano").property("value");
  const selectedSexo = d3.select("#filtro-sexo").property("value");
  const selectedNutricao = d3.select("#filtro-nutricional").property("value");
  
  const geojsonFile = stateGeojsonFiles[uf];
  d3.json(geojsonFile).then(function(geo) {
     const stateCSV = csvData.filter(d => d.UF === uf && d.fase_vida === "adulto");
     let filtered = stateCSV.filter(d => d.ANO === selectedYear);
     if (selectedSexo !== "Todos") {
        filtered = filtered.filter(d => d.SEXO === selectedSexo);
     }
     
     let agg;
     if (selectedNutricao === "Total") {
        agg = d3.rollup(filtered,
           v => d3.sum(v, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3)),
           d => d.codigo_municipio
        );
     } else {
        agg = d3.rollup(filtered,
           v => {
              const sumCat = d3.sum(v, d => +d[selectedNutricao]);
              const cityTotal = d3.sum(v, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3));
              return cityTotal > 0 ? (sumCat / cityTotal) * 100 : 0;
           },
           d => d.codigo_municipio
        );
     }
     
     const values = Array.from(agg.values());
     const minVal = d3.min(values);
     const maxVal = d3.max(values);
     
     const colorScale = getColorScale(selectedSexo, minVal, maxVal);
     const borderColor = { "Todos": "#2E8B57", "Fem": "#4682B4", "Masc": "#DB7093" }[selectedSexo] || "#ccc";
     
     geo.features.forEach(feature => {
        const muniCode = feature.properties.id || feature.properties.CODMUN || feature.properties.cod_mun;
        feature.properties.value = agg.get(muniCode) || 0;
     });
     
     let svgEstado = d3.select("#mapaRegional").select("svg");
     if (svgEstado.empty()) {
       svgEstado = d3.select("#mapaRegional").append("svg")
         .attr("width", width)
         .attr("height", height);
     }
     svgEstado.selectAll("path")
        .data(geo.features)
        .join("path")
        .attr("class", "municipio")
        .attr("d", d3.geoPath().projection(d3.geoMercator().fitSize([width, height], geo)))
        .attr("fill", d => {
           const val = agg.get(d.properties.id || d.properties.CODMUN || d.properties.cod_mun) || 0;
           return val === 0 ? "#ccc" : colorScale(val);
        })
        .attr("stroke", borderColor)
        .attr("stroke-width", 1);
     
     // Pré-agrega dados para os tooltips dos municípios
     const stateAllData = stateCSV.filter(d => d.ANO === selectedYear && d.UF === uf);
     let tooltipLookup, totalSexState;
     if (selectedNutricao === "Total") {
        if (selectedSexo === "Todos") {
           tooltipLookup = d3.rollup(stateAllData, v => {
              return {
                total: d3.sum(v, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3)),
                fem: d3.sum(v.filter(d => d.SEXO === "Fem"), d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3)),
                masc: d3.sum(v.filter(d => d.SEXO === "Masc"), d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3))
              };
           }, d => d.codigo_municipio);
        } else {
           const filteredData = stateAllData.filter(d => d.SEXO === selectedSexo);
           tooltipLookup = d3.rollup(filteredData, v => d3.sum(v, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3)), d => d.codigo_municipio);
           totalSexState = d3.sum(filteredData, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3));
        }
     } else {
        if (selectedSexo === "Todos") {
           tooltipLookup = d3.rollup(stateAllData, v => {
              return {
                nutrient: d3.sum(v, d => +d[selectedNutricao]),
                total: d3.sum(v, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3)),
                fem: d3.sum(v.filter(d => d.SEXO === "Fem"), d => +d[selectedNutricao]),
                masc: d3.sum(v.filter(d => d.SEXO === "Masc"), d => +d[selectedNutricao])
              };
           }, d => d.codigo_municipio);
        } else {
           const filteredData = stateAllData.filter(d => d.SEXO === selectedSexo);
           tooltipLookup = d3.rollup(filteredData, v => {
              return {
                nutrient: d3.sum(v, d => +d[selectedNutricao]),
                total: d3.sum(v, d => (+d.baixo_peso)+(+d.eutrofico)+(+d.sobrepeso)+(+d.obesidade_G_1)+(+d.obesidade_G_2)+(+d.obesidade_G_3))
              };
           }, d => d.codigo_municipio);
        }
     }
     
     svgEstado.selectAll("path")
        .on("mouseover", function(event, d) {
           let htmlContent = "";
           const muniCode = d.properties.id || d.properties.CODMUN || d.properties.cod_mun;
           if (selectedNutricao === "Total") {
              if (selectedSexo === "Todos") {
                 const agg = tooltipLookup.get(muniCode) || {total:0, fem:0, masc:0};
                 const total = agg.total;
                 const fem = agg.fem;
                 const masc = agg.masc;
                 const percFem = total > 0 ? (fem/total)*100 : 0;
                 const percMasc = total > 0 ? (masc/total)*100 : 0;
                 htmlContent = `<strong>${d.properties.name}</strong><br>
                    <div style="font-size:15px;">
                       Entrevistados: ${formatAbs(total)}<br>
                       <span style="color:#DC143C;">Feminino: ${percFem.toFixed(1)}%</span><br>
                       <span style="color:#4169E1;">Masculino: ${percMasc.toFixed(1)}%</span>
                    </div>`;
              } else {
                 const total = tooltipLookup.get(muniCode) || 0;
                 const perc = totalSexState > 0 ? (total/totalSexState)*100 : 0;
                 htmlContent = `<strong>${d.properties.name}</strong>: <span style="font-size:15px;">${perc.toFixed(1)}%<br>
                    Entrevistados: ${formatAbs(total)}</span>`;
              }
           } else {
              if (selectedSexo === "Todos") {
                 const agg = tooltipLookup.get(muniCode) || {nutrient:0, total:0, fem:0, masc:0};
                 const total = agg.total;
                 const nutrientSum = agg.nutrient;
                 const statePerc = total > 0 ? (nutrientSum/total)*100 : 0;
                 const percFem = (agg.fem + agg.masc) > 0 ? (agg.fem/(agg.fem+agg.masc))*100 : 0;
                 const percMasc = (agg.fem + agg.masc) > 0 ? (agg.masc/(agg.fem+agg.masc))*100 : 0;
                 htmlContent = `<strong>${d.properties.name}</strong>: <span style="font-size:15px;">${statePerc.toFixed(1)}%<br>
                    <span style="color:#DC143C;">Feminino: ${percFem.toFixed(1)}%</span><br>
                    <span style="color:#4169E1;">Masculino: ${percMasc.toFixed(1)}%</span></span>`;
              } else {
                 const agg = tooltipLookup.get(muniCode) || {nutrient:0, total:0};
                 const total = agg.total;
                 const nutrientVal = agg.nutrient;
                 const perc = total > 0 ? (nutrientVal/total)*100 : 0;
                 htmlContent = `<strong>${d.properties.name}</strong>: ${perc.toFixed(1)}%`;
              }
           }
           tooltip.style("opacity", 1)
                  .html(htmlContent)
                  .style("left", (event.clientX + 5) + "px")
                  .style("top", (event.clientY - 28) + "px");
           d3.select(this).attr("stroke-width", 2);
        })
        .on("mouseout", function(event, d) {
           tooltip.style("opacity", 0);
           d3.select(this).attr("stroke-width", 1);
        });
     
     // Legenda para a visão estadual
     const legendContainer = d3.select("#legendRegional");
     legendContainer.selectAll("*").remove();
     const legendHeight = 200, legendWidth = 20;
     const legendSvg = legendContainer.append("svg")
        .attr("width", legendWidth + 100)
        .attr("height", legendHeight);
     
     const gradEstado = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "estado-legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");
     
     gradEstado.append("stop").attr("offset", "0%").attr("stop-color", colorScale(minVal));
     gradEstado.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxVal));
     
     legendSvg.append("rect")
        .attr("x", 10)
        .attr("y", 10)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#estado-legend-gradient)");
     
     const legendScaleEstado = d3.scaleLinear().domain([minVal, maxVal]).range([legendHeight, 0]);
     const legendAxisEstado = d3.axisRight(legendScaleEstado)
        .ticks(4)
        .tickFormat(d => selectedNutricao === "Total" ? formatAbs(d) : `${d.toFixed(0)}%`);
     
     legendSvg.append("g")
        .attr("transform", `translate(${legendWidth + 10}, 10)`)
        .call(legendAxisEstado);
  });
}

// Função para voltar à visão do Brasil (restaura a visualização nacional)
function voltar() {
  currentMode = "brasil";
  currentUF = null;
  d3.select("#mapaRegional").html("");
  d3.select("#legendRegional").html("");
  initBrasilMap();
}

// Registra um evento de clique com o botão direito no container para voltar à visão nacional
d3.select("#mapaRegional").on("contextmenu", function(event) {
  event.preventDefault();
  voltar();
});
