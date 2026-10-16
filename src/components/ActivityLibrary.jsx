// Interface text localized; user-authored expressions are intentionally unchanged.
import { tr } from "../lib/i18n";import React, { useEffect, useState } from 'react';
import { Heart, Search, ArrowUpRight, X } from 'lucide-react';
import Info from './Info';
import { useDialog } from '../hooks/useDialog';
import { ACTIVITIES, CATEGORIES, CHOICE_ROUNDS, filterActivities } from '../lib/activityLibrary';

export function SupportedActivity({ id, choices = 3 }) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState('');
  const prompts = ['What music do you enjoy?', 'What makes a place feel comfortable to you?', 'Is there a texture, food, or scent you enjoy?', 'What would make today a little easier?'];
  const item = CHOICE_ROUNDS[id]?.[round % CHOICE_ROUNDS[id].length];
  const options = item ? item.options.map((label, index) => ({ label, index })).filter((_, index) => index === item.answer || item.options.slice(0, index).filter((_, i) => i !== item.answer).length < choices - 1) : [];
  return <div className="space-y-5 rounded-3xl bg-slate-900 p-5 sm:p-7">
    <p className="text-xl font-bold text-white">{tr(item?.prompt || prompts[round % prompts.length])}</p>
    {item ? <>
      <div className="grid gap-3">{options.map(({ label: option, index: i }) => <button key={tr(option)} className="library-choice" onClick={() => setFeedback(i === item.answer ? 'That fits. Continue when you’re ready.' : 'Let’s look together. Try another choice, or ask for a hint.')}>{tr(option)}</button>)}</div>
      <button className="library-secondary" onClick={() => setFeedback(item.hint)}>{tr("Show a hint")}</button>
      <p role="status" className="text-base text-emerald-300 min-h-6">{tr(feedback)}</p>
    </> : <Info className="text-slate-300">{tr("Speak, point, listen, write elsewhere, or skip. There is no right answer. Your response is not recorded.")}</Info>}
    <button className="library-primary" onClick={() => {setRound((n) => n + 1);setFeedback('');}}>{tr("Next / skip")}</button>
    <Info className="text-sm text-slate-400">{tr("No scores or countdowns. Stop whenever you like.")}</Info>
  </div>;
}

export default function ActivityLibrary({ favorites, onToggleFavorite, renderActivity, choices }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(null);
  const dialog = useDialog(!!selected, () => setSelected(null));
  const visible = filterActivities({ query, category, favoritesOnly, favorites, translate: tr });
  useEffect(() => {
    const stop = () => {if (document.hidden) setSelected(null);};
    document.addEventListener('visibilitychange', stop);
    return () => document.removeEventListener('visibilitychange', stop);
  }, []);
  return <>
    <section className="library-intro">
      <div><p className="eyebrow">{tr("A LITTLE CURIOSITY")}</p><h2 className="text-2xl font-bold text-white">{tr("Find your kind of pause.")}</h2><p className="text-slate-300 mt-2">{tr("Eleven activities, one gentle step at a time. Save what you enjoy for next time.")}</p></div>
      <span className="library-offline">{tr("Available offline · no account")}</span>
    </section>
    <div className="library-filters">
      <label className="flex-1 min-w-0"><span className="block font-bold text-sm mb-2">{tr("Find an activity")}</span><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Try a word, like calm or story")} className="library-input pl-11" /></div></label>
      <label><span className="block font-bold text-sm mb-2">{tr("Explore by interest")}</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="library-input">{Object.entries(CATEGORIES).map(([id, title]) => <option key={id} value={id}>{tr(title)}</option>)}</select></label>
      <label className="flex gap-2 items-center py-3"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} className="w-5 h-5 accent-emerald-600" /><span>{tr("Favorites only")}</span></label>
    </div>
    <p className="text-sm text-slate-400" role="status">{visible.length} {visible.length === 1 ? tr('activity') : tr('activities')}{favoritesOnly ? tr(' in your favorites') : ''}</p>
    {!visible.length && <div className="library-empty"><h3 className="text-xl font-bold">{tr("Nothing here yet")}</h3><Info>{tr("Try another word, or browse all activities and save a favorite.")}</Info><button className="library-secondary" onClick={() => {setQuery('');setCategory('all');setFavoritesOnly(false);}}>{tr("Show all activities")}</button></div>}
    <div className="library-grid">{visible.map((activity) => <article key={activity.id} className="library-tile">
      <div className="flex items-center justify-between"><span className="library-symbol" aria-hidden="true">{activity.symbol}</span><span className="text-xs text-slate-400">{tr(CATEGORIES[activity.category])}</span></div>
      <h3 className="text-lg font-bold text-white">{tr(activity.title)}</h3><p className="text-sm text-slate-300 flex-1">{tr(activity.summary)}</p>
      <button className="library-primary" onClick={() => {setSelected(activity);setPaused(false);}} aria-label={`${tr("Open activity")}: ${tr(activity.title)}`}>{tr("Open activity ")}<ArrowUpRight aria-hidden="true" className="w-4 h-4" /></button>
      <button className="library-favorite" aria-pressed={favorites.includes(activity.id)} aria-label={`${tr(favorites.includes(activity.id) ? 'Remove from favorites' : 'Save to favorites')}: ${tr(activity.title)}`} onClick={() => onToggleFavorite(activity.id)}><Heart aria-hidden="true" className={`w-4 h-4 ${favorites.includes(activity.id) ? 'fill-current' : ''}`} />{favorites.includes(activity.id) ? tr('Saved to favorites') : tr('Save to favorites')}</button>
    </article>)}</div>
    <Info className="text-sm text-slate-400">{tr("Favorites stay in this browser’s encrypted storage. Participation isn’t tracked. Activities are optional practice and enjoyment, not clinically validated dementia or autism treatments.")}</Info>
    {selected && <div className="library-modal-backdrop"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="activity-session-title" className="library-session">
      <header className="flex justify-between items-start gap-3"><div><Info className="text-sm text-emerald-300">{tr("Your own pace · no score")}</Info><h2 id="activity-session-title" className="text-xl font-bold text-white">{tr(selected.title)}</h2></div><button onClick={() => setSelected(null)} className="library-secondary" aria-label={tr("Leave activity")}><X aria-hidden="true" className="w-5 h-5" /><span>{tr("Done")}</span></button></header>
      {paused ? <div className="library-empty"><Info>{tr("Take your time. This activity restarts when you continue.")}</Info><button className="library-primary" onClick={() => setPaused(false)}>{tr("Continue activity")}</button></div> : CHOICE_ROUNDS[selected.id] || selected.id === 'conversation' ? <SupportedActivity key={selected.id} id={selected.id} choices={choices} /> : renderActivity(selected.id)}
      <button className="library-secondary" onClick={() => setPaused(true)}>{tr("Pause activity")}</button>
      <Info className="text-sm text-slate-400">{tr("Closing this activity or moving the app to the background ends this session and stops its sound.")}</Info>
    </section></div>}
  </>;
}
