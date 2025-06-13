const API_URL = 'http://localhost:5000';

export const getAuthToken = () => localStorage.getItem('auth_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (accessToken, refreshToken) => {
    if (accessToken) {
        localStorage.setItem('auth_token', accessToken);
    }
    if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
    }
};

export const clearTokens = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
};

// Add a lock mechanism for token refresh
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
    refreshSubscribers.forEach(callback => callback(token));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

export const refreshAuthToken = async () => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            console.error("No refresh token available");
            clearTokens();
            return false;
        }

        const response = await fetch(`${API_URL}/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.error("Token refresh failed:", response.status);
            clearTokens();
            return false;
        }

        const data = await response.json();
        if (data.access_token) {
            setTokens(data.access_token, null); // Don't update refresh token
            return true;
        }

        return false;
    } catch (error) {
        console.error("Failed to refresh token:", error);
        clearTokens();
        return false;
    }
};

export const isAuthenticated = () => {
    const token = getAuthToken();
    return !!token;
}; 