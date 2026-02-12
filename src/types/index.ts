export interface Customer {
    id: string
    name: string
    email: string
    phone: string
    createdAt: string
  }
  
  export interface CustomerStats {
    totalCustomers: number
    activeCustomers: number
    newToday: number
    newThisMonth: number
    totalChange: number
    activeChange: number
    todayChange: number
    monthChange: number
  }