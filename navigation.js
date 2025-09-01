// navigation.js - Sistema de navegação e controle de páginas
const Navigation = {
    currentPage: null,
    currentTab: null,
    
    // Mostrar página específica
    showPage(pageName) {
        try {
            // Ocultar todas as páginas
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Mostrar página solicitada
            const targetPage = document.getElementById(pageName + 'Page');
            if (targetPage) {
                targetPage.classList.add('active');
                targetPage.classList.add('fade-in');
                this.currentPage = pageName;
                
                // Executar ações específicas da página
                this.onPageChange(pageName);
            } else {
                console.error('Página não encontrada:', pageName);
                Utils.showToast('Página não encontrada!', 'error');
            }
        } catch (error) {
            Utils.handleError(error, 'showPage');
        }
    },
    
    // Alternar entre abas
    switchTab(tabName) {
        try {
            // Atualizar botões das abas
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            
            // Atualizar conteúdo das abas
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetTab = document.getElementById(tabName + 'Tab');
            if (targetTab) {
                targetTab.classList.add('active');
                this.currentTab = tabName;
                
                // Executar ações específicas da aba
                this.onTabChange(tabName);
            }
        } catch (error) {
            Utils.handleError(error, 'switchTab');
        }
    },
    
    // Ações executadas quando a página muda
    onPageChange(pageName) {
        switch (pageName) {
            case 'admin':
                // Verificar se está autenticado
                if (!authManager.isAuthenticated()) {
                    this.showPage('login');
                    return;
                }
                break;
                
            case 'instance':
                // Verificar se há instância selecionada
                if (!appState.currentInstance) {
                    Utils.showToast('Nenhuma instância selecionada', 'warning');
                    this.showPage('login');
                    return;
                }
                break;
        }
    },
    
    // Ações executadas quando a aba muda
    onTabChange(tabName) {
        switch (tabName) {
            case 'analytics':
                if (appState.currentInstance) {
                    Analytics.updateInstanceAnalytics();
                }
                break;
                
            case 'messages':
                if (appState.currentInstance) {
                    MessageManager.loadInstanceMessages(appState.currentInstance.id);
                }
                break;
                
            case 'config':
                if (appState.currentInstance && appState.currentInstance.businessData) {
                    BusinessConfig.loadBusinessData(appState.currentInstance.businessData);
                }
                break;
        }
    },
    
    // Carregar página de instância específica
    loadInstancePage(instanceId) {
        try {
            const instance = appState.getInstanceById(instanceId);
            
            if (!instance) {
                Utils.showToast('Instância não encontrada!', 'error');
                this.showPage('login');
                return false;
            }
            
            appState.setCurrentInstance(instance);
            this.showPage('instance');
            
            // Configurar página da instância
            InstancePage.setup(instance);
            
            return true;
        } catch (error) {
            Utils.handleError(error, 'loadInstancePage');
            return false;
        }
    },
    
    // Verificar e processar parâmetros da URL
    checkUrlParams() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const instanceId = urlParams.get('instance');
            
            if (instanceId) {
                // Carregar página da instância diretamente
                this.loadInstancePage(instanceId);
                return true;
            }
        } catch (error) {
            console.error('Erro ao processar parâmetros da URL:', error);
        }
        
        return false;
    },
    
    // Criar link para instância
    createInstanceLink(instanceId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?instance=${instanceId}`;
    },
    
    // Copiar link da instância
    copyInstanceLink(instanceId) {
        const instanceLink = this.createInstanceLink(instanceId);
        Utils.copyToClipboard(instanceLink);
    },
    
    // Navegar para trás
    goBack() {
        if (this.currentPage === 'instance') {
            if (authManager.isAuthenticated()) {
                this.showPage('admin');
            } else {
                this.showPage('login');
            }
        }
    },
    
    // Configurar navegação por breadcrumbs
    updateBreadcrumbs(path) {
        const breadcrumbsContainer = document.getElementById('breadcrumbs');
        if (!breadcrumbsContainer) return;
        
        const pathParts = path.split('/').filter(part => part);
        const breadcrumbsHtml = pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1;
            if (isLast) {
                return `<span class="breadcrumb-current">${part}</span>`;
            } else {
                return `<a href="#" class="breadcrumb-link" data-path="${pathParts.slice(0, index + 1).join('/')}">${part}</a>`;
            }
        }).join(' / ');
        
        breadcrumbsContainer.innerHTML = breadcrumbsHtml;
    },
    
    // Configurar histórico do browser
    updateBrowserHistory(page, instanceId = null) {
        try {
            let url = window.location.pathname;
            let title = 'Evolution API Manager';
            
            if (page === 'instance' && instanceId) {
                url += `?instance=${instanceId}`;
                const instance = appState.getInstanceById(instanceId);
                if (instance) {
                    title = `${instance.name} - Evolution API Manager`;
                }
            }
            
            window.history.pushState({ page, instanceId }, title, url);
            document.title = title;
        } catch (error) {
            console.error('Erro ao atualizar histórico:', error);
        }
    },
    
    // Configurar handlers para voltar/avançar no browser
    setupBrowserNavigation() {
        window.addEventListener('popstate', (event) => {
            const state = event.state;
            if (state) {
                if (state.page === 'instance' && state.instanceId) {
                    this.loadInstancePage(state.instanceId);
                } else {
                    this.showPage(state.page || 'login');
                }
            }
        });
    },
    
    // Configurar atalhos de teclado para navegação
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + B para voltar
            if (e.altKey && e.key === 'b') {
                e.preventDefault();
                this.goBack();
            }
            
            // Alt + H para ir ao início (admin)
            if (e.altKey && e.key === 'h' && authManager.isAuthenticated()) {
                e.preventDefault();
                this.showPage('admin');
            }
            
            // Alt + 1,2,3 para alternar entre abas
            if (e.altKey && ['1', '2', '3'].includes(e.key) && this.currentPage === 'instance') {
                e.preventDefault();
                const tabs = ['config', 'messages', 'analytics'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    this.switchTab(tabs[tabIndex]);
                }
            }
        });
    },
    
    // Inicializar sistema de navegação
    init() {
        this.setupBrowserNavigation();
        this.setupKeyboardShortcuts();
        
        // Verificar URL inicial
        if (!this.checkUrlParams()) {
            // Se não há parâmetros, verificar autenticação
            if (!AuthHandlers.initializeAuth()) {
                this.showPage('login');
            }
        }
    }
};

// Event handlers específicos para navegação
const NavigationHandlers = {
    // Handler para cliques em links de instância
    handleInstanceClick(instanceId) {
        Navigation.loadInstancePage(instanceId);
        Navigation.updateBrowserHistory('instance', instanceId);
    },
    
    // Handler para cliques em abas
    handleTabClick(e) {
        const tabName = e.target.dataset.tab;
        if (tabName) {
            Navigation.switchTab(tabName);
        }
    },
    
    // Handler para botão voltar
    handleBackClick() {
        Navigation.goBack();
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Navigation, NavigationHandlers };
} else {
    window.Navigation = Navigation;
    window.NavigationHandlers = NavigationHandlers;
}