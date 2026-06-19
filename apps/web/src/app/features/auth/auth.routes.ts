import { Routes } from '@angular/router';
import { authRedirectGuard } from '../../core/guards/auth-redirect.guard';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [authRedirectGuard],
    loadComponent: () => import('./pages/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [authRedirectGuard],
    loadComponent: () => import('./pages/register.page').then(m => m.RegisterPage),
  },
];
