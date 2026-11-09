// MIT. Standalone adapters for the unchanged source markdown helper.
export const helpers = {};
export const HTML = {TEXTMODE:{STRING:'string'},Raw:value=>String(value)};
export class Template {constructor(name,render){this.name=name;this.render=render;}}
export const Blaze = {_toText:value=>String(value??''),Template:{registerHelper(name,template){helpers[name]=template.render;}}};
export class ReactiveVar {
  constructor(value){this.value=value;}
  get(){return this.value;}
  set(value){if(this.value===value)return;this.value=value;window.dispatchEvent(new CustomEvent('weba-workspace-markdown-changed'));}
}
