// Real native personal workspace controls, with independent persisted SQL rows.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original Playwright fixture dependency unavailable');
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-member',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const seeded=fixture('seed-spaces','rest-other');
 const foreign=fixture('create-space','rest-other',{WEBA_SPACE_NAME:'Other private workspace'}).spaceId;
 const control=name=>`[id$=".${name}"]`,entry=name=>`[id$=".${name}:entry"],textarea[id$=".${name}"]`;
 let browser,context,otherContext;const errors=[];
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  const click=async name=>{await settle();await page.locator(control(name)).click();await settle();};
  const fill=async(name,text)=>{await settle();await page.locator(entry(name)).fill(text);};
  async function login(target,user){await target.goto(process.env.WEBA_TEST_URL);await target.waitForFunction(()=>window.webaI18n);await target.evaluate(()=>webaI18n.setLanguage('en'));await target.locator(entry('WebTextName')).fill(user);await target.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await target.locator(control('WebButtonLogin')).click();await expect(target.locator(control('AddWorkspace'))).toBeVisible();}
  const names=()=>page.locator('.weba-board-tile strong').allTextContents();
  const space=name=>page.locator('.weba-space-row').filter({has:page.locator('.weba-space-open').filter({hasText:name})});
  const spaces=()=>fixture('read').rawSpaces;
  await login(page,'rest-member');
  await expect(page.locator('.weba-space-open')).toHaveCount(0);
  await click('AddWorkspace');await expect(page.locator(control('WorkspacePanel'))).toBeVisible();
  await expect(page.locator(control('SaveWorkspace'))).toHaveText('Add Workspace');
  await click('SaveWorkspace');await expect(page.locator(control('WorkspacePanel'))).toBeVisible();expect(spaces()).toHaveLength(0);
  await fill('WorkspaceName','  Members  ');await click('SaveWorkspace');
  await expect(page.locator('.weba-space-open')).toHaveText(['Members']);
  let root=spaces().find(row=>row.name==='Members');expect(root.parentId).toBe(0);
  await space('Members').locator('.weba-space-menu').click();await expect(page.locator(entry('WorkspaceName'))).toHaveValue('Members');
  await fill('WorkspaceName','Root <literal>');await fill('WorkspaceIcon','📁');await click('SaveWorkspace');
  await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>']);
  expect(spaces().find(row=>row.id===root.id).icon).toBe('📁');
  await space('Root <literal>').locator('.weba-space-menu').click();await click('AddSubworkspace');await fill('WorkspaceName','Child');await click('SaveWorkspace');
  const child=spaces().find(row=>row.name==='Child');expect(child.parentId).toBe(root.id);
  await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>','Child']);
  await expect(space('Root <literal>').locator('.weba-space-count')).toHaveText('0');
  await expect(space('Child').locator('.weba-space-count')).toHaveText('0');
  const caret=()=>space('Root <literal>').locator('.weba-space-collapse');
  await expect(caret()).toHaveAttribute('aria-expanded','true');
  await caret().click();await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>']);
  expect(fixture('read').collapsed[String(root.id)]).toBe(true);
  await expect(caret()).toHaveAttribute('aria-expanded','false');
  await page.reload();await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>']);
  await expect(caret()).toHaveAttribute('aria-label','Uncollapse: Root <literal>');
  await caret().press('Enter');await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>','Child']);await expect(caret()).toBeFocused();
  expect(fixture('read').collapsed[String(root.id)]).toBeUndefined();
  await caret().press('Space');await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>']);await expect(caret()).toBeFocused();
  fixture('expand-space','rest-member',{WEBA_SPACE_ID:String(root.id)});await page.bringToFront();await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>','Child']);
  // Readonly membership still permits personal organization.
  await click('HeaderSearch');await fill('BoardSearch','Workspace Alpha');await expect.poll(names).toEqual(['Workspace Alpha']);
  await page.locator('.weba-board-context').click();await expect(page.locator(control('ContextRename'))).toBeHidden();await click('ContextWorkspace');
  await page.locator(control('WorkspaceDestination')+' select').selectOption({label:'Root <literal> / Child'});await click('SaveBoardWorkspace');
  expect(fixture('read').assignments[String(seeded.ids[0])]).toBe(String(child.id));
  await expect.poll(names).toEqual(['Workspace Alpha']); // Nonempty search spans categories.
  await click('ClearBoardSearch');await expect.poll(names).not.toContain('Workspace Alpha');
  await space('Child').locator('.weba-space-open').click();await expect.poll(names).toEqual(['Workspace Alpha']);
  await expect(page.locator(control('PaneTitle'))).toHaveText('Child');
  await expect(space('Root <literal>').locator('.weba-space-count')).toHaveText('0');
  await expect(space('Child').locator('.weba-space-count')).toHaveText('1');
  await caret().click();await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>']);
  await expect(page.locator(control('PaneTitle'))).toHaveText('Child');await expect.poll(names).toEqual(['Workspace Alpha']);
  // Count only direct active boards, regardless of current search/selection.
  fixture('archive-space-board','rest-other',{WEBA_SPACE_BOARD:String(seeded.ids[0])});await page.bringToFront();await expect.poll(names).toEqual([]);
  expect(fixture('read').counts[String(child.id)]).toBe(0);
  fixture('restore-space-board','rest-other',{WEBA_SPACE_BOARD:String(seeded.ids[0])});await expect.poll(names).toEqual(['Workspace Alpha']);
  await caret().click();await expect(space('Child').locator('.weba-space-count')).toHaveText('1');
  await space('Root <literal>').locator('.weba-space-open').click();await expect.poll(names).toEqual([]);
  fixture('assign-space','rest-member',{WEBA_SPACE_BOARD:String(seeded.ids[0]),WEBA_SPACE_ID:String(root.id)});await page.bringToFront();await expect.poll(names).toEqual(['Workspace Alpha']);
  await expect(space('Root <literal>').locator('.weba-space-count')).toHaveText('1');await expect(space('Child').locator('.weba-space-count')).toHaveText('0');
  fixture('assign-space','rest-member',{WEBA_SPACE_BOARD:String(seeded.ids[0]),WEBA_SPACE_ID:String(child.id)});await expect.poll(names).toEqual([]);
  await space('Child').locator('.weba-space-open').click();await expect.poll(names).toEqual(['Workspace Alpha']);
  await page.locator('.weba-board-context').click();await click('ContextWorkspace');await page.locator(control('WorkspaceDestination')+' select').selectOption({label:'Remaining'});await click('SaveBoardWorkspace');await expect.poll(names).toEqual([]);
  expect(fixture('read').assignments[String(seeded.ids[0])]).toBeUndefined();
  fixture('assign-space','rest-member',{WEBA_SPACE_BOARD:String(seeded.ids[0]),WEBA_SPACE_ID:String(child.id)});await expect.poll(names).toEqual(['Workspace Alpha']);
  await space('Root <literal>').locator('.weba-space-open').click();await expect.poll(names).toEqual([]);

  await fill('BoardSearch','Workspace Alpha');await expect.poll(names).toEqual(['Workspace Alpha']);await click('ClearBoardSearch');
  await page.reload();await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>','Child']);
  await expect(page.locator('.weba-space-open')).not.toContainText(['Other private workspace']);
  // Live refresh preserves an open dirty editor; deleting its target closes it.
  await space('Child').locator('.weba-space-menu').click();await fill('WorkspaceName','Unsaved child draft');
  fixture('rename-space','rest-member',{WEBA_SPACE_ID:String(child.id),WEBA_SPACE_NAME:'External child'});await page.bringToFront();
  await expect(page.locator('.weba-space-open')).toContainText(['External child']);
  await expect(page.locator(entry('WorkspaceName'))).toHaveValue('Unsaved child draft');await click('CloseWorkspace');
  // A workspace named like an interface caption stays literal in another language.
  await space('External child').locator('.weba-space-menu').click();await fill('WorkspaceName','Members');await click('SaveWorkspace');
  await space('Members').locator('.weba-space-open').click();
  await page.evaluate(()=>webaI18n.setLanguage('fi'));await expect(page.locator('.weba-space-open')).toContainText(['Members']);await expect(page.locator(control('PaneTitle'))).toHaveText('Members');
  const fi=JSON.parse(fs.readFileSync(path.join(source,'imports/i18n/data/fi.i18n.json'),'utf8'));
  await expect(page.locator(control('WorkspacesHeading'))).toHaveText(fi['allboards.workspaces']);
  await expect(caret()).toHaveAttribute('aria-label',fi.collapse+': Root <literal>');
  await space('Members').locator('.weba-space-menu').click();
  await expect(page.locator(control('WorkspaceHeading'))).toHaveText(fi['allboards.edit-workspace']);await click('CloseWorkspace');
  await page.evaluate(()=>webaI18n.setLanguage('la'));
  const latin=JSON.parse(fs.readFileSync(path.join(source,'imports/i18n/data/la.i18n.json'),'utf8'));
  await expect(page.locator(control('WorkspacesHeading'))).toHaveText(latin['allboards.workspaces']);
  await click('AddWorkspace');await expect(page.locator(control('WorkspaceNameLabel'))).toHaveText(latin['allboards.add-workspace-prompt']);
  await expect(page.locator(control('SaveWorkspace'))).toHaveText(latin['allboards.add-workspace']);
  await expect(page.locator(entry('WorkspaceName'))).toHaveValue('');await click('CloseWorkspace');

  await page.evaluate(()=>webaI18n.setLanguage('en'));
  await space('Members').locator('.weba-space-menu').click();await click('DeleteWorkspace');await expect(page.locator(control('WorkspacePanel'))).toBeVisible();expect(spaces()).toHaveLength(2);
  await page.locator(control('ConfirmWorkspaceDelete')+' input').check();await click('DeleteWorkspace');await expect(page.locator('.weba-space-open')).toHaveText(['📁 Root <literal>']);
  await expect.poll(names).toContain('Workspace Alpha');expect(fixture('read').assignments[String(seeded.ids[0])]).toBeUndefined();
  // Losing board access closes the personal placement popup. A hidden native
  // Save event still cannot write after the server has cleared its authority.
  await click('HeaderSearch');await fill('BoardSearch','Workspace Bravo');await expect.poll(names).toEqual(['Workspace Bravo']);
  await page.locator('.weba-board-context').click();await click('ContextWorkspace');
  await page.locator(control('WorkspaceDestination')+' select').selectOption({label:'Root <literal>'});
  const beforeRevoke=fixture('read').assignments;
  fixture('revoke-space-board','rest-other',{WEBA_SPACE_BOARD:String(seeded.ids[1])});await page.bringToFront();await expect(page.locator(control('BoardWorkspacePanel'))).toBeHidden();
  await page.locator(control('SaveBoardWorkspace')).evaluate(button=>button.click());await settle();
  await expect(page.locator(control('Notice'))).toContainText('Workspace not found');
  expect(fixture('read').assignments).toEqual(beforeRevoke);
  fixture('grant-space-board','rest-other',{WEBA_SPACE_BOARD:String(seeded.ids[1])});await expect.poll(names).toEqual(['Workspace Bravo']);await click('ClearBoardSearch');
  // Other principal has only their own tree.
  otherContext=await browser.newContext();const other=await otherContext.newPage();await login(other,'rest-other');await expect(other.locator('.weba-space-open')).toHaveText(['Other private workspace']);
  expect(fixture('read','rest-other').rawSpaces.map(row=>row.id)).toContain(foreign);
  await page.bringToFront();await page.setViewportSize({width:390,height:844});
  if(await page.locator(control('PageSidebar')).isVisible())await click('CloseSidebar');
  if(!await page.locator(control('LeftNavigation')).isVisible())await click('ToggleNavigation');
  await expect(space('Root <literal>').locator('.weba-space-count')).toHaveText('0');
  await click('AddWorkspace');const box=await page.locator(control('WorkspacePanel')).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);
  await page.keyboard.press('Escape');await expect(page.locator(control('WorkspacePanel'))).toBeHidden();
  await space('Root <literal>').locator('.weba-space-menu').click();fixture('delete-space','rest-member',{WEBA_SPACE_ID:String(root.id)});await expect(page.locator(control('WorkspacePanel'))).toBeHidden();await expect(page.locator('.weba-space-open')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log('Native workspace browser: nested create/edit/confirmed delete, literal Unicode/icon persistence, readonly personal assignment, category/search, private persisted mouse/keyboard folding, direct active counts, reload/isolation, live placement/draft/deletion and revoked-save guards, translated labels and mobile popup/Escape passed');
 }finally{if(otherContext)await otherContext.close();if(context)await context.close();if(browser)await browser.close();}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
