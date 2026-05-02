import React, { useState, useEffect } from 'react';
import { ShoppingCart, LayoutDashboard, Store as StoreIcon, Home, Package, Plus, Trash2, Send, X, ChevronRight, Menu, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Order {
  id: string;
  items: CartItem[];
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerTelegramId?: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

interface CartItem extends Product {
  quantity: number;
}

// --- Components ---

const Navbar = ({ view, setView, cartCount, isAdminPath }: { view: string, setView: (v: string) => void, cartCount: number, isAdminPath: boolean }) => (
  <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center w-full shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-200">
        <StoreIcon size={20} />
      </div>
      <span className="text-slate-900 font-bold tracking-tight text-xl">متجري الاحترافي</span>
    </div>
    <div className="flex items-center gap-2">
      <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl gap-1">
        <button 
          onClick={() => setView('store')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'store' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Home size={16} />
          <span>المتجر الرئيسي</span>
        </button>
        {isAdminPath && (
          <button 
            onClick={() => setView('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <LayoutDashboard size={16} />
            <span>لوحة التحكم</span>
          </button>
        )}
      </nav>
      
      <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

      <button 
        onClick={() => setView('cart')}
        className={`relative p-2.5 rounded-xl border transition-all ${view === 'cart' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        <ShoppingCart size={20} />
        {cartCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  </nav>
);

export default function App() {
  const [view, setView] = useState('store');
  const [isAdminPath, setIsAdminPath] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    if (window.location.pathname === '/111') {
      setIsAdminPath(true);
      if (adminToken) {
        setView('admin');
      }
    }
  }, []);

  const onLoginSuccess = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
    setView('admin');
  };

  const fetchData = async () => {
    const [pRes, cRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/categories')
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    setProducts(pData);
    setCategories(cData);
  };

  const addToCart = (product: Product) => {
    setCart(curr => {
      const existing = curr.find(item => item.id === product.id);
      if (existing) {
        return curr.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...curr, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(curr => curr.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(curr => curr.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-black font-sans selection:bg-black selection:text-white" dir="rtl">
      <Navbar isAdminPath={isAdminPath} view={view} setView={setView} cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} />
      
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {isAdminPath && !adminToken ? (
            <AdminLoginForm key="login" onSuccess={onLoginSuccess} />
          ) : (
            <>
              {view === 'store' && (
                <motion.div
                  key="store"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* ... rest of the store view ... */}
                  {/* Hero */}
                  <section className="bg-slate-900 text-white p-10 md:p-16 rounded-3xl overflow-hidden relative group border border-slate-800 shadow-2xl">
                    <div className="relative z-10 max-w-2xl space-y-4">
                      <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-widest border border-blue-500/30">جديد الموسم</span>
                      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">اكتشف التكنولوجيا العصرية</h1>
                      <p className="text-slate-400 text-lg leading-relaxed">أفضل المنتجات المختارة بعناية لأجلك. جودة لا تضاهى وتوصيل سريع.</p>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                       <StoreIcon size={300} strokeWidth={1} />
                    </div>
                  </section>

                  {/* Categories */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide bg-white p-3 rounded-2xl border border-slate-200">
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${!selectedCategory ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      جميع الأصناف
                    </button>
                    {categories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products
                      .filter(p => !selectedCategory || p.categoryId === selectedCategory)
                      .map((product) => (
                        <motion.div 
                          layout
                          key={product.id}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="aspect-[1/1] overflow-hidden bg-slate-50 relative border-b border-slate-100">
                            <img 
                              src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60'} 
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-3 right-3">
                               <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-slate-900 border border-slate-200 shadow-sm">{product.price} $</span>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <h3 className="font-bold text-slate-800 line-clamp-1">{product.name}</h3>
                              <p className="text-slate-400 text-xs mt-1 min-h-[2rem] line-clamp-2 leading-relaxed">{product.description}</p>
                            </div>
                            <button 
                              onClick={() => addToCart(product)}
                              className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
                            >
                              <Plus size={14} />
                              إضافة للسلة
                            </button>
                          </div>
                        </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {view === 'admin' && (
                <AdminPanel 
                  adminToken={adminToken} 
                  categories={categories} 
                  products={products} 
                  refresh={fetchData} 
                  logout={() => { 
                    setAdminToken(''); 
                    localStorage.removeItem('adminToken'); 
                    setView('store'); 
                  }} 
                />
              )}
              
              {view === 'cart' && <CartView cart={cart} setCart={setCart} setView={setView} total={total} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />}
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Admin Login Component ---
function AdminLoginForm({ onSuccess }: { onSuccess: (pwd: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.token);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('فشل الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto my-20">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-blue-900/5 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-4">
             <LayoutDashboard size={32} />
          </div>
          <h2 className="text-2xl font-bold">تسجيل دخول الإدارة</h2>
          <p className="text-slate-400 text-sm">أهلاً بك مجدداً، يرجى إدخال بياناتك</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1 uppercase">اسم المستخدم</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1 uppercase">كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// --- Admin Panel Component ---
function AdminPanel({ categories, products, refresh, adminToken, logout }: { categories: Category[], products: Product[], refresh: () => void, adminToken: string, logout: () => void }) {
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, description: '', image: '', categoryId: '' });
  const [newCat, setNewCat] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const adminFetch = async (url: string, options: any = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });
    if (res.status === 401) {
      alert('كلمة مرور خاطئة!');
      logout();
      return null;
    }
    return res;
  };

  const fetchOrders = async () => {
    const res = await adminFetch('/api/admin/orders');
    if (res) {
      const data = await res.json();
      setOrders(data);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const res = await adminFetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res) fetchOrders();
  };


  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    if (res) {
      setNewProduct({ name: '', price: 0, description: '', image: '', categoryId: '' });
      refresh();
    }
  };

  const deleteProduct = async (id: string) => {
    const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res) refresh();
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat })
    });
    if (res) {
      setNewCat('');
      refresh();
    }
  };

  const deleteCategory = async (id: string) => {
    const res = await adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res) refresh();
  };

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            المنتجات والأصناف
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            إدارة الطلبات
          </button>
        </div>
        <button onClick={logout} className="text-xs font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl border border-red-100 transition-colors">خروج من الإدارة</button>
      </div>

      {activeTab === 'products' ? (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-220px)]">
          {/* Sidebar Forms */}
          <div className="w-full md:w-80 space-y-6 overflow-y-auto pr-1">
             {/* ... existing stats ... */}
             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 gap-4">
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">المنتجات</p>
                 <p className="text-xl font-bold text-slate-800">{products.length}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">الأصناف</p>
                 <p className="text-xl font-bold text-blue-600">{categories.length}</p>
               </div>
            </div>
            {/* Form code stays similar ... */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">إضافة منتج جديد</h2>
              <form onSubmit={addProduct} className="space-y-3">
                {/* ... fields ... */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">اسم المنتج</label>
                  <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">السعر ($)</label>
                    <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50/50" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الصنف</label>
                    <select value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50/50 appearance-none" required>
                      <option value="">اختر...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">رابط الصورة</label>
                  <input type="url" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">الوصف</label>
                  <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 outline-none bg-slate-50/50" required></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors">نشر المنتج</button>
              </form>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">إدارة الأصناف</h2>
              <form onSubmit={addCategory} className="flex gap-2">
                <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50/50" placeholder="صنف جديد..." required />
                <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">إضافة</button>
              </form>
              <div className="space-y-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 group">
                    <span className="text-xs font-medium text-slate-600">{cat.name}</span>
                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Table */}
          <div className="flex-1 bg-white border border-slate-200 rounded-cl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="text-sm font-bold text-slate-700">قائمة المنتجات</h3></div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 text-[10px] font-bold tracking-widest uppercase">
                    <th className="px-6 py-4">المنتج</th>
                    <th className="px-6 py-4">الصنف</th>
                    <th className="px-6 py-4">السعر</th>
                    <th className="px-6 py-4 text-left">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img src={p.image} className="w-8 h-8 rounded bg-slate-100 object-cover" referrerPolicy="no-referrer" />
                          <span className="font-bold text-slate-700">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{categories.find(c => c.id === p.categoryId)?.name}</td>
                      <td className="px-6 py-4 font-bold">{p.price} $</td>
                      <td className="px-6 py-4 text-left">
                        <button onClick={() => deleteProduct(p.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
              <h2 className="text-xl font-bold">إدارة الطلبات</h2>
              <p className="text-slate-400 text-xs mt-1">عرض وتتبع طلبات العملاء وتحديث حالاتها</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  const res = await adminFetch('/api/admin/setup-webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: window.location.origin })
                  });
                  const data = await res.json();
                  alert(data.description || (data.ok ? 'تم تفعيل البوت بنجاح!' : 'فشل التفعيل، تأكد من الـ Token'));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-100"
              >
                <Send size={14} />
                تفعيل أزرار البوت
              </button>
              <button onClick={fetchOrders} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><RotateCw size={20} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">رقم الطلب</th>
                  <th className="px-6 py-4">العميل</th>
                  <th className="px-6 py-4">التواصل</th>
                  <th className="px-6 py-4">المجموع</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">تغيير الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">#{order.id.slice(-6)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{order.customerName}</div>
                      <div className="text-[10px] text-slate-400">{order.customerAddress}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">{order.customerPhone}</div>
                      {order.customerTelegramId && <div className="text-[10px] text-blue-500 font-bold">Telegram: {order.customerTelegramId}</div>}
                    </td>
                    <td className="px-6 py-4 font-bold">{order.total} $</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status === 'pending' ? 'قيد الانتظار' :
                         order.status === 'processing' ? 'قيد التنفيذ' :
                         order.status === 'shipped' ? 'تم الشحن' :
                         order.status === 'delivered' ? 'تم التوصيل' : 'ملغي'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="processing">قيد التنفيذ</option>
                        <option value="shipped">تم الشحن</option>
                        <option value="delivered">تم التوصيل</option>
                        <option value="cancelled">إلغاء</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && <div className="p-20 text-center text-slate-400 font-medium italic">لا توجد طلبات للعرض حالياً</div>}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- Cart View Component ---
function CartView({ cart, setView, total, updateQuantity, removeFromCart, setCart }: { cart: CartItem[], setView: (v: string) => void, total: number, updateQuantity: (id: string, d: number) => void, removeFromCart: (id: string) => void, setCart: (c: CartItem[]) => void }) {
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', telegramId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const orderData = {
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerTelegramId: customer.telegramId,
      items: cart,
      total
    };

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      setCart([]);
      setDone(true);
    } catch (err) {
      alert('فشل إرسال الطلب، تأكد من الاتصال بالإنترنت');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
      <div className="w-20 h-20 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
        <Send size={40} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">تم إكمال الطلب!</h2>
        <p className="text-slate-500 max-w-md">تم إرسال تفاصيل طلبك بنجاح. سنقوم بمراجعة طلبك والتواصل معك عبر الهاتف قريباً.</p>
      </div>
      <button onClick={() => setView('store')} className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">العودة للمتجر</button>
    </motion.div>
  );

  return (
    <motion.div
      key="cart"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
          حقيبة التسوق
          <span className="text-slate-300 font-medium bg-slate-100 px-3 py-1 rounded-lg text-sm">{cart.length} منتجات</span>
        </h2>
        {cart.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] border border-slate-200 flex flex-col items-center text-center space-y-6 shadow-sm">
             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
               <ShoppingCart size={32} />
             </div>
             <div className="space-y-1">
               <p className="text-slate-800 font-bold text-lg">حقيبتك فارغة</p>
               <p className="text-slate-400 text-sm">يبدو أنك لم تضف أي منتجات بعد للمتجر.</p>
             </div>
             <button onClick={() => setView('store')} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors">ابدأ التسوق الآن <ChevronRight size={16} className="rotate-180" /></button>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="group bg-white p-4 rounded-2xl border border-slate-200 flex gap-5 items-center hover:border-blue-200 transition-all shadow-sm">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{item.name}</h4>
                  <p className="text-sm font-bold text-blue-600 mt-1">{item.price} $</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-blue-600 transition-colors text-slate-400 font-bold">-</button>
                  <span className="font-bold w-6 text-center text-slate-700">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-blue-600 transition-colors text-slate-400 font-bold">+</button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6 sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 pb-4 border-b border-slate-50">إتمام الطلب</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">المجموع الفرعي</span>
                <span className="font-bold text-slate-700">{total} $</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">التوصيل</span>
                <span className="text-green-600 font-bold">مجاني</span>
              </div>
              <div className="h-[1px] bg-slate-100 my-2"></div>
              <div className="flex justify-between text-2xl font-black text-slate-900">
                <span>الإجمالي</span>
                <span>{total} $</span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
               <div>
                 <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">بيانات المستلم</label>
                 <div className="space-y-3">
                   <input 
                    type="text" 
                    placeholder="الاسم الكامل" 
                    required
                    value={customer.name}
                    onChange={e => setCustomer({...customer, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                   <input 
                    type="tel" 
                    placeholder="رقم الهاتف للتواصل" 
                    required
                    value={customer.phone}
                    onChange={e => setCustomer({...customer, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                   <textarea 
                    placeholder="عنوان التوصيل بالتفصيل..." 
                    required
                    value={customer.address}
                    onChange={e => setCustomer({...customer, address: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none transition-all"
                  />
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                    <p className="text-[11px] font-bold text-blue-600 flex items-center gap-2">
                      <Send size={12} />
                      تفعيل الإشعارات (تليجرام)
                    </p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="أدخل معرف التليجرام (مثال: @username)" 
                        required
                        value={customer.telegramId}
                        onChange={e => {
                          let val = e.target.value;
                          if (val && !val.startsWith('@')) val = '@' + val;
                          setCustomer({...customer, telegramId: val});
                        }}
                        className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono"
                      />
                      <p className="text-[9px] text-slate-400 italic">ملاحظة: يجب أن تكون قد أرسلت رسالة للبوت الخاص بنا أولاً لضمان وصول التنبيهات.</p>
                    </div>
                  </div>
                 </div>
               </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200 border-b-4 border-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري المعالجة...' : (
                  <>
                    تأكيد وإرسال الطلب
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 leading-relaxed">من خلال النقر على "تأكيد الطلب"، فإنك توافق على إرسال بياناتك لصاحب المتجر لمعالجة الطلب.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
