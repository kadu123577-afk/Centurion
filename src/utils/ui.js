/**
 * CENTURION — Utilitários de Interface
 * Arquivo: src/utils/ui.js
 * Responsabilidade: APENAS funções que manipulam DOM genérico.
 *   toast, loader, modal de confirmação, foco.
 * Regra: não conhece regras de negócio.
 *        não faz chamadas ao Supabase.
 *        não importa módulos de domínio.
 */

import { esc } from './format.js';

/* ══════════════════════════════════════════════════════════════
   TOAST
   Exibe notificações temporárias no canto inferior direito.
   Uso: toast('Salvo!') | toast('Erro', 'error') | toast('Aviso', 'warning', 5000)
══════════════════════════════════════════════════════════════ */

function _getToastContainer() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

export function toast(msg, tipo = 'success', duracao = 3000) {
  const container = _getToastContainer();

  const icones = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
  };

  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `<span style="font-size:15px;flex-shrink:0">${icones[tipo] || '•'}</span><span>${esc(msg)}</span>`;
  container.appendChild(el);

  // Remove com fade
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, duracao);
}

/* ══════════════════════════════════════════════════════════════
   LOADER GLOBAL
   Cobre a tela inteira durante operações assíncronas.
   Uso: loader(true, 'Salvando...') | loader(false)
══════════════════════════════════════════════════════════════ */

export function loader(mostrar, texto = 'Carregando...') {
  let el = document.getElementById('loader-global');

  if (mostrar) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'loader-global';
      el.innerHTML = `
        <div class="spinner spinner-lg"></div>
        <span>${esc(texto)}</span>
      `;
      document.body.appendChild(el);
    } else {
      const span = el.querySelector('span');
      if (span) span.textContent = texto;
    }
  } else {
    el?.remove();
  }
}

/* ══════════════════════════════════════════════════════════════
   CONFIRMAR
   Modal de confirmação assíncrono — substitui window.confirm.
   Uso: const ok = await confirmar('Deletar este item?')
        if (ok) { ... }
══════════════════════════════════════════════════════════════ */

export function confirmar(msg, opcoes = {}) {
  const {
    titulo    = 'Confirmar ação',
    labelSim  = 'Confirmar',
    labelNao  = 'Cancelar',
    perigo    = false,
  } = opcoes;

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <div>
            <div class="modal-title">${esc(titulo)}</div>
          </div>
        </div>
        <div class="modal-body">
          <p style="color:var(--text2);font-size:14px;line-height:1.6">${esc(msg)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="conf-nao">${esc(labelNao)}</button>
          <button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" id="conf-sim">${esc(labelSim)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#conf-sim').onclick = () => {
      overlay.remove();
      resolve(true);
    };
    overlay.querySelector('#conf-nao').onclick = () => {
      overlay.remove();
      resolve(false);
    };

    // Fechar com Escape
    const onKey = e => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(false);
      }
    };
    document.addEventListener('keydown', onKey);
  });
}

/* ══════════════════════════════════════════════════════════════
   MODAL GENÉRICO
   Abre um modal com conteúdo HTML customizado.
   Retorna o elemento do overlay para quem quiser fechar programaticamente.
   Uso:
     const modal = abrirModal({
       titulo: 'Editar item',
       conteudo: '<input ...>',
       acoes: [{ label: 'Salvar', fn: () => {} }]
     })
     fecharModal(modal)
══════════════════════════════════════════════════════════════ */

export function abrirModal({ titulo, subtitulo = '', conteudo, acoes = [], tamanho = '' }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const acoesHtml = acoes.map((a, i) =>
    `<button class="btn ${a.classe || 'btn-primary'}" data-acao="${i}">${esc(a.label)}</button>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal ${tamanho}">
      <div class="modal-header">
        <div>
          <div class="modal-title">${esc(titulo)}</div>
          ${subtitulo ? `<div class="modal-subtitle">${esc(subtitulo)}</div>` : ''}
        </div>
        <button class="btn btn-icon btn-ghost" id="modal-fechar" style="margin-left:auto">✕</button>
      </div>
      <div class="modal-body">${conteudo}</div>
      ${acoes.length ? `<div class="modal-footer">${acoesHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#modal-fechar').onclick = () => overlay.remove();

  acoes.forEach((a, i) => {
    overlay.querySelector(`[data-acao="${i}"]`).onclick = () => {
      a.fn(overlay);
    };
  });

  // Fechar com Escape
  const onKey = e => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  return overlay;
}

export function fecharModal(overlay) {
  overlay?.remove();
}

/* ══════════════════════════════════════════════════════════════
   FOCO
   Utilitário para focar o primeiro campo de um container.
══════════════════════════════════════════════════════════════ */

export function focarPrimeiroCampo(container) {
  const el = container?.querySelector('input, textarea, select');
  el?.focus();
}

/* ══════════════════════════════════════════════════════════════
   COLETAR DADOS DE FORMULÁRIO
   Lê todos os elementos com [data-campo] dentro de um container.
   Retorna objeto { campo: valor }.
══════════════════════════════════════════════════════════════ */

export function coletarForm(container) {
  const dados = {};
  container?.querySelectorAll('[data-campo]').forEach(el => {
    const chave = el.dataset.campo;
    if (el.type === 'checkbox') {
      dados[chave] = el.checked;
    } else {
      dados[chave] = el.value ?? el.textContent;
    }
  });
  return dados;
}

/* ══════════════════════════════════════════════════════════════
   PREENCHER FORMULÁRIO
   Preenche elementos [data-campo] com valores de um objeto.
══════════════════════════════════════════════════════════════ */

export function preencherForm(container, dados = {}) {
  if (!container || !dados) return;
  Object.entries(dados).forEach(([chave, valor]) => {
    const el = container.querySelector(`[data-campo="${chave}"]`);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = Boolean(valor);
    } else {
      el.value = valor ?? '';
    }
  });
}
