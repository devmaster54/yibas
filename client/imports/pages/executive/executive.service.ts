import { Injectable } from '@angular/core';
import ExecutivePages from './components';
import { ExecutiveItem } from './executive-item';
import {ExecutiveFreightreportPage} from "./components/salesSnapshot/executive-freightreport.page";
import {ExecutiveOpenordersPage} from "./components/salesSnapshot/executive-openorders.page";
import { ExecutiveMonthlySalesPage} from "./components/salesSnapshot/executive-monthlySales.page";
import { ExecutiveYearlySalesPage} from "./components/salesSnapshot/executive-yearlySales.page";
import { ExecutiveCustomerQuoteReportPage} from "./components/salesSnapshot/executive-customerQuoteReport.page";
import { ExecutiveMonthlyIncomeStatementPage } from './components/salesSnapshot/executive-monthlyIncomeStatement.page';
import { ExecutiveYearlyIncomeStatementPage } from './components/salesSnapshot/executive-yearlyIncomeStatement.page';
import {ExecutiveDashboardPage} from "./components/executive-dashboard.page";
import {ExecutiveLookupPage} from "./components/executive-lookup.page";
import { ExecutiveBorrowingBasePage} from "./components/accounting/executive-borrowingBase.page";
import { ExecutiveBankingBalancePage} from "./components/accounting/executive-bankingBalance.page";
import { ExecutiveInventoryPage} from "./components/inventory/executive-inventory.page";
import { ExecutiveMarsInventorysPage } from './components/inventory/executive-marsInventory.page';
import { ExecutiveInventoryVariance } from './components/inventory/executive-inventoryVariance.page';
import { ExecutiveAgedInvoices } from './components/accounting/executive-agedInvoices.page';
import { ExecutiveBudgetReport } from './components/budget/executive-budgetReport.page';
import { LifeInsurancePage } from './components/life-insurance/life-insurance.page';
import { SalesSnapshotDashboardPage } from './components/salesSnapshot/salesSnapshot.page';
import { InventoryDashboardPage } from './components/inventory/inventory.page';
import { BudgetDashboardPage } from './components/budget/budget.page';
import { AccountingExecDashboardPage } from './components/accounting/accounting.page';


@Injectable()
export class ExecutiveService {
  getExecutiveItems() {
    let arr = [];
    Object.keys(ExecutivePages).forEach(key => {
      let item = new ExecutiveItem(key, ExecutivePages[key], {});
      arr.push(item);
    });
    return arr;
  }
}
