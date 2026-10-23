import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, Phone, Mail, MapPin, Instagram, Menu, X, ChevronRight, 
  Search, Filter, ShieldCheck, CheckCircle, Video, CreditCard, 
  User, Plus, Trash2, Edit3, Settings, Download, Save
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  addDoc, deleteDoc, updateDoc 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'arabian-autosplace-app';

// --- MOCK DATA FOR SEEDING ---
const seedInventory = [
  {
    make: 'Honda', model: 'Pilot EX-L', year: 2021, price: 18500000, 
    type: 'Tokunbo', condition: 'Excellent',
    description: 'Clean title, perfectly maintained. Drive with confidence.',
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&q=80&w=800',
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', // Fallback model for demo
    has3D: true, hasVideo: true
  },
  {
    make: 'Toyota', model: 'Land Cruiser Prado', year: 2019, price: 35000000, 
    type: 'Tokunbo', condition: 'Like New',
    description: 'Luxury meets off-road capability. Best choice for Nigerian roads.',
    image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&q=80&w=800',
    has3D: false, hasVideo: false
  },
  {
    make: 'Hyundai', model: 'Santa Fe', year: 2020, price: 14200000, 
    type: 'Naija Used', condition: 'Well Maintained',
    description: 'Affordable luxury. Fair price guarantee.',
    image: 'https://images.unsplash.com/photo-1633507119565-d01869e06180?auto=format&fit=crop&q=80&w=800',
    has3D: false, hasVideo: true
  }
];

// --- COMPONENTS ---

const BrandHeader = () => (
  <div className="flex flex-col items-center mb-6">
    <div className="flex items-center gap-2 text-3xl md:text-4xl font-extrabold tracking-tight">
      <span className="text-[#0F172A]">Arabian</span>
      <span className="text-[#DC2626]">autosplace</span>
    </div>
    <div className="flex items-center gap-2 mt-2">
      <div className="h-[1px] w-12 bg-[#DC2626]"></div>
      <p className="text-sm font-semibold tracking-widest text-[#0F172A] uppercase">
        Reliable Cars @ Affordable Price
      </p>
      <div className="h-[1px] w-12 bg-[#DC2626]"></div>
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false); // Toggle for demo purposes

  // Navigation with Animation
  const navigate = (page, car = null) => {
    if (page === currentPage && !car) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      if (car) setSelectedCar(car);
      window.scrollTo(0, 0);
      setIsTransitioning(false);
    }, 600); // Wait for car drive animation
  };

  // Inject Google Model Viewer Script for 3D
  useEffect(() => {
    if (!document.querySelector('script#model-viewer-script')) {
      const script = document.createElement('script');
      script.id = 'model-viewer-script';
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  // Firebase Auth & Data Fetching
  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      // Keep the public site usable with the included demo inventory until Firebase is configured.
      setInventory(seedInventory.map((car, index) => ({ ...car, id: `demo-${index + 1}` })));
      setUser({ uid: 'demo-user' });
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !firebaseConfigured || !db) return;

    const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    
    const unsubInventory = onSnapshot(inventoryRef, (snapshot) => {
      if (snapshot.empty) {
        // Seed data if empty
        seedInventory.forEach(async (car) => {
          await addDoc(inventoryRef, car);
        });
      } else {
        const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventory(cars);
      }
    }, (error) => console.error("Inventory fetch error:", error));

    return () => unsubInventory();
  }, [user]);

  // UI Components
  const NavBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    const navLinks = [
      { id: 'home', label: 'Home' },
      { id: 'inventory', label: 'Cars in Stock' },
      { id: 'request', label: 'Request a Car' },
      { id: 'ceo', label: 'Meet the CEO' },
    ];

    return (
      <nav className="bg-[#0F172A] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FBBF24]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => navigate('home')}>
              <span className="font-bold text-xl tracking-wider text-white">
                Arabian<span className="text-[#DC2626]">Autos</span>
              </span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map(link => (
                <button 
                  key={link.id}
                  onClick={() => navigate(link.id)}
                  className={`text-sm font-medium transition-colors hover:text-[#FBBF24] ${currentPage === link.id ? 'text-[#FBBF24]' : 'text-gray-300'}`}
                >
                  {link.label}
                </button>
              ))}
              <button 
                onClick={() => navigate('admin')}
                className={`ml-4 p-2 rounded-full hover:bg-[#334155] transition-colors ${currentPage === 'admin' ? 'bg-[#334155] text-[#FBBF24]' : 'bg-[#1E293B] text-gray-400'}`}
                title="Go to Admin Dashboard"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300 hover:text-white focus:outline-none">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden bg-[#1E293B] border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => { navigate(link.id); setIsOpen(false); }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${currentPage === link.id ? 'bg-[#0F172A] text-[#FBBF24]' : 'text-gray-300 hover:bg-[#0F172A] hover:text-white'}`}
                >
                  {link.label}
                </button>
              ))}
              <button
                  onClick={() => { setIsAdminMode(!isAdminMode); setIsOpen(false); navigate('admin'); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white"
                >
                  {isAdminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
                </button>
            </div>
          </div>
        )}
      </nav>
    );
  };

  const Footer = () => (
    <footer className="bg-[#0F172A] text-gray-300 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-[#FBBF24] font-bold text-lg mb-4">Arabian Autosplace</h3>
          <p className="text-sm">Best Car Tokunbo & Naija Used @ Affordable Price. Drive with Confidence, Arrive in Style...</p>
        </div>
        <div>
          <h3 className="text-[#FBBF24] font-bold text-lg mb-4">Contact Info</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone size={16} className="text-[#DC2626]"/> 08033484232, 08023154239</li>
            <li className="flex items-center gap-2"><Mail size={16} className="text-[#DC2626]"/> sayarabian@gmail.com</li>
            <li className="flex items-center gap-2"><MapPin size={16} className="text-[#DC2626]"/> Lagos, Nigeria</li>
          </ul>
        </div>
        <div>
          <h3 className="text-[#FBBF24] font-bold text-lg mb-4">Follow Us</h3>
          <a href="#" className="flex items-center gap-2 text-sm hover:text-white transition">
            <Instagram size={20} className="text-[#E1306C]" /> @Arabaianautosplace
          </a>
        </div>
      </div>
    </footer>
  );

  // --- PAGES ---

  const Home = () => (
    <div className="animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="relative bg-[#0F172A] text-white pt-16 pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* Lighter overlay to ensure the car in the background is very clear */}
          <div className="absolute inset-0 bg-black/10 z-10"></div>
          {/* Crystal clear high-res car background */}
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=100&w=1920')] bg-cover bg-center opacity-90"></div>
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <BrandHeader />
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 italic font-serif text-white drop-shadow-2xl shadow-black">
            "Drive with <span className="text-[#DC2626]">Confidence</span>,<br/> Arrive in <span className="text-[#FBBF24]">Style</span>..."
          </h2>
          
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button onClick={() => navigate('inventory')} className="bg-[#DC2626] text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center gap-2">
              View Inventory <ChevronRight size={20} />
            </button>
            <button onClick={() => navigate('request')} className="bg-transparent border-2 border-[#FBBF24] text-[#FBBF24] px-8 py-3 rounded-full font-bold hover:bg-[#FBBF24] hover:text-[#0F172A] transition">
              Request Specific Car
            </button>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section className="bg-white py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: <ShieldCheck size={32}/>, title: "Trusted Dealer", desc: "100% Customer Satisfaction" },
            { icon: <CheckCircle size={32}/>, title: "Fair Price", desc: "Best Prices Guarantee" },
            { icon: <Car size={32}/>, title: "Wide Range", desc: "Tokunbo & Naija Used" },
            { icon: <CreditCard size={32}/>, title: "Easy Process", desc: "Quick Deals & Delivery" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="text-[#FBBF24] bg-[#0F172A] p-3 rounded-full mb-3">{item.icon}</div>
              <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
              <p className="text-xs text-gray-500 uppercase font-semibold">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Cars Preview */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-2xl font-bold text-[#0F172A]">Featured Cars</h3>
              <p className="text-gray-600 mt-1">Best Choice. Best Prices.</p>
            </div>
            <button onClick={() => navigate('inventory')} className="text-[#DC2626] font-semibold hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {inventory.slice(0, 3).map(car => (
              <div key={car.id} className="bg-white rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:-translate-y-1 transition duration-300" onClick={() => navigate('details', car)}>
                <div className="h-48 overflow-hidden relative">
                  <img src={car.image} alt={car.make} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-2 right-2 bg-[#0F172A] text-[#FBBF24] text-xs font-bold px-2 py-1 rounded">
                    {car.type}
                  </div>
                  {car.has3D && (
                    <div className="absolute bottom-2 left-2 bg-white/90 text-[#0F172A] text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <Plus size={12}/> 3D View
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-lg text-gray-900">{car.year} {car.make} {car.model}</h4>
                  <p className="text-[#DC2626] font-extrabold text-xl mt-2">₦{Number(car.price).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{car.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const Inventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');

    const filteredCars = inventory.filter(car => {
      const matchesSearch = `${car.make} ${car.model} ${car.year}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || car.type === filterType;
      return matchesSearch && matchesType;
    });

    return (
      <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen">
        <h2 className="text-3xl font-bold text-[#0F172A] mb-8">Cars in Stock</h2>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search make, model, year..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            >
              <option value="All">All Types</option>
              <option value="Tokunbo">Tokunbo</option>
              <option value="Naija Used">Naija Used</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map(car => (
            <div key={car.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 border border-gray-100 flex flex-col">
              <div className="h-56 overflow-hidden relative cursor-pointer" onClick={() => navigate('details', car)}>
                <img src={car.image} alt={car.make} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <span className="bg-[#0F172A] text-[#FBBF24] text-xs font-bold px-2 py-1 rounded shadow">
                    {car.type}
                  </span>
                  <span className="bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded shadow">
                    {car.condition}
                  </span>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h4 className="font-bold text-xl text-gray-900 mb-1">{car.year} {car.make} {car.model}</h4>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{car.description}</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[#DC2626] font-extrabold text-xl">₦{Number(car.price).toLocaleString()}</span>
                  <button onClick={() => navigate('details', car)} className="bg-[#0F172A] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredCars.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No cars found matching your search.
              <button onClick={() => navigate('request')} className="block mx-auto mt-4 text-[#DC2626] font-semibold underline">
                Request a specific car instead?
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CarDetails = () => {
    if (!selectedCar) return null;
    const car = selectedCar;

    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-8 duration-500">
        <button onClick={() => navigate('inventory')} className="text-gray-500 hover:text-[#0F172A] mb-6 flex items-center gap-1 font-semibold text-sm">
          &larr; Back to Inventory
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Visuals Column */}
          <div className="space-y-6">
            <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] shadow-inner relative flex items-center justify-center">
              {car.has3D ? (
                // 3D Viewer Placeholder using Google Model Viewer
                <model-viewer 
                  src={car.modelUrl || 'https://modelviewer.dev/shared-assets/models/glTF-Sample-Assets/Models/ToyCar/glTF-Binary/ToyCar.glb'} 
                  alt={`3D model of ${car.make}`}
                  auto-rotate="true" 
                  camera-controls="true"
                  touch-action="pan-y"
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }}
                >
                  <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow flex items-center gap-2">
                     <Plus size={14}/> Interactive 3D (Drag to rotate)
                  </div>
                </model-viewer>
              ) : (
                <img src={car.image} alt={car.make} className="w-full h-full object-cover" />
              )}
            </div>

            {car.hasVideo && (
              <div className="bg-black rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center group cursor-pointer">
                {car.videoUrl ? (
                   <video src={car.videoUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <>
                    <img src={car.image} alt="Video thumbnail" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-[#DC2626] w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Video size={24} />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 text-white font-semibold flex items-center gap-2">
                       Live Video Walkthrough
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#0F172A] text-[#FBBF24] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{car.type}</span>
              <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{car.condition}</span>
            </div>
            
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{car.year} {car.make} {car.model}</h1>
            <p className="text-3xl font-black text-[#DC2626] mb-6">₦{Number(car.price).toLocaleString()}</p>
            
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-lg mb-3">Vehicle Overview</h3>
              <p className="text-gray-600 leading-relaxed">{car.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <span className="block text-xs text-gray-500 uppercase font-semibold">Make</span>
                  <span className="font-medium">{car.make}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 uppercase font-semibold">Model</span>
                  <span className="font-medium">{car.model}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 uppercase font-semibold">Year</span>
                  <span className="font-medium">{car.year}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 uppercase font-semibold">Availability</span>
                  <span className="font-medium text-green-600 flex items-center gap-1"><CheckCircle size={14}/> In Stock</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('checkout', car)}
              className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1e293b] transition shadow-lg flex items-center justify-center gap-2"
            >
              Book / Enquire Now <ChevronRight size={20}/>
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">Secure deposits handled via Paystack.</p>
          </div>
        </div>
      </div>
    );
  };

  const CarRequest = () => {
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', details: '' });
    const [status, setStatus] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user) return;
      setStatus('submitting');
      try {
        const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'carRequests');
        await addDoc(reqRef, {
          ...formData,
          createdAt: new Date().toISOString(),
          status: 'Pending'
        });
        setStatus('success');
        setFormData({ name: '', phone: '', email: '', details: '' });
        setTimeout(() => setStatus(''), 5000);
      } catch (error) {
        console.error("Error submitting request:", error);
        setStatus('error');
      }
    };

    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-[#0F172A] p-8 text-white text-center">
            <h2 className="text-3xl font-bold text-[#FBBF24] mb-2">Can't Find Your Dream Car?</h2>
            <p className="text-gray-300">Let us source it for you. Fill the form below.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {status === 'success' && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 font-semibold">
                <CheckCircle size={20} /> Request received! We will contact you soon.
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg font-semibold">
                Failed to submit request. Please try again.
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0F172A] focus:border-transparent outline-none" 
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
              <input 
                type="tel" required
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0F172A] focus:border-transparent outline-none" 
                placeholder="080..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address (For Feedback)</label>
              <input 
                type="email" required
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0F172A] focus:border-transparent outline-none" 
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Car Details (Make, Model, Year, Color)</label>
              <textarea 
                required rows="4"
                value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0F172A] focus:border-transparent outline-none resize-none" 
                placeholder="e.g., 2022 Mercedes Benz GLE 450, Black exterior..."
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={status === 'submitting'}
              className="w-full bg-[#DC2626] text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const MeetCEO = () => (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex flex-col md:flex-row items-center gap-12">
        <div className="w-full md:w-1/3">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl relative">
            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800" alt="CEO" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <h3 className="text-2xl font-bold">Mr. Arabian</h3>
              <p className="text-[#FBBF24] font-semibold">Founder & CEO</p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-2/3 space-y-6">
          <BrandHeader />
          <h2 className="text-3xl font-bold text-gray-900">A Vision of Excellence</h2>
          <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
            <p>
              Welcome to Arabian Autosplace. Our journey began with a simple yet powerful vision: to redefine the car buying experience in Nigeria by providing reliable, high-quality Tokunbo and Naija used cars at truly affordable prices.
            </p>
            <p>
              We understand that buying a car is a significant investment. That's why every vehicle in our lot undergoes rigorous maintenance checks to ensure you get exactly what we promise – peace of mind.
            </p>
            <p>
              "Drive with Confidence, Arrive in Style..." isn't just our slogan; it's our commitment to you. We strive for 100% customer satisfaction, ensuring quick deals, transparent processes, and fast delivery. 
            </p>
            <p className="font-semibold text-gray-900 italic mt-6">
              - Thank you for choosing the Best Choice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const Checkout = () => {
    if (!selectedCar) {
      navigate('inventory');
      return null;
    }

    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [status, setStatus] = useState('');

    const handleMockPayment = async (e) => {
      e.preventDefault();
      if (!user) return;
      setStatus('processing');
      
      // Simulate Paystack popup delay
      setTimeout(async () => {
        try {
          const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
          await addDoc(bookingsRef, {
            carId: selectedCar.id,
            carDesc: `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`,
            customer: form,
            date: new Date().toISOString(),
            status: 'Deposit Paid'
          });
          setStatus('success');
        } catch (error) {
          console.error(error);
          setStatus('error');
        }
      }, 2000);
    };

    if (status === 'success') {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-8">We have received your deposit for the {selectedCar.make} {selectedCar.model}. Our team will contact you shortly to finalize the delivery details.</p>
          <button onClick={() => navigate('home')} className="bg-[#0F172A] text-white px-8 py-3 rounded-full font-bold">Return Home</button>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12">
        <div className="w-full md:w-1/2">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Secure Booking</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <h3 className="font-bold text-lg border-b pb-3 mb-4">Order Summary</h3>
            <div className="flex gap-4">
              <img src={selectedCar.image} alt="car" className="w-24 h-24 object-cover rounded-lg" />
              <div>
                <h4 className="font-bold text-gray-900">{selectedCar.year} {selectedCar.make} {selectedCar.model}</h4>
                <p className="text-sm text-gray-500">{selectedCar.type} • {selectedCar.condition}</p>
                <p className="text-lg font-black text-[#DC2626] mt-2">₦{Number(selectedCar.price).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              You are paying a secure <strong>10% reservation deposit</strong>. The balance will be paid upon inspection and delivery.
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t font-bold text-xl">
              <span>Deposit Due:</span>
              <span>₦{Number(selectedCar.price * 0.1).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <form onSubmit={handleMockPayment} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="font-bold text-xl mb-6">Your Details</h3>
            <div className="space-y-4 mb-8">
              <input type="text" required placeholder="Full Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#0F172A]" />
              <input type="tel" required placeholder="Phone Number" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#0F172A]" />
              <input type="email" required placeholder="Email Address" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#0F172A]" />
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4 text-gray-600">
                <CreditCard size={20} /> Secured by <strong className="text-[#0CAADE]">Paystack</strong>
              </div>
              <button 
                type="submit" 
                disabled={status === 'processing'}
                className="w-full bg-[#0CAADE] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0a8bb5] transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg"
              >
                {status === 'processing' ? 'Processing...' : `Pay Deposit ₦${Number(selectedCar.price * 0.1).toLocaleString()}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const AdminDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [isAddingCar, setIsAddingCar] = useState(false);
    const [editingCarId, setEditingCarId] = useState(null);
    const [activeTab, setActiveTab] = useState('inventory');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');

    // Upload & Preview States
    const [imageSource, setImageSource] = useState('url'); 
    const [videoSource, setVideoSource] = useState('url');
    const [imageFile, setImageFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    const emptyCar = {
      make: '', model: '', year: 2022, price: '', 
      type: 'Tokunbo', condition: 'Excellent',
      description: '', image: '', modelUrl: '', has3D: false, hasVideo: false, videoUrl: ''
    };
    
    const [newCar, setNewCar] = useState(emptyCar);

    useEffect(() => {
      if (!user) return;

      // Firebase is optional for the public demo. Avoid dereferencing a missing Firestore
      // instance so the admin login screen can still render without Firebase credentials.
      if (!firebaseConfigured || !db) {
        setRequests([]);
        setBookings([]);
        return;
      }
      
      const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'carRequests');
      const unsubReq = onSnapshot(reqRef, snap => {
        setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, err => console.error(err));

      const bookRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
      const unsubBook = onSnapshot(bookRef, snap => {
        setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, err => console.error(err));

      return () => { unsubReq(); unsubBook(); };
    }, [user]);

    const handleLogin = (e) => {
      e.preventDefault();
      if (passcode === 'admin123') {
        setIsAuthenticated(true);
      } else {
        alert('Incorrect passcode. Hint: admin123');
      }
    };

    const uploadFileToStorage = async (file, folder) => {
      try {
        const fileRef = ref(storage, `artifacts/${appId}/uploads/${folder}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytesResumable(fileRef, file);
        return await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Upload error:", error);
        throw new Error(`Failed to upload ${folder} file. Ensure Firebase Storage is properly configured.`);
      }
    };

    const handleAddOrUpdateCar = async (e) => {
      e.preventDefault();
      if (!user) return;
      setIsUploading(true);
      setUploadStatus('Uploading files (if any)...');
      
      try {
        let finalImageUrl = newCar.image;
        let finalVideoUrl = newCar.videoUrl;

        // Handle Image Upload
        if (imageSource === 'file' && imageFile) {
          finalImageUrl = await uploadFileToStorage(imageFile, 'images');
        }
        // Handle Video Upload
        if (newCar.hasVideo && videoSource === 'file' && videoFile) {
          finalVideoUrl = await uploadFileToStorage(videoFile, 'videos');
        }

        setUploadStatus('Saving to database...');

        const carData = {
          ...newCar,
          year: parseInt(newCar.year),
          price: parseFloat(newCar.price),
          image: finalImageUrl,
          videoUrl: finalVideoUrl || ''
        };

        if (editingCarId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', editingCarId), carData);
        } else {
          const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
          await addDoc(inventoryRef, carData);
        }
        
        setIsAddingCar(false);
        setEditingCarId(null);
        setNewCar(emptyCar);
        setImageFile(null);
        setVideoFile(null);
      } catch (error) {
        console.error("Error saving car:", error);
        setUploadStatus(`Error: ${error.message}`);
        setIsUploading(false);
        return; 
      }
      setIsUploading(false);
      setUploadStatus('');
    };

    const handleEditClick = (car) => {
      setNewCar({ ...emptyCar, ...car });
      setEditingCarId(car.id);
      setImageSource('url'); // Reset to URL so they can see the existing string link
      setVideoSource('url');
      setIsAddingCar(true);
    };

    const handleDeleteCar = async (id) => {
      if (!user) return;
      if (window.confirm("Are you sure you want to delete this car from inventory?")) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id));
        } catch (error) {
          console.error("Error deleting car:", error);
        }
      }
    };

    const handleDeleteBooking = async (id) => {
      if (!user) return;
      if (window.confirm("Are you sure you want to delete this booking record?")) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      }
    };

    const handleResolveTicket = async (id, currentStatus) => {
      if (!user) return;
      const newStatus = currentStatus === 'Resolved' ? 'Pending' : 'Resolved';
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carRequests', id), { status: newStatus });
    };

    const handleDeleteTicket = async (id) => {
      if (!user) return;
      if (window.confirm("Delete this request ticket entirely?")) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carRequests', id));
      }
    };

    const handleBackupData = () => {
      const backup = {
        timestamp: new Date().toISOString(),
        inventory,
        requests,
        bookings
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arabian-autos-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    if (!isAuthenticated) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 text-center">
            <div className="w-16 h-16 bg-[#0F172A] rounded-full flex items-center justify-center mx-auto mb-4 text-[#FBBF24]">
              <Settings size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin CMS Login</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your credentials to manage inventory and view requests.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password" 
                placeholder="Enter Passcode (admin123)" 
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
              <button type="submit" className="w-full bg-[#DC2626] text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md">
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <div className="p-6 bg-[#0F172A] text-white">
              <h2 className="font-bold text-lg flex items-center gap-2 text-[#FBBF24]"><Settings size={20}/> CMS Admin</h2>
            </div>
            <div className="p-2 space-y-1">
              <button 
                onClick={() => {setActiveTab('inventory'); setIsAddingCar(false);}}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition ${activeTab === 'inventory' ? 'bg-gray-100 text-[#DC2626]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Car size={18}/> Inventory
              </button>
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition ${activeTab === 'bookings' ? 'bg-gray-100 text-[#DC2626]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <CreditCard size={18}/> Bookings
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition ${activeTab === 'requests' ? 'bg-gray-100 text-[#DC2626]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Mail size={18}/> Special Requests
              </button>
            </div>
            <div className="p-4 border-t mt-4">
              <button 
                onClick={handleBackupData}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold text-sm flex justify-center items-center gap-2 shadow-md transition"
              >
                <Download size={18} /> Backup Database
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <div className="flex justify-between items-center border-b pb-4 mb-6">
                 <div>
                   <h3 className="font-bold text-2xl text-gray-900">Vehicle Inventory</h3>
                   <p className="text-gray-500 text-sm">Manage your showroom stock</p>
                 </div>
                 <button 
                   onClick={() => {
                     setEditingCarId(null);
                     setNewCar(emptyCar);
                     setIsAddingCar(!isAddingCar);
                   }}
                   className="bg-[#0F172A] hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition shadow"
                 >
                    {isAddingCar ? <X size={18} /> : <Plus size={18}/>} {isAddingCar ? 'Cancel' : 'Add New Vehicle'}
                 </button>
               </div>

               {isAddingCar && (
                 <form onSubmit={handleAddOrUpdateCar} className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                   <div className="md:col-span-2 flex items-center gap-2 mb-2">
                     <Edit3 className="text-[#DC2626]"/> 
                     <h4 className="font-bold text-lg">{editingCarId ? 'Edit Vehicle Details' : 'Add New Vehicle'}</h4>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Make</label>
                     <input type="text" placeholder="e.g. Toyota" required value={newCar.make || ''} onChange={e => setNewCar({...newCar, make: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                     <input type="text" placeholder="e.g. Camry SE" required value={newCar.model || ''} onChange={e => setNewCar({...newCar, model: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                     <input type="number" placeholder="Year" required value={newCar.year || ''} onChange={e => setNewCar({...newCar, year: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₦)</label>
                     <input type="number" placeholder="Price (₦)" required value={newCar.price || ''} onChange={e => setNewCar({...newCar, price: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                     <select value={newCar.type || 'Tokunbo'} onChange={e => setNewCar({...newCar, type: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]">
                       <option value="Tokunbo">Tokunbo</option>
                       <option value="Naija Used">Naija Used</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Condition</label>
                     <input type="text" placeholder="e.g. Excellent" value={newCar.condition || ''} onChange={e => setNewCar({...newCar, condition: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                     <input type="url" placeholder="Paste image link here" required value={newCar.image || ''} onChange={e => setNewCar({...newCar, image: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                     <textarea placeholder="Vehicle details..." required value={newCar.description || ''} onChange={e => setNewCar({...newCar, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" rows="3"></textarea>
                   </div>
                   
                   {/* IMAGE UPLOAD SECTION */}
                   <div className="md:col-span-2 p-4 bg-gray-100 rounded-lg border border-gray-200">
                     <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-bold text-gray-500 uppercase">Primary Image</label>
                       <div className="flex items-center gap-3 text-sm">
                         <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={imageSource==='url'} onChange={()=>setImageSource('url')} className="accent-[#0F172A]"/> URL Link</label>
                         <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={imageSource==='file'} onChange={()=>setImageSource('file')} className="accent-[#0F172A]"/> Upload File</label>
                       </div>
                     </div>
                     {imageSource === 'url' ? (
                       <input type="url" placeholder="Paste image link here" required={!editingCarId && imageSource === 'url'} value={newCar.image || ''} onChange={e => setNewCar({...newCar, image: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0F172A]" />
                     ) : (
                       <input type="file" accept="image/*" required={!editingCarId && imageSource === 'file'} onChange={e => setImageFile(e.target.files[0])} className="w-full p-2 border border-gray-300 rounded-lg bg-white" />
                     )}
                   </div>
                   
                   {/* 3D & VIDEO SECTION */}
                   <div className="flex flex-col md:flex-row items-start gap-6 md:col-span-2 bg-white p-4 rounded-lg border border-gray-200 w-full">
                     <div className="flex-1 w-full">
                       <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-800 mb-2">
                         <input type="checkbox" checked={newCar.has3D || false} onChange={e => setNewCar({...newCar, has3D: e.target.checked})} className="w-5 h-5 accent-[#0F172A]" /> 
                         Enable 3D Viewer
                       </label>
                       {newCar.has3D && (
                         <input 
                           type="url" 
                           placeholder="Paste .glb 3D model URL here" 
                           value={newCar.modelUrl || ''} 
                           onChange={e => setNewCar({...newCar, modelUrl: e.target.value})} 
                           className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0F172A]" 
                         />
                       )}
                     </div>

                     <div className="hidden md:block w-px h-16 bg-gray-300"></div>
                     
                     <div className="flex-1 w-full">
                       <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-800 mb-2">
                         <input type="checkbox" checked={newCar.hasVideo || false} onChange={e => setNewCar({...newCar, hasVideo: e.target.checked})} className="w-5 h-5 accent-[#0F172A]" /> 
                         Add Video Walkthrough
                       </label>
                       {newCar.hasVideo && (
                         <div className="w-full">
                            <div className="flex items-center gap-3 text-xs mb-2">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={videoSource==='url'} onChange={()=>setVideoSource('url')} className="accent-[#0F172A]"/> URL Link</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={videoSource==='file'} onChange={()=>setVideoSource('file')} className="accent-[#0F172A]"/> Upload File</label>
                            </div>
                            {videoSource === 'url' ? (
                              <input type="url" placeholder="Paste video URL here" value={newCar.videoUrl || ''} onChange={e => setNewCar({...newCar, videoUrl: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0F172A]" />
                            ) : (
                              <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} className="w-full p-1 border border-gray-300 rounded-lg bg-white text-sm" />
                            )}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* STATUS MESSAGE */}
                   {uploadStatus && (
                     <div className={`md:col-span-2 p-3 rounded-lg text-sm font-semibold ${uploadStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                       {uploadStatus}
                     </div>
                   )}

                   {/* SUBMIT BUTTONS */}
                   <div className="md:col-span-2 flex gap-4 mt-2">
                     <button type="button" onClick={() => setIsPreviewing(true)} className="flex-1 bg-white border-2 border-[#0F172A] text-[#0F172A] font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition text-lg hover:bg-gray-50">
                       <Video size={20} /> Preview
                     </button>
                     <button type="submit" disabled={isUploading} className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition text-lg disabled:opacity-50">
                       <Save size={20} /> {isUploading ? 'Publishing...' : (editingCarId ? 'Update & Publish' : 'Publish Vehicle')}
                     </button>
                   </div>
                 </form>
               )}

               {/* PREVIEW MODAL */}
               {isPreviewing && (
                 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
                   <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
                     <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                       <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2"><Video size={24} className="text-[#DC2626]"/> Vehicle Preview</h3>
                       <button onClick={() => setIsPreviewing(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-600 transition">
                         <X size={20} />
                       </button>
                     </div>
                     <div className="p-6">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         {/* Preview Visuals */}
                         <div className="space-y-6">
                            <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] shadow-inner relative flex items-center justify-center">
                              {newCar.has3D ? (
                                <div className="text-gray-500 flex flex-col items-center gap-2">
                                  <Video size={48} className="text-gray-300"/> 
                                  <span className="font-semibold text-gray-700">3D Preview Modal Restricted</span>
                                  <span className="text-xs max-w-[200px] text-center">Will load {newCar.modelUrl || 'default .glb model'} in the live view.</span>
                                </div>
                              ) : (
                                <img src={imageSource === 'file' && imageFile ? URL.createObjectURL(imageFile) : (newCar.image || 'https://via.placeholder.com/800x600?text=No+Image+Selected')} alt="Preview" className="w-full h-full object-cover" />
                              )}
                            </div>
                            {newCar.hasVideo && (
                              <div className="bg-black rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center">
                                {videoSource === 'file' && videoFile ? (
                                  <video src={URL.createObjectURL(videoFile)} controls className="w-full h-full object-cover" />
                                ) : newCar.videoUrl ? (
                                  <video src={newCar.videoUrl} controls className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-white text-sm font-semibold flex items-center gap-2"><Video size={20}/> Live Video Placeholder</div>
                                )}
                              </div>
                            )}
                         </div>
                         {/* Preview Details */}
                         <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="bg-[#0F172A] text-[#FBBF24] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{newCar.type || 'Type'}</span>
                              <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{newCar.condition || 'Condition'}</span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{newCar.year || 'YYYY'} {newCar.make || 'Make'} {newCar.model || 'Model'}</h1>
                            <p className="text-3xl font-black text-[#DC2626] mb-6">₦{Number(newCar.price || 0).toLocaleString()}</p>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 mb-8">
                              <h3 className="font-bold text-lg mb-3">Vehicle Overview</h3>
                              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{newCar.description || 'Description will appear here...'}</p>
                            </div>
                            <button onClick={() => setIsPreviewing(false)} className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition">
                              Close Preview & Continue Editing
                            </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               )}

               <div className="grid gap-4">
                 {inventory.map(car => (
                   <div key={car.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition gap-4">
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                       <img src={car.image} alt={car.model} className="w-24 h-16 object-cover rounded-lg shadow-sm" />
                       <div>
                         <p className="font-bold text-gray-900 text-lg">{car.year} {car.make} {car.model}</p>
                         <div className="flex flex-wrap gap-2 text-xs font-semibold mt-1">
                            <span className="text-[#DC2626]">₦{Number(car.price).toLocaleString()}</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">{car.type}</span>
                            {car.has3D && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">3D</span>}
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                       <button onClick={() => handleEditClick(car)} className="flex items-center gap-1 text-gray-600 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg text-sm font-medium transition">
                         <Edit3 size={16}/> Edit
                       </button>
                       <button onClick={() => handleDeleteCar(car.id)} className="flex items-center gap-1 text-gray-600 hover:text-red-600 bg-white border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg text-sm font-medium transition">
                         <Trash2 size={16}/> Delete
                       </button>
                     </div>
                   </div>
                 ))}
                 {inventory.length === 0 && (
                   <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                      No vehicles in inventory. Click "Add New Vehicle" to get started.
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === 'bookings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold text-2xl text-gray-900 mb-6 border-b pb-4">Customer Bookings & Deposits</h3>
               {bookings.length === 0 ? (
                 <div className="text-center py-12 text-gray-500">No bookings have been made yet. Navigate to a car and click "Book Now" to test this!</div>
               ) : (
                 <div className="grid gap-4">
                   {bookings.map(book => (
                     <div key={book.id} className="bg-white p-5 rounded-xl border-l-4 border-[#0CAADE] shadow-sm border-y border-r border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                       <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                           <h4 className="font-bold text-lg text-gray-900">{book.carDesc}</h4>
                           <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">{book.status}</span>
                         </div>
                         <div className="text-sm text-gray-600 space-y-1">
                           <p><strong className="text-gray-800">Customer:</strong> {book.customer?.name}</p>
                           <p><strong className="text-gray-800">Contact:</strong> {book.customer?.phone} | {book.customer?.email}</p>
                           <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                             <CheckCircle size={14}/> Date: {new Date(book.date).toLocaleString()}
                           </p>
                         </div>
                       </div>
                       <button onClick={() => handleDeleteBooking(book.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-semibold transition">
                         Delete Booking
                       </button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold text-2xl text-gray-900 mb-6 border-b pb-4">Special Car Requests (Tickets)</h3>
               {requests.length === 0 ? (
                 <div className="text-center py-12 text-gray-500">No special requests received yet.</div>
               ) : (
                 <div className="grid gap-4">
                   {requests.map(req => (
                     <div key={req.id} className={`bg-white p-5 rounded-xl border-l-4 shadow-sm border-y border-r border-gray-100 relative overflow-hidden transition-all ${req.status === 'Resolved' ? 'border-l-green-500 opacity-75' : 'border-l-[#FBBF24]'}`}>
                       <div className="flex justify-between items-start mb-3">
                         <div>
                           <div className="flex items-center gap-2">
                             <h4 className="font-bold text-lg text-gray-900">{req.name}</h4>
                             <span className={`text-xs font-bold px-2 py-0.5 rounded ${req.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                               {req.status || 'Pending'}
                             </span>
                           </div>
                           <p className="text-sm text-gray-500">{req.phone} | {req.email}</p>
                         </div>
                         <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                           {new Date(req.createdAt).toLocaleDateString()}
                         </span>
                       </div>
                       <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 text-sm italic mb-4">
                         "{req.details}"
                       </div>
                       
                       <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                         {req.email && (
                           <a 
                             href={`mailto:${req.email}?subject=Regarding your car request at Arabian Autosplace&body=Hi ${req.name},%0D%0A%0D%0AWe received your request for: ${req.details}%0D%0A%0D%0A`}
                             className="flex items-center gap-1 text-sm bg-[#0F172A] text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
                           >
                             <Mail size={14}/> Reply via Email
                           </a>
                         )}
                         <button 
                           onClick={() => handleResolveTicket(req.id, req.status)}
                           className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition ${req.status === 'Resolved' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                         >
                           <CheckCircle size={14}/> {req.status === 'Resolved' ? 'Mark Pending' : 'Mark Resolved'}
                         </button>
                         <button 
                           onClick={() => handleDeleteTicket(req.id)}
                           className="flex items-center gap-1 text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition ml-auto"
                         >
                           <Trash2 size={14}/> Delete Ticket
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- PAGE TRANSITION ANIMATION COMPONENT ---
  const PageTransition = () => (
    <div className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-[#0F172A] transition-opacity duration-300 ${isTransitioning ? 'opacity-100' : 'opacity-0 hidden'}`}>
       <div className="relative w-full h-full overflow-hidden">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-700 -translate-y-1/2"></div>
          {/* Animated Car Icon passing by */}
          <div className="absolute top-1/2 -translate-y-1/2 text-[#FBBF24] animate-drive" style={{ animationDuration: '0.8s', animationTimingFunction: 'linear' }}>
            <Car size={64} className="transform scale-x-[-1]" />
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drive {
          0% { left: -100px; transform: translateY(-50%) rotate(0deg); }
          10% { transform: translateY(-55%) rotate(-5deg); }
          20% { transform: translateY(-50%) rotate(0deg); }
          90% { transform: translateY(-50%) rotate(0deg); }
          100% { left: 110vw; transform: translateY(-50%) rotate(0deg); }
        }
        .animate-drive {
          animation-name: drive;
        }
      `}} />
      
      <NavBar />
      <PageTransition />
      
      <main className="flex-grow">
        {!isTransitioning && (
          <>
            {currentPage === 'home' && <Home />}
            {currentPage === 'inventory' && <Inventory />}
            {currentPage === 'details' && <CarDetails />}
            {currentPage === 'request' && <CarRequest />}
            {currentPage === 'ceo' && <MeetCEO />}
            {currentPage === 'checkout' && <Checkout />}
            {currentPage === 'admin' && <AdminDashboard />}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}