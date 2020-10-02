import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SalesDashboardPage} from "./sales-dashboard.page";

const routes: Routes = [
  { path: '', redirectTo: 'alerts' },
  { path: 'dashboard', component: SalesDashboardPage },
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
