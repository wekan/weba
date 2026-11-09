// MIT. Source viewer rendering with explicit local policy snapshots, no DDP.
import {Markdown} from '../../vendor/wekan-markdown/template-integration.js';
import {helpers} from './meteor-adapter.js';
export function render(text){return helpers.markdown.call({templateContentBlock:String(text??'')});}
export function configure(options={}){
  for(const [key,value] of Object.entries(options)){
    if(!['alwaysShowCodeAsText','urlSchemes','externalLinkPattern','externalLinkRules'].includes(key))throw Error('Unknown Markdown policy');
    Markdown[key].set(value);
  }
}

// Exact source parser; administrators cannot enable forbidden handlers.
import {parseAllowedUrlSchemes} from '../../vendor/wekan-markdown/urlSchemeAllowlist.js';
export const parseUrlSchemes=parseAllowedUrlSchemes;
