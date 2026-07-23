(() => {
  'use strict';

  const lang = document.documentElement.lang === 'en' ? 'en' : 'cs';
  const t = {
    cs: {
      all:'Vše', minecraft:'Minecraft vše', mcMods:'MC mody', textures:'MC textury', shaders:'MC shadery', tboi:'TBOI vše', tboiMods:'TBOI mody',
      minecraftLabel:'Minecraft', tboiLabel:'TBOI Repentance', mod:'Mod', texture:'Texture Pack', shader:'Shader',
      choose:'Vybrat verzi', info:'Info', noDescription:'Bez popisu.', empty:'Nic tu zatím není. Přidej položku do downloads/manifest.json.',
      available:'Dostupná', planned:'Plánovaná', unavailable:'Není hotová', recommended:'Doporučená', versions:'verzí', version:'verze',
      modalSubtitle:'Vyber kompatibilní Minecraft verzi a loader.', download:'Stáhnout', selectFirst:'Nejdřív vyber dostupnou verzi', close:'Zavřít',
      finished:'Finished', notFinished:'Not Finished', plannedStatus:'Planned', release:'Vydání', loader:'Loader', gameVersion:'Verze hry'
    },
    en: {
      all:'All', minecraft:'All Minecraft', mcMods:'MC mods', textures:'MC textures', shaders:'MC shaders', tboi:'All TBOI', tboiMods:'TBOI mods',
      minecraftLabel:'Minecraft', tboiLabel:'TBOI Repentance', mod:'Mod', texture:'Texture Pack', shader:'Shader',
      choose:'Choose version', info:'Info', noDescription:'No description.', empty:'Nothing is here yet. Add an item to downloads/manifest.json.',
      available:'Available', planned:'Planned', unavailable:'Not ready', recommended:'Recommended', versions:'versions', version:'version',
      modalSubtitle:'Choose a compatible game version and loader.', download:'Download', selectFirst:'Select an available version first', close:'Close',
      finished:'Finished', notFinished:'Not Finished', plannedStatus:'Planned', release:'Release', loader:'Loader', gameVersion:'Game version'
    }
  }[lang];

  const fallback = {items:[]};
  const filters = [
    ['all',t.all], ['minecraft',t.minecraft], ['minecraft:mod',t.mcMods], ['minecraft:texture',t.textures],
    ['minecraft:shader',t.shaders], ['tboi',t.tboi], ['tboi:mod',t.tboiMods]
  ];
  const state = {filter:'all', q:'', items:[], activeItem:null, selectedVersion:-1};

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const statusClass = value => {
    const s = String(value || '').toLowerCase();
    if (s.includes('not')) return 'status-not-finished';
    if (s.includes('plan')) return 'status-planned';
    return 'status-finished';
  };
  const localizedDescription = item => item[`description_${lang}`] || item.description || t.noDescription;

  function versionsFor(item){
    if (Array.isArray(item.versions) && item.versions.length) return item.versions.map((version, index) => ({
      ...version,
      release:version.release || version.version || item.version || '?',
      loader:version.loader || item.loader || '',
      gameVersion:version.gameVersion || version.minecraft || version.game || '',
      status:version.status || item.status || t.finished,
      file:version.file || '',
      available:version.available !== false && Boolean(version.file),
      recommended:Boolean(version.recommended),
      _index:index
    }));
    return [{
      release:item.version || '?', loader:item.loader || '', gameVersion:item.gameVersion || '', status:item.status || t.finished,
      file:item.file || '', available:Boolean(item.file && item.file !== '#'), recommended:true, _index:0
    }];
  }

  function normalize(data){
    if (Array.isArray(data.items)) return data.items.map(item => ({...item, versions:versionsFor(item)}));
    const out=[];
    (data.mods||[]).forEach(x=>out.push({...x,game:x.game||'minecraft',type:x.type||'mod',icon:x.icon||'⚔'}));
    (data.textures||[]).forEach(x=>out.push({...x,game:x.game||'minecraft',type:x.type||'texture',icon:x.icon||'🧱'}));
    (data.shaders||[]).forEach(x=>out.push({...x,game:x.game||'minecraft',type:x.type||'shader',icon:x.icon||'🌌'}));
    (data.tboiMods||[]).forEach(x=>out.push({...x,game:'tboi',type:'mod',icon:x.icon||'👁'}));
    return out.map(item => ({...item, versions:versionsFor(item)}));
  }

  function itemLabel(item){
    const game = item.game === 'tboi' ? t.tboiLabel : t.minecraftLabel;
    return `${game} • ${t[item.type] || item.type || t.mod}`;
  }

  function matches(item){
    const versionText = item.versions.map(v => `${v.release} ${v.loader} ${v.gameVersion} ${v.status}`).join(' ');
    const text = `${item.name} ${localizedDescription(item)} ${item.game||''} ${item.type||''} ${versionText}`.toLowerCase();
    if (state.q && !text.includes(state.q.toLowerCase())) return false;
    if (state.filter === 'all') return true;
    if (state.filter.includes(':')) {
      const [game,type] = state.filter.split(':');
      return item.game === game && item.type === type;
    }
    return item.game === state.filter;
  }

  function renderTabs(){
    const root = document.getElementById('tabs');
    if (!root) return;
    root.innerHTML='';
    filters.forEach(([id,label]) => {
      const button=document.createElement('button');
      button.type='button';
      button.className=`tab${state.filter===id?' active':''}`;
      button.textContent=label;
      button.addEventListener('click',()=>{state.filter=id;render();});
      root.appendChild(button);
    });
  }

  function renderCounts(){
    const counts = {
      countMods:state.items.filter(i=>i.game==='minecraft'&&i.type==='mod').length,
      countTextures:state.items.filter(i=>i.game==='minecraft'&&i.type==='texture').length,
      countShaders:state.items.filter(i=>i.game==='minecraft'&&i.type==='shader').length,
      countTboi:state.items.filter(i=>i.game==='tboi').length
    };
    Object.entries(counts).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value;});
  }

  function renderCards(){
    const root=document.getElementById('cards');
    if (!root) return;
    const items=state.items.filter(matches);
    root.innerHTML='';
    if(!items.length){root.innerHTML=`<div class="empty">${escapeHtml(t.empty)}</div>`;return;}

    items.forEach(item => {
      const available=item.versions.filter(v=>v.available);
      const recommended=available.find(v=>v.recommended)||available[0]||item.versions[0];
      const status=recommended?.status||item.status||t.finished;
      const card=document.createElement('article');
      card.className='card';
      card.innerHTML=`
        <div class="card-head">
          <div class="icon" aria-hidden="true">${escapeHtml(item.icon||'📦')}</div>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <div class="meta">
              <span class="badge">${escapeHtml(itemLabel(item))}</span>
              <span class="badge ${statusClass(status)}">${escapeHtml(status)}</span>
              <span class="badge">${available.length}/${item.versions.length} ${escapeHtml(item.versions.length===1?t.version:t.versions)}</span>
            </div>
          </div>
        </div>
        <p class="desc">${escapeHtml(localizedDescription(item))}</p>
        <div class="version-summary">${recommended ? `${escapeHtml(recommended.loader)}${recommended.gameVersion?` • ${escapeHtml(recommended.gameVersion)}`:''}${recommended.release?` • ${escapeHtml(recommended.release)}`:''}` : ''}</div>
        <div class="card-actions">
          <button type="button" class="mc-button primary choose-version">⛏ ${escapeHtml(t.choose)}</button>
          ${item.info?`<a class="mc-button" href="${escapeHtml(item.info)}">${escapeHtml(t.info)}</a>`:''}
        </div>`;
      card.querySelector('.choose-version').addEventListener('click',()=>openModal(item));
      root.appendChild(card);
    });
  }

  function openModal(item){
    state.activeItem=item;
    const availableIndex=item.versions.findIndex(v=>v.available&&v.recommended);
    state.selectedVersion=availableIndex>=0?availableIndex:item.versions.findIndex(v=>v.available);
    document.getElementById('modalTitle').textContent=item.name;
    document.getElementById('modalSubtitle').textContent=t.modalSubtitle;
    renderVersionOptions();
    const modal=document.getElementById('versionModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    document.getElementById('closeModal').focus();
  }

  function renderVersionOptions(){
    const root=document.getElementById('versionList');
    root.innerHTML='';
    state.activeItem.versions.forEach((version,index)=>{
      const option=document.createElement('div');
      option.className=`version-option${state.selectedVersion===index?' selected':''}${version.available?'':' unavailable'}`;
      option.tabIndex=version.available?0:-1;
      option.setAttribute('role','radio');
      option.setAttribute('aria-checked',state.selectedVersion===index?'true':'false');
      const statusLabel=version.available?t.available:(String(version.status).toLowerCase().includes('plan')?t.planned:t.unavailable);
      option.innerHTML=`
        <span class="version-radio"></span>
        <span>
          <span class="version-name">${escapeHtml(version.gameVersion||version.loader||version.release)}</span>
          <span class="version-detail">${escapeHtml(t.loader)}: ${escapeHtml(version.loader||'—')} • ${escapeHtml(t.release)}: ${escapeHtml(version.release||'—')}${version.recommended?` • ★ ${escapeHtml(t.recommended)}`:''}</span>
        </span>
        <span class="version-state ${statusClass(version.status)}">${escapeHtml(statusLabel)}</span>`;
      if(version.available){
        const select=()=>{state.selectedVersion=index;renderVersionOptions();};
        option.addEventListener('click',select);
        option.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
      }
      root.appendChild(option);
    });
    const selected=state.activeItem.versions[state.selectedVersion];
    const download=document.getElementById('downloadSelected');
    download.disabled=!selected?.available;
    download.textContent=selected?.available?`⬇ ${t.download} ${selected.gameVersion||selected.release}`:t.selectFirst;
  }

  function closeModal(){
    const modal=document.getElementById('versionModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    state.activeItem=null;
    state.selectedVersion=-1;
  }

  function downloadSelected(){
    const version=state.activeItem?.versions[state.selectedVersion];
    if(!version?.available||!version.file)return;
    const anchor=document.createElement('a');
    anchor.href=version.file;
    anchor.rel='noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function render(){renderTabs();renderCounts();renderCards();}

  document.getElementById('search')?.addEventListener('input',event=>{state.q=event.target.value;renderCards();});
  document.getElementById('closeModal')?.addEventListener('click',closeModal);
  document.getElementById('cancelModal')?.addEventListener('click',closeModal);
  document.getElementById('downloadSelected')?.addEventListener('click',downloadSelected);
  document.getElementById('versionModal')?.addEventListener('click',event=>{if(event.target.id==='versionModal')closeModal();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('versionModal')?.classList.contains('open'))closeModal();});

  fetch('downloads/manifest.json',{cache:'no-store'})
    .then(response=>response.ok?response.json():fallback)
    .then(data=>{state.items=normalize(data);render();})
    .catch(()=>{state.items=normalize(fallback);render();});
})();
