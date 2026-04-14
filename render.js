(function () {
  const ABILITIES = [
    { key: 'str', statKey: 'STR', label: 'Force',        skills: ['Athletics'] },
    { key: 'dex', statKey: 'DEX', label: 'Dextérité',    skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'] },
    { key: 'con', statKey: 'CON', label: 'Constitution', skills: [] },
    { key: 'int', statKey: 'INT', label: 'Intelligence', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'] },
    { key: 'wis', statKey: 'WIS', label: 'Sagesse',      skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'] },
    { key: 'cha', statKey: 'CHA', label: 'Charisme',     skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'] }
  ];

  const SKILL_FR = {
    Athletics: 'Athlétisme', Acrobatics: 'Acrobaties', 'Sleight of Hand': 'Escamotage',
    Stealth: 'Discrétion', Arcana: 'Arcanes', History: 'Histoire',
    Investigation: 'Investigation', Nature: 'Nature', Religion: 'Religion',
    'Animal Handling': 'Dressage', Insight: 'Perspicacité', Medicine: 'Médecine',
    Perception: 'Perception', Survival: 'Survie', Deception: 'Tromperie',
    Intimidation: 'Intimidation', Performance: 'Représentation', Persuasion: 'Persuasion'
  };

  const LABEL_FR = {
    Armor: 'Armures', Weapons: 'Armes', Tools: 'Outils', Languages: 'Langues',
    'Light Armor': 'Armures légères', 'Medium Armor': 'Armures intermédiaires',
    'Heavy Armor': 'Armures lourdes', Shields: 'Boucliers',
    'Simple Weapons': 'Armes courantes', 'Martial Weapons': 'Armes martiales',
    Common: 'Commun', Draconic: 'Draconique', Elvish: 'Elfique',
    'Strength Saving Throws': 'Jets de sauvegarde de Force',
    'Dexterity Saving Throws': 'Jets de sauvegarde de Dextérité',
    'Constitution Saving Throws': 'Jets de sauvegarde de Constitution',
    'Intelligence Saving Throws': 'Jets de sauvegarde d’Intelligence',
    'Wisdom Saving Throws': 'Jets de sauvegarde de Sagesse',
    'Charisma Saving Throws': 'Jets de sauvegarde de Charisme'
  };

  const ACTION_TYPE_MAP = {
    'Action': { label: 'Action', cls: 'badge-action' },
    'Bonus Action': { label: 'Bonus', cls: 'badge-bonus' },
    'Bonus Actions': { label: 'Bonus', cls: 'badge-bonus' },
    'Reaction': { label: 'Réaction', cls: 'badge-reaction' },
    'Reactions': { label: 'Réaction', cls: 'badge-reaction' },
    'Sort': { label: 'Sort', cls: 'badge-sort' },
    'Actions': { label: 'Action', cls: 'badge-action' },
    'Class Features': { label: 'Capacité', cls: 'badge-other' },
    'Racial Traits': { label: 'Trait', cls: 'badge-other' },
    'Feat': { label: 'Don', cls: 'badge-other' },
  };

  const INPUT_SOURCES = ['characterEnvelope', 'characterData', 'dndBeyondExport', 'sheetData'];

  //spells dB
  const SPELL_DB = {};
  
  function normalizeSpellName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function normalizeCompareName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  function buildSpellDB(spellsArray) {
    Object.keys(SPELL_DB).forEach(k => delete SPELL_DB[k]);
  
    (Array.isArray(spellsArray) ? spellsArray : []).forEach(spell => {
      const fr = normalizeSpellName(spell.name_fr);
      const en = normalizeSpellName(spell.name_en);
  
      if (fr) SPELL_DB[fr] = spell;
      if (en) SPELL_DB[en] = spell;
    });
  }
  
  //filter for dnd beyond
  const DDB_FILTERS = {
    isUnarmed(name) {
      const n = (name || '').trim().toLowerCase();
      return n === 'unarmed strike' || n === 'attaque à mains nues'|| n === 'frappe à mains nues';
  },

  cleanString(name) {
    return (name || '').trim();
  },

  filterUnarmed(item) {
    return !this.isUnarmed(item?.name);
  },

  filterUnarmedName(name) {
    return !this.isUnarmed(name);
  }
};

  /* ── Utility helpers ────────────────────────────────────────── */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const exists = v => v !== undefined && v !== null && v !== '';
  const safe = (v, fb = '–') => exists(v) ? String(v) : fb;
  const num = (v, fb = 0) => { const p = Number(v); return Number.isFinite(p) ? p : fb; };
  const signed = v => { const p = num(v, 0); return p >= 0 ? `+${p}` : String(p); };
  const stripHtml = v => String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const shortText = (v, max = 600) => { const t = stripHtml(v); return t.length > max ? t.slice(0, max - 1).trim() + '…' : t; };
  const translate = v => LABEL_FR[v] || v;
  const profBadge = lvl => { const n = num(lvl, 0); if (n >= 4) return 'E'; if (n >= 3) return 'M'; if (n === 2) return 'D'; return ''; };
  const childify = v => Math.floor(num(v, 0) * 2 / 3);


  /* ── Editability ────────────────────────────────────────────── */
  function makeEditable(node) {
    if (!node) return;
    node.setAttribute('contenteditable', 'true');
    node.setAttribute('spellcheck', 'false');
    node.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      r.deleteContents();
      r.insertNode(document.createTextNode(text));
      r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
    });
    node.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); node.blur(); } });
  }

  const PROF_CYCLE = ['', 'D', 'M', 'E'];
  function makeProfCyclable(node) {
    if (!node) return;
    node.title = 'Cliquer pour modifier la maîtrise';
    node.addEventListener('click', () => {
      const cur = node.textContent.trim();
      node.textContent = PROF_CYCLE[(PROF_CYCLE.indexOf(cur) + 1) % PROF_CYCLE.length];
    });
  }

  //hide sections
  function toggleSection(selector, force) {
    const node = document.querySelector(selector);
    if (!node) return;
    if (typeof force === 'boolean') node.classList.toggle('is-hidden', force);
    else node.classList.toggle('is-hidden');
  }
  toggleSection('.slot-p2-notes', true);
  toggleSection('.slot-p2-equipment',true);
  toggleSection('.slot-p2-basicact',false);         // toggle


  
  /* ── Data loading ───────────────────────────────────────────── */
  function parseInput() {
    let payload = null;
    for (const key of INPUT_SOURCES) { if (window[key]) { payload = window[key]; break; } }
    if (!payload) payload = {};
    if (typeof payload === 'string') payload = JSON.parse(payload);
    if (payload && typeof payload.exportData === 'string')
      return { characterId: payload.characterId || null, exportData: JSON.parse(payload.exportData) };
    if (payload && payload.exportData && typeof payload.exportData === 'object')
      return { characterId: payload.characterId || null, exportData: payload.exportData };
    return { characterId: payload.characterId || null, exportData: payload };
  }

  function aggregateItems(items) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      const name = safe(item.name, 'Objet');
      if (!map.has(name)) map.set(name, { name, quantity: 0, weight: 0 });
      const r = map.get(name);
      r.quantity += num(item.quantity, 1) || 1;
      r.weight   += num(item.weight, 0);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  function flattenClassFeatures(groups) {
    const out = [];
    (Array.isArray(groups) ? groups : []).forEach(group =>
      (group.features || []).forEach(f => out.push({
        name: f.name || 'Capacité', text: stripHtml(f.snippet || ''),
        page: f.page || '', source: group.className || ''
      }))
    );
    return out;
  }

  function flattenSpells(spells) {
    const out = [];
  
    (Array.isArray(spells) ? spells : []).forEach((bucket, level) =>
      (Array.isArray(bucket) ? bucket : []).forEach(spell => {
        const key = normalizeSpellName(spell.name);
        const match = SPELL_DB[key];
  
        out.push({
          level,
          name: match?.name_fr || spell.name || 'Sort',
          castingTime: match?.casting_time || spell.castingTime || '',
          range: match?.range || spell.range || '',
          components: match?.components || spell.components || '',
          duration: match?.duration || spell.duration || '',
          description: match?.description || ''
        });
      })
    );

  return out.sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name, 'fr'));
}

  /* ── Normalize raw data into model ─────────────────────────── */
  function normalize() {
    const { characterId, exportData: raw } = parseInput();

    const statMap = {};
    (Array.isArray(raw.stats) ? raw.stats : []).forEach(stat => {
      const key = String(stat.key || '').slice(0, 3).toLowerCase();
      if (key) statMap[key] = stat;
    });

    const skillsByAbility = { str: new Map(), dex: new Map(), con: new Map(), int: new Map(), wis: new Map(), cha: new Map() };
    (Array.isArray(raw.skills) ? raw.skills : []).forEach(skill => {
      const ab = String(skill.statKey || '').slice(0, 3).toLowerCase();
      if (skillsByAbility[ab]) skillsByAbility[ab].set(skill.name, skill);
    });

    const abilities = ABILITIES.map(ab => {
      const stat = statMap[ab.key] || {};
      return {
        key: ab.key, label: ab.label,
        score:    exists(stat.score)        ? stat.score        : 10,
        modifier: exists(stat.modifier)     ? stat.modifier     : 0,
        save:     exists(stat.savingThrow)  ? stat.savingThrow  : 0,
        saveProficiency: stat.savingThrowProficiencyLevel || 0,
        skills: ab.skills
          .filter(DDB_FILTERS.filterUnarmedName.bind(DDB_FILTERS))
          .map(name => {
            const sk = skillsByAbility[ab.key].get(name);
            return sk || {
              name,
              modifier: stat.modifier || 0,
              proficiencyLevel: 0
            };
          })
      };
    });

    /* passive perception = 10 + Perception modifier */
    const wisAb = abilities.find(a => a.key === 'wis');
    const percSk = wisAb ? wisAb.skills.find(s => s.name === 'Perception') : null;
    const passivePerception = 10 + (percSk ? num(percSk.modifier, 0) : (wisAb ? num(wisAb.modifier, 0) : 0));

    const actions = [];
    (Array.isArray(raw.actions) ? raw.actions : []).forEach(group => {
      (group.actions || [])
        .filter(action => DDB_FILTERS.filterUnarmedName.call(DDB_FILTERS, action.name))
        .forEach(action => actions.push({
          name: DDB_FILTERS.cleanString(action.name), type: group.label || '',
          text: [shortText(action.snippet || '')].filter(Boolean).join(' · ')
        }));
      (group.spells || []).forEach(spell => actions.push({
        name: spell.name, type: group.label || 'Sort',
        text: [spell.castingTime, spell.range].filter(Boolean).join(' · ')
      }));
    });

    const basicActions = (Array.isArray(raw.basicActions) ? raw.basicActions : [])
      .filter(name => DDB_FILTERS.filterUnarmedName.call(DDB_FILTERS, name));

    const actionNames = new Set([
      ...actions.map(a => normalizeCompareName(a.name)),
      ...basicActions.map(name => normalizeCompareName(name))
    ].filter(Boolean));

    const classFeatures = flattenClassFeatures(raw.classFeatures)
      .filter(feature => !actionNames.has(normalizeCompareName(feature.name)));

    const spellSlots = (Array.isArray(raw.spellSlots) ? raw.spellSlots : []).map((entry, idx) => ({
      level: idx,
      total: num(entry.spell, 0) + num(entry.pactMagic, 0) + (Array.isArray(entry.combined) ? entry.combined.length : 0)
    })).filter(e => e.level > 0 && e.total > 0); /* ← only non-zero slots */

    const speeds = (Array.isArray(raw.speeds) ? raw.speeds : []).filter(s => num(s.distance, 0) > 0);
    const walking = speeds.find(s => String(s.name || '').toLowerCase().includes('walk')) || speeds[0] || null;

    return {
      characterId,
      name:            safe(raw.name, 'Personnage sans nom'),
      race:            safe(raw.race, '—'),
      background:      safe(raw.background, '—'),
      classes:         Array.isArray(raw.classes) ? raw.classes : [],
      classLabel:      (Array.isArray(raw.classes) ? raw.classes : []).map(c => `${c.name} ${c.level}`).join(' / ') || `Niveau ${safe(raw.level, 1)}`,
      level:           num(raw.level, 1),
      xp:              safe(raw.xp, '—'),
      proficiencyBonus: safe(raw.proficiencyBonus, '—'),
      armorClass:      num(raw.armorClass, 0),
      hitPointMax:     num(raw.hitPointMax, 0),
      hitDice:         (Array.isArray(raw.hitDice) ? raw.hitDice : []).map(e => e.diceString || `${num(e?.dice?.diceCount, 1)}d${num(e?.dice?.diceValue, 0)}`).filter(Boolean).join(' / ') || '—',
      initiative:      signed(raw.initiative),
      size:            safe(raw.characteristics?.size, '—'),
      walkingSpeed:    walking ? `${walking.distance} ft` : '—',
      passivePerception,
      abilities, actions,
      basicActions,
      attacks:         Array.isArray(raw.attacks) ? raw.attacks : [],
      classFeatures,
      proficiencyGroups: Array.isArray(raw.proficiencyGroups) ? raw.proficiencyGroups : [],
      items:           aggregateItems(raw.items),
      feats:           Array.isArray(raw.feats) ? raw.feats : [],
      raceTraits:      Array.isArray(raw.racialTraits) ? raw.racialTraits : [],
      languages:       Array.isArray(raw.languages) ? raw.languages : [],
      spellcastingInfo: raw.spellcastingInfo || {},
      spells:          flattenSpells(raw.spells),
      spellSlots,
      notes:           raw.notes || {},
      traits:          raw.traits || {},
      senses:          Array.isArray(raw.senses) ? raw.senses : []
    };
  }

  /* ── DOM helpers ────────────────────────────────────────────── */
  function setText(id, value) {
    const n = document.getElementById(id); if (n) n.textContent = safe(value);
  }
  function setEditable(id, value) {
    const n = document.getElementById(id); if (!n) return;
    n.textContent = safe(value); makeEditable(n);
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER FUNCTIONS
  ═══════════════════════════════════════════════════════════ */

  function renderIdentity(model) {
    document.title = `${model.name} · Fiche D&D 5.5`;
    setEditable('char-name', model.name);
    setEditable('prof-bonus', model.proficiencyBonus);
  }

  function renderHealth(model) {
    setEditable('health-ac', model.armorClass);
    setEditable('health-max', model.hitPointMax);
    setEditable('health-hitdice', model.hitDice);
    setText('phase1-ac', childify(model.armorClass));
    setText('phase1-hp', childify(model.hitPointMax));
    /* make all write cells editable */
    document.querySelectorAll('.mini-write').forEach(n => { n.textContent = ''; makeEditable(n); });
  }

  function renderAbilities(model) {
    const grid   = document.getElementById('ability-grid');
    const phase1 = document.getElementById('phase1-abilities');
    grid.innerHTML = ''; phase1.innerHTML = '';

    model.abilities.forEach(ability => {
      /* ── main ability card ── */
      const card   = el('article', 'ability-card');
      const header = el('div', 'ability-card-header');

      header.append(el('div', 'ability-label', ability.label));

      /* modifier = BIG number */
      const modEl = el('div', 'ability-mod', signed(ability.modifier));
      makeEditable(modEl); header.append(modEl);

      /* score = small secondary */
      const scoreEl = el('div', 'ability-score', String(ability.score));
      makeEditable(scoreEl); header.append(scoreEl);

      card.append(header);

      /* save row: label | prof badge | value */
      const saveRow = el('div', 'ability-save');
      saveRow.append(el('span', '', 'Sauvegarde'));
      const saveMark = el('span', 'skill-mark', profBadge(ability.saveProficiency));
      makeProfCyclable(saveMark); saveRow.append(saveMark);
      const saveVal = el('span', 'ability-save-value', signed(ability.save));
      makeEditable(saveVal); saveRow.append(saveVal);
      card.append(saveRow);

      /* skill lines: modifier (big) | prof circle | name */
      ability.skills.forEach(skill => {
        const row = el('div', 'skill-line');

        const modSkEl = el('span', 'skill-mod', signed(skill.modifier));
        makeEditable(modSkEl); row.append(modSkEl);

        const mark = el('span', 'skill-mark', profBadge(skill.proficiencyLevel));
        makeProfCyclable(mark); row.append(mark);

        row.append(el('span', 'skill-name', SKILL_FR[skill.name] || skill.name));
        card.append(row);
      });

      grid.append(card);

      /* phase 1 mini card */
      const mini = el('div', 'phase1-ability-card');
      mini.append(el('span', '', ability.label));
      mini.append(el('strong', '', String(childify(ability.score))));
      phase1.append(mini);
    });
  }

  function renderMobility(model) {
    setEditable('mob-init',    model.initiative);
    setEditable('mob-speed',   model.walkingSpeed);
    setEditable('mob-size',    model.size);
    setEditable('mob-passive', String(model.passivePerception));
  }

  function renderAttacks(model) {
    const body = document.getElementById('attack-rows');
    body.innerHTML = '';
    const attacks = model.attacks.length ? model.attacks : [{ name: '—', toHit: '', damageString: '', notes: '' }];
    attacks.slice(0, 5).forEach(atk => {
      const tr = document.createElement('tr');
      [
        safe(atk.name),
        exists(atk.toHit) ? signed(atk.toHit) : '—',
        safe(atk.damageString || atk.damage, '—'),
        shortText(atk.notes, 80) || '—'
      ].forEach(v => { const td = document.createElement('td'); td.textContent = v; makeEditable(td); tr.append(td); });
      body.append(tr);
    });
    /* empty editable rows */
    for (let i = attacks.length; i < 3; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < 4; j++) { const td = document.createElement('td'); makeEditable(td); tr.append(td); }
      body.append(tr);
    }
  }

  function renderActions(model) {
    const list = document.getElementById('action-list');
    list.innerHTML = '';
  
    const hasActions = (model.actions || []).length > 0;
    const basicActions = (model.basicActions || [])
      .filter(name => DDB_FILTERS.filterUnarmedName.call(DDB_FILTERS, name));
  
    if (!hasActions && !basicActions.length) {
      list.append(el('div', 'empty-note', 'Aucune capacité d’action. Importez un personnage depuis D&D Beyond.'));
      return;
    }
  
    /* regular action/capacity entries */
    (model.actions || []).forEach(item => {
      const typeInfo = ACTION_TYPE_MAP[item.type] || { label: item.type || 'Capacité', cls: 'badge-other' };
  
      const row = el('div', 'action-item');
      const body = el('div', 'action-item-body');
  
      const titleLine = el('div', 'action-item-title');
  
      const badge = el('span', `action-type-badge ${typeInfo.cls}`, typeInfo.label);
      const nameEl = el('span', 'action-item-name', item.name || '');
      makeEditable(nameEl);
  
      titleLine.append(badge, nameEl);
      body.append(titleLine);
  
      if (item.text) {
        const descEl = el('span', 'action-item-desc', item.text);
        makeEditable(descEl);
        body.append(descEl);
      }
  
      row.append(body);
      list.append(row);
    });
  
    /* basic actions, but kept in chip format */
    if (basicActions.length) {
      const chipBlock = el('div', 'action-item');
      const body = el('div', 'action-item-body');
  
      const titleLine = el('div', 'action-item-title');
      const badge = el('span', 'action-type-badge badge-other', 'Action');
      const label = el('span', 'action-item-name', 'Actions communes');
      makeEditable(label);
  
      titleLine.append(badge, label);
      body.append(titleLine);
  
      const chipWrap = el('div', 'basic-actions-inline');
      basicActions.forEach(action => {
        const chip = el('span', 'chip', action);
        makeEditable(chip);
        chipWrap.append(chip);
      });

      body.append(chipWrap);
      chipBlock.append(body);
      list.append(chipBlock);
    }
  }

  function renderBasicActions(model) {
    const basic = document.getElementById('basic-actions');
    if (!basic) return;
    basic.innerHTML = '';
    const basics = model.basicActions.length ? model.basicActions : [];
    if (!basics.length) { basic.append(el('span', 'empty-note', 'Aucune action commune.')); return; }
    basics.forEach(label => basic.append(el('span', 'chip', label)));
  }

  function renderClass(model) {
    const titleNode = document.getElementById('class-zone-title');
    const listNode  = document.getElementById('class-feature-list');

    titleNode.textContent = model.classes.length
      ? `Classe · ${model.classes.map(c => c.name).join(' / ')}`
      : 'Classe';
    listNode.innerHTML = '';

    if (!model.classFeatures.length) {
      listNode.append(el('div', 'empty-note', 'Aucune capacité de classe.'));
      return;
    }
    model.classFeatures.forEach(feature => {
      const item = el('div', 'feature-item');
      const nameEl = el('strong', '', feature.name);
      makeEditable(nameEl); item.append(nameEl);
      const text = feature.text || feature.page || feature.source || '—';
      const textEl = el('span', '', text);
      makeEditable(textEl); item.append(textEl);
      listNode.append(item);
    });
  }

  function renderTraining(model) {
    const host = document.getElementById('training-list');
    host.innerHTML = '';
    if (!model.proficiencyGroups.length) { host.append(el('div', 'empty-note', 'Aucune maîtrise listée.')); return; }

    const preferredOrder = ['Armor', 'Weapons', 'Tools'];
    const ordered = [...model.proficiencyGroups].sort((a, b) => preferredOrder.indexOf(a.label) - preferredOrder.indexOf(b.label));

    ordered.forEach(group => {
      if (['Languages', 'Langues'].includes(group.label)) return; /* languages excluded */
      const card = el('div', 'training-group');
      card.append(el('strong', '', translate(group.label)));
      const valEl = el('span', '', (group.proficiencies || []).map(translate).join(' · ') || '—');
      makeEditable(valEl); card.append(valEl);
      host.append(card);
    });
    /* Note: languages intentionally excluded per user request */
  }

  function wireRemoveButton(button, target) {
    button.addEventListener('click', () => target.classList.add('is-hidden'));
  }

  function renderSpeciesCard(model) {
    const host = document.getElementById('species-card-host');
    host.innerHTML = '';
    if (!model.raceTraits.length && model.race === '—') { host.classList.add('is-hidden'); return; }
    host.classList.remove('is-hidden');

    const head = el('div', 'card-head');
    head.append(el('span', 'card-title-band', model.race || 'Espèce'));
    const remove = el('button', 'card-remove', '×'); remove.type = 'button';
    head.append(remove); host.append(head);

    const meta = el('div', 'card-meta');
    if (exists(model.background) && model.background !== '—') { const s = el('span', '', `Historique : ${model.background}`); makeEditable(s); meta.append(s); }
    if (exists(model.size)       && model.size       !== '—') { const s = el('span', '', `Taille : ${model.size}`);            makeEditable(s); meta.append(s); }
    if (exists(model.walkingSpeed) && model.walkingSpeed !== '—') { const s = el('span', '', `Vitesse : ${model.walkingSpeed}`); makeEditable(s); meta.append(s); }
    host.append(meta);

    const traits = el('div', 'card-traits');
    if (model.raceTraits.length) {
      model.raceTraits.forEach(trait => {
        const block = el('div', 'card-trait');
        const nameEl = el('strong', '', trait.name || 'Trait'); makeEditable(nameEl); block.append(nameEl);
        const textEl = el('span', '', stripHtml(trait.snippet || '') || trait.page || ''); makeEditable(textEl); block.append(textEl);
        traits.append(block);
      });
    } else { traits.append(el('div', 'empty-note', 'Carte d’espèce à remplacer.')); }
    host.append(traits);
    wireRemoveButton(remove, host);
  }

  function renderFeatStack(model) {
    const stack = document.getElementById('feat-stack');
    stack.innerHTML = '';
    const feats = model.feats || [];
    if (!feats.length) { stack.append(el('div', 'feat-stack-empty', 'Empilez ici les cartes de don.')); return; }

    feats.slice(0, 5).forEach((feat, index) => {
      const card = el('div', 'feat-card');
      card.style.top    = `${index * 6.8}mm`;
      card.style.height = `calc(100% - ${index * 6.8}mm)`;
      card.style.zIndex = String(index + 1);
      card.append(el('div', 'feat-card-title', feat.name || 'Don'));
      const remove = el('button', 'card-remove', '×'); remove.type = 'button'; card.append(remove);
      const body = el('div', 'feat-card-body', stripHtml(feat.snippet || '') || feat.page || 'Carte de don.');
      makeEditable(body); card.append(body);
      stack.append(card);
      wireRemoveButton(remove, card);
    });
  }

  function renderEv3b(model) {
    /* spell casting stats */
    const info = model.spellcastingInfo || {};
    const abilityRaw = (info.spellcastingAbilities || [])[0] || '—';
    const dc  = (info.spellSaveDifficulties || [])[0];
    const atk = (info.spellAttackBonuses   || [])[0];
    const abilityKey   = String(abilityRaw || '').slice(0, 3).toLowerCase();
    const abilityMatch = model.abilities.find(a => a.key === abilityKey);
    setEditable('spell-ability', abilityMatch ? abilityMatch.label : abilityRaw);
    setEditable('spell-mod',    abilityMatch ? signed(abilityMatch.modifier) : '—');
    setEditable('spell-dc',     exists(dc)  ? dc  : '—');
    setEditable('spell-attack', exists(atk) ? signed(atk) : '—');

    /* spell slots – only levels with total > 0 */
    const slotGrid = document.getElementById('spell-slot-grid');
    slotGrid.innerHTML = '';
    if (!model.spellSlots.length) {
      slotGrid.append(el('span', 'empty-note', 'Aucun emplacement de sort.'));
    } else {
      model.spellSlots.forEach(slot => {
        const badge = el('div', 'slot-badge');
        const top   = el('div', 'slot-badge-top');
        top.append(el('span', '', `Niv. ${slot.level}`));
        const totalEl = el('strong', '', String(slot.total));
        makeEditable(totalEl); top.append(totalEl);
        badge.append(top);
        const bottom = el('div', 'slot-badge-bottom');
        for (let i = 0; i < Math.min(slot.total, 5); i++) bottom.append(el('span', 'slot-dot'));
        badge.append(bottom);
        slotGrid.append(badge);
      });
    }

    /* spell rows */
    const spellRows = document.getElementById('spell-rows');
    spellRows.innerHTML = '';
    model.spells.forEach(spell => {
      const tr = document.createElement('tr');
    
      const values = [
        spell.level === 0 ? 'Cantrip' : String(spell.level),
        safe(spell.name),
        safe(spell.castingTime),
        safe(spell.range),
        safe(spell.components),
        safe(spell.duration),
        safe(spell.description)
      ];
    
      values.forEach(v => {
        const td = document.createElement('td');
        td.textContent = v;
        makeEditable(td);
        tr.append(td);
      });
    
      spellRows.append(tr);
    });
    
    for (let i = model.spells.length; i < 24; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < 7; j++) {
        const td = document.createElement('td');
        makeEditable(td);
        tr.append(td);
      }
      spellRows.append(tr);
    }

    /* equipment rows */
    const eqRows = document.getElementById('equipment-rows');
    eqRows.innerHTML = '';
    model.items.forEach(item => {
      const tr = document.createElement('tr');
      [item.name, item.quantity, item.weight || '—'].forEach(v => {
        const td = document.createElement('td'); td.textContent = String(v); makeEditable(td); tr.append(td);
      });
      eqRows.append(tr);
    });
    for (let i = model.items.length; i < 14; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < 3; j++) { const td = document.createElement('td'); makeEditable(td); tr.append(td); }
      eqRows.append(tr);
    }

    /* notes */
    const notes = [];
    if (exists(model.notes.backstory))         notes.push(`Historique : ${stripHtml(model.notes.backstory)}`);
    if (exists(model.notes.otherNotes))         notes.push(`Autres notes : ${stripHtml(model.notes.otherNotes)}`);
    if (exists(model.traits.personalityTraits)) notes.push(`Personnalité : ${stripHtml(model.traits.personalityTraits)}`);
    if (exists(model.traits.ideals))            notes.push(`Idéaux : ${stripHtml(model.traits.ideals)}`);
    const notesNode = document.getElementById('notes-prefill');
    notesNode.textContent = notes.join(' · ') || 'Zone libre pour écrire pendant la partie.';
    makeEditable(notesNode);
  }

  /* ── Theme controls ─────────────────────────────────────────── */
  function applyThemeControls() {
    const opts = window.sheetOptions || {};
    const colorToggle     = document.getElementById('toggle-color');
    const generatedToggle = document.getElementById('toggle-generated');
    const resetBtn        = document.getElementById('reset-view');

    const colorMode     = localStorage.getItem('dnd-sheet-color')     === null ? !!opts.colorMode : localStorage.getItem('dnd-sheet-color')     === 'true';
    const showGenerated = localStorage.getItem('dnd-sheet-generated') === null ? opts.showGeneratedCards !== false : localStorage.getItem('dnd-sheet-generated') === 'true';

    colorToggle.checked     = colorMode;
    generatedToggle.checked = showGenerated;
    document.body.classList.toggle('theme-color',     colorMode);
    document.body.classList.toggle('removable-hidden', !showGenerated);

    colorToggle.addEventListener('change',     () => { localStorage.setItem('dnd-sheet-color',     colorToggle.checked     ? 'true' : 'false'); document.body.classList.toggle('theme-color',     colorToggle.checked); });
    generatedToggle.addEventListener('change', () => { localStorage.setItem('dnd-sheet-generated', generatedToggle.checked ? 'true' : 'false'); document.body.classList.toggle('removable-hidden', !generatedToggle.checked); });
    resetBtn.addEventListener('click', () => { localStorage.removeItem('dnd-sheet-color'); localStorage.removeItem('dnd-sheet-generated'); window.location.reload(); });
  }

  /* ── Interactive widgets ────────────────────────────────────── */
  function wireInteractiveWidgets() {
    /* inspiration tick */
    const tick = document.querySelector('.toolbar-tick');
    if (tick) { tick.title = 'Cliquer pour cocher / décocher'; tick.addEventListener('click', () => tick.classList.toggle('is-checked')); }
    /* death save bubbles */
    document.querySelectorAll('.death-bubbles span').forEach(b => {
      b.title = 'Cliquer pour marquer';
      b.addEventListener('click', () => b.classList.toggle('bubble-filled'));
    });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  function init() {
    try {
      buildSpellDB(window.SPELLS_DB_DATA);
      const model = normalize();
      renderIdentity(model);
      renderHealth(model);
      renderAbilities(model);
      renderMobility(model);
      renderAttacks(model);
      renderActions(model);
      //renderBasicActions(model);
      renderClass(model);
      renderTraining(model);
      renderSpeciesCard(model);
      renderFeatStack(model);
      renderEv3b(model);
      applyThemeControls();
      wireInteractiveWidgets();
    } catch (err) {
      console.error(err);
      document.body.innerHTML = `<pre style="padding:24px;font-family:monospace">Erreur de rendu : ${String(err && err.message ? err.message : err)}</pre>`;
    }
  }

  window.renderAll = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();