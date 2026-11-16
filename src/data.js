export const centers = [
  { id: 'bani-suef', ar: 'بني سويف', en: 'Beni Suef' },
  { id: 'wasata', ar: 'الواسطى', en: 'Al Wasta' },
  { id: 'nasser', ar: 'ناصر', en: 'Nasser' },
  { id: 'ehnasia', ar: 'إهناسيا', en: 'Ehnasia' },
  { id: 'beba', ar: 'ببا', en: 'Beba' },
  { id: 'sumusta', ar: 'سمسطا', en: 'Sumusta' },
  { id: 'fashn', ar: 'الفشن', en: 'Al Fashn' }
];

export const seedData = {
  meta: { version: 1, demo: true },
  vehicles: [
    { id: 'v1', plate: 'بني س و ٤٥٢١', type: 'ميكروباص', capacity: 14, status: 'available', routeId: 'r1', driver: 'أحمد محمود', updated: 'منذ ٥ دقائق' },
    { id: 'v2', plate: 'بني س و ٨١٣٦', type: 'أتوبيس', capacity: 32, status: 'available', routeId: 'r2', driver: 'محمود عبد الله', updated: 'منذ ١٢ دقيقة' },
    { id: 'v3', plate: 'بني س و ٢٧٠٩', type: 'ميكروباص', capacity: 14, status: 'busy', routeId: 'r3', driver: 'حسن رجب', updated: 'منذ ٣ دقائق' },
    { id: 'v4', plate: 'بني س و ٦٦٤٠', type: 'ميكروباص', capacity: 12, status: 'available', routeId: 'r4', driver: 'طارق سيد', updated: 'منذ ٨ دقائق' },
    { id: 'v5', plate: 'بني س و ١٩٣٣', type: 'أتوبيس', capacity: 28, status: 'maintenance', routeId: 'r5', driver: '—', updated: 'اليوم، ٩:١٥ ص' },
    { id: 'v6', plate: 'بني س و ٥٠٢٧', type: 'ميكروباص', capacity: 14, status: 'available', routeId: 'r6', driver: 'يوسف عادل', updated: 'منذ ١٨ دقيقة' }
  ],
  routes: [
    { id: 'r1', from: 'bani-suef', to: 'wasata', fromPlace: 'موقف محيي الدين', toPlace: 'موقف الواسطى', stops: ['بني سويف', 'الحيبة', 'الواسطى'], duration: 52, fare: 18, distance: 36, frequency: 'كل ١٥ دقيقة', status: 'active' },
    { id: 'r2', from: 'bani-suef', to: 'beba', fromPlace: 'موقف محيي الدين', toPlace: 'موقف ببا', stops: ['بني سويف', 'بني قاسم', 'ببا'], duration: 38, fare: 14, distance: 24, frequency: 'كل ١٠ دقائق', status: 'active' },
    { id: 'r3', from: 'bani-suef', to: 'nasser', fromPlace: 'موقف الأزهري', toPlace: 'موقف ناصر', stops: ['بني سويف', 'باروط', 'أشمنت', 'ناصر'], duration: 34, fare: 12, distance: 19, frequency: 'كل ٢٠ دقيقة', status: 'active' },
    { id: 'r4', from: 'beba', to: 'fashn', fromPlace: 'موقف ببا', toPlace: 'موقف الفشن', stops: ['ببا', 'صفط راشين', 'الفشن'], duration: 41, fare: 16, distance: 27, frequency: 'كل ٢٥ دقيقة', status: 'active' },
    { id: 'r5', from: 'bani-suef', to: 'ehnasia', fromPlace: 'موقف محيي الدين', toPlace: 'موقف إهناسيا', stops: ['بني سويف', 'تزمنت', 'إهناسيا'], duration: 29, fare: 13, distance: 17, frequency: 'كل ٢٠ دقيقة', status: 'active' },
    { id: 'r6', from: 'sumusta', to: 'fashn', fromPlace: 'موقف سمسطا', toPlace: 'موقف الفشن', stops: ['سمسطا', 'دلهانس', 'الفشن'], duration: 32, fare: 15, distance: 21, frequency: 'كل ٣٠ دقيقة', status: 'active' },
    { id: 'r7', from: 'bani-suef', to: 'sumusta', fromPlace: 'موقف محيي الدين', toPlace: 'موقف سمسطا', stops: ['بني سويف', 'إهناسيا', 'سمسطا'], duration: 55, fare: 22, distance: 39, frequency: 'كل ٣٠ دقيقة', status: 'active' },
    { id: 'r8', from: 'wasata', to: 'nasser', fromPlace: 'موقف الواسطى', toPlace: 'موقف ناصر', stops: ['الواسطى', 'الميمون', 'ناصر'], duration: 45, fare: 19, distance: 31, frequency: 'كل ٣٥ دقيقة', status: 'active' }
  ],
  drivers: [
    { id: 'd1', name: 'أحمد محمود عبد الرحيم', phone: '01012345678', nationalId: '٢٩٠٠١٢٣١٢٣٤٥٦٧', center: 'bani-suef', vehicle: 'ميكروباص', status: 'approved', applied: '١٢ أكتوبر ٢٠٢٦' },
    { id: 'd2', name: 'محمود عبد الله حسن', phone: '01098765432', nationalId: '٢٨٥٠٢٢٤١٢٣٤٥٦٧', center: 'wasata', vehicle: 'أتوبيس', status: 'approved', applied: '١٠ أكتوبر ٢٠٢٦' },
    { id: 'd3', name: 'سيد إبراهيم علي', phone: '01124567890', nationalId: '٢٩٢٠٧١٥١٢٣٤٥٦٧', center: 'beba', vehicle: 'ميكروباص', status: 'pending', applied: '١٤ نوفمبر ٢٠٢٦' },
    { id: 'd4', name: 'إسلام رجب محمد', phone: '01024681357', nationalId: '٢٨٨٠٣١١١٢٣٤٥٦٧', center: 'nasser', vehicle: 'ميكروباص', status: 'pending', applied: '١٥ نوفمبر ٢٠٢٦' },
    { id: 'd5', name: 'طارق سيد أمين', phone: '01234567891', nationalId: '٢٨٧٠٩٠٢١٢٣٤٥٦٧', center: 'ehnasia', vehicle: 'ميكروباص', status: 'rejected', applied: '٨ أكتوبر ٢٠٢٦' }
  ],
  passengers: [
    { id: 'p1', name: 'مريم أحمد', phone: '01055550101', trips: 24 },
    { id: 'p2', name: 'عمر محمد', phone: '01055550102', trips: 17 },
    { id: 'p3', name: 'سلمى حسن', phone: '01055550103', trips: 9 },
    { id: 'p4', name: 'يوسف علي', phone: '01055550104', trips: 31 }
  ],
  ratings: [
    { id: 'rate1', passenger: 'مريم أحمد', routeId: 'r1', stars: 5, text: 'رحلة مريحة والسائق متعاون', date: '١٤ نوفمبر ٢٠٢٦' },
    { id: 'rate2', passenger: 'عمر محمد', routeId: 'r2', stars: 4, text: 'المواعيد جيدة، نتمنى زيادة الرحلات', date: '١٣ نوفمبر ٢٠٢٦' },
    { id: 'rate3', passenger: 'سلمى حسن', routeId: 'r5', stars: 5, text: 'وصول سريع وخدمة ممتازة', date: '١٢ نوفمبر ٢٠٢٦' },
    { id: 'rate4', passenger: 'يوسف علي', routeId: 'r3', stars: 3, text: 'المركبة جيدة لكن مزدحمة', date: '١١ نوفمبر ٢٠٢٦' }
  ],
  complaints: [
    { id: 'C-2048', passenger: 'مريم أحمد', phone: '01055550101', routeId: 'r1', category: 'تأخر الرحلة', text: 'انتظرت أكثر من نصف ساعة في الموقف.', status: 'in_progress', date: '١٥ نوفمبر ٢٠٢٦', response: '' },
    { id: 'C-2047', passenger: 'عمر محمد', phone: '01055550102', routeId: 'r2', category: 'سلوك السائق', text: 'السائق لم يلتزم بموقف النزول المحدد.', status: 'resolved', date: '١٤ نوفمبر ٢٠٢٦', response: 'تمت مراجعة الرحلة وتنبيه السائق.' },
    { id: 'C-2046', passenger: 'سلمى حسن', phone: '01055550103', routeId: 'r5', category: 'نظافة المركبة', text: 'المركبة بحاجة إلى تنظيف أفضل.', status: 'new', date: '١٥ نوفمبر ٢٠٢٦', response: '' }
  ],
  notifications: [
    { id: 'n1', title: 'طلب تسجيل سائق جديد', text: 'سيد إبراهيم علي — مركز ببا', time: 'منذ ٢٥ دقيقة', read: false },
    { id: 'n2', title: 'تقييم جديد للخط', text: 'خط بني سويف – ببا: ٤ نجوم', time: 'منذ ساعة', read: false },
    { id: 'n3', title: 'تم إغلاق شكوى', text: 'الشكوى C-2047 تم حلها', time: 'أمس', read: true }
  ],
  stations: [
    { name: 'موقف محيي الدين', center: 'bani-suef', type: 'رئيسي' },
    { name: 'موقف الأزهري', center: 'bani-suef', type: 'فرعي' },
    { name: 'موقف الواسطى', center: 'wasata', type: 'رئيسي' },
    { name: 'موقف ناصر', center: 'nasser', type: 'رئيسي' },
    { name: 'موقف إهناسيا', center: 'ehnasia', type: 'رئيسي' },
    { name: 'موقف ببا', center: 'beba', type: 'رئيسي' },
    { name: 'موقف سمسطا', center: 'sumusta', type: 'رئيسي' },
    { name: 'موقف الفشن', center: 'fashn', type: 'رئيسي' }
  ]
};

export const demoAccounts = [
  { role: 'driver', name: 'أحمد محمود', email: 'driver@demo.local', password: 'driver123' },
  { role: 'admin', name: 'مدير محطة محيي الدين', email: 'admin@demo.local', password: 'admin123' },
  { role: 'super', name: 'مدير النظام', email: 'super@demo.local', password: 'super123' }
];

export const centerName = (id, lang = 'ar') => centers.find(center => center.id === id)?.[lang] ?? id;
