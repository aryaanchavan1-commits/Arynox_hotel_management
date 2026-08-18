import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import RoomCard from '../components/RoomCard.jsx';

const PHOTOS = {
  exterior: '/images/hotel/exterior.jpg',
  lobby: '/images/hotel/lobby.jpg',
  lawn: '/images/hotel/lawn.jpg',
  dining: '/images/hotel/dining.jpg',
  room: '/images/hotel/room-deluxe.jpg',
  suite: '/images/hotel/room-superdeluxe.jpg',
  hall: '/images/hotel/hall.jpg',
  event: '/images/hotel/facade.jpg',
};

const FACE = {
  f1: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=60',
  f2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=60',
  f3: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=60',
};

const SLIDES = [
  { src: PHOTOS.exterior, cap: 'Hotel Exterior — NH4, Karad' },
  { src: PHOTOS.lobby, cap: 'The Welcome Lounge' },
  { src: PHOTOS.dining, cap: 'Pure-Vegetarian Dining' },
  { src: PHOTOS.lawn, cap: 'Multipurpose Hall & Lawn' },
  { src: PHOTOS.suite, cap: 'Comfortable AC Rooms' },
];

function Photo({ src, alt, className }) {
  return <img src={src} alt={alt} loading="lazy" className={className} onError={(e) => { e.target.style.visibility = 'hidden'; }} />;
}

export default function PublicHome() {
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
    get('/public/restaurant').then(setMenu).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((h) => (h + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const s = data?.settings || {};
  const types = data?.roomTypes || [];
  const facilities = data?.facilities || [];
  const social = data?.social || {};
  const featured = types[0] || {};
  const dishes = (menu?.menu || []).flatMap((g) => g.items || []).slice(0, 8);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <section className="hm-slider">
        <div className="track" style={{ transform: `translateX(-${heroIdx * 100}%)` }}>
          {SLIDES.map((sl) => (
            <div className="hm-slide" key={sl.src}>
              <img src={sl.src} alt={sl.cap} loading="lazy" onError={(e) => { e.target.closest('.hm-slide').style.display = 'none'; }} />
              <span className="cap">{sl.cap}</span>
            </div>
          ))}
        </div>
        <button className="hm-slider-arrow left" onClick={() => setHeroIdx((h) => (h - 1 + SLIDES.length) % SLIDES.length)} aria-label="Previous slide">‹</button>
        <button className="hm-slider-arrow right" onClick={() => setHeroIdx((h) => (h + 1) % SLIDES.length)} aria-label="Next slide">›</button>
        <div className="hm-slider-dots">
          {SLIDES.map((sl, i) => <button key={sl.src} className={i === heroIdx ? 'on' : ''} onClick={() => setHeroIdx(i)} aria-label={`Slide ${i + 1}`} />)}
        </div>
      </section>

      <section className="hm-hero">
        <div className="hm-hero-left">
          <h1>Explore Our Exquisite <em>Hotel</em></h1>
          <p className="lead">{s.welcome_message || `Experience an exquisite stay immersed in rich history and timeless elegance at ${s.hotel_name || 'Hotel Lakshmi Elite'}.`}</p>
          <div className="hm-hero-actions">
            <a className="hm-btn hm-btn-primary" href="#/rooms">Get Started</a>
            <a className="hm-btn hm-btn-outline" href="#/booking">Book a Stay</a>
          </div>
        </div>
        <div className="hm-hero-badge">
          <div className="hb-star">★ 4.8</div>
          <div className="hb-text">Guest Rating<br /><small>{facilities.length || 6}+ facilities · 24×7 front desk</small></div>
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
          <select id="pub-adults" defaultValue="2">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
            <option value="7">7+ Guests</option>
          </select>
        </div>
        <button className="btn primary" type="submit">Search</button>
      </form>

      <section className="public-section">
        <div className="section-title">
          <h2>Explore Our Premium Services</h2>
          <p className="sub">World-class accommodations, dining and celebrations — all designed to make your stay memorable.</p>
        </div>
        <div className="svc-grid">
          <div className="svc-card">
            <div className="img"><Photo src={PHOTOS.suite} alt="Luxurious Rooms" className="photofill" /></div>
            <div className="svc-body">
              <h3>Luxurious Rooms</h3>
              <p>Experience unparalleled comfort and elegance in our beautifully designed rooms.</p>
              <div className="svc-actions">
                <a className="hm-btn hm-btn-outline svc-btn" href="#/rooms">View Rooms</a>
                <a className="hm-btn hm-btn-primary svc-btn" href="#/booking">Book Now</a>
              </div>
            </div>
          </div>
          <div className="svc-card">
            <div className="img"><Photo src={PHOTOS.dining} alt="Elegant Dining" className="photofill" /></div>
            <div className="svc-body">
              <h3>Elegant Dining</h3>
              <p>Reserve a table and enjoy delicious pure-vegetarian dishes — dine-in, pickup or delivery.</p>
              <div className="svc-actions">
                <a className="hm-btn hm-btn-outline svc-btn" href="#/restaurant-booking">Reserve a Table</a>
                <a className="hm-btn hm-btn-primary svc-btn" href="#/restaurant">Order Now</a>
              </div>
            </div>
          </div>
          <div className="svc-card">
            <div className="img"><Photo src={PHOTOS.hall} alt="Events & Functions" className="photofill" /></div>
            <div className="svc-body">
              <h3>Hall &amp; Lawn</h3>
              <p>Celebrate weddings, sangeet and functions in our AC multipurpose hall and open lawn.</p>
              <div className="svc-actions">
                <a className="hm-btn hm-btn-outline svc-btn" href="#/venue">View Venue</a>
                <a className="hm-btn hm-btn-primary svc-btn" href="#/venue">Book Now</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {dishes.length > 0 && (
        <section className="hm-food">
          <h2>Savor Our Culinary Excellence</h2>
          <p className="sub">Discover a world of pure-vegetarian flavours — local Maharashtrian specialties and Indian favourites crafted by our chefs.</p>
          <div className="food-grid">
            {dishes.map((d) => (
              <div className="food-card" key={d.id}>
                <div className="dish-img">
                  <img src={d.image || PHOTOS.dining} alt={d.name} loading="lazy" onError={(e) => { e.target.closest('.dish-img').style.background = 'linear-gradient(135deg,#d4af37,#f5a623)'; e.target.style.display = 'none'; }} />
                </div>
                <h3>{d.name}</h3>
                <p>{(d.description || d.category || '').slice(0, 44)}{(d.description || '').length > 44 ? '…' : ''}</p>
                <div className="price">{s.currency_symbol || '₹'}{Number(d.price).toLocaleString('en-IN')}</div>
                <a className="order-now" href="#/restaurant">Order Now</a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stay & Dine Packages */}
      <section className="public-section stay-dine">
        <p className="label">Exclusive Offers</p>
        <h3>Stay & Dine Packages</h3>
        <p>Curated experiences combining luxury stays with gourmet dining</p>
        <div className="packages">
          <div className="pkg">
            <div className="pkg-icon">🏨</div>
            <div className="pkg-title">Weekend Getaway</div>
            <div className="pkg-desc">2 nights in Deluxe Room + Breakfast for 2</div>
            <ul className="pkg-includes">
              <li>Welcome drink on arrival</li>
              <li>Daily buffet breakfast</li>
              <li>Late checkout (12 PM)</li>
              <li>Complimentary Wi-Fi</li>
            </ul>
            <div className="pkg-price"><b>{s.currency_symbol || '₹'}8,999</b><span>/ package</span></div>
            <a className="hm-btn hm-btn-outline pkg-btn" href="#/booking">Book Now</a>
          </div>
          <div className="pkg popular">
            <div className="pkg-tag">MOST POPULAR</div>
            <div className="pkg-icon">🍽️</div>
            <div className="pkg-title">Dine & Stay</div>
            <div className="pkg-desc">1 night Suite + 3-course dinner for 2</div>
            <ul className="pkg-includes">
              <li>Suite upgrade (subject to availability)</li>
              <li>3-course dinner at our restaurant</li>
              <li>Welcome mocktails</li>
              <li>Fresh fruit platter in room</li>
            </ul>
            <div className="pkg-price"><b>{s.currency_symbol || '₹'}12,499</b><span>/ package</span></div>
            <a className="hm-btn hm-btn-primary pkg-btn" href="#/booking?type=suite">Book Now</a>
          </div>
          <div className="pkg">
            <div className="pkg-icon">🎉</div>
            <div className="pkg-title">Celebration Package</div>
            <div className="pkg-desc">2 nights Deluxe + Anniversary setup</div>
            <ul className="pkg-includes">
              <li>Room decoration with flowers</li>
              <li>Cake on arrival</li>
              <li>Candlelight dinner for 2</li>
              <li>Event hall discount (20%)</li>
            </ul>
            <div className="pkg-price"><b>{s.currency_symbol || '₹'}18,999</b><span>/ package</span></div>
            <a className="hm-btn hm-btn-outline pkg-btn" href="#/booking">Book Now</a>
          </div>
        </div>
      </section>

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
            <img className="about-img" src="/images/hotel/exterior.jpg" alt={s.hotel_name || 'Hotel'} />
            <p className="about-text">{s.about_text}</p>
          </div>
        </section>
      )}

      <section className="public-section features-band" id="facilities">
        <h2>Experience Luxury at Its Finest</h2>
        <p className="sub">Amenities and services that cater to your every need</p>
        <div className="facilities">
          {facilities.map((f) => (
            <div className="facility" key={f.title}><div className="icon">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>
          ))}
        </div>
      </section>

      <section className="public-section" id="gallery">
        <h2>Gallery</h2>
        <div className="gallery">
          <div className="tile photo"><Photo src={PHOTOS.exterior} alt="Hotel Exterior" className="photofill" /><span>Hotel Exterior</span></div>
          <div className="tile photo"><Photo src={PHOTOS.lobby} alt="Lobby" className="photofill" /><span>Grand Lobby</span></div>
          <div className="tile photo"><Photo src={PHOTOS.room} alt="Premier Rooms" className="photofill" /><span>Premier Rooms</span></div>
          <div className="tile photo"><Photo src={PHOTOS.dining} alt="Family Dining" className="photofill" /><span>Family Dining</span></div>
          <div className="tile photo"><Photo src={PHOTOS.hall} alt="Multipurpose Hall" className="photofill" /><span>Multipurpose Hall</span></div>
          <div className="tile photo"><Photo src={PHOTOS.lawn} alt="Open Lawn" className="photofill" /><span>Open Lawn</span></div>
        </div>
      </section>

      <section className="public-section">
        <h2>Guest Experiences & Reviews</h2>
        <p className="sub">Real stays, real smiles</p>
        <div className="testimonials">
          <div className="testimonial">
            <div className="avatar"><img src={FACE.f1} alt="Priya" /></div>
            <div className="stars">★★★★★</div>
            <p>"Clean rooms, spotless housekeeping and a lovely evening in the lawn — perfect for our family function."</p>
            <div className="who">Priya S., Satara</div>
          </div>
          <div className="testimonial">
            <div className="avatar"><img src={FACE.f2} alt="Rajesh" /></div>
            <div className="stars">★★★★★</div>
            <p>"The paneer tikka and thali are the best in Karad. Staff went out of their way for our anniversary."</p>
            <div className="who">Rajesh &amp; Meera K., Pune</div>
          </div>
          <div className="testimonial">
            <div className="avatar"><img src={FACE.f3} alt="Amit" /></div>
            <div className="stars">★★★★☆</div>
            <p>"Booked online in two minutes, table was ready by the time we parked. Smooth and budget-friendly."</p>
            <div className="who">Amit D., Kolhapur</div>
          </div>
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
            <div><b>Address:</b> {s.hotel_address || 'Narayanwadi, Pachwad Phata, Karad - 415539 (NH4 / Karad-Kolhapur Highway)'}</div>
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
            src={`https://www.google.com/maps?q=${encodeURIComponent(s.hotel_address || 'Karad, Maharashtra, India')}&output=embed`} />
        </div>
      </section>

      <a className="wa-float" title="Chat on WhatsApp"
        href={`https://wa.me/${String(s.hotel_phone || '+919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${s.hotel_name || 'Hotel Lakshmi Elite'}! I would like to make an enquiry.`)}`}
        target="_blank" rel="noreferrer">📲</a>
    </>
  );
}