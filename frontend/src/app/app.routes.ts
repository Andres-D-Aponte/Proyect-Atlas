import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { CompaniesComponent } from './features/platform/companies/companies.component';
import { CompanySettingsComponent } from './features/settings/company/company-settings.component';
import { BranchesComponent } from './features/settings/branches/branches.component';
import { UsersComponent } from './features/settings/users/users.component';
import { ServicesComponent } from './features/settings/services/services.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'platform/companies',
    component: CompaniesComponent,
    canActivate: [authGuard, roleGuard(['PLATFORM_OWNER'])],
  },
  {
    path: 'settings/company',
    component: CompanySettingsComponent,
    canActivate: [authGuard, roleGuard(['BUSINESS_ADMIN'])],
  },
  {
    path: 'settings/branches',
    component: BranchesComponent,
    canActivate: [authGuard, roleGuard(['BUSINESS_ADMIN'])],
  },
  {
    path: 'settings/users',
    component: UsersComponent,
    canActivate: [authGuard, roleGuard(['BUSINESS_ADMIN'])],
  },
  {
    path: 'settings/services',
    component: ServicesComponent,
    canActivate: [authGuard, roleGuard(['BUSINESS_ADMIN'])],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
