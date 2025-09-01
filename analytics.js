// analytics.js - Sistema de analytics e relatórios
const Analytics = {
    // Atualizar estatísticas gerais
    updateStatistics() {
        try {
            const total = appState.getTotalInstances();
            const connected = appState.getConnectedInstances();
            const waiting = appState.getWaitingInstances();
            const disconnected = appState.getDisconnectedInstances();
            
            // Atualizar elementos da interface
            this.updateElement('totalInstances', total);
            this.updateElement('connectedInstances', connected);
            this.updateElement('waitingInstances', waiting);
            this.updateElement('disconnectedInstances', disconnected);
            
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    },
    
    // Atualizar analytics da instância atual
    updateInstanceAnalytics() {
        if (!appState.currentInstance) return;
        
        try {
            const instanceMessages = appState.getInstanceMessages(appState.currentInstance.id);
            
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            // Calcular métricas
            const messagesSent24h = instanceMessages.filter(m => 
                m.type === 'sent' && new Date(m.timestamp) > yesterday
            ).length;
            
            const messagesReceived24h = instanceMessages.filter(m => 
                m.type === 'received' && new Date(m.timestamp) > yesterday
            ).length;
            
            const totalMessages = instanceMessages.length;
            const messagesThisWeek = instanceMessages.filter(m => 
                new Date(m.timestamp) > lastWeek
            ).length;
            
            // Calcular uptime
            const createdTime = new Date(appState.currentInstance.created);
            const uptimeMinutes = Math.floor((now - createdTime) / 1000 / 60);
            const uptimeFormatted = this.formatUptime(uptimeMinutes);
            
            // Última atividade
            const lastActivity = appState.currentInstance.lastActivity ? 
                Utils.formatDate(appState.currentInstance.lastActivity) : 'Nunca';
            
            // Atualizar elementos da interface
            this.updateElement('messagesSent24h', messagesSent24h);
            this.updateElement('messagesReceived24h', messagesReceived24h);
            this.updateElement('uptime', uptimeFormatted);
            this.updateElement('lastActivity', lastActivity);
            this.updateElement('totalMessagesAnalytics', totalMessages);
            this.updateElement('messagesThisWeek', messagesThisWeek);
            
            // Calcular taxa de resposta se houver mensagens suficientes
            if (totalMessages > 0) {
                const responseRate = this.calculateResponseRate(instanceMessages);
                this.updateElement('responseRate', `${responseRate}%`);
            }
            
        } catch (error) {
            console.error('Erro ao atualizar analytics da instância:', error);
        }
    },
    
    // Calcular taxa de resposta
    calculateResponseRate(messages) {
        const receivedMessages = messages.filter(m => m.type === 'received');
        const sentMessages = messages.filter(m => m.type === 'sent');
        
        if (receivedMessages.length === 0) return 0;
        
        let responses = 0;
        receivedMessages.forEach(received => {
            const receivedTime = new Date(received.timestamp);
            const responseWindow = new Date(receivedTime.getTime() + 30 * 60 * 1000); // 30 min
            
            const hasResponse = sentMessages.some(sent => {
                const sentTime = new Date(sent.timestamp);
                return sent.number === received.number && 
                       sentTime > receivedTime && 
                       sentTime < responseWindow;
            });
            
            if (hasResponse) responses++;
        });
        
        return Math.round((responses / receivedMessages.length) * 100);
    },
    
    // Formatar tempo de uptime
    formatUptime(minutes) {
        if (minutes < 60) return `${minutes}min`;
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    },
    
    // Gerar relatório detalhado
    generateDetailedReport() {
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            const report = {
                timestamp: now.toISOString(),
                period: {
                    start: last30days.toISOString(),
                    end: now.toISOString()
                },
                instances: {
                    total: appState.getTotalInstances(),
                    connected: appState.getConnectedInstances(),
                    disconnected: appState.getDisconnectedInstances(),
                    waitingQR: appState.getWaitingInstances(),
                    byStatus: this.getInstancesByStatus()
                },
                messages: {
                    last24h: this.getMessagesInPeriod(last24h),
                    last7days: this.getMessagesInPeriod(last7days),
                    last30days: this.getMessagesInPeriod(last30days),
                    total: appState.messageHistory.length,
                    byType: this.getMessagesByType(),
                    byInstance: this.getMessagesByInstance()
                },
                topInstances: this.getTopInstances(),
                performance: this.getPerformanceMetrics()
            };
            
            return report;
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            return null;
        }
    },
    
    // Obter instâncias por status
    getInstancesByStatus() {
        const statusCount = {};
        appState.instances.forEach(instance => {
            statusCount[instance.status] = (statusCount[instance.status] || 0) + 1;
        });
        return statusCount;
    },
    
    // Obter mensagens em período
    getMessagesInPeriod(since) {
        return appState.messageHistory.filter(m => new Date(m.timestamp) > since).length;
    },
    
    // Obter mensagens por tipo
    getMessagesByType() {
        const typeCount = { sent: 0, received: 0 };
        appState.messageHistory.forEach(msg => {
            typeCount[msg.type] = (typeCount[msg.type] || 0) + 1;
        });
        return typeCount;
    },
    
    // Obter mensagens por instância
    getMessagesByInstance() {
        const instanceCount = {};
        appState.messageHistory.forEach(msg => {
            instanceCount[msg.instanceId] = (instanceCount[msg.instanceId] || 0) + 1;
        });
        return instanceCount;
    },
    
    // Obter top instâncias por atividade
    getTopInstances(limit = 5) {
        return appState.instances
            .map(instance => ({
                id: instance.id,
                name: instance.name,
                messageCount: instance.messageCount || 0,
                status: instance.status,
                created: instance.created,
                lastActivity: instance.lastActivity
            }))
            .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
            .slice(0, limit);
    },
    
    // Obter métricas de performance
    getPerformanceMetrics() {
        const connectedInstances = appState.instances.filter(i => i.status === 'connected');
        const totalUptime = connectedInstances.reduce((acc, instance) => {
            const created = new Date(instance.created);
            const now = new Date();
            return acc + (now - created);
        }, 0);
        
        return {
            averageUptime: connectedInstances.length > 0 ? 
                Math.floor(totalUptime / connectedInstances.length / 1000 / 60) : 0,
            connectionRate: appState.getTotalInstances() > 0 ? 
                Math.round((appState.getConnectedInstances() / appState.getTotalInstances()) * 100) : 0,
            totalMessageVolume: appState.messageHistory.length,
            averageMessagesPerInstance: appState.getTotalInstances() > 0 ?
                Math.round(appState.messageHistory.length / appState.getTotalInstances()) : 0
        };
    },
    
    // Exportar relatório
    exportReport(format = 'json') {
        try {
            const report = this.generateDetailedReport();
            if (!report) {
                Utils.showToast('Erro ao gerar relatório', 'error');
                return;
            }
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `evolution-api-report-${timestamp}`;
            
            if (format === 'json') {
                Utils.downloadJSON(report, `${filename}.json`);
            } else if (format === 'csv') {
                this.exportReportCSV(report, `${filename}.csv`);
            }
            
            Utils.showToast('Relatório exportado!', 'success');
            
        } catch (error) {
            Utils.handleError(error, 'exportReport');
        }
    },
    
    // Exportar relatório em CSV
    exportReportCSV(report, filename) {
        const rows = [
            ['Métrica', 'Valor'],
            ['Data do Relatório', new Date(report.timestamp).toLocaleDateString('pt-BR')],
            ['Total de Instâncias', report.instances.total],
            ['Instâncias Conectadas', report.instances.connected],
            ['Instâncias Desconectadas', report.instances.disconnected],
            ['Mensagens (24h)', report.messages.last24h],
            ['Mensagens (7 dias)', report.messages.last7days],
            ['Mensagens (30 dias)', report.messages.last30days],
            ['Total de Mensagens', report.messages.total],
            ['Taxa de Conexão (%)', report.performance.connectionRate],
            ['Média de Mensagens/Instância', report.performance.averageMessagesPerInstance]
        ];
        
        const csvContent = rows.map(row => row.join(',')).join('\n');
        Utils.downloadText(csvContent, filename);
    },
    
    // Atualizar elemento da interface
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
};

// Event handlers para analytics
const AnalyticsHandlers = {
    // Handler para exportar relatório
    handleExportReport() {
        Analytics.exportReport('json');
    },
    
    // Handler para atualizar analytics
    handleRefreshAnalytics() {
        if (appState.currentInstance) {
            Analytics.updateInstanceAnalytics();
            Utils.showToast('Analytics atualizados!', 'success');
        }
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Analytics, AnalyticsHandlers };
} else {
    window.Analytics = Analytics;
    window.AnalyticsHandlers = AnalyticsHandlers;
}