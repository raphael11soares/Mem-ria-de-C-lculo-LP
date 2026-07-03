document.addEventListener('DOMContentLoaded', function () {
    const inputFaturamento = document.getElementById('faturamento');
    const inputIss = document.getElementById('aliquota-iss');
    const selectMercado = document.getElementById('mercado');
    const groupIss = document.getElementById('group-iss');
    const notaExportacao = document.getElementById('nota-exportacao');

    // Monitorização de alterações nos campos de entrada
    inputFaturamento.addEventListener('input', calcularImpostos);
    inputIss.addEventListener('input', calcularImpostos);
    selectMercado.addEventListener('change', function() {
        if (selectMercado.value === 'exportacao') {
            groupIss.style.display = 'none';
            notaExportacao.style.display = 'block';
        } else {
            groupIss.style.display = 'block';
            notaExportacao.style.display = 'none';
        }
        calcularImpostos();
    });

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function calcularImpostos() {
        const faturamento = parseFloat(inputFaturamento.value) || 0;
        const aliquotaIss = parseFloat(inputIss.value) || 0;
        const mercado = selectMercado.value;

        // Regra base do Lucro Presumido para Serviços (32% de presunção)
        const percentualPresuncao = 0.32;
        const basePresumida = faturamento * percentualPresuncao;

        // 1. Retenções na Fonte (Apenas ocorrem no Mercado Nacional)
        let retidoIrrf = 0;
        let retidoCsll = 0;
        let retidoPis = 0;
        let retidoCofins = 0;

        if (mercado === 'nacional' && faturamento > 0) {
            retidoIrrf = faturamento * 0.015;  // 1,5%
            retidoCsll = faturamento * 0.01;   // 1,0%
            retidoPis = faturamento * 0.0065;  // 0,65%
            retidoCofins = faturamento * 0.03; // 3,0%
        }

        // 2. Impostos Devidos Totais
        const devidoIrpj = basePresumida * 0.15; // 15% base
        
        // Adicional de IRPJ: 10% sobre a parcela da base presumida que exceder R$ 20.000,00 no mês
        let devidoIrpjAdd = 0;
        let basePresumidaExcedente = basePresumida - 20000;
        if (basePresumidaExcedente > 0) {
            devidoIrpjAdd = basePresumidaExcedente * 0.10;
        }

        const devidoCsll = basePresumida * 0.09; // 9%

        // Aplicação das isenções de Exportação
        const devidoPis = (mercado === 'nacional') ? (faturamento * 0.0065) : 0;
        const devidoCofins = (mercado === 'nacional') ? (faturamento * 0.03) : 0;
        const devidoIss = (mercado === 'nacional') ? (faturamento * (aliquotaIss / 100)) : 0;

        // 3. Valor Líquido a Pagar nas Guias (Abatendo os valores retidos na NF)
        const pagarIrpj = Math.max(0, devidoIrpj - retidoIrrf);
        const pagarIrpjAdd = devidoIrpjAdd; 
        const pagarCsll = Math.max(0, devidoCsll - retidoCsll);
        const pagarPis = Math.max(0, devidoPis - retidoPis);
        const pagarCofins = Math.max(0, devidoCofins - retidoCofins);
        const pagarIss = devidoIss;

        // 4. Cálculos dos Totais Consolidados
        const totalCargaTributaria = devidoIrpj + devidoIrpjAdd + devidoCsll + devidoPis + devidoCofins + devidoIss;
        const valorLiquido = faturamento - totalCargaTributaria;
        const aliquotaEfetiva = faturamento > 0 ? (totalCargaTributaria / faturamento) * 100 : 0;

        // Atualização dos campos da Tabela
        document.getElementById('base-irpj').innerText = formatarMoeda(basePresumida);
        document.getElementById('devido-irpj').innerText = formatarMoeda(devidoIrpj);
        document.getElementById('retido-irpj').innerText = formatarMoeda(retidoIrrf);
        document.getElementById('pagar-irpj').innerText = formatarMoeda(pagarIrpj);

        document.getElementById('base-irpj-add').innerText = formatarMoeda(basePresumidaExcedente > 0 ? basePresumidaExcedente : 0);
        document.getElementById('devido-irpj-add').innerText = formatarMoeda(devidoIrpjAdd);
        document.getElementById('pagar-irpj-add').innerText = formatarMoeda(pagarIrpjAdd);

        document.getElementById('base-csll').innerText = formatarMoeda(basePresumida);
        document.getElementById('devido-csll').innerText = formatarMoeda(devidoCsll);
        document.getElementById('retido-csll').innerText = formatarMoeda(retidoCsll);
        document.getElementById('pagar-csll').innerText = formatarMoeda(pagarCsll);

        document.getElementById('base-pis').innerText = formatarMoeda(faturamento);
        document.getElementById('devido-pis').innerText = formatarMoeda(devidoPis);
        document.getElementById('retido-pis').innerText = formatarMoeda(retidoPis);
        document.getElementById('pagar-pis').innerText = formatarMoeda(pagarPis);

        document.getElementById('base-cofins').innerText = formatarMoeda(faturamento);
        document.getElementById('devido-cofins').innerText = formatarMoeda(devidoCofins);
        document.getElementById('retido-cofins').innerText = formatarMoeda(retidoCofins);
        document.getElementById('pagar-cofins').innerText = formatarMoeda(pagarCofins);

        document.getElementById('base-iss').innerText = formatarMoeda(faturamento);
        document.getElementById('aliquota-iss-tab').innerText = mercado === 'nacional' ? `${aliquotaIss}%` : '0% (Isento)';
        document.getElementById('devido-iss').innerText = formatarMoeda(devidoIss);
        document.getElementById('pagar-iss').innerText = formatarMoeda(pagarIss);

        // Opacidade visual para indicar isenção nas linhas da tabela
        const linhasIsentas = ['row-pis', 'row-cofins', 'row-iss'];
        linhasIsentas.forEach(id => {
            document.getElementById(id).style.opacity = (mercado === 'exportacao') ? '0.4' : '1';
        });

        // Atualização dos Painéis Superiores
        document.getElementById('res-aliquota-efetiva').innerText = `${aliquotaEfetiva.toFixed(2)}%`.replace('.', ',');
        document.getElementById('res-total-impostos').innerText = formatarMoeda(totalCargaTributaria);
        document.getElementById('res-valor-liquido').innerText = formatarMoeda(valorLiquido);
    }
});
