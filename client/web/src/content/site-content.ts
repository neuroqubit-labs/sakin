export type NavItem = {
  href: string
  label: string
}

export type ServiceItem = {
  title: string
  description: string
  bullets: string[]
}

export type FeatureItem = {
  eyebrow: string
  title: string
  description: string
  points: string[]
}

export type JourneyStep = {
  step: string
  title: string
  description: string
}

export type FAQItem = {
  question: string
  answer: string
}

export type ContactChannel = {
  title: string
  value: string
  href: string
  detail: string
}

export type HeroPanelItem = {
  label: string
  value: string
}

export type NarrativeCard = {
  title: string
  description: string
}

export type BrandAssetSet = {
  primary: string
  dark: string
  light: string
  mark: string
}

export const siteConfig = {
  companyName: 'Wafra Software',
  productName: 'Sakin Yönetim',
  siteName: 'Wafra Software',
  relationshipLabel: 'Sakin Yönetim platformu',
  ownerStatement: 'Sakin Yönetim platformu, Wafra Software tarafından sunulur.',
  ownershipBadgeLabel: 'Wafra Software',
  ownershipBadgeText: 'Sakin Yönetim, Wafra Software ürünüdür.',
  operatorUrl: 'https://wafrasoftware.com.tr',
  brand: {
    logos: {
      primary: '/brand/wafra/logo-primary.png',
      dark: '/brand/wafra/logo-black.png',
      light: '/brand/wafra/logo-white.png',
      mark: '/brand/wafra/icon.png',
    } satisfies BrandAssetSet,
  },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sakinyonetim.tr',
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.sakinyonetim.tr',
  description:
    'Wafra Software tarafından sunulan Sakin Yönetim, bina yönetim firmaları için tahsilat, finans, gider ve sakin iletişimini tek platformda toplayan kurumsal SaaS deneyimi sunar.',
  phone: '+90 (352) 000 00 00',
  email: 'merhaba@sakinyonetim.tr',
  location: 'Kayseri, Türkiye',
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/hizmetler', label: 'Hizmetler' },
  { href: '/urun', label: 'Ürün' },
  { href: '/neden-sakin', label: 'Neden Sakin' },
  { href: '/iletisim', label: 'İletişim' },
]

export const heroStats = [
  { label: 'Operasyon odağı', value: 'Tahsilat, gider ve iletişim tek panelde' },
  { label: 'Kurumsal yapı', value: 'Çoklu bina yönetimi için ölçeklenebilir süreç' },
  { label: 'Karar desteği', value: 'Portföy, daire ve borç verisini tek akışta izleyin' },
]

export const serviceItems: ServiceItem[] = [
  {
    title: 'Tahsilat ve aidat takibi',
    description: 'Tahakkuk, gecikme ve ödeme hareketleri tek görünümde; ekip hızlı aksiyon alır.',
    bullets: [
      'Gecikme ve borçlu daireleri saniyeler içinde filtreleme',
      'Tahsilat performansını bina ve dönem bazında izleme',
      'Aksiyon listelerini ekip akışına bağlama',
    ],
  },
  {
    title: 'Gider ve finansal şeffaflık',
    description: 'Gider, tahsilat ve bütçe görünürlüğünü yönetime tek dilde sunar.',
    bullets: [
      'Gider kalemlerini kategorik ve denetlenebilir şekilde kaydetme',
      'Bina bazında gelir–gider ve bakiye görünümü',
      'Paydaşlara net, açıklanabilir finansal dil',
    ],
  },
  {
    title: 'Sakin iletişimi ve duyurular',
    description: 'Duyuru, bilgilendirme ve hatırlatma süreçleri tek merkezden yönetilir.',
    bullets: [
      'Duyuru ve bilgilendirmeleri zamanlayarak paylaşma',
      'Tahsilat hatırlatmalarını ilgili kayda bağlama',
      'İletişim geçmişini tek ekranda izleme',
    ],
  },
  {
    title: 'Portföy ve bina operasyonu',
    description: 'Çoklu bina yönetimi için portföyden daireye akış kopmadan ilerler.',
    bullets: [
      'Portföy görünümünden bina detayına tek tıkla geçiş',
      'Daire, sakin ve borç bilgisini tek doğruluk kaynağı',
      'Ekip içi sorumlulukları netleştiren iş düzeni',
    ],
  },
]

export const featureItems: FeatureItem[] = [
  {
    eyebrow: 'Portföy merkezi',
    title: 'Portföy görünümüyle ekipleri aynı bağlamda toplayan başlangıç yüzeyi.',
    description:
      'Yönetilen bina sayısı artsa da ekip aynı ekran dilinde ilerler.',
    points: [
      'Portföy sağlık göstergeleri ve kritik uyarılar tek ekranda',
      'Bina bağlamı kaybolmadan işlem akışı',
      'Rapor değil aksiyon başlatan giriş ekranı',
    ],
  },
  {
    eyebrow: 'Tahsilat kontrolü',
    title: 'Tahsilat, gecikme ve performansı yöneten operasyon katmanı.',
    description:
      'Geciken kayıtlar ve performans metriği aynı akışta görülür.',
    points: [
      'Gecikmeleri otomatik önceliklendirme',
      'Dönemsel tahsilat eğilimini izleme',
      'Aksiyon adımlarını kısaltan hızlı işlem alanları',
    ],
  },
  {
    eyebrow: 'Daire ve sakin kaydı',
    title: 'Daire, sahiplik ve iletişim bilgilerini tek doğruluk kaynağında yönetin.',
    description:
      'Operasyon ve finans verisi daire bazında bütünleşik kalır.',
    points: [
      'Daire geçmişini koruyan düzenli kayıt',
      'Sakin ve durum bilgisini okunur tek satır',
      'Sık kullanılan güncellemeleri hızlandıran düzen',
    ],
  },
]

export const journeySteps: JourneyStep[] = [
  {
    step: '01',
    title: 'Portföy fotoğrafı',
    description: 'Kritik bina, gecikme ve aksiyonlar ilk ekranda görünür.',
  },
  {
    step: '02',
    title: 'Bina bağlamına geçin',
    description: 'Ekip doğru binaya ve sorumluluklara hızla iner.',
  },
  {
    step: '03',
    title: 'Tahsilat ve borç yönetimi',
    description: 'Aidat ve gecikme akışları tek panelde yönetilir.',
  },
  {
    step: '04',
    title: 'İletişimi tamamlayın',
    description: 'Duyuru ve hatırlatma süreci ilgili kayda bağlı ilerler.',
  },
]

export const whySakinPoints = [
  {
    title: 'Sektör pratiğiyle uyumlu',
    description:
      'Mevcut işleyişi bozmadan daha düzenli ve izlenebilir bir akış kurar.',
  },
  {
    title: 'Kurumsal ama hafif',
    description:
      'Günlük kullanımda hızlı, yönetime karşı güçlü bir sunum dili sağlar.',
  },
  {
    title: 'Aksiyon odaklı',
    description:
      'Ekranları bilgi göstermek için değil karar ve işlem başlatmak için tasarlarız.',
  },
]

export const faqs: FAQItem[] = [
  {
    question: 'Sakin Yönetim kimler için uygun?',
    answer:
      'Çoklu bina veya site yöneten, operasyonunu dijitalleştirip ölçeklemek isteyen bina yönetim firmaları için uygundur.',
  },
  {
    question: 'Site sakinleri için ayrı bir yüzey var mı?',
    answer:
      'Firma ekranı ve sakin deneyimi ayrıdır; markalı iletişim ve ödeme süreçleri tutarlı biçimde yönetilir.',
  },
  {
    question: 'İlk kurulumda tüm süreçleri aynı anda taşımak gerekir mi?',
    answer:
      'Hayır. V1’de tahsilat ve günlük operasyon odaklı kademeli geçiş öneriyoruz.',
  },
]

export const contactChannels: ContactChannel[] = [
  {
    title: 'Telefon',
    value: siteConfig.phone,
    href: 'tel:+903520000000',
    detail: 'Demo, tanıtım ve ihtiyaç analizi için hızlı iletişim.',
  },
  {
    title: 'E-posta',
    value: siteConfig.email,
    href: `mailto:${siteConfig.email}`,
    detail: 'Portföy yapınızı ve önceliklerinizi kısaca paylaşabilirsiniz.',
  },
  {
    title: 'Konum',
    value: siteConfig.location,
    href: 'https://www.google.com/maps/search/Kayseri',
    detail: 'Türkiye genelindeki yönetim firmaları için kurumsal çözüm.',
  },
]

export const servicesHeroPanel: HeroPanelItem[] = [
  { label: 'Ana başlık', value: 'Tahsilat, finans, gider ve iletişim tek platform' },
  { label: 'Kullanım biçimi', value: 'Günlük operasyonu hızlandıran kurumsal SaaS' },
  { label: 'Hedef ekip', value: 'Çoklu bina yöneten yönetim firmaları' },
]

export const productHeroPanel: HeroPanelItem[] = [
  { label: 'Odak', value: 'Portföy görünümünden aksiyona tek akış' },
  { label: 'Ürün dili', value: 'Karar ve işlem odaklı sade arayüz' },
  { label: 'İlk izlenim', value: 'Profesyonel, güven veren B2B deneyimi' },
]

export const whyHeroPanel: HeroPanelItem[] = [
  { label: 'Yaklaşım', value: 'Sektör pratiğiyle uyumlu operasyon tasarımı' },
  { label: 'Tasarım tavrı', value: 'Gösteriş yerine netlik ve güven' },
  { label: 'Amaç', value: 'Ekiplerin işi daha hızlı sonuçlandırması' },
]

export const contactHeroPanel: HeroPanelItem[] = [
  { label: 'Demo tipi', value: 'Şeffaf V1 demo kurgusu' },
  { label: 'İletişim tonu', value: 'Kurumsal, doğrudan ve ölçülü' },
  { label: 'Sonraki adım', value: 'İhtiyaç analizi ve uygun akış' },
]

export const serviceOutcomes: NarrativeCard[] = [
  {
    title: 'Öncelik sırası netleşir',
    description:
      'Günlük aksiyon listesi, konuşmadan önce ekranda görünür.',
  },
  {
    title: 'Finansal görünürlük artar',
    description:
      'Gelir, gider ve bakiye tek dilde raporlanır.',
  },
  {
    title: 'İletişim kayıt altına alınır',
    description:
      'Bilgilendirme ve hatırlatmalar operasyonun izlenebilir parçası olur.',
  },
]

export const productPrinciples: NarrativeCard[] = [
  {
    title: 'Bağlamı koruyan akış',
    description:
      'Portföy, bina ve daire arasında kesinti yaşatmaz.',
  },
  {
    title: 'Profesyonel görsel hiyerarşi',
    description:
      'Güçlü kurumsal görünüm, gündelik kullanımda hız ve netlik sağlar.',
  },
  {
    title: 'Aksiyon odaklı yapı',
    description:
      'Her ekran karar aldırır veya işlem başlatır.',
  },
]

export const whyFramework: NarrativeCard[] = [
  {
    title: 'Sahadaki gerçeklikle uyum',
    description:
      'Mevcut araçları yok saymadan daha düzenli bir sistem kurar.',
  },
  {
    title: 'Finans tarafına kurumsal ciddiyet',
    description:
      'Tahsilat ve ödeme akışları güven verir, açıklanabilir kalır.',
  },
  {
    title: 'Hızlı adaptasyon',
    description:
      'Yeni ekipler kısa sürede yönünü bulur; öğrenme eşiği düşüktür.',
  },
]

export const noHypePrinciples: NarrativeCard[] = [
  {
    title: 'Gerçekçi vaat, net kapsam',
    description: 'Güveni şişirilmiş metriklerle değil net kapsamla kurarız.',
  },
  {
    title: 'Her şeyi çözdük demiyoruz',
    description: 'Öncelik, en yoğun operasyon yüklerini somut şekilde azaltmak.',
  },
  {
    title: 'Pazarlama klişesi yok',
    description: 'Hedefimiz gösteriş değil; uygun firmada net değer algısı oluşturmak.',
  },
]

export const contactAgenda: NarrativeCard[] = [
  {
    title: 'Portföy yapısını netleştiririz',
    description: 'Bina sayısı, yapı tipi ve ekip ölçeğini birlikte belirleriz.',
  },
  {
    title: 'Önceliği tespit ederiz',
    description: 'Tahsilat, gider veya iletişim yükünü veriye göre sıralarız.',
  },
  {
    title: 'Demo akışını planlarız',
    description: 'Firmanızın iş modeline uygun kısa bir demo kurgularız.',
  },
]
