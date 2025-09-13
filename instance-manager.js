// instance-manager.js - Gerenciamento de instâncias com tratamento de erros melhorado
const InstanceManager = {
    // Criar nova instância
    async createInstance(formData) {
        try {
            const { instanceName, instanceDescription, webhookUrl, instanceToken } = formData;
            
            // Validações
            if (!instanceName || !instanceName.trim()) {
                throw new Error('Nome da instância é obrigatório!');
            }
            
            // Limpar nome da instância (remover espaços e caracteres especiais)
            const cleanInstanceName = instanceName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            
            // Verificar duplicatas
            const existingInstance = appState.instances.find(
                i => i.name.toLowerCase() === cleanInstanceName.toLowerCase()
            );
            if (existingInstance) {
                throw new Error('Já existe uma instância com este nome!');
            }
            
            // Validar webhook URL se fornecida
            if (webhookUrl && !Utils.isValidUrl(webhookUrl)) {
                throw new Error('URL do webhook inválida!');
            }
            
            const instanceId = Utils.generateInstanceId();
            
            const newInstance = {
                id: instanceId,
                name: cleanInstanceName,
                displayName: instanceName.trim(),
                description: instanceDescription?.trim() || '',
                created: new Date().toISOString(),
                status: 'creating',
                qrCode: null,
                webhookUrl: webhookUrl?.trim() || '',
                token: instanceToken?.trim() || Utils.generateToken(),
                businessData: null,
                lastActivity: null,
                messageCount: 0,
                uptime: 0,
                evolutionInstanceName: cleanInstanceName,
                errorCount: 0,
                lastError: null
            };
            
            // Adicionar instância ao estado local primeiro
            appState.addInstance(newInstance);
            this.loadInstancesList();
            Analytics.updateStatistics();
            
            Utils.showToast('Instância adicionada, criando na Evolution API...', 'info');
            
            // Criar na Evolution API
            await this.createEvolutionInstance(instanceId, cleanInstanceName);
            
            return newInstance;
        } catch (error) {
            Utils.handleError(error, 'createInstance');
            return null;
        }
    },
    
    // Criar instância na Evolution API
    async createEvolutionInstance(instanceId, instanceName) {
        try {
            const instance = appState.getInstanceById(instanceId);
            if (!instance) {
                throw new Error('Instância não encontrada no estado local');
            }
            
            // Atualizar status para criando
            appState.updateInstance(instanceId, { 
                status: 'creating',
                lastActivity: new Date().toISOString()
            });
            this.loadInstancesList();
            
            // Verificar se a API está online primeiro
            const isOnline = await evolutionAPI.isApiOnline();
            if (!isOnline) {
                throw new Error('Evolution API está offline ou inacessível');
            }
            
            // Criar na Evolution API
            const result = await evolutionAPI.createInstance(instanceName);
            console.log('Instância criada na Evolution API:', result);
            
            // Atualizar status para aguardando QR
            appState.updateInstance(instanceId, {
                status: 'waiting_qr',
                lastActivity: new Date().toISOString(),
                errorCount: 0,
                lastError: null
            });
            
            this.loadInstancesList();
            Analytics.updateStatistics();
            
            Utils.showToast('Instância criada! Obtendo QR Code...', 'success');
            
            // Aguardar um pouco antes de obter QR Code
            setTimeout(() => {
                this.getQRCode(instanceName, instanceId);
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao criar instância na Evolution API:', error);
            
            const errorMessage = this.parseApiError(error);
            
            appState.updateInstance(instanceId, {
                status: 'error',
                lastActivity: new Date().toISOString(),
                errorCount: (appState.getInstanceById(instanceId)?.errorCount || 0) + 1,
                lastError: errorMessage
            });
            
            this.loadInstancesList();
            Utils.showToast(`Erro ao criar instância: ${errorMessage}`, 'error');
        }
    },
    
    // Obter QR Code da instância
    async getQRCode(instanceName, instanceId) {
        try {
            const result = await evolutionAPI.getQRCode(instanceName);
            console.log('QR Code obtido:', result);
            
            if (result && result.base64) {
                appState.updateInstance(instanceId, {
                    qrCode: result.base64,
                    status: 'waiting_qr',
                    lastActivity: new Date().toISOString()
                });
                
                // Se estiver visualizando esta instância, atualizar QR
                if (appState.currentInstance && appState.currentInstance.id === instanceId) {
                    InstancePage.displayQRCode(result.base64);
                }
                
                Utils.showToast('QR Code gerado! Escaneie com seu WhatsApp.', 'success');
            } else {
                console.warn('QR Code não encontrado na resposta:', result);
                Utils.showToast('QR Code não disponível ainda. Tentando novamente...', 'warning');
                
                // Tentar novamente em 5 segundos
                setTimeout(() => {
                    this.getQRCode(instanceName, instanceId);
                }, 5000);
            }
        } catch (error) {
            console.error('Erro ao obter QR Code:', error);
            const errorMessage = this.parseApiError(error);
            
            appState.updateInstance(instanceId, {
                status: 'error',
                lastError: errorMessage,
                errorCount: (appState.getInstanceById(instanceId)?.errorCount || 0) + 1
            });
            
            Utils.showToast(`Erro ao obter QR Code: ${errorMessage}`, 'error');
        }
    },
    
    // Parse de erros da API
    parseApiError(error) {
        if (error.message.includes('<!doctype')) {
            return 'Servidor retornou HTML - verifique URL base e API key';
        }
        if (error.message.includes('404')) {
            return 'Endpoint não encontrado - verifique a configuração da API';
        }
        if (error.message.includes('401') || error.message.includes('403')) {
            return 'Erro de autenticação - verifique a API key';
        }
        if (error.message.includes('offline')) {
            return 'Evolution API está offline';
        }
        return error.message || 'Erro desconhecido na API';
    },
    
    // Carregar e exibir lista de instâncias
    loadInstancesList() {
        const instancesList = document.getElementById('instancesList');
        if (!instancesList) return;
        
        instancesList.innerHTML = '';
        
        if (appState.instances.length === 0) {
            instancesList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma instância criada ainda.</p>
                    <p>Crie sua primeira instância usando o formulário acima.</p>
                </div>
            `;
            return;
        }
        
        // Aplicar filtros
        const filtered = this.getFilteredInstances();
        
        if (filtered.length === 0) {
            instancesList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma instância encontrada com os filtros aplicados.</p>
                </div>
            `;
            return;
        }
        
        // Renderizar instâncias
        filtered.forEach(instance => {
            const instanceElement = this.createInstanceElement(instance);
            instancesList.appendChild(instanceElement);
        });
    },
    
    // Criar elemento HTML para uma instância
    createInstanceElement(instance) {
        const div = document.createElement('div');
        div.className = 'instance-item fade-in';
        
        const statusColor = Utils.getStatusColor(instance.status);
        const statusText = Utils.getStatusText(instance.status);
        
        // Adicionar classe para status de erro
        if (instance.status === 'error') {
            div.classList.add('error-state');
        }
        
        div.innerHTML = `
            <div class="instance-info">
                <div class="instance-header">
                    <h3>${Utils.escapeHtml(instance.displayName || instance.name)}</h3>
                    <span class="status-badge" style="background-color: ${statusColor}">
                        ${statusText}
                    </span>
                </div>
                ${instance.description ? `
                    <p class="instance-description">${Utils.escapeHtml(instance.description)}</p>
                ` : ''}
                ${instance.status === 'error' && instance.lastError ? `
                    <div class="error-info">
                        <strong>Último erro:</strong> ${Utils.escapeHtml(instance.lastError)}
                        ${instance.errorCount > 1 ? `<br><small>Erros: ${instance.errorCount}</small>` : ''}
                    </div>
                ` : ''}
                <div class="instance-details">
                    <div class="detail-item">
                        <label>ID:</label>
                        <span>${instance.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>Nome técnico:</label>
                        <span>${instance.name}</span>
                    </div>
                    <div class="detail-item">
                        <label>Criada em:</label>
                        <span>${Utils.formatDate(instance.created)}</span>
                    </div>
                    ${instance.lastActivity ? `
                        <div class="detail-item">
                            <label>Última atividade:</label>
                            <span>${Utils.formatDate(instance.lastActivity)}</span>
                        </div>
                    ` : ''}
                    ${instance.messageCount > 0 ? `
                        <div class="detail-item">
                            <label>Mensagens:</label>
                            <span>${instance.messageCount}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="instance-actions">
                <button class="action-btn primary" onclick="InstanceManager.viewInstance('${instance.id}')">
                    📱 Configurar
                </button>
                ${instance.status === 'error' ? `
                    <button class="action-btn warning" onclick="InstanceManager.retryInstance('${instance.id}')">
                        🔄 Tentar Novamente
                    </button>
                ` : ''}
                <button class="action-btn secondary" onclick="InstanceManager.copyInstanceLink('${instance.id}')">
                    🔗 Copiar Link
                </button>
                <button class="action-btn warning" onclick="InstanceManager.editInstance('${instance.id}')">
                    ✏️ Editar
                </button>
                <button class="action-btn danger" onclick="InstanceManager.deleteInstance('${instance.id}')">
                    🗑️ Excluir
                </button>
            </div>
        `;
        
        return div;
    },
    
    // Tentar novamente uma instância com erro
    async retryInstance(instanceId) {
        try {
            const instance = appState.getInstanceById(instanceId);
            if (!instance) return;
            
            Utils.showToast('Tentando criar instância novamente...', 'info');
            
            // Reset do estado de erro
            appState.updateInstance(instanceId, {
                status: 'creating',
                lastError: null,
                lastActivity: new Date().toISOString()
            });
            
            this.loadInstancesList();
            
            // Tentar criar novamente
            await this.createEvolutionInstance(instanceId, instance.evolutionInstanceName);
            
        } catch (error) {
            Utils.handleError(error, 'retryInstance');
        }
    },
    
    // Obter instâncias filtradas
    getFilteredInstances() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const searchText = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
        
        return appState.filterInstances(statusFilter, searchText);
    },
    
    // Visualizar/configurar instância
    viewInstance(instanceId) {
        Navigation.loadInstancePage(instanceId);
        Navigation.updateBrowserHistory('instance', instanceId);
    },
    
    // Copiar link da instância
    copyInstanceLink(instanceId) {
        Navigation.copyInstanceLink(instanceId);
    },
    
    // Editar instância
    editInstance(instanceId) {
        const instance = appState.getInstanceById(instanceId);
        if (!instance) return;
        
        Modal.showEditInstance(instance);
    },
    
    // Excluir instância
    async deleteInstance(instanceId) {
        try {
            const instance = appState.getInstanceById(instanceId);
            if (!instance) return;
            
            const confirmMessage = `Tem certeza que deseja excluir a instância "${instance.displayName || instance.name}"?\n\nEsta ação não pode ser desfeita e removerá:\n- A instância da Evolution API\n- Todas as mensagens associadas\n- Todas as configurações`;
            
            if (!confirm(confirmMessage)) return;
            
            Utils.showToast('Excluindo instância...', 'info');
            
            // Excluir da Evolution API se tiver nome da instância
            if (instance.evolutionInstanceName) {
                try {
                    // Verificar se a API está online
                    const isOnline = await evolutionAPI.isApiOnline();
                    if (isOnline) {
                        await evolutionAPI.deleteInstance(instance.evolutionInstanceName);
                        Utils.showToast('Instância removida da Evolution API', 'success');
                    } else {
                        Utils.showToast('API offline - removendo apenas localmente', 'warning');
                    }
                } catch (error) {
                    console.error('Erro ao excluir da Evolution API:', error);
                    const errorMsg = this.parseApiError(error);
                    
                    // Se for erro 404, a instância já não existe na API
                    if (error.message.includes('404')) {
                        Utils.showToast('Instância já não existe na API', 'info');
                    } else {
                        Utils.showToast(`Erro na API: ${errorMsg} - removendo localmente`, 'warning');
                    }
                }
            }
            
            // Remover do estado local
            appState.removeInstance(instanceId);
            
            this.loadInstancesList();
            Analytics.updateStatistics();
            
            Utils.showToast('Instância excluída com sucesso!', 'success');
            
        } catch (error) {
            Utils.handleError(error, 'deleteInstance');
        }
    },
    
    // Atualizar lista de instâncias
    async refreshInstancesList() {
        try {
            Utils.showToast('Atualizando lista de instâncias...', 'info');
            
            // Verificar se a API está online
            const isOnline = await evolutionAPI.isApiOnline();
            if (!isOnline) {
                Utils.showToast('Evolution API está offline', 'warning');
                this.loadInstancesList();
                return;
            }
            
            // Verificar status de todas as instâncias na Evolution API
            for (const instance of appState.instances) {
                if (instance.evolutionInstanceName && instance.status !== 'error') {
                    try {
                        const status = await evolutionAPI.getInstanceStatus(instance.evolutionInstanceName);
                        if (status && status.instance) {
                            const newStatus = this.mapEvolutionStatus(status.instance.state);
                            appState.updateInstance(instance.id, {
                                status: newStatus,
                                lastActivity: new Date().toISOString(),
                                errorCount: 0,
                                lastError: null
                            });
                        }
                    } catch (error) {
                        console.error(`Erro ao verificar status da instância ${instance.name}:`, error);
                        
                        // Não atualizar para erro se for apenas problema temporário
                        if (!error.message.includes('404')) {
                            appState.updateInstance(instance.id, {
                                lastError: this.parseApiError(error),
                                errorCount: (instance.errorCount || 0) + 1
                            });
                        }
                    }
                }
            }
            
            this.loadInstancesList();
            Analytics.updateStatistics();
            Utils.showToast('Lista atualizada!', 'success');
            
        } catch (error) {
            Utils.handleError(error, 'refreshInstancesList');
        }
    },
    
    // Mapear status da Evolution API para status interno
    mapEvolutionStatus(evolutionStatus) {
        const statusMap = {
            'close': 'disconnected',
            'connecting': 'creating',
            'qr': 'waiting_qr',
            'open': 'connected'
        };
        
        return statusMap[evolutionStatus] || 'disconnected';
    },
    
    // Aplicar filtros
    applyFilters() {
        this.loadInstancesList();
    },
    
    // Verificar saúde das instâncias
    checkInstancesHealth() {
        let healthyInstances = 0;
        const totalInstances = appState.instances.length;
        
        appState.instances.forEach(instance => {
            if (instance.status === 'connected' && instance.lastActivity) {
                const lastActivity = new Date(instance.lastActivity);
                const now = new Date();
                const diffMinutes = (now - lastActivity) / 1000 / 60;
                
                // Se não há atividade há mais de 30 minutos, marcar como problema
                if (diffMinutes > 30) {
                    instance.healthStatus = 'warning';
                } else {
                    instance.healthStatus = 'healthy';
                    healthyInstances++;
                }
            } else if (instance.status === 'connected') {
                instance.healthStatus = 'healthy';
                healthyInstances++;
            } else {
                instance.healthStatus = 'unhealthy';
            }
        });
        
        appState.saveInstances();
        
        // Atualizar interface se necessário
        if (Navigation.currentPage === 'admin') {
            this.loadInstancesList();
        }
        
        return { healthy: healthyInstances, total: totalInstances };
    }
};

// Event handlers para gerenciamento de instâncias
const InstanceHandlers = {
    // Handler para formulário de criação
    handleCreateInstance(e) {
        e.preventDefault();
        
        const formData = {
            instanceName: document.getElementById('instanceName').value,
            instanceDescription: document.getElementById('instanceDescription').value,
            webhookUrl: document.getElementById('webhookUrl').value,
            instanceToken: document.getElementById('instanceToken').value
        };
        
        InstanceManager.createInstance(formData).then(instance => {
            if (instance) {
                document.getElementById('createInstanceForm').reset();
            }
        });
    },
    
    // Handler para refresh da lista
    handleRefreshInstances() {
        InstanceManager.refreshInstancesList();
    },
    
    // Handler para filtros
    handleFilterChange() {
        InstanceManager.applyFilters();
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InstanceManager, InstanceHandlers };
} else {
    window.InstanceManager = InstanceManager;
    window.InstanceHandlers = InstanceHandlers;
}