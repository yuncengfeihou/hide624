import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { getContext, saveSettingsDebounced } from '../../../../script.js';

// 插件配置和状态
const PLUGIN_NAME = 'hide-helper';
let pluginEnabled = true;
let hideLastN = 5; // 默认隐藏最后5条消息

// 存储初始化状态
let initialized = false;

// 存储UI元素的引用
let $popup = null;
let $overlay = null;

// 插件设置
let pluginSettings = {
    enabled: true,
    hideLastN: 5
};

// 加载插件设置
function loadSettings() {
    const settings = localStorage.getItem(`${PLUGIN_NAME}_settings`);
    if (settings) {
        try {
            const parsedSettings = JSON.parse(settings);
            pluginSettings = { ...pluginSettings, ...parsedSettings };
            pluginEnabled = pluginSettings.enabled;
            hideLastN = pluginSettings.hideLastN;
        } catch (error) {
            console.error(`${PLUGIN_NAME}: 加载设置时出错`, error);
        }
    }
    console.log(`${PLUGIN_NAME}: 设置已加载`, pluginSettings);
}

// 保存插件设置
function saveSettings() {
    localStorage.setItem(`${PLUGIN_NAME}_settings`, JSON.stringify(pluginSettings));
    console.log(`${PLUGIN_NAME}: 设置已保存`, pluginSettings);
}

// 创建设置UI HTML
function createSettingsHTML() {
    return `
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>隐藏助手</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content" style="padding: 10px;">
            <div class="hide-helper-section">
                <div style="display: flex; align-items: center;">
                    <label for="hide-helper-toggle" style="margin-right: 10px;">插件状态:</label>
                    <select id="hide-helper-toggle" class="text_pole">
                        <option value="true" ${pluginSettings.enabled ? 'selected' : ''}>开启</option>
                        <option value="false" ${!pluginSettings.enabled ? 'selected' : ''}>关闭</option>
                    </select>
                </div>
            </div>
        </div>
    </div>`;
}

// 创建输入按钮HTML
function createInputButtonHTML() {
    return `
    <div id="hide_helper_input_button" class="list-group-item flex-container flexGap5" title="隐藏助手">
        <span style="padding-top: 2px;">
            <i class="fa-solid fa-ghost"></i>
        </span>
        <span>隐藏助手</span>
    </div>`;
}

// 创建弹出界面HTML
function createPopupHTML() {
    return `
    <div class="hide-helper-overlay" id="hide-helper-overlay"></div>
    <div class="hide-helper-popup" id="hide-helper-popup">
        <div class="hide-helper-popup-title">隐藏助手设置</div>
        <div class="hide-helper-section">
            <div class="hide-helper-input-row">
                <input type="number" id="hide-last-n" placeholder="隐藏最后N条消息" value="${hideLastN}" min="1">
                <button id="hide-last-n-btn" class="hide-helper-btn">隐藏</button>
                <button id="show-all-btn" class="hide-helper-btn">显示全部</button>
            </div>
            <div class="hide-helper-current">
                当前设置: 隐藏最后 <span id="current-hide-n">${hideLastN}</span> 条消息
            </div>
        </div>
        <button id="hide-helper-popup-close" class="hide-helper-close-btn">关闭</button>
    </div>`;
}

// 隐藏最后N条消息
function hideLastMessages(n) {
    const context = getContext();
    const chat = context.chat;
    
    if (!chat || chat.length === 0) {
        console.log(`${PLUGIN_NAME}: 聊天记录为空`);
        return;
    }
    
    // 先将所有消息标记为可见
    $('.mes').attr('is_visible', 'true');
    
    // 获取可见消息
    const visibleMessages = chat.filter(msg => !msg.is_system);
    
    // 计算要隐藏的消息数量
    const hideCount = Math.min(n, visibleMessages.length);
    
    if (hideCount <= 0) {
        console.log(`${PLUGIN_NAME}: 没有消息需要隐藏`);
        return;
    }
    
    // 隐藏最后N条消息
    for (let i = 1; i <= hideCount; i++) {
        const targetIndex = visibleMessages.length - i;
        if (targetIndex >= 0) {
            const messageId = visibleMessages[targetIndex].id;
            $(`.mes[mesid="${messageId}"]`).attr('is_visible', 'false');
        }
    }
    
    console.log(`${PLUGIN_NAME}: 已隐藏最后 ${hideCount} 条消息`);
    
    // 更新当前设置显示
    $('#current-hide-n').text(n);
    hideLastN = n;
    pluginSettings.hideLastN = n;
    saveSettings();
}

// 显示所有消息
function showAllMessages() {
    $('.mes').attr('is_visible', 'true');
    console.log(`${PLUGIN_NAME}: 已显示所有消息`);
}

// 打开弹出窗口
function openPopup() {
    if (!pluginEnabled) return;
    
    $popup.show();
    $overlay.show();
}

// 关闭弹出窗口
function closePopup() {
    $popup.hide();
    $overlay.hide();
}

// 初始化插件功能
function initializePlugin() {
    if (initialized || !pluginEnabled) return;
    
    // 为"隐藏"按钮添加点击事件
    $('#hide-last-n-btn').on('click', function() {
        const value = parseInt($('#hide-last-n').val());
        if (isNaN(value) || value < 1) {
            alert('请输入有效的数字（至少为1）');
            return;
        }
        hideLastMessages(value);
    });
    
    // 为"显示全部"按钮添加点击事件
    $('#show-all-btn').on('click', function() {
        showAllMessages();
    });
    
    // 为输入框添加回车键事件
    $('#hide-last-n').on('keypress', function(e) {
        if (e.which === 13) {
            $('#hide-last-n-btn').click();
        }
    });
    
    // 为关闭按钮添加点击事件
    $('#hide-helper-popup-close').on('click', function() {
        closePopup();
    });
    
    // 点击遮罩层关闭弹出窗口
    $overlay.on('click', function() {
        closePopup();
    });
    
    // 应用初始设置
    if (hideLastN > 0) {
        hideLastMessages(hideLastN);
    }
    
    initialized = true;
    console.log(`${PLUGIN_NAME}: 插件功能已初始化`);
}

// 清除插件功能
function clearPluginFunctionality() {
    if (!initialized) return;
    
    // 移除事件监听器
    $('#hide-last-n-btn').off('click');
    $('#show-all-btn').off('click');
    $('#hide-last-n').off('keypress');
    $('#hide-helper-popup-close').off('click');
    $overlay.off('click');
    
    // 显示所有消息
    showAllMessages();
    
    initialized = false;
    console.log(`${PLUGIN_NAME}: 插件功能已清除`);
}

// 切换插件状态
function togglePluginState(enabled) {
    pluginEnabled = enabled;
    pluginSettings.enabled = enabled;
    saveSettings();
    
    if (enabled) {
        initializePlugin();
        $('#hide_helper_input_button').show();
    } else {
        clearPluginFunctionality();
        $('#hide_helper_input_button').hide();
        closePopup();
    }
    
    console.log(`${PLUGIN_NAME}: 插件状态已切换为 ${enabled ? '开启' : '关闭'}`);
}

// 主入口点
jQuery(async () => {
    try {
        console.log(`${PLUGIN_NAME}: 插件加载中...`);
        
        // 加载设置
        loadSettings();
        
        // 注入设置UI
        const settingsHtml = createSettingsHTML();
        $('#extensions_settings').append(settingsHtml);
        
        // 注入输入区按钮
        const inputButtonHtml = createInputButtonHTML();
        $('#data_bank_wand_container').append(inputButtonHtml);
        
        // 如果插件禁用，隐藏按钮
        if (!pluginEnabled) {
            $('#hide_helper_input_button').hide();
        }
        
        // 注入弹出界面
        $('body').append(createPopupHTML());
        $popup = $('#hide-helper-popup');
        $overlay = $('#hide-helper-overlay');
        
        // 为设置切换添加事件
        $('#hide-helper-toggle').on('change', function() {
            const enabled = $(this).val() === 'true';
            togglePluginState(enabled);
        });
        
        // 为输入按钮添加点击事件
        $('#hide_helper_input_button').on('click', function() {
            openPopup();
        });
        
        // 初始化插件功能
        if (pluginEnabled) {
            initializePlugin();
        }
        
        console.log(`${PLUGIN_NAME}: 插件加载完成!`);
        
    } catch (error) {
        console.error(`${PLUGIN_NAME}: 加载插件时出错`, error);
    }
});
