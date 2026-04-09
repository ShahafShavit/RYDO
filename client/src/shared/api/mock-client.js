// client/src/shared/api/mock-client.js
import { API_CONFIG } from '@/shared/config/api-config';
import { MOCK_USERS } from '@/shared/mocks/users';
import { MOCK_ROUTES, MOCK_SAVED_ROUTES } from '@/shared/mocks/routes';
import { MOCK_CHALLENGES } from '@/shared/mocks/challenges';
import { MOCK_HAZARDS } from '@/shared/mocks/hazards';
import { MOCK_RIDE_GROUPS } from '@/shared/mocks/rides';
import { MOCK_CHAT_MESSAGES } from '@/shared/mocks/chat';
import { MOCK_HISTORY } from '@/shared/mocks/history';

// Inline minimal mock service implementations (previously in shared/services/*)
let users = [...MOCK_USERS];
const userService = {
    login: async (credentials) => {
        const user = users.find(u => u.email === credentials.email);
        if (!user) throw new Error('Invalid credentials');
        return { user, token: 'mock-jwt-token-' + user.id };
    },
    register: async (userData) => {
        const existing = users.find(u => u.email === userData.email);
        if (existing) throw new Error('User already exists');
        const newUser = { id: Math.max(...users.map(u => u.id)) + 1, ...userData, role: 'user', createdAt: new Date().toISOString(), isActive: true };
        users.push(newUser);
        return { user: newUser, token: 'mock-jwt-token-' + newUser.id };
    },
    getUsers: async () => users,
    updateUser: async (id, updates) => {
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');
        users[index] = { ...users[index], ...updates };
        return users[index];
    },
    deleteUser: async (id) => { users = users.filter(u => u.id !== id); },
};

let routes = [...MOCK_ROUTES];
let savedRoutes = [...MOCK_SAVED_ROUTES];
const routeService = {
    getRoutes: async (params = {}) => {
        const { skip = 0, take = 20 } = params;
        return routes.slice(skip, skip + take);
    },
    getRouteById: async (id) => {
        const route = routes.find(r => r.id === parseInt(id));
        if (!route) throw new Error('Route not found');
        return route;
    },
    uploadRoute: async (data) => {
        const newRoute = { id: Math.max(...routes.map(r => r.id)) + 1, ...data, createdAt: new Date().toISOString() };
        routes.push(newRoute);
        return newRoute;
    },
    uploadGpx: async (data) => {
        const newRoute = { id: Math.max(...routes.map(r => r.id)) + 1, title: data.title || 'Uploaded Route', description: data.description || '', distanceKm: 25.0, elevationGainM: 500, difficulty: 'medium', terrain: 'mixed', durationMinutes: 120, createdBy: 'current_user', createdAt: new Date().toISOString(), coordinates: [[31.7683, 35.2137], [31.7690, 35.2140]] };
        routes.push(newRoute);
        return newRoute;
    },
    getSavedRoutes: async () => routes.filter(r => savedRoutes.includes(r.id)),
    saveRoute: async (routeId) => { if (!savedRoutes.includes(parseInt(routeId))) savedRoutes.push(parseInt(routeId)); },
    unsaveRoute: async (routeId) => { savedRoutes = savedRoutes.filter(id => id !== parseInt(routeId)); },
};

let challenges = [...MOCK_CHALLENGES];
const challengeService = {
    getChallenges: async () => challenges,
    createChallenge: async (data) => { const newChallenge = { id: Math.max(...challenges.map(c => c.id)) + 1, ...data, currentValue: 0, isActive: true }; challenges.push(newChallenge); return newChallenge; },
    updateChallenge: async (id, updates) => { const index = challenges.findIndex(c => c.id === id); if (index === -1) throw new Error('Challenge not found'); challenges[index] = { ...challenges[index], ...updates }; return challenges[index]; },
};

let hazards = [...MOCK_HAZARDS];
const hazardService = {
    getHazards: async () => hazards,
    createHazard: async (data) => { const newHazard = { id: Math.max(...hazards.map(h => h.id)) + 1, ...data, reportedAt: new Date().toISOString(), status: 'active' }; hazards.push(newHazard); return newHazard; },
    updateHazard: async (id, updates) => { const index = hazards.findIndex(h => h.id === id); if (index === -1) throw new Error('Hazard not found'); hazards[index] = { ...hazards[index], ...updates }; return hazards[index]; },
    deleteHazard: async (id) => { hazards = hazards.filter(h => h.id !== id); },
};

let rideGroups = [...MOCK_RIDE_GROUPS];
const rideService = {
    getRideGroups: async () => rideGroups,
    getRideDetails: async (id) => { const ride = rideGroups.find(r => r.id === parseInt(id)); if (!ride) throw new Error('Ride not found'); return ride; },
    createRideGroup: async (data) => { const newRide = { id: Math.max(...rideGroups.map(r => r.id)) + 1, ...data, participants: [] }; rideGroups.push(newRide); return newRide; },
    joinRide: async (rideId, userId) => { const ride = rideGroups.find(r => r.id === parseInt(rideId)); if (!ride) throw new Error('Ride not found'); if (!ride.participants.includes(userId)) ride.participants.push(userId); return ride; },
};

let chatMessages = { ...MOCK_CHAT_MESSAGES };
const chatService = {
    getMessages: async (rideId) => chatMessages[rideId] || [],
    sendMessage: async (rideId, messageData) => { const messages = chatMessages[rideId] || []; const newMessage = { id: Math.max(...messages.map(m => m.id), 0) + 1, ...messageData, timestamp: new Date().toISOString() }; if (!chatMessages[rideId]) chatMessages[rideId] = []; chatMessages[rideId].push(newMessage); return newMessage; },
};

let history = [...MOCK_HISTORY];
const historyService = {
    getHistory: async () => history,
    addHistoryEntry: async (data) => { const newEntry = { id: Math.max(...history.map(h => h.id)) + 1, ...data, completedAt: new Date().toISOString() }; history.push(newEntry); return newEntry; },
};

const adminService = {
    getUsers: async () => userService.getUsers(),
    getRoutes: async () => routeService.getRoutes(),
    getHazards: async () => hazardService.getHazards(),
    deactivateUser: async (id) => userService.updateUser(id, { isActive: false }),
    deleteRoute: async (id) => { console.log('adminService.deleteRoute called for', id); },
    resolveHazard: async (id) => hazardService.updateHazard(id, { status: 'resolved' }),
};

const mockServices = {
    auth: {
        login: userService.login,
        register: userService.register,
    },
    dashboard: {
        summary: () => ({ totalRoutes: 25, totalRides: 150, totalUsers: 500 }),
    },
    routes: {
        list: routeService.getRoutes,
        details: routeService.getRouteById,
        upload: routeService.uploadRoute,
        uploadGpx: routeService.uploadGpx,
        saved: routeService.getSavedRoutes,
        save: routeService.saveRoute,
        unsave: routeService.unsaveRoute,
    },
    rides: {
        groups: rideService.getRideGroups,
        details: rideService.getRideDetails,
    },
    chat: {
        messages: chatService.getMessages,
    },
    hazards: {
        list: hazardService.getHazards,
        create: hazardService.createHazard,
    },
    challenges: {
        list: challengeService.getChallenges,
    },
    history: {
        list: historyService.getHistory,
    },
    admin: {
        users: adminService.getUsers,
        routes: adminService.getRoutes,
        hazards: adminService.getHazards,
    },
};

function parseEndpoint(endpoint) {
    const parts = endpoint.split('/').filter(p => p);
    if (parts.length === 0) return { service: null, action: null };
    const service = parts[0];
    // action mapping: e.g. auth/login -> login, routes/123 -> details
    if (parts.length === 1) return { service, action: 'list' };
    if (parts.length === 2 && /^[0-9]+$/.test(parts[1])) return { service, action: 'details', id: parts[1] };
    const action = parts.slice(1).join('/');
    return { service, action };
}

export async function mockRequest(path, options = {}) {
    if (!API_CONFIG.useMockApi) throw new Error('Mock mode not enabled');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, API_CONFIG.mockDelay));

    // Simulate random errors if enabled
    if (API_CONFIG.enableMockErrors && Math.random() < 0.05) {
        throw new Error('Mock network error');
    }

    const { service, action, id } = parseEndpoint(path);
    const serviceActions = mockServices[service];
    if (!serviceActions) throw new Error(`Mock service not found for ${service}`);

    // Normalize action mapping for common cases
    let handler = serviceActions[action];
    if (!handler) {
        if (action === 'details' && serviceActions.details) handler = serviceActions.details;
        else if (action === '' && serviceActions.list) handler = serviceActions.list;
    }
    if (!handler) throw new Error(`Mock action not found: ${action}`);

    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET') {
        if (id) return handler(id);
        return handler(options.params);
    } else if (method === 'POST') {
        const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        return handler(body || {});
    } else if (method === 'PUT') {
        const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        return handler(body || {});
    } else if (method === 'DELETE') {
        return handler(options.params || {});
    }

    throw new Error(`Unsupported method: ${method}`);
}
