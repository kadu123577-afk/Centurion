/**
 * CENTURION — Utilitários de Formatação
 * Arquivo: src/utils/format.js
 * Responsabilidade: APENAS funções puras de formatação.
 * Regra: não importa nada de outros módulos do projeto.
 *        não acessa DOM. não faz chamadas de rede.
 */

/** Formata número como moeda brasileira */
export function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor) || 0);
}

/** Formata número como moeda sem o símbolo R$ */
export function moedaNum(valor) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(valor) || 0);
}

/** Formata data ISO para DD/MM/AAAA */
export function data(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('pt-BR');
}

/** Formata data e hora */
export function dataHora(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('pt-BR');
}

/** Formata data por extenso: "26 de maio de 2026" */
export function dataExtenso(str) {
  const d = str ? new Date(str) : new Date();
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/** Conta palavras em um texto */
export function contarPalavras(texto) {
  if (!texto || !texto.trim()) return 0;
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

/** Sanitiza string para uso seguro em innerHTML (previne XSS) */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Gera hash SHA-256 de uma string */
export async function sha256(texto) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(texto)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Formata hash para exibição: "A81F 92BC FF12 91AD..." */
export function hashDisplay(hash, grupos = 8) {
  if (!hash) return '';
  return hash.match(/.{1,4}/g)?.slice(0, grupos).join(' ').toUpperCase() || hash;
}

/** Gera número de protocolo: "0042/2026" */
export function formatarProtocolo(seq, ano) {
  return `${String(seq).padStart(4, '0')}/${ano || new Date().getFullYear()}`;
}

/** Remove caracteres não numéricos (para CNPJ, CPF, telefone) */
export function apenasNumeros(str) {
  return String(str || '').replace(/\D/g, '');
}

/** Formata CNPJ: "00.000.000/0001-00" */
export function formatarCNPJ(str) {
  const n = apenasNumeros(str).slice(0, 14);
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/** Trunca texto com reticências */
export function truncar(str, max = 80) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/** Slug a partir de texto (para IDs, chaves) */
export function slug(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
