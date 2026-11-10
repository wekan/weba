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

// Native navigation supplies only titles readable in the current archive context.
export function setCardTitles(titles={}){
  titles=titles&&typeof titles==='object'?titles:{};
  Markdown.resolveCardTitle=id=>Object.prototype.hasOwnProperty.call(titles,id)&&typeof titles[id]==='string'?titles[id]:undefined;
  window.dispatchEvent(new CustomEvent('weba-workspace-markdown-changed'));
}

import getSlug from 'limax';
import {workspaceSlugPath,workspaceIdForSlugPath,workspaceNamePath,splitWorkspacePath,allBoardsPath} from '../../vendor/wekan-markdown/allBoardsUrls.js';
export const workspaceUrls={
  path:(tree,id)=>allBoardsPath('workspaces',id?workspaceSlugPath(tree,id,getSlug):[]),
  slugs:(tree,id)=>workspaceSlugPath(tree,id,getSlug),
  resolve:(tree,path)=>workspaceIdForSlugPath(tree,splitWorkspacePath(path),getSlug)||'',
  names:(tree,path)=>workspaceNamePath(tree,splitWorkspacePath(path),getSlug),
};
