import type { Locale } from "@/lib/i18n/config";

/**
 * UI copy, per locale.
 *
 * Only the site's own text lives here. Listings are written by the business
 * owners themselves and are shown as written — machine-translating someone's
 * description of their own work reads badly and undermines the trust a
 * directory sells.
 *
 * English is the source of truth; every other locale must supply the same keys,
 * which the Dictionary type enforces at build time.
 */
export type Dictionary = {
  nav: { listings: string; categories: string; blog: string; login: string; addProfile: string; search: string; searchPlaceholder: string; theme: string; language: string };
  common: { browse: string; viewAll: string; readMore: string; loading: string; noResults: string; backHome: string };
  home: { heroEyebrow: string; heroTitle: string; heroSubtitle: string; popularNow: string; trending: string; categoriesTitle: string; featured: string };
  auth: {
    signInTitle: string; signInSubtitle: string; signUpTitle: string; signUpSubtitle: string;
    email: string; password: string; name: string; rememberMe: string; forgotPassword: string;
    signIn: string; createAccount: string; noAccount: string; haveAccount: string;
    consent: string; terms: string; privacy: string; ageConfirm: string;
  };
  footer: { explore: string; company: string; getStarted: string; legal: string; about: string; contact: string; privacy: string; terms: string; disclaimer: string; rights: string; tagline: string };
  listings: { title: string; subtitle: string; filters: string; sortBy: string; resultsFor: string };
};

const en: Dictionary = {
  nav: { listings: "Listings", categories: "Categories", blog: "Blog", login: "Login", addProfile: "Add Profile", search: "Search", searchPlaceholder: "Search providers, services, cities…", theme: "Theme", language: "Language" },
  common: { browse: "Browse", viewAll: "View all", readMore: "Read more", loading: "Loading…", noResults: "No results found", backHome: "Back to home" },
  home: { heroEyebrow: "Global expert directory", heroTitle: "Find trusted service providers worldwide.", heroSubtitle: "Compare ratings, reviews, availability and pricing.", popularNow: "Popular now", trending: "Trending now", categoriesTitle: "Browse service categories", featured: "Featured providers" },
  auth: {
    signInTitle: "Sign in to your account", signInSubtitle: "Use your registered email to continue.",
    signUpTitle: "Create your account", signUpSubtitle: "Join to save providers and manage your listing.",
    email: "Email Address", password: "Password", name: "Full Name", rememberMe: "Remember me", forgotPassword: "Forgot password?",
    signIn: "Sign In", createAccount: "Create Account", noAccount: "Don't have an account?", haveAccount: "Already have an account?",
    consent: "I agree to the", terms: "Terms of Service", privacy: "Privacy Policy", ageConfirm: "and I confirm I am at least 18 years old."
  },
  footer: { explore: "Explore", company: "Company", getStarted: "Get started", legal: "Legal", about: "About us", contact: "Contact", privacy: "Privacy policy", terms: "Terms of service", disclaimer: "Disclaimer", rights: "All rights reserved.", tagline: "Verified service providers, honest reviews and transparent pricing." },
  listings: { title: "Compare service provider listings", subtitle: "Recently approved professionals", filters: "Filters", sortBy: "Sort by", resultsFor: "Results for" }
};

const esES: Dictionary = {
  nav: { listings: "Anuncios", categories: "Categorías", blog: "Blog", login: "Iniciar sesión", addProfile: "Añadir perfil", search: "Buscar", searchPlaceholder: "Busca profesionales, servicios, ciudades…", theme: "Tema", language: "Idioma" },
  common: { browse: "Explorar", viewAll: "Ver todo", readMore: "Leer más", loading: "Cargando…", noResults: "No se encontraron resultados", backHome: "Volver al inicio" },
  home: { heroEyebrow: "Directorio global de expertos", heroTitle: "Encuentra profesionales de confianza en todo el mundo.", heroSubtitle: "Compara valoraciones, reseñas, disponibilidad y precios.", popularNow: "Populares ahora", trending: "Tendencias", categoriesTitle: "Explora las categorías de servicios", featured: "Profesionales destacados" },
  auth: {
    signInTitle: "Inicia sesión en tu cuenta", signInSubtitle: "Usa tu correo registrado para continuar.",
    signUpTitle: "Crea tu cuenta", signUpSubtitle: "Únete para guardar profesionales y gestionar tu anuncio.",
    email: "Correo electrónico", password: "Contraseña", name: "Nombre completo", rememberMe: "Recuérdame", forgotPassword: "¿Olvidaste tu contraseña?",
    signIn: "Iniciar sesión", createAccount: "Crear cuenta", noAccount: "¿No tienes una cuenta?", haveAccount: "¿Ya tienes una cuenta?",
    consent: "Acepto los", terms: "Términos del servicio", privacy: "Política de privacidad", ageConfirm: "y confirmo que tengo al menos 18 años."
  },
  footer: { explore: "Explorar", company: "Empresa", getStarted: "Empezar", legal: "Legal", about: "Sobre nosotros", contact: "Contacto", privacy: "Política de privacidad", terms: "Términos del servicio", disclaimer: "Aviso legal", rights: "Todos los derechos reservados.", tagline: "Profesionales verificados, reseñas honestas y precios transparentes." },
  listings: { title: "Compara los anuncios de profesionales", subtitle: "Profesionales aprobados recientemente", filters: "Filtros", sortBy: "Ordenar por", resultsFor: "Resultados para" }
};

const frFR: Dictionary = {
  nav: { listings: "Annonces", categories: "Catégories", blog: "Blog", login: "Connexion", addProfile: "Ajouter un profil", search: "Rechercher", searchPlaceholder: "Rechercher des prestataires, services, villes…", theme: "Thème", language: "Langue" },
  common: { browse: "Parcourir", viewAll: "Tout voir", readMore: "Lire la suite", loading: "Chargement…", noResults: "Aucun résultat trouvé", backHome: "Retour à l'accueil" },
  home: { heroEyebrow: "Annuaire mondial d'experts", heroTitle: "Trouvez des prestataires de confiance partout dans le monde.", heroSubtitle: "Comparez les notes, les avis, les disponibilités et les tarifs.", popularNow: "Populaires en ce moment", trending: "Tendances", categoriesTitle: "Parcourir les catégories de services", featured: "Prestataires en vedette" },
  auth: {
    signInTitle: "Connectez-vous à votre compte", signInSubtitle: "Utilisez votre adresse e-mail enregistrée pour continuer.",
    signUpTitle: "Créez votre compte", signUpSubtitle: "Inscrivez-vous pour enregistrer des prestataires et gérer votre annonce.",
    email: "Adresse e-mail", password: "Mot de passe", name: "Nom complet", rememberMe: "Se souvenir de moi", forgotPassword: "Mot de passe oublié ?",
    signIn: "Se connecter", createAccount: "Créer un compte", noAccount: "Vous n'avez pas de compte ?", haveAccount: "Vous avez déjà un compte ?",
    consent: "J'accepte les", terms: "Conditions d'utilisation", privacy: "Politique de confidentialité", ageConfirm: "et je confirme avoir au moins 18 ans."
  },
  footer: { explore: "Explorer", company: "Entreprise", getStarted: "Commencer", legal: "Mentions légales", about: "À propos", contact: "Contact", privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", disclaimer: "Avertissement", rights: "Tous droits réservés.", tagline: "Des prestataires vérifiés, des avis honnêtes et des prix transparents." },
  listings: { title: "Comparez les annonces de prestataires", subtitle: "Professionnels récemment approuvés", filters: "Filtres", sortBy: "Trier par", resultsFor: "Résultats pour" }
};

const deDE: Dictionary = {
  nav: { listings: "Anzeigen", categories: "Kategorien", blog: "Blog", login: "Anmelden", addProfile: "Profil hinzufügen", search: "Suchen", searchPlaceholder: "Anbieter, Leistungen, Städte suchen…", theme: "Design", language: "Sprache" },
  common: { browse: "Durchsuchen", viewAll: "Alle ansehen", readMore: "Weiterlesen", loading: "Wird geladen…", noResults: "Keine Ergebnisse gefunden", backHome: "Zurück zur Startseite" },
  home: { heroEyebrow: "Globales Expertenverzeichnis", heroTitle: "Finden Sie weltweit vertrauenswürdige Dienstleister.", heroSubtitle: "Vergleichen Sie Bewertungen, Rezensionen, Verfügbarkeit und Preise.", popularNow: "Gerade beliebt", trending: "Im Trend", categoriesTitle: "Dienstleistungskategorien durchsuchen", featured: "Empfohlene Anbieter" },
  auth: {
    signInTitle: "Melden Sie sich bei Ihrem Konto an", signInSubtitle: "Verwenden Sie Ihre registrierte E-Mail-Adresse, um fortzufahren.",
    signUpTitle: "Konto erstellen", signUpSubtitle: "Registrieren Sie sich, um Anbieter zu speichern und Ihre Anzeige zu verwalten.",
    email: "E-Mail-Adresse", password: "Passwort", name: "Vollständiger Name", rememberMe: "Angemeldet bleiben", forgotPassword: "Passwort vergessen?",
    signIn: "Anmelden", createAccount: "Konto erstellen", noAccount: "Noch kein Konto?", haveAccount: "Sie haben bereits ein Konto?",
    consent: "Ich akzeptiere die", terms: "Nutzungsbedingungen", privacy: "Datenschutzerklärung", ageConfirm: "und bestätige, dass ich mindestens 18 Jahre alt bin."
  },
  footer: { explore: "Entdecken", company: "Unternehmen", getStarted: "Loslegen", legal: "Rechtliches", about: "Über uns", contact: "Kontakt", privacy: "Datenschutzerklärung", terms: "Nutzungsbedingungen", disclaimer: "Haftungsausschluss", rights: "Alle Rechte vorbehalten.", tagline: "Geprüfte Dienstleister, ehrliche Bewertungen und transparente Preise." },
  listings: { title: "Anbieteranzeigen vergleichen", subtitle: "Kürzlich freigegebene Fachleute", filters: "Filter", sortBy: "Sortieren nach", resultsFor: "Ergebnisse für" }
};

const itIT: Dictionary = {
  nav: { listings: "Annunci", categories: "Categorie", blog: "Blog", login: "Accedi", addProfile: "Aggiungi profilo", search: "Cerca", searchPlaceholder: "Cerca professionisti, servizi, città…", theme: "Tema", language: "Lingua" },
  common: { browse: "Esplora", viewAll: "Vedi tutto", readMore: "Leggi di più", loading: "Caricamento…", noResults: "Nessun risultato trovato", backHome: "Torna alla home" },
  home: { heroEyebrow: "Directory globale di esperti", heroTitle: "Trova professionisti affidabili in tutto il mondo.", heroSubtitle: "Confronta valutazioni, recensioni, disponibilità e prezzi.", popularNow: "Popolari ora", trending: "Di tendenza", categoriesTitle: "Esplora le categorie di servizi", featured: "Professionisti in evidenza" },
  auth: {
    signInTitle: "Accedi al tuo account", signInSubtitle: "Usa la tua email registrata per continuare.",
    signUpTitle: "Crea il tuo account", signUpSubtitle: "Iscriviti per salvare professionisti e gestire il tuo annuncio.",
    email: "Indirizzo email", password: "Password", name: "Nome completo", rememberMe: "Ricordami", forgotPassword: "Password dimenticata?",
    signIn: "Accedi", createAccount: "Crea account", noAccount: "Non hai un account?", haveAccount: "Hai già un account?",
    consent: "Accetto i", terms: "Termini di servizio", privacy: "Informativa sulla privacy", ageConfirm: "e confermo di avere almeno 18 anni."
  },
  footer: { explore: "Esplora", company: "Azienda", getStarted: "Inizia", legal: "Note legali", about: "Chi siamo", contact: "Contatti", privacy: "Informativa sulla privacy", terms: "Termini di servizio", disclaimer: "Avvertenza", rights: "Tutti i diritti riservati.", tagline: "Professionisti verificati, recensioni oneste e prezzi trasparenti." },
  listings: { title: "Confronta gli annunci dei professionisti", subtitle: "Professionisti approvati di recente", filters: "Filtri", sortBy: "Ordina per", resultsFor: "Risultati per" }
};

const ptPT: Dictionary = {
  nav: { listings: "Anúncios", categories: "Categorias", blog: "Blog", login: "Entrar", addProfile: "Adicionar perfil", search: "Pesquisar", searchPlaceholder: "Pesquisar profissionais, serviços, cidades…", theme: "Tema", language: "Idioma" },
  common: { browse: "Explorar", viewAll: "Ver tudo", readMore: "Ler mais", loading: "A carregar…", noResults: "Nenhum resultado encontrado", backHome: "Voltar ao início" },
  home: { heroEyebrow: "Diretório global de especialistas", heroTitle: "Encontre profissionais de confiança em todo o mundo.", heroSubtitle: "Compare classificações, avaliações, disponibilidade e preços.", popularNow: "Populares agora", trending: "Em alta", categoriesTitle: "Explorar categorias de serviços", featured: "Profissionais em destaque" },
  auth: {
    signInTitle: "Entre na sua conta", signInSubtitle: "Use o seu email registado para continuar.",
    signUpTitle: "Crie a sua conta", signUpSubtitle: "Registe-se para guardar profissionais e gerir o seu anúncio.",
    email: "Endereço de email", password: "Palavra-passe", name: "Nome completo", rememberMe: "Lembrar-me", forgotPassword: "Esqueceu-se da palavra-passe?",
    signIn: "Entrar", createAccount: "Criar conta", noAccount: "Ainda não tem conta?", haveAccount: "Já tem uma conta?",
    consent: "Aceito os", terms: "Termos de serviço", privacy: "Política de privacidade", ageConfirm: "e confirmo que tenho pelo menos 18 anos."
  },
  footer: { explore: "Explorar", company: "Empresa", getStarted: "Começar", legal: "Legal", about: "Sobre nós", contact: "Contacto", privacy: "Política de privacidade", terms: "Termos de serviço", disclaimer: "Aviso legal", rights: "Todos os direitos reservados.", tagline: "Profissionais verificados, avaliações honestas e preços transparentes." },
  listings: { title: "Compare os anúncios de profissionais", subtitle: "Profissionais aprovados recentemente", filters: "Filtros", sortBy: "Ordenar por", resultsFor: "Resultados para" }
};

const ruRU: Dictionary = {
  nav: { listings: "Объявления", categories: "Категории", blog: "Блог", login: "Войти", addProfile: "Добавить профиль", search: "Поиск", searchPlaceholder: "Поиск специалистов, услуг, городов…", theme: "Тема", language: "Язык" },
  common: { browse: "Обзор", viewAll: "Смотреть все", readMore: "Подробнее", loading: "Загрузка…", noResults: "Ничего не найдено", backHome: "На главную" },
  home: { heroEyebrow: "Глобальный каталог специалистов", heroTitle: "Найдите проверенных специалистов по всему миру.", heroSubtitle: "Сравнивайте рейтинги, отзывы, доступность и цены.", popularNow: "Популярно сейчас", trending: "В тренде", categoriesTitle: "Категории услуг", featured: "Рекомендуемые специалисты" },
  auth: {
    signInTitle: "Войдите в свой аккаунт", signInSubtitle: "Используйте зарегистрированную почту, чтобы продолжить.",
    signUpTitle: "Создайте аккаунт", signUpSubtitle: "Зарегистрируйтесь, чтобы сохранять специалистов и управлять объявлением.",
    email: "Адрес электронной почты", password: "Пароль", name: "Полное имя", rememberMe: "Запомнить меня", forgotPassword: "Забыли пароль?",
    signIn: "Войти", createAccount: "Создать аккаунт", noAccount: "Нет аккаунта?", haveAccount: "Уже есть аккаунт?",
    consent: "Я принимаю", terms: "Условия использования", privacy: "Политику конфиденциальности", ageConfirm: "и подтверждаю, что мне исполнилось 18 лет."
  },
  footer: { explore: "Обзор", company: "Компания", getStarted: "Начать", legal: "Правовая информация", about: "О нас", contact: "Контакты", privacy: "Политика конфиденциальности", terms: "Условия использования", disclaimer: "Отказ от ответственности", rights: "Все права защищены.", tagline: "Проверенные специалисты, честные отзывы и прозрачные цены." },
  listings: { title: "Сравните объявления специалистов", subtitle: "Недавно одобренные специалисты", filters: "Фильтры", sortBy: "Сортировать по", resultsFor: "Результаты по запросу" }
};

const csCZ: Dictionary = {
  nav: { listings: "Inzeráty", categories: "Kategorie", blog: "Blog", login: "Přihlásit se", addProfile: "Přidat profil", search: "Hledat", searchPlaceholder: "Hledejte poskytovatele, služby, města…", theme: "Motiv", language: "Jazyk" },
  common: { browse: "Procházet", viewAll: "Zobrazit vše", readMore: "Číst dál", loading: "Načítání…", noResults: "Nenalezeny žádné výsledky", backHome: "Zpět na úvod" },
  home: { heroEyebrow: "Globální adresář odborníků", heroTitle: "Najděte důvěryhodné poskytovatele služeb po celém světě.", heroSubtitle: "Porovnejte hodnocení, recenze, dostupnost a ceny.", popularNow: "Právě populární", trending: "Trendy", categoriesTitle: "Procházet kategorie služeb", featured: "Doporučení poskytovatelé" },
  auth: {
    signInTitle: "Přihlaste se ke svému účtu", signInSubtitle: "Pokračujte pomocí registrovaného e-mailu.",
    signUpTitle: "Vytvořte si účet", signUpSubtitle: "Zaregistrujte se, abyste mohli ukládat poskytovatele a spravovat svůj inzerát.",
    email: "E-mailová adresa", password: "Heslo", name: "Celé jméno", rememberMe: "Zapamatovat si mě", forgotPassword: "Zapomněli jste heslo?",
    signIn: "Přihlásit se", createAccount: "Vytvořit účet", noAccount: "Nemáte účet?", haveAccount: "Již máte účet?",
    consent: "Souhlasím s", terms: "Podmínkami služby", privacy: "Zásadami ochrany osobních údajů", ageConfirm: "a potvrzuji, že je mi alespoň 18 let."
  },
  footer: { explore: "Prozkoumat", company: "Společnost", getStarted: "Začít", legal: "Právní informace", about: "O nás", contact: "Kontakt", privacy: "Zásady ochrany osobních údajů", terms: "Podmínky služby", disclaimer: "Vyloučení odpovědnosti", rights: "Všechna práva vyhrazena.", tagline: "Ověření poskytovatelé, poctivé recenze a transparentní ceny." },
  listings: { title: "Porovnejte inzeráty poskytovatelů", subtitle: "Nedávno schválení odborníci", filters: "Filtry", sortBy: "Seřadit podle", resultsFor: "Výsledky pro" }
};

const hiIN: Dictionary = {
  nav: { listings: "सूचियाँ", categories: "श्रेणियाँ", blog: "ब्लॉग", login: "लॉग इन", addProfile: "प्रोफ़ाइल जोड़ें", search: "खोजें", searchPlaceholder: "सेवा प्रदाता, सेवाएँ, शहर खोजें…", theme: "थीम", language: "भाषा" },
  common: { browse: "ब्राउज़ करें", viewAll: "सभी देखें", readMore: "और पढ़ें", loading: "लोड हो रहा है…", noResults: "कोई परिणाम नहीं मिला", backHome: "होम पर लौटें" },
  home: { heroEyebrow: "वैश्विक विशेषज्ञ निर्देशिका", heroTitle: "दुनिया भर में भरोसेमंद सेवा प्रदाता खोजें।", heroSubtitle: "रेटिंग, समीक्षाएँ, उपलब्धता और कीमत की तुलना करें।", popularNow: "अभी लोकप्रिय", trending: "ट्रेंडिंग", categoriesTitle: "सेवा श्रेणियाँ ब्राउज़ करें", featured: "विशेष रुप से प्रदर्शित प्रदाता" },
  auth: {
    signInTitle: "अपने खाते में साइन इन करें", signInSubtitle: "जारी रखने के लिए अपना पंजीकृत ईमेल उपयोग करें।",
    signUpTitle: "अपना खाता बनाएँ", signUpSubtitle: "प्रदाताओं को सहेजने और अपनी लिस्टिंग प्रबंधित करने के लिए जुड़ें।",
    email: "ईमेल पता", password: "पासवर्ड", name: "पूरा नाम", rememberMe: "मुझे याद रखें", forgotPassword: "पासवर्ड भूल गए?",
    signIn: "साइन इन", createAccount: "खाता बनाएँ", noAccount: "खाता नहीं है?", haveAccount: "पहले से खाता है?",
    consent: "मैं स्वीकार करता/करती हूँ", terms: "सेवा की शर्तें", privacy: "गोपनीयता नीति", ageConfirm: "और पुष्टि करता/करती हूँ कि मेरी आयु कम से कम 18 वर्ष है।"
  },
  footer: { explore: "एक्सप्लोर करें", company: "कंपनी", getStarted: "शुरू करें", legal: "कानूनी", about: "हमारे बारे में", contact: "संपर्क", privacy: "गोपनीयता नीति", terms: "सेवा की शर्तें", disclaimer: "अस्वीकरण", rights: "सर्वाधिकार सुरक्षित।", tagline: "सत्यापित सेवा प्रदाता, ईमानदार समीक्षाएँ और पारदर्शी कीमतें।" },
  listings: { title: "सेवा प्रदाता सूचियों की तुलना करें", subtitle: "हाल ही में स्वीकृत पेशेवर", filters: "फ़िल्टर", sortBy: "क्रमबद्ध करें", resultsFor: "परिणाम" }
};

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  es: esES,
  fr: frFR,
  de: deDE,
  it: itIT,
  pt: ptPT,
  ru: ruRU,
  cs: csCZ,
  hi: hiIN
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] || en;
}
