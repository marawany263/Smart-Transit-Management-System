import { centers, centerName, demoAccounts, seedData } from './data.js';
import { loadData, loadUser, resetData, saveData, saveUser } from './store.js';
import './styles.css';
import './driver-apply.css';
import './complaint-track.css';
import './mawqifi-theme.css';

let data = loadData();
let user = loadUser();
let lang = 'ar';
let page = user ? 'dashboard' : 'home';
let routeFilter = { from: '', to: '' };
let complaintFilter = '';
let chartPeriod = 'week';
let searchTerm = '';
let toastTimer;

const app = document.querySelector('#app');
const roles = {
  get passenger() { return t('راكب', 'Passenger'); },
  get driver() { return t('سائق', 'Driver'); },
  get admin() { return t('مدير محطة', 'Station Admin'); },
  get super() { return t('مدير عام', 'Super Admin'); }
};
const navItems = {
  passenger: [['dashboard', '⌂', 'نظرة عامة'], ['search', '⌕', 'ابحث عن رحلة'], ['ratings', '★', 'تقييماتي'], ['complaints', '◉', 'شكاوى ومتابعة'], ['notifications', '♧', 'الإشعارات']],
  driver: [['dashboard', '⌂', 'نظرة عامة'], ['search', '⌕', 'الخطوط المتاحة'], ['notifications', '♧', 'الإشعارات']],
  admin: [['dashboard', '⌂', 'لوحة المحطة'], ['vehicles', '▣', 'المركبات'], ['routes', '↗', 'الخطوط'], ['applications', '♙', 'طلبات السائقين'], ['complaints', '◉', 'الشكاوى'], ['ratings', '★', 'التقييمات'], ['notifications', '♧', 'الإشعارات']],
  super: [['dashboard', '⌂', 'لوحة النظام'], ['vehicles', '▣', 'المركبات'], ['routes', '↗', 'إدارة الخطوط'], ['applications', '♙', 'طلبات السائقين'], ['complaints', '◉', 'الشكاوى'], ['ratings', '★', 'التقييمات'], ['notifications', '♧', 'الإشعارات']]
};

const t = (ar, en) => lang === 'ar' ? ar : en;
const currentUserName = () => user?.guest ? t('راكب زائر', 'Guest passenger') : user?.name || '';
const ownsPassengerRecord = record => record.passengerId
  ? record.passengerId === (user.id || user.name)
  : record.passenger === user.name;
const vehicleTypeLabel = type => t(
  ({ 'ميكروباص': 'ميكروباص', 'أتوبيس': 'أتوبيس', 'سيارة أجرة': 'سيارة أجرة' })[type] || type,
  ({ 'ميكروباص': 'Minibus', 'أتوبيس': 'Bus', 'سيارة أجرة': 'Taxi' })[type] || type
);
const complaintCategoryLabel = category => t(
  ({ 'تأخر الرحلة': 'تأخر الرحلة', 'سلوك السائق': 'سلوك السائق', 'نظافة المركبة': 'نظافة المركبة', 'الأجرة': 'الأجرة', 'أخرى': 'أخرى' })[category] || category,
  ({ 'تأخر الرحلة': 'Trip delay', 'سلوك السائق': 'Driver conduct', 'نظافة المركبة': 'Vehicle cleanliness', 'الأجرة': 'Fare', 'أخرى': 'Other' })[category] || category
);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const uuid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const persist = () => { saveData(data); render(); };
const routeById = id => data.routes.find(route => route.id === id);
const isStationAdmin = () => user?.role === 'admin';
const routesInScope = () => data.routes.filter(route => !isStationAdmin() || route.from === 'bani-suef');
const routeIdsInScope = () => new Set(routesInScope().map(route => route.id));
const vehiclesInScope = () => {
  const routeIds = routeIdsInScope();
  return data.vehicles.filter(vehicle => routeIds.has(vehicle.routeId));
};
const driversInScope = () => data.drivers.filter(driver => !isStationAdmin() || driver.center === 'bani-suef');
const ratingsInScope = () => {
  const routeIds = routeIdsInScope();
  return data.ratings.filter(rating => routeIds.has(rating.routeId));
};
const complaintsInScope = () => {
  const routeIds = routeIdsInScope();
  return data.complaints.filter(complaint => routeIds.has(complaint.routeId));
};
const routeLabel = route => route ? `${centerName(route.from, lang)} – ${centerName(route.to, lang)}` : 'خط غير محدد';
const statusLabel = status => ({
  available: t('متاحة', 'Available'), busy: t('في الخدمة', 'In service'), maintenance: t('صيانة', 'Maintenance'),
  active: t('نشط', 'Active'), pending: t('قيد المراجعة', 'Pending'), approved: t('مقبول', 'Approved'),
  rejected: t('مرفوض', 'Rejected'), new: t('جديدة', 'New'), in_progress: t('قيد المعالجة', 'In progress'), resolved: t('تم الحل', 'Resolved')
}[status] || status);
const localDateTimeValue = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const dateTimeLabel = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};
const durationLabel = milliseconds => {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const number = value => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumIntegerDigits: 2 }).format(value);
  return `${number(hours)}:${number(minutes)}:${number(seconds)}`;
};

function updateVehicleTimers() {
  document.querySelectorAll('[data-vehicle-timer]').forEach(timer => {
    const departedAt = Date.parse(timer.dataset.departedAt);
    const returnBy = Date.parse(timer.dataset.returnBy);
    if (!Number.isFinite(departedAt) || !Number.isFinite(returnBy)) return;
    const remaining = returnBy - Date.now();
    timer.classList.toggle('overdue', remaining <= 0);
    timer.querySelector('.vehicle-elapsed').textContent = durationLabel(Date.now() - departedAt);
    timer.querySelector('.vehicle-remaining').textContent = durationLabel(Math.abs(remaining));
    timer.querySelector('.vehicle-countdown-label').textContent = remaining <= 0
      ? t('متأخر', 'Overdue')
      : t('متبقي', 'Remaining');
  });
}
const pill = status => `<span class="pill ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;
const icon = (name, cls = '') => `<span class="icon ${cls}" aria-hidden="true">${name}</span>`;

function persistOnly() {
  saveData(data);
}

function showToast(message, type = 'success') {
  const host = document.querySelector('#toast');
  if (!host) return;
  host.innerHTML = `<span class="toast-mark">${type === 'error' ? '!' : '✓'}</span>${escapeHtml(message)}`;
  host.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { host.className = 'toast'; }, 3200);
}

window.addEventListener('storage-error', event => showToast(event.detail, 'error'));

function render() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  app.innerHTML = user ? renderShell() : renderPublic();
  bindEvents();
  updateVehicleTimers();
}

function renderPublic() {
  return `<div class="public-shell">
    <header class="public-nav">
      <a class="brand" href="#" data-action="home"><span class="brand-mark">م</span><span>${t('موقفي', 'Mawqifi')}<small>${t('رحلتك أقرب', 'Your city, within reach')}</small></span></a>
      <nav><a href="#problem">${t('التحدي والحل', 'Challenge & solution')}</a><a href="#features">${t('مميزاتنا', 'Features')}</a><a href="#impact">${t('الأثر', 'Our impact')}</a></nav>
      <div class="nav-actions"><button class="text-button" data-action="language">${lang === 'ar' ? 'EN' : 'عربي'}</button><button class="button button-dark" data-action="login">${t('دخول العرض التجريبي', 'Enter demo')} ${icon('←')}</button></div>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy"><span class="eyebrow"><span class="live-dot"></span>${t('منصة نقل محلية متكاملة', 'A connected local transit platform')}</span>
          <h1>${t('رحلتك في بني سويف،<br>أصبحت <em>أوضح.</em>', 'Your Beni Suef journey,<br>made <em>clearer.</em>')}</h1>
          <p>${t('نربط الركاب بالسائقين والمواقف في مكان واحد. اعرف مواعيدك، خط سيرك، وتوفر المركبات — قبل ما تتحرك.', 'One connected place for passengers, drivers, and stations. Check routes, fares, and available vehicles before you go.')}</p>
          <div class="hero-actions"><button class="button button-primary" data-action="guest-passenger">${t('ادخل كراكب بدون حساب', 'Explore as passenger — no account')} ${icon('←')}</button><a class="button button-outline" href="#problem">${t('اكتشف كيف يعمل', 'See how it works')} <span>↓</span></a></div>
          <div class="hero-proof"><div class="avatar-stack"><span>م</span><span>ع</span><span>س</span><span>ي</span></div><span>${t('مصمم لأهالي ٧ مراكز في بني سويف', 'Built for all 7 Beni Suef centers')}</span><button class="driver-apply-inline" data-action="driver-form">${t('سائق؟ قدّم طلب التسجيل', 'Driver? Apply to join')} ↗</button></div>
        </div>
        <div class="hero-visual"><div class="map-card">
          <div class="map-top"><span><span class="live-dot"></span>${t('حركة النقل اليوم', 'Today’s transit')}</span><span class="map-time">● ${t('مباشر تجريبي', 'Demo live')}</span></div>
          <div class="map-art"><div class="map-grid"></div><svg viewBox="0 0 520 360" role="img" aria-label="خريطة توضيحية لخطوط النقل">
            <path class="route-line route-one" d="M66 281 C107 239 138 245 168 196 S218 137 267 155 S320 212 354 160 S421 105 458 70"/>
            <path class="route-line route-two" d="M66 281 C130 301 161 267 196 252 S266 277 317 259 S397 222 458 240"/>
            <path class="route-line route-three" d="M168 196 C151 143 163 97 205 68 S298 65 328 102 S401 111 458 70"/>
            <g class="map-point" transform="translate(66 281)"><circle r="8"/><text y="25">بني سويف</text></g><g class="map-point" transform="translate(168 196)"><circle r="6"/><text y="23">ناصر</text></g><g class="map-point" transform="translate(267 155)"><circle r="6"/><text y="-14">ببا</text></g><g class="map-point" transform="translate(354 160)"><circle r="6"/><text y="24">إهناسيا</text></g><g class="map-point" transform="translate(458 70)"><circle r="7"/><text y="-14">الواسطى</text></g><g class="map-point" transform="translate(458 240)"><circle r="6"/><text y="24">الفشن</text></g><g class="map-point" transform="translate(205 68)"><circle r="6"/><text y="-14">سمسطا</text></g>
            <circle class="vehicle-pin" cx="252" cy="148" r="13"/><text class="vehicle-symbol" x="252" y="152">↗</text></svg>
            <div class="map-floating"><span class="bus-icon">▰</span><div><strong>بني سويف ← ببا</strong><small>${t('متاح الآن · ٤ دقائق', 'Available · 4 min away')}</small></div><b>١٤ <small>${t('مقعد', 'seats')}</small></b></div></div>
          <div class="map-legend"><span><i class="legend-dot green"></i>${t('متاحة الآن', 'Available now')}</span><span><i class="legend-dot amber"></i>${t('خطوط نشطة', 'Active routes')}</span><span><i class="legend-dot gray"></i>${t('مواقف رئيسية', 'Main stations')}</span></div>
        </div><div class="floating-stat"><span class="stat-icon">↗</span><span><strong>٨</strong><small>${t('خطوط نشطة', 'active routes')}</small></span><i>+١٢٪</i></div></div>
        <div class="hero-bottom-note"><span>↓</span>${t('معاً نحو تنقل أكثر راحة وموثوقية', 'Together, toward more comfortable and reliable journeys')}</div>
      </section>
      <section class="stats-strip"><div><strong>٧</strong><span>${t('مراكز إدارية', 'administrative centers')}</span></div><div><strong>٨+</strong><span>${t('خطوط نقل محلية', 'local transit routes')}</span></div><div><strong>١٤</strong><span>${t('مقعداً في الميكروباص', 'seats per minibus')}</span></div><div><strong>١٠٠٪</strong><span>${t('بيانات محلية تجريبية', 'local demo data')}</span></div></section>
      <section class="section problem-section" id="problem"><div class="section-intro"><span class="eyebrow">${t('لماذا موقفي؟', 'WHY MAWQIFI')}</span><h2>${t('من الموقف إلى وجهتك،<br>كل خطوة <em>محسوبة.</em>', 'From the station to your destination,<br>every step <em>informed.</em>')}</h2><p>${t('التنقل اليومي مش لازم يكون رحلة في المجهول. «موقفي» تحول المعلومات المتفرقة إلى تجربة منظمة — للراكب والسائق ومدير المحطة.', 'Daily travel should not be a guessing game. Mawqifi turns scattered information into a connected experience for passengers, drivers, and station managers.')}</p></div>
        <div class="benefit-grid"><article class="benefit-card"><span class="benefit-number">01</span><span class="benefit-icon">⌕</span><h3>${t('اعرف قبل ما تتحرك', 'Know before you go')}</h3><p>${t('ابحث عن خطك، شوف المواقف على الطريق، واعرف الأجرة والمدة المتوقعة.', 'Find your route, see its stops, and check estimated fares and travel time.')}</p><a href="#" data-action="login">${t('اكتشف رحلة', 'Explore a journey')} ↗</a></article><article class="benefit-card featured"><span class="benefit-number">02</span><span class="benefit-icon">▧</span><h3>${t('معلومة موثوقة ومحدثة', 'Reliable, current information')}</h3><p>${t('حالة المركبات ومواعيد الرحلات واضحة، والإشعارات توصلك بكل جديد.', 'Vehicle availability, departure schedules, and service updates in one place.')}</p><a href="#" data-action="login">${t('شاهد لوحة المتابعة', 'View the dashboard')} ↗</a></article><article class="benefit-card"><span class="benefit-number">03</span><span class="benefit-icon">♡</span><h3>${t('صوتك يطور الخدمة', 'Your feedback improves service')}</h3><p>${t('قيّم رحلتك أو تابع شكواك بكل شفافية — لأن رأيك يفرق.', 'Rate your trip or track a complaint transparently. Your voice matters.')}</p><a href="#" data-action="login">${t('شاركنا رأيك', 'Share feedback')} ↗</a></article></div>
      </section>
      <section class="section impact-section" id="impact"><div class="impact-copy"><span class="eyebrow">${t('أثر ملموس للجميع', 'A BETTER JOURNEY FOR EVERYONE')}</span><h2>${t('نظام واحد،<br><em>تجربة أفضل.</em>', 'One system.<br><em>A better journey.</em>')}</h2><p>${t('«موقفي» مش مجرد تطبيق للبحث عن رحلة؛ هي أداة تساعد شبكة النقل المحلية على العمل بشكل أفضل، كل يوم.', 'Mawqifi is more than a trip finder. It helps the local transit network work better, every day.')}</p><div class="impact-list"><div><span>↗</span><p><strong>${t('للركاب', 'For passengers')}</strong><small>${t('رحلات واضحة، أجرة معروفة، وملاحظات مسموعة.', 'Clear journeys, known fares, and feedback that is heard.')}</small></p></div><div><span>◫</span><p><strong>${t('للسائقين', 'For drivers')}</strong><small>${t('تسجيل منظم، خطوط محددة، ووصول أفضل للركاب.', 'Structured onboarding, defined routes, more passenger visibility.')}</small></p></div><div><span>◉</span><p><strong>${t('للمسؤولين', 'For administrators')}</strong><small>${t('إدارة أسهل، مؤشرات لحظية، وقرارات مبنية على بيانات.', 'Simpler operations, useful metrics, and informed decisions.')}</small></p></div></div><button class="button button-primary" data-action="login">${t('استكشف لوحة التحكم', 'Explore the dashboards')} ${icon('←')}</button></div><div class="preview-card"><div class="preview-head"><div><strong>${t('ملخص النظام', 'System overview')}</strong><small>${t('مؤشرات النقل — بني سويف', 'Transit metrics — Beni Suef')}</small></div><span class="preview-badge">● ${t('هذا الأسبوع', 'This week')}</span></div><div class="preview-stat-row"><div><span>${t('رحلة مكتملة', 'completed trips')}</span><b>١,٢٨٤</b><small>↗ ١٢.٨٪</small></div><div><span>${t('رضا الركاب', 'passenger satisfaction')}</span><b>٩٢٪</b><small>↗ ٤.٢٪</small></div></div><div class="chart-label">${t('حركة الرحلات خلال الأسبوع', 'Trips throughout the week')}</div><div class="mini-chart"><div class="chart-y-labels"><span>٢٠٠</span><span>١٠٠</span><span>٠</span></div><div class="chart-area"><svg viewBox="0 0 500 135" preserveAspectRatio="none" aria-label="رسم بياني توضيحي للرحلات"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7045ff" stop-opacity=".24"/><stop offset="1" stop-color="#7045ff" stop-opacity="0"/></linearGradient></defs><path class="chart-fill" d="M0,96 C35,88 42,106 78,83 S120,95 145,72 S188,82 220,50 S265,70 290,45 S333,52 360,30 S408,45 435,18 S470,40 500,8 L500,135 L0,135Z"/><path class="chart-stroke" d="M0,96 C35,88 42,106 78,83 S120,95 145,72 S188,82 220,50 S265,70 290,45 S333,52 360,30 S408,45 435,18 S470,40 500,8"/></svg><div class="chart-x-labels"><span>${t('السبت', 'Sat')}</span><span>${t('الأحد', 'Sun')}</span><span>${t('الاثنين', 'Mon')}</span><span>${t('الثلاثاء', 'Tue')}</span><span>${t('الأربعاء', 'Wed')}</span><span>${t('الخميس', 'Thu')}</span><span>${t('الجمعة', 'Fri')}</span></div></div></div><div class="preview-foot"><span>● ${t('الخط الأكثر استخداماً', 'Most-used route')}</span><strong>${t('بني سويف – ببا', 'Beni Suef – Beba')} <small>↗ ١٨٪</small></strong></div></div></section>
      <section class="cta-band" id="features"><div><span class="eyebrow">${t('جاهز لتجربة «موقفي»؟', 'READY TO TRY MAWQIFI?')}</span><h2>${t('ادخل العرض، واستكشف كل الأدوار.', 'Step into the demo. Explore every role.')}</h2><p>${t('بيانات تجريبية محلية — لا حسابات حقيقية ولا مفاتيح API.', 'Local demo data — no real accounts and no API keys.')}</p></div><button class="button button-light" data-action="login">${t('ابدأ العرض التوضيحي', 'Start the demo')} ${icon('←')}</button></section>
    </main><footer class="public-footer"><a class="brand" href="#" data-action="home"><span class="brand-mark">م</span><span>${t('موقفي', 'Mawqifi')}<small>${t('رحلتك أقرب', 'Your city, within reach')}</small></span></a><span>${t('عرض تقني توضيحي · بني سويف، مصر', 'Technology demo · Beni Suef, Egypt')}</span><span>© 2026 Mawqifi</span></footer>
    <div id="toast" class="toast" role="status" aria-live="polite"></div></div>`;
}

function renderShell() {
  const account = demoAccounts.find(item => item.role === user.role);
  const active = page === 'dashboard' && user.role === 'passenger' ? 'search' : page;
  const nav = navItems[user.role] || navItems.passenger;
  const unread = data.notifications.filter(item => !item.read).length;
  return `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" data-action="dashboard"><span class="brand-mark">م</span><span>${t('موقفي', 'Mawqifi')}<small>${t('النقل المحلي بذكاء', 'Local transit, reimagined')}</small></span></a><div class="demo-ribbon">${icon('◉')} ${t('بيئة عرض توضيحي', 'DEMO ENVIRONMENT')}</div><div class="side-section-label">${t('القائمة الرئيسية', 'WORKSPACE')}</div><nav class="side-nav">${nav.map(([key, glyph, label]) => `<button class="side-link ${active === key ? 'active' : ''}" data-page="${key}"><span class="side-glyph">${glyph}</span><span>${escapeHtml(t(label, ({ 'نظرة عامة': 'Overview', 'ابحث عن رحلة': 'Find a trip', 'تقييماتي': 'Ratings', 'شكاوى ومتابعة': 'Complaints', 'الإشعارات': 'Notifications', 'الخطوط المتاحة': 'Available routes', 'لوحة المحطة': 'Station dashboard', 'المركبات': 'Vehicles', 'الخطوط': 'Routes', 'إدارة الخطوط': 'Routes', 'طلبات السائقين': 'Driver applications', 'الشكاوى': 'Complaints', 'التقييمات': 'Ratings', 'لوحة النظام': 'System dashboard' })[label] || label))}</span>${key === 'notifications' && unread ? `<i>${unread}</i>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><button class="side-link" data-action="home"><span class="side-glyph">⌂</span><span>${t('الصفحة الرئيسية', 'Home page')}</span></button><button class="side-link" data-action="reset"><span class="side-glyph">↻</span><span>${t('إعادة ضبط بيانات العرض', 'Reset demo data')}</span></button><div class="sidebar-caption">${t('بيانات العرض محفوظة محلياً في هذا المتصفح.', 'Demo data is stored locally in this browser.')}</div></div></aside>
    <div class="workspace"><header class="topbar"><div class="breadcrumbs"><span>${t('نظام إدارة النقل', 'Transit management')}</span><b>/</b><strong>${escapeHtml(pageTitle())}</strong></div><div class="topbar-actions"><span class="demo-chip"><i></i>${t('وضع العرض', 'DEMO MODE')}</span><button class="icon-button language-button" data-action="language" aria-label="Change language">${lang === 'ar' ? 'EN' : 'عربي'}</button><button class="icon-button notification-button" data-page="notifications" aria-label="Notifications">♧${unread ? `<i>${unread}</i>` : ''}</button><span class="topbar-divider"></span><button class="profile-button" data-action="profile"><span class="profile-avatar">${escapeHtml(currentUserName().slice(0, 1) || 'خ')}</span><span><strong>${escapeHtml(currentUserName())}</strong><small>${roles[user.role]}</small></span><span class="chevron">⌄</span></button><button class="icon-button logout-button" data-action="logout" title="${t('تسجيل الخروج', 'Log out')}">↪</button></div></header>
    <main class="content">${renderPage(account)}</main></div><div id="toast" class="toast" role="status" aria-live="polite"></div></div>`;
}

function pageTitle() {
  const titles = { dashboard: t('نظرة عامة', 'Overview'), search: t('البحث عن رحلة', 'Find a trip'), vehicles: t('إدارة المركبات', 'Vehicle management'), routes: t('إدارة الخطوط', 'Route management'), applications: t('طلبات السائقين', 'Driver applications'), ratings: t('تقييمات الركاب', 'Passenger ratings'), complaints: t('الشكاوى والمتابعة', 'Complaints & tracking'), notifications: t('الإشعارات', 'Notifications') };
  return titles[page] || titles.dashboard;
}

function renderPage(account) {
  if (page === 'home') return renderPublic();
  switch (page) {
    case 'dashboard': return user.role === 'passenger' ? renderSearch() : user.role === 'driver' ? renderDriverDashboard() : renderAdminDashboard();
    case 'search': return renderSearch();
    case 'vehicles': return renderVehicles();
    case 'routes': return renderRoutes();
    case 'applications': return renderApplications();
    case 'ratings': return renderRatings();
    case 'complaints': return renderComplaints();
    case 'notifications': return renderNotifications();
    default: return renderAdminDashboard();
  }
}

function pageHeading(kicker, title, description, actions = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(kicker)}</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}

function metricCard(glyph, label, value, note, color = 'green') {
  return `<article class="metric-card"><div class="metric-top"><span class="metric-icon ${color}">${glyph}</span><span class="metric-note">${note}</span></div><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong></article>`;
}

function renderAdminDashboard() {
  const isSuper = user.role === 'super';
  const scopedVehicles = vehiclesInScope();
  const scopedDrivers = driversInScope();
  const scopedRatings = ratingsInScope();
  const scopedComplaints = complaintsInScope();
  const scopedRoutes = routesInScope();
  const activeVehicles = scopedVehicles.filter(vehicle => vehicle.status !== 'maintenance').length;
  const pending = scopedDrivers.filter(driver => driver.status === 'pending').length;
  const openComplaints = scopedComplaints.filter(item => item.status !== 'resolved').length;
  const average = scopedRatings.length ? (scopedRatings.reduce((sum, item) => sum + item.stars, 0) / scopedRatings.length).toFixed(1) : '—';
  const passengerCount = isSuper ? '٢٬٤٨٦' : '٨٦٤';
  const chartData = chartPeriod === 'week'
    ? {
        axis: lang === 'ar' ? ['٢٠٠', '١٥٠', '١٠٠', '٥٠', '٠'] : ['200', '150', '100', '50', '0'],
        labels: lang === 'ar' ? ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        current: [56, 79, 65, 94, 70, 87, 48],
        previous: [32, 45, 37, 54, 40, 50, 27]
      }
    : {
        axis: lang === 'ar' ? ['١٬٠٠٠', '٧٥٠', '٥٠٠', '٢٥٠', '٠'] : ['1,000', '750', '500', '250', '0'],
        labels: lang === 'ar' ? ['الأسبوع ١', 'الأسبوع ٢', 'الأسبوع ٣', 'الأسبوع ٤'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        current: [62, 71, 68, 85],
        previous: [52, 58, 60, 70]
      };
  const routeRatings = scopedRoutes.slice(0, 5).map((route, index) => {
    const rating = scopedRatings.filter(item => item.routeId === route.id);
    return `<div class="route-rating"><span class="rank">${String(index + 1).padStart(2, '0')}</span><span class="rating-route"><strong>${escapeHtml(routeLabel(route))}</strong><small>${escapeHtml(route.fromPlace)} ← ${escapeHtml(route.toPlace)}</small></span><span class="rating-bar"><i style="width:${[88, 76, 68, 61, 48][index]}%"></i></span><strong>${rating.length ? (rating.reduce((sum, item) => sum + item.stars, 0) / rating.length).toFixed(1) : ['4.8', '4.6', '4.3', '4.5', '4.1'][index]}</strong><span class="star">★</span></div>`;
  }).join('');
  const complaintRows = scopedComplaints.slice(0, 3).map(complaint => `<tr><td><strong class="id-cell">${escapeHtml(complaint.id)}</strong></td><td>${escapeHtml(complaint.passenger)}</td><td>${escapeHtml(complaintCategoryLabel(complaint.category))}</td><td>${pill(complaint.status)}</td><td>${escapeHtml(complaint.date)}</td><td><button class="table-link" data-page="complaints">${t('عرض', 'View')} ↗</button></td></tr>`).join('');
  return `<div class="dashboard-wrap">${pageHeading(t(isSuper ? 'لوحة النظام · بني سويف' : 'لوحة إدارة المحطة', isSuper ? 'SYSTEM OVERVIEW' : 'STATION OVERVIEW'), t(isSuper ? 'النقل يتحرك. وأنت ترى الصورة كاملة.' : 'صباح الخير، مدير المحطة', isSuper ? 'The whole network, at a glance.' : 'Good morning, station manager.'), t('إليك ملخص أداء النقل المحلي لهذا اليوم.', 'Here’s your local transit network at a glance.'), `<span class="date-badge">◷ ${t('الأحد، ١٥ نوفمبر ٢٠٢٦', 'Sunday, November 15, 2026')}</span><button class="button button-dark" data-page="vehicles">＋ ${t('إضافة مركبة', 'Add vehicle')}</button>`)}
    <div class="metric-grid">${metricCard('↗', t('الرحلات اليوم', 'Trips today'), isSuper ? '١٬٢٨٤' : '٣٢٦', `<span class="trend">↗ ${isSuper ? '١٢.٨٪' : '٩.٤٪'}</span> ${t('عن الأسبوع الماضي', 'vs last week')}`)}${metricCard('▣', t('مركبات في الخدمة', 'Vehicles in service'), `${activeVehicles} / ${scopedVehicles.length}`, `<span class="positive-trend">${t('تعمل الآن', 'operating now')}</span>`, 'blue')}${metricCard('♙', t('ركاب مسجلون', 'Registered passengers'), passengerCount, `<span class="trend">↗ ${isSuper ? '٨.٣٪' : '٦.١٪'}</span> ${t('هذا الشهر', 'this month')}`, 'purple')}${metricCard('★', t('متوسط التقييم', 'Average rating'), `${average} <small>/ ٥</small>`, `${scopedRatings.length} ${t('تقييمات الركاب', 'passenger reviews')}`, 'amber')}</div>
    <div class="dashboard-panels"><section class="panel activity-panel"><div class="panel-heading"><div><h2>${t('حركة الرحلات', 'Trip activity')}</h2><p>${t(chartPeriod === 'week' ? 'عدد الرحلات على مدار الأسبوع' : 'عدد الرحلات على مدار الشهر', chartPeriod === 'week' ? 'Trips throughout the week' : 'Trips throughout the month')}</p></div><button class="select-button" data-action="period">${t(chartPeriod === 'week' ? 'هذا الأسبوع' : 'هذا الشهر', chartPeriod === 'week' ? 'This week' : 'This month')} ⌄</button></div><div class="bar-chart"><div class="chart-axis">${chartData.axis.map(value => `<span>${value}</span>`).join('')}</div><div class="bar-area"><div class="bar-gridlines"><i></i><i></i><i></i><i></i><i></i></div>${chartData.labels.map((label, index) => `<div class="bar-column"><div class="bar-pair"><i class="bar-prev" style="height:${chartData.previous[index]}%"></i><i class="bar-current ${index === chartData.current.length - 1 ? 'highlight' : ''}" style="height:${chartData.current[index]}%"></i></div><span>${label}</span></div>`).join('')}</div></div><div class="chart-legend"><span><i class="legend-square current"></i>${t(chartPeriod === 'week' ? 'هذا الأسبوع' : 'هذا الشهر', chartPeriod === 'week' ? 'This week' : 'This month')}</span><span><i class="legend-square previous"></i>${t(chartPeriod === 'week' ? 'الأسبوع الماضي' : 'الشهر الماضي', chartPeriod === 'week' ? 'Last week' : 'Last month')}</span></div></section>
      <section class="panel centers-panel"><div class="panel-heading"><div><h2>${t(isSuper ? 'تغطية المراكز' : 'تغطية المحطة', isSuper ? 'Center coverage' : 'Station coverage')}</h2><p>${t(isSuper ? 'المراكز الإدارية السبعة' : 'موقف محيي الدين · بني سويف', isSuper ? 'All seven administrative centers' : 'Mohiuddin station · Beni Suef')}</p></div><span class="coverage-count">${isSuper ? `٧ ${t('مراكز', 'centers')}` : t('محطة واحدة', '1 station')}</span></div><div class="centers-list">${(isSuper ? centers : centers.filter(center => center.id === 'bani-suef')).map((center, index) => { const routeCount = scopedRoutes.filter(route => route.from === center.id).length; return `<div class="center-row"><span class="center-pin">${index + 1}</span><span>${center[lang]}</span><span class="center-progress"><i style="width:${isSuper ? [92, 75, 58, 64, 82, 49, 56][index] : 100}%"></i></span><strong>${routeCount} <small>${t('خط', 'routes')}</small></strong></div>`; }).join('')}</div><div class="panel-footnote"><span class="live-dot"></span>${t(isSuper ? 'كل المراكز السبعة ممثلة في بيانات العرض' : 'هذه اللوحة تعرض بيانات موقف محيي الدين فقط', isSuper ? 'All seven centers are included in this demo' : 'This dashboard is scoped to Mohiuddin station')}</div></section></div>
    <div class="dashboard-panels lower-panels"><section class="panel ratings-panel"><div class="panel-heading"><div><h2>${t('الخطوط الأكثر تقييماً', 'Top-rated routes')}</h2><p>${t('رضا الركاب حسب الخط', 'Passenger satisfaction by route')}</p></div><button class="table-link" data-page="ratings">${t('كل التقييمات', 'All ratings')} ↗</button></div><div class="route-ratings">${routeRatings}</div></section>
    <section class="panel quick-panel"><div class="panel-heading"><div><h2>${t('تحتاج متابعة', 'Needs attention')}</h2><p>${t('مهام تستدعي اتخاذ إجراء', 'Items that need a response')}</p></div><span class="alert-badge">${pending + openComplaints}</span></div><button class="attention-row" data-page="applications"><span class="attention-icon amber">♙</span><span><strong>${t('طلبات السائقين', 'Driver applications')}</strong><small>${pending} ${t('طلبات تنتظر المراجعة', 'applications awaiting review')}</small></span><b>›</b></button><button class="attention-row" data-page="complaints"><span class="attention-icon red">◉</span><span><strong>${t('شكاوى الركاب', 'Passenger complaints')}</strong><small>${openComplaints} ${t('شكاوى مفتوحة', 'open complaints')}</small></span><b>›</b></button><button class="attention-row" data-page="vehicles"><span class="attention-icon blue">▣</span><span><strong>${t('مركبات الصيانة', 'Vehicles in maintenance')}</strong><small>${data.vehicles.filter(vehicle => vehicle.status === 'maintenance').length} ${t('مركبات خارج الخدمة', 'vehicles out of service')}</small></span><b>›</b></button></section></div>
    <section class="panel table-panel"><div class="panel-heading"><div><h2>${t('آخر الشكاوى', 'Recent complaints')}</h2><p>${t('تابع ملاحظات الركاب على مستوى المحطة', 'Follow passenger feedback at your station')}</p></div><button class="button button-soft" data-page="complaints">${t('عرض كل الشكاوى', 'All complaints')} ↗</button></div><div class="table-wrap"><table><thead><tr><th>${t('رقم الشكوى', 'COMPLAINT')}</th><th>${t('الراكب', 'PASSENGER')}</th><th>${t('التصنيف', 'CATEGORY')}</th><th>${t('الحالة', 'STATUS')}</th><th>${t('التاريخ', 'DATE')}</th><th></th></tr></thead><tbody>${complaintRows || emptyRow(6)}</tbody></table></div></section><div class="demo-disclaimer">${icon('ℹ')} ${t('هذه بيانات تجريبية للعرض فقط. لا تعكس حركة نقل حقيقية أو معلومات آنية.', 'DEMO DATA ONLY. This information does not represent live transit operations.')}</div></div>`;
}

function renderDriverDashboard() {
  const driver = data.drivers.find(item => item.name.includes(user.name)) || data.drivers.find(item => item.status === 'approved');
  const route = data.routes.find(item => item.from === driver?.center) || data.routes[0];
  return `<div class="dashboard-wrap">${pageHeading(t('مساحة السائق', 'DRIVER SPACE'), `${t('أهلاً بك،', 'Welcome,')} ${escapeHtml(user.name)}`, t('إليك ملخص الخطوط والخدمة في منطقتك.', 'Your routes and service overview.'), `<button class="button button-outline" data-page="search">${t('استكشف الخطوط', 'Explore routes')} ↗</button>`)}
    <div class="driver-welcome"><div><span class="driver-status-dot"></span>${pill(driver?.status || 'pending')}<h2>${t('يومك يبدأ بخطوة منظمة.', 'Start your day with a clear route.')}</h2><p>${t('تابع تفاصيل الخطوط، وكن على اطلاع بتحديثات شبكة النقل في مركزك.', 'Check route details and stay updated on service in your center.')}</p></div><div class="driver-illustration">▰<span>↗</span></div></div>
    <div class="metric-grid">${metricCard('↗', t('الخطوط المتاحة', 'Available routes'), data.routes.filter(item => item.status === 'active').length, t('في شبكة بني سويف', 'in the Beni Suef network'))}${metricCard('▣', t('مركبات متاحة', 'Available vehicles'), data.vehicles.filter(item => item.status === 'available').length, t('حالياً', 'right now'), 'blue')}${metricCard('★', t('تقييم السائقين', 'Driver rating'), '٤.٦ <small>/ ٥</small>', t('متوسط تقييم الشبكة', 'network average'), 'amber')}${metricCard('♧', t('إشعارات جديدة', 'New notifications'), data.notifications.filter(item => !item.read).length, t('تحديثات النظام', 'system updates'), 'purple')}</div>
    <section class="panel"><div class="panel-heading"><div><h2>${t('خطوط في نطاقك', 'Routes in your area')}</h2><p>${t('اختر خطاً للاطلاع على تفاصيله ومركباته.', 'Select a route for details and available vehicles.')}</p></div></div>${renderRouteCards(data.routes.filter(item => item.from === driver?.center || item.to === driver?.center).slice(0, 3))}</section><div class="demo-disclaimer">${icon('ℹ')} ${t('هذه مساحة توضيحية. بيانات التشغيل والسائقين تجريبية.', 'Demo workspace. All driver and operating data is for demonstration only.')}</div></div>`;
}

function renderRouteSearchForm() {
  return `<form class="search-form" id="route-search"><label><span>${t('من', 'From')}</span><select name="from"><option value="">${t('كل المراكز', 'All centers')}</option>${centers.map(center => `<option value="${center.id}" ${routeFilter.from === center.id ? 'selected' : ''}>${center[lang]}</option>`).join('')}</select></label><button type="button" class="swap-button" data-action="swap" title="${t('تبديل المحطات', 'Swap centers')}">⇄</button><label><span>${t('إلى', 'To')}</span><select name="to"><option value="">${t('كل الوجهات', 'All destinations')}</option>${centers.map(center => `<option value="${center.id}" ${routeFilter.to === center.id ? 'selected' : ''}>${center[lang]}</option>`).join('')}</select></label><button class="button button-primary" type="submit">${icon('⌕')} ${t('ابحث عن خط', 'Find routes')}</button></form>`;
}

function renderSearch() {
  const routes = data.routes.filter(route => route.status === 'active' && (!routeFilter.from || route.from === routeFilter.from) && (!routeFilter.to || route.to === routeFilter.to));
  return `<div class="dashboard-wrap">${pageHeading(t(user.role === 'passenger' ? 'اكتشف بني سويف' : 'خطوط الشبكة', user.role === 'passenger' ? 'EXPLORE BENI SUEF' : 'NETWORK ROUTES'), t(user.role === 'passenger' ? `أهلاً ${currentUserName().split(' ')[0]}، على فين؟` : 'خطوط النقل المحلية', user.role === 'passenger' ? `Hi ${currentUserName().split(' ')[0]}, where to?` : 'Local transit routes'), t('اكتشف خطوط النقل والمواقف والأجرة — قبل ما تتحرك.', 'Explore routes, stops, and fares before you go.'), `<span class="location-badge">⌖ ${t('محافظة بني سويف', 'Beni Suef Governorate')}</span>`)}
    <section class="route-search-panel"><div class="search-panel-heading"><span class="search-icon">⌕</span><div><h2>${t('ابحث عن خط رحلتك', 'Find your route')}</h2><p>${t('اختار مركز البداية والوجهة', 'Choose your origin and destination')}</p></div></div>${renderRouteSearchForm()}</section>
    <div class="result-heading"><div><h2>${t('خطوط متاحة', 'Available routes')} <span class="result-count">${routes.length}</span></h2><p>${t('تفاصيل الرحلة والمركبات المتاحة في كل خط', 'Trip details and available vehicles for each route')}</p></div><span class="result-sort">${t(`${data.routes.length} خطوط نشطة`, `${data.routes.length} active routes`)} <i class="live-dot"></i></span></div>
    <div class="routes-grid">${routes.length ? renderRouteCards(routes) : `<div class="empty-state"><span>⌕</span><h3>${t('ما لقيناش خطوط بالاختيارات دي', 'No routes match those filters')}</h3><p>${t('جرّب تختار مراكز تانية أو امسح البحث.', 'Try other centers or clear your search.')}</p><button class="button button-outline" data-action="clear-search">${t('عرض كل الخطوط', 'Show all routes')}</button></div>`}</div>
    ${user.role === 'passenger' ? `<section class="passenger-help"><span>✦</span><div><strong>${t('محتاج مساعدة في رحلتك؟', 'Need help with your journey?')}</strong><small>${t('فريقنا هنا لمساعدتك، شاركنا استفسارك أو ملاحظتك.', 'We’re here to help. Send a question or share feedback.')}</small></div><button class="button button-outline" data-action="new-complaint">${t('تواصل معنا', 'Contact us')} ↗</button></section>` : ''}<div class="demo-disclaimer">${icon('ℹ')} ${t('البيانات المعروضة توضيحية، والأوقات المتوقعة ليست مواعيد فعلية.', 'Demo data only. Travel estimates are illustrative, not live schedules.')}</div></div>`;
}

function renderRouteCards(routes) {
  return `<div class="routes-grid">${routes.map((route, index) => {
    const vehicles = data.vehicles.filter(item => item.routeId === route.id && item.status === 'available').length;
    return `<article class="route-card"><div class="route-card-head"><span class="route-tag">${icon('↗')} ${t('خط محلي', 'LOCAL ROUTE')} ${String(index + 1).padStart(2, '0')}</span><button class="route-more" data-action="route-details" data-id="${route.id}" aria-label="${t('تفاصيل الخط', 'Route details')}">↗</button></div><div class="route-timeline"><div class="route-stop start-stop"><i></i><span><small>${t('من', 'FROM')}</small><strong>${escapeHtml(centerName(route.from, lang))}</strong><em>${escapeHtml(route.fromPlace)}</em></span></div><div class="route-connector"><span>${escapeHtml(route.duration)} ${t('دقيقة', 'min')} · ${escapeHtml(route.distance)} ${t('كم', 'km')}</span></div><div class="route-stop end-stop"><i></i><span><small>${t('إلى', 'TO')}</small><strong>${escapeHtml(centerName(route.to, lang))}</strong><em>${escapeHtml(route.toPlace)}</em></span></div></div><div class="route-card-info"><span>◷ ${escapeHtml(route.frequency)}</span><span>♙ ${vehicles} ${t('مركبة متاحة', 'vehicles available')}</span></div><div class="route-card-bottom"><button class="button button-soft" data-action="route-details" data-id="${route.id}">${t('تفاصيل الرحلة', 'Trip details')} ↗</button></div></article>`;
  }).join('')}</div>`;
}

function renderVehicles() {
  const scopedVehicles = vehiclesInScope();
  const vehicles = scopedVehicles.filter(vehicle => !searchTerm || `${vehicle.plate} ${vehicle.driver} ${vehicle.type} ${vehicleTypeLabel(vehicle.type)}`.toLowerCase().includes(searchTerm.toLowerCase()));
  return `<div class="dashboard-wrap">${pageHeading(t('الأسطول المحلي', 'LOCAL FLEET'), t('إدارة المركبات', 'Vehicle management'), t('أضف مركبة، حدّث حالتها، وتابع ارتباطها بخطوط النقل.', 'Add vehicles, update availability, and assign routes.'), `<button class="button button-dark" data-action="vehicle-form">＋ ${t('إضافة مركبة', 'Add vehicle')}</button>`)}
  <div class="metric-grid compact-grid">${metricCard('▣', t('إجمالي المركبات', 'Total vehicles'), scopedVehicles.length, isStationAdmin() ? t('مرتبطة بمحطة محيي الدين', 'assigned to Mohiuddin station') : t('في النظام التجريبي', 'in demo system'))}${metricCard('●', t('متاحة الآن', 'Available now'), scopedVehicles.filter(item => item.status === 'available').length, t('جاهرة للرحلة', 'ready to operate'), 'blue')}${metricCard('↗', t('في الخدمة', 'In service'), scopedVehicles.filter(item => item.status === 'busy').length, t('على خطوط نشطة', 'on active routes'), 'purple')}${metricCard('⚒', t('في الصيانة', 'In maintenance'), scopedVehicles.filter(item => item.status === 'maintenance').length, t('خارج الخدمة مؤقتاً', 'temporarily out of service'), 'amber')}</div>
  <section class="panel table-panel"><div class="panel-heading"><div><h2>${t('سجل المركبات', 'Vehicle registry')}</h2><p>${t('بيانات أسطول النقل — قابلة للتعديل والحفظ محلياً', 'Transit fleet — changes save locally')}</p></div><label class="table-search">⌕ <input id="vehicle-filter" value="${escapeHtml(searchTerm)}" placeholder="${t('ابحث برقم اللوحة أو السائق', 'Search plate or driver')}" /></label></div><div class="table-wrap"><table><thead><tr><th>${t('رقم اللوحة', 'PLATE')}</th><th>${t('النوع / السعة', 'TYPE / CAPACITY')}</th><th>${t('الخط', 'ROUTE')}</th><th>${t('السائق', 'DRIVER')}</th><th>${t('الحالة', 'STATUS')}</th><th>${t('موعد العودة والعدّاد', 'Return time & timer')}</th><th>${t('آخر تحديث', 'UPDATED')}</th><th>${t('إجراء', 'ACTION')}</th></tr></thead><tbody>${vehicles.map(vehicle => {
    const hasSchedule = vehicle.status === 'busy' && Number.isFinite(Date.parse(vehicle.departedAt)) && Number.isFinite(Date.parse(vehicle.returnBy));
    const schedule = hasSchedule
      ? `<div class="vehicle-timing"><small>${t('خرج', 'Departed')} ${escapeHtml(dateTimeLabel(vehicle.departedAt))}</small><div class="vehicle-timer" data-vehicle-timer data-departed-at="${escapeHtml(vehicle.departedAt)}" data-return-by="${escapeHtml(vehicle.returnBy)}"><span>${t('مر منذ الخروج', 'Elapsed')}</span><strong class="vehicle-elapsed"></strong><span class="vehicle-countdown-label"></span><strong class="vehicle-remaining"></strong></div><small>${t('موعد العودة', 'Due back')} ${escapeHtml(dateTimeLabel(vehicle.returnBy))}</small></div>`
      : vehicle.status === 'busy' ? `<span class="vehicle-schedule-missing">${t('لم يُحدد موعد العودة', 'No return time set')}</span>` : '—';
    const action = vehicle.status === 'available'
      ? `<button class="mini-action vehicle-action" data-action="vehicle-departure" data-id="${vehicle.id}" title="${t('تسجيل خروج وتحديد موعد العودة', 'Record departure and set return time')}">${t('خروج', 'Out')}</button>`
      : vehicle.status === 'busy'
        ? `<button class="mini-action vehicle-action" data-action="vehicle-return" data-id="${vehicle.id}" title="${t('تسجيل عودة المركبة', 'Record vehicle return')}">${t('عودة', 'Return')}</button>`
        : `<button class="mini-action" data-action="vehicle-status" data-id="${vehicle.id}" title="${t('إتاحة المركبة', 'Mark as available')}">↻</button>`;
    return `<tr><td><strong class="id-cell">${escapeHtml(vehicle.plate)}</strong></td><td>${escapeHtml(vehicleTypeLabel(vehicle.type))} · ${vehicle.capacity} ${t('مقعد', 'seats')}</td><td>${escapeHtml(routeLabel(routeById(vehicle.routeId)))}</td><td>${escapeHtml(vehicle.driver)}</td><td>${pill(vehicle.status)}</td><td>${schedule}</td><td>${escapeHtml(vehicle.updated)}</td><td><div class="row-actions">${action}<button class="mini-action" data-action="edit-vehicle" data-id="${vehicle.id}" title="${t('تعديل', 'Edit')}">✎</button></div></td></tr>`;
  }).join('') || emptyRow(8)}</tbody></table></div></section><div class="demo-disclaimer">${icon('ℹ')} ${t('سجّل خروج المركبة لتحديد موعد عودتها ومتابعة الوقت المتبقي. البيانات تجريبية ومحفوظة محلياً.', 'Record a vehicle departure to set its return time and track the countdown. Demo data is stored locally.')}</div></div>`;
}

function renderRoutes() {
  const scopedRoutes = routesInScope();
  const scopedVehicles = vehiclesInScope();
  return `<div class="dashboard-wrap">${pageHeading(t('شبكة النقل', 'TRANSIT NETWORK'), t('إدارة الخطوط', 'Route management'), t('نظّم الوجهات والمواقف والأجرة — البيانات تُحفظ في هذا المتصفح.', 'Manage routes, stops, and fares — saved in this browser.'), `<button class="button button-dark" data-action="route-form">＋ ${t('إضافة خط جديد', 'Add route')}</button>`)}
  <div class="metric-grid compact-grid">${metricCard('↗', t('خطوط نشطة', 'Active routes'), scopedRoutes.filter(item => item.status === 'active').length, isStationAdmin() ? t('من وإلى محطة محيي الدين', 'from Mohiuddin station') : t('تربط مراكز المحافظة', 'connecting local centers'))}${metricCard('⌖', t('مواقف مسجلة', 'Registered stations'), isStationAdmin() ? data.stations.filter(station => station.center === 'bani-suef').length : data.stations.length, t('رئيسية وفرعية', 'main and local'), 'blue')}${metricCard('◉', t('مراكز مخدومة', 'Centers covered'), isStationAdmin() ? '١ / ٧' : '٧ / ٧', isStationAdmin() ? t('نطاق المحطة', 'station scope') : t('جميع المراكز الإدارية', 'all administrative centers'), 'purple')}${metricCard('▣', t('مركبات مرتبطة', 'Assigned vehicles'), scopedVehicles.filter(item => item.routeId).length, isStationAdmin() ? t('ضمن نطاق المحطة', 'within this station') : t('على خطوط الشبكة', 'across the network'), 'amber')}</div>
  <section class="panel table-panel"><div class="panel-heading"><div><h2>${t('الخطوط المسجلة', 'Registered routes')}</h2><p>${t(isStationAdmin() ? 'الخطوط المرتبطة بمحطة محيي الدين' : 'خطوط ومواقف النقل في محافظة بني سويف', isStationAdmin() ? 'Routes assigned to Mohiuddin station' : 'Transit routes and stations in Beni Suef')}</p></div></div><div class="table-wrap"><table><thead><tr><th>${t('المسار', 'ROUTE')}</th><th>${t('المواقف', 'STOPS')}</th><th>${t('المسافة / المدة', 'DISTANCE / TIME')}</th><th>${t('الأجرة', 'FARE')}</th><th>${t('التكرار', 'FREQUENCY')}</th><th>${t('الحالة', 'STATUS')}</th><th>${t('إجراء', 'ACTION')}</th></tr></thead><tbody>${scopedRoutes.map(route => `<tr><td><strong>${escapeHtml(routeLabel(route))}</strong><small class="table-sub">${escapeHtml(route.fromPlace)} ← ${escapeHtml(route.toPlace)}</small></td><td>${escapeHtml(route.stops.join(' · '))}</td><td>${route.distance} ${t('كم', 'km')} · ${route.duration} ${t('د', 'min')}</td><td><strong>${route.fare} ${t('جنيه', 'EGP')}</strong></td><td>${escapeHtml(route.frequency)}</td><td>${pill(route.status)}</td><td><div class="row-actions"><button class="mini-action" data-action="route-details" data-id="${route.id}" title="${t('عرض', 'View')}">↗</button><button class="mini-action" data-action="edit-route" data-id="${route.id}" title="${t('تعديل', 'Edit')}">✎</button><button class="mini-action danger-action" data-action="delete-route" data-id="${route.id}" title="${t('حذف', 'Delete')}">×</button></div></td></tr>`).join('') || emptyRow(7)}</tbody></table></div></section><div class="demo-disclaimer">${icon('ℹ')} ${t('معلومات المواقف والخطوط للاستخدام التوضيحي فقط.', 'Route and station information is for demonstration only.')}</div></div>`;
}

function renderApplications() {
  const scopedDrivers = driversInScope();
  return `<div class="dashboard-wrap">${pageHeading(t('شركاء الشبكة', 'NETWORK PARTNERS'), t('طلبات تسجيل السائقين', 'Driver applications'), t('راجع الطلبات واتخذ قرار القبول أو الرفض. ستظهر الحالة فوراً في ملف السائق.', 'Review applications and approve or reject drivers. Status updates immediately.'), `<span class="date-badge">♙ ${scopedDrivers.filter(item => item.status === 'pending').length} ${t('طلبات قيد المراجعة', 'pending applications')}</span>`)}
  <div class="tabs-row">${['all', 'pending', 'approved', 'rejected'].map(status => `<button class="filter-chip ${applicationFilter === status ? 'selected' : ''}" data-action="application-filter" data-value="${status}">${t(({ all: 'الكل', pending: 'قيد المراجعة', approved: 'مقبولة', rejected: 'مرفوضة' })[status], ({ all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' })[status])}<span>${status === 'all' ? scopedDrivers.length : scopedDrivers.filter(item => item.status === status).length}</span></button>`).join('')}</div>
  <div class="applications-list">${scopedDrivers.filter(item => applicationFilter === 'all' || item.status === applicationFilter).map(driver => `<article class="application-card"><div class="application-person"><span class="person-avatar">${escapeHtml(driver.name.slice(0, 1))}</span><div><strong>${escapeHtml(driver.name)}</strong><span>${escapeHtml(driver.phone)}</span><small>${t('رقم الهوية', 'National ID')}: ${escapeHtml(driver.nationalId)}</small></div></div><div class="application-detail"><span>${t('المركز', 'CENTER')}</span><strong>${escapeHtml(centerName(driver.center, lang))}</strong></div><div class="application-detail"><span>${t('نوع المركبة', 'VEHICLE TYPE')}</span><strong>${escapeHtml(vehicleTypeLabel(driver.vehicle))}</strong></div><div class="application-detail"><span>${t('تاريخ الطلب', 'APPLIED')}</span><strong>${escapeHtml(driver.applied)}</strong></div><div class="application-actions">${pill(driver.status)}${driver.status === 'pending' ? `<button class="mini-action approve-action" data-action="approve-driver" data-id="${driver.id}" title="${t('قبول الطلب', 'Approve')}">✓</button><button class="mini-action reject-action" data-action="reject-driver" data-id="${driver.id}" title="${t('رفض الطلب', 'Reject')}">×</button>` : ''}</div></article>`).join('') || `<div class="empty-state"><span>♙</span><h3>${t('لا توجد طلبات في هذا التصنيف', 'No applications in this category')}</h3><p>${t('الطلبات الجديدة ستظهر هنا.', 'New applications will appear here.')}</p></div>`}</div>
  <section class="panel apply-callout"><span class="benefit-icon">＋</span><div><h3>${t('إضافة طلب سائق تجريبي', 'Add a demo driver application')}</h3><p>${t('جرب دورة مراجعة الطلب بالكامل، من التسجيل إلى اتخاذ القرار.', 'Try the complete application workflow, from registration to review.')}</p></div><button class="button button-outline" data-action="driver-form">${t('تسجيل سائق جديد', 'Register a driver')} ↗</button></section><div class="demo-disclaimer">${icon('ℹ')} ${t('معلومات السائقين المقدمة للتجربة فقط، ولا تُرسل لأي جهة خارجية.', 'Driver information is demo-only and never sent to any external service.')}</div></div>`;
}

let applicationFilter = 'all';

function renderRatings() {
  const ratings = user.role === 'passenger'
    ? data.ratings.filter(ownsPassengerRecord)
    : ratingsInScope();
  const average = ratings.length ? (ratings.reduce((sum, item) => sum + item.stars, 0) / ratings.length).toFixed(1) : '0.0';
  return `<div class="dashboard-wrap">${pageHeading(t(user.role === 'passenger' ? 'صوت الركاب' : 'جودة الخدمة', user.role === 'passenger' ? 'PASSENGER VOICE' : 'SERVICE QUALITY'), t(user.role === 'passenger' ? 'تقييم رحلاتك' : 'تقييمات الركاب', user.role === 'passenger' ? 'Rate your trips' : 'Passenger ratings'), t(user.role === 'passenger' ? 'ساعدنا نحسّن الخدمة — شاركنا تقييمك لرحلة قطعتها.' : 'استمع لملاحظات الركاب وتابع جودة الخدمة عبر الخطوط المختلفة.', user.role === 'passenger' ? 'Help us improve the service — rate a recent trip.' : 'Review passenger feedback and track service quality across routes.'), user.role === 'passenger' ? `<button class="button button-dark" data-action="rating-form">＋ ${t('قيّم رحلة', 'Rate a trip')}</button>` : '')}
  <div class="rating-summary"><div class="rating-score"><strong>${average}</strong><span class="stars">★★★★★</span><small>${ratings.length} ${t('تقييماً من الركاب', 'passenger reviews')}</small></div><div class="rating-divider"></div><div class="rating-distribution">${[5, 4, 3, 2, 1].map(stars => { const count = ratings.filter(rating => rating.stars === stars).length; const percent = ratings.length ? Math.round(count / ratings.length * 100) : 0; return `<div><span>${stars} ★</span><i><b style="width:${percent}%"></b></i><small>${count}</small></div>`; }).join('')}</div></div>
  <section class="panel table-panel"><div class="panel-heading"><div><h2>${t('آراء الركاب', 'Passenger reviews')}</h2><p>${t('كل تقييم يساعدنا على تحسين الرحلات', 'Every rating helps improve the journey')}</p></div><span class="review-count">${ratings.length} ${t('تقييمات', 'reviews')}</span></div><div class="reviews-list">${ratings.map(item => `<article class="review-card"><span class="person-avatar">${escapeHtml(item.passenger.slice(0, 1))}</span><div class="review-content"><div class="review-top"><strong>${escapeHtml(item.passenger)}</strong><span class="stars">${'★'.repeat(item.stars)}<span class="empty-star">${'★'.repeat(5 - item.stars)}</span></span><time>${escapeHtml(item.date)}</time></div><span class="review-route">↗ ${escapeHtml(routeLabel(routeById(item.routeId)))}</span><p>${escapeHtml(item.text)}</p></div></article>`).join('') || `<div class="empty-state"><h3>${t('لا توجد تقييمات بعد', 'No ratings yet')}</h3></div>`}</div></section><div class="demo-disclaimer">${icon('ℹ')} ${t('التقييمات المدرجة تجريبية. التقييم الجديد محفوظ محلياً.', 'Sample ratings are demo data. New ratings are saved locally.')}</div></div>`;
}

function renderComplaints() {
  const isPassenger = user.role === 'passenger';
  const complaints = isPassenger
    ? data.complaints.filter(ownsPassengerRecord)
    : complaintsInScope();
  const visibleComplaints = complaintFilter
    ? complaints.filter(item => item.id.toLowerCase().includes(complaintFilter.toLowerCase()))
    : complaints;
  return `<div class="dashboard-wrap">${pageHeading(t('دعم ومتابعة', 'SUPPORT & TRACKING'), t(isPassenger ? 'الشكاوى ومتابعتها' : 'شكاوى الركاب', isPassenger ? 'Complaints & tracking' : 'Passenger complaints'), t(isPassenger ? 'تابع شكواك خطوة بخطوة أو شاركنا ملاحظة جديدة.' : 'تابع ملاحظات الركاب وحدّث حالة المعالجة بكل شفافية.', isPassenger ? 'Track your report or send us a new message.' : 'Review passenger feedback and track every report transparently.'), isPassenger ? `<button class="button button-dark" data-action="new-complaint">＋ ${t('إرسال شكوى', 'New complaint')}</button>` : `<span class="date-badge">${visibleComplaints.filter(item => item.status !== 'resolved').length} ${t('شكاوى مفتوحة', 'open complaints')}</span>`)}
  <form class="complaint-track-form" id="complaint-track-form"><label for="complaint-tracking-id">${t('رقم متابعة الشكوى', 'Complaint tracking ID')}</label><div><input id="complaint-tracking-id" name="trackingId" value="${escapeHtml(complaintFilter)}" placeholder="${t('مثال: C-2450', 'Example: C-2450')}" required /><button class="button button-dark" type="submit">${t('تتبّع', 'Track')}</button>${complaintFilter ? `<button class="button button-outline" type="button" data-action="clear-complaint-filter">${t('عرض الكل', 'Show all')}</button>` : ''}</div></form>
  <div class="complaint-summary">${[['new', '◉', 'new'], ['in_progress', '◷', 'in_progress'], ['resolved', '✓', 'resolved']].map(([status, glyph, label]) => `<div class="complaint-stat"><span class="attention-icon ${status === 'resolved' ? 'green' : status === 'new' ? 'red' : 'amber'}">${glyph}</span><div><small>${statusLabel(label)}</small><strong>${visibleComplaints.filter(item => item.status === status).length}</strong></div></div>`).join('')}<div class="complaint-hint">${icon('ℹ')} ${t('كل شكوى لها رقم متابعة خاص بها.', 'Every report has a unique tracking ID.')}</div></div>
  <div class="complaints-list">${visibleComplaints.map(complaint => `<article class="complaint-card"><div class="complaint-card-head"><div><strong>${escapeHtml(complaint.id)}</strong><span>${escapeHtml(complaint.date)} · ${escapeHtml(complaintCategoryLabel(complaint.category))}</span></div>${pill(complaint.status)}</div><p>${escapeHtml(complaint.text)}</p><div class="complaint-card-foot"><span>${icon('↗')} ${escapeHtml(routeLabel(routeById(complaint.routeId)))}${!isPassenger ? ` · ${escapeHtml(complaint.passenger)}` : ''}</span>${complaint.response ? `<span class="response-note">↳ ${escapeHtml(complaint.response)}</span>` : ''}<div class="complaint-actions">${complaint.status === 'new' ? `<button class="button button-soft" data-action="complaint-status" data-id="${complaint.id}" data-status="in_progress">${t('بدء المعالجة', 'Start review')}</button>` : ''}${complaint.status === 'in_progress' ? `<button class="button button-soft" data-action="complaint-status" data-id="${complaint.id}" data-status="resolved">${t('تم الحل', 'Mark resolved')}</button>` : ''}</div></div></article>`).join('') || `<div class="empty-state"><span>◉</span><h3>${complaintFilter ? t('لم نعثر على شكوى بهذا الرقم', 'No complaint found with this ID') : t('ما عندكش شكاوى حالياً', 'No complaints yet')}</h3><p>${complaintFilter ? t('تأكد من رقم المتابعة، أو اعرض كل الشكاوى المرتبطة بحسابك.', 'Check the tracking ID, or view all complaints linked to your account.') : t('لو واجهت مشكلة في رحلة، إحنا هنا لمساعدتك.', 'If something goes wrong, we are here to help.')}</p>${complaintFilter ? `<button class="button button-outline" data-action="clear-complaint-filter">${t('عرض كل الشكاوى', 'Show all complaints')}</button>` : `<button class="button button-outline" data-action="new-complaint">${t('إرسال ملاحظة', 'Send feedback')}</button>`}</div>`}</div><div class="demo-disclaimer">${icon('ℹ')} ${t('البلاغات توضيحية ولا تُرسل لخدمة عملاء فعلية.', 'Demo reports are not sent to a live customer service team.')}</div></div>`;
}

function renderNotifications() {
  return `<div class="dashboard-wrap">${pageHeading(t('ابقَ على اطلاع', 'STAY UPDATED'), t('الإشعارات', 'Notifications'), t('آخر المستجدات المتعلقة بخطوط النقل والخدمة.', 'The latest transit and service updates.'), `<button class="button button-outline" data-action="mark-all-read">${t('تحديد الكل كمقروء', 'Mark all as read')} ✓</button>`)}
  <section class="panel notifications-panel"><div class="panel-heading"><div><h2>${t('آخر الإشعارات', 'Recent notifications')}</h2><p>${t('إشعارات تجريبية خاصة بنظام العرض', 'Demo notifications for this workspace')}</p></div><span class="review-count">${data.notifications.filter(item => !item.read).length} ${t('جديد', 'new')}</span></div><div class="notifications-list">${data.notifications.map(item => `<article class="notification-row ${item.read ? 'read' : ''}"><span class="notification-icon">${item.title.includes('سائق') ? '♙' : item.title.includes('تقييم') ? '★' : '◉'}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p><small>${escapeHtml(item.time)}</small></div>${item.read ? `<span class="read-label">${t('مقروء', 'Read')}</span>` : `<button class="mini-action" data-action="read-notification" data-id="${item.id}" title="${t('تحديد كمقروء', 'Mark as read')}">✓</button>`}</article>`).join('') || `<div class="empty-state"><h3>${t('لا توجد إشعارات', 'No notifications')}</h3></div>`}</div></section><div class="demo-disclaimer">${icon('ℹ')} ${t('الإشعارات مخزنة محلياً ولا تُرسل خارج هذا العرض.', 'Notifications are stored locally and are not sent externally.')}</div></div>`;
}

function emptyRow(cols) {
  return `<tr><td colspan="${cols}" class="empty-table">${t('لا توجد بيانات لعرضها.', 'Nothing to display.')}</td></tr>`;
}

function renderLogin() {
  app.innerHTML = `<div class="login-shell">
    <div class="login-side"><a class="brand" href="#" data-action="home"><span class="brand-mark">م</span><span>${t('موقفي', 'Mawqifi')}<small>${t('رحلتك أقرب', 'Your city, within reach')}</small></span></a><div class="login-art"><span>م</span><div class="login-line"></div><i>↗</i><b>▰</b></div><span class="eyebrow">${t('تنقل أسهل، لمدينة أفضل', 'EASIER JOURNEYS, BETTER CITIES')}</span><h2>${t('خطوتك الجاية،<br>في المكان الصح.', 'Your next step,<br>in the right place.')}</h2><p>${t('منصة موحدة تربط شبكة النقل في محافظة بني سويف — لتجربة أذكى وأكثر موثوقية للجميع.', 'A connected transit platform for Beni Suef — a smarter, more reliable journey for everyone.')}</p><span class="login-side-footer">© 2026 Mawqifi · ${t('نموذج توضيحي للمسابقة', 'Competition demo')}</div>
    <div class="login-main"><div class="login-top"><button class="text-button" data-action="language">${lang === 'ar' ? 'English' : 'العربية'}</button><button class="back-link" data-action="home">← ${t('الصفحة الرئيسية', 'Back to home')}</button></div>
      <div class="login-form-wrap"><span class="eyebrow">${t('أهلاً بعودتك', 'WELCOME BACK')}</span><h1>${t('ادخل إلى العرض التجريبي', 'Enter the demo')}</h1><p class="login-intro">${t('اختر دوراً للدخول وتجربة واجهة النظام المناسبة.', 'Choose a role to explore its dashboard and workflows.')}</p>
        <div class="demo-notice"><span>✦</span><div><strong>${t('نسخة عرض توضيحي فقط', 'Demonstration version only')}</strong><p>${t('تسجيل الدخول محاكاة محلية. لا تُرسل بياناتك لأي خدمة خارجية.', 'Login is simulated locally. No credentials are sent externally.')}</p></div></div>
        <button class="button button-primary full-button" data-action="guest-passenger">${t('دخول كراكب بدون حساب', 'Continue as passenger — no account needed')} ${icon('←')}</button>
        <button class="button button-outline full-button driver-apply-button" data-action="driver-form">${t('سائق جديد؟ قدّم طلب التسجيل', 'New driver? Submit an application')} ↗</button>
        <form id="login-form" class="login-form"><label>${t('الدخول بصفة', 'SIGN IN AS')}<select id="login-role" name="role">${demoAccounts.map(account => `<option value="${account.role}">${roles[account.role]}</option>`).join('')}</select></label><label>${t('البريد الإلكتروني', 'EMAIL ADDRESS')}<input type="email" id="login-email" name="email" required autocomplete="username" /></label><label>${t('كلمة المرور', 'PASSWORD')}<input type="password" id="login-password" name="password" required autocomplete="current-password" /></label><div id="login-error" class="form-error" aria-live="polite"></div><button class="button button-primary full-button" type="submit">${t('دخول إلى لوحة التحكم', 'Enter dashboard')} ${icon('←')}</button></form>
        <div class="credentials"><div class="credentials-heading"><strong>${t('حسابات التجربة', 'DEMO CREDENTIALS')}</strong><span>${t('اختر الحساب للملء السريع', 'Click to autofill')}</span></div>${demoAccounts.map(account => `<button type="button" class="credential-row" data-action="use-account" data-role="${account.role}"><span class="credential-role">${roles[account.role]}</span><span class="credential-email">${account.email}</span><span class="credential-password">${account.password}</span><span>↖</span></button>`).join('')}</div>
      </div><footer class="login-footer">${t('محلي وتجريبي · لا يتطلب Firebase أو مفاتيح API', 'Local demo · No Firebase or API keys')}</footer>
    </div><div id="toast" class="toast" role="status" aria-live="polite"></div></div>`;
  bindEvents();
}

function showModal(title, content, submitLabel = '') {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="modal-close" type="button" data-action="close-modal" aria-label="${t('إغلاق', 'Close')}">×</button></div><div class="modal-body">${content}</div>${submitLabel ? `<div class="modal-footer"><button type="button" class="button button-outline" data-action="close-modal">${t('إلغاء', 'Cancel')}</button><button type="submit" form="modal-form" class="button button-primary">${submitLabel}</button></div>` : ''}</section></div>`);
  const modal = document.querySelector('.modal');
  modal?.focus();
  const backdrop = document.querySelector('.modal-backdrop');
  backdrop?.addEventListener('click', event => {
    if (event.target === backdrop || event.target.closest('[data-action="close-modal"]')) backdrop.remove();
  });
}

function centerOptions(selected = '', allowedCenterIds) {
  return centers.filter(center => !allowedCenterIds || allowedCenterIds.includes(center.id))
    .map(center => `<option value="${center.id}" ${selected === center.id ? 'selected' : ''}>${center[lang]}</option>`).join('');
}

function vehicleForm(vehicle) {
  const availableRoutes = routesInScope();
  const item = vehicle || { plate: '', type: 'ميكروباص', capacity: 14, status: 'available', routeId: availableRoutes[0]?.id || '', driver: '' };
  showModal(vehicle ? t('تعديل بيانات المركبة', 'Edit vehicle') : t('إضافة مركبة جديدة', 'Add vehicle'), `<form id="modal-form" class="modal-form"><label>${t('رقم اللوحة', 'Plate number')}<input name="plate" required value="${escapeHtml(item.plate)}" placeholder="بني س و ٣٤٥٦" /></label><label>${t('نوع المركبة', 'Vehicle type')}<select name="type"><option value="ميكروباص" ${item.type === 'ميكروباص' ? 'selected' : ''}>${vehicleTypeLabel('ميكروباص')}</option><option value="أتوبيس" ${item.type === 'أتوبيس' ? 'selected' : ''}>${vehicleTypeLabel('أتوبيس')}</option><option value="سيارة أجرة" ${item.type === 'سيارة أجرة' ? 'selected' : ''}>${vehicleTypeLabel('سيارة أجرة')}</option></select></label><label>${t('عدد المقاعد', 'Seat capacity')}<input name="capacity" type="number" min="1" max="60" required value="${item.capacity}" /></label><label>${t('السائق', 'Driver')}<input name="driver" value="${escapeHtml(item.driver === '—' ? '' : item.driver)}" placeholder="${t('اسم السائق', 'Driver name')}" /></label><label>${t('الخط', 'Route')}<select name="routeId">${availableRoutes.map(route => `<option value="${route.id}" ${route.id === item.routeId ? 'selected' : ''}>${escapeHtml(routeLabel(route))}</option>`).join('')}</select></label><label>${t('الحالة', 'Status')}<select name="status"><option value="available" ${item.status === 'available' ? 'selected' : ''}>${statusLabel('available')}</option><option value="busy" ${item.status === 'busy' ? 'selected' : ''}>${statusLabel('busy')}</option><option value="maintenance" ${item.status === 'maintenance' ? 'selected' : ''}>${statusLabel('maintenance')}</option></select></label></form>`, t(vehicle ? 'حفظ التعديل' : 'إضافة مركبة', vehicle ? 'Save changes' : 'Add vehicle'));
  document.querySelector('#modal-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    const duplicate = data.vehicles.some(item => item.plate.trim().toLowerCase() === form.plate.trim().toLowerCase() && item.id !== vehicle?.id);
    if (duplicate) return showToast(t('رقم اللوحة مسجل بالفعل.', 'That plate number is already registered.'), 'error');
    if (form.status === 'busy' && vehicle?.status !== 'busy') return showToast(t('سجّل خروج المركبة من زر «خروج» لتحديد موعد العودة.', 'Use the departure action to set a return time before marking a vehicle in service.'), 'error');
    const updated = { ...form, capacity: Number(form.capacity), driver: form.driver.trim() || '—', updated: t('الآن', 'Just now') };
    if (form.status === 'busy') {
      updated.departedAt = vehicle.departedAt;
      updated.returnBy = vehicle.returnBy;
    }
    if (vehicle) Object.assign(vehicle, updated);
    else data.vehicles.unshift({ id: uuid('v'), ...updated });
    if (form.status !== 'busy') {
      delete vehicle?.departedAt;
      delete vehicle?.returnBy;
    }
    document.querySelector('.modal-backdrop')?.remove();
    persist();
    showToast(t(vehicle ? 'تم تحديث بيانات المركبة.' : 'تمت إضافة المركبة وحفظها.', vehicle ? 'Vehicle updated.' : 'Vehicle added and saved.'));
  });
}

function vehicleDepartureForm(id) {
  const vehicle = data.vehicles.find(item => item.id === id);
  if (!vehicle || vehicle.status !== 'available') return;
  const now = new Date();
  const defaultReturn = new Date(now.getTime() + 60 * 60 * 1000);
  const content = `<form id="modal-form" class="modal-form"><label>${t('وقت خروج المركبة من الموقف', 'Departure time from station')}<input name="departedAt" type="datetime-local" required value="${localDateTimeValue(now)}" /></label><label>${t('موعد العودة المحدد', 'Expected return time')}<input name="returnBy" type="datetime-local" required value="${localDateTimeValue(defaultReturn)}" /></label></form><p class="form-hint">${t('سيبدأ العدّاد فور تسجيل الخروج، وسيظهر الوقت المنقضي والوقت المتبقي في سجل المركبات.', 'The timer starts when departure is recorded and shows elapsed and remaining time in the vehicle registry.')}</p>`;
  showModal(`${t('تسجيل خروج المركبة', 'Record vehicle departure')} · ${escapeHtml(vehicle.plate)}`, content, t('تأكيد الخروج', 'Confirm departure'));
  document.querySelector('#modal-form').addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const departedAt = new Date(values.departedAt);
    const returnBy = new Date(values.returnBy);
    if (!Number.isFinite(departedAt.getTime()) || !Number.isFinite(returnBy.getTime())) return showToast(t('تحقق من إدخال مواعيد صحيحة.', 'Enter valid departure and return times.'), 'error');
    if (departedAt.getTime() > Date.now()) return showToast(t('لا يمكن أن يكون وقت الخروج في المستقبل.', 'Departure time cannot be in the future.'), 'error');
    if (returnBy <= departedAt || returnBy.getTime() <= Date.now()) return showToast(t('يجب أن يكون موعد العودة بعد وقت الخروج وفي المستقبل.', 'Return time must be after departure and in the future.'), 'error');
    vehicle.status = 'busy';
    vehicle.departedAt = departedAt.toISOString();
    vehicle.returnBy = returnBy.toISOString();
    vehicle.updated = t('الآن', 'Just now');
    document.querySelector('.modal-backdrop')?.remove();
    persist();
    showToast(t('تم تسجيل خروج المركبة وبدء العدّاد.', 'Departure recorded and countdown started.'));
  });
}

function routeForm(route) {
  const allowedOrigins = isStationAdmin() ? ['bani-suef'] : undefined;
  const item = route || { from: allowedOrigins?.[0] || centers[0].id, to: centers[1].id, fromPlace: '', toPlace: '', stops: [], duration: 30, distance: 20, fare: 15, frequency: 'كل ٣٠ دقيقة' };
  const content = `<form id="modal-form" class="modal-form"><label>${t('من مركز', 'From center')}<select name="from" required>${centerOptions(item.from, allowedOrigins)}</select></label><label>${t('إلى مركز', 'To center')}<select name="to" required>${centerOptions(item.to)}</select></label><label>${t('موقف البداية', 'Origin station')}<input name="fromPlace" required value="${escapeHtml(item.fromPlace)}" placeholder="${t('مثال: موقف محيي الدين', 'e.g. Main station')}" /></label><label>${t('موقف الوصول', 'Destination station')}<input name="toPlace" required value="${escapeHtml(item.toPlace)}" placeholder="${t('مثال: موقف ببا', 'e.g. Beba station')}" /></label><label>${t('المحطات على الطريق', 'Stops along route')}<input name="stops" required value="${escapeHtml(item.stops.join('، '))}" placeholder="${t('بني سويف، باروط، ببا', 'Center, village, destination')}" /></label><label>${t('المدة (دقيقة)', 'Duration (minutes)')}<input name="duration" type="number" min="5" required value="${item.duration}" /></label><label>${t('المسافة (كم)', 'Distance (km)')}<input name="distance" type="number" min="1" required value="${item.distance}" /></label><label>${t('الأجرة (جنيه)', 'Fare (EGP)')}<input name="fare" type="number" min="1" required value="${item.fare}" /></label><label>${t('تكرار الرحلات', 'Frequency')}<input name="frequency" required value="${escapeHtml(item.frequency)}" /></label></form>`;
  showModal(t(route ? 'تعديل خط النقل' : 'إضافة خط نقل جديد', route ? 'Edit transit route' : 'Add a transit route'), content, t(route ? 'حفظ التعديلات' : 'إضافة الخط', route ? 'Save changes' : 'Add route'));
  document.querySelector('#modal-form').addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.from === values.to) return showToast(t('يجب اختيار مركزين مختلفين.', 'Choose two different centers.'), 'error');
    if (isStationAdmin() && values.from !== 'bani-suef') return showToast(t('يمكن لمدير المحطة إدارة الخطوط التابعة لموقف محيي الدين فقط.', 'Station admins can only manage routes from Mohiuddin station.'), 'error');
    if (data.routes.some(existing => existing.from === values.from && existing.to === values.to && existing.id !== route?.id)) return showToast(t('هذا الخط موجود بالفعل.', 'That route already exists.'), 'error');
    const updated = { ...values, duration: Number(values.duration), distance: Number(values.distance), fare: Number(values.fare), stops: values.stops.split(/[،,]/).map(stop => stop.trim()).filter(Boolean), status: route?.status || 'active' };
    if (route) Object.assign(route, updated);
    else data.routes.unshift({ id: uuid('r'), ...updated });
    document.querySelector('.modal-backdrop')?.remove();
    persist();
    showToast(t(route ? 'تم تحديث الخط وحفظ التغييرات.' : 'تمت إضافة الخط وحفظه.', route ? 'Route updated and saved.' : 'Route added and saved.'));
  });
}

function driverForm() {
  const centerScope = isStationAdmin() ? ['bani-suef'] : undefined;
  const content = `<form id="modal-form" class="modal-form"><label>${t('الاسم بالكامل', 'Full name')}<input name="name" required minlength="4" placeholder="${t('مثال: محمد أحمد حسن', 'e.g. Ahmed Mohamed')}" /></label><label>${t('رقم الهاتف', 'Phone number')}<input name="phone" required pattern="01[0125][0-9]{8}" placeholder="01012345678" /></label><label>${t('رقم الهوية', 'National ID')}<input name="nationalId" required minlength="8" placeholder="${t('رقم الهوية التجريبي', 'Demo ID number')}" /></label><label>${t('المركز الإداري', 'Administrative center')}<select name="center" required>${centerOptions(centerScope?.[0] || '', centerScope)}</select></label><label>${t('نوع المركبة', 'Vehicle type')}<select name="vehicle"><option value="ميكروباص">${vehicleTypeLabel('ميكروباص')}</option><option value="أتوبيس">${vehicleTypeLabel('أتوبيس')}</option><option value="سيارة أجرة">${vehicleTypeLabel('سيارة أجرة')}</option></select></label></form><p class="form-hint">${t('سيُسجل الطلب بحالة «قيد المراجعة»، ويمكن للمسؤول قبوله أو رفضه.', 'This application will be pending until an administrator reviews it.')}</p>`;
  showModal(t('تسجيل سائق جديد', 'Register a driver'), content, t('إرسال الطلب', 'Submit application'));
  document.querySelector('#modal-form').addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.drivers.unshift({ id: uuid('d'), ...values, applied: new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date()), status: 'pending' });
    data.notifications.unshift({ id: uuid('n'), title: t('طلب تسجيل سائق جديد', 'New driver application'), text: `${values.name} — ${centerName(values.center, lang)}`, time: t('الآن', 'Just now'), read: false });
    document.querySelector('.modal-backdrop')?.remove();
    if (user) persist();
    else {
      persistOnly();
      renderLogin();
    }
    showToast(t('تم إرسال الطلب للمراجعة.', 'Application submitted for review.'));
  });
}

function ratingForm() {
  const completed = data.routes.filter(route => route.status === 'active');
  showModal(t('تقييم رحلة', 'Rate your trip'), `<form id="modal-form" class="modal-form"><label>${t('اختر الخط', 'Select route')}<select name="routeId" required>${completed.map(route => `<option value="${route.id}">${escapeHtml(routeLabel(route))}</option>`).join('')}</select></label><label>${t('تقييمك', 'Your rating')}<select name="stars"><option value="5">★★★★★ — ${t('ممتاز', 'Excellent')}</option><option value="4">★★★★☆ — ${t('جيد جداً', 'Very good')}</option><option value="3">★★★☆☆ — ${t('جيد', 'Good')}</option><option value="2">★★☆☆☆ — ${t('مقبول', 'Fair')}</option><option value="1">★☆☆☆☆ — ${t('يحتاج تحسين', 'Needs improvement')}</option></select></label><label>${t('شاركنا رأيك', 'Share your feedback')}<textarea name="text" required minlength="4" rows="3" placeholder="${t('كيف كانت تجربتك؟', 'How was your journey?')}"></textarea></label></form>`, t('إرسال التقييم', 'Submit rating'));
  document.querySelector('#modal-form').addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.ratings.unshift({ id: uuid('rate'), passenger: user.name, passengerId: user.id || user.name, routeId: values.routeId, stars: Number(values.stars), text: values.text.trim(), date: new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date()) });
    document.querySelector('.modal-backdrop')?.remove();
    persist();
    showToast(t('شكراً لمشاركة تقييمك!', 'Thank you for your feedback!'));
  });
}

function complaintForm() {
  const passenger = data.passengers.find(item => item.name === user.name);
  showModal(t('إرسال شكوى أو ملاحظة', 'Send a complaint or comment'), `<form id="modal-form" class="modal-form"><label>${t('الاسم', 'Your name')}<input name="passenger" required value="${escapeHtml(user.name)}" /></label><label>${t('رقم للتواصل', 'Phone')}<input name="phone" type="tel" required value="${escapeHtml(passenger?.phone || '')}" /></label><label>${t('الخط المتعلق بالشكوى', 'Related route')}<select name="routeId" required>${data.routes.map(route => `<option value="${route.id}">${escapeHtml(routeLabel(route))}</option>`).join('')}</select></label><label>${t('نوع الملاحظة', 'Category')}<select name="category"><option value="تأخر الرحلة">${t('تأخر الرحلة', 'Trip delay')}</option><option value="سلوك السائق">${t('سلوك السائق', 'Driver conduct')}</option><option value="نظافة المركبة">${t('نظافة المركبة', 'Vehicle cleanliness')}</option><option value="الأجرة">${t('الأجرة', 'Fare')}</option><option value="أخرى">${t('أخرى', 'Other')}</option></select></label><label>${t('تفاصيل الملاحظة', 'Details')}<textarea name="text" required minlength="8" rows="4" placeholder="${t('اشرح ما حدث...', 'Tell us what happened...')}"></textarea></label></form><p class="form-hint">${t('ستحصل على رقم متابعة فور الإرسال. بيانات العرض محفوظة على جهازك فقط.', 'You will receive a tracking number. Demo data remains on your device.')}</p>`, t('إرسال الشكوى', 'Submit complaint'));
  document.querySelector('#modal-form').addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const complaint = { id: `C-${Math.floor(2000 + Math.random() * 7999)}`, ...values, passengerId: user.id || user.name, status: 'new', date: new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date()), response: '' };
    while (data.complaints.some(item => item.id === complaint.id)) complaint.id = `C-${Math.floor(2000 + Math.random() * 7999)}`;
    data.complaints.unshift(complaint);
    data.notifications.unshift({ id: uuid('n'), title: t('شكوى جديدة', 'New complaint'), text: `${complaint.id} · ${complaintCategoryLabel(values.category)}`, time: t('الآن', 'Just now'), read: false });
    document.querySelector('.modal-backdrop')?.remove();
    persist();
    complaintFilter = complaint.id;
    render();
    showToast(`${t('تم إرسال شكواك. رقم المتابعة:', 'Complaint submitted. Tracking ID:')} ${complaint.id}`);
  });
}

function routeDetails(id) {
  const route = routeById(id);
  if (!route) return showToast(t('تعذر العثور على الخط.', 'Route not found.'), 'error');
  const vehicles = data.vehicles.filter(item => item.routeId === id);
  showModal(escapeHtml(routeLabel(route)), `<div class="route-detail-summary"><div><small>${t('المدة المتوقعة', 'EST. DURATION')}</small><strong>${route.duration} ${t('دقيقة', 'min')}</strong></div><div><small>${t('المسافة', 'DISTANCE')}</small><strong>${route.distance} ${t('كم', 'km')}</strong></div></div><h3 class="modal-section-title">${t('محطات الرحلة', 'Journey stops')}</h3><div class="detail-stops">${route.stops.map((stop, index) => `<div><i class="${index === 0 || index === route.stops.length - 1 ? 'terminal' : ''}"></i><span>${escapeHtml(stop)}</span>${index === 0 ? `<small>${escapeHtml(route.fromPlace)}</small>` : index === route.stops.length - 1 ? `<small>${escapeHtml(route.toPlace)}</small>` : ''}</div>`).join('')}</div><div class="detail-frequency">◷ ${t('التكرار المتوقع:', 'Estimated frequency:')} ${escapeHtml(route.frequency)}</div><h3 class="modal-section-title">${t('المركبات على هذا الخط', 'Vehicles on this route')}</h3><div class="detail-vehicles">${vehicles.map(vehicle => `<div><span class="bus-icon">▰</span><strong>${escapeHtml(vehicleTypeLabel(vehicle.type))} · ${escapeHtml(vehicle.plate)}</strong>${pill(vehicle.status)}<span>${vehicle.capacity} ${t('مقعد', 'seats')}</span></div>`).join('') || `<p>${t('لا توجد مركبات مرتبطة بهذا الخط بعد.', 'No vehicles assigned to this route yet.')}</p>`}</div>`);
}

function confirmReset() {
  showModal(t('إعادة ضبط بيانات العرض؟', 'Reset demo data?'), `<p class="modal-confirm">${t('ستتم استعادة المركبات والخطوط والطلبات والتقييمات والشكاوى إلى بيانات البداية. لا يمكن التراجع عن ذلك.', 'This restores the original vehicles, routes, applications, ratings, and complaints. This cannot be undone.')}</p>`, t('إعادة ضبط البيانات', 'Reset demo data'));
  const footerButton = document.querySelector('.modal-footer .button-primary');
  footerButton?.addEventListener('click', () => {
    data = resetData();
    document.querySelector('.modal-backdrop')?.remove();
    page = 'dashboard';
    searchTerm = '';
    complaintFilter = '';
    routeFilter = { from: '', to: '' };
    render();
    showToast(t('تمت استعادة بيانات العرض الأصلية.', 'Demo data has been restored.'));
  });
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    page = button.dataset.page;
    searchTerm = '';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  document.querySelectorAll('[data-action]').forEach(element => element.addEventListener('click', event => {
    const action = element.dataset.action;
    if (action !== 'close-modal') event.preventDefault();
    switch (action) {
      case 'home': page = 'home'; user = null; complaintFilter = ''; saveUser(null); render(); break;
      case 'login': renderLogin(); break;
      case 'guest-passenger':
        complaintFilter = '';
        user = { id: 'guest-passenger', name: 'راكب زائر', role: 'passenger', guest: true };
        saveUser(user);
        page = 'dashboard';
        render();
        showToast(t('أهلاً بك! يمكنك استكشاف الرحلات بدون حساب.', 'Welcome! Explore routes without an account.'));
        break;
      case 'language': lang = lang === 'ar' ? 'en' : 'ar'; render(); break;
      case 'logout': user = null; page = 'home'; complaintFilter = ''; saveUser(null); render(); break;
      case 'dashboard': page = 'dashboard'; render(); break;
      case 'reset': confirmReset(); break;
      case 'close-modal': if (event.target === element || element.classList.contains('modal-close')) document.querySelector('.modal-backdrop')?.remove(); break;
      case 'vehicle-form': vehicleForm(); break;
      case 'edit-vehicle': vehicleForm(data.vehicles.find(item => item.id === element.dataset.id)); break;
      case 'vehicle-departure': vehicleDepartureForm(element.dataset.id); break;
      case 'vehicle-return': {
        const vehicle = data.vehicles.find(item => item.id === element.dataset.id);
        if (!vehicle || vehicle.status !== 'busy') break;
        vehicle.status = 'available';
        delete vehicle.departedAt;
        delete vehicle.returnBy;
        vehicle.updated = t('الآن', 'Just now');
        persist();
        showToast(t('تم تسجيل عودة المركبة وإيقاف العدّاد.', 'Vehicle return recorded and timer stopped.'));
        break;
      }
      case 'vehicle-status': {
        const vehicle = data.vehicles.find(item => item.id === element.dataset.id);
        if (!vehicle || vehicle.status !== 'maintenance') break;
        vehicle.status = 'available';
        delete vehicle.departedAt;
        delete vehicle.returnBy;
        vehicle.updated = t('الآن', 'Just now');
        persist(); showToast(t('تم تحديث حالة المركبة.', 'Vehicle status updated.')); break;
      }
      case 'route-form': routeForm(); break;
      case 'edit-route': routeForm(routeById(element.dataset.id)); break;
      case 'route-details': routeDetails(element.dataset.id); break;
      case 'delete-route': {
        const route = routeById(element.dataset.id);
        if (!route) break;
        if (data.vehicles.some(vehicle => vehicle.routeId === route.id)) return showToast(t('لا يمكن حذف خط مرتبط بمركبات. انقل المركبات لخط آخر أولاً.', 'Cannot delete a route that has assigned vehicles. Reassign them first.'), 'error');
        data.routes = data.routes.filter(item => item.id !== route.id);
        persist(); showToast(t('تم حذف الخط.', 'Route deleted.')); break;
      }
      case 'driver-form': driverForm(); break;
      case 'approve-driver':
      case 'reject-driver': {
        const driver = data.drivers.find(item => item.id === element.dataset.id);
        if (!driver) break;
        driver.status = action === 'approve-driver' ? 'approved' : 'rejected';
        data.notifications.unshift({ id: uuid('n'), title: action === 'approve-driver' ? t('تم قبول طلب سائق', 'Driver application approved') : t('تم رفض طلب سائق', 'Driver application rejected'), text: driver.name, time: t('الآن', 'Just now'), read: false });
        persist(); showToast(t(action === 'approve-driver' ? 'تم قبول طلب السائق.' : 'تم رفض طلب السائق.', action === 'approve-driver' ? 'Driver application approved.' : 'Driver application rejected.')); break;
      }
      case 'application-filter': applicationFilter = element.dataset.value; render(); break;
      case 'rating-form': ratingForm(); break;
      case 'new-complaint': complaintForm(); break;
      case 'clear-complaint-filter': complaintFilter = ''; render(); break;
      case 'complaint-status': {
        const complaint = data.complaints.find(item => item.id === element.dataset.id);
        if (!complaint) break;
        complaint.status = element.dataset.status;
        if (complaint.status === 'resolved') complaint.response = t('تمت مراجعة الملاحظة واتخاذ الإجراء اللازم.', 'The report was reviewed and action has been taken.');
        persist(); showToast(t('تم تحديث حالة الشكوى.', 'Complaint status updated.')); break;
      }
      case 'read-notification': {
        const notification = data.notifications.find(item => item.id === element.dataset.id);
        if (notification) notification.read = true;
        persist(); break;
      }
      case 'mark-all-read': data.notifications.forEach(item => { item.read = true; }); persist(); showToast(t('تم تحديد الإشعارات كمقروءة.', 'All notifications marked as read.')); break;
      case 'use-account': {
        const account = demoAccounts.find(item => item.role === element.dataset.role);
        if (account) {
          document.querySelector('#login-role').value = account.role;
          document.querySelector('#login-email').value = account.email;
          document.querySelector('#login-password').value = account.password;
          document.querySelector('#login-error').textContent = '';
        }
        break;
      }
      case 'swap': {
        const from = document.querySelector('[name="from"]')?.value || '';
        const to = document.querySelector('[name="to"]')?.value || '';
        routeFilter = { from: to, to: from };
        render(); break;
      }
      case 'clear-search': routeFilter = { from: '', to: '' }; render(); break;
      case 'profile': showToast(`${currentUserName()} · ${roles[user.role]}`, 'success'); break;
      case 'period': chartPeriod = chartPeriod === 'week' ? 'month' : 'week'; render(); break;
      default: break;
    }
  }));
  const loginForm = document.querySelector('#login-form');
  loginForm?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(loginForm);
    const role = form.get('role');
    const account = demoAccounts.find(item => item.role === role && item.email === form.get('email') && item.password === form.get('password'));
    if (!account) {
      document.querySelector('#login-error').textContent = t('بيانات الدخول غير صحيحة. اختر حساباً من حسابات التجربة.', 'Invalid credentials. Please use one of the demo accounts.');
      return;
    }
    complaintFilter = '';
    user = { name: account.name, role: account.role };
    saveUser(user);
    page = 'dashboard';
    render();
    showToast(`${t('أهلاً بك في العرض التجريبي،', 'Welcome to the demo,')} ${account.name}`);
  });
  document.querySelector('#route-search')?.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    routeFilter = { from: values.get('from'), to: values.get('to') };
    render();
  });
  document.querySelector('#complaint-track-form')?.addEventListener('submit', event => {
    event.preventDefault();
    complaintFilter = new FormData(event.currentTarget).get('trackingId').trim();
    render();
  });
  document.querySelector('#vehicle-filter')?.addEventListener('input', event => {
    searchTerm = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const input = document.querySelector('#vehicle-filter');
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  });
  document.querySelector('.modal-backdrop')?.addEventListener('click', event => {
    if (event.target.classList.contains('modal-backdrop')) event.currentTarget.remove();
  });
}

if (user) {
  const valid = demoAccounts.some(account => account.role === user.role)
    || (user.role === 'passenger' && (user.guest === true && user.id === 'guest-passenger' || data.passengers.some(passenger => passenger.name === user.name)));
  if (!valid) { user = null; saveUser(null); }
}
render();
window.setInterval(updateVehicleTimers, 1000);
