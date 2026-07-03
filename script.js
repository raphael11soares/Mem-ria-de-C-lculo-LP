document.addEventListener('DOMContentLoaded', function () {
    // Seletores de Configuração
    const selectPeriodo = document.getElementById('periodo');
    const selectMercado = document.getElementById('mercado');
    const selectTrimestre = document.getElementById('trimestre');
    const selectRegulamentado = document.getElementById('regulamentado');
    const inputAcumuladoAno = document.getElementById('acumulado_ano');
    const inputIss = document.getElementById('aliquota-iss');
    
    // Containers visuais
    const groupTrimestre = document.getElementById('group-trimestre');
    const groupIss = document.getElementById('group-iss');
    const tabelaCorpo = document.getElementById('linhas-faturamento');
    const textoCliente = document.getElementById('texto-cliente');
    const btnCopiar = document.getElementById('btn-copiar');

    const mesesPorTrimestre = {
        '1': ['Janeiro', 'Fevereiro', 'Março'],
        '2': ['Abril', 'Maio', 'Junho'],
        '3': ['Julho', 'Agosto', 'Setembro'],
        '4': ['Outubro', 'Novembro', 'Dezembro']
    };

    // Ouvintes de Eventos Globais
    selectPeriodo.addEventListener('change', function() {
        groupTrimestre.style.display = (selectPeriodo.value === 'trimestral') ? 'block' : 'none';
        renderizarLinhasFaturamento();
    });
    selectTrimestre.addEventListener('change', renderizarLinhasFaturamento);
    selectMercado.addEventListener('change', gerenciarHabilitacaoColunas);
    selectRegulamentado.addEventListener('change', calcularPlataforma);
    inputAcumuladoAno.addEventListener('input', calcularPlataforma);
    inputIss.addEventListener('input', calcularPlataforma);

    // Renderiza as linhas da tabela de entradas baseadas em Mensal ou Trimestral
    function renderizarLinhasFaturamento() {
        tabelaCorpo.innerHTML = '';
        let listagemMeses = ['Mês Único'];
        
        if (selectPeriodo.value === 'trimestral') {
            listagemMeses = mesesPorTrimestre[selectTrimestre.value];
        }

        listagemMeses.forEach((mes, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${mes}</strong></td>
                <td><input type="number" class="input-table fat-nac-com" data-index="${index}" value="${index===0 && selectPeriodo.value==='mensal' ? '500000' : '0'}" min="0" step="0.01"></td>
                <td><input type="number" class="input-table fat-nac-sem" data-index="${index}" value="0" min="0" step="0.01"></td>
                <td><input type="number" class="input-table fat-exp" data-index="${index}" value="0" min="0" step="0.01"></td>
            `;
            tabelaCorpo.appendChild(tr);
        });

        // Adiciona o ouvinte de cálculo em cada novo input gerado
        document.querySelectorAll('.input-table').forEach(input => {
            input.addEventListener('input', calcularPlataforma);
        });

        gerenciarHabilitacaoColunas();
    }

    // Bloqueia ou libera colunas da tabela dependendo do cenário contábil selecionado
    function gerenciarHabilitacaoColunas() {
        const cenario = selectMercado.value;
        const inputsNacCom = document.querySelectorAll('.fat-nac-com');
        const inputsNacSem = document.querySelectorAll('.fat-nac-sem');
        const inputsExp = document.querySelectorAll('.fat-exp');

        // Reset geral
        ativarCampos(inputsNacCom, true);
        ativarCampos(inputsNacSem, true);
        ativarCampos(inputsExp, true);
        groupIss.style.opacity = '1';
        groupIss.style.pointerEvents = 'auto';

        if (cenario === 'nacional_com') {
            ativarCampos(inputsNacSem, false); ativarCampos(inputsExp, false);
        } else if (cenario === 'nacional_sem') {
            ativarCampos(inputsNacCom, false); ativarCampos(inputsExp, false);
        } else if (cenario === 'exportacao') {
            ativarCampos(inputsNacCom, false); ativarCampos(inputsNacSem, false);
            groupIss.style.opacity = '0.3'; groupIss.style.pointerEvents = 'none';
        } else if (cenario === 'misto_sem_exp') {
            ativarCampos(inputsNacCom, false);
        } else if (cenario === 'misto_com_exp') {
            ativarCampos(inputsNacSem, false);
        }
        calcularPlataforma();
    }

    function ativarCampos(nodeList, status) {
        nodeList.forEach(input => {
            input.disabled = !status;
            if (!status) input.value = 0; // Limpa se desabilitado
            input.style.backgroundColor = status ? '#ffffff' : '#f1f5f9';
        });
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function calcularPlataforma() {
        let fatNacComTotal = 0;
        let fatNacSemTotal = 0;
        let fatExpTotal = 0;

        document.querySelectorAll('.fat-nac-com').forEach(i => fatNacComTotal += parseFloat(i.value) || 0);
        document.querySelectorAll('.fat-nac-sem').forEach(i => fatNacSemTotal += parseFloat(i.value) || 0);
        document.querySelectorAll('.fat-exp').forEach(i => fatExpTotal += parseFloat(i.value) || 0);

        const fatNacionalTotal = fatNacComTotal + fatNacSemTotal;
        const faturamentoPeriodo = fatNacionalTotal + fatExpTotal;
        
        const acumuladoAnterior = parseFloat(inputAcumuladoAno.value) || 0;
        const faturamentoAnualProjetado = acumuladoAnterior + faturamentoPeriodo;

        const aliquotaIss = parseFloat(inputIss.value) || 0;
        const regulamentado = selectRegulamentado.value;
        const mercado = selectMercado.value;
        const periodo = selectPeriodo.value;

        // ---- REGRA CONTÁBIL DOS R$ 120 MIL ----
        let percentualPresuncaoIRPJ = 0.32; 
        const statusBox = document.getElementById('status-limite-120k');
        const txtStatus = document.getElementById('texto-status-120k');
        const alertaComp = document.getElementById('alerta-complemento');

        if (regulamentado === 'sim') {
            percentualPresuncaoIRPJ = 0.32;
            statusBox.className = "card-status status-disabled";
            txtStatus.innerHTML = "<strong>Inaplicável:</strong> Atividades Regulamentadas são obrigadas a utilizar a presunção cheia de 32% independente do faturamento.";
            alertaComp.style.display = 'none';
        } else {
            if (faturamentoAnualProjetado <= 120000) {
                percentualPresuncaoIRPJ = 0.16;
                statusBox.className = "card-status status-ok";
                txtStatus.innerHTML = `<strong>Dentro do Limite (16%):</strong> Faturamento anual acumulado (${formatarMoeda(faturamentoAnualProjetado)}) está abaixo de R$ 120.000,00.`;
                alertaComp.style.display = 'none';
            } else {
                percentualPresuncaoIRPJ = 0.32;
                statusBox.className = "card-status status-alert";
                alertaComp.style.display = (periodo === 'trimestral') ? 'block' : 'none';
                
                let localEstouro = (periodo === 'trimestral') ? `no ${selectTrimestre.value}º Trimestre` : "neste mês";
                txtStatus.innerHTML = `<strong>Limite Ultrapassado (32%):</strong> O faturamento anual atingiu ${formatarMoeda(faturamentoAnualProjetado)}, estourando o limite ${localEstouro}.`;
            }
        }

        // ---- CALCULO DA BASE DE CÁLCULO ----
        const basePresumidaIRPJ = faturamentoPeriodo * percentualPresuncaoIRPJ;
        const basePresumidaCSLL = faturamentoPeriodo * 0.32; // CSLL nunca reduz para 16%

        const tetoAdicionalIR = (periodo === 'mensal') ? 20000 : 60000;

        // Retenções na Fonte federais (Incidem apenas sobre o Nacional COM Retenção)
        let retidoIrrf = fatNacComTotal * 0.015;
        let retidoCsll = fatNacComTotal * 0.01;
        let retidoPis = fatNacComTotal * 0.0065;
        let retidoCofins = fatNacComTotal * 0.03;

        // Impostos Devidos Brutos
        const devidoIrpj = basePresumidaIRPJ * 0.15;
        
        let devidoIrpjAdd = 0;
        let basePresumidaExcedente = basePresumidaIRPJ - tetoAdicionalIR;
        if (basePresumidaExcedente > 0) {
            devidoIrpjAdd = basePresumidaExcedente * 0.10;
        }

        const devidoCsll = basePresumidaCSLL * 0.09;

        // PIS, COFINS e ISS (Imunidade total no mercado de Exportação)
        const devidoPis = fatNacionalTotal * 0.0065;
        const devidoCofins = fatNacionalTotal * 0.03;
        const devidoIss = (mercado !== 'exportacao') ? (fatNacionalTotal * (aliquotaIss / 100)) : 0;

        // Valores finais calculados para as guias a pagar (DARFs e DAS/ISS)
        const pagarIrpj = Math.max(0, devidoIrpj - retidoIrrf);
        const pagarIrpjAdd = devidoIrpjAdd;
        const pagarCsll = Math.max(0, devidoCsll - retidoCsll);
        const pagarPis = Math.max(0, devidoPis - retidoPis);
        const pagarCofins = Math.max(0, devidoCofins - retidoCofins);
        const pagarIss = devidoIss;

        // Consolidando os Totais Financeiros
        const totalCargaTributaria = devidoIrpj + devidoIrpjAdd + devidoCsll + devidoPis + devidoCofins + devidoIss;
        const totalRetencoes = retidoIrrf + retidoCsll + retidoPis + retidoCofins;
        const totalGuias = pagarIrpj + pagarIrpjAdd + pagarCsll + pagarPis + pagarCofins + pagarIss;
        const valorLiquido = faturamentoPeriodo - totalCargaTributaria;
        const aliquotaEfetiva = faturamentoPeriodo > 0 ? (totalCargaTributaria / faturamentoPeriodo) * 100 : 0;

        // ---- EXIBIÇÃO NA TABELA ----
        document.getElementById('res-fat-periodo').innerText = formatarMoeda(faturamentoPeriodo);
        document.getElementById('t-fat-irpj').innerText = formatarMoeda(faturamentoPeriodo);
        document.getElementById('t-fat-csll').innerText = formatarMoeda(faturamentoPeriodo);
        document.getElementById('t-fat-pis').innerText = formatarMoeda(fatNacionalTotal);
        document.getElementById('t-fat-cofins').innerText = formatarMoeda(fatNacionalTotal);
        document.getElementById('t-fat-iss').innerText = formatarMoeda(fatNacionalTotal);

        document.getElementById('t-pres-irpj').innerText = `${percentualPresuncaoIRPJ * 100}%`;
        document.getElementById('base-irpj').innerText = formatarMoeda(basePresumidaIRPJ);
        document.getElementById('devido-irpj').innerText = formatarMoeda(devidoIrpj);
        document.getElementById('retido-irpj').innerText = formatarMoeda(retidoIrrf);
        document.getElementById('pagar-irpj').innerText = formatarMoeda(pagarIrpj);

        document.getElementById('base-irpj-add').innerText = formatarMoeda(basePresumidaExcedente > 0 ? basePresumidaExcedente : 0);
        document.getElementById('devido-irpj-add').innerText = formatarMoeda(devidoIrpjAdd);
        document.getElementById('pagar-irpj-add').innerText = formatarMoeda(pagarIrpjAdd);

        document.getElementById('base-csll').innerText = formatarMoeda(basePresumidaCSLL);
        document.getElementById('devido-csll').innerText = formatarMoeda(devidoCsll);
        document.getElementById('retido-csll').innerText = formatarMoeda(retidoCsll);
        document.getElementById('pagar-csll').innerText = formatarMoeda(pagarCsll);

        document.getElementById('base-pis').innerText = formatarMoeda(fatNacionalTotal);
        document.getElementById('devido-pis').innerText = formatarMoeda(devidoPis);
        document.getElementById('retido-pis').innerText = formatarMoeda(retidoPis);
        document.getElementById('pagar-pis').innerText = formatarMoeda(pagarPis);

        document.getElementById('base-cofins').innerText = formatarMoeda(fatNacionalTotal);
        document.getElementById('devido-cofins').innerText = formatarMoeda(devidoCofins);
        document.getElementById('retido-cofins').innerText = formatarMoeda(retidoCofins);
        document.getElementById('pagar-cofins').innerText = formatarMoeda(pagarCofins);

        document.getElementById('base-iss').innerText = formatarMoeda(fatNacionalTotal);
        document.getElementById('aliquota-iss-tab').innerText = mercado !== 'exportacao' ? `${aliquotaIss}%` : '0% (Isento)';
        document.getElementById('devido-iss').innerText = formatarMoeda(devidoIss);
        document.getElementById('pagar-iss').innerText = formatarMoeda(pagarIss);

        // Opacidade visual para as linhas imunes na exportação
        document.getElementById('row-pis').style.opacity = (fatNacionalTotal === 0) ? '0.3' : '1';
        document.getElementById('row-cofins').style.opacity = (fatNacionalTotal === 0) ? '0.3' : '1';
        document.getElementById('row-iss').style.opacity = (mercado === 'exportacao') ? '0.3' : '1';

        // Painel Consolidado Superior
        document.getElementById('res-aliquota-efetiva').innerText = `${aliquotaEfetiva.toFixed(2)}%`.replace('.', ',');
        document.getElementById('res-total-impostos').innerText = formatarMoeda(totalCargaTributaria);
        document.getElementById('res-valor-liquido').innerText = formatarMoeda(valorLiquido);

        // Disparar construtor do texto do cliente
        montarTextoCliente(faturamentoPeriodo, fatNacionalTotal, fatExpTotal, totalCargaTributaria, totalRetencoes, totalGuias, valorLiquido, aliquotaEfetiva, periodo, percentualPresuncaoIRPJ);
    }

    function montarTextoCliente(totalBruto, nac, exp, carga, retido, guias, liquido, aliquota, periodo, presIrp) {
        let texto = `Prezado Cliente, tudo bem?\n\n`;
        texto += `Elaboramos a simulação do seu planejamento tributário no Lucro Presumido para o período estratégico solicitado.\n\n`;
        texto += `• Período de Apuração: *${periodo === 'trimestral' ? selectTrimestre.value + 'º Trimestre' : 'Mensal'}*\n`;
        texto += `• Faturamento Total: ${formatarMoeda(totalBruto)}\n`;
        
        if (exp > 0) {
            texto += `  └─ Mercado Nacional: ${formatarMoeda(nac)}\n`;
            texto += `  └─ Mercado Internacional (Exportação): ${formatarMoeda(exp)} *[Imunidade de PIS/COFINS/ISS aplicável]*\n`;
        }

        texto += `• Alíquota Presumida IRPJ Aplicada: ${presIrp * 100}%\n`;
        texto += `• Carga Tributária Efetiva Real: ${aliquota.toFixed(2).replace('.', ',')}%\n`;
        texto += `• Carga Tributária em Valores: ${formatarMoeda(carga)}\n\n`;

        if (retido > 0) {
            texto += `Distribuição Financeira dos Impostos:\n`;
            texto += `- Antecipado nas Notas Fiscais (Retenções Tomador): ${formatarMoeda(retido)}\n`;
            texto += `- Saldo Restante a Recolher via Guias Próprias: ${formatarMoeda(guias)}\n\n`;
        } else {
            texto += `Como não houve aplicação de retenções na fonte no cenário simulado, o valor total dos tributos será recolhido via guias contábeis.\n\n`;
        }

        texto += `Faturamento Líquido Estimado para o Caixa da Empresa: ${formatarMoeda(liquido)}\n\n`;
        texto += `Permanecemos inteiramente à vossa disposição para avaliar as memórias de cálculo!`;

        textoCliente.value = texto;
    }

    // Botão de Cópia
    btnCopiar.addEventListener('click', function() {
        textoCliente.select();
        document.execCommand('copy');
        const txtOriginal = btnCopiar.innerText;
        btnCopiar.innerText = "Copiado!";
        btnCopiar.style.backgroundColor = "#16803d";
        setTimeout(() => {
            btnCopiar.innerText = txtOriginal;
            btnCopiar.style.backgroundColor = "#2563eb";
        }, 2000);
    });

    // Inicializador automático do sistema
    renderizarLinhasFaturamento();
});

// Chaveador das abas (Tabs Engine)
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');
}
