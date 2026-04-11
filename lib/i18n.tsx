'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Lang = 'en' | 'fr' | 'ar'

export const languages: Record<Lang, { flag: string; label: string }> = {
  en: { flag: '🇺🇸', label: 'English' },
  fr: { flag: '🇫🇷', label: 'Français' },
  ar: { flag: '🇸🇦', label: 'العربية' },
}

/* ──────────────────────────────────────────────
   Translation dictionary
   ────────────────────────────────────────────── */
const translations = {
  /* ── Common ── */
  search: { en: 'Search', fr: 'Rechercher', ar: 'بحث' },
  search_dots: { en: 'Search...', fr: 'Rechercher...', ar: 'بحث...' },
  loading: { en: 'Loading...', fr: 'Chargement...', ar: 'جار التحميل...' },
  loading_orders: { en: 'Loading orders...', fr: 'Chargement des commandes...', ar: 'جار تحميل الطلبات...' },
  view: { en: 'View', fr: 'Voir', ar: 'عرض' },
  view_all: { en: 'View all', fr: 'Voir tout', ar: 'عرض الكل' },
  see_all: { en: 'See all', fr: 'Tout voir', ar: 'مشاهدة الكل' },
  edit: { en: 'Edit', fr: 'Modifier', ar: 'تعديل' },
  delete: { en: 'Delete', fr: 'Supprimer', ar: 'حذف' },
  save: { en: 'Save', fr: 'Enregistrer', ar: 'حفظ' },
  cancel: { en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' },
  close: { en: 'Close', fr: 'Fermer', ar: 'إغلاق' },
  yes: { en: 'Yes', fr: 'Oui', ar: 'نعم' },
  no: { en: 'No', fr: 'Non', ar: 'لا' },
  customer: { en: 'Customer', fr: 'Client', ar: 'العميل' },
  product: { en: 'Product', fr: 'Produit', ar: 'منتج' },
  products: { en: 'Products', fr: 'Produits', ar: 'منتجات' },
  status: { en: 'Status', fr: 'Statut', ar: 'الحالة' },
  date: { en: 'Date', fr: 'Date', ar: 'التاريخ' },
  amount: { en: 'Amount', fr: 'Montant', ar: 'المبلغ' },
  total: { en: 'Total', fr: 'Total', ar: 'المجموع' },
  city: { en: 'City', fr: 'Ville', ar: 'المدينة' },
  showing: { en: 'Showing', fr: 'Affichage', ar: 'عرض' },
  of: { en: 'of', fr: 'sur', ar: 'من' },
  orders_lc: { en: 'orders', fr: 'commandes', ar: 'طلبات' },
  copyright: { en: 'Copyright © 2026 Shipedo. All rights reserved', fr: 'Copyright © 2026 Shipedo. Tous droits réservés', ar: 'حقوق النشر © 2026 Shipedo. جميع الحقوق محفوظة' },

  /* ── Header ── */
  hdr_dashboard: { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' },
  hdr_dashboard_sub: { en: 'Your store overview', fr: 'Aperçu de votre boutique', ar: 'نظرة عامة على متجرك' },
  hdr_orders: { en: 'Orders', fr: 'Commandes', ar: 'الطلبات' },
  hdr_orders_sub: { en: 'total orders', fr: 'commandes totales', ar: 'إجمالي الطلبات' },
  hdr_seller: { en: 'Seller', fr: 'Vendeur', ar: 'بائع' },
  hdr_profile: { en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' },
  hdr_signout: { en: 'Sign Out', fr: 'Déconnexion', ar: 'تسجيل الخروج' },
  hdr_my_wallet: { en: 'My Wallet', fr: 'Mon Portefeuille', ar: 'محفظتي' },
  hdr_total_balance: { en: 'Total Balance', fr: 'Solde Total', ar: 'الرصيد الإجمالي' },
  hdr_available: { en: 'Available', fr: 'Disponible', ar: 'متاح' },
  hdr_on_hold: { en: 'On Hold', fr: 'En attente', ar: 'محجوز' },
  hdr_pending_payout: { en: 'Pending Payout', fr: 'Paiement en attente', ar: 'دفعة معلقة' },
  hdr_withdraw_usd: { en: 'Withdraw in USD', fr: 'Retirer en USD', ar: 'سحب بالدولار' },

  /* ── Sidebar sections ── */
  nav_main: { en: 'MAIN', fr: 'PRINCIPAL', ar: 'الرئيسية' },
  nav_stock: { en: 'STOCK', fr: 'STOCK', ar: 'المخزون' },
  nav_finance: { en: 'FINANCE', fr: 'FINANCE', ar: 'المالية' },
  nav_account: { en: 'ACCOUNT', fr: 'COMPTE', ar: 'الحساب' },
  nav_operations: { en: 'OPERATIONS', fr: 'OPÉRATIONS', ar: 'العمليات' },
  nav_management: { en: 'MANAGEMENT', fr: 'GESTION', ar: 'الإدارة' },

  /* ── Sidebar items ── */
  nav_dashboard: { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' },
  nav_orders: { en: 'Orders', fr: 'Commandes', ar: 'الطلبات' },
  nav_all_orders: { en: 'All Orders', fr: 'Toutes les commandes', ar: 'جميع الطلبات' },
  nav_new_order: { en: 'New Order', fr: 'Nouvelle commande', ar: 'طلب جديد' },
  nav_shipping: { en: 'Shipping', fr: 'Expédition', ar: 'الشحن' },
  nav_analytics: { en: 'Analytics', fr: 'Analyses', ar: 'التحليلات' },
  nav_products: { en: 'Products', fr: 'Produits', ar: 'المنتجات' },
  nav_all_products: { en: 'All Products', fr: 'Tous les produits', ar: 'جميع المنتجات' },
  nav_new_product: { en: 'New Product', fr: 'Nouveau produit', ar: 'منتج جديد' },
  nav_expeditions: { en: 'Expeditions', fr: 'Expéditions', ar: 'الإرساليات' },
  nav_all_expeditions: { en: 'All Expeditions', fr: 'Toutes les expéditions', ar: 'جميع الإرساليات' },
  nav_new_expedition: { en: 'New Expedition', fr: 'Nouvelle expédition', ar: 'إرسالية جديدة' },
  nav_sourcings: { en: 'Sourcings', fr: 'Approvisionnements', ar: 'التوريد' },
  nav_all_sourcings: { en: 'All Sourcings', fr: 'Tous les approvisionnements', ar: 'جميع التوريدات' },
  nav_new_sourcing: { en: 'New Sourcing', fr: 'Nouvel approvisionnement', ar: 'توريد جديد' },
  nav_my_wallet: { en: 'My Wallet', fr: 'Mon Portefeuille', ar: 'محفظتي' },
  nav_invoices: { en: 'Invoices', fr: 'Factures', ar: 'الفواتير' },
  nav_billing: { en: 'Weekly Billing', fr: 'Facturation hebdo', ar: 'الفوترة الأسبوعية' },
  nav_withdrawals: { en: 'Withdrawals', fr: 'Retraits', ar: 'السحوبات' },
  nav_integrations: { en: 'Integrations', fr: 'Intégrations', ar: 'التكاملات' },
  nav_settings: { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات' },
  nav_call_queue: { en: 'Call Queue', fr: "File d'appels", ar: 'قائمة المكالمات' },
  nav_call_history: { en: 'Call History', fr: 'Historique des appels', ar: 'سجل المكالمات' },
  nav_call_center: { en: 'Call Center', fr: "Centre d'appels", ar: 'مركز الاتصال' },
  nav_fulfillment: { en: 'Fulfillment', fr: 'Exécution', ar: 'التنفيذ' },
  nav_cod_tracking: { en: 'COD Tracking', fr: 'Suivi COD', ar: 'تتبع الدفع عند الاستلام' },
  nav_transactions: { en: 'Transactions', fr: 'Transactions', ar: 'المعاملات' },
  nav_customers: { en: 'Customers', fr: 'Clients', ar: 'العملاء' },
  nav_sellers: { en: 'Sellers', fr: 'Vendeurs', ar: 'البائعون' },
  nav_agents: { en: 'Agents', fr: 'Agents', ar: 'الوكلاء' },
  nav_returns: { en: 'Returns', fr: 'Retours', ar: 'المرتجعات' },

  /* ── Periods ── */
  period_today: { en: 'Today', fr: "Aujourd'hui", ar: 'اليوم' },
  period_yesterday: { en: 'Yesterday', fr: 'Hier', ar: 'أمس' },
  period_this_week: { en: 'This Week', fr: 'Cette semaine', ar: 'هذا الأسبوع' },
  period_last_week: { en: 'Last Week', fr: 'Semaine dernière', ar: 'الأسبوع الماضي' },
  period_this_month: { en: 'This Month', fr: 'Ce mois-ci', ar: 'هذا الشهر' },
  period_last_month: { en: 'Last Month', fr: 'Mois dernier', ar: 'الشهر الماضي' },
  period_this_year: { en: 'This Year', fr: 'Cette année', ar: 'هذه السنة' },
  period_all_time: { en: 'All Time', fr: 'Tout le temps', ar: 'كل الوقت' },
  period_week: { en: 'This week', fr: 'Cette semaine', ar: 'هذا الأسبوع' },
  period_month: { en: 'This month', fr: 'Ce mois-ci', ar: 'هذا الشهر' },
  period_all: { en: 'All time', fr: 'Tout', ar: 'الكل' },

  /* ── Dashboard KPIs ── */
  kpi_total_orders: { en: 'Total Orders', fr: 'Total commandes', ar: 'إجمالي الطلبات' },
  kpi_confirmed_orders: { en: 'Confirmed Orders', fr: 'Commandes confirmées', ar: 'الطلبات المؤكدة' },
  kpi_delivered_orders: { en: 'Delivered Orders', fr: 'Commandes livrées', ar: 'الطلبات المسلمة' },
  kpi_returned_orders: { en: 'Returned Orders', fr: 'Commandes retournées', ar: 'الطلبات المرتجعة' },
  kpi_pending_orders: { en: 'Pending Orders', fr: 'Commandes en attente', ar: 'الطلبات المعلقة' },
  kpi_total_revenue: { en: 'Total Revenue', fr: 'Revenu total', ar: 'إجمالي الإيرادات' },
  kpi_confirm_rate: { en: 'confirmation rate', fr: 'taux de confirmation', ar: 'معدل التأكيد' },
  kpi_delivery_rate: { en: 'delivery rate', fr: 'taux de livraison', ar: 'معدل التسليم' },
  kpi_return_rate: { en: 'return rate', fr: 'taux de retour', ar: 'معدل الإرجاع' },
  kpi_awaiting: { en: 'Awaiting confirmation', fr: 'En attente de confirmation', ar: 'في انتظار التأكيد' },
  kpi_from_delivered: { en: 'From delivered orders', fr: 'Des commandes livrées', ar: 'من الطلبات المسلمة' },

  /* ── Dashboard sections ── */
  dash_revenue_trend: { en: 'Revenue Trend', fr: 'Tendance des revenus', ar: 'اتجاه الإيرادات' },
  dash_revenue_sub: { en: 'Last 6 months · delivered orders', fr: '6 derniers mois · commandes livrées', ar: 'آخر 6 أشهر · الطلبات المسلمة' },
  dash_order_status: { en: 'Order Status', fr: 'Statut des commandes', ar: 'حالة الطلبات' },
  dash_distribution: { en: 'Distribution', fr: 'Distribution', ar: 'التوزيع' },
  dash_recent_orders: { en: 'Recent Orders', fr: 'Commandes récentes', ar: 'الطلبات الأخيرة' },
  dash_latest_activity: { en: 'Latest activity', fr: 'Activité récente', ar: 'آخر نشاط' },
  dash_no_orders: { en: 'No orders yet', fr: 'Aucune commande pour le moment', ar: 'لا توجد طلبات بعد' },
  dash_no_orders_sub: { en: 'Create your first order to get started', fr: 'Créez votre première commande pour commencer', ar: 'أنشئ طلبك الأول للبدء' },
  dash_welcome: { en: 'Welcome back', fr: 'Bon retour', ar: 'مرحباً بعودتك' },
  dash_revenue: { en: 'Revenue', fr: 'Revenu', ar: 'الإيرادات' },
  dash_confirmed_pct: { en: 'confirmed', fr: 'confirmées', ar: 'مؤكدة' },
  dash_delivered: { en: 'delivered', fr: 'livrées', ar: 'مسلمة' },
  dash_quick_actions: { en: 'Quick Actions', fr: 'Actions rapides', ar: 'إجراءات سريعة' },
  dash_pending: { en: 'Pending', fr: 'En attente', ar: 'معلق' },
  dash_returns: { en: 'Returns', fr: 'Retours', ar: 'الإرجاعات' },
  dash_wallet: { en: 'Wallet', fr: 'Portefeuille', ar: 'المحفظة' },
  dash_view_transactions: { en: 'View transactions', fr: 'Voir les transactions', ar: 'عرض المعاملات' },
  dash_credited_by_shipedo: { en: 'Credited by Shipedo', fr: 'Crédité par Shipedo', ar: 'تم تحويله من Shipedo' },
  dash_payout_one: { en: 'payout', fr: 'versement', ar: 'دفعة' },
  dash_payout_many: { en: 'payouts', fr: 'versements', ar: 'دفعات' },
  dash_last: { en: 'last', fr: 'dernier', ar: 'آخر' },
  dash_view_statements: { en: 'View statements', fr: 'Voir les relevés', ar: 'عرض الكشوف' },
  dash_add_new_order: { en: 'Add a new order', fr: 'Ajouter une nouvelle commande', ar: 'أضف طلب جديد' },
  dash_n_awaiting: { en: 'awaiting', fr: 'en attente', ar: 'في الانتظار' },
  dash_n_orders: { en: 'orders', fr: 'commandes', ar: 'طلبات' },
  dash_status_delivered: { en: 'Delivered', fr: 'Livré', ar: 'مسلم' },
  dash_status_pending: { en: 'Pending', fr: 'En attente', ar: 'معلق' },
  dash_status_returned: { en: 'Returned', fr: 'Retourné', ar: 'مرتجع' },
  dash_status_other: { en: 'Other', fr: 'Autre', ar: 'أخرى' },

  /* ── Mobile bottom nav ── */
  nav_home: { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
  nav_add: { en: 'Add', fr: 'Ajouter', ar: 'إضافة' },
  nav_profile: { en: 'Profile', fr: 'Profil', ar: 'الملف' },

  /* ── Orders page ── */
  ord_title: { en: 'Orders', fr: 'Commandes', ar: 'الطلبات' },
  ord_search_placeholder: { en: 'ID, Customer, Shipping Address, Total Price ...', fr: 'ID, Client, Adresse, Prix total ...', ar: 'المعرف، العميل، العنوان، السعر الإجمالي...' },
  ord_new_order: { en: 'New Order', fr: 'Nouvelle commande', ar: 'طلب جديد' },
  ord_import: { en: 'Import Orders', fr: 'Importer commandes', ar: 'استيراد الطلبات' },
  ord_excel: { en: 'Excel', fr: 'Excel', ar: 'إكسل' },
  ord_id: { en: 'ID', fr: 'ID', ar: 'المعرف' },
  ord_source: { en: 'Source', fr: 'Source', ar: 'المصدر' },
  ord_subuser: { en: 'Subuser', fr: 'Sous-utilisateur', ar: 'مستخدم فرعي' },
  ord_customer: { en: 'Customer', fr: 'Client', ar: 'العميل' },
  ord_details: { en: 'Details', fr: 'Détails', ar: 'التفاصيل' },
  ord_total_price: { en: 'Total Price', fr: 'Prix total', ar: 'السعر الإجمالي' },
  ord_order_date: { en: 'Order Date', fr: 'Date de commande', ar: 'تاريخ الطلب' },
  ord_status: { en: 'Status', fr: 'Statut', ar: 'الحالة' },
  ord_actions: { en: 'Actions', fr: 'Actions', ar: 'الإجراءات' },
  ord_no_orders: { en: 'No orders found', fr: 'Aucune commande trouvée', ar: 'لم يتم العثور على طلبات' },
  ord_try_filters: { en: 'Try changing filters', fr: 'Essayez de modifier les filtres', ar: 'حاول تغيير المرشحات' },
  ord_create_first: { en: 'Create your first order', fr: 'Créez votre première commande', ar: 'أنشئ طلبك الأول' },
  ord_filter_all: { en: 'All', fr: 'Tous', ar: 'الكل' },
  ord_filter_pending: { en: 'Pending', fr: 'En attente', ar: 'معلق' },
  ord_filter_confirmed: { en: 'Confirmed', fr: 'Confirmé', ar: 'مؤكد' },
  ord_filter_shipped: { en: 'Shipped', fr: 'Expédié', ar: 'تم الشحن' },
  ord_filter_delivered: { en: 'Delivered', fr: 'Livré', ar: 'مسلم' },
  ord_filter_returned: { en: 'Returned', fr: 'Retourné', ar: 'مرتجع' },
  ord_filter_cancelled: { en: 'Cancelled', fr: 'Annulé', ar: 'ملغى' },
  ord_no_export: { en: 'No orders to export', fr: 'Aucune commande à exporter', ar: 'لا توجد طلبات للتصدير' },

  /* ── Products page ── */
  prod_title: { en: 'Products', fr: 'Produits', ar: 'المنتجات' },
  prod_subtitle: { en: 'products in stock', fr: 'produits en stock', ar: 'منتجات في المخزون' },
  prod_search_placeholder: { en: 'ID, Name, SKU, Category ...', fr: 'ID, Nom, SKU, Catégorie ...', ar: 'المعرف، الاسم، SKU، الفئة ...' },
  prod_new: { en: 'New Product', fr: 'Nouveau produit', ar: 'منتج جديد' },
  prod_excel: { en: 'Excel', fr: 'Excel', ar: 'إكسل' },
  prod_id: { en: 'ID', fr: 'ID', ar: 'المعرف' },
  prod_name: { en: 'Name', fr: 'Nom', ar: 'الاسم' },
  prod_qty_in_stock: { en: 'Quantity In Stock', fr: 'Quantité en stock', ar: 'الكمية في المخزون' },
  prod_total_qty: { en: 'Total Quantity', fr: 'Quantité totale', ar: 'الكمية الإجمالية' },
  prod_qty_defective: { en: 'Quantity Defective', fr: 'Quantité défectueuse', ar: 'الكمية المعيبة' },
  prod_price: { en: 'Price', fr: 'Prix', ar: 'السعر' },
  prod_discount_price: { en: 'Discount Price', fr: 'Prix réduit', ar: 'سعر الخصم' },
  prod_upsell: { en: 'Up-sell', fr: 'Vente incitative', ar: 'بيع إضافي' },
  prod_crosssell: { en: 'Cross-sell', fr: 'Vente croisée', ar: 'بيع متقاطع' },
  prod_not_used: { en: 'Not Used', fr: 'Non Utilisé', ar: 'غير مستخدم' },
  prod_total: { en: 'Total', fr: 'Total', ar: 'الإجمالي' },
  prod_no_products: { en: 'No products found', fr: 'Aucun produit trouvé', ar: 'لم يتم العثور على منتجات' },
  prod_create_first: { en: 'Create your first product', fr: 'Créez votre premier produit', ar: 'أنشئ منتجك الأول' },
  prod_loading: { en: 'Loading products...', fr: 'Chargement des produits...', ar: 'جار تحميل المنتجات...' },
  prod_filter_all: { en: 'All', fr: 'Tous', ar: 'الكل' },
  prod_filter_active: { en: 'Active', fr: 'Actif', ar: 'نشط' },
  prod_filter_low: { en: 'Low Stock', fr: 'Stock faible', ar: 'مخزون منخفض' },
  prod_filter_out: { en: 'Out of Stock', fr: 'Rupture de stock', ar: 'نفد المخزون' },
  prod_filter_inactive: { en: 'Inactive', fr: 'Inactif', ar: 'غير نشط' },

  /* ── New Order page ── */
  no_title: { en: 'New Order', fr: 'Nouvelle commande', ar: 'طلب جديد' },
  no_customer_info: { en: 'Customer Information', fr: 'Informations client', ar: 'معلومات العميل' },
  no_order_info: { en: 'Order Information', fr: 'Informations commande', ar: 'معلومات الطلب' },
  no_country: { en: 'Country', fr: 'Pays', ar: 'البلد' },
  no_full_name: { en: 'Full Name', fr: 'Nom complet', ar: 'الاسم الكامل' },
  no_phone: { en: 'Phone', fr: 'Téléphone', ar: 'الهاتف' },
  no_city: { en: 'City', fr: 'Ville', ar: 'المدينة' },
  no_select_city: { en: 'Select city...', fr: 'Sélectionner une ville...', ar: 'اختر مدينة...' },
  no_enter_city: { en: 'Enter city...', fr: 'Entrer la ville...', ar: 'أدخل المدينة...' },
  no_address: { en: 'Address', fr: 'Adresse', ar: 'العنوان' },
  no_address_ph: { en: 'Street, neighbourhood...', fr: 'Rue, quartier...', ar: 'الشارع، الحي...' },
  no_order_source: { en: 'Order Source', fr: 'Source de la commande', ar: 'مصدر الطلب' },
  no_order_source_ph: { en: 'e.g. Facebook, Instagram, WhatsApp...', fr: 'ex. Facebook, Instagram, WhatsApp...', ar: 'مثال: فيسبوك، إنستغرام، واتساب...' },
  no_products: { en: 'Products', fr: 'Produits', ar: 'المنتجات' },
  no_select_product: { en: 'Select Product', fr: 'Sélectionner un produit', ar: 'اختر منتجاً' },
  no_unit_price: { en: 'Unit Price', fr: 'Prix unitaire', ar: 'سعر الوحدة' },
  no_quantity: { en: 'Quantity', fr: 'Quantité', ar: 'الكمية' },
  no_total: { en: 'Total', fr: 'Total', ar: 'المجموع' },
  no_actions: { en: 'Actions', fr: 'Actions', ar: 'الإجراءات' },
  no_total_price: { en: 'Total Price', fr: 'Prix total', ar: 'السعر الإجمالي' },
  no_no_products: { en: 'No products selected', fr: 'Aucun produit sélectionné', ar: 'لم يتم اختيار منتجات' },
  no_no_products_sub: { en: 'Click "Select Product" to add items to this order', fr: 'Cliquez sur "Sélectionner un produit" pour ajouter des articles', ar: 'انقر على "اختر منتجاً" لإضافة عناصر إلى هذا الطلب' },
  no_save_order: { en: 'Save Order', fr: 'Enregistrer la commande', ar: 'حفظ الطلب' },
  no_required: { en: 'Required', fr: 'Obligatoire', ar: 'مطلوب' },
  no_search_products: { en: 'Search your products...', fr: 'Rechercher vos produits...', ar: 'ابحث في منتجاتك...' },
  no_no_avail: { en: 'No products available for this country', fr: 'Aucun produit disponible pour ce pays', ar: 'لا توجد منتجات متاحة لهذا البلد' },
  no_no_products_yet: { en: 'You have no products yet', fr: "Vous n'avez pas encore de produits", ar: 'ليس لديك منتجات بعد' },
  no_added: { en: 'Added', fr: 'Ajouté', ar: 'مضاف' },
  no_created_title: { en: 'Order Created!', fr: 'Commande créée !', ar: 'تم إنشاء الطلب!' },
  no_created_sub: { en: 'The order has been registered successfully.', fr: 'La commande a été enregistrée avec succès.', ar: 'تم تسجيل الطلب بنجاح.' },
  no_order_id: { en: 'ORDER ID', fr: 'ID COMMANDE', ar: 'معرف الطلب' },
  no_id_hint: { en: 'Use this ID to track and reference this order', fr: 'Utilisez cet ID pour suivre et référencer cette commande', ar: 'استخدم هذا المعرف لتتبع هذا الطلب والإشارة إليه' },
  no_new_order: { en: 'New Order', fr: 'Nouvelle commande', ar: 'طلب جديد' },
  no_view_orders: { en: 'View Orders', fr: 'Voir les commandes', ar: 'عرض الطلبات' },
  no_select_country: { en: 'Select country...', fr: 'Sélectionner un pays...', ar: 'اختر البلد...' },
  no_pick_country_first: { en: 'Pick a country first', fr: "Choisissez d'abord un pays", ar: 'اختر البلد أولاً' },
  no_pick_country_sub: { en: 'Available products depend on the selected country', fr: 'Les produits disponibles dépendent du pays sélectionné', ar: 'تعتمد المنتجات المتاحة على البلد المحدد' },
  no_add_products: { en: 'Add Products', fr: 'Ajouter des produits', ar: 'إضافة منتجات' },
  no_confirm: { en: 'Confirm', fr: 'Confirmer', ar: 'تأكيد' },

  /* ── New Product page ── */
  np_title: { en: 'New Product', fr: 'Nouveau produit', ar: 'منتج جديد' },
  np_product_info: { en: 'Product Information', fr: 'Informations produit', ar: 'معلومات المنتج' },
  np_pricing_stock: { en: 'Pricing & Stock', fr: 'Prix et stock', ar: 'السعر والمخزون' },
  np_main_picture: { en: 'Main Picture', fr: 'Image principale', ar: 'الصورة الرئيسية' },
  np_name: { en: 'Name', fr: 'Nom', ar: 'الاسم' },
  np_name_ph: { en: 'Enter Name', fr: 'Entrer le nom', ar: 'أدخل الاسم' },
  np_sku: { en: 'SKU', fr: 'SKU', ar: 'SKU' },
  np_sku_ph: { en: 'Enter SKU', fr: 'Entrer SKU', ar: 'أدخل SKU' },
  np_category: { en: 'Category', fr: 'Catégorie', ar: 'الفئة' },
  np_select_category: { en: 'Select category', fr: 'Sélectionner une catégorie', ar: 'اختر فئة' },
  np_origin: { en: 'Origin', fr: 'Origine', ar: 'المنشأ' },
  np_description: { en: 'Description', fr: 'Description', ar: 'الوصف' },
  np_description_ph: { en: 'Enter Description', fr: 'Entrer la description', ar: 'أدخل الوصف' },
  np_buying_price: { en: 'Buying Price', fr: "Prix d'achat", ar: 'سعر الشراء' },
  np_selling_price: { en: 'Selling Price', fr: 'Prix de vente', ar: 'سعر البيع' },
  np_discount_price: { en: 'Discount Price', fr: 'Prix réduit', ar: 'سعر الخصم' },
  np_stock_qty: { en: 'Stock Quantity', fr: 'Quantité en stock', ar: 'كمية المخزون' },
  np_margin: { en: 'Margin', fr: 'Marge', ar: 'الهامش' },
  np_click_upload: { en: 'Click to upload or drag and drop', fr: 'Cliquez pour télécharger ou glisser-déposer', ar: 'انقر للتحميل أو اسحب وأفلت' },
  np_file_types: { en: 'PNG, JPG, GIF up to 500KB', fr: "PNG, JPG, GIF jusqu'à 500 Ko", ar: 'PNG، JPG، GIF حتى 500 كيلوبايت' },
  np_browse_files: { en: 'Browse Files', fr: 'Parcourir les fichiers', ar: 'تصفح الملفات' },
  np_remove_image: { en: 'Remove image', fr: "Supprimer l'image", ar: 'إزالة الصورة' },
  np_save_product: { en: 'Save Product', fr: 'Enregistrer le produit', ar: 'حفظ المنتج' },
  np_required: { en: 'Required', fr: 'Obligatoire', ar: 'مطلوب' },
  np_created_title: { en: 'Product Created!', fr: 'Produit créé !', ar: 'تم إنشاء المنتج!' },
  np_created_sub: { en: 'Your product has been added to your catalog.', fr: 'Votre produit a été ajouté à votre catalogue.', ar: 'تمت إضافة منتجك إلى الكتالوج.' },
  np_product_id: { en: 'PRODUCT ID', fr: 'ID PRODUIT', ar: 'معرف المنتج' },
  np_save_id_hint: { en: 'Save this ID — use it when referencing this product', fr: 'Enregistrez cet ID — utilisez-le pour référencer ce produit', ar: 'احفظ هذا المعرف' },
  np_add_another: { en: 'Add Another', fr: 'Ajouter un autre', ar: 'أضف آخر' },
  np_view_products: { en: 'View Products', fr: 'Voir les produits', ar: 'عرض المنتجات' },
} as const

export type TKey = keyof typeof translations

/* ──────────────────────────────────────────────
   Context
   ────────────────────────────────────────────── */
interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shipedo_lang') as Lang | null
      if (stored && languages[stored]) {
        setLangState(stored)
        if (typeof document !== 'undefined') {
          document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr'
          document.documentElement.lang = stored
        }
      }
    } catch {}
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('shipedo_lang', l) } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = l
    }
  }

  const t = (key: TKey): string => {
    const entry = translations[key]
    if (!entry) return key
    return entry[lang] || entry.en || key
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback so components don't crash if used outside provider
    return {
      lang: 'en' as Lang,
      setLang: () => {},
      t: (key: TKey) => {
        const entry = translations[key]
        return entry?.en || key
      },
    }
  }
  return ctx
}
