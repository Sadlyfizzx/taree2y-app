import { useMemo, useState } from 'react';
import { BusFront, ChevronRight, Home, Menu, Ticket, User, Wallet as WalletIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCloudAppState } from '../hooks/useCloudAppState';
import { generateTrips, getCancellationPolicy, getLocalDateInputValue } from '../utils/travel';
import { cancelBookingAtomic, createBookingAtomic, holdTripSeats, hydrateTripWithSeats, searchTripInventory } from '../../lib/tripInventory';
import { BottomNavItem, DesktopNavItem } from './ui/AppPrimitives';
import ToastStack from './ToastStack';
import HomeView from '../screens/HomeView';
import SearchResultsView from '../screens/SearchResultsView';
import SeatSelectionView from '../screens/SeatSelectionView';
import CheckoutView from '../screens/CheckoutView';
import InvoiceView from '../screens/InvoiceView';
import TripsView from '../screens/TripsView';
import TicketView from '../screens/TicketView';
import TrackingView from '../screens/TrackingView';
import WalletView from '../screens/WalletView';
import ProfileView from '../screens/ProfileView';
import TopUpFlowModal from '../modals/TopUpFlowModal';
import PointsModal from '../modals/PointsModal';
import CourierModal from '../modals/CourierModal';
import SubscriptionsModal from '../modals/SubscriptionsModal';
import ChatbotModal from '../modals/ChatbotModal';
import FoodOrderModal from '../modals/FoodOrderModal';

export default function UserApp({ userId, profile, isDark, setIsDark }) {
  const todayDate = getLocalDateInputValue();
  const user = useMemo(() => ({ name: profile?.display_name || 'مستخدم', phone: profile?.phone || '' }), [profile]);
  const { wallet, setWallet, transactions, setTransactions, myTrips, setMyTrips, points, setPoints, subscription, setSubscription, backendLoading, refreshCloudState } = useCloudAppState(userId);

  const [activeTab, setActiveTab] = useState('home');
  const [activeView, setActiveView] = useState('main');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchParams, setSearchParams] = useState({ from: '', to: '', date: todayDate, passengers: 1 });
  const [searchResults, setSearchResults] = useState({ trips: [], isDirect: true });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeModal, setActiveModal] = useState(null);

  const showToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const navigateTo = (view, tab = activeTab) => { setActiveView(view); setActiveTab(tab); window.scrollTo(0, 0); };
  const goBack = () => {
    if (activeView === 'invoice') navigateTo('main', 'home');
    else if (activeView === 'checkout') navigateTo('seats');
    else if (activeView === 'seats') navigateTo('search');
    else if (activeView === 'search') navigateTo('main', 'home');
    else if (['ticket', 'tracking'].includes(activeView)) navigateTo('main', 'trips');
    else navigateTo('main', 'home');
  };

  const handleSearch = async (predefinedParams = null) => {
    const params = predefinedParams || searchParams;
    if (!params.from || !params.to || !params.date) return showToast('حدد مكان التحرك والوصول وتاريخ الرحلة الأول 📍', 'error');
    if (params.from === params.to) return showToast('مكان الانطلاق هو هو مكان الوصول!', 'error');
    if (predefinedParams) setSearchParams(params);
    setIsSearching(true);
    navigateTo('search');
    try {
      const results = await searchTripInventory({ from: params.from, to: params.to, date: params.date, passengers: params.passengers });
      setSearchResults(results);
      if (results.source === 'fallback') showToast('شغّلنا البحث الاحتياطي لأن جداول الرحلات لسه ما اتطبقتش بالكامل', 'error');
    } catch (error) {
      console.error('handleSearch error', error);
      setSearchResults(generateTrips(params.from, params.to, params.date));
      showToast('تعذر تحميل الرحلات من السيرفر. رجعنا للوضع التجريبي.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const processDelayedRefund = async (tripToCancel) => {
    if (tripToCancel?.bookingId || tripToCancel?.id) {
      const bookingId = tripToCancel.bookingId || tripToCancel.id;
      setMyTrips((prev) => prev.map((t) => t.id === bookingId ? { ...t, status: 'refund_pending' } : t));
      showToast('جاري الإلغاء ومعالجة طلب الاسترداد ⏳', 'success');
      setTimeout(async () => {
        const result = await cancelBookingAtomic({ bookingId });
        if (!result?.ok) {
          showToast(result?.message || 'تعذر إلغاء الحجز', 'error');
          await refreshCloudState({ silent: true, force: true });
          return;
        }
        showToast(`تم الإلغاء! رجعلك ${result.refundAmount} ج.م للمحفظة 💸`, 'success');
        await refreshCloudState({ silent: true, force: true });
      }, 1200);
      return;
    }

    const policy = getCancellationPolicy(tripToCancel);
    if (!policy.allowed) return showToast(policy.message, 'error');
    const refundAmount = policy.refundAmount;
    setMyTrips((prev) => prev.map((t) => t.pnr === tripToCancel.pnr ? { ...t, status: 'refund_pending' } : t));
    showToast('جاري الإلغاء ومعالجة طلب الاسترداد ⏳', 'success');
    setTimeout(() => {
      setMyTrips((currentTrips) => {
        const exists = currentTrips.find((t) => t.pnr === tripToCancel.pnr);
        if (exists) {
          setWallet((p) => p + refundAmount);
          setTransactions((p) => [{ id: `REF-${Math.random().toString(36).substr(2, 4).toUpperCase()}`, type: 'credit', amount: refundAmount, date: getLocalDateInputValue(), desc: `استرداد تذكرة ${tripToCancel.pnr}` }, ...p]);
          showToast(`تم الإلغاء! رجعلك ${refundAmount} ج.م للمحفظة 💸`, 'success');
          return currentTrips.map((t) => t.pnr === tripToCancel.pnr ? { ...t, status: 'cancelled', pointsAwarded: false } : t);
        }
        return currentTrips;
      });
    }, 1500);
  };

  if (backendLoading) return <div className="flex-1 grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">جاري تحميل بياناتك من السحابة...</div>;

  return (
    <>
      <ToastStack toasts={toasts} />
      <aside className={`hidden md:flex bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col h-full sticky top-0 z-40 shadow-sm transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} cursor-pointer transition-all`} onClick={() => navigateTo('main', 'home')}>
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0"><BusFront className="w-7 h-7" /></div>
          {isSidebarOpen && <div><h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">طريقي</h1><p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold whitespace-nowrap">رحلتك بتبدأ من هنا</p></div>}
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <DesktopNavItem icon={<Home />} label="الرئيسية" active={activeTab === 'home'} onClick={() => navigateTo('main', 'home')} collapsed={!isSidebarOpen} />
          <DesktopNavItem icon={<Ticket />} label="تذاكري" active={activeTab === 'trips'} onClick={() => navigateTo('main', 'trips')} collapsed={!isSidebarOpen} />
          <DesktopNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab === 'wallet'} onClick={() => navigateTo('main', 'wallet')} collapsed={!isSidebarOpen} />
          <DesktopNavItem icon={<User />} label="حسابي" active={activeTab === 'profile'} onClick={() => navigateTo('main', 'profile')} collapsed={!isSidebarOpen} />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col relative h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <header className="md:hidden px-5 pt-10 pb-4 z-10 flex justify-between items-center transition-colors bg-indigo-600 dark:bg-slate-900 text-white border-none shadow-md shrink-0">
          {activeView !== 'main' ? <button onClick={goBack} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition text-white font-bold text-sm"><ChevronRight className="w-5 h-5" /> رجوع</button> : <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white/20 dark:bg-indigo-600/50 rounded-2xl flex items-center justify-center"><BusFront className="w-6 h-6 text-white" /></div><div><h1 className="text-xl font-black tracking-tight text-white">طريقي</h1><p className="text-white/80 text-[10px] font-bold">الـ Super App 🇪🇬</p></div></div>}
          {activeView === 'main' && <div onClick={() => navigateTo('main', 'wallet')} className="bg-white/10 dark:bg-slate-800/50 px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer border border-white/20 hover:bg-white/20 transition" dir="ltr"><WalletIcon className="w-4 h-4 text-emerald-300" /><span className="font-bold text-sm text-white">{wallet} ج</span></div>}
        </header>

        <main className="flex-1 overflow-y-auto relative hide-scrollbar scroll-smooth flex flex-col w-full">
          <div className="w-full mx-auto max-w-[1800px] flex-1 flex flex-col pb-32 md:pb-8 px-0 lg:px-8">
            {activeView === 'main' && activeTab === 'home' && <HomeView searchParams={searchParams} setSearchParams={setSearchParams} onSearch={() => handleSearch()} showToast={showToast} onPromoSearch={handleSearch} openModal={setActiveModal} />}
            {activeView === 'search' && <SearchResultsView searchParams={searchParams} searchResults={searchResults} isSearching={isSearching} onSelectTrip={async (trip) => { try { const hydrated = await hydrateTripWithSeats(trip); setSelectedTrip(hydrated); setSelectedSeats([]); navigateTo('seats'); } catch (error) { console.error('load seats error', error); showToast('تعذر تحميل المقاعد من السيرفر', 'error'); } }} showToast={showToast} />}
            {activeView === 'seats' && selectedTrip && <SeatSelectionView trip={selectedTrip} passengers={searchParams.passengers} selectedSeats={selectedSeats} setSelectedSeats={setSelectedSeats} onConfirm={async () => {
              if (!selectedTrip?.instanceId) return navigateTo('checkout');
              const holdResult = await holdTripSeats({ tripInstanceId: selectedTrip.instanceId, seatNumbers: selectedSeats });
              if (!holdResult?.ok) { showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة', 'error'); try { setSelectedTrip(await hydrateTripWithSeats(selectedTrip)); } catch (_) {} return; }
              setSelectedTrip((prev) => ({ ...prev, holdExpiresAt: holdResult.hold_expires_at || holdResult.holdExpiresAt || null }));
              navigateTo('checkout');
            }} showToast={showToast} />}
            {activeView === 'checkout' && selectedTrip && <CheckoutView trip={selectedTrip} seats={selectedSeats} passengers={searchParams.passengers} wallet={wallet} subscription={subscription} onCreateBooking={async ({ trip, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess }) => {
              if (!trip?.instanceId) return { ok: false, message: 'لازم تطبق migration السيرفر عشان الحجز الحقيقي يشتغل' };
              const result = await createBookingAtomic({ tripInstanceId: trip.instanceId, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess });
              if (result?.ok) await refreshCloudState({ silent: true, force: true });
              return result;
            }} onSuccess={(ticket, invoice) => { setCurrentInvoice(invoice); setViewedTicket(ticket); navigateTo('invoice'); }} showToast={showToast} openModal={setActiveModal} />}
            {activeView === 'invoice' && currentInvoice && <InvoiceView invoice={currentInvoice} onContinue={() => navigateTo('ticket')} />}
            {activeView === 'main' && activeTab === 'trips' && <TripsView trips={myTrips} setMyTrips={setMyTrips} processRefund={processDelayedRefund} onViewTicket={(ticket) => { setViewedTicket(ticket); navigateTo('ticket'); }} showToast={showToast} />}
            {activeView === 'ticket' && viewedTicket && <TicketView ticket={viewedTicket} user={user} onTrack={() => navigateTo('tracking')} showToast={showToast} />}
            {activeView === 'tracking' && viewedTicket && <TrackingView ticket={viewedTicket} showToast={showToast} openModal={setActiveModal} />}
            {activeView === 'main' && activeTab === 'wallet' && <WalletView wallet={wallet} setWallet={setWallet} transactions={transactions} setTransactions={setTransactions} showToast={showToast} openTopUp={() => setActiveModal('topup')} />}
            {activeView === 'main' && activeTab === 'profile' && <ProfileView user={user} points={points} subscription={subscription} isDark={isDark} setIsDark={setIsDark} onLogout={async () => { await supabase.auth.signOut(); }} showToast={showToast} openModal={setActiveModal} />}
          </div>
        </main>

        {activeView === 'main' && <div className="md:hidden fixed bottom-4 w-[calc(100%-32px)] left-4 z-40"><nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl flex justify-around items-center p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]"><BottomNavItem icon={<Home />} label="الرئيسية" active={activeTab === 'home'} onClick={() => navigateTo('main', 'home')} /><BottomNavItem icon={<Ticket />} label="تذاكري" active={activeTab === 'trips'} onClick={() => navigateTo('main', 'trips')} /><BottomNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab === 'wallet'} onClick={() => navigateTo('main', 'wallet')} /><BottomNavItem icon={<User />} label="حسابي" active={activeTab === 'profile'} onClick={() => navigateTo('main', 'profile')} /></nav></div>}
      </div>

      {activeModal === 'courier' && <CourierModal closeModal={() => setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} showToast={showToast} />}
      {activeModal === 'bot' && <ChatbotModal closeModal={() => setActiveModal(null)} user={user} />}
      {activeModal === 'subs' && <SubscriptionsModal closeModal={() => setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} subscription={subscription} setSubscription={setSubscription} showToast={showToast} />}
      {activeModal === 'food' && <FoodOrderModal closeModal={() => setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} showToast={showToast} />}
      {activeModal === 'points' && <PointsModal closeModal={() => setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} points={points} setPoints={setPoints} showToast={showToast} />}
      {activeModal === 'topup' && <TopUpFlowModal closeModal={() => setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} showToast={showToast} />}
    </>
  );
}
