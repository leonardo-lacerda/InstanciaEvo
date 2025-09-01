// instance-manager.js - Gerenciamento de instâncias
const InstanceManager = {
    // Criar nova instância
    async createInstance(formData) {
        try {
            const { instanceName, instanceDescription, webhookUrl, instanceToken } = formData;
            
            // Validações
            if (!instanceName.trim()) {
                throw new Error('Nome da instância é obrigatório!');
            }
            
            // Verificar duplicatas
            const existingInstance = appState.instances.find(
                i => i.name.toLowerCase() === instanceName.toLowerCase()
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
                name: instanceName.trim(),
                description: instanceDescription.trim(),
                created: new Date().toISOString(),
                status: 'disconnected',
                qrCode: null,
                webhookUrl: webhookUrl?.trim() || '',
                token: instanceToken?.trim() || Utils.generateToken(),
                businessData: null,
                lastActivity: null,
                messageCount: 0,
                uptime: 0,
                evolutionInstanceName: instanceName.trim()
            };
            
            appState.addInstance(newInstance);
            this.loadInstancesList();
            Analytics.updateStatistics();
            
            Utils.showToast('Instância criada com sucesso!', 'success');
            
            // Criar na Evolution API
            await this.createEvolutionInstance(instanceId, instanceName.trim());
            
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
            if (!instance) return;
            
            // Atualizar status para criando
            appState.updateInstance(instanceId, { 
                status: 'creating',
                lastActivity: new Date().toISOString()
            });
            this.loadInstancesList();
            
            // Usar API real
            const result = await evolutionAPI.createInstance(instanceName);
            
            // Atualizar status
            appState.updateInstance(instanceId, {
                status: 'waiting_qr',
                lastActivity: new Date().toISOString()
            });
            
            this.loadInstancesList();
            Analytics.updateStatistics();
            
            // Obter QR Code
            await this.getQRCode(instanceName, instanceId);
            
        } catch (error) {
            console.error('Erro ao criar instância na Evolution API:', error);
            
            appState.updateInstance(instanceId, {
                status: 'error',
                lastActivity: new Date().toISOString()
            });
            
            this.loadInstancesList();
            Utils.showToast(`Erro na Evolution API: ${error.message}`, 'error');
        }
    },
    
    // Obter QR Code da instância
    async getQRCode(instanceName, instanceId) {
        try {
            const result = await evolutionAPI.getQRCode(instanceName);
            
            if (result.qrcode && result.qrcode.base64) {
                appState.updateInstance(instanceId, {
                    qrCode: result.qrcode.base64,
                    lastActivity: new Date().toISOString()
                });
                
                // Se estiver visualizando esta instância, atualizar QR
                if (appState.currentInstance && appState.currentInstance.id === instanceId) {
                    InstancePage.displayQRCode(result.qrcode.base64);
                }
            }
        } catch (error) {
            console.error('Erro ao obter QR Code:', error);
            Utils.showToast(`Erro ao obter QR Code: ${error.message}`, 'error');
        }
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
        
        div.innerHTML = `
            <div class="instance-info">
                <div class="instance-header">
                    <h3>${Utils.escapeHtml(instance.name)}</h3>
                    <span class="status-badge" style="background-color: ${statusColor}">
                        ${statusText}
                    </span>
                </div>
                ${instance.description ? `
                    <p class="instance-description">${Utils.escapeHtml(instance.description)}</p>
                ` : ''}
                <div class="instance-details">
                    <div class="detail-item">
                        <label>ID:</label>
                        <span>${instance.id}</span>
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
        
        // Implementar modal de edição ou navegar para página de edição
        Modal.showEditInstance(instance);
    },
    
    // Excluir instância
    async deleteInstance(instanceId) {
        try {
            const instance = appState.getInstanceById(instanceId);
            if (!instance) return;
            
            const confirmMessage = `Tem certeza que deseja excluir a instância "${instance.name}"?\n\nEsta ação não pode ser desfeita e removerá:\n- A instância da Evolution API\n- Todas as mensagens associadas\n- Todas as configurações`;
            
            if (!confirm(confirmMessage)) return;
            
            Utils.showToast('Excluindo instância...', 'info');
            
            // Excluir da Evolution API se tiver nome da instância
            if (instance.evolutionInstanceName) {
                try {
                    await evolutionAPI.deleteInstance(instance.evolutionInstanceName);
                } catch (error) {
                    console.error('Erro ao excluir da Evolution API:', error);
                    // Continue mesmo se falhar na API
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
            
            // Verificar status de todas as instâncias na Evolution API
            for (const instance of appState.instances) {
                if (instance.evolutionInstanceName) {
                    try {
                        const status = await evolutionAPI.getInstanceStatus(instance.evolutionInstanceName);
                        if (status) {
                            const newStatus = this.mapEvolutionStatus(status.instance.state);
                            appState.updateInstance(instance.id, {
                                status: newStatus,
                                lastActivity: new Date().toISOString()
                            });
                        }
                    } catch (error) {
                        console.error(`Erro ao verificar status da instância ${instance.name}:`, error);
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