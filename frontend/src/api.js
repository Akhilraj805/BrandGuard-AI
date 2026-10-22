/**
 * Centralized API client for BrandGuard AI
 * Connects directly to the FastAPI backend with transparent error handling.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; // Relative URL leverages Vite dev proxy and unified deployment

async function request(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(`${API_BASE}${url}`, config);
    if (!res.ok) {
      let errorMessage = `HTTP error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
          }
        }
      } catch {
        // Fallback to HTTP error message
      }
      const err = new Error(errorMessage);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netErr = new Error('Cannot connect to BrandGuard AI backend service. Please verify the FastAPI server is running on port 8000.');
      netErr.isNetworkError = true;
      throw netErr;
    }
    throw err;
  }
}

export const api = {
  // Service health and system info
  async getHealth() {
    return request('/health');
  },

  async getStats() {
    return request('/api/stats');
  },

  // Guidelines management
  async getGuidelines() {
    return request('/api/guidelines');
  },

  async getGuideline(id) {
    return request(`/api/guidelines/${id}`);
  },

  async createGuideline(guideline) {
    return request('/api/guidelines', {
      method: 'POST',
      body: JSON.stringify(guideline),
    });
  },

  async updateGuideline(id, guideline) {
    return request(`/api/guidelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(guideline),
    });
  },

  async deleteGuideline(id) {
    return request(`/api/guidelines/${id}`, {
      method: 'DELETE',
    });
  },

  async activateGuideline(id) {
    return request(`/api/guidelines/${id}/activate`, {
      method: 'POST',
    });
  },

  // Content analysis
  async analyzeContent(payload) {
    return request('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Reviews and governance decisions
  async getReviews() {
    return request('/api/reviews');
  },

  async getReview(id) {
    return request(`/api/reviews/${id}`);
  },

  async recordDecision(reviewId, decisionData) {
    return request(`/api/reviews/${reviewId}/decision`, {
      method: 'POST',
      body: JSON.stringify(decisionData),
    });
  },

  async updateFindingStatus(reviewId, findingId, reviewStatus) {
    return request(`/api/reviews/${reviewId}/findings/${findingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status: reviewStatus }),
    });
  },

  async deleteReview(id) {
    return request(`/api/reviews/${id}`, {
      method: 'DELETE',
    });
  },
};
