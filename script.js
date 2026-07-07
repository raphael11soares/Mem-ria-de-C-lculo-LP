document.addEventListener('DOMContentLoaded', function () {
    // Variável global para armazenar o diagnóstico de enquadramento
    let statusEnquadramentoPdf = "";

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
    elIss.addEventListener('change', calcularTudo);

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

        let isExport = elMercado.value === 'exportacao';
        if (!isExport) {
            if (iss > 0 && iss < 2) { iss = 2; elIss.value = 2; } 
            else if (iss > 5) { iss = 5; elIss.value = 5; }
        }

        let presIRPJ = 0.32;
        let valorRetroativo = 0;
        let baseRetroativa = 0;
        
        const boxStatus = document.getElementById('status-limite-120k');
        const txtStatus = document.getElementById('texto-status-120k');
        const alertComp = document.getElementById('alerta-complemento');
        const rowRetro = document.getElementById('row-retroativo');
        const grpPago = document.getElementById('group-retroativo-pago');

        grpPago.style.display = (elRegulamentado.value === 'nao' && fatAnual > 120000) ? 'block' : 'none';

        if (elRegulamentado.value === 'sim') {
            statusEnquadramentoPdf = "Regulamentado (Fixo em 32%)";
            boxStatus.className = "card-status status-disabled";
            txtStatus.innerHTML = `<strong>${statusEnquadramentoPdf}</strong>`;
            alertComp.style.display = 'none';
            rowRetro.style.display = 'none';
        } else {
            if (fatAnual <= 120000) {
                presIRPJ = 0.16;
                statusEnquadramentoPdf = "Benefício de 16% (Até 120k)";
                boxStatus.className = "card-status status-ok";
                txtStatus.innerHTML = `<strong>${statusEnquadramentoPdf}</strong>`;
                alertComp.style.display = 'none';
                rowRetro.style.display = 'none';
            } else {
                presIRPJ = 0.32;
                boxStatus.className = "card-status status-alert";
                if (elRetroPago.value === 'sim') {
                    statusEnquadramentoPdf = "Limite Estourado (Já Regularizado) - 32%";
                    txtStatus.innerHTML = `<strong>${statusEnquadramentoPdf}</strong>`;
                    alertComp.style.display = 'none';
                    rowRetro.style.display = 'none';
                } else {
                    let maxBase = fatAcumuladoAntes > 120000 ? 120000 : fatAcumuladoAntes;
                    if (maxBase > 0) {
                        baseRetroativa = maxBase * 0.16;
                        valorRetroativo = baseRetroativa * 0.15;
                        statusEnquadramentoPdf = "Atenção: Limite Estourado (Cobrando Retroativo)";
                        txtStatus.innerHTML = `<strong>${statusEnquadramentoPdf}</strong>`;
                        alertComp.innerHTML = `Gerado recolhimento do IRPJ Passado: ${formataReal(valorRetroativo)}`;
                        alertComp.style.display = 'block';
                        rowRetro.style.display = 'table-row';
                    } else {
                        statusEnquadramentoPdf = "Limite Estourado Neste Período - 32%";
                        txtStatus.innerHTML = `<strong>${statusEnquadramentoPdf}</strong>`;
                        alertComp.style.display = 'none';
                        rowRetro.style.display = 'none';
                    }
                }
            }
        }

        let baseIRPJ = fatTotal * presIRPJ;
        let baseCSLL = fatTotal * 0.32;
        let tetoAdicional = elPeriodo.value === 'mensal' ? 20000 : 60000;
        
        let rIrrf = vCom * 0.015;
        if (rIrrf <= 10) rIrrf = 0;

        let csrfTotal = vCom * 0.0465;
        let rCsll = 0, rPis = 0, rCof = 0;
        if (csrfTotal > 10) {
            rCsll = vCom * 0.01;
            rPis = vCom * 0.0065;
            rCof = vCom * 0.03;
        }

        let dIrpj = baseIRPJ * 0.15;
        let exc = baseIRPJ - tetoAdicional;
        let dAdd = exc > 0 ? exc * 0.10 : 0;
        let dCsll = baseCSLL * 0.09;
        
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

        document.getElementById('texto-cliente').value = `📊 SIMULAÇÃO TRIBUTÁRIA - LUCRO PRESUMIDO\n\n• Faturamento Bruto: ${formataReal(fatTotal)}\n• Carga Tributária Efetiva: ${aliq.toFixed(2).replace('.',',')}%\n• Total de Impostos Gerados: ${formataReal(totTributos)}\n\n• Faturamento Líquido Estimado: ${formataReal(totLiquido)}`;
    }

    // --- O NOVO GERADOR DE PDF VETORIAL (NATIVO E INDESTRUTÍVEL) ---
    document.getElementById('btn-gerar-pdf').addEventListener('click', function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Título e Cabeçalho
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("RELATÓRIO DE PLANEJAMENTO TRIBUTÁRIO", pageWidth / 2, 20, { align: "center" });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text("Simulação Avançada — Regime do Lucro Presumido", pageWidth / 2, 26, { align: "center" });

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(14, 30, pageWidth - 14, 30);

        // 2. Informações Dinâmicas do Cenário
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const cenarioText = elMercado.options[elMercado.selectedIndex].text;
        const periodoText = elPeriodo.value === 'trimestral' ? elTrimestre.options[elTrimestre.selectedIndex].text : 'Mensal';
        const dataEmissao = new Date().toLocaleDateString('pt-BR');

        doc.setFont("helvetica", "bold"); doc.text("Cenário de Apuração:", 14, 40);
        doc.setFont("helvetica", "normal"); doc.text(cenarioText, 52, 40);

        doc.setFont("helvetica", "bold"); doc.text("Período / Data:", 14, 46);
        doc.setFont("helvetica", "normal"); doc.text(`${periodoText} (Emitido em ${dataEmissao})`, 42, 46);

        doc.setFont("helvetica", "bold"); doc.text("Status de Enquadramento:", 14, 52);
        doc.setFont("helvetica", "normal"); doc.text(statusEnquadramentoPdf, 60, 52);

        // 3. Tabela de Resumo Financeiro
        doc.autoTable({
            startY: 60,
            theme: 'grid',
            head: [['Indicador Estratégico', 'Valor Estimado']],
            body: [
                ['Faturamento Bruto Consolidado', document.getElementById('res-fat-periodo').innerText],
                ['Carga Tributária Total Gerada', document.getElementById('res-total-impostos').innerText],
                ['Alíquota Efetiva Real', document.getElementById('res-aliquota-efetiva').innerText],
                ['Resultado Líquido (Disponível no Caixa)', document.getElementById('res-valor-liquido').innerText]
            ],
            headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 120 },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            styles: { fontSize: 10, cellPadding: 4 }
        });

        // 4. Extração da Memória de Cálculo (Lê a tabela da tela)
        const tableData = [];
        document.querySelectorAll('#tabela-detalhada tbody tr').forEach(row => {
            if(row.style.display === 'none') return;
            const rowData = [];
            row.querySelectorAll('td').forEach(td => rowData.push(td.innerText));
            tableData.push(rowData);
        });

        // 5. Tabela Principal (Cálculo Fino)
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 12,
            theme: 'grid',
            head: [['Tributo', 'Fat. Base', 'Pres.(%)', 'Base Cálc.', 'Alíq.', 'Devido', 'Retido (NF)', 'A Pagar']],
            body: tableData,
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            styles: { fontSize: 8.5, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' },
                2: { halign: 'center' },
                3: { halign: 'right' },
                4: { halign: 'center' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] } // Cor Vermelha na coluna 'A Pagar'
            },
            didParseCell: function(data) {
                // Destaca a linha do IRPJ Complementar (se existir)
                if (data.row.raw[0] && data.row.raw[0].includes("Complementar")) {
                    data.cell.styles.textColor = [180, 83, 9];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [255, 251, 235];
                }
            }
        });

        // 6. Rodapé Legal
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("* Nota Contábil: Este documento é uma simulação técnica estimativa fundamentada no Art. 33 da Lei nº 9.250/95.", 14, doc.lastAutoTable.finalY + 10);
        
        // Dispara o Download
        doc.save('Memoria_Planejamento_Tributario.pdf');
    });

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

    gerarInputsFaturamento();
});
