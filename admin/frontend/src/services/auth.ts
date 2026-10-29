// Basic user type - expand as needed
interface User {
  practiceId: string;
  // Add other user properties as needed
}

// Replace this with your actual auth logic
export const currentUser: User = {
  practiceId: '', // This should be populated with the actual logged-in user's practice ID
};

const BASE_URL = 'http://localhost:5001/api';

export const authService = {
  async login(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(userData: any) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
  }
}; 