/* MIT License. WeKan catalogs applied only to interface text, never user data. */
(function (root) {
  'use strict';
  const catalog = root.webaI18nCatalog;
  if (!catalog || root.webaI18n) return;
  let language = 'en', messages = catalog.english, generation = 0;
  const original = new WeakMap(), attributes = new WeakMap();
  const normalize = text => text.replace(/\u00a0/g,' ').trim();
  const translate = text => {
    const key = catalog.lookup[normalize(text)];
    return language !== 'en' && key && messages[key] ? messages[key] : text;
  };
  const controls = new Set(catalog.controls);
  const excluded = 'input,textarea,script,style,.weba-card,.weba-board-tile,.gw-tree';
  function apply() {
    if (!root.document) return;
    document.querySelectorAll('[id]').forEach(control => {
      const name = control.id.split('.').pop();
      if (!controls.has(name) || control.matches(excluded)) return;
      const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.parentElement.closest(excluded)) continue;
        const prior = original.get(node);
        const source = prior && prior.translated === node.nodeValue ? prior.source : node.nodeValue;
        const translated = translate(source);
        if (node.nodeValue !== translated) node.nodeValue = translated;
        original.set(node, {source,translated});
      }
      for (const attr of ['title','aria-label']) {
        const value = control.getAttribute(attr);
        if (!value) continue;
        const state = attributes.get(control) || {};
        const prior = state[attr];
        const source = prior && prior.translated === value ? prior.source : value;
        const translated = translate(source);
        if (value !== translated) control.setAttribute(attr, translated);
        state[attr] = {source,translated}; attributes.set(control,state);
      }
    });
    document.querySelectorAll('[data-weba-language]').forEach(select => {
      if (!select.options.length) {
        for (const item of catalog.languages) select.add(new Option(item.name,item.code));
        select.addEventListener('change', () => setLanguage(select.value));
      }
      select.value = language;
      const caption = translate('Language');
      if (select.getAttribute('aria-label') !== caption) select.setAttribute('aria-label',caption);
      if (select.title !== caption) select.title = caption;
    });
  }
  function resolve(value) {
    const code = String(value || '').replace(/_/g,'-').toLowerCase();
    return catalog.languages.find(item=>item.code.replace(/_/g,'-').toLowerCase()===code)?.code ||
      catalog.languages.find(item=>item.code.toLowerCase()===code.split('-')[0])?.code || 'en';
  }
  async function setLanguage(value) {
    const selected = resolve(value), ticket = ++generation;
    let next = catalog.english;
    if (selected !== 'en') {
      try {
        const response = await fetch('i18n/'+encodeURIComponent(selected)+'.json');
        if (!response.ok) throw new Error('Translation unavailable');
        next = {...catalog.english, ...await response.json()};
      } catch (_) { return; } // Keep the currently working language on load failure.
    }
    if (ticket !== generation) return;
    language = selected; messages = next;
    try { localStorage.setItem('weba.language',language); } catch (_) {}
    const metadata = catalog.languages.find(item=>item.code===language);
    document.documentElement.lang = language.replace(/_/g,'-');
    document.documentElement.dir = metadata?.rtl ? 'rtl' : 'ltr';
    apply();
    if (root.webaRender) root.webaRender();
    root.dispatchEvent(new CustomEvent('weba-language-changed'));
  }
  root.webaI18n = {t:translate, setLanguage, resolve, get language() {return language;}};
  function start() {
    let preferred;
    try { preferred = localStorage.getItem('weba.language'); } catch (_) {}
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','aria-label']});
    setLanguage(preferred || navigator.language);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window);
