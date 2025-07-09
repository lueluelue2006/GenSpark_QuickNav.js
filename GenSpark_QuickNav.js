// ==UserScript==
// @name         Genspark 快捷导航
// @namespace    https://github.com/your-username/genspark-quicknav
// @version      1.2
// @description  为 genspark.ai 对话页面添加快捷导航功能，让用户能够快速跳转到任何问题和回答
// @author       schweigen
// @match        https://www.genspark.ai/agents*
// @match        https://genspark.ai/agents*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置选项
    const CONFIG = {
        maxTitleLength: 50,
        refreshInterval: 2000,
        animationDuration: 300,
        keyboardShortcut: 'KeyN' // Ctrl+N 打开/关闭导航面板
    };
    
    // 等待页面完全加载
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                    return;
                }
                
                setTimeout(check, 100);
            }
            
            check();
        });
    }
    
    // 创建导航面板
    function createNavigationPanel() {
        const nav = document.createElement('div');
        nav.id = 'genspark-quicknav';
        nav.innerHTML = `
            <div class="quicknav-header">
                <span class="quicknav-title">快捷导航</span>
                <div class="quicknav-controls">
                    <button class="quicknav-refresh" title="刷新导航">⟳</button>
                    <button class="quicknav-toggle" title="折叠/展开">−</button>
                    <button class="quicknav-close" title="关闭">×</button>
                </div>
            </div>
            <div class="quicknav-content">
                <div class="quicknav-list"></div>
            </div>
        `;
        
        // 创建收起状态的小方块
        const miniNav = document.createElement('div');
        miniNav.id = 'genspark-quicknav-mini';
        miniNav.innerHTML = `
            <div class="quicknav-mini-content">导航</div>
        `;
        miniNav.style.display = 'none';
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #genspark-quicknav {
                position: fixed;
                top: 50%;
                left: 20px;
                transform: translateY(-50%);
                width: 280px;
                max-height: 60vh;
                background: #ffffff;
                border: 1px solid #e0e0e6;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                overflow: hidden;
                transition: all ${CONFIG.animationDuration}ms ease;
            }
            
            #genspark-quicknav.collapsed {
                display: none;
            }
            
            #genspark-quicknav.hidden {
                display: none;
            }
            
            #genspark-quicknav-mini {
                position: fixed;
                top: 50%;
                left: 20px;
                transform: translateY(-50%);
                width: 60px;
                height: 60px;
                background: #ffffff;
                border: 1px solid #e0e0e6;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                cursor: pointer;
                transition: all ${CONFIG.animationDuration}ms ease;
            }
            
            #genspark-quicknav-mini:hover {
                background: #f8f9fa;
                transform: translateY(-50%) scale(1.05);
            }
            
            #genspark-quicknav-mini.hidden {
                display: none;
            }
            
            .quicknav-mini-content {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                font-size: 12px;
                font-weight: 600;
                color: #333;
                writing-mode: vertical-lr;
                text-orientation: mixed;
            }
            
            .quicknav-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #f8f9fa;
                border-bottom: 1px solid #e0e0e6;
            }
            
            .quicknav-title {
                font-weight: 600;
                color: #333;
            }
            
            .quicknav-controls {
                display: flex;
                gap: 8px;
            }
            
            .quicknav-controls button {
                background: none;
                border: none;
                padding: 2px 6px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                color: #666;
                transition: background-color 0.2s;
            }
            
            .quicknav-controls button:hover {
                background-color: #e9ecef;
                color: #333;
            }
            
            .quicknav-content {
                max-height: calc(60vh - 50px);
                overflow-y: auto;
            }
            
            .quicknav-list {
                padding: 4px 0;
            }
            
            .quicknav-item {
                display: flex;
                align-items: center;
                padding: 4px 12px;
                cursor: pointer;
                border-left: 3px solid transparent;
                transition: all 0.2s;
                line-height: 1.3;
            }
            
            .quicknav-item:hover {
                background-color: #f8f9fa;
                border-left-color: #007bff;
            }
            
            .quicknav-item.user {
                border-left-color: #28a745;
            }
            
            .quicknav-item.assistant {
                border-left-color: #17a2b8;
                margin-left: 12px;
            }
            
            .quicknav-item-icon {
                width: 12px;
                height: 12px;
                margin-right: 6px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .quicknav-item.user .quicknav-item-icon {
                background-color: #28a745;
            }
            
            .quicknav-item.assistant .quicknav-item-icon {
                background-color: #17a2b8;
            }
            
            .quicknav-item-text {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: #333;
                font-size: 12px;
            }
            
            .quicknav-item-index {
                font-size: 10px;
                color: #666;
                margin-left: 6px;
                flex-shrink: 0;
            }
            
            .quicknav-empty {
                padding: 12px;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
            
            /* 滚动条样式 */
            .quicknav-content::-webkit-scrollbar {
                width: 4px;
            }
            
            .quicknav-content::-webkit-scrollbar-track {
                background: #f8f9fa;
            }
            
            .quicknav-content::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 2px;
            }
            
            .quicknav-content::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(nav);
        document.body.appendChild(miniNav);
        
        return { nav, miniNav };
    }
    
    // 提取消息文本
    function extractMessageText(element) {
        const contentElement = element.querySelector('.content');
        if (!contentElement) return '';
        
        // 尝试从code标签中提取（用户消息）
        const codeElement = contentElement.querySelector('code');
        if (codeElement) {
            return codeElement.textContent.trim();
        }
        
        // 尝试从markdown-viewer中提取（AI消息）
        const markdownElement = contentElement.querySelector('.markdown-viewer');
        if (markdownElement) {
            return markdownElement.textContent.trim();
        }
        
        // 备用方案
        return contentElement.textContent.trim();
    }
    
    // 扫描并更新导航列表
    function updateNavigationList() {
        const navList = document.querySelector('.quicknav-list');
        if (!navList) return;
        
        const messages = document.querySelectorAll('.conversation-statement');
        
        if (messages.length === 0) {
            navList.innerHTML = '<div class="quicknav-empty">暂无对话消息</div>';
            return;
        }
        
        navList.innerHTML = '';
        let userIndex = 1;
        let assistantIndex = 1;
        
        messages.forEach((message, index) => {
            const isUser = message.classList.contains('user');
            const isAssistant = message.classList.contains('assistant');
            
            if (!isUser && !isAssistant) return;
            
            const text = extractMessageText(message);
            if (!text) return;
            
            const item = document.createElement('div');
            item.className = `quicknav-item ${isUser ? 'user' : 'assistant'}`;
            
            const truncatedText = text.length > CONFIG.maxTitleLength 
                ? text.substring(0, CONFIG.maxTitleLength) + '...' 
                : text;
            
            const displayIndex = isUser ? userIndex++ : assistantIndex++;
            const prefix = isUser ? '问' : '答';
            
            item.innerHTML = `
                <div class="quicknav-item-icon"></div>
                <div class="quicknav-item-text">${truncatedText}</div>
                <div class="quicknav-item-index">${prefix}${displayIndex}</div>
            `;
            
            // 添加点击事件
            item.addEventListener('click', () => {
                message.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // 高亮显示目标消息
                message.style.transition = 'background-color 0.5s ease';
                message.style.backgroundColor = '#fff3cd';
                setTimeout(() => {
                    message.style.backgroundColor = '';
                }, 2000);
            });
            
            navList.appendChild(item);
        });
    }
    
    // 初始化导航面板
    function initNavigationPanel() {
        const { nav, miniNav } = createNavigationPanel();
        let isCollapsed = false;
        let isHidden = false;
        
        // 绑定控制按钮事件
        const refreshBtn = nav.querySelector('.quicknav-refresh');
        const toggleBtn = nav.querySelector('.quicknav-toggle');
        const closeBtn = nav.querySelector('.quicknav-close');
        
        refreshBtn.addEventListener('click', updateNavigationList);
        
        toggleBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            nav.classList.toggle('collapsed', isCollapsed);
            miniNav.style.display = isCollapsed ? 'block' : 'none';
            toggleBtn.textContent = isCollapsed ? '+' : '−';
        });
        
        closeBtn.addEventListener('click', () => {
            isHidden = !isHidden;
            nav.classList.toggle('hidden', isHidden);
            miniNav.classList.toggle('hidden', isHidden);
        });
        
        // 点击小方块展开导航
        miniNav.addEventListener('click', () => {
            isCollapsed = false;
            nav.classList.remove('collapsed');
            miniNav.style.display = 'none';
            toggleBtn.textContent = '−';
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === CONFIG.keyboardShortcut) {
                e.preventDefault();
                if (isHidden) {
                    isHidden = false;
                    nav.classList.remove('hidden');
                    miniNav.classList.remove('hidden');
                } else {
                    isHidden = true;
                    nav.classList.add('hidden');
                    miniNav.classList.add('hidden');
                }
            }
        });
        
        // 定期刷新导航列表
        setInterval(updateNavigationList, CONFIG.refreshInterval);
        
        // 初始更新
        updateNavigationList();
    }
    
    // 主函数
    async function main() {
        try {
            // 等待对话容器加载
            await waitForElement('.conversation-wrapper');
            
            // 稍微延迟以确保内容完全加载
            setTimeout(() => {
                initNavigationPanel();
            }, 1000);
            
        } catch (error) {
            console.error('Genspark QuickNav: 初始化失败', error);
        }
    }
    
    // 页面加载完成后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
    
})();
