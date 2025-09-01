// auth.js - Sistema de autenticação e autorização
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loginCallbacks = [];
        this.logoutCallbacks = [];
    }
    
    // Realizar login
    async login(username, password) {
        try {
            // Validação básica
            if (!username || !password) {
                throw new Error('Usuário e senha são obrigatórios');
            }
            
            // Verificar credenciais (para produção, implementar autenticação real)
            if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
                const user = {
                    username: username,
                    role: 'admin',
                    loginTime: new Date().toISOString(),
                    sessionId: Utils.generateToken()
                };
                
                this.setCurrentUser(user);
                this.triggerCallbacks(this.loginCallbacks, user);
                
                Utils.showToast('Login realizado com sucesso!', 'success');
                return { success: true, user };
            } else {
                throw new Error('Usuário ou senha incorretos');
            }
        } catch (error) {
            Utils.showToast(error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    // Realizar logout
    logout() {
        if (this.currentUser) {
            const wasLoggedIn = true;
            const user = { ...this.currentUser };
            
            this.currentUser = null;
            appState.setCurrentUser(null);
            appState.setCurrentInstance(null);
            
            this.triggerCallbacks(this.logoutCallbacks, user);
            
            if (wasLoggedIn) {
                Utils.showToast('Logout realizado com sucesso!', 'success');
            }
            
            return true;
        }
        return false;
    }
    
    // Verificar se usuário está autenticado
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // Verificar se usuário tem permissão específica
    hasPermission(permission) {
        if (!this.isAuthenticated()) return false;
        
        // Para o sistema atual, admin tem todas as permissões
        if (this.currentUser.role === 'admin') return true;
        
        // Expandir conforme necessário para outros tipos de usuário
        return false;
    }
    
    // Definir usuário atual
    setCurrentUser(user) {
        this.currentUser = user;
        appState.setCurrentUser(user);
    }
    
    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Restaurar sessão do localStorage
    restoreSession() {
        try {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                
                // Verificar se a sessão ainda é válida (opcional)
                if (this.isSessionValid(user)) {
                    this.currentUser = user;
                    appState.setCurrentUser(user);
                    return true;
                }
            }
        } catch (error) {
            console.error('Erro ao restaurar sessão:', error);
            localStorage.removeItem('currentUser');
        }
        
        return false;
    }
    
    // Verificar se sessão é válida
    isSessionValid(user) {
        if (!user || !user.loginTime) return false;
        
        // Sessão válida por 24 horas (opcional)
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        return hoursDiff < 24;
    }
    
    // Registrar callback para login
    onLogin(callback) {
        if (typeof callback === 'function') {
            this.loginCallbacks.push(callback);
        }
    }
    
    // Registrar callback para logout
    onLogout(callback) {
        if (typeof callback === 'function') {
            this.logoutCallbacks.push(callback);
        }
    }
    
    // Disparar callbacks
    triggerCallbacks(callbacks, data) {
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Erro no callback:', error);
            }
        });
    }
    
    // Middleware para verificar autenticação em ações
    requireAuth(action) {
        return (...args) => {
            if (!this.isAuthenticated()) {
                Utils.showToast('Ação requer autenticação', 'warning');
                return false;
            }
            return action.apply(this, args);
        };
    }
    
    // Middleware para verificar permissão específica
    requirePermission(permission, action) {
        return (...args) => {
            if (!this.hasPermission(permission)) {
                Utils.showToast('Permissão insuficiente', 'error');
                return false;
            }
            return action.apply(this, args);
        };
    }
    
    // Gerar token de autenticação para APIs externas
    generateAuthToken(instanceId) {
        if (!this.isAuthenticated()) return null;
        
        const tokenData = {
            userId: this.currentUser.username,
            instanceId: instanceId,
            timestamp: Date.now(),
            sessionId: this.currentUser.sessionId
        };
        
        // Em produção, usar uma biblioteca de JWT
        return btoa(JSON.stringify(tokenData));
    }
    
    // Validar token de autenticação
    validateAuthToken(token, instanceId) {
        try {
            const tokenData = JSON.parse(atob(token));
            
            if (tokenData.instanceId !== instanceId) return false;
            if (tokenData.sessionId !== this.currentUser?.sessionId) return false;
            
            // Verificar se token não expirou (1 hora)
            const hoursDiff = (Date.now() - tokenData.timestamp) / (1000 * 60 * 60);
            return hoursDiff < 1;
        } catch (error) {
            return false;
        }
    }
}

// Instância global do gerenciador de autenticação
const authManager = new AuthManager();

// Event handlers para autenticação
const AuthHandlers = {
    // Handler para formulário de login
    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        authManager.login(username, password).then(result => {
            if (result.success) {
                document.getElementById('loginForm').reset();
                Navigation.showPage('admin');
                InstanceManager.loadInstancesList();
                Analytics.updateStatistics();
            } else {
                document.getElementById('password').value = '';
            }
        });
    },
    
    // Handler para logout
    handleLogout() {
        if (confirm('Tem certeza que deseja sair?')) {
            authManager.logout();
            Navigation.showPage('login');
            document.getElementById('loginForm').reset();
            
            // Limpar URL se houver parâmetros
            if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    },
    
    // Verificar autenticação na inicialização
    initializeAuth() {
        if (authManager.restoreSession()) {
            Navigation.showPage('admin');
            InstanceManager.loadInstancesList();
            Analytics.updateStatistics();
            return true;
        } else {
            Navigation.showPage('login');
            return false;
        }
    }
};

// Configurar callbacks de autenticação
authManager.onLogin((user) => {
    console.log('Usuário logado:', user.username);
});

authManager.onLogout((user) => {
    console.log('Usuário deslogado:', user.username);
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, authManager, AuthHandlers };
} else {
    window.AuthManager = AuthManager;
    window.authManager = authManager;
    window.AuthHandlers = AuthHandlers;
}