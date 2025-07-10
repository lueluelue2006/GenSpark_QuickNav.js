// ==UserScript==
// @name         Genspark 快捷导航
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  为 genspark.ai 对话页面添加快捷导航、编辑按钮、代码折叠和箭头导航功能
// @author       schweigen
// @license      MIT
// @match        https://www.genspark.ai/agents*
// @match        https://genspark.ai/agents*
// @grant        none
// @run-at       document-start
// @downloadURL  https://update.greasyfork.org/scripts/538068/Genspark%20%E5%BF%AB%E6%8D%B7%E5%AF%BC%E8%88%AA.user.js
// @updateURL    https://update.greasyfork.org/scripts/538068/Genspark%20%E5%BF%AB%E6%8D%B7%E5%AF%BC%E8%88%AA.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置选项
    const CONFIG = {
        maxTitleLength: 50,
        refreshInterval: 2000,
        animationDuration: 300,
        codeCollapseLine: 5  // 超过此行数的代码块将被折叠
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

        // 创建上下导航按钮
        const prevBtn = document.createElement('div');
        prevBtn.id = 'genspark-quicknav-prev';
        prevBtn.innerHTML = `
            <div class="quicknav-arrow-content">↑</div>
        `;

        const nextBtn = document.createElement('div');
        nextBtn.id = 'genspark-quicknav-next';
        nextBtn.innerHTML = `
            <div class="quicknav-arrow-content">↓</div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #genspark-quicknav {
                position: fixed;
                top: 45%;
                left: 16px;
                transform: translateY(-50%);
                width: 320px;
                max-height: 70vh;
                background: #ffffff;
                border: 1px solid #d1d5db;
                border-radius: 12px;
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                font-size: 14px;
                overflow: hidden;
                transition: all ${CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            #genspark-quicknav.collapsed {
                display: none;
            }

            #genspark-quicknav.hidden {
                display: none;
            }

            #genspark-quicknav-mini {
                position: fixed;
                top: 45%;
                left: 16px;
                transform: translateY(-50%);
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                border: none;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                cursor: pointer;
                transition: all ${CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #genspark-quicknav-mini:hover {
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
            }

            #genspark-quicknav-mini.hidden {
                display: none;
            }

            #genspark-quicknav-prev,
            #genspark-quicknav-next {
                position: fixed;
                left: 16px;
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                border: none;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                cursor: pointer;
                transition: all ${CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.8;
            }

            #genspark-quicknav-prev {
                top: calc(45% - 60px);
                transform: translateY(-50%);
            }

            #genspark-quicknav-next {
                top: calc(45% + 60px);
                transform: translateY(-50%);
            }

            #genspark-quicknav-prev:hover,
            #genspark-quicknav-next:hover {
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
                opacity: 1;
            }

            #genspark-quicknav-prev.hidden,
            #genspark-quicknav-next.hidden {
                display: none;
            }

            .quicknav-arrow-content {
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                user-select: none;
            }

            .quicknav-mini-content {
                color: #ffffff;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            }

            .quicknav-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-bottom: 1px solid #e5e7eb;
                border-radius: 12px 12px 0 0;
            }

            .quicknav-title {
                font-weight: 600;
                font-size: 16px;
                color: #1f2937;
                margin: 0;
            }

            .quicknav-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .quicknav-controls button {
                background: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(0, 0, 0, 0.1);
                padding: 6px 8px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                color: #4b5563;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                height: 28px;
            }

            .quicknav-controls button:hover {
                background: #ffffff;
                color: #1f2937;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .quicknav-content {
                max-height: calc(70vh - 80px);
                overflow-y: auto;
                background: #ffffff;
                border-radius: 0 0 12px 12px;
            }

            .quicknav-list {
                padding: 8px 0;
            }

            .quicknav-item {
                display: flex;
                align-items: center;
                padding: 12px 20px;
                cursor: pointer;
                border-left: 4px solid transparent;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                line-height: 1.4;
                margin: 0 8px;
                border-radius: 8px;
                position: relative;
            }

            .quicknav-item:hover {
                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                transform: translateX(4px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .quicknav-item.user {
                border-left-color: #10b981;
            }

            .quicknav-item.user:hover {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border-left-color: #059669;
            }

            .quicknav-item.assistant {
                border-left-color: #3b82f6;
            }

            .quicknav-item.assistant:hover {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border-left-color: #2563eb;
            }

            .quicknav-item-icon {
                width: 16px;
                height: 16px;
                margin-right: 12px;
                border-radius: 50%;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 600;
                color: #ffffff;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .quicknav-item.user .quicknav-item-icon {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }

            .quicknav-item.assistant .quicknav-item-icon {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            }

            .quicknav-item-text {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: #374151;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.5;
            }

            .quicknav-item-index {
                font-size: 12px;
                color: #6b7280;
                margin-left: 8px;
                flex-shrink: 0;
                padding: 2px 6px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 4px;
                font-weight: 500;
            }

            .quicknav-empty {
                padding: 40px 20px;
                text-align: center;
                color: #9ca3af;
                font-size: 14px;
                font-style: italic;
            }

            /* 滚动条样式 */
            .quicknav-content::-webkit-scrollbar {
                width: 6px;
            }

            .quicknav-content::-webkit-scrollbar-track {
                background: #f8f9fa;
                border-radius: 3px;
            }

            .quicknav-content::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
                border-radius: 3px;
                transition: background 0.2s;
            }

            .quicknav-content::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
            }

            /* 编辑按钮样式 */
            .genspark-edit-button {
                position: absolute;
                right: -80px;
                top: 50%;
                transform: translateY(-50%);
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                z-index: 100;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .genspark-edit-button:hover {
                transform: translateY(-50%) scale(1.05);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            }

            .genspark-edit-button:active {
                transform: translateY(-50%) scale(0.98);
            }

            .conversation-statement.user {
                position: relative;
            }

            .genspark-edit-button svg {
                width: 16px;
                height: 16px;
            }

            /* 代码折叠样式 */
            .code-collapse-wrapper {
                position: relative;
            }

            .code-collapse-toggle {
                position: absolute;
                right: 60px;
                top: 8px;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid #d1d5db;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 12px;
                color: #374151;
                z-index: 1000;
                transition: all 0.2s ease;
                user-select: none;
            }

            .code-collapse-toggle:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }

            .code-collapsed {
                max-height: ${CONFIG.codeCollapseLine * 1.5}em;
                overflow: hidden;
                position: relative;
                cursor: pointer;
            }

            .code-collapsed::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3em;
                background: linear-gradient(transparent, rgba(255, 255, 255, 0.9));
                pointer-events: none;
            }

            .code-collapsed:hover::after {
                background: linear-gradient(transparent, rgba(240, 248, 255, 0.95));
            }

            .code-expanded {
                max-height: none;
                overflow: visible;
                cursor: pointer;
            }

            .code-expanded::after {
                display: none;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(nav);
        document.body.appendChild(miniNav);
        document.body.appendChild(prevBtn);
        document.body.appendChild(nextBtn);

        return { nav, miniNav, prevBtn, nextBtn };
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

    // 添加编辑按钮到用户消息
    function addEditButtons() {
        const userMessages = document.querySelectorAll('.conversation-statement.user:not(.has-edit-button)');

        userMessages.forEach(message => {
            // 标记已处理
            message.classList.add('has-edit-button');

            // 创建编辑按钮
            const editButton = document.createElement('button');
            editButton.className = 'genspark-edit-button';
            editButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                编辑
            `;

            // 直接添加到消息容器上
            message.style.position = 'relative';
            message.appendChild(editButton);

            // 点击编辑按钮的处理
            editButton.addEventListener('click', () => {
                // 查找编辑按钮（可能是隐藏的）
                const hiddenEditBtn = message.querySelector('.message-action-icon');
                if (hiddenEditBtn) {
                    hiddenEditBtn.click();
                } else {
                    // 如果没有找到编辑按钮，尝试让内容可编辑
                    const bubble = message.querySelector('.bubble');
                    if (bubble) {
                        bubble.setAttribute('contenteditable', 'true');
                        bubble.focus();
                    }
                }
            });
        });
    }

    // 消息导航功能
    function getCurrentMessageIndex() {
        const messages = document.querySelectorAll('.conversation-statement');
        const viewportHeight = window.innerHeight;
        const viewportCenter = window.scrollY + viewportHeight / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        messages.forEach((message, index) => {
            const messageRect = message.getBoundingClientRect();
            const messageCenter = window.scrollY + messageRect.top + messageRect.height / 2;
            const distance = Math.abs(messageCenter - viewportCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }

    function navigateToMessage(direction) {
        const messages = document.querySelectorAll('.conversation-statement');
        if (messages.length === 0) return;

        const currentIndex = getCurrentMessageIndex();
        let targetIndex;

        if (direction === 'prev') {
            targetIndex = Math.max(0, currentIndex - 1);
        } else {
            targetIndex = Math.min(messages.length - 1, currentIndex + 1);
        }

        const targetMessage = messages[targetIndex];
        if (targetMessage) {
            targetMessage.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // 高亮显示目标消息
            targetMessage.style.transition = 'background-color 0.5s ease';
            targetMessage.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
                targetMessage.style.backgroundColor = '';
            }, 2000);
        }
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
                <div class="quicknav-item-icon">${isUser ? 'U' : 'A'}</div>
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

        // 同时更新编辑按钮
        addEditButtons();
    }

    // 代码折叠功能
    function initCodeCollapse() {
        // 处理代码块折叠
        function processCodeBlocks() {
            const codeBlocks = document.querySelectorAll('pre code.hljs');

            codeBlocks.forEach(codeBlock => {
                // 避免重复处理
                if (codeBlock.closest('.code-collapse-wrapper')) return;

                const lines = codeBlock.textContent.split('\n').filter(line => line.trim() !== '');

                // 只对超过指定行数的代码块添加折叠功能
                if (lines.length > CONFIG.codeCollapseLine) {
                    const preElement = codeBlock.parentElement;

                    // 创建包装器
                    const wrapper = document.createElement('div');
                    wrapper.className = 'code-collapse-wrapper';

                    // 创建切换按钮
                    const toggleBtn = document.createElement('div');
                    toggleBtn.className = 'code-collapse-toggle';
                    toggleBtn.textContent = '收起';

                    // 包装原始的 pre 元素
                    preElement.parentNode.insertBefore(wrapper, preElement);
                    wrapper.appendChild(preElement);
                    wrapper.appendChild(toggleBtn);

                    // 初始状态为折叠
                    codeBlock.classList.add('code-collapsed');

                    // 切换功能函数
                    function toggleCodeBlock() {
                        const isCollapsed = codeBlock.classList.contains('code-collapsed');

                        if (isCollapsed) {
                            codeBlock.classList.remove('code-collapsed');
                            codeBlock.classList.add('code-expanded');
                            toggleBtn.textContent = '收起';
                        } else {
                            codeBlock.classList.remove('code-expanded');
                            codeBlock.classList.add('code-collapsed');
                            toggleBtn.textContent = '展开';
                        }
                    }

                    // 按钮点击事件
                    toggleBtn.addEventListener('click', toggleCodeBlock);

                    // 双击代码块展开/收起
                    codeBlock.addEventListener('dblclick', (e) => {
                        // 防止双击时选中文本
                        e.preventDefault();
                        toggleCodeBlock();
                    });

                    // 初始设置按钮文本
                    toggleBtn.textContent = '展开';
                }
            });
        }

        // 初始处理
        processCodeBlocks();

        // 监听DOM变化，处理动态加载的代码块
        const observer = new MutationObserver(mutations => {
            let shouldProcess = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 &&
                           (node.querySelector && node.querySelector('code.hljs') ||
                            node.matches && node.matches('code.hljs'))) {
                            shouldProcess = true;
                        }
                    });
                }
            });

            if (shouldProcess) {
                setTimeout(processCodeBlocks, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化导航面板
    function initNavigationPanel() {
        const { nav, miniNav, prevBtn, nextBtn } = createNavigationPanel();
        let isCollapsed = true;  // 默认折叠状态
        let isHidden = false;

        // 设置初始状态
        nav.classList.add('collapsed');
        miniNav.style.display = 'block';

        // 绑定控制按钮事件
        const refreshBtn = nav.querySelector('.quicknav-refresh');
        const toggleBtn = nav.querySelector('.quicknav-toggle');

        refreshBtn.addEventListener('click', updateNavigationList);

        toggleBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            nav.classList.toggle('collapsed', isCollapsed);
            miniNav.style.display = isCollapsed ? 'block' : 'none';
            toggleBtn.textContent = isCollapsed ? '+' : '−';
        });

        // 点击小方块展开导航
        miniNav.addEventListener('click', () => {
            isCollapsed = false;
            nav.classList.remove('collapsed');
            miniNav.style.display = 'none';
            toggleBtn.textContent = '−';
        });

        // 上下导航按钮事件
        prevBtn.addEventListener('click', () => {
            navigateToMessage('prev');
        });

        nextBtn.addEventListener('click', () => {
            navigateToMessage('next');
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
                initCodeCollapse();  // 初始化代码折叠功能
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
