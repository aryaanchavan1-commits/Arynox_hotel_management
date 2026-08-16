import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import RoomCard from '../components/RoomCard.jsx';

export default function PublicHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
  }, []);

  const s = data?.settings || {};
  const types = data?.roomTypes || [];
  const facilities = data?.facilities || [];
  const gallery = data?.gallery || [];
  const social = data?.social || {};
  const featured = types[0] || {};

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <section className="hm-hero">
        <div className="hm-hero-left">
          <h1>Explore Our Exquisite <em>Hotel</em></h1>
          <p className="lead">{s.welcome_message || `Experience an exquisite stay immersed in rich history and timeless elegance at ${s.hotel_name || 'Lakshmi Deluxe'}.`}</p>
          <div className="hm-hero-actions">
            <a className="hm-btn hm-btn-primary" href="#/rooms">Get Started</a>
            <a className="hm-btn hm-btn-outline" href="#/booking">Book a Stay</a>
          </div>
        </div>
        <div className="hm-collage">
          <div className="hm-collage-img hm-collage-tall tall"><img src="/images/hotel_Lakshmi1.webp" alt="Hotel exterior" /></div>
          <div className="hm-collage-img small"><img src="/images/hotel_Lakshmi.webp" alt="Welcome lounge" /></div>
          <div className="hm-collage-img small"><img src="/images/hotel_Lakshmi1.webp" alt="Lobby view" /></div>
        </div>
      </section>

      <form className="public-search" onSubmit={(e) => { e.preventDefault(); location.hash = '#/booking'; }}>
        <div>
          <label>Check-in</label>
          <input type="date" id="pub-in" required />
        </div>
        <div>
          <label>Check-out</label>
          <input type="date" id="pub-out" required />
        </div>
        <div>
          <label>Guests</label>
          <input type="number" id="pub-adults" min="1" max="10" defaultValue="2" />
        </div>
        <button className="btn primary" type="submit">Search</button>
      </form>

      <div className="stats-strip fade-up">
        <div className="stat"><b>{types.length || 6}+</b><span>Room types</span></div>
        <div className="stat"><b>4.8★</b><span>Guest rating</span></div>
        <div className="stat"><b>{facilities.length || 6}+</b><span>Facilities</span></div>
        <div className="stat"><b>24×7</b><span>Front desk</span></div>
      </div>

      {featured.id && (
        <section className="hm-featured public-section">
          <div className="hm-featured-photos">
            <div className="hm-collage-img wide small"><img src="/images/hotel_Lakshmi1.webp" alt={featured.name} /></div>
            <div className="hm-collage-img small"><img src="/images/hotel_Lakshmi.webp" alt={featured.name} /></div>
            <div className="hm-collage-img small"><img src="/images/hotel_Lakshmi1.webp" alt={featured.name} /></div>
          </div>
          <div className="hm-featured-text">
            <p className="label">Featured Room</p>
            <h2>{featured.name}</h2>
            <p>{featured.description}</p>
            <div className="hm-price-row">
              <div className="p"><span>Start From</span><b>{s.currency_symbol || '₹'}{featured.price}</b></div>
              <div className="p"><span>Capacity</span><b style={{ color: 'var(--hm-orange)' }}>{featured.capacity || 2} Guests</b></div>
            </div>
            <a className="hm-btn hm-btn-outline" style={{ marginTop: 20 }} href={`#/booking?type=${featured.id}`}>More Details</a>
          </div>
        </section>
      )}

      <section className="public-section" id="rooms">
        <h2>Our Rooms</h2>
        <p className="sub">Comfortable stays for every traveller</p>
        <div className="room-cards">
          {types.map((t) => <RoomCard key={t.id} room={t} currency={s.currency_symbol} />)}
        </div>
      </section>

      {s.about_text && (
        <section className="public-section about">
          <h2>About {s.hotel_name || 'Us'}</h2>
          <div className="about-wrap">
            <img className="about-img" src="/images/hotel_Lakshmi.webp" alt={s.hotel_name || 'Hotel'} />
            <p className="about-text">{s.about_text}</p>
          </div>
        </section>
      )}

      <section className="public-section" id="facilities">
        <h2>Facilities</h2>
        <p className="sub">Everything you need for a perfect stay</p>
        <div className="facilities">
          {facilities.map((f) => (
            <div className="facility" key={f.title}><div className="icon">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>
          ))}
        </div>
      </section>

      <section className="public-section" id="gallery">
        <h2>Gallery</h2>
        <div className="gallery">
          <div className="tile photo"><img src="/images/hotel_Lakshmi1.webp" alt="Hotel" /><span>Hotel Exterior</span></div>
          <div className="tile photo"><img src="/images/hotel_Lakshmi.webp" alt="Hotel" /><span>Welcome to Lakshmi Deluxe</span></div>
          {gallery.map((g) => (
            <div className="tile" key={g.label} style={{ background: g.color }}>{g.emoji}<span>{g.label}</span></div>
          ))}
        </div>
      </section>

      <section className="public-section">
        <h2>What Guests Say</h2>
        <p className="sub">Real stays, real smiles</p>
        <div className="testimonials">
          <div className="testimonial"><div className="stars">★★★★★</div><p>"Beautiful rooms, spotless housekeeping and the rooftop pool at sunset is unforgettable."</p><div className="who">— Priya S., Pune</div></div>
          <div className="testimonial"><div className="stars">★★★★★</div><p>"Aadhya restaurant's butter chicken is the best in the city. Staff went out of their way for our anniversary."</p><div className="who">— Rajesh &amp; Meera K., Mumbai</div></div>
          <div className="testimonial"><div className="stars">★★★★☆</div><p>"Booked online in two minutes, checked in by the time my cab parked. Smooth and premium."</p><div className="who">— Amit D., Bengaluru</div></div>
        </div>
      </section>

      <section className="hm-newsletter">
        <p>Explore More About Our Hotel</p>
        <h3>Sign Up for Our Newsletter</h3>
        <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}>
          <input type="email" placeholder="Your email" required />
          <button className="hm-btn" type="submit">{subscribed ? 'Subscribed! 🎉' : 'Subscribe'}</button>
        </form>
      </section>

      <section className="public-section" id="contact">
        <h2>Contact &amp; Location</h2>
        <div className="public-form">
          <div style={{ marginBottom: 14 }}>
            <div><b>Address:</b> {s.hotel_address || 'Near Rajwadu Resort, Mumbai-Pune Expressway, Pune, India'}</div>
            <div style={{ marginTop: 6 }}><b>Phone:</b> {s.hotel_phone || '+91 98765 43210'}</div>
            {s.email && <div style={{ marginTop: 6 }}><b>Email:</b> {s.email}</div>}
          </div>
          {Object.entries(social).filter(([, v]) => v).map(([k, v]) => (
            <a key={k} className="social" href={v} target="_blank" rel="noreferrer">{k}</a>
          ))}
          <a className="btn primary" href="#/booking">Book a room</a>
        </div>
        <div className="map-wrap">
          <iframe title="Hotel location" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(s.hotel_address || 'Pune, Maharashtra, India')}&output=embed`} />
        </div>
      </section>

      <a className="wa-float" title="Chat on WhatsApp"
        href={`https://wa.me/${String(s.hotel_phone || '+919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${s.hotel_name || 'Lakshmi Deluxe'}! I would like to make an enquiry.`)}`}
        target="_blank" rel="noreferrer">📲</a>
    </>
  );
}