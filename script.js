document.addEventListener('DOMContentLoaded', function () {
    // ABAS
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-target')).classList.add('active');
        });
    });

    // SELETORES
    const elPeriodo = document.getElementById('periodo');
    const elTrimestre = document.getElementById('trimestre');
    const elRegulamentado = document.getElementById('regulamentado');
    const elAcumulado = document.getElementById('acumulado_ano');
    const elRetroPago = document.getElementById('retroativo_pago');
    const elMercado = document.getElementById('mercado');
    const elIss = document.getElementById('aliquota-iss');
    const tbodyFaturamento = document.getElementById('linhas-faturamento');

    // EVENTOS
    elPeriodo.addEventListener('change', () => {
        document.getElementById('group-trimestre').style.display = elPeriodo.value === 'trimestral' ? 'block' : 'none';
        gerarInputsFaturamento();
    });
    elTrimestre.addEventListener('change', gerarInputsFaturamento);
    elRegulamentado.addEventListener('change', () => {
        document.getElementById('group-acumulado').style.display = elRegulamentado.value === 'nao' ? 'block' : 'none';
        calcularTudo();
    });
    elAcumulado.addEventListener('input', calcularTudo);
    elRetroPago.addEventListener('change', calcularTudo);
    elMercado.addEventListener('change', travarColunas);
    elIss.addEventListener('input', calcularTudo);

    function gerarInputsFaturamento() {
        tbodyFaturamento.innerHTML = '';
        let linhas = elPeriodo.value === 'trimestral' ? ['Mês 1', 'Mês 2', 'Mês 3'] : ['Mês Único'];
        
        linhas.forEach((mes, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${mes}</strong></td>
                <td><input type="number" class="fat-com input-table" value="${idx===0 && elPeriodo.value==='mensal' ? 500000 : 0}" step="0.01"></td>
                <td><input type="number" class="fat-sem input-table" value="0" step="0.01"></td>
                <td><input type="number" class="fat-exp input-table" value="0" step="0.01"></td>
            `;
            tbodyFaturamento.appendChild(tr);
        });
        
        document.querySelectorAll('.input-table').forEach(inp => inp.addEventListener('input', calcularTudo));
        travarColunas();
    }

    function travarColunas() {
        const cenario = elMercado.value;
        const com = document.querySelectorAll('.fat-com');
        const sem = document.querySelectorAll('.fat-sem');
        const exp = document.querySelectorAll('.fat-exp');

        const libera = (nodes) => nodes.forEach(n => { n.disabled = false; });
        const bloqueia = (nodes) => nodes.forEach(n => { n.disabled = true; n.value = 0; });

        libera(com); libera(sem); libera(exp);

        if (cenario === 'nacional_com') { bloqueia(sem); bloqueia(exp); }
        else if (cenario === 'nacional_sem') { bloqueia(com); bloqueia(exp); }
        else if (cenario === 'exportacao') { bloqueia(com); bloqueia(sem); }
        else if (cenario === 'misto_sem_exp') { bloqueia(com); }
        else if (cenario === 'misto_com_exp') { bloqueia(sem); }
        
        calcularTudo();
    }

    function formataReal(v) { return v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}); }

    function calcularTudo() {
        let vCom = 0, vSem = 0, vExp = 0;
        document.querySelectorAll('.fat-com').forEach(i => vCom += parseFloat(i.value) || 0);
        document.querySelectorAll('.fat-sem').forEach(i => vSem += parseFloat(i.value) || 0);
        document.querySelectorAll('.fat-exp').forEach(i => vExp += parseFloat(i.value) || 0);

        let fatNacional = vCom + vSem;
        let fatTotal = fatNacional + vExp;
        let fatAcumuladoAntes = parseFloat(elAcumulado.value) || 0;
        let fatAnual = fatAcumuladoAntes + fatTotal;
        let iss = parseFloat(elIss.value) || 0;

        // Lógica de Enquadramento 120k
        let presIRPJ = 0.32;
        let valorRetroativo = 0;
        let baseRetroativa = 0;
        let msgEnquadramento = "";
        
        const boxStatus = document.getElementById('status-limite-120k');
        const txtStatus = document.getElementById('texto-status-120k');
        const alertComp = document.getElementById('alerta-complemento');
        const rowRetro = document.getElementById('row-retroativo');
        const grpPago = document.getElementById('group-retroativo-pago');

        grpPago.style.display = (elRegulamentado.value === 'nao' && fatAnual > 120000) ? 'block' : 'none';

        if (elRegulamentado.value === 'sim') {
            msgEnquadramento = "Regulamentado (Fixo em 32%)";
            boxStatus.className = "card-status status-disabled";
            txtStatus.innerHTML = `<strong>${msgEnquadramento}</strong>`;
            alertComp.style.display = 'none';
            rowRetro.style.display = 'none';
        } else {
            if (fatAnual <= 120000) {
                presIRPJ = 0.16;
                msgEnquadramento = "Benefício de 16% (Até 120k)";
                boxStatus.className = "card-status status-ok";
                txtStatus.innerHTML = `<strong>${msgEnquadramento}</strong>`;
                alertComp.style.display = 'none';
                rowRetro.style.display = 'none';
            } else {
                presIRPJ = 0.32;
                boxStatus.className = "card-status status-alert";
                if (elRetroPago.value === 'sim') {
                    msgEnquadramento = "Limite Estourado (Já Regularizado) - 32%";
                    txtStatus.innerHTML = `<strong>${msgEnquadramento}</strong>`;
                    alertComp.style.display = 'none';
                    rowRetro.style.display = 'none';
                } else {
                    let maxBase = fatAcumuladoAntes > 120000 ? 120000 : fatAcumuladoAntes;
                    if (maxBase > 0) {
                        baseRetroativa = maxBase * 0.16;
                        valorRetroativo = baseRetroativa * 0.15;
                        msgEnquadramento = "Limite Estourado (Cobrando Retroativo) - 32%";
                        txtStatus.innerHTML = `<strong>${msgEnquadramento}</strong>`;
                        alertComp.innerHTML = `Gerado recolhimento do IRPJ Passado: ${formataReal(valorRetroativo)}`;
                        alertComp.style.display = 'block';
                        rowRetro.style.display = 'table-row';
                    } else {
                        msgEnquadramento = "Limite Estourado Neste Período - 32%";
                        txtStatus.innerHTML = `<strong>${msgEnquadramento}</strong>`;
                        alertComp.style.display = 'none';
                        rowRetro.style.display = 'none';
                    }
                }
            }
        }

        document.getElementById('pdf-enquadramento').innerText = msgEnquadramento;

        // Cálculos
        let baseIRPJ = fatTotal * presIRPJ;
        let baseCSLL = fatTotal * 0.32;
        let tetoAdicional = elPeriodo.value === 'mensal' ? 20000 : 60000;
        
        let rIrrf = vCom * 0.015;
        let rCsll = vCom * 0.01;
        let rPis = vCom * 0.0065;
        let rCof = vCom * 0.03;

        let dIrpj = baseIRPJ * 0.15;
        let exc = baseIRPJ - tetoAdicional;
        let dAdd = exc > 0 ? exc * 0.10 : 0;
        let dCsll = baseCSLL * 0.09;
        
        // Isenção Exportação
        let isExport = elMercado.value === 'exportacao';
        let dPis = fatNacional * 0.0065;
        let dCof = fatNacional * 0.03;
        let dIss = isExport ? 0 : fatNacional * (iss / 100);

        let pIrpj = Math.max(0, dIrpj - rIrrf);
        let pCsll = Math.max(0, dCsll - rCsll);
        let pPis = Math.max(0, dPis - rPis);
        let pCof = Math.max(0, dCof - rCof);

        let totTributos = dIrpj + dAdd + dCsll + dPis + dCof + dIss + valorRetroativo;
        let totLiquido = fatTotal - totTributos;
        let aliq = fatTotal > 0 ? (totTributos / fatTotal) * 100 : 0;

        // Atualiza a Tela
        const id = (el, v) => document.getElementById(el).innerText = v;
        id('res-aliquota-efetiva', aliq.toFixed(2).replace('.', ',') + '%');
        id('res-total-impostos', formataReal(totTributos));
        id('res-valor-liquido', formataReal(totLiquido));
        id('res-fat-periodo', formataReal(fatTotal));

        id('t-fat-irpj', formataReal(fatTotal)); id('t-pres-irpj', (presIRPJ*100)+'%'); id('base-irpj', formataReal(baseIRPJ)); id('devido-irpj', formataReal(dIrpj)); id('retido-irpj', formataReal(rIrrf)); id('pagar-irpj', formataReal(pIrpj));
        id('t-fat-retro', formataReal(baseRetroativa / 0.16 || 0)); id('base-retro', formataReal(baseRetroativa)); id('devido-retro', formataReal(valorRetroativo)); id('pagar-retro', formataReal(valorRetroativo));
        id('base-irpj-add', formataReal(exc > 0 ? exc : 0)); id('devido-irpj-add', formataReal(dAdd)); id('pagar-irpj-add', formataReal(dAdd));
        id('t-fat-csll', formataReal(fatTotal)); id('base-csll', formataReal(baseCSLL)); id('devido-csll', formataReal(dCsll)); id('retido-csll', formataReal(rCsll)); id('pagar-csll', formataReal(pCsll));
        id('t-fat-pis', formataReal(fatNacional)); id('base-pis', formataReal(fatNacional)); id('devido-pis', formataReal(dPis)); id('retido-pis', formataReal(rPis)); id('pagar-pis', formataReal(pPis));
        id('t-fat-cofins', formataReal(fatNacional)); id('base-cofins', formataReal(fatNacional)); id('devido-cofins', formataReal(dCof)); id('retido-cofins', formataReal(rCof)); id('pagar-cofins', formataReal(pCof));
        id('t-fat-iss', formataReal(fatNacional)); id('base-iss', formataReal(fatNacional)); id('aliquota-iss-tab', (isExport ? 0 : iss)+'%'); id('devido-iss', formataReal(dIss)); id('pagar-iss', formataReal(dIss));

        document.getElementById('row-pis').style.opacity = fatNacional===0 ? '0.4' : '1';
        document.getElementById('row-cofins').style.opacity = fatNacional===0 ? '0.4' : '1';
        document.getElementById('row-iss').style.opacity = isExport ? '0.4' : '1';

        // Preenche Whatsapp
        document.getElementById('texto-cliente').value = `📊 SIMULAÇÃO TRIBUTÁRIA - LUCRO PRESUMIDO\n\n• Faturamento Bruto: ${formataReal(fatTotal)}\n• Carga Tributária Efetiva: ${aliq.toFixed(2).replace('.',',')}%\n• Total de Impostos Gerados: ${formataReal(totTributos)}\n\n• Faturamento Líquido Estimado: ${formataReal(totLiquido)}`;
    }

    // GERA O PDF
    document.getElementById('btn-gerar-pdf').addEventListener('click', function() {
        // 1. Popula Cabeçalho do PDF
        document.getElementById('pdf-cenario').innerText = elMercado.options[elMercado.selectedIndex].text;
        document.getElementById('pdf-periodo').innerText = elPeriodo.value === 'trimestral' ? elTrimestre.value + 'º Trimestre' : 'Mensal';
        
        // 2. Popula Resumo do PDF
        document.getElementById('pdf-fat-bruto').innerText = document.getElementById('res-fat-periodo').innerText;
        document.getElementById('pdf-carga').innerText = document.getElementById('res-total-impostos').innerText;
        document.getElementById('pdf-aliq').innerText = document.getElementById('res-aliquota-efetiva').innerText;
        document.getElementById('pdf-liquido').innerText = document.getElementById('res-valor-liquido').innerText;

        // 3. Copia as linhas limpas da tela para o molde do PDF
        const tbodyPdf = document.getElementById('pdf-tbody');
        tbodyPdf.innerHTML = '';
        
        document.querySelectorAll('#tabela-detalhada tbody tr').forEach(row => {
            if(row.id === 'row-retroativo' && row.style.display === 'none') return;
            
            let novaLinha = document.createElement('tr');
            let isBold = row.id === 'row-retroativo';
            
            row.querySelectorAll('td').forEach((td, idx) => {
                let novaTd = document.createElement('td');
                novaTd.innerText = td.innerText;
                novaTd.style.border = "1px solid #000";
                novaTd.style.padding = "6px";
                novaTd.style.textAlign = idx === 0 ? "left" : "right";
                if(isBold) novaTd.style.fontWeight = "bold";
                novaLinha.appendChild(novaTd);
            });
            tbodyPdf.appendChild(novaLinha);
        });

        // 4. Imprime
        const opt = {
            margin: 10,
            filename: 'Simulacao_Tributaria.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(document.getElementById('pdf-molde')).save();
    });

    gerarInputsFaturamento();
});
