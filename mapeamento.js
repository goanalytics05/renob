    // Caminho do seu CSV (pode estar local ou em um servidor)
    const csvUrl = "db_final.csv";

    // Variáveis globais para armazenar todos os dados
    let allData = [];

    // Seletores HTML
    const selectUF = document.getElementById("selectUF");
    const selectMunicipio = document.getElementById("selectMunicipio");
    const selectAno = document.getElementById("selectAno");
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

      // Desenhar o gráfico inicial (pode ser vazio ou com algum default)
      atualizarGrafico();
    });

    // Popula os selects sem duplicar valores
    function popularSelects(data) {
      // Obter listas únicas
      const ufs = [...new Set(data.map(d => d.UF))].sort();
      const municipiosPorUF = {};
      data.forEach(d => {
          if (!municipiosPorUF[d.UF]) {
              municipiosPorUF[d.UF] = new Set();
          }
          municipiosPorUF[d.UF].add(d.municipio);
      });
  
      // Preencher UF
      selectUF.innerHTML = "<option value=''>Geral</option>";
      ufs.forEach(uf => {
          const option = document.createElement("option");
          option.value = uf;
          option.text = uf;
          selectUF.appendChild(option);
      });
  
      // Preencher Município
      function atualizarMunicipios(ufSelecionada, manterSelecionado = false) {
          const municipioSelecionado = selectMunicipio.value;
          selectMunicipio.innerHTML = "<option value=''>Geral</option>";
          
          if (ufSelecionada && municipiosPorUF[ufSelecionada]) {
              [...municipiosPorUF[ufSelecionada]].sort().forEach(m => {
                  const option = document.createElement("option");
                  option.value = m;
                  option.text = m;
                  selectMunicipio.appendChild(option);
              });
          } else {
              // Se nenhuma UF específica for selecionada, mostra todos os municípios
              const municipios = [...new Set(data.map(d => d.municipio))].sort();
              municipios.forEach(m => {
                  const option = document.createElement("option");
                  option.value = m;
                  option.text = m;
                  selectMunicipio.appendChild(option);
              });
          }
          
          // Manter o município selecionado, se ainda for válido
          if (manterSelecionado && [...selectMunicipio.options].some(opt => opt.value === municipioSelecionado)) {
              selectMunicipio.value = municipioSelecionado;
          }
      }
  
      // Preencher Ano
      const anos = [...new Set(data.map(d => d.ANO))].sort();
      const defaultAno = anos[anos.length - 1]
      anos.forEach(ano => {
          const option = document.createElement("option");
          option.value = ano;
          option.text = ano;
          if (ano === defaultAno) {option.selected = true;}
          selectAno.appendChild(option);
      });
  
      // Eventos para manter filtros sincronizados
      selectMunicipio.addEventListener("change", () => {
          const municipioSelecionado = selectMunicipio.value;
          if (municipioSelecionado) {
              const ufCorrespondente = data.find(d => d.municipio === municipioSelecionado)?.UF;
              if (ufCorrespondente) {
                  selectUF.value = ufCorrespondente;
                  atualizarMunicipios(ufCorrespondente, true);
              }
          }
      });
  
      selectUF.addEventListener("change", () => {
          const ufSelecionada = selectUF.value;
          atualizarMunicipios(ufSelecionada);
          selectMunicipio.value = ""; // Redefinir o município para "Geral" ao trocar a UF
          atualizarGrafico()
      });
  
      atualizarMunicipios();
  }
  

    // Adiciona listener ao botão de atualizar
    [selectUF, selectMunicipio, selectAno, selectFase].forEach(select => {
      select.addEventListener("change", atualizarGrafico);
    });


    // funcao para somar colunas customizadas


    // Função principal de filtro + desenho do gráfico
    function atualizarGrafico() {
      // Pegar valores selecionados
      const ufSelecionada = selectUF.value;
      const municipioSelecionado = selectMunicipio.value;
      const anoSelecionado = selectAno.value;
      const faseSelecionada = selectFase.value; // “adolescente” 


      const btnMenuAdultoToggle = document.getElementById("btnMenuAdultoToggle");
      const menuAdultoContainer = document.getElementById("menuAdultoContainer");

    // SOMANDO COLUNA CUSTOMIZADAS
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
        if (municipioSelecionado && d.municipio !== municipioSelecionado) return false;

        // Filtra ano (se estiver selecionado)
        if (anoSelecionado && d.ANO !== anoSelecionado) return false;

        return true;
      });


      let colunasIndicadores = [];
      if (faseSelecionada === "adolescente") {
        // Mesmo esquema anterior
          colunasIndicadores = ["magreza_acentuada", "magreza", "obesidade", "obesidade_grave"];

      } else if (faseSelecionada === "adulto") {
        // Pegar colunas a partir dos checkboxes marcados
        // Vamos ler todos os <input type="checkbox" name="adultoCols">:
        const checkboxes = document.querySelectorAll('input[name="adultoCols"]:checked');
        // Montamos o array de colunas marcadas
        colunasIndicadores = Array.from(checkboxes).map(chk => chk.value);
        
        // Se o usuário desmarcar tudo, colunasIndicadores ficará vazio => sem barras
        // A lista total seria: ["baixo_peso","eutrofico","sobrepeso","obesidade_G_1","obesidade_G_2","obesidade_G_3"]
        // mas a exibição final depende do que foi marcado
      }
      

      // Agora precisamos agrupar os dados por SEXO para somar
      // os valores de altura_*_para_a_idade
      // Vamos considerar 3 sexos: "Masc", "Fem" e "Todos"
      // mas no CSV pode estar "Masc" / "Fem". 
      // "Todos" = soma do que for "Masc" + "Fem" (nós calcularemos manualmente)

      // Primeiro separamos por sexo
      const dadosPorSexo = d3.group(dadosFiltrados, d => d.SEXO); // retorna Map { "Fem" => [...], "Masc" => [...], ... }


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
      //    { Fem: {...}, Masc: {...}, Todos: {...} }
      const somaPorSexo = {
        Fem: { },
        Masc: { },
        Todos: { },
      };

      // Inicia contadores em 0 para cada coluna
      colunasIndicadores.forEach(col => {
        somaPorSexo.Fem[col] = 0;
        somaPorSexo.Masc[col] = 0;
        somaPorSexo.Todos[col] = 0; // Será calculado
      });

      // Se existir Fem no Map, soma
      if (dadosPorSexo.has("Fem")) {
        const arrFem = dadosPorSexo.get("Fem");
        colunasIndicadores.forEach(col => {
          somaPorSexo.Fem[col] = somarColunaCustom(arrFem, col);
        });
      }
      // Se existir Masc no Map, soma
      if (dadosPorSexo.has("Masc")) {
        const arrMasc = dadosPorSexo.get("Masc");
        colunasIndicadores.forEach(col => {
          somaPorSexo.Masc[col] = somarColunaCustom(arrMasc, col);
        });
      }
      // "Todos" = Fem + Masc
      colunasIndicadores.forEach(col => {
        somaPorSexo.Todos[col] = somaPorSexo.Fem[col] + somaPorSexo.Masc[col];
      });

 // --------------------------------------------------------
  // CÁLCULO DE PERCENTUAIS *POR INDICADOR*
  // Queremos: Fem[col] + Masc[col] = 100% (para cada col)
  // --------------------------------------------------------
// 1) Somar Fem e Masc de todas as colunas
let totalFemAllCols = 0;
let totalMascAllCols = 0;

colunasIndicadores.forEach(col => {
  totalFemAllCols  += somaPorSexo.Fem[col];
  totalMascAllCols += somaPorSexo.Masc[col];
});

// 2) Converter cada valor para % do grandTotal
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

  // Renderizar o gráfico
  desenharGrafico(dadosParaGrafico);
}

const nomeAmigavel = {
    "altura_muito_baixa_para_a_idade": "Altura muito baixa para idade",
    "altura_baixa_para_a_idade": "Altura baixa para idade",
    "altura_adequada_para_a_idade": "Altura adequada para idade",
    "magreza_acentuada": "Magreza Acentuada",
    "magreza": "Magreza",
    "obesidade": "Obesidade",
    "obesidade_grave": "Obesidade Grave",
    "baixo_peso": "Baixo Peso",
    "eutrofico": "Eutrofico",
    "sobrepeso": "Sobrepeso",
    "obesidade_G_1": "Obesidade I",
    "obesidade_G_2": "Obesidade II",
    "obesidade_G_3": "Obesidade III",
    "obesidade_calc": "Obesidade",
    "excesso_peso": "Excesso de Peso"
  };
// Função para desenhar
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
  
    // Subgrupos (sexos)
    const subgroups = ["Todos", "Masc", "Fem"];
  
    // Escalas
    const x0 = d3.scaleBand()
      .domain(dados.map(d => d.indicador))
      .range([0, width])
      .paddingInner(0.1);
  
    const x1 = d3.scaleBand()
      .domain(subgroups)
      .range([0, x0.bandwidth()])
      .padding(0.05);
  
    // Eixo Y (0% a 100%)
    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);
  
    const color = d3.scaleOrdinal()
      .domain(subgroups)
      .range(["#d061a4", "#597eec", "#f76482"]);
  
  // ------------------------------------------------------------------
  // Eixo X - Use tickFormat para renomear
  // ------------------------------------------------------------------
  const xAxis = svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(
      d3.axisBottom(x0)
        .tickFormat(d => nomeAmigavel[d] || d) 
        // Se não achar no dicionário, exibe o valor original.
    );

  // Aumentar tamanho da fonte dos rótulos do eixo X
  xAxis.selectAll("text")
    .style("font-size", "14px");

  // Eixo Y - com labels "0%, 10%, 20%..."
  const yAxis = svg.append("g")
    .call(d3.axisLeft(y).ticks(10).tickFormat(d => d + "%"));

  // Aumentar tamanho da fonte dos rótulos do eixo Y
  yAxis.selectAll("text")
    .style("font-size", "14px");
  
    // ------------------------------------------------------------------
    // CRIAR TOOLTIP (uma única vez)
    // ------------------------------------------------------------------
    const sexoLabel = {
        "Fem": "Feminino",
        "Masc": "Masculino",
        "Todos": "Todos"
      };

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
  
    // ------------------------------------------------------------------
    // DESENHAR BARRAS (uma única vez)
    // ------------------------------------------------------------------
    const grupoIndicador = svg.selectAll("g.indicador-group")
      .data(dados)
      .enter()
      .append("g")
        .attr("class", "indicador-group")
        .attr("transform", d => `translate(${x0(d.indicador)}, 0)`);
  
    grupoIndicador.selectAll("rect")
      .data(d => subgroups.map(sg => ({ key: sg, value: d[sg], indicador: d.indicador })))
      .enter()
      .append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key))
        // Eventos do Tooltip
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>${d.indicador}</strong><br/>
            Sexo: ${sexoLabel[d.key]}<br/>
            Valor: ${d.value.toFixed(2)}%
          `);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(200).style("opacity", 0);
        });
  
    // Labels dos eixos
    svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .style("font-size", "16px") // aumentar fonte do título do eixo
    .text("Estado Nutricional");
  

  }