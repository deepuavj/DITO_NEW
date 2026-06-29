import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { User, AuthTokens, LoginRequest, RegisterRequest } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'dito_access_token';
const REFRESH_TOKEN_KEY = 'dito_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(this.loadUserFromStorage());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  login(credentials: LoginRequest) {
    return this.api.post<AuthTokens>('/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.data) this.storeSession(res.data);
      }),
      map(res => res.data!),
    );
  }

  register(data: RegisterRequest) {
    return this.api.post<User>('/auth/register', data).pipe(map(res => res.data!));
  }

  logout() {
    this.api.post('/auth/logout', {}).subscribe({ error: () => {} });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private storeSession(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this._user.set(tokens.user);
  }

  private clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this._user.set(null);
  }

  private loadUserFromStorage(): User | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) return null;
      return { id: payload.sub, email: payload.email, name: payload.name ?? '', role: payload.role };
    } catch {
      return null;
    }
  }
}
