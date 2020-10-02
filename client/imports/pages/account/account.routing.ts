import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AccountProfilePage } from "./account-profile.page";

const routes: Routes = [
  { path: '', redirectTo: 'alerts' },
  { path: 'profile', component: AccountProfilePage },
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
