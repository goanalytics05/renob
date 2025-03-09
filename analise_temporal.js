// Caminho do CSV
const csvUrlTemporal = "db_final.csv";

// Variáveis globais para armazenar os dados
let allDataTemporal = [];
let municipiosPorUF = {}; // 🔥 Agora `municipiosPorUF` é global

// Seletores HTML
const selectUFTemporal = document.getElementById("selectUFTemporal");
const selectMunicipioTemporal = document.getElementById("selectMunicipioTemporal");
const selectFaseTemporal = document.getElementById("selectFaseTemporal");
const selectIndicadorTemporal = document.getElementById("selectIndicador");

// Transcrição para os filtros
const nomesIndicadoresAdulto = {
    baixo_peso: "Baixo Peso",
    eutrofico: "Eutrófico",
    sobrepeso: "Sobrepeso",
    obesidade_G_1: "Obesidade Grau I",
    obesidade_G_2: "Obesidade Grau II",
    obesidade_G_3: "Obesidade Grau III"
};

const nomesIndicadoresAdolescente = {
    magreza_acentuada: "Magreza Acentuada",
    magreza: "Magreza",
    obesidade: "Obesidade",
    obesidade_grave: "Obesidade Grave"
};


// Carregar os dados e inicializar o gráfico
d3.csv(csvUrlTemporal).then(data => {
    allDataTemporal = data;

    // Criar um objeto global para mapear UF -> Municípios
    data.forEach(d => {
        if (!municipiosPorUF[d.UF]) {
            municipiosPorUF[d.UF] = new Set();
        }
        municipiosPorUF[d.UF].add(d.municipio);
    });

    // Preencher os selects
    popularSelectsTemporais(data);

    // Gerar gráfico inicial com valores padrão
    atualizarGraficoTemporal();
});

// 🔹 Função para popular os selects
function popularSelectsTemporais(data) {
    // Listas únicas de UF
    const ufs = [...new Set(data.map(d => d.UF))].sort();

    // Preencher UF
    selectUFTemporal.innerHTML = "<option value=''>Geral</option>";
    ufs.forEach(uf => {
        const option = document.createElement("option");
        option.value = uf;
        option.text = uf;
        selectUFTemporal.appendChild(option);
    });

    // Atualizar municípios corretamente
    atualizarMunicipiosTemporais(selectUFTemporal.value);

    atualizarIndicadoresTemporais();
}

// 🔹 Função para atualizar municípios
function atualizarMunicipiosTemporais(ufSelecionada) {
    const municipioSelecionado = selectMunicipioTemporal.value;
    selectMunicipioTemporal.innerHTML = "<option value=''>Geral</option>";

    // 🔥 Agora `municipiosPorUF` é global e está sempre disponível
    if (ufSelecionada && municipiosPorUF[ufSelecionada]) {
        [...municipiosPorUF[ufSelecionada]].sort().forEach(m => {
            const option = document.createElement("option");
            option.value = m;
            option.text = m;
            selectMunicipioTemporal.appendChild(option);
        });
    } else {
        const municipios = [...new Set(allDataTemporal.map(d => d.municipio))].sort();
        municipios.forEach(m => {
            const option = document.createElement("option");
            option.value = m;
            option.text = m;
            selectMunicipioTemporal.appendChild(option);
        });
    }

    if ([...selectMunicipioTemporal.options].some(opt => opt.value === municipioSelecionado)) {
        selectMunicipioTemporal.value = municipioSelecionado;
    }
}

// 🔹 Atualizar municípios ao trocar UF
selectUFTemporal.addEventListener("change", () => {
    atualizarMunicipiosTemporais(selectUFTemporal.value);
    selectMunicipioTemporal.value = "";
    atualizarGraficoTemporal();
});

// 🔹 Atualizar gráfico ao mudar o MUNICÍPIO
selectMunicipioTemporal.addEventListener("change", () => {
    atualizarGraficoTemporal(); // 🔥 Agora o gráfico atualiza ao mudar município
});

// 🔹 Atualizar gráfico ao mudar o INDICADOR
selectIndicadorTemporal.addEventListener("change", () => {
    atualizarGraficoTemporal(); // 🔥 Agora o gráfico atualiza ao mudar indicador
});

// 🔹 Função para atualizar Indicadores
function atualizarIndicadoresTemporais() {
    const faseVidaSelecionada = selectFaseTemporal.value;
    if (!faseVidaSelecionada) return;

    const indicadores = faseVidaSelecionada === "adulto" 
        ? nomesIndicadoresAdulto 
        : nomesIndicadoresAdolescente;

    selectIndicadorTemporal.innerHTML = Object.entries(indicadores)
        .map(([valor, nomeExibicao]) => `<option value="${valor}">${nomeExibicao}</option>`)
        .join("");
}

// 🔹 Atualizar gráfico quando a fase de vida for alterada
selectFaseTemporal.addEventListener("change", () => {
    atualizarIndicadoresTemporais();
    atualizarGraficoTemporal();
});

// 🔹 Função para atualizar o gráfico
// Função para atualizar o gráfico (agora com valores normalizados)
function atualizarGraficoTemporal() {
    const ufSelecionado = selectUFTemporal.value;
    const municipioSelecionado = selectMunicipioTemporal.value;
    const faseVidaSelecionada = selectFaseTemporal.value;
    const indicadorSelecionado = selectIndicadorTemporal.value;

    let dadosFiltrados = allDataTemporal.filter(d =>
        (ufSelecionado === "" || d.UF === ufSelecionado) &&
        (municipioSelecionado === "" || d.municipio === municipioSelecionado) &&
        d.fase_vida === faseVidaSelecionada
    );

    // 🔹 Agrupar os entrevistados por ano e calcular o total de entrevistados por ano
    const totalEntrevistadosPorAno = d3.rollup(
        dadosFiltrados,
        v => d3.sum(v, d => +d.total),
        d => d.ANO
    );

    // Se não houver entrevistados, evita divisão por zero
    if (totalEntrevistadosPorAno.size === 0) {
        desenharGraficoTemporal({ Masc: [], Fem: [], Todos: [] }, [], 100);
        return;
    }

    // Agrupar dados por ano e sexo
    let anos = [...new Set(dadosFiltrados.map(d => d.ANO))].sort();
    let dadosGrafico = { Masc: [], Fem: [], Todos: [] };
    let maxPorcentagem = 0;

    anos.forEach(ano => {
        let masc = dadosFiltrados.filter(d => d.ANO === ano && d.SEXO === "Masc");
        let fem = dadosFiltrados.filter(d => d.ANO === ano && d.SEXO === "Fem");

        let totalEntrevistadosAno = totalEntrevistadosPorAno.get(ano) || 0;

        if (totalEntrevistadosAno > 0) {
            let valorMasc = masc.reduce((sum, d) => sum + Number(d[indicadorSelecionado] || 0), 0);
            let valorFem = fem.reduce((sum, d) => sum + Number(d[indicadorSelecionado] || 0), 0);

            // 🔹 Normalizar os valores como porcentagem do total de entrevistados NO ANO
            let percMasc = (valorMasc / totalEntrevistadosAno) * 100;
            let percFem = (valorFem / totalEntrevistadosAno) * 100;
            let percTodos = ((valorMasc + valorFem) / totalEntrevistadosAno) * 100;

            maxPorcentagem = Math.max(maxPorcentagem, percMasc, percFem, percTodos);

            dadosGrafico.Masc.push({ ano, valor: percMasc });
            dadosGrafico.Fem.push({ ano, valor: percFem });
            dadosGrafico.Todos.push({ ano, valor: percTodos });
        }
    });

    // 🔹 Adicionar 10% de margem ao topo do gráfico
    maxPorcentagem = Math.ceil(maxPorcentagem * 1.1);

    desenharGraficoTemporal(dadosGrafico, anos, maxPorcentagem);
    atualizarQuadroEntrevistados(dadosFiltrados);
}


// 🔹 Função para atualizar os dados do Quadro de Entrevistados
function atualizarQuadroEntrevistados(dadosFiltrados) {
    // Agrupar por sexo
    const dadosPorSexo = d3.group(dadosFiltrados, d => d.SEXO);

    let totalFemEntrevistados = 0;
    let totalMascEntrevistados = 0;

    if (dadosPorSexo.has("Fem")) {
        const arrFem = dadosPorSexo.get("Fem");
        totalFemEntrevistados = d3.sum(arrFem, d => +d.total);
    }
    if (dadosPorSexo.has("Masc")) {
        const arrMasc = dadosPorSexo.get("Masc");
        totalMascEntrevistados = d3.sum(arrMasc, d => +d.total);
    }

    const totalTodos = totalFemEntrevistados + totalMascEntrevistados;

    // Atualizar HTML
    document.getElementById("valorHomensTemporal").textContent   = totalMascEntrevistados.toLocaleString("pt-BR");
    document.getElementById("valorMulheresTemporal").textContent = totalFemEntrevistados.toLocaleString("pt-BR");
    document.getElementById("valorTodosTemporal").textContent    = totalTodos.toLocaleString("pt-BR");

    return totalTodos; // Retorna o total para ser usado na normalização do gráfico
}

// 🔹 Função para desenhar o gráfico com eixo Y dinâmico
function desenharGraficoTemporal(dados, anos, maxY) {
    // Limpa o contêiner
    d3.select("#graficoAnaliseTemporal").selectAll("*").remove();
  
    const margin = { top: 30, right: 30, bottom: 50, left: 60 },
          internalWidth  = 700,
          internalHeight = 355;
  
    // Cria o SVG responsivo via viewBox
    const svg = d3.select("#graficoAnaliseTemporal")
      .append("svg")
      .attr("viewBox", `0 0 ${internalWidth + margin.left + margin.right} ${internalHeight + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .classed("w-full", true)
      .classed("h-auto", true);
  
    // Grupo principal para aplicar as margens
    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Escalas
    const x = d3.scalePoint()
      .domain(anos)
      .range([0, internalWidth])
      .padding(0.2); // afasta os pontos das bordas
  
    const y = d3.scaleLinear()
      .domain([0, maxY])
      .range([internalHeight, 0]);
  
    // Cria três grupos na ordem desejada (primeiro ficam por trás)
    const linesGroup   = chartArea.append("g").attr("class", "lines-group");
    const circlesGroup = chartArea.append("g").attr("class", "circles-group");
    const labelsGroup  = chartArea.append("g").attr("class", "labels-group");
  
    // Eixos (os adicionamos diretamente no chartArea)
    chartArea.append("g")
      .attr("transform", `translate(0, ${internalHeight})`)
      .call(d3.axisBottom(x));
    chartArea.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}%`));
  
    // Linhas de referência para cada tick, exceto o último, no linesGroup
    const ticks = y.ticks(6);
    ticks.slice(0, ticks.length - 1).forEach(tickValue => {
      linesGroup.append("line")
        .attr("x1", 0)
        .attr("y1", y(tickValue))
        .attr("x2", internalWidth)
        .attr("y2", y(tickValue))
        .attr("stroke", "lightgray")
        .attr("stroke-width", 1);
    });
  
    // Gerador de linha para as séries
    const line = d3.line()
      .x(d => x(d.ano))
      .y(d => y(d.valor));
  
    // Cores para cada série
    const cores = { Masc: "#597eec", Fem: "#f76482", Todos: "#d061a4" };
  
    // Para cada série, desenha linha, círculos e labels
    ["Masc", "Fem", "Todos"].forEach(sexo => {
      // Linha do gráfico (no linesGroup)
      linesGroup.append("path")
        .datum(dados[sexo])
        .attr("fill", "none")
        .attr("stroke", cores[sexo])
        .attr("stroke-width", 2)
        .attr("d", line);
  
      // Círculos (no circlesGroup, sempre visíveis)
      circlesGroup.selectAll(`circle.${sexo}`)
        .data(dados[sexo])
        .enter()
        .append("circle")
        .attr("class", sexo)
        .attr("cx", d => x(d.ano))
        .attr("cy", d => y(d.valor))
        .attr("r", 4)
        .attr("fill", cores[sexo])
        .on("mouseover", function(event, d) {
          // Aumenta o círculo
          d3.select(this)
            .transition()
            .duration(100)
            .attr("r", 6);
          // Mostra o label correspondente
          labelsGroup.selectAll(`g.label-group-${sexo}`)
            .filter(td => td.ano === d.ano)
            .style("visibility", "visible");
        })
        .on("mouseout", function(event, d) {
          // Restaura o tamanho do círculo
          d3.select(this)
            .transition()
            .duration(100)
            .attr("r", 4);
          // Oculta o label correspondente
          labelsGroup.selectAll(`g.label-group-${sexo}`)
            .filter(td => td.ano === d.ano)
            .style("visibility", "hidden");
        });
  
      // Rótulos (grupo com retângulo + texto) no labelsGroup, inicialmente ocultos
      const labelGroups = labelsGroup.selectAll(`g.label-group-${sexo}`)
        .data(dados[sexo])
        .enter()
        .append("g")
        .attr("class", `label-group-${sexo}`)
        .style("visibility", "hidden");
  
      // Retângulo de fundo
      labelGroups.append("rect")
        .attr("fill", "white")
        .attr("rx", 3)
        .attr("ry", 3);
  
      // Texto do valor
      labelGroups.append("text")
        .attr("x", d => x(d.ano))
        .attr("y", d => y(d.valor) - 8)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("fill", cores[sexo])
        .text(d => `${d.valor.toFixed(2)}%`);
  
      // Ajusta o retângulo para envolver o texto com um padding maior
      const padding = 12; // aumenta o retângulo
      labelGroups.each(function(d) {
        const g = d3.select(this);
        const textElem = g.select("text").node();
        const bbox = textElem.getBBox();
        g.select("rect")
          .attr("x", bbox.x - padding / 2)
          .attr("y", bbox.y - padding / 2)
          .attr("width", bbox.width + padding)
          .attr("height", bbox.height + padding);
      });
    });
  }
  
  
  
  
  
  
  
  