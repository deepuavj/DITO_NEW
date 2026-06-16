function getApiUrl(): string {
  // In GitHub Codespaces each port gets its own subdomain
  const host = window?.location?.hostname ?? '';
  if (host.includes('.app.github.dev')) {
    return `https://${host.replace('-4200', '-3000')}/api`;
  }
  return 'http://localhost:3000/api';
}

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
};
