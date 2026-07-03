document.addEventListener('DOMContentLoaded', function () {
    const inputFaturamento = document.getElementById('faturamento');
    const inputIss = document.getElementById('aliquota-iss');
    const selectMercado = document.getElementById('mercado');
    const selectPeriodo = document.getElementById('periodo');
    const labelFaturamento = document.getElementById('label-faturamento');
    const groupIss = document.getElementById('group-iss');
    const notaExportacao = document.getElementById('nota-exportacao');

    // Monitorização de alterações
    inputFaturamento.addEventListener('input', calcularImpostos);
    inputIss.addEventListener('input', calcularImpostos);
    selectPeriodo.addEventListener('change', function() {
        if (selectPeriodo.value === 'trimestral') {
            labelFaturamento.innerText = "Faturamento Bruto Trimestral (R$):";
        } else {
            labelFaturamento.innerText = "Faturamento Bruto Mensal (R$):";
        }
        calcularImpostos();
    });
    
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
        const periodo = selectPeriodo.value;

        // Regra do Lucro Presumido (32% de presunção para serviços)
        const percentualPresuncao = 0.32;
        const basePresumida = faturamento * percentualPresuncao;

        // Definir teto do Adicional de IRPJ com base no período (Mensal: 20k | Trimestral: 60k)
        const tetoAdicionalIR = (periodo === 'mensal') ? 20000 : 60000;

        // 1. Definição das Retenções na Fonte (Apenas no cenário Nacional COM retenção)
        let retidoIrrf = 0;
        let retidoCsll = 0;
        let retidoPis = 0;
        let retidoCofins = 0;

        if (mercado === 'nacional_com' && faturamento > 0) {
            retidoIrrf = faturamento * 0.015;  // 1,5%
            retidoCsll = faturamento * 0.01;   // 1,0%
            retidoPis = faturamento * 0.0065;  // 0,65%
            retidoCofins = faturamento * 0.03; // 3,0%
        }

        // 2. Impostos Devidos Totais (Antes de abater retenções)
        const devidoIrpj = basePresumida * 0.15; // 15%
        
        // Cálculo do Adicional de IRPJ (10% sobre o que excede o teto do período)
        let devidoIrpjAdd = 0;
        let basePresumidaExcedente = basePresumida - tetoAdicionalIR;
        if (basePresumidaExcedente > 0) {
            devidoIrpjAdd = basePresumidaExcedente * 0.10;
        }

        const devidoCsll = basePresumida * 0.09; // 9%

        // PIS, COFINS e ISS (Isentos se for Exportação)
        const devidoPis = (mercado !== 'exportacao') ? (faturamento * 0.0065) : 0;
        const devidoCofins = (mercado !== 'exportacao') ? (faturamento * 0.03) : 0;
        const devidoIss = (mercado !== 'exportacao') ? (faturamento * (aliquotaIss / 100)) : 0;

        // 3. Valor Líquido a Pagar nas Guias (Valor devido original menos o que foi retido na NF)
        const pagarIrpj = Math.max(0, devidoIrpj - retidoIrrf);
        const pagarIrpjAdd = devidoIrpjAdd; 
        const pagarCsll = Math.max(0, devidoCsll - retidoCsll);
        const pagarPis = Math.max(0, devidoPis - retidoPis);
        const pagarCofins = Math.max(0, devidoCofins - retidoCofins);
        const pagarIss = devidoIss;

        // 4. Totais Consolidados
        const totalCargaTributaria = devidoIrpj + devidoIrpjAdd + devidoCsll + devidoPis + devidoCofins + devidoIss;
        const valorLiquido = faturamento - totalCargaTributaria;
        const aliquotaEfetiva = faturamento > 0 ? (totalCargaTributaria / faturamento) * 100 : 0;

        // --- PREENCHIMENTO VISUAL DA TABELA DETALHADA ---

        // Atualizar Colunas de Faturamento Bruto de cada imposto
        document.getElementById('fat-irpj').innerText = formatarMoeda(faturamento);
        document.getElementById('fat-csll').innerText = formatarMoeda(faturamento);
        document.getElementById('fat-pis').innerText = formatarMoeda(faturamento);
        document.getElementById('fat-cofins').innerText = formatarMoeda(faturamento);
        document.getElementById('fat-iss').innerText = formatarMoeda(faturamento);

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

        // PIS
        document.getElementById('base-pis').innerText = formatarMoeda(faturamento);
        document.getElementById('devido-pis').innerText = formatarMoeda(devidoPis);
        document.getElementById('retido-pis').innerText = formatarMoeda(retidoPis);
        document.getElementById('pagar-pis').innerText = formatarMoeda(pagarPis);

        // COFINS
        document.getElementById('base-cofins').innerText = formatarMoeda(faturamento);
        document.getElementById('devido-cofins').innerText = formatarMoeda(devidoCofins);
        document.getElementById('retido-cofins').innerText = formatarMoeda(retidoCofins);
        document.getElementById('pagar-cofins').innerText = formatarMoeda(pagarCofins);

        // ISS
        document.getElementById('base-iss').innerText = formatarMoeda(faturamento);
        document.getElementById('aliquota-iss-tab').innerText = mercado !== 'exportacao' ? `${aliquotaIss}%` : '0% (Isento)';
        document.getElementById('devido-iss').innerText = formatarMoeda(devidoIss);
        document.getElementById('pagar-iss').innerText = formatarMoeda(pagarIss);

        // Opacidade visual para indicar isenção nas linhas caso seja exportação
        const linhasIsentas = ['row-pis', 'row-cofins', 'row-iss'];
        linhasIsentas.forEach(id => {
            document.getElementById(id).style.opacity = (mercado === 'exportacao') ? '0.4' : '1';
        });

        // Atualização dos Painéis Superiores de Resumo
        document.getElementById('res-aliquota-efetiva').innerText = `${aliquotaEfetiva.toFixed(2)}%`.replace('.', ',');
        document.getElementById('res-total-impostos').innerText = formatarMoeda(totalCargaTributaria);
        document.getElementById('res-valor-liquido').innerText = formatarMoeda(valorLiquido);
    }
});
