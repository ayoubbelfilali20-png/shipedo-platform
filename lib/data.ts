import { Order, Customer, InventoryItem, CODTransaction, DashboardStats, Expedition, Transaction, SellerWallet, WithdrawRequest, Product, Sourcing, Seller, Agent } from './types'

export const mockOrders: Order[] = []

export const mockCustomers: Customer[] = []

export const mockInventory: InventoryItem[] = []

export const mockCODTransactions: CODTransaction[] = []

export const mockSellerWallet: SellerWallet = {
  sellerId: '',
  sellerName: '',
  totalBalance: 0,
  availableBalance: 0,
  onHoldBalance: 0,
  pendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
}

export const mockTransactions: Transaction[] = []

export const mockWithdrawRequests: WithdrawRequest[] = []

export const mockExpeditions: Expedition[] = []

export const dashboardStats: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  deliveredToday: 0,
  totalRevenue: 0,
  pendingCOD: 0,
  deliveryRate: 0,
  returnRate: 0,
}

export const revenueChartData: { name: string; revenue: number }[] = []

export const orderStatusData: { name: string; value: number; color: string }[] = []

export const mockProducts: Product[] = []

export const mockSourcings: Sourcing[] = []

export const mockSellers: Seller[] = []

export const mockAgents: Agent[] = []
