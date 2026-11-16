import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConsole } from './console-page.mjs';

function load() {
  const page = loadConsole(['static/app.js', 'static/views.js'], () => [200, { tasks: [], repositories: [] }]);
  page.run(`
    me = { id: 'u', role: 'project_admin' };
    tab = 'board';
    projectRoute = () => null;
    render = async () => {};
    renderConsolePage = async () => {};
    announcePage = () => {};
    $('list-panel').className = 'list-panel';
    location.hash = '#/board';
  `);
  return page;
}

test('changing the console address closes the task and delivery dialogs', async () => {
  const page = load();
  await page.run('route()');
  page.run("taskView.showModal(); $('detail').showModal();");
  assert.equal(page.run('taskView.open'), true);
  assert.equal(page.run("$('detail').open"), true);
  await page.run('route()');
  assert.equal(page.run('taskView.open'), true, 'same address keeps the task dialog open');
  assert.equal(page.run("$('detail').open"), true, 'same address keeps the delivery dialog open');
  page.run("location.hash = '#/inbox';");
  await page.run('route()');
  assert.equal(page.run('taskView.open'), false, 'a new address closes the task dialog');
  assert.equal(page.run("$('detail').open"), false, 'a new address closes the delivery dialog');
});

test('a same-address redraw after navigation does not reopen closed dialogs', async () => {
  const page = load();
  await page.run('route()');
  page.run("taskView.showModal(); location.hash = '#/inbox';");
  await page.run('route()');
  assert.equal(page.run('taskView.open'), false);
  await page.run('route()');
  assert.equal(page.run('taskView.open'), false, 'redrawing inbox does not reopen the dialog');
});

test('changing the console address leaves the editor and confirm dialogs open', async () => {
  const page = load();
  await page.run('route()');
  page.run("$('editor').showModal(); confirmView.showModal();");
  assert.equal(page.run("$('editor').open"), true);
  assert.equal(page.run('confirmView.open'), true);
  page.run("location.hash = '#/inbox';");
  await page.run('route()');
  assert.equal(page.run("$('editor').open"), true, 'the editor stays open so in-progress input is not discarded');
  assert.equal(page.run('confirmView.open'), true, 'the confirm dialog stays open so in-progress input is not discarded');
});
