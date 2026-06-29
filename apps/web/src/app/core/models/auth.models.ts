export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DESIGNER' | 'CUSTOMER' | 'ENTERPRISE';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
