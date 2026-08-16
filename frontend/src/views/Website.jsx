import React, { useEffect, useState } from 'react';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function Website() {
  const toast = useToast();
  const [menu, setMenu] = useState([]);
  const [types, setTypes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'main', price: '', image: '' });
  const [editId, setEditId] = useState(null);
  const [hero, setHero] = useState({ welcome_message: '', tagline: '', about_text: '', primary_color: '#038C7F' });
  const [typeForm, setTypeForm] = useState({ name: '', price: '', capacity: 2, description: '', amenities: '', image: '' });
  const [tab, setTab] = useState('menu');

  const load = () => {
    get('/menu').then(setMenu).catch(() => {});
    get('/room-types').then(setTypes).catch(() => {});
    get('/settings').then((s) => {
      setSettings(s);
      setHero({ welcome_message: s.welcome_message || '', tagline: s.tagline || '', about_text: s.about_text || '', primary_color: s.primary_color || '#038C7F' });
    }).catch(() => {});
  };
  useEffect(load, []);

  const cats = [...new Set(menu.map((m) => m.category || 'main'))];

  const saveItem = async (e) => {
    e.preventDefault();
    if (!form.name || form.price === '') return toast('Name and price required');
    try {
      if (editId) await put(`/menu/${editId}`, { ...form, price: Number(form.price), available: 1 });
      else await post('/menu', { ...form, price: Number(form.price), available: 1 });
      toast(editId ? 'Menu item updated — live on the website' : 'Menu item added — live on the website');
      setEditId(null);
      setForm({ name: '', category: 'main', price: '', image: '' });
      load();
    } catch (err) { toast(err.message); }
  };

  const quickSave = async (item, patch) => {
    await put(`/menu/${item.id}`, { ...patch });
    toast('Menu updated — live on the website');
    load();
  };

  const removeItem = async (item) => {
    if (!confirm(`Delete "${item.name}" from the menu?`)) return;
    await del(`/menu/${item.id}`);
    toast('Menu item deleted');
    load();
  };

  const saveHero = async (e) => {
    e.preventDefault();
    await put('/settings', hero);
    toast('Hero & colours saved — live on the website');
  };

  const saveType = async (e) => {
    e.preventDefault();
    if (!typeForm.name || typeForm.price === '') return toast('Room name and price required');
    try {
      if (typeForm.id) await put(`/room-types/${typeForm.id}`, { ...typeForm, price: Number(typeForm.price), amenities: String(typeForm.amenities || '') });
      else await post('/room-types', { ...typeForm, price: Number(typeForm.price), amenities: String(typeForm.amenities || '') });
      toast(typeForm.id ? 'Room updated — live on the website' : 'Room added — live on the website');
      setTypeForm({ name: '', price: '', capacity: 2, description: '', amenities: '', image: '' });
      load();
    } catch (err) { toast(err.message); }
  };

  const quickType = async (t, patch) => {
    await put(`/room-types/${t.id}`, { ...t, ...patch });
    toast('Room updated — live on the website');
    load();
  };

  const websiteUrl = settings?.website_url || '';

  return (
    <div>
      <div className="between">
        <div>
          <h1>🌐 Website Manager</h1>
          <p className="sub">Everything you change here goes live on the public website instantly — same database, no app to open.</p>
        </div>
        <a className="btn" href={websiteUrl || '/'} target="_blank" rel="noreferrer">👁️ Open website</a>
      </div>

      <div className="row" style={{ margin: '14px 0', gap: 8 }}>
        {[['menu', '🍽️ Menu & Prices'], ['rooms', '🛏️ Rooms & Prices'], ['hero', '✨ Hero & Colours']].map(([k, lbl]) => (
          <button key={k} className={'btn sm ' + (tab === k ? 'primary' : '')} onClick={() => setTab(k)}>{lbl}</button>
        ))}
      </div>

      {tab === 'menu' && (
        <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 14, alignItems: 'start' }}>
          <div className="card">
            <h3>Menu items <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>— shown on the website's Order Online page</span></h3>
            {cats.map((c) => (
              <div key={c} style={{ marginTop: 12 }}>
                <b style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 12 }}>{c}</b>
                <table className="table" style={{ marginTop: 6 }}>
                  <tbody>
                    {menu.filter((m) => (m.category || 'main') === c).map((m) => (
                      <tr key={m.id}>
                        <td style={{ width: 46 }}>
                          {m.image ? <img src={m.image} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🍽️</span>}
                        </td>
                        <td>
                          <b>{m.name}</b>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.category}</div>
                        </td>
                        <td style={{ width: 90 }}>
                          <input type="number" min="0" step="1" defaultValue={m.price} style={{ width: 80 }}
                            onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(m.price)) quickSave(m, { price: v }); }} />
                        </td>
                        <td style={{ width: 90 }}>
                          <label className="switch"><input type="checkbox" checked={!!m.available} onChange={(e) => quickSave(m, { available: e.target.checked })} /><span></span></label>
                        </td>
                        <td style={{ width: 60 }}>
                          <button className="btn sm" onClick={() => { setEditId(m.id); setForm({ name: m.name, category: m.category, price: String(m.price), image: m.image || '' }); }}>Edit</button>
                        </td>
                        <td style={{ width: 60 }}>
                          <button className="btn sm red" onClick={() => removeItem(m)}>Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>{editId ? `Edit: ${form.name}` : '➕ Add menu item'}</h3>
            <form onSubmit={saveItem} style={{ marginTop: 8 }}>
              <label>Dish name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken" />
              <label style={{ marginTop: 10 }}>Category *</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. starters / mains / desserts" list="wc-cats" />
              <datalist id="wc-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
              <label style={{ marginTop: 10 }}>Price (₹) *</label>
              <input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 320" />
              <label style={{ marginTop: 10 }}>Image URL (optional — paste a photo link)</label>
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…/dish.jpg" />
              {form.image && <img src={form.image} alt="preview" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 10, marginTop: 8, display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />}
              <div className="row" style={{ marginTop: 14, gap: 8 }}>
                <button className="btn primary" type="submit">{editId ? '💾 Save changes' : '➕ Add to menu'}</button>
                {editId && <button className="btn" type="button" onClick={() => { setEditId(null); setForm({ name: '', category: 'main', price: '', image: '' }); }}>Cancel</button>}
              </div>
            </form>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Availability toggle: off = hidden from the website ordering page (still usable in POS).</p>
          </div>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 14, alignItems: 'start' }}>
          <div className="card">
            <h3>Rooms <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>— shown on the website's Rooms & Booking pages</span></h3>
            <table className="table" style={{ marginTop: 8 }}>
              <thead><tr><th></th><th>Room</th><th>Price/night</th><th>Capacity</th><th>Visible</th><th></th></tr></thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id}>
                    <td style={{ width: 46 }}>{t.image ? <img src={t.image} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🛏️</span>}</td>
                    <td><b>{t.name}</b><div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.description || ''}</div></td>
                    <td style={{ width: 90 }}>
                      <input type="number" min="0" step="1" defaultValue={t.price} style={{ width: 80 }}
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(t.price)) quickType(t, { price: v }); }} />
                    </td>
                    <td style={{ width: 80 }}>{t.capacity}</td>
                    <td style={{ width: 90 }}>
                      <label className="switch"><input type="checkbox" checked={!!t.visible} onChange={(e) => quickType(t, { visible: e.target.checked })} /><span></span></label>
                    </td>
                    <td style={{ width: 70 }}>
                      <button className="btn sm" onClick={() => setTypeForm({ id: t.id, name: t.name, price: String(t.price), capacity: t.capacity, description: t.description || '', amenities: t.amenities || '', image: t.image || '' })}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>"Visible" hides the room type from the public site when off.</p>
          </div>

          <div className="card">
            <h3>{typeForm.id ? `✏️ Edit: ${typeForm.name}` : '➕ Add room type'}</h3>
            <form onSubmit={saveType} style={{ marginTop: 8 }}>
              <label>Room name *</label>
              <input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Deluxe King" />
              <label style={{ marginTop: 10 }}>Price per night (₹) *</label>
              <input type="number" min="0" step="1" value={typeForm.price} onChange={(e) => setTypeForm({ ...typeForm, price: e.target.value })} placeholder="e.g. 2499" />
              <label style={{ marginTop: 10 }}>Capacity (guests)</label>
              <input type="number" min="1" value={typeForm.capacity} onChange={(e) => setTypeForm({ ...typeForm, capacity: Number(e.target.value) })} />
              <label style={{ marginTop: 10 }}>Description</label>
              <textarea rows="2" value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} placeholder="What makes this room special?" />
              <label style={{ marginTop: 10 }}>Amenities (comma separated)</label>
              <input value={typeForm.amenities} onChange={(e) => setTypeForm({ ...typeForm, amenities: e.target.value })} placeholder="Wi-Fi, AC, Breakfast" />
              <label style={{ marginTop: 10 }}>Image URL (optional)</label>
              <input value={typeForm.image} onChange={(e) => setTypeForm({ ...typeForm, image: e.target.value })} placeholder="https://…/room.jpg" />
              {typeForm.image && <img src={typeForm.image} alt="preview" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 10, marginTop: 8, display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />}
              <div className="row" style={{ marginTop: 14, gap: 8 }}>
                <button className="btn primary" type="submit">{typeForm.id ? '💾 Save changes' : '➕ Add room'}</button>
                {typeForm.id && <button className="btn" type="button" onClick={() => setTypeForm({ name: '', price: '', capacity: 2, description: '', amenities: '', image: '' })}>Cancel</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'hero' && (
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'start' }}>
          <div className="card">
            <h3>✨ Hero, headline & colours</h3>
            <form onSubmit={saveHero} style={{ marginTop: 8 }}>
              <label>Welcome headline (home page hero)</label>
              <input value={hero.welcome_message} onChange={(e) => setHero({ ...hero, welcome_message: e.target.value })} placeholder="Explore Our Exquisite Hotel" />
              <label style={{ marginTop: 10 }}>Tagline</label>
              <input value={hero.tagline} onChange={(e) => setHero({ ...hero, tagline: e.target.value })} placeholder="Stay · Dine · Celebrate" />
              <label style={{ marginTop: 10 }}>About the hotel</label>
              <textarea rows="3" value={hero.about_text} onChange={(e) => setHero({ ...hero, about_text: e.target.value })} placeholder="Tell guests about your hotel…" />
              <label style={{ marginTop: 10 }}>Brand colour</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(hero.primary_color) ? hero.primary_color : '#038C7F'} onChange={(e) => setHero({ ...hero, primary_color: e.target.value })} style={{ width: 48, height: 36, padding: 0 }} />
                <input value={hero.primary_color} onChange={(e) => setHero({ ...hero, primary_color: e.target.value })} />
              </div>
              <button className="btn primary" style={{ marginTop: 14 }} type="submit">💾 Save hero</button>
            </form>
          </div>
          <div className="card">
            <h3>ℹ️ Quick reference</h3>
            <ul style={{ fontSize: 13, lineHeight: 2, color: 'var(--muted)' }}>
              <li>🍽️ Menu edits → website "Order Online" instantly</li>
              <li>🛏️ Room prices → website Rooms + Booking instantly</li>
              <li>🏨 Booking availability → Rooms view (per-room)</li>
              <li>🎪 Venue Hall → Venue view (halls + enquiry replies)</li>
              <li>📡 Channel rates → Channel Manager (OTA multiplier)</li>
              <li>📞 Contact, facilities, gallery, payments → Settings</li>
            </ul>
            <a className="btn" style={{ marginTop: 10, width: '100%' }} href="#/settings">Go to Settings</a>
          </div>
        </div>
      )}
    </div>
  );
}