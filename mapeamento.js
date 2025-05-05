// Caminho do seu CSV (pode estar local ou em um servidor)
const csvUrl = "db_final.csv";

// Variáveis globais para armazenar todos os dados
let allData = [];

// Seletores HTML
const selectUF = document.getElementById("selectUF");
const selectMunicipio = document.getElementById("selectMunicipio");
const selectAno = document.getElementById("selectAno");
const selectSexo = document.getElementById("selectSexo");
const selectFase = document.getElementById("selectFase");

// Evento para alternar o menu adulto
document.getElementById("btnMenuAdultoToggle").addEventListener("click", () => {
    const menu = document.getElementById("menuAdultoContainer");
    menu.classList.toggle("hidden");
});

// Ao carregar a página ou no final do script:
document.querySelectorAll('input[name="adultoCols"]').forEach(chk => {
    chk.addEventListener("change", handleAdultoCheckboxChange);
});

const conflicts = {
  "excesso_peso": ["sobrepeso","obesidade_G_1","obesidade_G_2","obesidade_G_3","obesidade_calc"],
  "obesidade_calc": ["obesidade_G_1","obesidade_G_2","obesidade_G_3","excesso_peso"]
};

const nomeAmigavel = {
  "altura_muito_baixa_para_a_idade": "Altura muito baixa para idade",
  "altura_baixa_para_a_idade": "Altura baixa para idade",
  "altura_adequada_para_a_idade": "Altura adequada para idade",
  "magreza_acentuada": "Magreza Acentuada",
  "magreza": "Magreza",
  "obesidade": "Obesidade",
  "obesidade_grave": "Obesidade Grave",
  "baixo_peso": "Baixo Peso",
  "eutrofico": "Eutrófico",
  "sobrepeso": "Sobrepeso",
  "obesidade_G_1": "Obesidade I",
  "obesidade_G_2": "Obesidade II",
  "obesidade_G_3": "Obesidade III",
  "obesidade_calc": "Obesidade",
  "excesso_peso": "Excesso de Peso"
};

const ufLabel = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
  "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
  "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul", "MG": "Minas Gerais",
  "PA": "Pará", "PB": "Paraíba", "PR": "Paraná", "PE": "Pernambuco", "PI": "Piauí",
  "RJ": "Rio de Janeiro", "RN": "Rio de Janeiro", "RS": "Rio Grande do Sul",
  "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina", "SP": "São Paulo",
  "SE": "Sergipe", "TO": "Tocantins", "Brasil": "Brasil"
};

const sexoLabel = {
  "Fem": "Femininos",
  "Masc": "Masculinos",
  "Todos": " "
};

const faseLabel = {
  "adulto": "Adultos",
  "adolescente": "Adolescentes"
};

const statesGeojsonFiles = {
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

const cidadesFriendly = {};

// Função para pré-carregar os nomes amigáveis de todas as cidades.
function preloadCidadesFriendly() {
  const promises = Object.entries(statesGeojsonFiles).map(([uf, path]) => {
    return d3.json(path).then(geoData => {
      cidadesFriendly[uf] = {};
      geoData.features.forEach(feature => {
        const id = feature.properties.id || feature.properties.CODMUN || feature.properties.cod_mun;
        const friendlyName = feature.properties.name || feature.properties.NOME;
        if (id && friendlyName) {
          cidadesFriendly[uf][id] = friendlyName;
        }
      });
    });
  });
  return Promise.all(promises);
}

// précarrega os nomes das cidades
preloadCidadesFriendly().then(() => {
  console.log("Nomes amigáveis das cidades pré-carregados:", cidadesFriendly);
  // Agora pode prosseguir com a carga dos dados CSV e a inicialização dos filtros:
  d3.csv(csvUrl).then(data => {
    allData = data;
    popularSelects(data);
    atualizarTitulo();
    atualizarGrafico();
  });
});

function handleAdultoCheckboxChange(e) {
  const checkbox = e.target;             // qual checkbox foi clicada
  const isChecked = checkbox.checked;    // true/false
  const value = checkbox.value;          // ex: "excesso_peso", "sobrepeso" ...

  // Se clicou em "excesso_peso" E estiver marcando:
  if (value === "excesso_peso" && isChecked) {
    conflicts.excesso_peso.forEach(col => {
      if (col === "excesso_peso") return;
      const chkEl = document.querySelector(`input[name="adultoCols"][value="${col}"]`);
      if (chkEl) {
        chkEl.checked = false;
        chkEl.disabled = true;
        chkEl.parentElement.classList.add("line-through", "text-gray-400");
      }
    });
  } else if (value === "excesso_peso" && !isChecked) {
    conflicts.excesso_peso.forEach(col => {
      if (col === "excesso_peso") return;
      const chkEl = document.querySelector(`input[name="adultoCols"][value="${col}"]`);
      if (chkEl) {
        chkEl.disabled = false;
        chkEl.parentElement.classList.remove("line-through", "text-gray-400");
      }
    });
  }

  // O mesmo raciocínio para "obesidade_calc"
  if (value === "obesidade_calc" && isChecked) {
    conflicts.obesidade_calc.forEach(col => {
      if (col === "obesidade_calc") return;
      const chkEl = document.querySelector(`input[name="adultoCols"][value="${col}"]`);
      if (chkEl) {
        chkEl.checked = false;
        chkEl.disabled = true;
        chkEl.parentElement.classList.add("line-through", "text-gray-400");
      }
    });
  } else if (value === "obesidade_calc" && !isChecked) {
    conflicts.obesidade_calc.forEach(col => {
      if (col === "obesidade_calc") return;
      const chkEl = document.querySelector(`input[name="adultoCols"][value="${col}"]`);
      if (chkEl) {
        chkEl.disabled = false;
        chkEl.parentElement.classList.remove("line-through", "text-gray-400");
      }
    });
  }

  // Se "obesidade_calc" está marcada, marcar "baixo_peso", "eutrofico" e "sobrepeso" se já não estiverem
  if (document.querySelector(`input[name="adultoCols"][value="obesidade_calc"]`).checked) {
    ["baixo_peso", "eutrofico", "sobrepeso"].forEach(col => {
      const chkEl = document.querySelector(`input[name="adultoCols"][value="${col}"]`);
      if (chkEl && !chkEl.checked) {
        chkEl.checked = true;
      }
    });
  }

  // Se "excesso_peso" está marcada, marcar "baixo_peso" e "eutrofico" se já não estiverem
  if (document.querySelector(`input[name="adultoCols"][value="excesso_peso"]`).checked) {
    ["baixo_peso", "eutrofico"].forEach(col => {
      const chkEl = document.querySelector(`input[name="adultoCols"][value="${col}"]`);
      if (chkEl && !chkEl.checked) {
        chkEl.checked = true;
      }
    });
  }

  // Se "excesso_peso" e "obesidade_calc" estiverem desmarcadas ao mesmo tempo,
  const excessoPesoMarcado = document.querySelector(`input[name="adultoCols"][value="excesso_peso"]`).checked;
  const obesidadeCalcMarcado = document.querySelector(`input[name="adultoCols"][value="obesidade_calc"]`).checked;

  if (!excessoPesoMarcado && !obesidadeCalcMarcado) {
    document.querySelectorAll(`input[name="adultoCols"]`).forEach(chk => {
      if (chk.value !== "excesso_peso" && chk.value !== "obesidade_calc") {
        if (!chk.dataset.userModified) {
          chk.checked = true;
        }
      }
    });
  }

  atualizarGrafico();
}

// Função para carregar dados e popular selects
d3.csv(csvUrl).then(data => {
  // Armazena todos os dados lidos
  allData = data;

  // Popular os selects (UF, Município, Ano) de forma dinâmica
  popularSelects(data);

  // Escreve o título com os valores default
  atualizarTitulo();

  // Desenhar o gráfico inicial (pode ser vazio ou com algum default)
  atualizarGrafico();
});

// Popula os selects sem duplicar valores
function popularSelects(data) {
  // Obter listas únicas de UF
  const ufs = [...new Set(data.map(d => d.UF))].sort();
  
  // Agrupar municípios por UF, usando um Map para armazenar (código => nome)
  const municipiosPorUF = {};
  data.forEach(d => {
    if (!municipiosPorUF[d.UF]) {
      municipiosPorUF[d.UF] = new Map();
    }
    // Armazena o código e o nome original
    municipiosPorUF[d.UF].set(String(d.codigo_municipio), d.municipio);
  });

  // Preencher o select de UF com o formato "Nome (Sigla)" usando ufLabel
  selectUF.innerHTML = "<option value=''>Brasil</option>";
  ufs.forEach(uf => {
    const option = document.createElement("option");
    option.value = uf;
    option.text = ufLabel[uf] ? `${ufLabel[uf]} (${uf})` : uf;
    selectUF.appendChild(option);
  });

  // Função para atualizar o selectMunicipio conforme a UF selecionada
  // Exemplo de como popular o select de município com o código e nome amigável:
function atualizarMunicipios(ufSelecionada, manterSelecionado = false) {
  
  // Se a UF não estiver selecionada (ou seja, "Brasil"), exibe somente "Todos"
  if (!ufSelecionada) {
    selectMunicipio.innerHTML = "<option value=''>Todos</option>";
    return;
  }

  const municipioSelecionado = selectMunicipio.value;
  selectMunicipio.innerHTML = "<option value=''>Todos</option>";
  
  if (ufSelecionada && municipiosPorUF[ufSelecionada]) {
    Array.from(municipiosPorUF[ufSelecionada].entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([codigo, nomeOriginal]) => {
        const option = document.createElement("option");
        option.value = codigo;  // valor = código do município
        // Usa o nome amigável se disponível; senão, o nome original
        option.text = (cidadesFriendly[ufSelecionada] && cidadesFriendly[ufSelecionada][codigo])
                      ? cidadesFriendly[ufSelecionada][codigo]
                      : nomeOriginal;
        selectMunicipio.appendChild(option);
      });
  } 
  
  if (manterSelecionado && [...selectMunicipio.options].some(opt => opt.value === municipioSelecionado)) {
    selectMunicipio.value = municipioSelecionado;
  }
}


  // Preencher Ano (mantendo o que já existe)
  const anos = [...new Set(data.map(d => d.ANO))].sort();
  const defaultAno = anos[anos.length - 1];
  anos.forEach(ano => {
    const option = document.createElement("option");
    option.value = ano;
    option.text = ano;
    if (ano === defaultAno) { option.selected = true; }
    selectAno.appendChild(option);
  });

  // Eventos para manter os filtros sincronizados
  selectMunicipio.addEventListener("change", () => {
    const municipioSelecionado = selectMunicipio.value;
    if (municipioSelecionado) {
      // Aqui você pode procurar na base (allData) o UF correspondente ao código
      const registro = allData.find(d => String(d.codigo_municipio) === municipioSelecionado);
      if (registro && registro.UF) {
        selectUF.value = registro.UF;
        atualizarMunicipios(registro.UF, true);
      }
    }
  });

  selectUF.addEventListener("change", () => {
    const ufSelecionada = selectUF.value;
    atualizarMunicipios(ufSelecionada);
    selectMunicipio.value = ""; // Redefinir o município para "Todos" ao trocar a UF
    atualizarGrafico();
  });

  atualizarMunicipios();
}

// Adiciona listener ao botão de atualizar
[selectUF, selectMunicipio, selectAno, selectFase, selectSexo].forEach(select => {
  select.addEventListener("change", () => {
    atualizarTitulo();
    atualizarGrafico();
  });
});

// funcao para somar colunas customizadas
function somarColunaCustom(arr, col) {
  if (col === "excesso_peso") {
    // soma 4 colunas filhas
    return d3.sum(arr, x => (+x["sobrepeso"] + +x["obesidade_G_1"] + +x["obesidade_G_2"] + +x["obesidade_G_3"]));
  } else if (col === "obesidade_calc") {
    // soma 3 colunas filhas
    return d3.sum(arr, x => (+x["obesidade_G_1"] + +x["obesidade_G_2"] + +x["obesidade_G_3"]));
  } else {
    // coluna normal
    return d3.sum(arr, x => +x[col]);
  }
}

// Função principal de filtro + desenho do gráfico
function atualizarGrafico() {
  // Pegar valores selecionados
  const ufSelecionada = selectUF.value;
  const municipioSelecionado = selectMunicipio.value;
  const anoSelecionado = selectAno.value;
  const faseSelecionada = selectFase.value; // “adolescente” ou “adulto”
  const sexoSelecionado = selectSexo.value;

  const btnMenuAdultoToggle = document.getElementById("btnMenuAdultoToggle");
  const menuAdultoContainer = document.getElementById("menuAdultoContainer");

  // Se for adulto, mostra botão + menu (ou esconde menu, se preferir)
  if (faseSelecionada === "adulto") {
      btnMenuAdultoToggle.classList.remove("hidden");
      // Se quiser ocultar o menu até o usuário clicar no botão, mantenha:
      menuAdultoContainer.classList.add("hidden");
  } else {
      // Se não for adulto, esconde tudo
      btnMenuAdultoToggle.classList.add("hidden");
      menuAdultoContainer.classList.add("hidden");
  }

  // Filtrar dados com base nas seleções
  let dadosFiltrados = allData.filter(d => {
    // Filtra RACA_COR = "todos" e fase_vida
    if (faseSelecionada === "adolescente") {
        if (d.RACA_COR !== "todos") return false;
        if (d.INDICE !== "IMCxIdade") return false;
    }
    if (d.fase_vida !== faseSelecionada) return false;   
    // Filtra UF (se estiver selecionado)
    if (ufSelecionada && d.UF !== ufSelecionada) return false;

    // Filtra município (se estiver selecionado)
    if (municipioSelecionado && String(d.codigo_municipio) !== municipioSelecionado) return false;


    // Filtra ano (se estiver selecionado)
    if (anoSelecionado && d.ANO !== anoSelecionado) return false;

    // Filtra sexo (se estiver selecionado)
    if (sexoSelecionado && sexoSelecionado !== "Todos" && d.SEXO !== sexoSelecionado) return false;

    return true;
  });

  let colunasIndicadores = [];
  if (faseSelecionada === "adolescente") {
    colunasIndicadores = ["magreza_acentuada", "magreza", "obesidade", "obesidade_grave"];
  } else if (faseSelecionada === "adulto") {
    // Pegar colunas a partir dos checkboxes marcados
    const checkboxes = document.querySelectorAll('input[name="adultoCols"]:checked');
    colunasIndicadores = Array.from(checkboxes).map(chk => chk.value);
  }

  // Agrupar dados por SEXO e somar os entrevistados
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

  document.getElementById("valorHomens").textContent   = totalMascEntrevistados.toLocaleString("pt-BR");
  document.getElementById("valorMulheres").textContent = totalFemEntrevistados.toLocaleString("pt-BR");
  document.getElementById("valorTodos").textContent    = totalTodos.toLocaleString("pt-BR");

  // Função auxiliar para somar colunas
  function somarColuna(arr, coluna) {
    return d3.sum(arr, x => +x[coluna]);
  }

  // Objeto para armazenar os valores consolidados: 
  // { Fem: {...}, Masc: {...}, Todos: {...} }
  const somaPorSexo = {
    Fem: { },
    Masc: { },
    Todos: { },
  };

  // Inicializa os contadores
  colunasIndicadores.forEach(col => {
    somaPorSexo.Fem[col] = 0;
    somaPorSexo.Masc[col] = 0;
    somaPorSexo.Todos[col] = 0;
  });

  if (dadosPorSexo.has("Fem")) {
    const arrFem = dadosPorSexo.get("Fem");
    colunasIndicadores.forEach(col => {
      somaPorSexo.Fem[col] = somarColunaCustom(arrFem, col);
    });
  }
  if (dadosPorSexo.has("Masc")) {
    const arrMasc = dadosPorSexo.get("Masc");
    colunasIndicadores.forEach(col => {
      somaPorSexo.Masc[col] = somarColunaCustom(arrMasc, col);
    });
  }
  colunasIndicadores.forEach(col => {
    somaPorSexo.Todos[col] = somaPorSexo.Fem[col] + somaPorSexo.Masc[col];
  });

  // CÁLCULO DE PERCENTUAIS POR INDICADOR
  let totalFemAllCols = 0;
  let totalMascAllCols = 0;
  colunasIndicadores.forEach(col => {
    totalFemAllCols  += somaPorSexo.Fem[col];
    totalMascAllCols += somaPorSexo.Masc[col];
  });
  const grandTotal = totalFemAllCols + totalMascAllCols;
  if (grandTotal > 0) {
    colunasIndicadores.forEach(col => {
      somaPorSexo.Fem[col]   = (somaPorSexo.Fem[col]   / grandTotal) * 100;
      somaPorSexo.Masc[col]  = (somaPorSexo.Masc[col]  / grandTotal) * 100;
      somaPorSexo.Todos[col] = somaPorSexo.Fem[col] + somaPorSexo.Masc[col];
    });
  } else {
    colunasIndicadores.forEach(col => {
      somaPorSexo.Fem[col] = 0;
      somaPorSexo.Masc[col] = 0;
      somaPorSexo.Todos[col] = 0;
    });
  }

  // Montar array para plotagem
  const dadosParaGrafico = colunasIndicadores.map(col => ({
    indicador: col,
    Fem: somaPorSexo.Fem[col],
    Masc: somaPorSexo.Masc[col],
    Todos: somaPorSexo.Todos[col],
  }));

  // Chama a função de desenho do gráfico
  desenharGrafico(dadosParaGrafico);
}



function recuperarNomeMunicipio() {
  // Obter o nome do município selecionado no select (que contém o valor da coluna "municipio")
  const municipioSelected = selectMunicipio.value;
  
  // Buscar na base de dados (allData) a linha onde a coluna "municipio" corresponda ao valor selecionado
  const registro = allData.find(d => String(d.codigo_municipio) === municipioSelected);
  if (!registro || !registro.codigo_municipio) {
    return Promise.resolve(null);
  }
  
  // Recupera o código do município a partir do registro encontrado e converte para string
  const idMunicipio = String(registro.codigo_municipio);

  // Recupera a UF do município a partir do registro encontrado
  const ufMunicipio = registro.UF;
  
  const friendlyName = cidadesFriendly[ufMunicipio] ? cidadesFriendly[ufMunicipio][idMunicipio] : null;

  return Promise.resolve(friendlyName ? `${friendlyName}-${ufMunicipio}` : null);
  
}


// Atualiza o título de forma dinâmica
function atualizarTitulo() {
  // Obtém os valores dos selects
  const fase = selectFase.value;
  const sexo = selectSexo.value;
    // Se nenhum UF for selecionado, exibe "Brasil"
  const uf = selectUF.value || "Brasil";
  const ano = selectAno.value;

  recuperarNomeMunicipio().then(municipioAmigavel => {
    // Se nenhum município for selecionado, use um formato sem mencionar o município.
    const novoTitulo = !municipioAmigavel || municipioAmigavel === " "
      ? `Mapeamento de Estados Nutricionais em ${faseLabel[fase]} ${sexoLabel[sexo]} - ${ufLabel[uf]} ${ano}`
      : `Mapeamento de Estados Nutricionais em ${faseLabel[fase]} ${sexoLabel[sexo]} - ${municipioAmigavel} ${ano}`;
    // Atualiza o elemento do título
    document.getElementById("tituloMapeamento").textContent = novoTitulo;
  });
}


// Função para desenhar o gráfico
function desenharGrafico(dados) {
  // Limpar qualquer SVG antigo
  d3.select("#graficoMapeamento").selectAll("*").remove();

  const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width = 700,
        height = 350;

  // Cria o SVG
  const svg = d3.select("#graficoMapeamento")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Escala para o eixo X (indicadores)
  const x0 = d3.scaleBand()
    .domain(dados.map(d => d.indicador))
    .range([0, width])
    .paddingInner(0.1);

  // Escala para o eixo Y (0% a 100%)
  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([height, 0]);

  // Escala de cores para os sexos
  const color = d3.scaleOrdinal()
    .domain(["Masc", "Fem", "Todos"])
    .range(["#597eec", "#f76482", "#57bb7f"]);

  // Eixo X
  const xAxis = svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(
      d3.axisBottom(x0)
        .tickFormat(d => nomeAmigavel[d] || d)
    );
  xAxis.selectAll("text")
    .style("font-size", "14px");

  // Eixo Y
  const yAxis = svg.append("g")
    .call(d3.axisLeft(y).ticks(10).tickFormat(d => d + "%"));
  yAxis.selectAll("text")
    .style("font-size", "14px");

  // Criação do tooltip


  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background-color", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "6px")
    .style("font-size", "0.875rem")
    .style("box-shadow", "2px 2px 6px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Captura o valor selecionado do filtro de sexo
  const selectedSexo = selectSexo.value;

  if (selectedSexo === "Todos") {
    // Para cada indicador, teremos dois subgrupos: "total" e "stacked"
    const groups = ["total", "stacked"];
    const x1 = d3.scaleBand()
      .domain(groups)
      .range([0, x0.bandwidth()])
      .padding(0.1);

    // Grupo para cada indicador
    const gIndicador = svg.selectAll("g.indicador-group")
      .data(dados)
      .enter().append("g")
        .attr("class", "indicador-group")
        .attr("transform", d => `translate(${x0(d.indicador)}, 0)`);

    // Barra Total (valor "Todos")
    gIndicador.append("rect")
      .attr("x", d => 6*x1("total"))
      .attr("y", d => y(d.Todos))
      .attr("width", 0.7*x1.bandwidth())
      .attr("height", d => height - y(d.Todos))
      .attr("fill", "#57bb7f")
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <strong>${nomeAmigavel[d.indicador]}</strong><br/>
          Valor Total: ${d.Todos.toFixed(2)}%
        `);
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Barra Empilhada (segmentos de Masc e Fem)
    const stackGenerator = d3.stack().keys(["Masc", "Fem"]);
    gIndicador.each(function(d) {
      const currentGroup = d3.select(this);
      // Aplica o stack para o objeto d encapsulado em um array
      const series = stackGenerator([d]);
      currentGroup.selectAll("rect.stacked")
        .data(series)
        .enter()
        .append("rect")
          .attr("class", "stacked")
          .attr("x", 1.15*x1("stacked"))
          .attr("y", s => y(s[0][1]))
          .attr("height", s => y(s[0][0]) - y(s[0][1]))
          .attr("width", 0.3*x1.bandwidth())
          .attr("fill", s => color(s.key))
        .on("mouseover", function(event, s) {
          const layerValue = s[0][1] - s[0][0];
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>${nomeAmigavel[d.indicador]}</strong><br/>
            Sexo: ${sexoLabel[s.key]}<br/>
            Valor: ${layerValue.toFixed(2)}%
          `);
        })
        .on("mousemove", function(event) {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(200).style("opacity", 0);
        });
    });

  } else {
    // Caso o filtro seja "Masc" ou "Fem": desenha uma única barra para o sexo selecionado
    const key = selectedSexo; // "Masc" ou "Fem"
    svg.selectAll("g.indicador-group")
      .data(dados)
      .enter().append("g")
        .attr("class", "indicador-group")
        .attr("transform", d => `translate(${x0(d.indicador)}, 0)`)
      .append("rect")
        .attr("x", 25)
        .attr("y", d => y(d[key]))
        .attr("width", 0.5*x0.bandwidth())
        .attr("height", d => height - y(d[key]))
        .attr("fill", color(key))
        .on("mouseover", function(event, d) {
           tooltip.transition().duration(200).style("opacity", 1);
           tooltip.html(`
             <strong>${nomeAmigavel[d.indicador]}</strong><br/>
             Valor: ${d[key].toFixed(2)}%
           `);
        })
        .on("mousemove", function(event) {
           tooltip.style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function() {
           tooltip.transition().duration(200).style("opacity", 0);
        });
  }

  // Rótulo do eixo Y
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (height / 2) - margin.top)
    .attr("y", -45)
    .style("font-size", "18px")
    .text("Prevalência");
}
