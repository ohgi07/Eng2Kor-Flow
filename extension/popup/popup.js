// Eng2Kor Flow 팝업: 전체 켜기/끄기, 이 사이트 끄기, 꺼 둔 사이트 목록
const DEFAULTS = { enabled: true, disabledSites: [] };
const $ = (id) => document.getElementById(id);
let state = { ...DEFAULTS };
let host = '';

// 현재 탭 최상위 프레임의 콘텐츠 스크립트에 호스트명을 묻는다. 응답이 없으면 동작하지 않는 페이지다.
async function currentHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return '';
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'eng2kor:host' }, { frameId: 0 });
    return res?.supported ? res.host : '';
  } catch {
    return '';
  }
}

function save(patch) {
  state = { ...state, ...patch };
  chrome.storage.sync.set(patch);
  render();
}

function render() {
  $('enabled').checked = state.enabled;
  $('site-row').hidden = !host;
  $('site-unavailable').hidden = !!host;
  $('site-host').textContent = host;
  $('site').checked = !state.disabledSites.includes(host);
  $('site').disabled = !state.enabled;
  $('disabled-title').hidden = state.disabledSites.length === 0;
  $('disabled-list').replaceChildren(...state.disabledSites.map((site) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = site;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '다시 켜기';
    button.addEventListener('click', () => save({ disabledSites: state.disabledSites.filter((s) => s !== site) }));
    item.append(name, button);
    return item;
  }));
}

$('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
$('site').addEventListener('change', (e) => save({
  disabledSites: e.target.checked
    ? state.disabledSites.filter((s) => s !== host)
    : [...new Set([...state.disabledSites, host])],
}));

(async () => {
  [state, host] = await Promise.all([chrome.storage.sync.get(DEFAULTS), currentHost()]);
  render();
})();
