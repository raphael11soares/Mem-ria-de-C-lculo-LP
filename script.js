document.addEventListener('DOMContentLoaded', function () {
    // --- LÓGICA DE ABAS CORRIGIDA ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- SELETORES DO SIMULADOR ---
    const selectPeriodo = document.getElementById('periodo');
    const selectMercado = document.getElementById('mercado');
    const selectTrimestre = document.getElementById('trimestre');
    const selectRegulamentado = document.getElementById('regulamentado');
    const inputAcumuladoAno = document.getElementById('acumulado_ano');
    const selectRetroativoPago = document.getElementById('retroativo_pago');
    const inputIss = document.getElementById('aliquota-iss');
    
    const groupTrimestre = document.getElementById('group-trimestre');
    const groupAcumulado = document.getElementById('group-acumulado');
    const groupRetroativoPago = document.getElementById('group-retroativo-pago');
    const tabelaCorpo = document.getElementById('linhas-faturamento');
    const textoCliente = document.getElementById('texto-cliente');
    const btnCopiar = document.getElementById('btn-copiar');

    const mesesPorTrimestre = {
        '1': ['Janeiro', 'Fevereiro', 'Março'],
        '2': ['Abril', 'Maio', 'Junho'],
        '3': ['Julho', 'Agosto', 'Setembro'],
        '4': ['Outubro', 'Novembro', 'Dezembro']
    };

    // --- EVENT LISTENERS ---
    selectPeriodo.addEventListener('change', function() {
        groupTrimestre.style.display = (this.value === 'trimestral') ? 'block' : 'none';
        renderizarLinhasFaturamento();
    });
    
    selectTrimestre.addEventListener('change', renderizarLinhasFaturamento);
    selectMercado.addEventListener('change', gerenciarHabilitacaoColunas);
    
    selectRegulamentado.addEventListener('change', function() {
        groupAcumulado.style.display = (this.value === 'nao') ? 'block' : 'none';
        calcularPlataforma();
    });

    inputAcumuladoAno.addEventListener('input', calcularPlataforma);
    selectRetroativoPago.addEventListener('change', calcularPlataforma);
    inputIss.addEventListener('input', calcularPlataforma);

    // --- GERAÇÃO DA TABELA DE ENTRADAS ---
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
                <td><input type="number" class="input-table fat-nac-com" value="${index===0 && selectPeriodo.value==='mensal' ? '500000' : '0'}" min="0" step="0.01"></td>
                <td><input type="number" class="input-table fat-nac-sem" value="0" min="0" step="0.01"></td>
                <td><input type="number" class="input-table fat-exp" value="0" min="0" step="0.01"></td>
            `;
            tabelaCorpo.appendChild(tr);
        });

        document.querySelectorAll('.input-table').forEach(input => {
            input.addEventListener('input', calcularPlataforma);
        });

        gerenciarHabilitacaoColunas();
    }

    // --- LÓGICA INFALÍVEL DE BLOQUEIO DE COLUNAS ---
    function gerenciarHabilitacaoColunas() {
        const cenario = selectMercado.value;
        const inputsNacCom = document.querySelectorAll('.fat-nac-com');
        const inputsNacSem = document.querySelectorAll('.fat-nac-sem');
        const inputsExp = document.querySelectorAll('.fat-exp');

        // Reset: Ativa tudo
        ativarCampos(inputsNacCom, true);
        ativarCampos(inputsNacSem, true);
        ativarCampos(inputsExp, true);

        // Bloqueia com base no cenário
        if (cenario === 'nacional_com') {
            ativarCampos(inputsNacSem, false); ativarCampos(inputsExp, false);
        } else if (cenario === 'nacional_sem') {
            ativarCampos(inputsNacCom, false); ativarCampos(inputsExp, false);
        } else if (cenario === 'exportacao') {
            ativarCampos(inputsNacCom, false); ativarCampos(inputsNacSem, false);
        } else if (cenario === 'misto_sem_exp') {
            ativarCampos(inputsNacCom, false); // Só libera Nac Sem + Exp
        } else if (cenario === 'misto_com_exp') {
            ativarCampos(inputsNacSem, false); // Só libera Nac Com + Exp
        }
        
        calcularPlataforma();
    }

    function ativarCampos(nodeList, status) {
        nodeList.forEach(input => {
            input.disabled = !status;
            if (!status) input.value = 0; 
        });
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // --- NÚCLEO MATEMÁTICO ---
    function calcularPlataforma() {
        let fatNacComTotal = 0; let fatNacSemTotal = 0; let fatExpTotal = 0;
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

        // --- GESTÃO DO LIMITE DE 120 MIL E RETROATIVO ---
        let percentualPresuncaoIRPJ = 0.32; 
        let valorDevidoRetroativo = 0;
        let baseRetroativaCalc = 0;
        
        const statusBox = document.getElementById('status-limite-120k');
        const txtStatus = document.getElementById('texto-status-120k');
        const alertaComp = document.getElementById('alerta-complemento');
        const rowRetroativo = document.getElementById('row-retroativo');

        // Exibir a pergunta do retroativo pago apenas se houver acumulado e for não regulamentado
        if (regulamentado === 'nao' && faturamentoAnualProjetado > 120000) {
            groupRetroativoPago.style.display = 'block';
        } else {
            groupRetroativoPago.style.display = 'none';
        }

        if (regulamentado === 'sim') {
            percentualPresuncaoIRPJ = 0.32;
            statusBox.className = "card-status status-disabled";
            txtStatus.innerHTML = "<strong>Profissão Regulamentada:</strong> Utilização fixa de 32% sobre a receita bruta.";
            alertaComp.style.display = 'none';
            rowRetroativo.style.display = 'none';
        } else {
            if (faturamentoAnualProjetado <= 120000) {
                percentualPresuncaoIRPJ = 0.16;
                statusBox.className = "card-status status-ok";
                txtStatus.innerHTML = `<strong>Dentro do Limite (16%):</strong> Faturamento anual projetado (${formatarMoeda(faturamentoAnualProjetado)}).`;
                alertaComp.style.display = 'none';
                rowRetroativo.style.display = 'none';
            } else {
                percentualPresuncaoIRPJ = 0.32;
                statusBox.className = "card-status status-alert";
                
                if (selectRetroativoPago.value === 'sim') {
                    // Estourou, mas já pagou o passado. Segue o baile só com 32% no atual.
                    txtStatus.innerHTML = `<strong>Limite Já Regularizado:</strong> Cliente ultrapassou os R$ 120 mil anteriormente e já recolheu o IR Complementar. Aplicando apenas 32% no faturamento atual.`;
                    alertaComp.style.display = 'none';
                    rowRetroativo.style.display = 'none';
                } else {
                    // Estourou e AINDA NÃO PAGOU. Precisa cobrar a diferença do passado!
                    let baseAplicavel = (acumuladoAnterior > 120000) ? 120000 : acumuladoAnterior;
                    
                    if (acumuladoAnterior > 0) {
                        baseRetroativaCalc = baseAplicavel * 0.16;
                        valorDevidoRetroativo = baseRetroativaCalc * 0.15; // 15% de IRPJ sobre a diferença da base
                        
                        txtStatus.innerHTML = `<strong>Atenção - Limite Ultrapassado!</strong> Faturamento anual projetado: ${formatarMoeda(faturamentoAnualProjetado)}. A presunção passa a ser de 32%.`;
                        alertaComp.innerHTML = `<strong>IRPJ Complementar Gerado:</strong> Como a diferença passada ainda não foi paga, a simulação incluiu o recolhimento retroativo no valor de ${formatarMoeda(valorDevidoRetroativo)}.`;
                        alertaComp.style.display = 'block';
                        
                        rowRetroativo.style.display = 'table-row';
                        document.getElementById('t-fat-retro').innerText = formatarMoeda(baseAplicavel);
                        document.getElementById('base-retro').innerText = formatarMoeda(baseRetroativaCalc);
                        document.getElementById('devido-retro').innerText = formatarMoeda(valorDevidoRetroativo);
                        document.getElementById('pagar-retro').innerText = formatarMoeda(valorDevidoRetroativo);
                    } else {
                        // Estourou tudo só neste período, não tem passado para cobrar.
                        txtStatus.innerHTML = `<strong>Limite Ultrapassado:</strong> O faturamento atingiu ${formatarMoeda(faturamentoAnualProjetado)} apenas neste período. A presunção de todo o valor será 32%.`;
                        alertaComp.style.display = 'none';
                        rowRetroativo.style.display = 'none';
                    }
                }
            }
        }

        // --- CÁLCULO DOS TRIBUTOS PADRÃO ---
        const basePresumidaIRPJ = faturamentoPeriodo * percentualPresuncaoIRPJ;
        const basePresumidaCSLL = faturamentoPeriodo * 0.32; 
        const tetoAdicionalIR = (periodo === 'mensal') ? 20000 : 60000;

        let retidoIrrf = fatNacComTotal * 0.015;
        let retidoCsll = fatNacComTotal * 0.01;
        let retidoPis = fatNacComTotal * 0.0065;
        let retidoCofins = fatNacComTotal * 0.03;

        const devidoIrpj = basePresumidaIRPJ * 0.15;
        
        let devidoIrpjAdd = 0;
        let basePresumidaExcedente = basePresumidaIRPJ - tetoAdicionalIR;
        if (basePresumidaExcedente > 0) devidoIrpjAdd = basePresumidaExcedente * 0.10;

        const devidoCsll = basePresumidaCSLL * 0.09;
        const devidoPis = fatNacionalTotal * 0.0065;
        const devidoCofins = fatNacionalTotal * 0.03;
        const devidoIss = (mercado !== 'exportacao') ? (fatNacionalTotal * (aliquotaIss / 100)) : 0;

        const pagarIrpj = Math.max(0, devidoIrpj - retidoIrrf);
        const pagarIrpjAdd = devidoIrpjAdd;
        const pagarCsll = Math.max(0, devidoCsll - retidoCsll);
        const pagarPis = Math.max(0, devidoPis - retidoPis);
        const pagarCofins = Math.max(0, devidoCofins - retidoCofins);
        const pagarIss = devidoIss;

        const totalCargaTributaria = devidoIrpj + devidoIrpjAdd + devidoCsll + devidoPis + devidoCofins + devidoIss + valorDevidoRetroativo;
        const totalRetencoes = retidoIrrf + retidoCsll + retidoPis + retidoCofins;
        const totalGuias = pagarIrpj + pagarIrpjAdd + pagarCsll + pagarPis + pagarCofins + pagarIss + valorDevidoRetroativo;
        const valorLiquido = faturamentoPeriodo - totalCargaTributaria;
        const aliquotaEfetiva = faturamentoPeriodo > 0 ? (totalCargaTributaria / faturamentoPeriodo) * 100 : 0;

        // --- PREENCHIMENTO DA TABELA E PAINEIS ---
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
        document.getElementById('devido-iss').innerText = formatarMoeda(devidoIss);
        document.getElementById('pagar-iss').innerText = formatarMoeda(pagarIss);

        document.getElementById('res-aliquota-efetiva').innerText = `${aliquotaEfetiva.toFixed(2)}%`.replace('.', ',');
        document.getElementById('res-total-impostos').innerText = formatarMoeda(totalCargaTributaria);
        document.getElementById('res-valor-liquido').innerText = formatarMoeda(valorLiquido);

        gerarMensagemCliente(faturamentoPeriodo, fatNacionalTotal, fatExpTotal, totalCargaTributaria, totalRetencoes, totalGuias, valorLiquido, aliquotaEfetiva, periodo, percentualPresuncaoIRPJ, valorDevidoRetroativo);
    }

    function gerarMensagemCliente(totalBruto, nac, exp, carga, retido, guias, liquido, aliquota, periodo, presIrp, retroativo) {
        let txt = `Olá! Tudo bem? 👋\n\n`;
        txt += `Realizamos a simulação do seu planejamento tributário no *Lucro Presumido* referente ao período atual. Abaixo está o detalhamento:\n\n`;
        
        txt += `📊 *RESUMO DO FATURAMENTO*\n`;
        txt += `• Período: ${periodo === 'trimestral' ? selectTrimestre.value + 'º Trimestre' : 'Mensal'}\n`;
        txt += `• Total Bruto: *${formatarMoeda(totalBruto)}*\n`;
        if (exp > 0) {
            txt += `  ├ Mercado Nacional: ${formatarMoeda(nac)}\n`;
            txt += `  └ Exportação: ${formatarMoeda(exp)} _(Isento de PIS/COFINS/ISS)_\n`;
        }
        txt += `\n`;

        if (retroativo > 0) {
            txt += `⚠️ *AVISO IMPORTANTE: LIMITE DE R$ 120 MIL ANUAL*\n`;
            txt += `O faturamento acumulado da sua empresa ultrapassou o teto de R$ 120 mil. A partir de agora, a presunção do IRPJ passa obrigatoriamente para 32%.\n`;
            txt += `Devido a este estouro, o cálculo abaixo já inclui a guia de *IRPJ Complementar Retroativo* gerada sobre os meses passados, no valor de *${formatarMoeda(retroativo)}*.\n\n`;
        } else if (presIrp === 0.32 && selectRegulamentado.value === 'nao' && selectRetroativoPago.value === 'sim') {
            txt += `📌 *NOTA SOBRE O IRPJ*\n`;
            txt += `Como a sua empresa já ultrapassou e regularizou o teto de R$ 120 mil anuais anteriormente, a presunção utilizada neste cálculo segue a alíquota fixa de 32%.\n\n`;
        }

        txt += `💰 *VALORES A RECOLHER*\n`;
        txt += `• Carga Tributária Efetiva: *${aliquota.toFixed(2).replace('.', ',')}%*\n`;
        txt += `• Total de Impostos Gerados: ${formatarMoeda(carga)}\n`;
        
        if (retido > 0) {
            txt += `  ├ Já Retido nas Notas Fiscais: - ${formatarMoeda(retido)}\n`;
            txt += `  └ *Saldo Restante a Pagar em Guias: ${formatarMoeda(guias)}*\n`;
        } else {
            txt += `  └ *Total a Pagar em Guias (DARF/DAS): ${formatarMoeda(guias)}*\n`;
        }
        
        txt += `\n💵 *VALOR LÍQUIDO ESTIMADO*\n`;
        txt += `Faturamento líquido (dinheiro no caixa após impostos): *${formatarMoeda(liquido)}*\n\n`;
        txt += `Qualquer dúvida sobre as memórias de cálculo, nossa equipe está à disposição! 🤝`;

        textoCliente.value = txt;
    }

    btnCopiar.addEventListener('click', function() {
        textoCliente.select();
        document.execCommand('copy');
        const txtOriginal = this.innerText;
        this.innerText = "✅ Mensagem Copiada com Sucesso!";
        this.style.backgroundColor = "#16a34a";
        setTimeout(() => {
            this.innerText = txtOriginal;
            this.style.backgroundColor = "#2563eb";
        }, 2500);
    });

    renderizarLinhasFaturamento();
});
