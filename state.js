// state.js - Gerenciamento de estado global da aplicação
class AppState {
    constructor() {
        this.instances = [];
        this.currentUser = null;
        this.currentInstance = null;
        this.messageHistory = [];
        this.analytics = {};
    }
    
    // Getters
    getTotalInstances() {
        return this.instances.length;
    }
    
    getConnectedInstances() {
        return this.instances.filter(i => i.status === 'connected').length;
    }
    
    getWaitingInstances() {
        return this.instances.filter(i => i.status === 'waiting_qr').length;
    }
    
    getDisconnectedInstances() {
        return this.instances.filter(i => i.status === 'disconnected').length;
    }
    
    getInstanceById(id) {
        return this.instances.find(i => i.id === id);
    }
    
    getInstanceMessages(instanceId, limit = null) {
        let messages = this.messageHistory.filter(m => m.instanceId === instanceId);
        if (limit) {
            messages = messages.slice(-limit);
        }
        return messages;
    }
    
    // Setters
    addInstance(instance) {
        this.instances.push(instance);
        this.saveInstances();
    }
    
    updateInstance(instanceId, updates) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            this.instances[index] = { ...this.instances[index], ...updates };
            this.saveInstances();
            return this.instances[index];
        }
        return null;
    }
    
    removeInstance(instanceId) {
        this.instances = this.instances.filter(i => i.id !== instanceId);
        // Remover mensagens relacionadas
        this.messageHistory = this.messageHistory.filter(m => m.instanceId !== instanceId);
        this.saveInstances();
        this.saveMessageHistory();
    }
    
    addMessage(messageData) {
        this.messageHistory.push(messageData);
        
        // Manter apenas as últimas mensagens por instância
        const instanceMessages = this.getInstanceMessages(messageData.instanceId);
        if (instanceMessages.length > CONFIG.MAX_MESSAGES_PER_INSTANCE) {
            const messagesToKeep = instanceMessages.slice(-CONFIG.MAX_MESSAGES_PER_INSTANCE);
            this.messageHistory = this.messageHistory.filter(m => 
                m.instanceId !== messageData.instanceId || messagesToKeep.includes(m)
            );
        }
        
        // Manter limite global de mensagens
        if (this.messageHistory.length > CONFIG.MAX_MESSAGES_IN_HISTORY) {
            this.messageHistory = this.messageHistory.slice(-CONFIG.MAX_MESSAGES_IN_HISTORY);
        }
        
        this.saveMessageHistory();
    }
    
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    }
    
    setCurrentInstance(instance) {
        this.currentInstance = instance;
    }
    
    // Persistência
    saveInstances() {
        try {
            localStorage.setItem('evolutionInstances', JSON.stringify(this.instances));
        } catch (error) {
            console.error('Erro ao salvar instâncias:', error);
            throw new Error('Falha ao salvar dados das instâncias');
        }
    }
    
    loadInstances() {
        try {
            const saved = localStorage.getItem('evolutionInstances');
            if (saved) {
                this.instances = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Erro ao carregar instâncias:', error);
            this.instances = [];
        }
    }
    
    saveMessageHistory() {
        try {
            localStorage.setItem('evolutionMessageHistory', JSON.stringify(this.messageHistory));
        } catch (error) {
            console.error('Erro ao salvar histórico de mensagens:', error);
            throw new Error('Falha ao salvar histórico de mensagens');
        }
    }
    
    loadMessageHistory() {
        try {
            const saved = localStorage.getItem('evolutionMessageHistory');
            if (saved) {
                this.messageHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico de mensagens:', error);
            this.messageHistory = [];
        }
    }
    
    saveAnalytics() {
        try {
            localStorage.setItem('evolutionAnalytics', JSON.stringify(this.analytics));
        } catch (error) {
            console.error('Erro ao salvar analytics:', error);
        }
    }
    
    loadAnalytics() {
        try {
            const saved = localStorage.getItem('evolutionAnalytics');
            if (saved) {
                this.analytics = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
            this.analytics = {};
        }
    }
    
    loadCurrentUser() {
        try {
            const saved = localStorage.getItem('currentUser');
            if (saved) {
                this.currentUser = JSON.parse(saved);
                return true;
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            localStorage.removeItem('currentUser');
        }
        return false;
    }
    
    // Backup e restore
    createBackup() {
        return {
            instances: this.instances,
            messageHistory: this.messageHistory.slice(-CONFIG.MAX_MESSAGES_IN_HISTORY),
            analytics: this.analytics,
            timestamp: new Date().toISOString(),
            version: CONFIG.VERSION
        };
    }
    
    restoreBackup(backupData) {
        if (!backupData || !backupData.instances) {
            throw new Error('Dados de backup inválidos');
        }
        
        this.instances = backupData.instances || [];
        this.messageHistory = backupData.messageHistory || [];
        this.analytics = backupData.analytics || {};
        
        this.saveInstances();
        this.saveMessageHistory();
        this.saveAnalytics();
    }
    
    // Filtros
    filterInstances(statusFilter = 'all', searchText = '') {
        return this.instances.filter(instance => {
            const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
            const matchesSearch = !searchText || 
                instance.name.toLowerCase().includes(searchText.toLowerCase()) ||
                instance.description.toLowerCase().includes(searchText.toLowerCase()) ||
                instance.id.toLowerCase().includes(searchText.toLowerCase());
            
            return matchesStatus && matchesSearch;
        });
    }
    
    // Inicialização
    init() {
        this.loadInstances();
        this.loadMessageHistory();
        this.loadAnalytics();
        return this.loadCurrentUser();
    }
}

// Instância global do estado
const appState = new AppState();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, appState };
} else {
    window.appState = appState;
    window.AppState = AppState;
}