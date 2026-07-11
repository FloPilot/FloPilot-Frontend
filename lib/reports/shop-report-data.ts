import type { CustomerListFinancialContext } from "@/lib/customer-list-summary";
import type {
  InventoryItem,
  PurchaseOrder,
  TeamMember,
} from "@/lib/api";
import type {
  Customer,
  Machine,
  MachineIssueReport,
  Order,
  ScheduleBlock,
  StationJobRun,
} from "@/types";

/** All shop data available for reports, insights, and the custom builder */
export interface ShopReportData {
  customers: Customer[];
  orders: Order[];
  machines: Machine[];
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  issueReports: MachineIssueReport[];
  teamMembers: TeamMember[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  financials?: CustomerListFinancialContext;
}

export type CustomersListReportData = ShopReportData;

export type CustomerDetailReportData = {
  customer: Customer;
  orders: Order[];
  financials?: CustomerListFinancialContext;
};

export const EMPTY_SHOP_REPORT_DATA: ShopReportData = {
  customers: [],
  orders: [],
  machines: [],
  scheduleBlocks: [],
  jobRuns: [],
  issueReports: [],
  teamMembers: [],
  inventory: [],
  purchaseOrders: [],
};
