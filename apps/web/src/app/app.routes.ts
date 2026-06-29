import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent) },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'studio/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/studio/studio.component').then(m => m.StudioComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'assets', pathMatch: 'full' },
      {
        path: 'assets',
        loadComponent: () => import('./features/admin/admin-assets.component').then(m => m.AdminAssetsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
