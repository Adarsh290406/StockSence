/**
 * StockSense API Client Service
 * Connects Frontend directly to Backend REST APIs on http://localhost:5000/api
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  getToken() {
    return localStorage.getItem('stocksense_token') || '';
  }

  setToken(token) {
    localStorage.setItem('stocksense_token', token);
  }

  clearToken() {
    localStorage.removeItem('stocksense_token');
    localStorage.removeItem('stocksense_user');
  }

  getUser() {
    const userStr = localStorage.getItem('stocksense_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  setUser(user) {
    localStorage.setItem('stocksense_user', JSON.stringify(user));
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server error occurred');
      }
      return data;
    } catch (err) {
      console.error(`[API Request Failed] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  }

  async signup(name, email, password, role) {
    const res = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    if (res.token) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email, otp, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  // --- Dashboard Endpoints ---
  async getDashboardKpis() {
    return this.request('/dashboard/kpis');
  }

  // --- Products Endpoints ---
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async adjustProductStock(productId, newOnHand, locationId = null) {
    return this.request(`/products/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ new_on_hand: newOnHand, location_id: locationId }),
    });
  }

  // --- Operations Endpoints ---
  async getOperations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/operations${query ? `?${query}` : ''}`);
  }

  async getOperation(id) {
    return this.request(`/operations/${id}`);
  }

  async createOperation(opData) {
    return this.request('/operations', {
      method: 'POST',
      body: JSON.stringify(opData),
    });
  }

  async validateOperation(id) {
    return this.request(`/operations/${id}/validate`, {
      method: 'POST',
    });
  }

  async cancelOperation(id) {
    return this.request(`/operations/${id}/cancel`, {
      method: 'PUT',
    });
  }

  // --- Move History / Stock Ledger ---
  async getLedger(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/ledger${query ? `?${query}` : ''}`);
  }

  // --- Settings (Warehouses & Locations) ---
  async getWarehouses() {
    return this.request('/settings/warehouses');
  }

  async createWarehouse(data) {
    return this.request('/settings/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLocations(warehouseId) {
    const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    return this.request(`/settings/locations${query}`);
  }

  async createLocation(data) {
    return this.request('/settings/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
export default api;
