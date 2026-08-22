(function () {
  "use strict";

  var replacements = [
    [/ConfiguraÃ§Ãµes/g, "Configurações"],
    [/NÃ£o/g, "Não"],
    [/nÃ£o/g, "não"],
    [/Ã§/g, "ç"],
    [/Ã£/g, "ã"],
    [/Ãµ/g, "õ"],
    [/Ã¡/g, "á"],
    [/Ã©/g, "é"],
    [/Ã­/g, "í"],
    [/Ã³/g, "ó"],
    [/Ãº/g, "ú"],
    [/Ãª/g, "ê"],
    [/Ã´/g, "ô"],
    [/\bNao e possivel\b/g, "Não é possível"],
    [/\bnao e possivel\b/g, "não é possível"],
    [/\bNao foi possivel\b/g, "Não foi possível"],
    [/\bnao foi possivel\b/g, "não foi possível"],
    [/\bNao ha\b/g, "Não há"],
    [/\bnao ha\b/g, "não há"],
    [/\bnao esta\b/g, "não está"],
    [/\bNao esta\b/g, "Não está"],
    [/\bja esta\b/g, "já está"],
    [/\bJa esta\b/g, "Já está"],
    [/\bainda esta\b/g, "ainda está"],
    [/\bTudo esta\b/g, "Tudo está"],
    [/\bestao disponiveis\b/g, "estão disponíveis"],
    [/\besta disponivel\b/g, "está disponível"],
    [/\be invalido\b/g, "é inválido"],
    [/\be invalida\b/g, "é inválida"],
    [/\be obrigatorio\b/g, "é obrigatório"],
    [/\be obrigatoria\b/g, "é obrigatória"],
    [/\be exclusivo\b/g, "é exclusivo"],
    [/\be exclusiva\b/g, "é exclusiva"],
    [/\bNao\b/g, "Não"],
    [/\bnao\b/g, "não"],
    [/\bInscricoes\b/g, "Inscrições"],
    [/\binscricoes\b/g, "inscrições"],
    [/\bInscricao\b/g, "Inscrição"],
    [/\binscricao\b/g, "inscrição"],
    [/\bUsuarios\b/g, "Usuários"],
    [/\busuarios\b/g, "usuários"],
    [/\bUsuario\b/g, "Usuário"],
    [/\busuario\b/g, "usuário"],
    [/\bMinisterios\b/g, "Ministérios"],
    [/\bministerios\b/g, "ministérios"],
    [/\bMinisterio\b/g, "Ministério"],
    [/\bministerio\b/g, "ministério"],
    [/\bRelatorios\b/g, "Relatórios"],
    [/\brelatorios\b/g, "relatórios"],
    [/\bRelatorio\b/g, "Relatório"],
    [/\brelatorio\b/g, "relatório"],
    [/\bParametros\b/g, "Parâmetros"],
    [/\bparametros\b/g, "parâmetros"],
    [/\bResponsaveis\b/g, "Responsáveis"],
    [/\bresponsaveis\b/g, "responsáveis"],
    [/\bResponsavel\b/g, "Responsável"],
    [/\bresponsavel\b/g, "responsável"],
    [/\bConfiguracoes\b/g, "Configurações"],
    [/\bconfiguracoes\b/g, "configurações"],
    [/\bConfiguracao\b/g, "Configuração"],
    [/\bconfiguracao\b/g, "configuração"],
    [/\bInformacoes\b/g, "Informações"],
    [/\binformacoes\b/g, "informações"],
    [/\bInformacao\b/g, "Informação"],
    [/\binformacao\b/g, "informação"],
    [/\bOpcoes\b/g, "Opções"],
    [/\bopcoes\b/g, "opções"],
    [/\bOpcao\b/g, "Opção"],
    [/\bopcao\b/g, "opção"],
    [/\bDescricao\b/g, "Descrição"],
    [/\bdescricao\b/g, "descrição"],
    [/\binscricão\b/gi, "inscrição"],
    [/\bRevisao\b/g, "Revisão"],
    [/\brevisao\b/g, "revisão"],
    [/\bPendencia\b/g, "Pendência"],
    [/\bpendencia\b/g, "pendência"],
    [/\bPendencias\b/g, "Pendências"],
    [/\bpendencias\b/g, "pendências"],
    [/\bGratis\b/g, "Grátis"],
    [/\bgratis\b/g, "grátis"],
    [/\bCartao\b/g, "Cartão"],
    [/\bcartao\b/g, "cartão"],
    [/\bPre-visualizacao\b/g, "Pré-visualização"],
    [/\bpre-visualizacao\b/g, "pré-visualização"],
    [/\bLiberacao\b/g, "Liberação"],
    [/\bliberacao\b/g, "liberação"],
    [/\bCobranca\b/g, "Cobrança"],
    [/\bcobranca\b/g, "cobrança"],
    [/\bConfirmacao\b/g, "Confirmação"],
    [/\bconfirmacao\b/g, "confirmação"],
    [/\bValidacao\b/g, "Validação"],
    [/\bvalidacao\b/g, "validação"],
    [/\bVerificacao\b/g, "Verificação"],
    [/\bverificacao\b/g, "verificação"],
    [/\bAtualizacao\b/g, "Atualização"],
    [/\batualizacao\b/g, "atualização"],
    [/\bAlteracoes\b/g, "Alterações"],
    [/\balteracoes\b/g, "alterações"],
    [/\bAlteracao\b/g, "Alteração"],
    [/\balteracao\b/g, "alteração"],
    [/\bExclusao\b/g, "Exclusão"],
    [/\bexclusao\b/g, "exclusão"],
    [/\bCriacao\b/g, "Criação"],
    [/\bcriacao\b/g, "criação"],
    [/\bIntegracao\b/g, "Integração"],
    [/\bintegracao\b/g, "integração"],
    [/\bSincronizacao\b/g, "Sincronização"],
    [/\bsincronizacao\b/g, "sincronização"],
    [/\bTransacao\b/g, "Transação"],
    [/\btransacao\b/g, "transação"],
    [/\bPermissao\b/g, "Permissão"],
    [/\bpermissao\b/g, "permissão"],
    [/\bAdministracao\b/g, "Administração"],
    [/\badministracao\b/g, "administração"],
    [/\bProducao\b/g, "Produção"],
    [/\bproducao\b/g, "produção"],
    [/\bComunicacao\b/g, "Comunicação"],
    [/\bcomunicacao\b/g, "comunicação"],
    [/\bSelecao\b/g, "Seleção"],
    [/\bselecao\b/g, "seleção"],
    [/\bSituacao\b/g, "Situação"],
    [/\bsituacao\b/g, "situação"],
    [/\bObservacao\b/g, "Observação"],
    [/\bobservacao\b/g, "observação"],
    [/\bEdicao\b/g, "Edição"],
    [/\bedicao\b/g, "edição"],
    [/\bAtencao\b/g, "Atenção"],
    [/\batencao\b/g, "atenção"],
    [/\bAcoes\b/g, "Ações"],
    [/\bacoes\b/g, "ações"],
    [/\bAcao\b/g, "Ação"],
    [/\bacao\b/g, "ação"],
    [/\bFuncoes\b/g, "Funções"],
    [/\bfuncoes\b/g, "funções"],
    [/\bFuncao\b/g, "Função"],
    [/\bfuncao\b/g, "função"],
    [/\bNotificacao\b/g, "Notificação"],
    [/\bnotificacao\b/g, "notificação"],
    [/\bOperacao\b/g, "Operação"],
    [/\boperacao\b/g, "operação"],
    [/\bPeriodo\b/g, "Período"],
    [/\bperiodo\b/g, "período"],
    [/\bGenero\b/g, "Gênero"],
    [/\bgenero\b/g, "gênero"],
    [/\bCodigo\b/g, "Código"],
    [/\bcodigo\b/g, "código"],
    [/\bMetodo\b/g, "Método"],
    [/\bmetodo\b/g, "método"],
    [/\bNumero\b/g, "Número"],
    [/\bnumero\b/g, "número"],
    [/\bEndereco\b/g, "Endereço"],
    [/\bendereco\b/g, "endereço"],
    [/\bTitulo\b/g, "Título"],
    [/\btitulo\b/g, "título"],
    [/\bSecao\b/g, "Seção"],
    [/\bsecao\b/g, "seção"],
    [/\bHistorico\b/g, "Histórico"],
    [/\bhistorico\b/g, "histórico"],
    [/\bInicio\b/g, "Início"],
    [/\binicio\b/g, "início"],
    [/\bTermino\b/g, "Término"],
    [/\btermino\b/g, "término"],
    [/\bUltimo\b/g, "Último"],
    [/\bultimo\b/g, "último"],
    [/\bUltima\b/g, "Última"],
    [/\bultima\b/g, "última"],
    [/\bAniversario\b/g, "Aniversário"],
    [/\baniversario\b/g, "aniversário"],
    [/\bNecessario\b/g, "Necessário"],
    [/\bnecessario\b/g, "necessário"],
    [/\bNecessaria\b/g, "Necessária"],
    [/\bnecessaria\b/g, "necessária"],
    [/\bPublico\b/g, "Público"],
    [/\bpublico\b/g, "público"],
    [/\bPublica\b/g, "Pública"],
    [/\bpublica\b/g, "pública"],
    [/\bUnico\b/g, "Único"],
    [/\bunico\b/g, "único"],
    [/\bMaximo\b/g, "Máximo"],
    [/\bmaximo\b/g, "máximo"],
    [/\bMaxima\b/g, "Máxima"],
    [/\bmaxima\b/g, "máxima"],
    [/\bMinimo\b/g, "Mínimo"],
    [/\bminimo\b/g, "mínimo"],
    [/\bMinima\b/g, "Mínima"],
    [/\bminima\b/g, "mínima"],
    [/\bProximo\b/g, "Próximo"],
    [/\bproximo\b/g, "próximo"],
    [/\bProxima\b/g, "Próxima"],
    [/\bproxima\b/g, "próxima"],
    [/\bInvalido\b/g, "Inválido"],
    [/\binvalido\b/g, "inválido"],
    [/\bInvalida\b/g, "Inválida"],
    [/\binvalida\b/g, "inválida"],
    [/\bObrigatorio\b/g, "Obrigatório"],
    [/\bobrigatorio\b/g, "obrigatório"],
    [/\bObrigatoria\b/g, "Obrigatória"],
    [/\bobrigatoria\b/g, "obrigatória"],
    [/\bDisponivel\b/g, "Disponível"],
    [/\bdisponivel\b/g, "disponível"],
    [/\bDisponiveis\b/g, "Disponíveis"],
    [/\bdisponiveis\b/g, "disponíveis"],
    [/\bPossivel\b/g, "Possível"],
    [/\bpossivel\b/g, "possível"],
    [/\bJa\b/g, "Já"],
    [/\bja\b/g, "já"],
    [/\bAte\b/g, "Até"],
    [/\bate\b/g, "até"],
    [/\bApos\b/g, "Após"],
    [/\bapos\b/g, "após"],
    [/\bVoce\b/g, "Você"],
    [/\bvoce\b/g, "você"],
    [/\bVoces\b/g, "Vocês"],
    [/\bvoces\b/g, "vocês"],
    [/\bSera\b/g, "Será"],
    [/\bsera\b/g, "será"],
    [/\bSerao\b/g, "Serão"],
    [/\bserao\b/g, "serão"],
    [/\bSao\b/g, "São"],
    [/\bsao\b/g, "são"],
    [/\bTambem\b/g, "Também"],
    [/\btambem\b/g, "também"],
    [/\bPorem\b/g, "Porém"],
    [/\bporem\b/g, "porém"],
    [/\bgratuíto\b/gi, "gratuito"]
  ];

  function normalize(value) {
    var output = value;
    for (var index = 0; index < replacements.length; index += 1) {
      output = output.replace(replacements[index][0], replacements[index][1]);
    }
    return output;
  }

  function normalizeAttributes(element) {
    ["placeholder", "title", "aria-label"].forEach(function (attribute) {
      if (!element.hasAttribute || !element.hasAttribute(attribute)) return;
      var current = element.getAttribute(attribute) || "";
      var corrected = normalize(current);
      if (corrected !== current) element.setAttribute(attribute, corrected);
    });
  }

  function normalizeTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      var parentName = root.parentElement && root.parentElement.tagName;
      if (parentName === "SCRIPT" || parentName === "STYLE" || parentName === "CODE" || parentName === "PRE") return;
      var corrected = normalize(root.nodeValue || "");
      if (corrected !== root.nodeValue) root.nodeValue = corrected;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) normalizeAttributes(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) normalizeAttributes(node);
      else normalizeTree(node);
    }
  }

  function start() {
    normalizeTree(document.body);
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "characterData") normalizeTree(mutation.target);
        mutation.addedNodes.forEach(normalizeTree);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
