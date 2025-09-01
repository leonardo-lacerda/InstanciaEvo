// script.js - Arquivo principal refatorado da aplicação Evolution API Manager
// Este arquivo integra todos os módulos e inicializa a aplicação

/**
 * Carregamento dos módulos (em um ambiente real, use ES6 modules ou um bundler)
 * Os arquivos devem ser carregados nesta ordem no HTML:
 * 1. config.js
 * 2. utils.js  
 * 3. state.js
 * 4. evolution-api.js
 * 5. auth.js
 * 6. navigation.js
 * 7. instance-manager.js
 * 8. instance-page.js
 * 9. message-manager.js
 * 10. analytics.js
 * 11. business-config.js
 * 12. modal.js
 * 13. script.js (este arquivo)
 */

// Classe principal da aplicação
class EvolutionAPIManager {
    constructor() {
        this.initialized = false;
        this.periodicTasks = [];
    }
    
    // Inicializar aplicação
    async init() {
        try {
            console.log('🚀 Inicializando Evolution API Manager...');
            
            // Verificar dependências
            this.checkDependencies();
            
            // Inicializar estado da aplicação
            const hasSession = appState.init();
            
            // Configurar sistema de navegação
            Navigation.init();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Inicializar autenticação
            if (hasSession) {
                Navigation.showPage('admin');
                InstanceManager.loadInstancesList();
                Analytics.updateStatistics();
                console.log('✅ Sessão administrativa restaurada');
            } else {
                Navigation.showPage('login');
            }
            
            // Configurar tarefas periódicas
            this.setupPeriodicTasks();
            
            // Configurar monitoramento de conectividade
            this.setupConnectivityMonitoring();
            
            // Configurar atalhos de teclado
            this.setupKeyboardShortcuts();
            
            // Configurar sistema de webhooks
            this.setupWebhookHandlers();
            
            // Verificar parâmetros da URL
            if (!Navigation.checkUrlParams() && !hasSession) {
                Navigation.showPage('login');
            }
            
            this.initialized = true;
            console.log('✅ Evolution API Manager inicializado com sucesso');
            
            // Verificar conectividade com a Evolution API
            await this.checkAPIConnectivity();
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            Utils.showToast('Erro ao inicializar o sistema. Recarregue a página.', 'error');
        }
    }
    
    // Verificar dependências
    checkDependencies() {
        const requiredGlobals = [
            'CONFIG', 'Utils', 'appState', 'evolutionAPI', 'authManager',
            'Navigation', 'InstanceManager', 'MessageManager', 'Analytics',
            'BusinessConfig', 'Modal'
        ];
        
        const missingDependencies = requiredGlobals.filter(dep => 
            typeof window[dep] === 'undefined'
        );
        
        if (missingDependencies.length > 0) {
            throw new Error(`Dependências não encontradas: ${missingDependencies.join(', ')}`);
        }
    }
    
    // Configurar event listeners
    setupEventListeners() {
        // Autenticação
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', AuthHandlers.handleLogin);
        }
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', AuthHandlers.handleLogout);
        }
        
        // Gerenciamento de instâncias
        const createInstanceForm = document.getElementById('createInstanceForm');
        if (createInstanceForm) {
            createInstanceForm.addEventListener('submit', InstanceHandlers.handleCreateInstance);
        }
        
        const refreshInstances = document.getElementById('refreshInstances');
        if (refreshInstances) {
            refreshInstances.addEventListener('click', InstanceHandlers.handleRefreshInstances);
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', InstanceHandlers.handleFilterChange);
        }
        
        const searchFilter = document.getElementById('searchFilter');
        if (searchFilter) {
            searchFilter.addEventListener('input', Utils.debounce(
                InstanceHandlers.handleFilterChange, 300
            ));
        }
        
        // Página da instância
        const refreshQR = document.getElementById('refreshQR');
        if (refreshQR) {
            refreshQR.addEventListener('click', InstancePageHandlers.handleRefreshQR);
        }
        
        const downloadQR = document.getElementById('downloadQR');
        if (downloadQR) {
            downloadQR.addEventListener('click', InstancePageHandlers.handleDownloadQR);
        }
        
        const testWebhook = document.getElementById('testWebhook');
        if (testWebhook) {
            testWebhook.addEventListener('click', InstancePageHandlers.handleTestWebhook);
        }
        
        const webhookUrlInstance = document.getElementById('webhookUrlInstance');
        if (webhookUrlInstance) {
            webhookUrlInstance.addEventListener('input', Utils.debounce(
                InstancePageHandlers.handleWebhookUrlChange, 500
            ));
        }
        
        // Configuração de negócio
        const businessForm = document.getElementById('businessForm');
        if (businessForm) {
            businessForm.addEventListener('submit', BusinessConfigHandlers.handleBusinessFormSubmit);
        }
        
        const addService = document.getElementById('addService');
        if (addService) {
            addService.addEventListener('click', BusinessConfigHandlers.handleAddService);
        }
        
        // Mensagens
        const sendTestMessage = document.getElementById('sendTestMessage');
        if (sendTestMessage) {
            sendTestMessage.addEventListener('click', MessageHandlers.handleSendTestMessage);
        }
        
        const testMessage = document.getElementById('testMessage');
        if (testMessage) {
            testMessage.addEventListener('keydown', MessageHandlers.handleMessageKeyPress);
        }
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', NavigationHandlers.handleTabClick);
        });
        
        // Modais
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', ModalHandlers.handleCloseModal);
        }
        
        const modalCancel = document.getElementById('modalCancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', ModalHandlers.handleCancelModal);
        }
        
        const modalConfirm = document.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.addEventListener('click', ModalHandlers.handleConfirmModal);
        }
        
        // Export buttons
        const exportMessages = document.getElementById('exportMessages');
        if (exportMessages) {
            exportMessages.addEventListener('click', MessageHandlers.handleExportMessages);
        }
        
        const exportConfig = document.getElementById('exportConfig');
        if (exportConfig) {
            exportConfig.addEventListener('click', BusinessConfigHandlers.handleExportConfig);
        }
        
        const exportAll = document.getElementById('exportAll');
        if (exportAll) {
            exportAll.addEventListener('click', () => {
                const report = Analytics.generateDetailedReport();
                if (report) {
                    const filename = `evolution-backup-${new Date().toISOString().split('T')[0]}.json`;
                    Utils.downloadJSON(report, filename);
                    Utils.showToast('Backup completo exportado!', 'success');
                }
            });
        }
        
        const exportData = document.getElementById('exportData');
        if (exportData) {
            exportData.addEventListener('click', () => {
                const backup = appState.createBackup();
                const filename = `evolution-backup-${new Date().toISOString().split('T')[0]}.json`;
                Utils.downloadJSON(backup, filename);
                Utils.showToast('Dados exportados!', 'success');
            });
        }
    }
    
    // Configurar tarefas periódicas
    setupPeriodicTasks() {
        // Backup automático a cada 5 minutos
        const backupTask = setInterval(() => {
            this.performAutoBackup();
        }, CONFIG.BACKUP_INTERVAL);
        
        // Verificar saúde das instâncias a cada 2 minutos
        const healthTask = setInterval(() => {
            InstanceManager.checkInstancesHealth();
        }, CONFIG.HEALTH_CHECK_INTERVAL);
        
        // Atualizar analytics a cada minuto se estiver na tab correta
        const analyticsTask = setInterval(() => {
            if (appState.currentInstance && Navigation.currentTab === 'analytics') {
                Analytics.updateInstanceAnalytics();
            }
        }, 60 * 1000);
        
        // Atualizar uptime das instâncias conectadas
        const uptimeTask = setInterval(() => {
            appState.instances.forEach(instance => {
                if (instance.status === 'connected') {
                    instance.uptime = (instance.uptime || 0) + 1;
                }
            });
            appState.saveInstances();
        }, 60 * 1000);
        
        this.periodicTasks = [backupTask, healthTask, analyticsTask, uptimeTask];
        console.log('⏰ Tarefas periódicas configuradas');
    }
    
    // Realizar backup automático
    performAutoBackup() {
        try {
            const backup = appState.createBackup();
            localStorage.setItem('evolutionAutoBackup', JSON.stringify(backup));
            console.log('💾 Backup automático realizado');
        } catch (error) {
            console.error('Erro no backup automático:', error);
        }
    }
    
    // Configurar monitoramento de conectividade
    setupConnectivityMonitoring() {
        window.addEventListener('online', () => {
            Utils.showToast('Conexão restaurada!', 'success');
            
            // Verificar status das instâncias após reconexão
            if (appState.instances.length > 0) {
                setTimeout(() => {
                    InstanceManager.checkInstancesHealth();
                    Utils.showToast('Verificando status das instâncias...', 'info');
                }, 2000);
            }
        });

        window.addEventListener('offline', () => {
            Utils.showToast('Sem conexão com a internet!', 'warning');
        });
        
        console.log('🌐 Monitoramento de conectividade configurado');
    }
    
    // Configurar atalhos de teclado globais
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+R para atualizar lista de instâncias (somente na página admin)
            if (e.ctrlKey && e.key === 'r' && Navigation.currentPage === 'admin') {
                e.preventDefault();
                InstanceManager.refreshInstancesList();
            }
            
            // Ctrl+B para fazer backup manual
            if (e.ctrlKey && e.key === 'b' && authManager.isAuthenticated()) {
                e.preventDefault();
                this.performAutoBackup();
                Utils.showToast('Backup manual realizado!', 'success');
            }
            
            // F5 para atualizar analytics (na tab de analytics)
            if (e.key === 'F5' && Navigation.currentTab === 'analytics') {
                e.preventDefault();
                Analytics.updateInstanceAnalytics();
                Utils.showToast('Analytics atualizados!', 'success');
            }
        });
        
        console.log('⌨️ Atalhos de teclado configurados');
    }
    
    // Configurar handlers para webhooks
    setupWebhookHandlers() {
        // Listener para mensagens de webhook (simulação)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'webhook') {
                this.handleWebhookEvent(event.data);
            }
        });
        
        console.log('🔗 Sistema de webhooks configurado');
    }
    
    // Processar eventos de webhook
    handleWebhookEvent(data) {
        try {
            switch (data.eventType) {
                case 'message.received':
                    MessageManager.handleReceivedMessage(data);
                    break;
                    
                case 'qr.updated':
                    this.handleQRUpdated(data);
                    break;
                    
                case 'connection.status':
                    this.handleConnectionStatus(data);
                    break;
                    
                default:
                    console.log('Evento de webhook não reconhecido:', data);
            }
        } catch (error) {
            console.error('Erro ao processar webhook:', error);
        }
    }
    
    // Processar atualização de QR Code
    handleQRUpdated(data) {
        const instance = appState.getInstanceById(data.instanceId);
        if (instance) {
            appState.updateInstance(data.instanceId, {
                qrCode: data.qrCode,
                status: 'waiting_qr',
                lastActivity: new Date().toISOString()
            });
            
            // Atualizar QR na interface se necessário
            if (appState.currentInstance && appState.currentInstance.id === data.instanceId) {
                InstancePage.displayQRCode(data.qrCode);
                InstancePage.updateConnectionStatus();
            }
            
            if (Navigation.currentPage === 'admin') {
                InstanceManager.loadInstancesList();
                Analytics.updateStatistics();
            }
        }
    }
    
    // Processar mudança de status de conexão
    handleConnectionStatus(data) {
        const instance = appState.getInstanceById(data.instanceId);
        if (instance) {
            appState.updateInstance(data.instanceId, {
                status: data.status,
                lastActivity: new Date().toISOString()
            });
            
            if (data.status === 'connected') {
                appState.updateInstance(data.instanceId, {
                    connectedAt: new Date().toISOString()
                });
                Utils.showToast(`Instância ${instance.name} conectada!`, 'success');
            } else if (data.status === 'disconnected') {
                Utils.showToast(`Instância ${instance.name} desconectada!`, 'warning');
            }
            
            // Atualizar interface
            if (appState.currentInstance && appState.currentInstance.id === data.instanceId) {
                InstancePage.updateConnectionStatus();
            }
            
            if (Navigation.currentPage === 'admin') {
                InstanceManager.loadInstancesList();
                Analytics.updateStatistics();
            }
        }
    }
    
    // Verificar conectividade com a Evolution API
    async checkAPIConnectivity() {
        try {
            const result = await evolutionAPI.testConnection();
            
            if (result.status === 'connected') {
                console.log(`🔌 Conectado à Evolution API (${result.instances} instâncias)`);
            } else {
                console.warn('⚠️ Problema na conexão com Evolution API:', result.message);
                Utils.showToast('Problema na conexão com Evolution API', 'warning');
            }
        } catch (error) {
            console.error('❌ Falha na conexão com Evolution API:', error);
            Utils.showToast('Evolution API indisponível (modo offline)', 'warning');
        }
    }
    
    // Finalizar aplicação
    destroy() {
        // Cancelar tarefas periódicas
        this.periodicTasks.forEach(task => clearInterval(task));
        this.periodicTasks = [];
        
        // Realizar backup final
        this.performAutoBackup();
        
        console.log('🛑 Evolution API Manager finalizado');
    }
}

// Instância global da aplicação
const app = new EvolutionAPIManager();

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.init();
        
        // Migrar dados antigos se necessário
        const oldData = localStorage.getItem('instances');
        if (oldData && !localStorage.getItem('evolutionInstances')) {
            console.log('🔄 Migrando dados antigos...');
            localStorage.setItem('evolutionInstances', oldData);
            localStorage.removeItem('instances');
            appState.loadInstances();
            Utils.showToast('Dados migrados com sucesso!', 'info');
        }
        
    } catch (error) {
        console.error('❌ Falha crítica na inicialização:', error);
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
                <div style="text-align: center; padding: 20px; border: 1px solid #e74c3c; border-radius: 8px; background: #fdf2f2;">
                    <h2 style="color: #e74c3c;">Erro de Inicialização</h2>
                    <p>Ocorreu um erro crítico ao inicializar o sistema.</p>
                    <p><strong>Detalhes:</strong> ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Recarregar Página
                    </button>
                </div>
            </div>
        `;
    }
});

// Finalizar aplicação antes de sair da página
window.addEventListener('beforeunload', () => {
    if (app.initialized) {
        app.destroy();
    }
});

// Debugging em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.app = app;
    window.appState = appState;
    window.evolutionAPI = evolutionAPI;
    console.log('🔧 Modo de desenvolvimento ativado');
    console.log('📊 Objetos globais disponíveis: app, appState, evolutionAPI');
}

// Exportar para uso em outros contextos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EvolutionAPIManager, app };
} else {
    window.EvolutionAPIManager = EvolutionAPIManager;
    window.app = app;
}