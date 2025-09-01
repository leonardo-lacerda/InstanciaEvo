// business-config.js - Gerenciamento da configuração de negócio
const BusinessConfig = {
    // Processar formulário de configuração do negócio
    handleBusinessFormSubmit(e) {
        e.preventDefault();
        
        if (!appState.currentInstance) {
            Utils.showToast('Erro: Instância não encontrada!', 'error');
            return false;
        }
        
        try {
            const formData = this.collectBusinessFormData();
            
            // Validar dados obrigatórios
            if (!formData.basicInfo.businessName.trim()) {
                Utils.showToast('Nome do negócio é obrigatório!', 'error');
                return false;
            }
            
            if (!formData.basicInfo.businessCity.trim()) {
                Utils.showToast('Cidade/Estado é obrigatório!', 'error');
                return false;
            }
            
            if (!formData.basicInfo.businessPhone.trim()) {
                Utils.showToast('Telefone principal é obrigatório!', 'error');
                return false;
            }
            
            if (!formData.whatsapp.welcomeMessage.trim()) {
                Utils.showToast('Mensagem de saudação é obrigatória!', 'error');
                return false;
            }
            
            // Validar e-mail se fornecido
            if (formData.basicInfo.businessEmail && !Utils.isValidEmail(formData.basicInfo.businessEmail)) {
                Utils.showToast('E-mail inválido!', 'error');
                return false;
            }
            
            // Validar telefone
            if (!Utils.isValidPhone(formData.basicInfo.businessPhone)) {
                Utils.showToast('Telefone inválido!', 'error');
                return false;
            }
            
            // Validar serviços
            if (formData.services.length === 0) {
                Utils.showToast('Adicione pelo menos um serviço/produto!', 'warning');
            }
            
            // Salvar dados na instância
            appState.updateInstance(appState.currentInstance.id, {
                businessData: formData,
                lastActivity: new Date().toISOString()
            });
            
            Utils.showToast('Configurações salvas com sucesso!', 'success');
            
            // Enviar dados para o webhook se configurado
            if (appState.currentInstance.webhookUrl) {
                this.sendDataToWebhook(formData);
            }
            
            return true;
            
        } catch (error) {
            Utils.handleError(error, 'handleBusinessFormSubmit');
            return false;
        }
    },
    
    // Coletar dados do formulário
    collectBusinessFormData() {
        return {
            instanceId: appState.currentInstance.id,
            timestamp: new Date().toISOString(),
            basicInfo: {
                businessName: this.getInputValue('businessName'),
                businessAddress: this.getInputValue('businessAddress'),
                businessCity: this.getInputValue('businessCity'),
                businessPhone: this.getInputValue('businessPhone'),
                businessEmail: this.getInputValue('businessEmail'),
                businessWebsite: this.getInputValue('businessWebsite')
            },
            schedule: this.collectScheduleData(),
            services: this.collectServicesData(),
            appointments: {
                type: this.getInputValue('appointmentType'),
                simultaneous: parseInt(this.getInputValue('simultaneousAppointments')) || 1,
                interval: parseInt(this.getInputValue('appointmentInterval')) || 30,
                cancellationPolicy: this.getInputValue('cancellationPolicy')
            },
            whatsapp: {
                welcomeMessage: this.getInputValue('welcomeMessage'),
                autoResponse: this.getInputValue('autoResponse'),
                faq: this.getInputValue('faq')
            }
        };
    },
    
    // Coletar dados de horário
    collectScheduleData() {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const schedule = {};
        
        days.forEach(day => {
            schedule[day] = {
                open: this.getInputValue(`${day}_open`),
                close: this.getInputValue(`${day}_close`),
                breakStart: this.getInputValue(`${day}_break_start`),
                breakEnd: this.getInputValue(`${day}_break_end`)
            };
        });
        
        return schedule;
    },
    
    // Coletar dados de serviços
    collectServicesData() {
        const services = [];
        const serviceItems = document.querySelectorAll('.service-item');
        
        serviceItems.forEach(item => {
            const name = item.querySelector('input[name="serviceName"]')?.value.trim();
            const price = item.querySelector('input[name="servicePrice"]')?.value;
            const duration = item.querySelector('input[name="serviceDuration"]')?.value;
            const notes = item.querySelector('input[name="serviceNotes"]')?.value.trim();
            
            if (name && price) {
                services.push({
                    name: name,
                    price: parseFloat(price),
                    duration: parseInt(duration) || 0,
                    notes: notes
                });
            }
        });
        
        return services;
    },
    
    // Carregar dados de negócio no formulário
    loadBusinessData(businessData) {
        if (!businessData) return;
        
        try {
            // Carregar informações básicas
            if (businessData.basicInfo) {
                this.setInputValue('businessName', businessData.basicInfo.businessName);
                this.setInputValue('businessAddress', businessData.basicInfo.businessAddress);
                this.setInputValue('businessCity', businessData.basicInfo.businessCity);
                this.setInputValue('businessPhone', businessData.basicInfo.businessPhone);
                this.setInputValue('businessEmail', businessData.basicInfo.businessEmail);
                this.setInputValue('businessWebsite', businessData.basicInfo.businessWebsite);
            }
            
            // Carregar horários
            if (businessData.schedule) {
                Object.keys(businessData.schedule).forEach(day => {
                    const schedule = businessData.schedule[day];
                    this.setInputValue(`${day}_open`, schedule.open);
                    this.setInputValue(`${day}_close`, schedule.close);
                    this.setInputValue(`${day}_break_start`, schedule.breakStart);
                    this.setInputValue(`${day}_break_end`, schedule.breakEnd);
                });
            }
            
            // Carregar serviços
            if (businessData.services && businessData.services.length > 0) {
                this.loadServices(businessData.services);
            }
            
            // Carregar configurações de agendamento
            if (businessData.appointments) {
                this.setInputValue('appointmentType', businessData.appointments.type);
                this.setInputValue('simultaneousAppointments', businessData.appointments.simultaneous);
                this.setInputValue('appointmentInterval', businessData.appointments.interval);
                this.setInputValue('cancellationPolicy', businessData.appointments.cancellationPolicy);
            }
            
            // Carregar configurações do WhatsApp
            if (businessData.whatsapp) {
                this.setInputValue('welcomeMessage', businessData.whatsapp.welcomeMessage);
                this.setInputValue('autoResponse', businessData.whatsapp.autoResponse);
                this.setInputValue('faq', businessData.whatsapp.faq);
            }
            
        } catch (error) {
            console.error('Erro ao carregar dados do negócio:', error);
            Utils.showToast('Erro ao carregar configurações salvas', 'warning');
        }
    },
    
    // Carregar serviços no formulário
    loadServices(services) {
        const servicesContainer = document.getElementById('servicesContainer');
        if (!servicesContainer) return;
        
        // Limpar serviços existentes
        servicesContainer.innerHTML = '';
        
        services.forEach(service => {
            this.addServiceField();
            const lastServiceItem = servicesContainer.lastElementChild;
            if (lastServiceItem) {
                this.setServiceData(lastServiceItem, service);
            }
        });
        
        // Se não há serviços, adicionar um campo vazio
        if (services.length === 0) {
            this.addServiceField();
        }
    },
    
    // Definir dados de um serviço específico
    setServiceData(serviceItem, service) {
        const nameInput = serviceItem.querySelector('input[name="serviceName"]');
        const priceInput = serviceItem.querySelector('input[name="servicePrice"]');
        const durationInput = serviceItem.querySelector('input[name="serviceDuration"]');
        const notesInput = serviceItem.querySelector('input[name="serviceNotes"]');
        
        if (nameInput) nameInput.value = service.name || '';
        if (priceInput) priceInput.value = service.price || '';
        if (durationInput) durationInput.value = service.duration || '';
        if (notesInput) notesInput.value = service.notes || '';
    },
    
    // Adicionar campo de serviço
    addServiceField() {
        const servicesContainer = document.getElementById('servicesContainer');
        if (!servicesContainer) return;
        
        const serviceItem = document.createElement('div');
        serviceItem.className = 'service-item fade-in';
        serviceItem.innerHTML = `
            <div class="input-row">
                <div class="input-group">
                    <label>Nome do serviço/produto *</label>
                    <input type="text" name="serviceName" required>
                </div>
                <div class="input-group">
                    <label>Preço (R$) *</label>
                    <input type="number" step="0.01" name="servicePrice" required min="0">
                </div>
            </div>
            <div class="input-row">
                <div class="input-group">
                    <label>Tempo estimado (minutos)</label>
                    <input type="number" name="serviceDuration" min="0" max="1440">
                </div>
                <div class="input-group">
                    <label>Observações/Regras</label>
                    <input type="text" name="serviceNotes" maxlength="200">
                </div>
            </div>
            <button type="button" class="remove-btn" onclick="BusinessConfig.removeServiceField(this)">
                ✕ Remover
            </button>
        `;
        
        servicesContainer.appendChild(serviceItem);
        
        // Adicionar animação
        setTimeout(() => {
            serviceItem.classList.add('show');
        }, 100);
    },
    
    // Remover campo de serviço
    removeServiceField(button) {
        const serviceItem = button.closest('.service-item');
        if (!serviceItem) return;
        
        const servicesContainer = document.getElementById('servicesContainer');
        const serviceItems = servicesContainer.querySelectorAll('.service-item');
        
        // Manter pelo menos um campo de serviço
        if (serviceItems.length <= 1) {
            Utils.showToast('Mantenha pelo menos um serviço/produto!', 'warning');
            return;
        }
        
        serviceItem.classList.add('fade-out');
        setTimeout(() => {
            if (serviceItem.parentNode) {
                serviceItem.parentNode.removeChild(serviceItem);
            }
        }, 300);
    },
    
    // Enviar dados para webhook
    async sendDataToWebhook(data) {
        if (!appState.currentInstance.webhookUrl) {
            console.log('Webhook URL não configurada');
            return;
        }
        
        try {
            Utils.showToast('Enviando dados para o N8N...', 'info');
            
            const response = await Utils.withTimeout(
                fetch(appState.currentInstance.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Evolution-Manager': 'business-config'
                    },
                    body: JSON.stringify(data)
                }),
                10000 // 10 segundos
            );
            
            if (response.ok) {
                Utils.showToast('Dados enviados para o N8N com sucesso!', 'success');
            } else {
                Utils.showToast(`Erro ao enviar dados: HTTP ${response.status}`, 'warning');
            }
            
        } catch (error) {
            console.error('Erro ao enviar dados:', error);
            if (error.message === 'Timeout') {
                Utils.showToast('Timeout: N8N não respondeu em 10 segundos', 'warning');
            } else {
                Utils.showToast('Erro de conexão com o N8N', 'warning');
            }
        }
    },
    
    // Exportar configuração do negócio
    exportBusinessConfig() {
        if (!appState.currentInstance || !appState.currentInstance.businessData) {
            Utils.showToast('Nenhuma configuração de negócio para exportar!', 'warning');
            return;
        }
        
        const data = {
            instance: {
                id: appState.currentInstance.id,
                name: appState.currentInstance.name,
                description: appState.currentInstance.description
            },
            businessData: appState.currentInstance.businessData,
            exportDate: new Date().toISOString()
        };
        
        const filename = `config-${appState.currentInstance.name}-${new Date().toISOString().split('T')[0]}.json`;
        Utils.downloadJSON(data, filename);
        Utils.showToast('Configuração exportada!', 'success');
    },
    
    // Utilitários para manipulação de inputs
    getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    },
    
    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
            element.value = value;
        }
    }
};

// Event handlers para configuração de negócio
const BusinessConfigHandlers = {
    // Handler para formulário de negócio
    handleBusinessFormSubmit(e) {
        return BusinessConfig.handleBusinessFormSubmit(e);
    },
    
    // Handler para adicionar serviço
    handleAddService() {
        BusinessConfig.addServiceField();
    },
    
    // Handler para exportar configuração
    handleExportConfig() {
        BusinessConfig.exportBusinessConfig();
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BusinessConfig, BusinessConfigHandlers };
} else {
    window.BusinessConfig = BusinessConfig;
    window.BusinessConfigHandlers = BusinessConfigHandlers;
}