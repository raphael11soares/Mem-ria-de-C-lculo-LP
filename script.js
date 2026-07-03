document.addEventListener('DOMContentLoaded', function () {
    // Referências dos Campos de Entrada
    const selectPeriodo = document.getElementById('periodo');
    const selectMercado = document.getElementById('mercado');
    const selectTrimestre = document.getElementById('trimestre');
    const groupTrimestre = document.getElementById('group-trimestre');
    
    // Containers de Faturamento
    const containerMensal = document.getElementById('container-mensal');
    const containerTrimestral = document.getElementById('container-trimestral');
    
    // Inputs de Faturamento
    const fatMensal = document.getElementById('faturamento_mensal');
    const fatMes1 = document.getElementById('fat_mes1');
    const fatMes2 = document.getElementById('fat_mes2');
    const fatMes3 = document.getElementById('fat_mes3');
    const inputIss = document.getElementById('aliquota-iss');
    
    // Outros Elementos
    const groupIss = document.getElementById('group-iss');
    const notaExportacao = document.getElementById('nota-exportacao');
    const textoCliente = document.getElementById('texto-cliente');
    const btnCopiar = document.getElementById('btn-copiar');

    // Dicionário de Meses
    const mesesTrimestre = {
        '1': ['Janeiro', 'Fevereiro', 'Março'],
        '2': ['Abril', 'Maio', 'Junho'],
        '3': ['Julho', 'Agosto', 'Setembro'],
        '4': ['Outubro', 'Novembro', 'Dezembro']
    };

    // Monitorização de alterações em todos os campos
    [fatMensal, fatMes1, fatMes2, fatMes3, inputIss].forEach(el => {
        el.addEventListener('input', calcularImpostos);
    });

    selectPeriodo.addEventListener('change', function() {
        if (selectPeriodo.value === 'trimestral') {
            groupTrimestre.style.display = 'block';
            containerMensal.style.display = 'none';
            containerTrimestral.style.display = 'grid'; // Volta as 3 colunas
            atualizarLabelsMeses();
        } else {
            groupTrimestre.style.display = 'none';
            containerMensal.style.display = 'block';
            containerTrimestral.style.display = 'none';
        }
        calcularImpostos();
    });

    selectTrimestre.addEventListener('change', function() {
        atualizarLabelsMeses();
        calcularImpostos();
    });
    
    selectMercado.addEventListener('change', function() {
        if (selectMercado.value === 'exportacao') {
            groupIss.style.opacity = '0.3';
            groupIss.style.pointerEvents = 'none';
            notaExportacao.style.display = 'block';
        } else {
            groupIss.style.opacity = '1';
            groupIss.style.pointerEvents = 'auto';
            notaExportacao.style.display = 'none';
        }
        calcularImpostos();
    });

    function atualizarLabelsMeses() {
        const meses = mesesTrimestre[selectTrimestre.value];
        document.getElementById('lbl-mes1').innerText = meses[0] + ' (R$):';
        document.getElementById('lbl-mes2').innerText = meses[1] + ' (R$):';
        document.getElementById('lbl-mes3').innerText = meses[2] + ' (R$):';
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Função de Cópia da Mensagem
    btnCopiar.addEventListener('click', function() {
        textoCliente.select();
        document.execCommand('copy');
        
        const originalText = btnCopiar.innerText;
        btnCopiar.innerText = "Copiado com Sucesso!";
        btnCopiar.style.backgroundColor = "#15803d";
        
        setTimeout(() => {
            btnCopiar.innerText = originalText;
            btnCopiar.style.backgroundColor = "#2563eb";
        }, 2500);
    });

    function calcularImpostos() {
        // Obter faturamento total baseado no período escolhido
        let faturamento = 0;
        if (selectPeriodo.value === 'mensal') {
            faturamento = parseFloat(fatMensal.value) || 0;
        } else {
            const m1 = parseFloat(fatMes1.value) || 0;
            const m2 = parseFloat(fatMes2.value) || 0;
            const m3 = parseFloat(fatMes3.value) || 0;
            faturamento = m1 + m2 + m3;
        }

        const aliquotaIss = parseFloat(inputIss.value) || 0;
        const mercado = selectMercado.value;
        const periodo = selectPeriodo.value;

        // Regra do Lucro Presumido (32% de presunção)
        const percentualPresuncao = 0.32;
        const basePresumida = faturamento * percentualPresuncao;
        const tetoAdicionalIR = (periodo === 'mensal') ? 20000 : 60000;

        // 1. Retenções na Fonte (Só Nacional COM retenção)
        let retidoIrrf = 0; let retidoCsll = 0; let retidoPis = 0; let retidoCofins = 0;

        if (mercado === 'nacional_com' && faturamento > 0) {
            retidoIrrf = faturamento * 0.015;
            retidoCsll = faturamento * 0.01;
            retidoPis = faturamento * 0.0065;
            retidoCofins = faturamento * 0.03;
        }

        // 2. Impostos Devidos
        const devidoIrpj = basePresumida * 0.15;
        
        let devidoIrpjAdd = 0;
        let basePresumidaExcedente = basePresumida - tetoAdicionalIR;
        if (basePresumidaExcedente > 0) {
            devidoIrpjAdd = basePresumidaExcedente * 0.10;
        }

        const devidoCsll = basePresumida * 0.09;

        // PIS, COFINS e ISS (Zeradinhos se Exportação)
        const devidoPis = (mercado !== 'exportacao') ? (faturamento * 0.0065) : 0;
        const devidoCofins = (mercado !== 'exportacao') ? (faturamento * 0.03) : 0;
        const devidoIss = (mercado !== 'exportacao') ? (faturamento * (aliquotaIss / 100)) : 0;

        // 3. Valores a Pagar nas Guias (Descontando as retenções se houver)
        const pagarIrpj = Math.max(0, devidoIrpj - retidoIrrf);
        const pagarIrpjAdd = devidoIrpjAdd; 
        const pagarCsll = Math.max(0, devidoCsll - retidoCsll);
        const pagarPis = Math.max(0, devidoPis - retidoPis);
        const pagarCofins = Math.max(0, devidoCofins - retidoCofins);
        const pagarIss = devidoIss;

        // 4. Totais Consolidados
        const totalCargaTributaria = devidoIrpj + devidoIrpjAdd + devidoCsll + devidoPis + devidoCofins + devidoIss;
        const totalRetencoes = retidoIrrf + retidoCsll + retidoPis + retidoCofins;
        const totalGuias = pagarIrpj + pagarIrpjAdd + pagarCsll + pagarPis + pagarCofins + pagarIss;
        const valorLiquido = faturamento - totalCargaTributaria;
        const aliquotaEfetiva = faturamento > 0 ? (totalCargaTributaria / faturamento) * 100 : 0;

        // --- ATUALIZAÇÃO DO VISUAL DA TABELA ---
        document.getElementById('res-fat-total').innerText = formatarMoeda(faturamento);

        // Preenchendo as Colunas de Faturamento Bruto da tabela diretamente
        document.getElementById('t-fat-irpj').innerText = formatarMoeda(faturamento);
        document.getElementById('t-fat-csll').innerText = formatarMoeda(faturamento);
        document.getElementById('t-fat-pis').innerText = formatarMoeda(faturamento);
        document.getElementById('t-fat-cofins').innerText = formatarMoeda(faturamento);
        document.getElementById('t-fat-iss').innerText = formatarMoeda(faturamento);

        // IRPJ
        document.getElementById('base-irpj').innerText = formatarMoeda(basePresumida);
        document.getElementById('devido-irpj').innerText = formatarMoeda(devidoIrpj);
        document.getElementById('retido-irpj').innerText = formatarMoeda(retidoIrrf);
        document.getElementById('pagar-irpj').innerText = formatarMoeda(pagarIrpj);

        // Adicional IRPJ
        document.getElementById('base-irpj-add').innerText = formatarMoeda(basePresumidaExcedente > 0 ? basePresumidaExcedente : 0);
        document.getElementById('devido-irpj-add').innerText = formatarMoeda(devidoIrpjAdd);
        document.getElementById('pagar-irpj-add').innerText = formatarMoeda(pagarIrpjAdd);

        // CSLL
        document.getElementById('base-csll').innerText = formatarMoeda(basePresumida);
        document.getElementById('devido-csll').innerText = formatarMoeda(devidoCsll);
        document.getElementById('retido-csll').innerText = formatarMoeda(retidoCsll);
        document.getElementById('pagar-csll').innerText = formatarMoeda(pagarCsll);

        // PIS, COFINS, ISS
        document.getElementById('base-pis').innerText = formatarMoeda(faturamento);
        document.getElementById('devido-pis').innerText = formatarMoeda(devidoPis);
        document.getElementById('retido-pis').innerText = formatarMoeda(retidoPis);
        document.getElementById('pagar-pis').innerText = formatarMoeda(pagarPis);

        document.getElementById('base-cofins').innerText = formatarMoeda(faturamento);
        document.getElementById('devido-cofins').innerText = formatarMoeda(devidoCofins);
        document.getElementById('retido-cofins').innerText = formatarMoeda(retidoCofins);
        document.getElementById('pagar-cofins').innerText = formatarMoeda(pagarCofins);

        document.getElementById('base-iss').innerText = formatarMoeda(faturamento);
        document.getElementById('aliquota-iss-tab').innerText = mercado !== 'exportacao' ? `${aliquotaIss}%` : '0% (Isento)';
        document.getElementById('devido-iss').innerText = formatarMoeda(devidoIss);
        document.getElementById('pagar-iss').innerText = formatarMoeda(pagarIss);

        const linhasIsentas = ['row-pis', 'row-cofins', 'row-iss'];
        linhasIsentas.forEach(id => {
            document.getElementById(id).style.opacity = (mercado === 'exportacao') ? '0.4' : '1';
        });

        // Painéis Superiores
        document.getElementById('res-aliquota-efetiva').innerText = `${aliquotaEfetiva.toFixed(2)}%`.replace('.', ',');
        document.getElementById('res-total-impostos').innerText = formatarMoeda(totalCargaTributaria);
        document.getElementById('res-valor-liquido').innerText = formatarMoeda(valorLiquido);

        // --- GERAÇÃO DA MENSAGEM PARA O CLIENTE ---
        gerarMensagemCliente(faturamento, totalCargaTributaria, totalRetencoes, totalGuias, valorLiquido, aliquotaEfetiva, periodo, selectMercado.options[selectMercado.selectedIndex].text);
    }

    function gerarMensagemCliente(fat, carga, retido, guias, liquido, aliquota, periodo, tipoMercado) {
        let msg = `Olá! Tudo bem?\n\n`;
        msg += `Fizemos a simulação tributária referente à sua prestação de serviços no cenário: *${tipoMercado}*.\n\n`;
        
        if (periodo === 'trimestral') {
            const numTri = selectTrimestre.value;
            msg += `Período de Apuração: *${numTri}º Trimestre*\n`;
        } else {
            msg += `Período de Apuração: *Mensal*\n`;
        }

        msg += `• Faturamento Total: ${formatarMoeda(fat)}\n`;
        msg += `• Carga Tributária Efetiva: ${aliquota.toFixed(2).replace('.', ',')}%\n`;
        msg += `• Total Geral de Impostos Devidos: ${formatarMoeda(carga)}\n\n`;

        if (retido > 0) {
            msg += `Resumo dos Pagamentos:\n`;
            msg += `- Descontado diretamente nas Notas (Retenções): ${formatarMoeda(retido)}\n`;
            msg += `- Valor restante a pagar em Guias (DARFs/DAS/ISS): ${formatarMoeda(guias)}\n\n`;
        } else {
             msg += `Todo o imposto será pago através de emissão de Guias, sem retenções nas Notas Fiscais.\n\n`;
        }

        msg += `Faturamento Líquido Estimado: ${formatarMoeda(liquido)}\n\n`;
        msg += `Qualquer dúvida sobre a memória de cálculo, estamos à disposição!`;

        textoCliente.value = msg;
    }

    // Gatilho inicial para não começar zerado
    atualizarLabelsMeses();
    calcularImpostos();
});
