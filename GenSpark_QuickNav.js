// ==UserScript==
// @name         GenSpark 简洁消息导航
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  为GenSpark AI对话添加蓝色背景和简洁的导航按钮
// @author       schweigen
// @match        https://www.genspark.ai/agents*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let currentMessageIndex = 0;
    let userMessages = [];
    let navigationPanel = null;

    // 添加CSS样式
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 用户消息蓝色背景 */
            .conversation-statement.user .bubble {
                background-color: #e3f2fd !important;
            }

            /* 简洁导航按钮容器 */
            #message-navigator {
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                z-index: 9999;
            }

            .nav-button {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e0e0e0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                font-size: 16px;
                color: #1976d2;
                font-weight: bold;
                user-select: none;
            }

            .nav-button:hover {
                background: rgba(25, 118, 210, 0.1);
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
                border-color: #1976d2;
            }

            .nav-button:active {
                transform: scale(0.95);
                background: rgba(25, 118, 210, 0.2);
            }

            .nav-button:disabled {
                background: rgba(200, 200, 200, 0.7);
                color: #999;
                cursor: not-allowed;
                transform: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .nav-button:disabled:hover {
                transform: none;
                background: rgba(200, 200, 200, 0.7);
                border-color: #e0e0e0;
            }

            /* 计数器显示 */
            .nav-counter {
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                padding: 4px 8px;
                font-size: 12px;
                font-weight: bold;
                color: #1976d2;
                backdrop-filter: blur(10px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                min-width: 40px;
                text-align: center;
            }

            /* 当前消息高亮 */
            .conversation-statement.user.current-message .bubble {
                background-color: #bbdefb !important;
                border: 2px solid #1976d2 !important;
                transform: scale(1.02);
                transition: all 0.3s ease;
            }

            /* 添加脉冲动画 */
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // 创建导航按钮
    function createNavigationButtons() {
        if (navigationPanel) return;

        navigationPanel = document.createElement('div');
        navigationPanel.id = 'message-navigator';
        navigationPanel.innerHTML = `
            <button class="nav-button" id="prev-message" title="上一个问题 (Alt+↑)">↑</button>
            <div class="nav-counter" id="message-counter">0/0</div>
            <button class="nav-button" id="next-message" title="下一个问题 (Alt+↓)">↓</button>
        `;

        document.body.appendChild(navigationPanel);
        setupEventListeners();
    }

    // 设置事件监听器
    function setupEventListeners() {
        const prevBtn = document.getElementById('prev-message');
        const nextBtn = document.getElementById('next-message');

        // 简单的点击事件
        prevBtn.onclick = function() {
            console.log('点击上一个按钮');
            goToPreviousMessage();
        };

        nextBtn.onclick = function() {
            console.log('点击下一个按钮');
            goToNextMessage();
        };

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    goToPreviousMessage();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    goToNextMessage();
                }
            }
        });
    }

    // 更新用户消息列表
    function updateUserMessages() {
        const newUserMessages = document.querySelectorAll('.conversation-statement.user');

        if (newUserMessages.length !== userMessages.length) {
            userMessages = Array.from(newUserMessages);
            console.log('找到用户消息数量:', userMessages.length);

            if (userMessages.length > 0) {
                currentMessageIndex = userMessages.length - 1;
            }

            updateNavigationState();
        }
    }

    // 更新导航状态
    function updateNavigationState() {
        if (!navigationPanel) return;

        const counter = document.getElementById('message-counter');
        const prevBtn = document.getElementById('prev-message');
        const nextBtn = document.getElementById('next-message');

        if (userMessages.length === 0) {
            counter.textContent = '0/0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        counter.textContent = `${currentMessageIndex + 1}/${userMessages.length}`;
        prevBtn.disabled = currentMessageIndex === 0;
        nextBtn.disabled = currentMessageIndex === userMessages.length - 1;

        console.log(`当前消息索引: ${currentMessageIndex + 1}/${userMessages.length}`);

        // 移除之前的高亮
        document.querySelectorAll('.conversation-statement.user.current-message').forEach(el => {
            el.classList.remove('current-message');
        });

        // 高亮当前消息
        if (userMessages[currentMessageIndex]) {
            userMessages[currentMessageIndex].classList.add('current-message');
        }
    }

    // 滚动到指定消息
    function scrollToMessage(index) {
        if (index < 0 || index >= userMessages.length) return;

        const targetMessage = userMessages[index];
        console.log('滚动到消息:', index + 1);

        targetMessage.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });

        // 添加脉冲效果
        setTimeout(() => {
            targetMessage.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                targetMessage.style.animation = '';
            }, 500);
        }, 300);
    }

    // 上一个消息
    function goToPreviousMessage() {
        console.log('执行上一个消息');
        if (currentMessageIndex > 0) {
            currentMessageIndex--;
            scrollToMessage(currentMessageIndex);
            updateNavigationState();
        }
    }

    // 下一个消息
    function goToNextMessage() {
        console.log('执行下一个消息');
        if (currentMessageIndex < userMessages.length - 1) {
            currentMessageIndex++;
            scrollToMessage(currentMessageIndex);
            updateNavigationState();
        }
    }

    // 观察DOM变化
    function observeConversationChanges() {
        const observer = new MutationObserver(() => {
            updateUserMessages();
        });

        const targetNode = document.body || document.documentElement;
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }

    // 主函数
    function main() {
        addStyles();

        setTimeout(() => {
            createNavigationButtons();
            updateUserMessages();
            observeConversationChanges();
            console.log('GenSpark 简洁消息导航器已启动');
        }, 1000);
    }

    // 页面加载完成检查
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

})();
