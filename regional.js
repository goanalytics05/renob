const width = 700, height = 500;

// Variáveis globais para controlar o modo de visualização
let currentMode = "country"; // "brasil" ou "estado"
let currentUF = null;
let lastGeoDataCountry, lastGeoDataBrasil;

const selectFaseReg = document.getElementById("filtro-fasevida");
const selectNutricional = document.getElementById("filtroNutricional");

//gradientes dos filtros
const gradientes = {
   "Fem": ["#FFF0F5", "#DC143C"],
   "Masc": ["#E0FFFF", "#4169E1"],
   "Todos": ["#e6fae6", "#33a460"]
 };

// Formatação para valores
const formatAbs = d3.formatLocale({
   decimal: ",",
   thousands: ".",
   grouping: [3],
   currency: ["", ""]
 }).format(",.0f");

 // cores das visualizações
function getCountryColor(sexo) {
   const [start, end] = gradientes[sexo] || gradientes["Todos"];
   return d3.interpolateRgb(start, end)(0.5);
 }

function getColorScale(sexo, minVal, maxVal) {
   const [startColor, endColor] = gradientes[sexo] || gradientes["Todos"];
 return d3.scaleLinear().domain([minVal, maxVal]).range([startColor, endColor]);
}
function getHoverColorScale(minVal, maxVal) {
 return d3.scaleLinear().domain([minVal, maxVal * 0.6, maxVal]).range(["#E0FFE0", "#ADFF2F", "#00FF00"]);
}

// Transcrição para os filtros
const nomesIndicadoresAdultoR = {
   baixo_peso: "Baixo Peso",
   eutrofico: "Eutrófico",
   sobrepeso: "Sobrepeso",
   obesidade_G_1: "Obesidade Grau I",
   obesidade_G_2: "Obesidade Grau II",
   obesidade_G_3: "Obesidade Grau III"
};

const nomesIndicadoresAdolescenteR = {
   magreza_acentuada: "Magreza Acentuada",
   magreza: "Magreza",
   obesidade: "Obesidade",
   obesidade_grave: "Obesidade Grave"
};

// Mapeamento de UFs para nomes
const estados = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
  "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
  "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul", "MG": "Minas Gerais",
  "PA": "Pará", "PB": "Paraíba", "PR": "Paraná", "PE": "Pernambuco", "PI": "Piauí",
  "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RS": "Rio Grande do Sul",
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
  // popula o SELECT de anos
  const anos = Array.from(new Set(data.map(d => d.ANO))).sort((a, b) => a - b);
  const selectAno = d3.select("#filtro-ano");
  selectAno.selectAll("option")
           .data(anos)
           .enter()
           .append("option")
             .attr("value", d => d)
             .text(d => d);
  // define o ano inicial como o último
  selectAno.property("value", anos[anos.length - 1]);

  // c) popula o SELECT de fase de vida
  // supondo que seus dados só contenham "adulto" e "adolescente"
  const fases = Array.from(new Set(data.map(d => d.fase_vida)));
  const selectFase = d3.select("#filtro-fasevida");
  selectFase.selectAll("option")
             .data(fases)
             .enter()
             .append("option")
               .attr("value", d => d)
               .text(d => d.charAt(0).toUpperCase() + d.slice(1));
  // define fase inicial como, por exemplo, "adulto"
  selectFase.property("value", "adulto");

  // d) popula o SELECT de indicadores nutricionais
  // usamos o objeto de nomes amigáveis para ordenar e listar “Total” + chaves
  const nomesObj = selectFase.property("value") === "adulto"
    ? nomesIndicadoresAdultoR
    : nomesIndicadoresAdolescenteR;
  const indicadores = [...Object.keys(nomesObj)];
  const selectNutr = d3.select("#filtroNutricional");
  selectNutr.selectAll("option")
            .data(indicadores)
            .enter()
            .append("option")
              .attr("value", d => d)
              .text(d => d === "Total" ? "Todos" : nomesObj[d]);
  // define indicador inicial como "Total"
  selectNutr.property("value", "baixo_peso");

  // 2) Finalmente, chama a inicialização da primeira view (país)
  initCountryMap();
});

// Quadro de Entrevistados
function atualizarQuadroRegional() {
   // 1. Captura valores dos filtros
   const anoSel         = +d3.select("#filtro-ano").property("value");
   const sexoSel        = d3.select("#filtro-sexo").property("value");
   const faseSel        = d3.select("#filtro-fasevida").property("value");
   const nutricionalSel = d3.select("#filtroNutricional").property("value");
 
   // 2. Filtra a base por ano, fase e (se for estado) UF
   let arr = csvData.filter(d =>
     +d.ANO === anoSel &&
     d.fase_vida === faseSel &&
     (currentMode !== "estado" || d.UF === currentUF)
   );
 
   // 3. Filtra por gênero, se necessário
   if (sexoSel !== "Todos") {
     arr = arr.filter(d => d.SEXO === sexoSel);
   }
 
   // 4. Filtra por estado nutricional — já está correto:
   if (nutricionalSel !== "Total") {
     arr = arr.filter(d => +d[nutricionalSel] > 0);
   }
 
   // 5. Soma os valores **da própria coluna nutricional**:
   let totalFem, totalMasc;
   if (nutricionalSel === "Total") {
     // para “Total”, somamos todas as categorias (ou você pode somar d.total)
     totalFem  = d3.sum(arr.filter(d => d.SEXO === "Fem"),  d => +d.total);
     totalMasc = d3.sum(arr.filter(d => d.SEXO === "Masc"), d => +d.total);
   } else {
     totalFem  = d3.sum(arr.filter(d => d.SEXO === "Fem"),  d => +d[nutricionalSel]);
     totalMasc = d3.sum(arr.filter(d => d.SEXO === "Masc"), d => +d[nutricionalSel]);
   }
   const totalAll = totalFem + totalMasc;
 
   // 6. Atualiza o DOM
   document.getElementById("valorMulheresRegional").textContent = totalFem.toLocaleString("pt-BR");
   document.getElementById("valorHomensRegional"  ).textContent = totalMasc.toLocaleString("pt-BR");
   document.getElementById("valorTodosRegional"  ).textContent = totalAll.toLocaleString("pt-BR");
}
 
 

// Tooltip
const tooltip = d3.select(".tooltip");

// =======================
// Função para atualizar o título da seção Regional
// =======================
function atualizarTituloRegional() {
   const ano = d3.select("#filtro-ano").property("value");
   const sexo = d3.select("#filtro-sexo").property("value");
   const nutricional = d3.select("#filtroNutricional").property("value");
   const fase = d3.select("#filtro-fasevida").property("value");
   const lugar = currentMode === "estado" ? estados[currentUF] : "Brasil";
   // Construir string do título
   const titulo = `Mapeamento Regional de ${nomeAmigavel[nutricional] || nutricional} em ${faseLabel[fase]} ${sexoLabel[sexo]} - ${lugar} ${ano}`;
   document.getElementById("tituloRegional").textContent = titulo;
 }

 // =======================
 // Função para atualizar Estado Nutricional a partir da fase da vida
 // =======================
function atualizarEstadoNutricionalRegional() {
   const faseVidaReg = selectFaseReg.value;
   if (!faseVidaReg) return;

   const indicadorReg = faseVidaReg === "adulto" 
       ? nomesIndicadoresAdultoR 
       : nomesIndicadoresAdolescenteR;

   selectNutricional.innerHTML = Object.entries(indicadorReg)
       .map(([valorR, nomeExibicaoR]) => `<option value="${valorR}">${nomeExibicaoR}</option>`)
       .join("");
}

// =======================
// FUNÇÃO INICIAL: VISÃO DO PAÍS
// =======================
function initCountryMap() {

   const svg = d3.select("#mapaRegional svg");
   svg.selectAll("path.state, path.municipio").remove();

   // limpa qualquer títulos/alertas de visualizações anteriores
   d3.select("#mapaRegional").selectAll("h2, .alerta-mapa").remove();

   currentMode = "country";
   currentUF = null;

   d3.json("./geojson/brazil.json").then(function(geoData) {
     lastGeoDataCountry = geoData;
     // popular dropdown de ano
     atualizarQuadroRegional();
     atualizarTituloRegional();
 
     // Quando mudar a fase de vida, atualiza também o dropdown de indicadores
     d3.select("#filtro-fasevida").on("change", () => {
         atualizarEstadoNutricionalRegional();
         atualizarQuadroRegional();
         updateCountryMap(lastGeoDataCountry);
         atualizarTituloRegional();
     });
      
     // Para ano, sexo e nutricional: NÃO repopular o select de nutricionais (só recalcula mapa/quadro/título)
     ["#filtro-ano", "#filtro-sexo", "#filtroNutricional"].forEach(sel => {
         d3.select(sel).on("change", () => {
         atualizarQuadroRegional();
         updateCountryMap(lastGeoDataCountry);
         atualizarTituloRegional();
         });
     });
 
     // criar SVG se não existir
     let svg = d3.select("#mapaRegional svg");
     if (svg.empty()) {
       svg = d3.select("#mapaRegional").append("svg").attr("width", width).attr("height", height);
     }
 
     // desenhar
     updateCountryMap(geoData);

     // =============================
     // ALERTA NA VISÃO NACIONAL
     // =============================
     d3.select("#mapaRegional")
     .append("div")
     .attr("class", "alerta-mapa")
     .style("text-align","center")
     .style("margin-top","8px")
     .style("font-size","14px")
     .style("color", "#aa0000")
     .text("⚠️Clique com o botão esquerdo do mouse no mapa para visualizar os estados");

   });
 }
 
 function updateCountryMap(geoData) {
   const filtroAno = +d3.select("#filtro-ano").property("value");
   const filtroSexo = d3.select("#filtro-sexo").property("value");
   const filtroFase = d3.select("#filtro-fasevida").property("value");
   const filtroNutr = d3.select("#filtroNutricional").property("value");
 
   // recalcula escala e translação para ocupar 100% da área
   const projection = d3.geoMercator()
   .fitSize([width, height], geoData);
   const path = d3.geoPath().projection(projection);


   let svg = d3.select("#mapaRegional svg");
 
   // ————————————————
   // 1) Nome amigável do indicador
   const nomesIndicadores = filtroFase === "adulto"
   ? nomesIndicadoresAdultoR
   : nomesIndicadoresAdolescenteR;
   const nutricionalName = nomesIndicadores[filtroNutr] || filtroNutr;

   // 2) Filtra TODO o grupo (respeita ano, fase e, se aplicável, gênero)
   const arrAll = csvData.filter(d =>
   +d.ANO      === filtroAno &&
   d.fase_vida === filtroFase &&
   (filtroSexo === "Todos" || d.SEXO === filtroSexo)
   );

   // 3) Total geral de entrevistados nesse slice
   const totalAll = d3.sum(arrAll, d => +d.total);

   // 4) Total no indicador selecionado
   const nutrCount = filtroNutr === "Total"
   ? totalAll
   : d3.sum(arrAll, d => +d[filtroNutr]);

   // 5) Percentual do indicador no grupo
   const nutrPct = totalAll ? (nutrCount / totalAll) * 100 : 0;

   // determina extremos do gradiente na visão país
   const indicadores = Object.keys(
      filtroFase === "adulto"
      ? nomesIndicadoresAdultoR
      : nomesIndicadoresAdolescenteR
   );
   // % de cada indicador no Brasil
   const pctValues = indicadores.map(ind => {
      const count = ind === "Total"
      ? totalAll
      : d3.sum(
            arrAll.filter(d => filtroSexo==="Todos"||d.SEXO===filtroSexo),
            d => +d[ind]
         );
      return totalAll ? (count/totalAll)*100 : 0;
   });
   const maxVal = d3.max(pctValues);
   const minVal = d3.min(pctValues);
   const colorScaleCountry = getColorScale(filtroSexo, minVal, maxVal);

   // 6) Se gênero = “Todos”, calcular também Fem/Masc em % do totalAll
   let pctFem = 0, pctMasc = 0;
   if (filtroSexo === "Todos") {
   const totalFem  = d3.sum(arrAll.filter(d => d.SEXO === "Fem"),  d => +d.total);
   const totalMasc = d3.sum(arrAll.filter(d => d.SEXO === "Masc"), d => +d.total);
   pctFem  = totalAll ? (totalFem  / totalAll) * 100 : 0;
   pctMasc = totalAll ? (totalMasc / totalAll) * 100 : 0;
   }

   // 7) Tooltip
   const showTooltip = function(event) {
   let html = `<strong>Brasil</strong><br>
               <em>${nutricionalName}</em>: ${nutrPct.toFixed(1)}%`;
   if (filtroSexo === "Todos") {
      html += `<br><span style="color:#DC143C;">Fem: ${pctFem.toFixed(1)}%</span>
               <br><span style="color:#4169E1;">Masc: ${pctMasc.toFixed(1)}%</span>`;
   }
   tooltip.style("opacity", 1)
            .html(html)
            .style("left", (event.clientX + 5) + "px")
            .style("top",  (event.clientY - 28) + "px");
   };

   const feature = svg.selectAll("path.country").data(geoData.features);
   feature.join(
     enter => enter.append("path").attr("class", "country"),
     update => update,
     exit  => exit.remove()
   )
   .attr("d", path)
   .attr("fill", () => {
      if (totalAll === 0) return "#ccc";
      return colorScaleCountry(nutrPct);
    })
   .attr("stroke", { "Todos": "#b982a1", "Fem": "#4682B4", "Masc": "#DB7093" }[filtroSexo]).attr("stroke-width", 1)
   .on("mouseover", showTooltip)
   .on("mouseout", function() {
     d3.select(this).attr("stroke-width", 1);
     tooltip.style("opacity", 0);
   })
   .on("click", function() {
     initBrasilMap(); // ao clicar, vai para estado
   })
   .on("contextmenu", function(event) {
     event.preventDefault();
     event.stopPropagation();
     initCountryMap(); // ao clicar com direito, retorna
   });
 
   // remover legenda lateral na visão país
   d3.select("#legendRegional").selectAll("*").remove();
 }

// =======================
// VISÃO ESTADUAL
// =======================
function initBrasilMap() {

   // limpa títulos de estados anteriores
  d3.select("#mapaRegional").selectAll("h2, .alerta-mapa").remove();

  // container para os alertas dessa visualização
  const container = d3.select("#mapaRegional")

  container.append("div")
       .attr("class","alerta-mapa")
       .style("text-align","center")
       .style("margin-top","8px")
       .style("font-size","14px")
       .style("color", "#aa0000")
       .text("⚠️Clique com o botão esquerdo do mouse no estado para visualizar suas cidades");

  container.append("div")
       .attr("class","alerta-mapa alerta-extra")
       .style("text-align","center")
       .style("margin-top","8px")
       .style("font-size","14px")
       .style("color", "#aa0000")
       .text("Clique com o botão direito do mouse para voltar à visualização Nacional");

  currentMode = "brasil";
  currentUF = null;

  d3.json("./geojson/br_states.json").then(function(geoData) {
     
     lastGeoDataBrasil = geoData;   
     // Registra eventos dos filtros, de acordo com o modo atual
     ["#filtro-ano", "#filtro-sexo", "#filtroNutricional"].forEach(sel => {
      d3.select(sel).on("change", () => {
        updateBrasilMap(lastGeoDataBrasil);
        atualizarTituloRegional();
        atualizarQuadroRegional();
      });
    });
     d3.select("#filtro-fasevida").on("change", () => {
      atualizarEstadoNutricionalRegional();
      updateBrasilMap(lastGeoDataBrasil);
      atualizarTituloRegional();
      atualizarQuadroRegional();
    });
     // ===========================

    // cria ou limpa SVG
    let svg = d3.select("#mapaRegional svg");
    if (svg.empty()) {
      svg = d3.select("#mapaRegional")
              .append("svg")
                .attr("width", width)
                .attr("height", height);
    }

    atualizarQuadroRegional();
    updateBrasilMap(geoData);
    atualizarTituloRegional();
  }); // fim do then
}


function updateBrasilMap(geoData) {
  const filtroAno = d3.select("#filtro-ano").property("value");
  const filtroSexo = d3.select("#filtro-sexo").property("value");
  const filtroNutricional = d3.select("#filtroNutricional").property("value");
  const filtroFase = d3.select("#filtro-fasevida").property("value");
  
  const allStateData = csvData.filter(d =>
     +d.ANO === +filtroAno && d.fase_vida === filtroFase
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
   const minVal = d3.min(values);
  
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
     .attr("stroke", { "Todos": "#b982a1", "Fem": "#4682B4", "Masc": "#DB7093" }[filtroSexo] || "#ccc")
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
     })
     .on("contextmenu", function(event) {
      event.preventDefault();
      event.stopPropagation(); 
      initCountryMap();
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
  legendSvg.append("text")
     .attr("transform", `translate(${legendWidth + 65}, ${10 + legendHeight/2}) rotate(-90)`)
     .attr("text-anchor", "middle")
     .attr("font-size", "18px")
     .text("Prevalência (%)");
}

// =======================
// VISÃO MUNICIPAL (USANDO OS MESMOS CONTAINERS)
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
  
  d3.select("#filtro-fasevida").on("change", () => {
    atualizarEstadoNutricionalRegional();
    updateEstadoMap(uf);
    atualizarTituloRegional();
    atualizarQuadroRegional();
  });

  // REBIND DOS FILTROS PARA A VISTA MUNICIPAL
  ["#filtro-ano", "#filtro-sexo", "#filtroNutricional"]
   .forEach(sel => {
      d3.select(sel).on("change", () => {
         updateEstadoMap(uf);
         atualizarTituloRegional();
         atualizarQuadroRegional();
      });
   });

  updateEstadoMap(uf);
  atualizarTituloRegional();
  
}

function updateEstadoMap(uf) {
  
  const selectedYear = d3.select("#filtro-ano").property("value");
  const selectedSexo = d3.select("#filtro-sexo").property("value");
  const selectedNutricao = d3.select("#filtroNutricional").property("value");
  
  const geojsonFile = stateGeojsonFiles[uf];
  d3.json(geojsonFile).then(function(geo) {
   const filtroFase = d3.select("#filtro-fasevida").property("value");
   const stateCSV = csvData.filter(d =>
      d.UF === uf &&
      d.fase_vida === filtroFase
    );
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
     atualizarQuadroRegional();
     const values = Array.from(agg.values());
     const minVal = d3.min(values);
     const maxVal = d3.max(values);
     
     const colorScale = getColorScale(selectedSexo, minVal, maxVal);
     const borderColor = { "Todos": "#b982a1", "Fem": "#4682B4", "Masc": "#DB7093" }[selectedSexo] || "#ccc";
     
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
        .attr("stroke-width", 1)
        .on("click", (event, d) => loadMunicipioDetalhes(d.id))
        .on("contextmenu", function(event) {
         event.preventDefault();
         event.stopPropagation(); 
         initBrasilMap();  // volta à visão de estados
       });
     
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
     legendSvg.append("text")
        .attr("transform", `translate(${legendWidth + 65}, ${10 + legendHeight/2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Prevalência (%)");
      // Alerta
     if(d3.select("#mapaRegional").selectAll(".alerta-mapa").empty()){
      d3.select("#mapaRegional")
         .append("div")
            .attr("class","alerta-mapa")
            .style("text-align","center")
            .style("margin-top","8px")
            .style("font-size","14px")
            .style("color", "#aa0000")
            .text("⚠️Clique com o botão direito do mouse para retornar à visualização estadual");
      }
      
     
  });
}

// Clique direito global do mapa
d3.select("#mapaRegional").on("contextmenu", function(event) {
   event.preventDefault();
   if (currentMode === "country") {
     // já está na visão país: não faz nada ou recarrega país
     initCountryMap();
   }
   else if (currentMode === "brasil") {
     // estava vendo estados, volta ao país
     initCountryMap();
   }
   else if (currentMode === "estado") {
     // estava vendo municípios, volta à visão de estados
     initBrasilMap();
   }
 });
