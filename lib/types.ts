export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
export type UserRole = 'admin' | 'seller' | 'agent'
export type PaymentMethod = 'COD' | 'prepaid'

export interface Order {
  id: string
  trackingNumber: string
  customerName: string
  customerPhone: string
  customerCity: string
  customerAddress: string
  products: OrderProduct[]
  totalAmount: number
  codAmount: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  sellerName: string
  sellerId: string
  notes: string
  callAttempts: number
  lastCallAt?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  deliveredAt?: string
}

export interface OrderProduct {
  name: string
  quantity: number
  price: number
  sku?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  city: string
  address: string
  totalOrders: number
  totalSpent: number
  lastOrderAt: string
  createdAt: string
}

export type SellerStatus = 'active' | 'pending' | 'suspended'

export interface Seller {
  id: string
  name: string
  email: string
  phone: string
  password: string
  storeName: string
  city: string
  totalOrders: number
  totalRevenue: number
  pendingPayout: number
  status: SellerStatus
  role: UserRole
  notes?: string
  createdAt: string
}

export type AgentStatus = 'active' | 'inactive' | 'suspended'

export interface Agent {
  id: string
  name: string
  email: string
  phone: string
  password: string
  status: AgentStatus
  totalCalls: number
  confirmed: number
  notReached: number
  rescheduled: number
  notes?: string
  createdAt: string
}

export interface InventoryItem {
  id: string
  productName: string
  sku: string
  sellerId: string
  sellerName: string
  quantity: number
  reservedQuantity: number
  location: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  createdAt: string
  updatedAt: string
}

export interface CODTransaction {
  id: string
  orderId: string
  trackingNumber: string
  customerName: string
  amount: number
  status: 'pending_collection' | 'collected' | 'paid_out' | 'disputed'
  collectedAt?: string
  paidOutAt?: string
  sellerId: string
  sellerName: string
}

export type TransactionType = 'cod_collected' | 'payout' | 'withdrawal' | 'hold' | 'hold_release' | 'refund' | 'fee'
export type TransactionStatus = 'completed' | 'pending' | 'on_hold' | 'cancelled'

export interface Transaction {
  id: string
  type: TransactionType
  status: TransactionStatus
  amount: number
  direction: 'credit' | 'debit'
  description: string
  orderId?: string
  trackingNumber?: string
  reference: string
  sellerId: string
  sellerName: string
  createdAt: string
  processedAt?: string
  note?: string
}

export interface SellerWallet {
  sellerId: string
  sellerName: string
  totalBalance: number
  availableBalance: number
  onHoldBalance: number
  pendingBalance: number
  totalEarned: number
  totalWithdrawn: number
}

export interface WithdrawRequest {
  id: string
  sellerId: string
  amount: number
  method: 'mpesa' | 'bank' | 'airtel'
  accountNumber: string
  accountName: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  requestedAt: string
  processedAt?: string
  note?: string
}

export type ExpeditionStatus = 'preparing' | 'in_transit' | 'customs' | 'arrived' | 'distributing' | 'completed' | 'delayed'
export type ExpeditionOrigin = 'China' | 'Dubai' | 'Turkey' | 'India' | 'Local'

export interface ExpeditionProduct {
  name: string
  sku: string
  quantity: number
  unitCost: number
  sellerId: string
  sellerName: string
}

export interface Expedition {
  id: string
  reference: string
  origin: ExpeditionOrigin
  originCity: string
  destination: string
  status: ExpeditionStatus
  products: ExpeditionProduct[]
  totalItems: number
  totalCost: number
  shippingCost: number
  customsFee: number
  estimatedArrival: string
  actualArrival?: string
  trackingNumber?: string
  carrier: string
  notes: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ProductStatus = 'active' | 'low_stock' | 'out_of_stock' | 'inactive'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  description: string
  buyingPrice: number
  sellingPrice: number
  stock: number
  reserved: number
  origin: ExpeditionOrigin
  expeditionId?: string
  status: ProductStatus
  sellerId: string
  sellerName: string
  createdAt: string
  updatedAt: string
}

export type SourcingStatus = 'pending' | 'researching' | 'quoted' | 'approved' | 'rejected' | 'ordered'

export interface Sourcing {
  id: string
  reference: string
  productName: string
  description: string
  quantity: number
  targetPrice: number
  quotedPrice?: number
  origin: ExpeditionOrigin
  status: SourcingStatus
  supplierName?: string
  notes: string
  requestedBy: string
  sellerId: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  deliveredToday: number
  totalRevenue: number
  pendingCOD: number
  deliveryRate: number
  returnRate: number
}
