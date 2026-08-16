import React, { useEffect, useState } from 'react';
import { get } from '../api.js';

const FALLBACK_MENU = [
  { category: 'Starters', items: [{ name: 'Paneer Tikka', price: 249 }, { name: 'Chicken Wings', price: 299 }, { name: 'Spring Rolls', price: 199 }] },
  { category: 'Mains', items: [{ name: 'Butter Chicken', price: 399 }, { name: 'Veg Biryani', price: 299 }, { name: 'Dal Makhani', price: 279 }] },
  { category: 'Beverages', items: [{ name: 'Masala Chai', price: 49 }, { name: 'Fresh Lime Soda', price: 99 }, { name: 'Cold Coffee', price: 129 }] },
];

const EMOJI = { starters: '🥗', main: '🍛', desserts: '🍰', beverages: '🥤', breakfast: '🍳', snacks: '🍟' };

export default function RestaurantHome() {
  const [data, setData] = useState(null);

  useEffect(() => {
    get('/public/restaurant').then(setData).catch(() => {});
  }, []);

  const s = data?.settings || {};
  const menu = data?.menu?.length ? data.menu : FALLBACK_MENU;

  return (
    <>
      <section className="restaurant-hero">
        <h1>{s.restaurant_about ? 'Aadhya Restaurant' : 'Aadhya Restaurant'}</h1>
        <p className="tag">Multi-cuisine dining · Craft cocktails · {s.hotel_name || 'Hotel Lakshmi Deluxe'}</p>
        <div className="hero-actions">
          <a href="#/booking" className="btn primary">Book a Table</a>
          <a href="#/contact" className="btn ghost">Visit Us</a>
        </div>
      </section>

      <section className="public-section">
        <h2>Our Menu</h2>
        <p className="sub">Made fresh, served with love — {s.restaurant_hours || 'daily 7 AM – 11 PM'}</p>
        {menu.map((grp) => (
          <div key={grp.category} className="menu-group">
            <h3>{EMOJI[String(grp.category).toLowerCase()] || '🍽️'} {grp.category}</h3>
            <div className="menu-items">
              {(grp.items || []).map((it) => (
                <div key={it.name} className="menu-item glass">
                  <div>
                    <b>{it.name}</b>
                    {it.desc && <p>{it.desc}</p>}
                  </div>
                  <span className="menu-price">₹{Number(it.price).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="public-section about">
        <h2>About Aadhya</h2>
        <p className="about-text">{s.restaurant_about || 'A signature multi-cuisine restaurant with a rooftop lounge, craft cocktails and warm Indian hospitality — the perfect setting for family dinners, celebrations and business lunches.'}</p>
      </section>
    </>
  );
}